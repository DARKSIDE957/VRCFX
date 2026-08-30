export type TrustRank =
  | 'visitor'
  | 'new_user'
  | 'user'
  | 'known'
  | 'trusted'
  | 'veteran'
  | 'moderator'
  | 'admin'

export interface PastDisplayName {
  displayName: string
  updatedAt?: string
}

export interface FriendNote {
  nickname?: string
  note?: string
  updatedAt?: string
}

export interface VisitedInstance {
  worldId: string
  worldName: string
  instanceId: string
  instanceType: string
  visitedAt: string
  playerCount?: number
}

export interface VRCUser {
  id: string
  username: string
  displayName: string
  pastDisplayNames?: PastDisplayName[]
  trustRank?: TrustRank
  nickname?: string
  customNote?: string
  userIcon?: string
  profilePicOverride?: string
  currentAvatarImageUrl?: string
  currentAvatarThumbnailImageUrl?: string
  currentAvatarId?: string
  currentAvatarTags?: string[]
  bio?: string
  bioLinks?: string[]
  status: 'active' | 'join me' | 'ask me' | 'busy' | 'offline'
  statusDescription?: string
  state?: string
  tags?: string[]
  developerType?: string
  last_login?: string
  last_activity?: string
  last_platform?: string
  friendKey?: string
  location?: string
  worldId?: string
  instanceId?: string
  isFriend?: boolean
  isFavorite?: boolean
  favoriteGroup?: string
  favoriteGroupName?: string
  hasVRCPlus?: boolean
  dateJoined?: string
}

export interface VRCWorld {
  id: string
  name: string
  description: string
  authorName: string
  authorId: string
  capacity: number
  imageUrl: string
  thumbnailImageUrl: string
  occupants?: number
  publicOccupants?: number
  privateOccupants?: number
  favorites?: number
  visits?: number
  tags?: string[]
  favoriteGroup?: string
  favoriteTags?: string[]
  updated_at?: string
}

