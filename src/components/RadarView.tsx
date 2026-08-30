import React, { useState, useEffect, useMemo } from 'react'
import {
  Radio,
  Users,
  MapPin,
  RefreshCw,
  Activity,
  UserCheck,
  UserX,
  FileText,
  History,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Search,
  Star,
  User,
  Shield,
  Sparkles,
  AlertTriangle,
  Edit3,
  LogIn,
  Filter,
  Zap,
  Clock,
  Eye
} from 'lucide-react'
import { RadarState, VisitedInstance, VRCUser, ActivityLogItem } from '../types'
import { PlayerModal } from './PlayerModal'
import { formatArabicName } from '../utils/arabic'

interface RadarViewProps {
  radarState: RadarState
  onRestartWatcher: () => void
  friends?: VRCUser[]
  onJoinLocation?: (location: string) => void
}

type LogFilterType = 'all' | 'online' | 'world_change' | 'unfriended' | 'name_change'

export const RadarView: React.FC<RadarViewProps> = ({
  radarState,
  onRestartWatcher,
  friends = [],
  onJoinLocation
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'players' | 'logs' | 'history'>('activity')
  const [playerSearch, setPlayerSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityFilter, setActivityFilter] = useState<LogFilterType>('all')
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
  const [visitedHistory, setVisitedHistory] = useState<VisitedInstance[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [inspectingUser, setInspectingUser] = useState<{
    displayName: string
    userId?: string
  } | null>(null)

  // Live seconds ticker to keep the UI visibly pulsing and live
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch activity logs and visited history on mount
  useEffect(() => {
    loadActivityLogs()
    loadVisitedHistory()
  }, [])

  // Listen for real-time activity events
  useEffect(() => {
    if (!window.electronAPI?.onActivityEvent) return

    const unsub = window.electronAPI.onActivityEvent((newEvent: ActivityLogItem) => {
      setActivityLogs((prev) => [newEvent, ...prev.slice(0, 249)])
      setSecondsAgo(0)
    })

    return () => {
      if (unsub) unsub()
    }
  }, [])

  const loadActivityLogs = async () => {
    if (window.electronAPI?.getActivityLogs) {
      try {
        const logs = await window.electronAPI.getActivityLogs()
        if (logs) {
          setActivityLogs(logs)
          setSecondsAgo(0)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleManualSync = async () => {
    setIsRefreshingLogs(true)
    try {
      if (window.electronAPI?.triggerActivityCheck) {
        const logs = await window.electronAPI.triggerActivityCheck()
        if (logs) {
          setActivityLogs(logs)
          setSecondsAgo(0)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsRefreshingLogs(false)
    }
  }

  const handleClearActivityLogs = async () => {
    if (window.electronAPI?.clearActivityLogs) {
      await window.electronAPI.clearActivityLogs()
      setActivityLogs([])
    }
  }

  const loadVisitedHistory = async () => {
    if (window.electronAPI?.getVisitedInstances) {
      try {
        const list = await window.electronAPI.getVisitedInstances()
        if (list) setVisitedHistory(list)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleClearHistory = async () => {
    if (window.electronAPI?.clearVisitedInstances) {
      await window.electronAPI.clearVisitedInstances()
      setVisitedHistory([])
    }
  }

  const copyInstanceLink = (worldId: string, instanceId: string) => {
    const fullId = instanceId ? `${worldId}:${instanceId}` : worldId
    const link = `https://vrchat.com/home/launch?worldId=${worldId}&instanceId=${instanceId || ''}`
    navigator.clipboard.writeText(link)
    setCopiedLink(fullId)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const copyAllPlayers = () => {
    const text = radarState.players.map((p) => p.displayName).join('\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  // Helper to check if a user is a friend
  const checkIsFriend = (displayName: string, userId?: string) => {
    return friends.some(
      (f) =>
        (userId && f.id === userId) ||
        f.displayName.toLowerCase() === displayName.toLowerCase()
    )
  }

  // Filter counters
  const counts = useMemo(() => {
    let online = 0
    let world = 0
    let unfriend = 0
    let nameChange = 0

    activityLogs.forEach((item) => {
      if (item.type === 'online' || item.type === 'offline') online++
      else if (item.type === 'world_change') world++
      else if (item.type === 'unfriended') unfriend++
      else if (item.type === 'name_change') nameChange++
    })

    return { total: activityLogs.length, online, world, unfriend, nameChange }
  }, [activityLogs])

  const filteredPlayers = useMemo(() => {
    return radarState.players.filter(
      (p) =>
        p.displayName.toLowerCase().includes(playerSearch.toLowerCase()) ||
        (p.userId && p.userId.toLowerCase().includes(playerSearch.toLowerCase()))
    )
  }, [radarState.players, playerSearch])

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((item) => {
      const matchesFilter =
        activityFilter === 'all' ||
        (activityFilter === 'online' && (item.type === 'online' || item.type === 'offline')) ||
        (activityFilter === 'world_change' && item.type === 'world_change') ||
        (activityFilter === 'unfriended' && item.type === 'unfriended') ||
        (activityFilter === 'name_change' && item.type === 'name_change')

      const matchesSearch =
        !activitySearch.trim() ||
        item.displayName.toLowerCase().includes(activitySearch.toLowerCase()) ||
        item.message.toLowerCase().includes(activitySearch.toLowerCase()) ||
        (item.oldValue && item.oldValue.toLowerCase().includes(activitySearch.toLowerCase())) ||
        (item.newValue && item.newValue.toLowerCase().includes(activitySearch.toLowerCase()))

      return matchesFilter && matchesSearch
    })
  }, [activityLogs, activityFilter, activitySearch])

  const nextScanSeconds = Math.max(0, 8 - (secondsAgo % 8))

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden bg-app">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="page-title">
            <Radio className="page-title-icon" />
            Live Radar
          </h1>
          <p className="text-xs text-theme-muted mt-0.5">
            Real-time background friend telemetry, room tracking, and unfriend alerts.
          </p>
        </div>

        {/* Live Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isRefreshingLogs}
            className="btn-crimson-primary flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
            title="Force instant VRChat server sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
            <span>Sync Live Now</span>
          </button>
          <button
            onClick={onRestartWatcher}
            className="btn-gothic-secondary flex items-center gap-2 px-3.5 py-2 text-xs font-medium cursor-pointer group"
            title="Rescan local VRChat output log file"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent group-hover:rotate-180 transition-transform duration-300" />
            <span>Rescan Logs</span>
          </button>
        </div>
      </div>

      {/* Current Room Banner Glass Card */}
      <div className="gothic-panel p-4 md:p-5 mb-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="section-label flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-accent" />
              Current room
            </span>
            <h2 dir="auto" className="text-base md:text-lg font-semibold text-theme-primary truncate mt-1">
              {radarState.currentWorldName}
            </h2>
            {radarState.currentWorldId && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-theme-muted font-mono truncate max-w-xs">
                  {radarState.currentWorldId}
                </span>
                <span className="px-1.5 py-px rounded text-[9px] font-medium uppercase bg-accent-subtle text-accent border border-accent">
                  {radarState.instanceType}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 shrink-0 self-end md:self-center">
            <div className="text-right">
              <span className="section-label block">Occupants</span>
              <span className="text-lg font-semibold text-theme-primary tabular-nums">
                {radarState.players.length}
                <span className="text-xs text-theme-muted font-medium ml-1">players</span>
              </span>
            </div>
            {radarState.joinedWorldAt && (
              <div className="text-right border-l border-theme pl-5">
                <span className="section-label block">Entered</span>
                <span className="text-xs font-medium text-theme-secondary font-mono">
                  {radarState.joinedWorldAt}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold backdrop-blur-md overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-accent text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>24/7 Activity Stream ({activityLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'players'
                ? 'bg-accent text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Room Occupants ({radarState.players.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-accent text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>In-Game Logs ({radarState.logEvents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-accent text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Visited History ({visitedHistory.length})</span>
          </button>
        </div>

        {/* Tab-specific Search & Actions */}
        {activeTab === 'activity' && (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                dir="auto"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search friend, world, or name..."
                className="pl-8.5 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-white/30 focus:outline-none focus:border-crimson-500 transition-all"
              />
            </div>
            {activityLogs.length > 0 && (
              <button
                onClick={handleClearActivityLogs}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-crimson-900/20 text-white/50 hover:text-accent border border-white/[0.08] hover:border-crimson-500/40 transition-colors cursor-pointer"
                title="Clear Activity Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {activeTab === 'players' && radarState.players.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                dir="auto"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search room occupants..."
                className="pl-8.5 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-white/30 focus:outline-none focus:border-crimson-500 transition-all"
              />
            </div>
            <button
              onClick={copyAllPlayers}
              className="btn-gothic-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
              title="Copy All Player Names"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied' : 'Copy Names'}</span>
            </button>
          </div>
        )}

        {activeTab === 'history' && visitedHistory.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-crimson-900/20 hover:bg-crimson-900/40 border border-crimson-500/30 text-xs font-bold text-crimson-300 hover:text-white transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Activity Filter Chips with Dynamic Real-Time Counters */}
      {activeTab === 'activity' && (
        <div className="flex items-center gap-2 mb-3.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          {[
            { id: 'all', label: `All Activity (${counts.total})` },
            { id: 'online', label: `Online / Offline (${counts.online})` },
            { id: 'world_change', label: `World Traveled (${counts.world})` },
            { id: 'unfriended', label: `Unfriended Alerts (${counts.unfriend})` },
            { id: 'name_change', label: `Name Changes (${counts.nameChange})` }
          ].map((chip) => {
            const isSelected = activityFilter === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setActivityFilter(chip.id as LogFilterType)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-accent text-white font-medium border border-accent'
                    : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Content Stream */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* 1. 24/7 Activity Stream */}
        {activeTab === 'activity' &&
          (filteredActivityLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-theme-muted text-center">
              <Activity className="w-10 h-10 text-theme-muted mb-3" />
              <p className="text-sm font-bold text-white/80">No activity events recorded yet</p>
              <p className="text-xs text-white/40 mt-1 max-w-sm">
                VRCFX runs 24/7 in the background tracking friend logins, world travels, unfriended events, and name changes.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pb-8">
              {filteredActivityLogs.map((item) => {
                const isUnfriend = item.type === 'unfriended'
                const isNameChange = item.type === 'name_change'
                const isOnline = item.type === 'online'
                const isWorld = item.type === 'world_change'

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      setInspectingUser({
                        displayName: item.displayName,
                        userId: item.userId
                      })
                    }
                    className={`p-3.5 rounded-2xl bg-[#09090d]/90 backdrop-blur-xl border transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer ${
                      isUnfriend
                        ? 'border-crimson-500/40 hover:border-crimson-500/80 bg-crimson-950/10'
                        : isNameChange
                        ? 'border-purple-500/30 hover:border-purple-500/70'
                        : isOnline
                        ? 'border-emerald-500/30 hover:border-emerald-500/70'
                        : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar Thumbnail */}
                      <div className="relative shrink-0">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-white/15 bg-neutral-900 shadow-md"
                          />
                        ) : (
                          <div className="avatar-fallback w-10 h-10 text-xs font-medium text-theme-secondary">
                            {item.displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-[#09090d] ${
                            isOnline
                              ? 'bg-emerald-500'
                              : isUnfriend
                              ? 'bg-crimson-500'
                              : isNameChange
                              ? 'bg-purple-500'
                              : 'bg-sky-500'
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span dir="auto" className="font-bold text-xs text-white group-hover:text-accent transition-colors truncate">
                            {item.displayName}
                          </span>
                          {isOnline && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black shrink-0">
                              Joined Game
                            </span>
                          )}
                          {isUnfriend && (
                            <span className="px-2 py-0.5 rounded-full bg-crimson-500/25 text-crimson-300 border border-crimson-500/50 text-[9px] font-black shrink-0">
                              Unfriended
                            </span>
                          )}
                          {isNameChange && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black shrink-0">
                              Name Changed
                            </span>
                          )}
                          {isWorld && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-black shrink-0">
                              Traveled
                            </span>
                          )}
                        </div>
                        <p dir="auto" className="text-[11px] text-white/70 truncate mt-0.5 font-medium">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.location && onJoinLocation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onJoinLocation(item.location!)
                          }}
                          className="btn-crimson-primary px-2.5 py-1 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Join</span>
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-white/40">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

        {/* 2. Room Occupants */}
        {activeTab === 'players' &&
          (filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-white/40 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm font-bold text-white/80">
                {playerSearch ? 'No matching occupants found' : 'No players detected in room'}
              </p>
              <p className="text-xs text-white/40 mt-1 max-w-sm">
                When you enter an instance in VRChat, all occupants in your room will be tracked here in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pb-8">
              {filteredPlayers.map((player, idx) => {
                const isFriend = checkIsFriend(player.displayName, player.userId)
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setInspectingUser({
                        displayName: player.displayName,
                        userId: player.userId
                      })
                    }
                    className="gothic-card p-4 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="avatar-fallback w-10 h-10 text-sm font-medium">
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        {isFriend && (
                          <span
                            title="Friend"
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border border-[#09090b] shadow-sm"
                          >
                            <Star className="w-2.5 h-2.5 fill-slate-950" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span dir="auto" className="font-bold text-xs text-white/95 group-hover:text-accent transition-colors truncate user-name">
                            {formatArabicName(player.displayName)}
                          </span>
                          {isFriend && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black shrink-0">
                              Friend
                            </span>
                          )}
                        </div>
                        {player.userId && (
                          <p className="text-[10px] text-white/35 font-mono truncate mt-0.5">
                            {player.userId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[9px] text-white/40 font-semibold uppercase block">Joined</span>
                      <span className="text-xs font-mono font-bold text-accent">
                        {player.joinedAt}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

        {/* 3. In-Game Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-2 pb-8">
            {radarState.logEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-72 text-white/40 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                  <Activity className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-sm font-bold text-white/80">No recent log events</p>
                <p className="text-xs text-white/40 mt-1">
                  Game telemetry and join/leave events will stream live as they happen in VRChat.
                </p>
              </div>
            ) : (
              radarState.logEvents.map((evt, idx) => {
                const cleanedMsg = evt.message.replace(/^(Joined|Left|World):\s*/i, '')
                const isFriend = checkIsFriend(cleanedMsg)
                const isPlayerEvent = evt.type === 'join' || evt.type === 'leave'

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isPlayerEvent) {
                        setInspectingUser({ displayName: cleanedMsg })
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.07] text-xs transition-all duration-150 ${
                      isPlayerEvent ? 'cursor-pointer hover:bg-white/[0.06] hover:border-crimson-500/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {evt.type === 'join' && (
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {evt.type === 'leave' && (
                        <UserX className="w-4 h-4 text-accent shrink-0" />
                      )}
                      {evt.type === 'world' && (
                        <MapPin className="w-4 h-4 text-crimson-500 shrink-0" />
                      )}
                      {evt.type === 'info' && (
                        <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      <span dir="auto" className="text-white/90 truncate font-medium">
                        {evt.message}
                      </span>
                      {isPlayerEvent && isFriend && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black shrink-0 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-emerald-400" />
                          Friend
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-white/40 shrink-0 ml-3">
                      {evt.timestamp}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 4. Visited History */}
        {activeTab === 'history' && (
          <div className="space-y-3 pb-8">
            {visitedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-72 text-white/40 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                  <History className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-sm font-bold text-white/80">No visited instances yet</p>
                <p className="text-xs text-white/40 mt-1">
                  Instances you visit while VRChat is active will be archived here automatically.
                </p>
              </div>
            ) : (
              visitedHistory.map((item, idx) => {
                const fullId = item.instanceId
                  ? `${item.worldId}:${item.instanceId}`
                  : item.worldId
                const isCopied = copiedLink === fullId

                return (
                  <div
                    key={idx}
                    className="gothic-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="avatar-fallback w-10 h-10">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 dir="auto" className="font-bold text-xs text-white truncate">
                          {item.worldName}
                        </h3>
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <span className="text-[10px] font-mono text-white/40 truncate max-w-xs">
                            {item.worldId}
                          </span>
                          {item.instanceType && (
                            <span className="px-2 py-0.5 rounded-full bg-crimson-500/15 border border-crimson-500/30 text-[9px] font-black text-crimson-300 uppercase">
                              {item.instanceType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-[10px] text-white/40 font-mono">
                        {item.visitedAt}
                      </span>
                      <button
                        onClick={() => copyInstanceLink(item.worldId, item.instanceId)}
                        className="btn-gothic-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Copy Launch URL"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                      {item.worldId && (
                        <button
                          onClick={async () => {
                            if (window.electronAPI?.launchInstance) {
                              const target = item.instanceId
                                ? `${item.worldId}:${item.instanceId}`
                                : item.worldId
                              await window.electronAPI.launchInstance(target)
                            }
                          }}
                          className="btn-crimson-primary px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                          title="Join Instance in VRChat"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Join</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Inspect User Modal */}
      {inspectingUser && (
        <PlayerModal
          displayName={inspectingUser.displayName}
          userId={inspectingUser.userId}
          friends={friends}
          onClose={() => setInspectingUser(null)}
          onJoinLocation={onJoinLocation}
        />
      )}
    </div>
  )
}
