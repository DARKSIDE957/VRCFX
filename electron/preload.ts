import { contextBridge, ipcRenderer } from 'electron'

export const electronAPI = {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  launchInstance: (location: string) => ipcRenderer.invoke('app:launchInstance', location),
  showDesktopNotification: (payload: any) => ipcRenderer.invoke('app:showDesktopNotification', payload),

  // Auth
  checkSession: () => ipcRenderer.invoke('auth:checkSession'),
  login: (credentials: { username: string; password: string }) =>
    ipcRenderer.invoke('auth:login', credentials),
  verify2FA: (code: string, type: 'totp' | 'emailOtp' | 'otp') =>
    ipcRenderer.invoke('auth:verify2FA', { code, type }),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Friends
  getFriends: (forceRefresh?: boolean) => ipcRenderer.invoke('friends:get', forceRefresh),
  deleteFriend: (userId: string) => ipcRenderer.invoke('friends:delete', userId),
  deleteFriendsBulk: (userIds: string[]) => ipcRenderer.invoke('friends:deleteBulk', userIds),

  // User & Profile
  getUserProfile: (userId: string) => ipcRenderer.invoke('user:getProfile', userId),
  updateProfile: (data: {
    bio?: string
    status?: string
    statusDescription?: string
    bioLinks?: string[]
  }) => ipcRenderer.invoke('user:updateProfile', data),

  // Worlds & Avatars
  getFavoriteWorlds: () => ipcRenderer.invoke('worlds:getFavorites'),
  searchWorlds: (query?: any) => ipcRenderer.invoke('worlds:search', query),
  searchAvatars: (query?: any) => ipcRenderer.invoke('avatars:search', query),
  getMyAvatars: (releaseStatus?: string) => ipcRenderer.invoke('avatars:getMyAvatars', releaseStatus),
  getFavoriteAvatars: () => ipcRenderer.invoke('avatars:getFavorites'),
  selectAvatar: (avatarId: string) => ipcRenderer.invoke('avatars:select', avatarId),
  addFavoriteAvatar: (avatarId: string, groupTag?: string) => ipcRenderer.invoke('avatars:addFavorite', { avatarId, groupTag }),
  removeFavoriteAvatar: (favoriteId: string) => ipcRenderer.invoke('avatars:removeFavorite', favoriteId),
  moveFavoriteAvatar: (avatarId: string, currentFavoriteId: string, targetGroupTag: string) =>
    ipcRenderer.invoke('avatars:moveFavorite', { avatarId, currentFavoriteId, targetGroupTag }),

  // Radar & Log Watcher
  getRadarState: () => ipcRenderer.invoke('radar:getState'),
  restartRadar: () => ipcRenderer.invoke('radar:restart'),
  onRadarUpdate: (callback: (state: any) => void) => {
    const handler = (_: any, state: any) => callback(state)
    ipcRenderer.on('radar:update', handler)
    return () => {
      ipcRenderer.removeListener('radar:update', handler)
    }
  },

  // 24/7 Activity Logs & Live Events
  getActivityLogs: () => ipcRenderer.invoke('activity:getLogs'),
  clearActivityLogs: () => ipcRenderer.invoke('activity:clearLogs'),
  triggerActivityCheck: () => ipcRenderer.invoke('activity:triggerCheck'),
  onActivityEvent: (callback: (event: any) => void) => {
    const handler = (_: any, evt: any) => callback(evt)
    ipcRenderer.on('activity:newEvent', handler)
    return () => {
      ipcRenderer.removeListener('activity:newEvent', handler)
    }
  },
  onActivityToast: (callback: (payload: any) => void) => {
    const handler = (_: any, p: any) => callback(p)
    ipcRenderer.on('activity:toast', handler)
    return () => {
      ipcRenderer.removeListener('activity:toast', handler)
    }
  },

  // App Version & Updates
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  onUpdateStatus: (callback: (payload: any) => void) => {
    const handler = (_: any, payload: any) => callback(payload)
    ipcRenderer.on('update:status', handler)
    return () => {
      ipcRenderer.removeListener('update:status', handler)
    }
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  selectLogDir: () => ipcRenderer.invoke('settings:selectLogDir'),

  // Notes & Nicknames
  getFriendNotes: () => ipcRenderer.invoke('notes:get'),
  saveFriendNote: (userId: string, data: any) => ipcRenderer.invoke('notes:save', { userId, data }),

  // Name History
  getNameHistory: (userId: string) => ipcRenderer.invoke('history:getNameHistory', userId),

  // Visited Instances History
  getVisitedInstances: () => ipcRenderer.invoke('history:getInstances'),
  clearVisitedInstances: () => ipcRenderer.invoke('history:clearInstances'),

  // OSC Chatbox & System Stats
  sendOscChatbox: (text: string, directSend?: boolean, notify?: boolean) =>
    ipcRenderer.invoke('osc:sendChatbox', { text, directSend, notify }),
  setOscTyping: (isTyping: boolean) => ipcRenderer.invoke('osc:setTyping', isTyping),
  startOscLoop: (messages: string[], intervalSeconds?: number, directSend?: boolean, notify?: boolean) =>
    ipcRenderer.invoke('osc:startLoop', { messages, intervalSeconds, directSend, notify }),
  stopOscLoop: () => ipcRenderer.invoke('osc:stopLoop'),
  isOscLoopRunning: () => ipcRenderer.invoke('osc:isLoopRunning'),
  startOscStats: (template: string, intervalSeconds?: number, directSend?: boolean) =>
    ipcRenderer.invoke('osc:startStats', { template, intervalSeconds, directSend }),
  stopOscStats: () => ipcRenderer.invoke('osc:stopStats'),
  isOscStatsRunning: () => ipcRenderer.invoke('osc:isStatsRunning'),
  getSystemStats: () => ipcRenderer.invoke('osc:getSystemStats'),

  // Magic Chatbox Floating HUD
  startMagicHud: (config: any) => ipcRenderer.invoke('osc:startMagicHud', config),
  stopMagicHud: () => ipcRenderer.invoke('osc:stopMagicHud'),
  isMagicHudRunning: () => ipcRenderer.invoke('osc:isMagicHudRunning'),
  getLiveHudData: (options?: { city?: string; hypeRateSessionId?: string; simulatedBpm?: number; hypeRateApiKey?: string }) =>
    ipcRenderer.invoke('osc:getLiveHudData', options),

  // Backup & Restore
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),

  // Single-Instance Notification
  onAlreadyRunningNotice: (callback: (payload: { title: string; message: string; timestamp: string }) => void) => {
    const handler = (_: any, payload: any) => callback(payload)
    ipcRenderer.on('app:alreadyRunningNotice', handler)
    return () => {
      ipcRenderer.removeListener('app:alreadyRunningNotice', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