export interface RadarPlayer {
  displayName: string
  userId?: string
  joinedAt: string
  isFriend?: boolean
  trustRank?: TrustRank
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

export interface VRCAvatar {
  id: string
  name: string
  description: string
  authorName: string
  authorId: string
  imageUrl: string
  thumbnailImageUrl: string
  assetUrl?: string
  releaseStatus?: string
  tags?: string[]
  unityPackages?: { platform: string; unityVersion?: string; performanceRating?: string }[]
  featured?: boolean
  updated_at?: string
  isFavorite?: boolean
  favoriteGroup?: string
  favoriteGroupName?: string
  favoriteId?: string
  isVrcPlusGroup?: boolean
  isVrcPlusLocked?: boolean
}

export interface VRCInventoryItem {
  id: string
  name: string
  description?: string
  imageUrl?: string
  itemType: 'sticker' | 'emoji' | 'prop' | 'droneskin' | 'portalskin' | 'warpeffect' | 'bundle' | 'print' | string
  tags?: string[]
  flags?: string[]
  createdAt?: string
  updatedAt?: string
  authorName?: string
  authorId?: string
  assetUrl?: string
  data?: any
}

export interface VRCPrint {
  id: string
  name: string
  description?: string
  fileId?: string
  imageUrl: string
  thumbnailUrl?: string
  authorId: string
  authorName?: string
  createdAt: string
  tags?: string[]
}

export interface VRCProp {
  id: string
  name: string
  description?: string
  imageUrl?: string
  assetUrl?: string
  authorId?: string
  authorName?: string
  tags?: string[]
  itemType?: string
  createdAt?: string
}

export interface VRCPlusOverview {
  hasVRCPlus: boolean
  iconSlotsUsed: number
  iconSlotsTotal: number
  printSlotsUsed: number
  printSlotsTotal: number
  prints: VRCPrint[]
  inventory: VRCInventoryItem[]
  props: VRCProp[]
  customIcons: string[]
}

export interface ActivityLogItem {
  id: string
  type: 'online' | 'offline' | 'world_change' | 'unfriended' | 'name_change' | 'friend_added' | 'radar_join' | 'radar_leave'
  title: string
  message: string
  timestamp: string
  isoTimestamp: string
  displayName: string
  userId?: string
  avatarUrl?: string
  worldName?: string
  location?: string
  oldValue?: string
  newValue?: string
}

export type AppTheme = 'pitch-black' | 'dark' | 'midnight' | 'onyx' | 'pink'

export function normalizeTheme(theme?: string): AppTheme {
  if (theme === 'dark' || theme === 'midnight' || theme === 'onyx' || theme === 'pink') {
    return theme
  }
  return 'pitch-black'
}

export interface AppSettings {
  vrcLogPath: string
  autoRefreshFriends: boolean
  refreshIntervalMinutes: number
  theme: AppTheme
  language: 'en' | 'ar' | 'es' | 'fr'
  hasCompletedOnboarding: boolean
  soundAlerts: boolean
  soundVolume: number
  soundChimeType: 'harmonic' | 'ping' | 'classic' | 'subtle'
  enableLogWatcher: boolean
  notificationPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  startWithWindows: boolean
  minimizeToTray: boolean
  desktopOverlayNotifications: boolean
  // Granular notification toggles
  notifyFriendOnline: boolean
  notifyFriendOnlineDesktop: boolean
  notifyFriendOffline: boolean
  notifyFriendWorld: boolean
  notifyFriendWorldDesktop: boolean
  notifyUnfriended: boolean
  notifyUnfriendedDesktop: boolean
  notifyNameChange: boolean
  notifyNameChangeDesktop: boolean
  notifyFriendAdded: boolean
}

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

declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>
      maximize: () => Promise<boolean>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
      launchInstance: (location: string) => Promise<boolean>
      showDesktopNotification: (payload: {
        title: string
        message: string
        isFriend?: boolean
        location?: string
        avatarUrl?: string
        accentType?: 'online' | 'world' | 'unfriended' | 'name_change' | 'default'
      }) => Promise<void>
      checkSession: () => Promise<{ success: boolean; user?: VRCUser; requires2FA?: string[] }>
      login: (credentials: { username: string; password: string }) => Promise<{
        success: boolean
        requires2FA?: string[]
        user?: VRCUser
        error?: string
      }>
      verify2FA: (code: string, type: 'totp' | 'emailOtp' | 'otp') => Promise<{
        success: boolean
        user?: VRCUser
        error?: string
      }>
      logout: () => Promise<void>
      getFriends: (forceRefresh?: boolean) => Promise<{ online: VRCUser[]; offline: VRCUser[] }>
      deleteFriend: (userId: string) => Promise<{ success: boolean; error?: string }>
      deleteFriendsBulk: (userIds: string[]) => Promise<{
        success: boolean
        deleted: string[]
        failed: { id: string; error: string }[]
      }>
      getUserProfile: (userId: string) => Promise<VRCUser | null>
      updateProfile: (data: {
        bio?: string
        status?: string
        statusDescription?: string
        bioLinks?: string[]
      }) => Promise<{ success: boolean; user?: VRCUser; error?: string }>
      getFavoriteWorlds: () => Promise<VRCWorld[]>
      searchWorlds: (payload?: string | { query?: string; n?: number; sort?: string; tag?: string }) => Promise<VRCWorld[]>
      searchAvatars: (payload?: string | { query?: string; n?: number }) => Promise<VRCAvatar[]>
      getMyAvatars: (releaseStatus?: string) => Promise<VRCAvatar[]>
      getFavoriteAvatars: () => Promise<VRCAvatar[]>
      selectAvatar: (avatarId: string) => Promise<{ success: boolean; error?: string; user?: VRCUser }>
      addFavoriteAvatar: (avatarId: string, groupTag?: string) => Promise<{ success: boolean; favoriteId?: string; error?: string }>
      removeFavoriteAvatar: (favoriteId: string) => Promise<{ success: boolean; error?: string }>
      moveFavoriteAvatar: (avatarId: string, currentFavoriteId: string, targetGroupTag: string) => Promise<{ success: boolean; newFavoriteId?: string; error?: string }>
      getRadarState: () => Promise<RadarState>
      restartRadar: () => Promise<RadarState>
      onRadarUpdate: (callback: (state: RadarState) => void) => () => void
      getActivityLogs: () => Promise<ActivityLogItem[]>
      clearActivityLogs: () => Promise<void>
      triggerActivityCheck: () => Promise<ActivityLogItem[]>
      onActivityEvent: (callback: (event: ActivityLogItem) => void) => () => void
      onActivityToast: (callback: (payload: any) => void) => () => void
      getAppVersion: () => Promise<{ version: string; name: string; isPackaged: boolean }>
      checkForUpdates: () => Promise<{
        status: 'up_to_date' | 'available' | 'downloading' | 'ready' | 'error' | 'dev_mode'
        currentVersion: string
        latestVersion?: string
        releaseName?: string
        releaseNotes?: string
        message?: string
        error?: string
        progress?: number
      }>
      installUpdate: () => Promise<{
        status: 'up_to_date' | 'available' | 'downloading' | 'ready' | 'error' | 'dev_mode'
        currentVersion: string
        latestVersion?: string
        message?: string
        error?: string
        progress?: number
      }>
      onUpdateStatus: (callback: (payload: any) => void) => () => void
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
      selectLogDir: () => Promise<string | null>
      getFriendNotes: () => Promise<Record<string, FriendNote>>
      saveFriendNote: (userId: string, data: FriendNote) => Promise<Record<string, FriendNote>>
      getNameHistory: (userId: string) => Promise<PastDisplayName[]>
      getVisitedInstances: () => Promise<VisitedInstance[]>
      clearVisitedInstances: () => Promise<void>
      // OSC Chatbox & System Stats methods
      sendOscChatbox: (text: string, directSend?: boolean, notify?: boolean) => Promise<boolean>
      setOscTyping: (isTyping: boolean) => Promise<boolean>
      startOscLoop: (messages: string[], intervalSeconds?: number, directSend?: boolean, notify?: boolean) => Promise<void>
      stopOscLoop: () => Promise<void>
      isOscLoopRunning: () => Promise<boolean>
      startOscStats: (template: string, intervalSeconds?: number, directSend?: boolean) => Promise<void>
      stopOscStats: () => Promise<void>
      isOscStatsRunning: () => Promise<boolean>
      getSystemStats: () => Promise<SystemStats>
      // Magic Chatbox Floating HUD
      startMagicHud: (config: MagicHudConfig) => Promise<void>
      stopMagicHud: () => Promise<void>
      isMagicHudRunning: () => Promise<boolean>
      getLiveHudData: (options?: {
        city?: string
        hypeRateSessionId?: string
        simulatedBpm?: number
        hypeRateApiKey?: string
      }) => Promise<LiveHudData>
      // Data Backup & Restore
      exportBackup: () => Promise<{ success: boolean; filePath?: string; error?: string }>
      importBackup: () => Promise<{
        success: boolean
        importedCount?: { notes: number; names: number; instances: number }
        error?: string
      }>
      onAlreadyRunningNotice: (
        callback: (payload: { title: string; message: string; timestamp: string }) => void
      ) => () => void
    }
  }
}
