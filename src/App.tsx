import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar, NavTab } from './components/Sidebar'
import { FriendsView } from './components/FriendsView'
import { CleanerModal } from './components/CleanerModal'
import { WorldsView } from './components/WorldsView'
import { AvatarsView } from './components/AvatarsView'
import { ProfileView } from './components/ProfileView'
import { RadarView } from './components/RadarView'
import { SettingsView } from './components/SettingsView'
import { LoginModal } from './components/LoginModal'
import { PlayerModal } from './components/PlayerModal'
import { OnboardingModal } from './components/OnboardingModal'
import { ManualView } from './components/ManualView'
import { Info, X } from 'lucide-react'
import {
  NotificationToastContainer,
  AppNotification
} from './components/NotificationToast'
import { VRCUser, RadarState, AppSettings, normalizeTheme } from './types'
import { translations, SupportedLanguage } from './i18n'
import { soundService } from './utils/sound-service'

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('friends')
  const [currentUser, setCurrentUser] = useState<VRCUser | null>(null)
  const [onlineFriends, setOnlineFriends] = useState<VRCUser[]>([])
  const [offlineFriends, setOfflineFriends] = useState<VRCUser[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isCleanerOpen, setIsCleanerOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [alreadyRunningNotice, setAlreadyRunningNotice] = useState<{
    title: string
    message: string
    timestamp: string
  } | null>(null)
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Language state
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    try {
      return (localStorage.getItem('vrcfx-language') as SupportedLanguage) || 'en'
    } catch {
      return 'en'
    }
  })

  // Player Inspector Modal State
  const [inspectingUser, setInspectingUser] = useState<{
    displayName: string
    userId?: string
  } | null>(null)

  // Notification Toast State
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const [settings, setSettings] = useState<AppSettings>({
    vrcLogPath: '',
    autoRefreshFriends: false,
    refreshIntervalMinutes: 15,
    theme: (localStorage.getItem('vrcfx-theme') as any) || 'pitch-black',
    language: 'en',
    hasCompletedOnboarding: false,
    soundAlerts: true,
    soundVolume: 75,
    soundChimeType: 'harmonic',
    enableLogWatcher: true,
    notificationPosition: 'bottom-right',
    startWithWindows: false,
    minimizeToTray: true,
    desktopOverlayNotifications: true,
    notifyFriendOnline: true,
    notifyFriendOnlineDesktop: true,
    notifyFriendOffline: false,
    notifyFriendWorld: true,
    notifyFriendWorldDesktop: true,
    notifyUnfriended: true,
    notifyUnfriendedDesktop: false,
    notifyNameChange: true,
    notifyNameChangeDesktop: false,
    notifyFriendAdded: true
  })

  const t = translations[language] || translations.en
  const isArabic = language === 'ar'

  // Synchronized Ref for Settings to prevent stale closures
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const playNotificationSound = useCallback((force = false) => {
    const s = settingsRef.current
    if (!s.soundAlerts && !force) return
    try {
      soundService.play(s.soundChimeType || 'harmonic', s.soundVolume ?? 75, force)
    } catch (e) {
      console.error('Audio playback error:', e)
    }
  }, [])

  const addNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'timestamp'>) => {
      const now = new Date()
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const newNotif: AppNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp
      }
      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)])

      // Trigger floating overlay outside on the active monitor
      if (window.electronAPI?.showDesktopNotification) {
        let accentType: 'online' | 'world' | 'unfriended' | 'name_change' | 'default' = 'default'
        if (newNotif.type === 'friend_online' || (newNotif.type === 'player_join' && newNotif.isFriend)) {
          accentType = 'online'
        } else if (newNotif.type === 'world_change') {
          accentType = 'world'
        } else if (newNotif.type === 'unfriended') {
          accentType = 'unfriended'
        } else if (newNotif.type === 'name_change') {
          accentType = 'name_change'
        }

        window.electronAPI.showDesktopNotification({
          title: newNotif.title,
          message: newNotif.message,
          isFriend: newNotif.isFriend,
          location: newNotif.location,
          avatarUrl: newNotif.avatarUrl,
          accentType
        }).catch(() => {})
      }

      if (settingsRef.current.soundAlerts) {
        playNotificationSound()
      }
    },
    [playNotificationSound]
  )

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const [radarState, setRadarState] = useState<RadarState>({
    currentWorldName: 'Waiting for VRChat...',
    currentWorldId: '',
    currentInstanceId: '',
    instanceType: 'Public',
    joinedWorldAt: '',
    players: [],
    logEvents: [],
    isWatching: false,
    activeLogFile: ''
  })

  // Check login session on mount
  useEffect(() => {
    const init = async () => {
      if (window.electronAPI) {
        try {
          const savedSettings = await window.electronAPI.getSettings()
          if (savedSettings) {
            setSettings(savedSettings)
            if (savedSettings.language) {
              setLanguage(savedSettings.language)
            }
            if (!savedSettings.hasCompletedOnboarding) {
              setIsOnboardingOpen(true)
            }
          }
        } catch (e) {
          console.warn('Failed to load settings:', e)
        }

        try {
          const session = await window.electronAPI.checkSession()
          if (session && session.success && session.user) {
            setCurrentUser(session.user)
            loadFriendsData()
          } else {
            setIsLoginOpen(true)
          }
        } catch (e) {
          console.warn('Session check failed:', e)
          setIsLoginOpen(true)
        }

        try {
          const radar = await window.electronAPI.getRadarState()
          if (radar) setRadarState(radar)
        } catch (e) {
          console.warn('Radar state load failed:', e)
        }
      } else {
        setIsLoginOpen(true)
      }
    }
    init()
  }, [])

  // Language & RTL Direction Effect
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr'
    try {
      localStorage.setItem('vrcfx-language', language)
    } catch {}
  }, [language])

  // Real-time 24/7 Background Friends Tracker Activity Listener
  useEffect(() => {
    if (!window.electronAPI?.onActivityToast) return

    const unsub = window.electronAPI.onActivityToast((payload: any) => {
      addNotification({
        type: payload.type || 'info',
        title: payload.title || 'VRChat Update',
        message: payload.message || '',
        displayName: payload.displayName,
        userId: payload.userId,
        isFriend: payload.isFriend ?? true,
        location: payload.location,
        avatarUrl: payload.avatarUrl,
        worldName: payload.worldName
      })
    })

    return () => {
      if (unsub) unsub()
    }
  }, [addNotification])

  // Real-time IPC Log Watcher Listener
  useEffect(() => {
    if (!window.electronAPI?.onRadarUpdate) return

    const unsub = window.electronAPI.onRadarUpdate((newState: RadarState) => {
      setRadarState((prevState) => {
        // 1. Check if world changed
        if (
          newState.currentWorldName &&
          newState.currentWorldName !== 'Not Connected / Searching Logs' &&
          newState.currentWorldName !== prevState.currentWorldName &&
          prevState.currentWorldName !== 'Waiting for VRChat...'
        ) {
          addNotification({
            type: 'world_change',
            title: 'World Changed',
            message: `Entered: ${newState.currentWorldName}`,
            worldName: newState.currentWorldName,
            location: newState.currentWorldId
          })
        }

        // 2. Check for newly joined players
        if (newState.players.length > prevState.players.length) {
          const prevNames = new Set(prevState.players.map((p) => p.displayName.toLowerCase()))
          const newPlayers = newState.players.filter(
            (p) => !prevNames.has(p.displayName.toLowerCase())
          )

          newPlayers.forEach((player) => {
            const isFriend =
              player.isFriend ||
              onlineFriends.some((f) => f.displayName.toLowerCase() === player.displayName.toLowerCase()) ||
              offlineFriends.some((f) => f.displayName.toLowerCase() === player.displayName.toLowerCase())

            addNotification({
              type: 'player_join',
              title: isFriend ? 'Friend Joined Instance' : 'Player Joined Room',
              message: `${player.displayName} entered the room`,
              displayName: player.displayName,
              userId: player.userId,
              isFriend
            })
          })
        }

        return newState
      })
    })

    return () => {
      if (unsub) unsub()
    }
  }, [addNotification, onlineFriends, offlineFriends])

  const loadFriendsData = async (force = false) => {
    if (!window.electronAPI) return
    setIsRefreshing(true)
    try {
      const data = await window.electronAPI.getFriends(force)
      if (data) {
        setOnlineFriends(data.online || [])
        setOfflineFriends(data.offline || [])
      }
    } catch (e) {
      console.error('Failed to load friends:', e)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh interval
  useEffect(() => {
    if (!settings.autoRefreshFriends || !currentUser) return
    const intervalMs = Math.max(10, settings.refreshIntervalMinutes || 15) * 60 * 1000
    const timer = setInterval(() => {
      loadFriendsData(true)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [settings.autoRefreshFriends, settings.refreshIntervalMinutes, currentUser])

  const handleDeleteFriend = async (userId: string) => {
    if (!window.electronAPI) return false
    try {
      const res = await window.electronAPI.deleteFriend(userId)
      if (res.success) {
        setOfflineFriends((prev) => prev.filter((f) => f.id !== userId))
        setOnlineFriends((prev) => prev.filter((f) => f.id !== userId))
        return true
      }
      return false
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const handleDeleteBulk = async (userIds: string[]) => {
    if (!window.electronAPI) return { success: false, deletedCount: 0 }
    try {
      const res = await window.electronAPI.deleteFriendsBulk(userIds)
      if (res.success) {
        setOfflineFriends((prev) => prev.filter((f) => !userIds.includes(f.id)))
        setOnlineFriends((prev) => prev.filter((f) => !userIds.includes(f.id)))
      }
      return res
    } catch (e) {
      console.error(e)
      return { success: false, deletedCount: 0 }
    }
  }

  const handleLogout = async () => {
    if (window.electronAPI) {
      await window.electronAPI.logout()
    }
    setCurrentUser(null)
    setOnlineFriends([])
    setOfflineFriends([])
    setIsLoginOpen(true)
  }

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    if (window.electronAPI) {
      const updated = await window.electronAPI.saveSettings(newSettings)
      setSettings(updated)
      if (updated.language) {
        setLanguage(updated.language)
      }
    }
  }

  const handleRestartRadar = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.restartRadar()
      if (res) setRadarState(res)
    }
  }

  // Listen for second instance launch (already running notice)
  useEffect(() => {
    if (window.electronAPI?.onAlreadyRunningNotice) {
      const unsub = window.electronAPI.onAlreadyRunningNotice((payload) => {
        setAlreadyRunningNotice(payload)
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = setTimeout(() => {
          setAlreadyRunningNotice(null)
        }, 40000) // 40 seconds auto dismiss
      })
      return () => unsub()
    }
  }, [])

  // Apply theme class and data-theme attribute
  useEffect(() => {
    const themeName = normalizeTheme(
      settings.theme || (localStorage.getItem('vrcfx-theme') as string) || 'pitch-black'
    )
    const themeClass = `theme-${themeName}`
    document.documentElement.className = themeClass
    document.documentElement.setAttribute('data-theme', themeName)
    document.body.className = themeClass
    document.body.setAttribute('data-theme', themeName)
    try {
      localStorage.setItem('vrcfx-theme', themeName)
    } catch {}
  }, [settings.theme])

  const isMuted = !settings.soundAlerts && !settings.desktopOverlayNotifications
  const [updateBusy, setUpdateBusy] = useState(false)
  const [updateLabel, setUpdateLabel] = useState<string | undefined>(undefined)

  const handleToggleMute = useCallback(async () => {
    const nextMuted = !isMuted
    const updated = {
      ...settings,
      soundAlerts: !nextMuted,
      desktopOverlayNotifications: !nextMuted
    }
    setSettings(updated)
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings(updated)
    }
  }, [isMuted, settings])

  const handleCheckUpdate = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates || updateBusy) return
    setUpdateBusy(true)
    setUpdateLabel('Checking…')
    try {
      const result = await window.electronAPI.checkForUpdates()
      if (result.status === 'up_to_date' || result.status === 'dev_mode') {
        setNotifications((prev) =>
          [
            {
              id: `upd_${Date.now()}`,
              type: 'info' as const,
              title: 'VRCFX Updates',
              message: result.message || 'You are on the latest version.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            ...prev
          ].slice(0, 8)
        )
        setUpdateLabel(undefined)
        setUpdateBusy(false)
        return
      }

      if (result.status === 'error') {
        setNotifications((prev) =>
          [
            {
              id: `upd_${Date.now()}`,
              type: 'unfriended' as const,
              title: 'Update Check Failed',
              message: result.error || result.message || 'Could not reach GitHub releases.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            ...prev
          ].slice(0, 8)
        )
        setUpdateLabel(undefined)
        setUpdateBusy(false)
        return
      }

      if (result.status === 'available') {
        setUpdateLabel('Downloading…')
        setNotifications((prev) =>
          [
            {
              id: `upd_${Date.now()}`,
              type: 'friend_online' as const,
              title: `Update Available — v${result.latestVersion}`,
              message:
                'Downloading installer. VRCFX will close so the update can install, then reopen.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            ...prev
          ].slice(0, 8)
        )

        const install = await window.electronAPI.installUpdate()
        if (install.status === 'error') {
          setNotifications((prev) =>
            [
              {
                id: `upd_${Date.now()}`,
                type: 'unfriended' as const,
                title: 'Update Failed',
                message: install.error || 'Could not download or launch the installer.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              ...prev
            ].slice(0, 8)
          )
          setUpdateLabel(undefined)
          setUpdateBusy(false)
        }
      }
    } catch (err: any) {
      setNotifications((prev) =>
        [
          {
            id: `upd_${Date.now()}`,
            type: 'unfriended' as const,
            title: 'Update Failed',
            message: err?.message || 'Unexpected update error.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ].slice(0, 8)
      )
      setUpdateLabel(undefined)
      setUpdateBusy(false)
    }
  }, [updateBusy])

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return
    return window.electronAPI.onUpdateStatus((payload) => {
      if (payload?.status === 'downloading') {
        setUpdateBusy(true)
        setUpdateLabel(
          typeof payload.progress === 'number' ? `${payload.progress}%` : 'Downloading…'
        )
      } else if (payload?.status === 'ready') {
        setUpdateLabel('Installing…')
      } else if (payload?.status === 'error') {
        setUpdateBusy(false)
        setUpdateLabel(undefined)
      }
    })
  }, [])

  const allFriendsList = [...onlineFriends, ...offlineFriends]

  return (
    <div
      data-theme={settings.theme || 'pitch-black'}
      className={`flex flex-col h-screen w-screen app-shell theme-${
        settings.theme || 'pitch-black'
      } bg-app text-theme-primary overflow-hidden select-none`}
    >
      {/* Frameless Draggable TitleBar */}
      <TitleBar
        currentUser={currentUser}
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentWorldName={radarState.currentWorldName}
      />

      {/* Instance Already Running Alert Banner (40s auto-dismiss or manual close) */}
      {alreadyRunningNotice && (
        <div className="bg-accent-subtle border-b border-accent px-5 py-2.5 flex items-center justify-between z-40 text-xs animate-fade-in-page">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-accent shrink-0" />
            <div>
              <span className="font-medium text-theme-primary block text-xs">
                {alreadyRunningNotice.title || 'VRCFX is already running'}
              </span>
              <span className="text-theme-muted text-[11px]">
                {alreadyRunningNotice.message}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
              setAlreadyRunningNotice(null)
            }}
            className="btn-gothic-secondary px-3 py-1 text-xs font-medium flex items-center gap-1.5"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'cleaner') {
              setIsCleanerOpen(true)
            } else {
              setCurrentTab(tab)
            }
          }}
          onlineCount={onlineFriends.length}
          totalFriendsCount={onlineFriends.length + offlineFriends.length}
          currentUser={currentUser}
          onRefresh={() => loadFriendsData(true)}
          isRefreshing={isRefreshing}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onCheckUpdate={handleCheckUpdate}
          updateBusy={updateBusy}
          updateLabel={updateLabel}
          onLogout={handleLogout}
          t={t}
        />

        {/* Content View */}
        <main className="flex-1 flex flex-col min-w-0 bg-app overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {currentTab === 'friends' && (
              <FriendsView
                onlineFriends={onlineFriends}
                offlineFriends={offlineFriends}
                onDeleteFriend={handleDeleteFriend}
                onOpenCleaner={() => setIsCleanerOpen(true)}
              />
            )}

            {currentTab === 'worlds' && <WorldsView />}

            {currentTab === 'avatars' && (
              <AvatarsView
                currentUser={currentUser}
                t={t}
                onInspectUser={(u) => setInspectingUser(u)}
                onUpdateCurrentUser={(user) => setCurrentUser(user)}
                onNotify={(title, message, type) =>
                  addNotification({
                    type: type || 'online',
                    title,
                    message,
                    displayName: title
                  })
                }
              />
            )}

            {currentTab === 'radar' && (
              <RadarView
                radarState={radarState}
                onRestartWatcher={handleRestartRadar}
                friends={allFriendsList}
                onJoinLocation={(loc) => window.electronAPI?.launchInstance(loc)}
              />
            )}

            {currentTab === 'guide' && (
              <ManualView
                t={t}
                currentLang={language}
                onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                onUpdateProfile={(updated) => setCurrentUser(updated)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                currentUser={currentUser}
                onLogout={handleLogout}
                onTestNotification={() =>
                  addNotification({
                    type: 'player_join',
                    title: 'Friend Joined Instance',
                    message: 'Sample Friend has entered your room',
                    isFriend: true,
                    displayName: 'Sample Friend'
                  })
                }
                onOpenGuide={() => setCurrentTab('guide')}
                t={t}
                currentLang={language}
                onChangeLanguage={(lang) => {
                  setLanguage(lang)
                  handleSaveSettings({ language: lang })
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Live Toast Notifications Container */}
      <NotificationToastContainer
        notifications={notifications}
        position={settings.notificationPosition || 'bottom-right'}
        onDismiss={dismissNotification}
        onJoin={(loc) => window.electronAPI?.launchInstance(loc)}
        onInspectUser={(displayName, userId) =>
          setInspectingUser({ displayName, userId })
        }
      />

      {/* User Inspector Modal */}
      {inspectingUser && (
        <PlayerModal
          displayName={inspectingUser.displayName}
          userId={inspectingUser.userId}
          friends={allFriendsList}
          onClose={() => setInspectingUser(null)}
          onJoinLocation={(loc) => window.electronAPI?.launchInstance(loc)}
        />
      )}

      {/* Onboarding & Initial Setup Wizard */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false)
          handleSaveSettings({ hasCompletedOnboarding: true })
        }}
        t={t}
        isArabic={isArabic}
        settings={settings}
        onUpdateSettings={handleSaveSettings}
        currentLang={language}
        onChangeLanguage={(lang) => {
          setLanguage(lang)
          handleSaveSettings({ language: lang })
        }}
      />

      {/* Login & 2FA Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user)
          loadFriendsData()
          if (!settings.hasCompletedOnboarding) {
            setIsOnboardingOpen(true)
          }
        }}
      />

      {/* Inactive Friends Cleaner Modal */}
      <CleanerModal
        isOpen={isCleanerOpen}
        onClose={() => setIsCleanerOpen(false)}
        friends={allFriendsList}
        onDeleteBulk={handleDeleteBulk}
      />
    </div>
  )
}
