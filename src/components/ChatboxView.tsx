import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  RefreshCw,
  Cpu,
  Play,
  Square,
  Plus,
  Trash2,
  Smile,
  Search,
  Check,
  Clock,
  Music,
  CloudSun,
  Heart,
  Eye,
  Keyboard,
  Sliders,
  Shuffle,
  MapPin,
  Globe2,
  Sparkles,
  AlignJustify,
  AlignCenter
} from 'lucide-react'
import { LiveHudData, MagicHudConfig } from '../types'

const POPULAR_CITIES = [
  { name: 'Riyadh', label: '🇸🇦 Riyadh' },
  { name: 'Dubai', label: '🇦🇪 Dubai' },
  { name: 'Kuwait City', label: '🇰🇼 Kuwait' },
  { name: 'Doha', label: '🇶🇦 Doha' },
  { name: 'Cairo', label: '🇪🇬 Cairo' },
  { name: 'London', label: '🇬🇧 London' },
  { name: 'New York', label: '🇺🇸 New York' },
  { name: 'Tokyo', label: '🇯🇵 Tokyo' }
]

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

export const ChatboxView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hud' | 'looper' | 'manual' | 'emojis'>('hud')

  // Live HUD Data
  const [liveData, setLiveData] = useState<LiveHudData>({
    stats: {
      cpuUsage: 0,
      ramUsage: 0,
      ramUsedGB: 0,
      ramTotalGB: 16,
      osUptime: '0h 0m'
    },
    weather: null,
    media: null,
    heartRate: null,
    hypeRateConnected: false,
    timeStr12: '--:-- --',
    timeStr24: '--:--'
  })

  // Multi-line Floating HUD Config
  const [hudConfig, setHudConfig] = useState<MagicHudConfig>({
    enabled: false,
    intervalSeconds: 5,
    showCustomText: true,
    customText: 'Try my tool fixing avatars before uploading',
    customMessages: [
      'Try my tool fixing avatars before uploading',
      '🟣 Running VRCFX Companion',
      '🎧 In VR | Feel free to join me!'
    ],
    showWeather: true,
    weatherCity: '',
    weatherUnit: 'C',
    weatherLang: 'en',
    alignment: 'center',
    showTime: true,
    timeFormat: '12h',
    showMedia: true,
    showHardware: true,
    hardwareFormat: 'compact',
    showHeartRate: true,
    hypeRateSessionId: '',
    hypeRateApiKey: '',
    simulatedBpm: 72,
    directSend: true
  })

  const [isHudRunning, setIsHudRunning] = useState(false)
  const [newLine1Text, setNewLine1Text] = useState('')
  const [activeLine1Index, setActiveLine1Index] = useState(0)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  // Single Message Sender
  const [currentText, setCurrentText] = useState('')
  const [directSend, setDirectSend] = useState(true)
  const [notifyChime, setNotifyChime] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [lastSentText, setLastSentText] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Message Looper
  const [loopMessages, setLoopMessages] = useState<string[]>([
    '🟣 VRCFX Companion Active',
    '🎧 In VR | Feel free to join me!',
    '⚡ Exploring new worlds 🌌'
  ])
  const [newLoopText, setNewLoopText] = useState('')
  const [loopInterval, setLoopInterval] = useState(8)
  const [isLooping, setIsLooping] = useState(false)

  // Emoji / Kaomoji Search
  const [emojiQuery, setEmojiQuery] = useState('')
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  // Poll live HUD data & running state
  useEffect(() => {
    let timer: NodeJS.Timeout

    const fetchLive = async () => {
      if (window.electronAPI) {
        try {
          const [hudActive, loopActive, data] = await Promise.all([
            window.electronAPI.isMagicHudRunning(),
            window.electronAPI.isOscLoopRunning(),
            window.electronAPI.getLiveHudData({
              city: hudConfig.weatherCity,
              hypeRateSessionId: hudConfig.hypeRateSessionId,
              hypeRateApiKey: hudConfig.hypeRateApiKey,
              simulatedBpm: hudConfig.showHeartRate ? hudConfig.simulatedBpm : undefined
            })
          ])
          setIsHudRunning(hudActive)
          setIsLooping(loopActive)
          if (data) setLiveData(data)
        } catch (e) {
          console.error(e)
        }
      }
    }

    fetchLive()
    timer = setInterval(fetchLive, 2500)
    return () => clearInterval(timer)
  }, [hudConfig.weatherCity, hudConfig.hypeRateSessionId, hudConfig.hypeRateApiKey, hudConfig.showHeartRate, hudConfig.simulatedBpm])

  // Toggle HUD broadcast
  const handleToggleHud = async () => {
    if (isHudRunning) {
      await window.electronAPI?.stopMagicHud()
      setIsHudRunning(false)
    } else {
      if (isLooping) {
        await window.electronAPI?.stopOscLoop()
        setIsLooping(false)
      }
      await window.electronAPI?.startMagicHud(hudConfig)
      setIsHudRunning(true)
    }
  }

  // Update running HUD if config changes
  useEffect(() => {
    if (isHudRunning && window.electronAPI?.startMagicHud) {
      window.electronAPI.startMagicHud(hudConfig)
    }
  }, [hudConfig])

  // Add Line 1 Rotating Message
  const handleAddLine1Msg = () => {
    if (!newLine1Text.trim()) return
    const updated = [...(hudConfig.customMessages || []), newLine1Text.trim()]
    setHudConfig((prev) => ({ ...prev, customMessages: updated }))
    setNewLine1Text('')
  }

  // Remove Line 1 Rotating Message
  const handleRemoveLine1Msg = (idx: number) => {
    const updated = (hudConfig.customMessages || []).filter((_, i) => i !== idx)
    setHudConfig((prev) => ({ ...prev, customMessages: updated }))
  }

  // Detect GPS / IP Location automatically
  const handleAutoDetectLocation = async () => {
    setIsDetectingLocation(true)
    try {
      const res = await fetch('https://wttr.in/?format=j1')
      if (res.ok) {
        const data = await res.json()
        const detected = data.nearest_area?.[0]?.areaName?.[0]?.value || ''
        setHudConfig((prev) => ({ ...prev, weatherCity: detected }))
      }
    } catch {
      setHudConfig((prev) => ({ ...prev, weatherCity: '' }))
    } finally {
      setIsDetectingLocation(false)
    }
  }

  // Single OSC send
  const handleSendManual = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!currentText.trim() || !window.electronAPI?.sendOscChatbox) return

    setIsSending(true)
    try {
      const ok = await window.electronAPI.sendOscChatbox(currentText.trim(), directSend, notifyChime)
      if (ok) setLastSentText(currentText.trim())
    } catch (e) {
      console.error(e)
    } finally {
      setIsSending(false)
    }
  }

  // Clear Chatbox
  const handleClear = async () => {
    if (window.electronAPI?.sendOscChatbox) {
      await window.electronAPI.sendOscChatbox('', true, false)
      setLastSentText(null)
    }
  }

  // Toggle Typing
  const handleToggleTyping = async () => {
    const next = !isTyping
    setIsTyping(next)
    if (window.electronAPI?.setOscTyping) {
      await window.electronAPI.setOscTyping(next)
    }
  }

  // Add loop message
  const handleAddLoopMsg = () => {
    if (!newLoopText.trim()) return
    setLoopMessages((prev) => [...prev, newLoopText.trim()])
    setNewLoopText('')
  }

  // Remove loop message
  const handleRemoveLoopMsg = (idx: number) => {
    setLoopMessages((prev) => prev.filter((_, i) => i !== idx))
  }

  // Toggle Loop
  const handleToggleLoop = async () => {
    if (isLooping) {
      await window.electronAPI?.stopOscLoop()
      setIsLooping(false)
    } else {
      if (loopMessages.length === 0) return
      if (isHudRunning) {
        await window.electronAPI?.stopMagicHud()
        setIsHudRunning(false)
      }
      await window.electronAPI?.startOscLoop(loopMessages, loopInterval, directSend, notifyChime)
      setIsLooping(true)
    }
  }

  // Insert emoji / kaomoji
  const insertItem = (val: string) => {
    if (activeTab === 'hud') {
      setNewLine1Text((prev) => prev + ' ' + val)
    } else if (activeTab === 'looper') {
      setNewLoopText((prev) => prev + ' ' + val)
    } else {
      setCurrentText((prev) => prev + ' ' + val)
    }
    navigator.clipboard.writeText(val)
    setCopiedItem(val)
    setTimeout(() => setCopiedItem(null), 1500)
  }

  // Generated Floating Lines Preview
  const customList = hudConfig.customMessages && hudConfig.customMessages.length > 0
    ? hudConfig.customMessages
    : hudConfig.customText ? [hudConfig.customText] : []

  const activeLine1Msg = customList.length > 0 ? customList[activeLine1Index % customList.length] : ''

  const rawPreviewLines: string[] = []
  if (hudConfig.showCustomText && activeLine1Msg) {
    rawPreviewLines.push(activeLine1Msg)
  }
  if (hudConfig.showWeather) {
    const isFahr = hudConfig.weatherUnit === 'F'
    const tempC = liveData.weather ? liveData.weather.tempC : 39
    const condKey = (liveData.weather ? liveData.weather.condition : 'sunny').toLowerCase()
    const condText = hudConfig.weatherLang === 'ar' ? (ARABIC_WEATHER_MAP[condKey] || condKey) : condKey
    const temp = isFahr ? Math.round((tempC * 9) / 5 + 32) : tempC
    const unit = isFahr ? '°f' : '°c'
    rawPreviewLines.push(`${temp}${unit} ${condText}`)
  }
  const timeLineParts: string[] = []
  if (hudConfig.showTime) {
    timeLineParts.push(hudConfig.timeFormat === '24h' ? liveData.timeStr24 : liveData.timeStr12)
  }
  if (hudConfig.showHeartRate) {
    timeLineParts.push(`♥ ${liveData.heartRate || hudConfig.simulatedBpm || 72} bpm`)
  }
  if (timeLineParts.length > 0) {
    rawPreviewLines.push(timeLineParts.join('  '))
  }
  if (hudConfig.showMedia) {
    if (liveData.media && liveData.media.isPlaying) {
      rawPreviewLines.push(`♪ ${liveData.media.fullTitle}`)
    } else {
      rawPreviewLines.push('♪ Sports - If You Want Me')
    }
  }
  if (hudConfig.showHardware) {
    const s = liveData.stats
    if (hudConfig.hardwareFormat === 'compact') {
      rawPreviewLines.push(`⚡ ${s.cpuUsage.toFixed(0)}% CPU | ${s.ramUsage.toFixed(0)}% RAM`)
    } else {
      const tempStr = s.gpuTemp ? ` ${s.gpuTemp}°C` : ''
      rawPreviewLines.push(`⚡ CPU: ${s.cpuUsage.toFixed(0)}% | RAM: ${s.ramUsedGB.toFixed(1)}GB${tempStr}`)
    }
  }

  // Emojis & Kaomoji Catalog
  const emojiCategories = [
    {
      category: 'VR & Cyber',
      items: ['🥽', '🎮', '🕹️', '🎧', '⚡', '👾', '🌌', '🪐', '📡', '💫', '🔋', '🔮', '✨', '💎']
    },
    {
      category: 'Status Badges',
      items: [
        '🟣 VRCFX',
        '🟢 ONLINE',
        '🔴 BUSY / DND',
        '🎵 LISTENING',
        '💬 AFK',
        '💤 SLEEPING',
        '🎧 IN VR',
        '☕ CHILLING',
        '🌟 VRC+'
      ]
    },
    {
      category: 'Kaomoji & Emotes',
      items: [
        '(◕‿◕)',
        '(づ｡◕‿‿◕｡)づ',
        '¯\\_(ツ)_/¯',
        '(╯°□°)╯︵ ┻━┻',
        '(⁄ ⁄•⁄ω⁄•⁄ ⁄)',
        '(•‿•)',
        '(>‿<)',
        '(っ˘з˘)っ',
        '( ˘ ³˘)♥',
        'ʕ•ᴥ•ʔ',
        '(¬‿¬)',
        '(ง •̀_•́)ง'
      ]
    },
    {
      category: 'Symbols & Aesthetics',
      items: ['✦', '✧', '★', '✪', '❖', '🌸', '👑', '🔥', '💖', '🌙', '☕', '🗡️', '🛡️', '⚡']
    }
  ]

  const filteredCategories = emojiCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        emojiQuery.trim() === ''
          ? true
          : item.toLowerCase().includes(emojiQuery.toLowerCase()) ||
            cat.category.toLowerCase().includes(emojiQuery.toLowerCase())
      )
    }))
    .filter((cat) => cat.items.length > 0)

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-neutral-950/40 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="page-title">
            <MessageSquare className="page-title-icon" />
            <span>OSC Chatbox Studio</span>
            {(isHudRunning || isLooping) && (
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" title="Running" />
            )}
          </h1>
          <p className="text-xs text-theme-muted mt-1">
            Real-time biometric overlays, rotating status messages, weather, Spotify music, and hardware telemetry directly in VRChat.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('hud')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'hud'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>VRCFX Floating HUD</span>
          </button>

          <button
            onClick={() => setActiveTab('looper')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'looper'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Status Looper</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'manual'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Direct Sender</span>
          </button>

          <button
            onClick={() => setActiveTab('emojis')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'emojis'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis & Badges</span>
          </button>
        </div>
      </div>

      {/* Main Tab 1: VRCFX Floating HUD */}
      {activeTab === 'hud' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Floating VR Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-card p-5 rounded-2xl border border-neutral-800 space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>Floating VR Chatbox Preview</span>
                </span>
                {isHudRunning ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Broadcasting Live
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-500 font-semibold">Paused</span>
                )}
              </div>

              {/* Realistic VRChat Floating Text Simulator */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#1a1f2e] to-[#0d1017] p-6 border border-neutral-800/80 min-h-[230px] flex flex-col items-center justify-center text-center overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

                {/* Floating Multi-Line White Text */}
                <div className={`relative z-10 space-y-1 w-full ${hudConfig.alignment === 'center' ? 'text-center' : 'text-left'}`}>
                  {rawPreviewLines.map((line, idx) => (
                    <div
                      key={idx}
                      dir="auto"
                      className={`text-white font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                        idx === 0 ? 'text-sm' : 'text-xs text-neutral-100'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                {/* Center Speech Bubble Tail at bottom */}
                <div className="relative mt-3 z-10">
                  <div className="w-8 h-8 rounded-xl bg-black/80 border border-neutral-700/60 shadow-lg flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>Update:</span>
                  <select
                    value={hudConfig.intervalSeconds}
                    onChange={(e) =>
                      setHudConfig((prev) => ({ ...prev, intervalSeconds: Number(e.target.value) }))
                    }
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value={3}>3 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={8}>8 seconds</option>
                    <option value={10}>10 seconds</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleToggleHud}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                    isHudRunning
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 shadow-red-500/10'
                      : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-cyan-500/20'
                  }`}
                >
                  {isHudRunning ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Broadcast</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Broadcast to VRChat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Line Modules Config (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card p-5 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Floating Line Modules</span>
                </span>

                {/* Alignment Switcher */}
                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setHudConfig((prev) => ({ ...prev, alignment: 'center' }))}
                    className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                      hudConfig.alignment === 'center'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <AlignCenter className="w-3 h-3" />
                    <span>Centered</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHudConfig((prev) => ({ ...prev, alignment: 'standard' }))}
                    className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                      hudConfig.alignment === 'standard'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <AlignJustify className="w-3 h-3" />
                    <span>Standard</span>
                  </button>
                </div>
              </div>

              {/* Module 1: Rotating Custom Messages */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hudConfig.showCustomText}
                      onChange={(e) =>
                        setHudConfig((prev) => ({ ...prev, showCustomText: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Line 1: Rotating Status Messages ({customList.length})</span>
                    </span>
                  </label>
                  <span className="text-[10px] text-neutral-500">Cycles automatically</span>
                </div>

                {hudConfig.showCustomText && (
                  <div className="space-y-2 pt-1">
                    {/* List of Line 1 messages */}
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {customList.map((msg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 group"
                        >
                          <span dir="auto" className="truncate font-medium text-white max-w-[280px]">
                            {msg}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine1Msg(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new Line 1 message */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        dir="auto"
                        value={newLine1Text}
                        onChange={(e) => setNewLine1Text(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLine1Msg()}
                        placeholder="Add custom message (Supports Arabic & Emojis)..."
                        maxLength={144}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddLine1Msg}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Module 2: Weather & Outdoor Temperature */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hudConfig.showWeather}
                      onChange={(e) =>
                        setHudConfig((prev) => ({ ...prev, showWeather: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Line 2: Live Location Weather & Temperature</span>
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    {/* Unit Switcher: C vs F */}
                    <button
                      type="button"
                      onClick={() =>
                        setHudConfig((prev) => ({
                          ...prev,
                          weatherUnit: prev.weatherUnit === 'F' ? 'C' : 'F'
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-amber-300 text-[10px] font-bold"
                    >
                      {hudConfig.weatherUnit === 'F' ? '°F' : '°C'}
                    </button>

                    {/* Language Switcher: EN vs AR */}
                    <button
                      type="button"
                      onClick={() =>
                        setHudConfig((prev) => ({
                          ...prev,
                          weatherLang: prev.weatherLang === 'ar' ? 'en' : 'ar'
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-cyan-300 text-[10px] font-bold"
                    >
                      {hudConfig.weatherLang === 'ar' ? 'عربي' : 'EN'}
                    </button>

                    {liveData.weather && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        {liveData.weather.tempC}°c {hudConfig.weatherLang === 'ar' ? (ARABIC_WEATHER_MAP[liveData.weather.condition.toLowerCase()] || liveData.weather.condition) : liveData.weather.condition}
                      </span>
                    )}
                  </div>
                </div>

                {hudConfig.showWeather && (
                  <div className="space-y-2 pt-1">
                    {/* Location Input & Detect Button */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                        <input
                          type="text"
                          value={hudConfig.weatherCity || ''}
                          onChange={(e) =>
                            setHudConfig((prev) => ({ ...prev, weatherCity: e.target.value }))
                          }
                          placeholder="Enter your city name (e.g. Riyadh, Dubai, London)..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoDetectLocation}
                        disabled={isDetectingLocation}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Globe2 className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                        <span>{isDetectingLocation ? 'Detecting...' : 'Auto Detect'}</span>
                      </button>
                    </div>

                    {/* Popular Quick-Select Cities */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-neutral-500 font-medium">Quick Pick:</span>
                      {POPULAR_CITIES.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setHudConfig((prev) => ({ ...prev, weatherCity: c.name }))}
                          className={`px-2 py-0.5 rounded-md text-[10px] border transition-all ${
                            hudConfig.weatherCity === c.name
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                              : 'bg-neutral-950 text-neutral-400 hover:text-white border-neutral-800'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Module 3: Time & Heart Rate */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hudConfig.showTime}
                      onChange={(e) =>
                        setHudConfig((prev) => ({ ...prev, showTime: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Line 3: Current Time</span>
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setHudConfig((prev) => ({
                          ...prev,
                          timeFormat: prev.timeFormat === '12h' ? '24h' : '12h'
                        }))
                      }
                      className="px-2.5 py-0.5 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-300 text-[11px] font-mono hover:text-white"
                    >
                      {hudConfig.timeFormat === '12h' ? '12h (05:18 PM)' : '24h (17:18)'}
                    </button>
                  </div>
                </div>

                {/* HypeRate.io Heart Rate Integration */}
                <div className="pt-2.5 border-t border-neutral-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hudConfig.showHeartRate}
                        onChange={(e) =>
                          setHudConfig((prev) => ({ ...prev, showHeartRate: e.target.checked }))
                        }
                        className="w-3.5 h-3.5 accent-rose-500 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                        <span>HypeRate.io Heart Rate</span>
                      </span>
                    </label>

                    {hudConfig.showHeartRate && (
                      <div className="flex items-center gap-2">
                        {liveData.hypeRateConnected ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live: ♥ {liveData.heartRate || 72} bpm
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                            ♥ {liveData.heartRate || hudConfig.simulatedBpm || 72} bpm
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {hudConfig.showHeartRate && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">
                            HypeRate Session ID / Widget Code
                          </label>
                          <input
                            type="text"
                            value={hudConfig.hypeRateSessionId || ''}
                            onChange={(e) =>
                              setHudConfig((prev) => ({ ...prev, hypeRateSessionId: e.target.value }))
                            }
                            placeholder="e.g. 1234 or Widget ID"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-rose-400"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">
                            HypeRate API Key / Token
                          </label>
                          <input
                            type="password"
                            value={hudConfig.hypeRateApiKey || ''}
                            onChange={(e) =>
                              setHudConfig((prev) => ({ ...prev, hypeRateApiKey: e.target.value }))
                            }
                            placeholder="Enter API Key from HypeRate..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-rose-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Module 4: Now Playing Music (Spotify / Windows Media) */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hudConfig.showMedia}
                      onChange={(e) =>
                        setHudConfig((prev) => ({ ...prev, showMedia: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Line 4: Now Playing Music (Spotify / Windows Media)</span>
                    </span>
                  </label>

                  {liveData.media && liveData.media.isPlaying ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 truncate max-w-[150px]">
                      ♪ {liveData.media.track}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-500">Auto-detecting player</span>
                  )}
                </div>
              </div>

              {/* Module 5: Hardware Stats */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hudConfig.showHardware}
                      onChange={(e) =>
                        setHudConfig((prev) => ({ ...prev, showHardware: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Line 5: System Hardware Stats</span>
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setHudConfig((prev) => ({
                          ...prev,
                          hardwareFormat: prev.hardwareFormat === 'compact' ? 'full' : 'compact'
                        }))
                      }
                      className="px-2.5 py-0.5 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-300 text-[11px] font-mono hover:text-white"
                    >
                      {hudConfig.hardwareFormat === 'compact' ? 'Compact (% load)' : 'Full (GB & Temp)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 2: Status & Message Looper */}
      {activeTab === 'looper' && (
        <div className="glass-card p-5 rounded-2xl border border-neutral-800 space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <RefreshCw className={`w-4 h-4 text-purple-400 ${isLooping ? 'animate-spin' : ''}`} />
              <span>Status & Message Looper</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400">Cycle every:</span>
              <select
                value={loopInterval}
                onChange={(e) => setLoopInterval(Number(e.target.value))}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
              >
                <option value={5}>5 seconds</option>
                <option value={8}>8 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>

              <button
                type="button"
                onClick={handleToggleLoop}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg ${
                  isLooping
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 shadow-red-500/10'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                }`}
              >
                {isLooping ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop Loop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start Loop</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loop items list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {loopMessages.map((msg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 text-xs text-neutral-200 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono text-neutral-500 font-bold shrink-0">
                    #{idx + 1}
                  </span>
                  <span dir="auto" className="truncate font-medium text-white">
                    {msg}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveLoopMsg(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new loop item */}
          <div className="flex gap-2">
            <input
              type="text"
              dir="auto"
              value={newLoopText}
              onChange={(e) => setNewLoopText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLoopMsg()}
              placeholder="Add new looping message (Supports Arabic & Emojis)..."
              maxLength={144}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleAddLoopMsg}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Tab 3: Direct Manual Sender */}
      {activeTab === 'manual' && (
        <div className="glass-card p-5 rounded-2xl border border-neutral-800 space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>Direct Chatbox Message Sender</span>
            </div>
            {lastSentText && (
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Active in Game
              </span>
            )}
          </div>

          {/* Input & Send Form */}
          <form onSubmit={handleSendManual} className="space-y-3">
            <div className="relative">
              <textarea
                dir="auto"
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                maxLength={144}
                rows={3}
                placeholder="Enter message to send directly to VRChat chatbox..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-cyan-400 resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-neutral-500 font-mono">
                {currentText.length}/144
              </span>
            </div>

            {/* Toggles Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={directSend}
                    onChange={(e) => setDirectSend(e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-medium">Direct Send</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={notifyChime}
                    onChange={(e) => setNotifyChime(e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-medium">Notification SFX</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleTyping}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isTyping
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{isTyping ? 'Typing ON' : 'Typing'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold border border-neutral-800"
                >
                  Clear
                </button>

                <button
                  type="submit"
                  disabled={isSending || !currentText.trim()}
                  className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Tab 4: Emojis, Kaomoji & Status Badges Studio */}
      {activeTab === 'emojis' && (
        <div className="glass-card p-5 rounded-2xl border border-neutral-800 space-y-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Smile className="w-4 h-4 text-cyan-400" />
              <span>Emojis, Kaomoji & Status Badges Catalog</span>
            </div>
            {copiedItem && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3 h-3" />
                <span>Inserted & Copied!</span>
              </span>
            )}
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={emojiQuery}
              onChange={(e) => setEmojiQuery(e.target.value)}
              placeholder="Search emojis, kaomoji, cyber badges, symbols..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Catalog grid */}
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {filteredCategories.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  {cat.category}
                </span>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                      title={`Click to insert "${item}"`}
                    >
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
