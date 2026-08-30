import dgram from 'dgram'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface SystemStats {
  cpuUsage: number
  ramUsage: number
  ramUsedGB: number
  ramTotalGB: number
  gpuTemp?: number
  gpuName?: string
  osUptime: string
}

export interface LiveHudData {
  stats: SystemStats
  weather: { tempC: number; condition: string; city?: string } | null
  media: { track: string; artist: string; fullTitle: string; isPlaying: boolean } | null
  heartRate: number | null
  hypeRateConnected?: boolean
  timeStr12: string
  timeStr24: string
}

export interface MagicHudConfig {
  enabled: boolean
  intervalSeconds: number
  showCustomText: boolean
  customText: string
  customMessages?: string[]
  showWeather: boolean
  weatherCity?: string
  weatherUnit?: 'C' | 'F'
  weatherLang?: 'en' | 'ar'
  alignment?: 'center' | 'standard'
  showTime: boolean
  timeFormat: '12h' | '24h'
  showMedia: boolean
  showHardware: boolean
  hardwareFormat: 'full' | 'compact'
  showHeartRate: boolean
  hypeRateSessionId?: string
  hypeRateApiKey?: string
  simulatedBpm?: number
  directSend: boolean
}

const ARABIC_WEATHER_MAP: Record<string, string> = {
  sunny: 'مشمس',
  clear: 'صافي',
  'partly cloudy': 'غائم جزئياً',
  cloudy: 'غائم',
  overcast: 'غائم كلياً',
  mist: 'ضباب',
  fog: 'ضباب',
  'patchy rain possible': 'احتمال مطر',
  'light rain': 'مطر خفيف',
  'heavy rain': 'مطر غزير',
  thunderstorm: 'عواصف رعدية',
  snow: 'ثلج'
}

export class VrcOscService {
  private socket: dgram.Socket
  private host: string = '127.0.0.1'
  private port: number = 9000
  private loopTimer: NodeJS.Timeout | null = null
  private magicHudTimer: NodeJS.Timeout | null = null
  private loopIndex: number = 0
  private lastCpuMeasure: { idle: number; total: number } | null = null

  // HypeRate WebSocket Client
  private hypeRateWs: WebSocket | null = null
  private hypeRatePingTimer: NodeJS.Timeout | null = null
  private isHypeRateConnected: boolean = false
  private currentHypeRateSession: string = ''
  private currentHypeRateToken: string = ''
  private hudMsgIndex: number = 0

  // Cached data
  private cachedWeather: { tempC: number; condition: string; city?: string; timestamp: number } | null = null
  private cachedMedia: { track: string; artist: string; fullTitle: string; isPlaying: boolean; timestamp: number } | null = null
  private cachedHeartRate: number | null = null
  private cachedSystemStats: { stats: SystemStats; timestamp: number } | null = null

  constructor(host = '127.0.0.1', port = 9000) {
    this.host = host
    this.port = port
    this.socket = dgram.createSocket('udp4')
    this.lastCpuMeasure = this.getCpuTime()
  }

  public setConfig(host: string, port: number) {
    this.host = host
    this.port = port
  }

