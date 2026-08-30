import fs from 'fs'
import path from 'path'
import os from 'os'
import { BrowserWindow } from 'electron'
import { JsonStore } from './store'

/** Debounce log reads so we don't contend with VRChat's active file writes */
const LOG_READ_DEBOUNCE_MS = 1200
/** How often to scan for a newer output_log after VRChat restarts */
const LOG_ROTATION_CHECK_MS = 45_000

export interface RadarPlayer {
  displayName: string
  userId?: string
  joinedAt: string
  isFriend?: boolean
  ping?: number
  fps?: number
  distance?: number
}

export interface RadarState {
  currentWorldName: string
  currentWorldId: string
  currentInstanceId: string
  instanceType: string
  joinedWorldAt: string
  players: RadarPlayer[]
  logEvents: {
    type: 'join' | 'leave' | 'world' | 'info'
    message: string
    timestamp: string
  }[]
  isWatching: boolean
  activeLogFile: string
}

export class VRCLogWatcher {
  private store: JsonStore
  private getWindow: () => BrowserWindow | null
  private watcher: fs.FSWatcher | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private fileChangeDebounce: NodeJS.Timeout | null = null
  private isReading = false
  private currentLogPath: string = ''
  private lastFilePosition: number = 0

  private state: RadarState = {
    currentWorldName: 'Not Connected / Searching Logs',
    currentWorldId: '',
    currentInstanceId: '',
    instanceType: 'Public',
    joinedWorldAt: '',
    players: [],
    logEvents: [],
    isWatching: false,
    activeLogFile: ''
  }

  constructor(store: JsonStore, getWindow: () => BrowserWindow | null) {
    this.store = store
    this.getWindow = getWindow
  }

  public getState(): RadarState {
    return this.state
  }

  public getVRChatLogDir(): string {
    const custom = this.store.getSettings().vrcLogPath
    if (custom && fs.existsSync(custom)) {
      return custom
    }

    // Default Windows path: %USERPROFILE%\AppData\LocalLow\VRChat\VRChat
    const userProfile = process.env.USERPROFILE || os.homedir()
    const defaultPath = path.join(userProfile, 'AppData', 'LocalLow', 'VRChat', 'VRChat')
    return defaultPath
  }

  public start() {
    this.stop()
    const logDir = this.getVRChatLogDir()

    if (!fs.existsSync(logDir)) {
      this.state.isWatching = false
      this.state.currentWorldName = 'VRChat log directory not found'
      this.broadcastState()
      return
    }

    this.findAndWatchLatestLog(logDir)

    // Check periodically for newer log file if VRChat restarts (low frequency)
    this.pollTimer = setInterval(() => {
      this.checkForNewerLogFile(logDir)
    }, LOG_ROTATION_CHECK_MS)
  }

  public stop() {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce)
      this.fileChangeDebounce = null
    }
    this.state.isWatching = false
  }

  private findLatestLogFile(logDir: string): string | null {
    try {
      const files = fs.readdirSync(logDir)
      const logFiles = files
        .filter((f) => f.startsWith('output_log_') && f.endsWith('.txt'))
        .map((f) => ({
          name: f,
          path: path.join(logDir, f),
          time: fs.statSync(path.join(logDir, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time)

      return logFiles.length > 0 ? logFiles[0].path : null
    } catch (err) {
      console.error('Error finding log files:', err)
      return null
    }
  }

  private checkForNewerLogFile(logDir: string) {
    const latest = this.findLatestLogFile(logDir)
    if (latest && latest !== this.currentLogPath) {
      this.findAndWatchLatestLog(logDir)
    }
  }

  private findAndWatchLatestLog(logDir: string) {
    const latestLog = this.findLatestLogFile(logDir)
    if (!latestLog) {
      this.state.isWatching = false
      this.state.currentWorldName = 'No VRChat output log found'
      this.broadcastState()
      return
    }

    if (this.watcher) {
      this.watcher.close()
    }

    this.currentLogPath = latestLog
    this.state.activeLogFile = path.basename(latestLog)
    this.state.isWatching = true

    try {
      const stats = fs.statSync(latestLog)
      // Read last 64KB on initial attach to populate current world
      const startPos = Math.max(0, stats.size - 64 * 1024)
      void this.readLogChunkAsync(latestLog, startPos, stats.size).then(() => {
        this.lastFilePosition = stats.size
      })

      // Watch file changes
      this.watcher = fs.watch(latestLog, (eventType) => {
        if (eventType === 'change') {
          this.scheduleFileRead(latestLog)
        }
      })

      this.broadcastState()
    } catch (e) {
      console.error('Error setting up log watcher:', e)
    }
  }

  private scheduleFileRead(filePath: string) {
    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce)
    }
    this.fileChangeDebounce = setTimeout(() => {
      this.fileChangeDebounce = null
      void this.readFileChangesAsync(filePath)
    }, LOG_READ_DEBOUNCE_MS)
  }

  private async readFileChangesAsync(filePath: string) {
    if (this.isReading) {
      this.scheduleFileRead(filePath)
      return
    }

    this.isReading = true
    try {
      const stats = await fs.promises.stat(filePath)
      if (stats.size > this.lastFilePosition) {
        await this.readLogChunkAsync(filePath, this.lastFilePosition, stats.size)
        this.lastFilePosition = stats.size
      } else if (stats.size < this.lastFilePosition) {
        this.lastFilePosition = 0
        await this.readLogChunkAsync(filePath, 0, stats.size)
        this.lastFilePosition = stats.size
      }
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      if (code === 'EBUSY' || code === 'EPERM') {
        this.scheduleFileRead(filePath)
        return
      }
      console.error('Error reading log file change:', e)
    } finally {
      this.isReading = false
    }
  }

  private async readLogChunkAsync(filePath: string, start: number, end: number) {
    if (start >= end) return
    const length = end - start
    const buffer = Buffer.alloc(length)

    const fd = await fs.promises.open(filePath, 'r')
    try {
      await fd.read(buffer, 0, length, start)
      this.parseLogLines(buffer.toString('utf-8'))
    } finally {
      await fd.close()
    }
  }

  private parseLogLines(content: string) {
    const lines = content.split(/\r?\n/)
    let stateChanged = false

    for (const line of lines) {
      if (!line.trim()) continue

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      // 1. Entering Room
      // Pattern: [Behaviour] Entering Room: World Name
      if (line.includes('[Behaviour] Entering Room: ')) {
        const match = line.match(/Entering Room:\s*(.*)/)
        if (match && match[1]) {
          const worldName = match[1].trim()
          this.state.currentWorldName = worldName
          this.state.joinedWorldAt = timestamp
          this.state.players = [] // Reset players on world change
          this.state.logEvents.unshift({
            type: 'world',
            message: `Entered room: ${worldName}`,
            timestamp
          })
          stateChanged = true

          // Record visited instance
          this.store.recordVisitedInstance({
            worldId: this.state.currentWorldId,
            worldName: worldName,
            instanceId: this.state.currentInstanceId,
            instanceType: this.state.instanceType,
            visitedAt: timestamp
          })
        }
      }

      // 2. Joining wrld_...
      // Pattern: [Behaviour] Joining wrld_xxx:12345~hidden...
      if (line.includes('[Behaviour] Joining wrld_')) {
        const match = line.match(/Joining (wrld_[a-f0-9-]+)(?::([^\s]+))?/)
        if (match) {
          this.state.currentWorldId = match[1]
          this.state.currentInstanceId = match[2] || 'public'
          stateChanged = true
        }
      }

      // 3. Player Joined
      // Pattern: [Behaviour] OnPlayerJoined PlayerName (usr_xxx)
      if (line.includes('[Behaviour] OnPlayerJoined ')) {
        const match = line.match(/OnPlayerJoined\s+([^(]+)(?:\s*\((usr_[^)]+)\))?/)
        if (match) {
          const displayName = match[1].trim()
          const userId = match[2] || ''

          // Check if already in list
          if (!this.state.players.some((p) => p.displayName === displayName)) {
            this.state.players.push({
              displayName,
              userId,
              joinedAt: timestamp
            })
          }

          this.state.logEvents.unshift({
            type: 'join',
            message: `${displayName} joined instance`,
            timestamp
          })
          stateChanged = true
        }
      }

      // 4. Player Left
      // Pattern: [Behaviour] OnPlayerLeft PlayerName (usr_xxx)
      if (line.includes('[Behaviour] OnPlayerLeft ')) {
        const match = line.match(/OnPlayerLeft\s+([^(]+)(?:\s*\((usr_[^)]+)\))?/)
        if (match) {
          const displayName = match[1].trim()
          this.state.players = this.state.players.filter((p) => p.displayName !== displayName)

          this.state.logEvents.unshift({
            type: 'leave',
            message: `${displayName} left instance`,
            timestamp
          })
          stateChanged = true
        }
      }
    }

    // Cap log events to 100 entries
    if (this.state.logEvents.length > 100) {
      this.state.logEvents = this.state.logEvents.slice(0, 100)
    }

    if (stateChanged) {
      this.broadcastState()
    }
  }

  private broadcastState() {
    const win = this.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('radar:update', this.state)
    }
  }
}