  /**
   * Encodes and sends an OSC message to VRChat
   * Address: /chatbox/input
   * Arguments: [message (string), directSend (boolean), notify (boolean)]
   */
  public sendChatbox(text: string, directSend: boolean = true, notify: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // VRChat max chatbox length is 144 characters
        const safeText = text.slice(0, 144)
        const packet = this.buildOscChatboxPacket('/chatbox/input', safeText, directSend, notify)

        this.socket.send(packet, this.port, this.host, (err) => {
          if (err) {
            console.error('OSC Send Error:', err)
            resolve(false)
          } else {
            resolve(true)
          }
        })
      } catch (e) {
        console.error('Failed to construct OSC packet:', e)
        resolve(false)
      }
    })
  }

  /**
   * Sends typing indicator to VRChat
   * Address: /chatbox/typing
   * Arguments: [isTyping (boolean)]
   */
  public setTyping(isTyping: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const packet = this.buildOscTypingPacket('/chatbox/typing', isTyping)
        this.socket.send(packet, this.port, this.host, (err) => {
          resolve(!err)
        })
      } catch {
        resolve(false)
      }
    })
  }

  /**
   * Loops through a list of custom messages
   */
  public startLoop(messages: string[], intervalSeconds: number = 8, directSend = true, notify = false) {
    this.stopLoop()
    if (!messages || messages.length === 0) return

    this.loopIndex = 0
    this.sendChatbox(messages[0], directSend, notify)

    this.loopTimer = setInterval(() => {
      this.loopIndex = (this.loopIndex + 1) % messages.length
      this.sendChatbox(messages[this.loopIndex], directSend, notify)
    }, Math.max(intervalSeconds, 8) * 1000)
  }

  public stopLoop() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer)
      this.loopTimer = null
    }
  }

  public isLoopRunning(): boolean {
    return this.loopTimer !== null
  }

  /**
   * Starts the Magic Multi-Line Floating Chatbox Broadcaster
   * Combines Status text, Weather, Time, Music, and System Stats into a multi-line HUD
   */
  public startMagicHud(config: MagicHudConfig) {
    this.stopMagicHud()

    const broadcast = async () => {
      try {
        const hudData = await this.getLiveHudData(
          config.weatherCity,
          config.hypeRateSessionId,
          config.simulatedBpm,
          config.hypeRateApiKey
        )
        const lines: string[] = []

        // Line 1: Custom Text / Status (Rotating between customMessages)
        if (config.showCustomText) {
          const list = config.customMessages && config.customMessages.length > 0
            ? config.customMessages
            : config.customText ? [config.customText] : []

          if (list.length > 0) {
            const activeMsg = list[this.hudMsgIndex % list.length]
            this.hudMsgIndex++
            if (activeMsg && activeMsg.trim()) {
              lines.push(activeMsg.trim())
            }
          }
        }

        // Line 2: Weather & Outdoor Temp (e.g. 39°c sunny / 39°c مشمس)
        if (config.showWeather && hudData.weather) {
          const isFahrenheit = config.weatherUnit === 'F'
          const temp = isFahrenheit
            ? Math.round((hudData.weather.tempC * 9) / 5 + 32)
            : hudData.weather.tempC
          const unit = isFahrenheit ? '°f' : '°c'
          const condKey = hudData.weather.condition.toLowerCase().trim()
          const conditionText = config.weatherLang === 'ar'
            ? (ARABIC_WEATHER_MAP[condKey] || hudData.weather.condition)
            : condKey
          lines.push(`${temp}${unit} ${conditionText}`)
        }

        // Line 3: Time & Heart Rate
        const timeParts: string[] = []
        if (config.showTime) {
          timeParts.push(config.timeFormat === '24h' ? hudData.timeStr24 : hudData.timeStr12)
        }
        if (config.showHeartRate && hudData.heartRate) {
          timeParts.push(`♥ ${hudData.heartRate} bpm`)
        }
        if (timeParts.length > 0) {
          lines.push(timeParts.join('  '))
        }

        // Line 4: Media / Now Playing Music (e.g. ♪ Song Name)
        if (config.showMedia && hudData.media && hudData.media.isPlaying) {
          lines.push(`♪ ${hudData.media.fullTitle}`)
        }

        // Line 5: System Hardware Stats
        if (config.showHardware) {
          const s = hudData.stats
          if (config.hardwareFormat === 'compact') {
            lines.push(`⚡ ${s.cpuUsage.toFixed(0)}% CPU | ${s.ramUsage.toFixed(0)}% RAM`)
          } else {
            const tempStr = s.gpuTemp ? ` ${s.gpuTemp}°C` : ''
            lines.push(`⚡ CPU: ${s.cpuUsage.toFixed(0)}% | RAM: ${s.ramUsedGB.toFixed(1)}GB${tempStr}`)
          }
        }

        if (lines.length > 0) {
          // Center alignment if selected
          let formattedLines = lines
          if (config.alignment === 'center' && lines.length > 1) {
            const maxLen = Math.max(...lines.map((l) => l.length))
            formattedLines = lines.map((line) => {
              const diff = maxLen - line.length
              if (diff <= 1) return line
              const pad = Math.floor(diff / 2)
              return ' '.repeat(pad) + line
            })
          }

          const formatted = formattedLines.join('\n')
          await this.sendChatbox(formatted, config.directSend, false)
        }
      } catch (err) {
        console.error('Magic HUD Broadcast Error:', err)
      }
    }

    // Run first broadcast immediately
    broadcast()
    this.magicHudTimer = setInterval(broadcast, Math.max(config.intervalSeconds, 2) * 1000)
  }

  public stopMagicHud() {
    if (this.magicHudTimer) {
      clearInterval(this.magicHudTimer)
      this.magicHudTimer = null
    }
  }

  public isMagicHudRunning(): boolean {
    return this.magicHudTimer !== null
  }

  public startStatsBroadcast(template: string, intervalSeconds: number = 5, directSend = true) {
    this.stopMagicHud()
    this.startMagicHud({
      enabled: true,
      intervalSeconds,
      showCustomText: false,
      customText: '',
      showWeather: false,
      showTime: true,
      timeFormat: '12h',
      showMedia: false,
      showHardware: true,
      hardwareFormat: 'full',
      showHeartRate: false,
      directSend
    })
  }

  public stopStatsBroadcast() {
    this.stopMagicHud()
  }

  public isStatsBroadcasting(): boolean {
    return this.isMagicHudRunning()
  }

  /**
   * Fetches all aggregated live HUD data
   */
  public async getLiveHudData(
    city?: string,
    hypeRateSessionId?: string,
    simulatedBpm?: number,
    hypeRateApiKey?: string
  ): Promise<LiveHudData> {
    const stats = await this.getSystemStats()
    const weather = await this.fetchWeather(city)
    const media = await this.fetchNowPlayingMedia()
    const heartRate = await this.fetchHeartRate(hypeRateSessionId, simulatedBpm, hypeRateApiKey)

    const now = new Date()
    const timeStr12 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    const timeStr24 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

    return {
      stats,
      weather,
      media,
      heartRate,
      hypeRateConnected: this.isHypeRateConnected,
      timeStr12,
      timeStr24
    }
  }

  /**
   * Fetches weather using wttr.in with 5-minute memory cache
   */
  public async fetchWeather(city?: string): Promise<{ tempC: number; condition: string; city?: string } | null> {
    const now = Date.now()
    if (this.cachedWeather && now - this.cachedWeather.timestamp < 300000) {
      return this.cachedWeather
    }

    try {
      const url = city ? `https://wttr.in/${encodeURIComponent(city)}?format=j1` : `https://wttr.in/?format=j1`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (res.ok) {
        const data = (await res.json()) as any
        if (data.current_condition && data.current_condition.length > 0) {
          const cond = data.current_condition[0]
          const tempC = parseInt(cond.temp_C, 10) || 0
          const condition = cond.weatherDesc?.[0]?.value || 'Clear'
          const area = data.nearest_area?.[0]?.areaName?.[0]?.value || city

          this.cachedWeather = {
            tempC,
            condition,
            city: area,
            timestamp: now
          }
          return this.cachedWeather
        }
      }
    } catch {
      if (this.cachedWeather) return this.cachedWeather
    }

    return null
  }

  /**
   * Detects currently playing song from Spotify / Windows Media processes
   */
  public async fetchNowPlayingMedia(): Promise<{ track: string; artist: string; fullTitle: string; isPlaying: boolean } | null> {
    const now = Date.now()
    if (this.cachedMedia && now - this.cachedMedia.timestamp < 15000) {
      return this.cachedMedia
    }

    if (process.platform === 'win32') {
      try {
        const cmd = `powershell -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle -ne '' -and ($_.ProcessName -match 'spotify|musicbee|foobar2000|vlc|aimp') } | Select-Object -First 1 ProcessName, MainWindowTitle | ConvertTo-Json"`
        const { stdout } = await execAsync(cmd, { timeout: 1800 })
        if (stdout && stdout.trim()) {
          const parsed = JSON.parse(stdout.trim())
          const title = (parsed.MainWindowTitle || '').trim()

          if (title && title !== 'Spotify' && title !== 'Spotify Free' && title !== 'Spotify Premium') {
            let artist = ''
            let track = title
            if (title.includes(' - ')) {
              const parts = title.split(' - ')
              artist = parts[0].trim()
              track = parts.slice(1).join(' - ').trim()
            }

            this.cachedMedia = {
              artist,
              track,
              fullTitle: title,
              isPlaying: true,
              timestamp: now
            }
            return this.cachedMedia
          }
        }
      } catch {
        // fallback
      }
    }

    this.cachedMedia = null
    return null
  }

  /**
   * Connects to HypeRate.io WebSocket API
   * Endpoint: wss://app.hyperate.io/socket/websocket?token=API_KEY
   * Channel: hr:SESSION_ID
   */
  public connectHypeRate(sessionId: string, apiKey?: string) {
    if (!sessionId || !sessionId.trim()) {
      this.disconnectHypeRate()
      return
    }

    const cleanSession = sessionId.trim()
    const cleanKey = (apiKey || '').trim()

    // If already connected to the same session & token, no need to reconnect
    if (
      this.hypeRateWs &&
      this.currentHypeRateSession === cleanSession &&
      this.currentHypeRateToken === cleanKey &&
      this.hypeRateWs.readyState === WebSocket.OPEN
    ) {
      return
    }

    this.disconnectHypeRate()

    this.currentHypeRateSession = cleanSession
    this.currentHypeRateToken = cleanKey

    const tokenParam = cleanKey ? `?token=${encodeURIComponent(cleanKey)}` : ''
    const wsUrl = `wss://app.hyperate.io/socket/websocket${tokenParam}`

    try {
      this.hypeRateWs = new WebSocket(wsUrl)

      this.hypeRateWs.onopen = () => {
        this.isHypeRateConnected = true
        // Join Phoenix Channel hr:SESSION_ID
        const joinMsg = {
          topic: `hr:${cleanSession}`,
          event: 'phx_join',
          payload: {},
          ref: '1'
        }
        this.hypeRateWs?.send(JSON.stringify(joinMsg))

        // Setup Phoenix heartbeat ping every 25 seconds
        if (this.hypeRatePingTimer) clearInterval(this.hypeRatePingTimer)
        this.hypeRatePingTimer = setInterval(() => {
          if (this.hypeRateWs?.readyState === WebSocket.OPEN) {
            this.hypeRateWs.send(
              JSON.stringify({
                topic: 'phoenix',
                event: 'heartbeat',
                payload: {},
                ref: Date.now().toString()
              })
            )
          }
        }, 25000)
      }

      this.hypeRateWs.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data.toString())
          // Incoming Heartbeat Event from HypeRate: { event: "hr_update", payload: { hr: 78 } }
          if (data.event === 'hr_update' && data.payload && typeof data.payload.hr === 'number') {
            this.cachedHeartRate = data.payload.hr
          }
        } catch {
          // ignore malformed packets
        }
      }

      this.hypeRateWs.onerror = () => {
        this.isHypeRateConnected = false
      }

      this.hypeRateWs.onclose = () => {
        this.isHypeRateConnected = false
        if (this.hypeRatePingTimer) {
          clearInterval(this.hypeRatePingTimer)
          this.hypeRatePingTimer = null
        }
      }
    } catch (e) {
      console.error('HypeRate connection error:', e)
      this.isHypeRateConnected = false
    }
  }

  public disconnectHypeRate() {
    this.isHypeRateConnected = false
    if (this.hypeRatePingTimer) {
      clearInterval(this.hypeRatePingTimer)
      this.hypeRatePingTimer = null
    }
    if (this.hypeRateWs) {
      try {
        this.hypeRateWs.close()
      } catch {
        // ignore
      }
      this.hypeRateWs = null
    }
  }

  /**
   * Fetches Heart Rate from HypeRate WebSocket cache or simulated BPM
   */
  public async fetchHeartRate(sessionId?: string, simulatedBpm?: number, apiKey?: string): Promise<number | null> {
    if (sessionId && sessionId.trim()) {
      this.connectHypeRate(sessionId.trim(), apiKey)
      if (this.cachedHeartRate !== null) {
        return this.cachedHeartRate
      }
    }

    if (simulatedBpm && simulatedBpm > 0) {
      // Add slight organic jitter (+- 2 bpm) for test preview
      const jitter = Math.floor(Math.random() * 5) - 2
      return Math.max(45, Math.min(180, simulatedBpm + jitter))
    }

    return this.cachedHeartRate
  }

  /**
   * Gets real-time CPU, RAM, and GPU stats
   */
  public async getSystemStats(): Promise<SystemStats> {
    const now = Date.now()
    if (this.cachedSystemStats && now - this.cachedSystemStats.timestamp < 8000) {
      return this.cachedSystemStats.stats
    }

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const ramUsage = (usedMem / totalMem) * 100
    const ramUsedGB = usedMem / (1024 * 1024 * 1024)
    const ramTotalGB = totalMem / (1024 * 1024 * 1024)

    const cpuUsage = this.calculateCpuUsage()

    let gpuTemp: number | undefined = undefined
    let gpuName: string | undefined = undefined

    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          'nvidia-smi --query-gpu=temperature.gpu,name --format=csv,noheader,nounits',
          { timeout: 1200 }
        )
        if (stdout && stdout.trim()) {
          const parts = stdout.trim().split(',')
          if (parts.length >= 1) {
            const tempVal = parseInt(parts[0].trim(), 10)
            if (!isNaN(tempVal)) gpuTemp = tempVal
          }
          if (parts.length >= 2) {
            gpuName = parts[1].trim().replace('NVIDIA GeForce ', '')
          }
        }
      } catch {
        // Non-nvidia GPU or unavailable
      }
    }

    const uptimeSecs = os.uptime()
    const hours = Math.floor(uptimeSecs / 3600)
    const mins = Math.floor((uptimeSecs % 3600) / 60)
    const osUptime = `${hours}h ${mins}m`

    const stats: SystemStats = {
      cpuUsage,
      ramUsage,
      ramUsedGB,
      ramTotalGB,
      gpuTemp,
      gpuName,
      osUptime
    }
    this.cachedSystemStats = { stats, timestamp: now }
    return stats
  }

  private getCpuTime(): { idle: number; total: number } {
    const cpus = os.cpus()
    let idle = 0
    let total = 0
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type]
      }
      idle += cpu.times.idle
    }
    return { idle, total }
  }

  private calculateCpuUsage(): number {
    const current = this.getCpuTime()
    if (!this.lastCpuMeasure) {
      this.lastCpuMeasure = current
      return 15
    }

    const idleDiff = current.idle - this.lastCpuMeasure.idle
    const totalDiff = current.total - this.lastCpuMeasure.total
    this.lastCpuMeasure = current

    if (totalDiff <= 0) return 0
    const usage = 100 - (100 * idleDiff) / totalDiff
    return Math.max(0, Math.min(100, Math.round(usage)))
  }

  /**
   * Helper: Builds standard OSC Packet for /chatbox/input string, bool, bool
   */
  private buildOscChatboxPacket(address: string, message: string, direct: boolean, notify: boolean): Buffer {
    const addrBuf = this.padString(address)
    const typeTags = `,s${direct ? 'T' : 'F'}${notify ? 'T' : 'F'}`
    const tagBuf = this.padString(typeTags)
    const strBuf = this.padString(message)

    return Buffer.concat([addrBuf, tagBuf, strBuf])
  }

  /**
   * Helper: Builds standard OSC Packet for /chatbox/typing bool
   */
  private buildOscTypingPacket(address: string, isTyping: boolean): Buffer {
    const addrBuf = this.padString(address)
    const typeTags = `,${isTyping ? 'T' : 'F'}`
    const tagBuf = this.padString(typeTags)

    return Buffer.concat([addrBuf, tagBuf])
  }

  private padString(str: string): Buffer {
    const strBuf = Buffer.from(str, 'utf-8')
    const nullCount = 4 - (strBuf.length % 4)
    const padded = Buffer.alloc(strBuf.length + nullCount)
    strBuf.copy(padded)
    return padded
  }

  public close() {
    this.stopLoop()
    this.stopMagicHud()
    try {
      this.socket.close()
    } catch {
      // ignore
    }
  }
}
