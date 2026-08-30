// Universal Native Host Bridge (Supports .NET 8 WebView2 Host & Electron)

type MessageCallback = (data: any) => void

class NativeBridge {
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>()
  private eventListeners = new Map<string, Set<MessageCallback>>()

  constructor() {
    if (typeof window !== 'undefined' && (window as any).chrome?.webview) {
      ;(window as any).chrome.webview.addEventListener('message', (event: any) => {
        try {
          const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          if (!msg) return

          // Response to request
          if (msg.id && this.pendingRequests.has(msg.id)) {
            const { resolve } = this.pendingRequests.get(msg.id)!
            this.pendingRequests.delete(msg.id)
            if (msg.error) {
              console.warn(`[NativeBridge] Request ${msg.id} returned error:`, msg.error)
              resolve({ success: false, error: msg.error })
            } else {
              resolve(msg.data)
            }
            return
          }

          // Unsolicited event from native host
          if (msg.channel && this.eventListeners.has(msg.channel)) {
            this.eventListeners.get(msg.channel)!.forEach((cb) => cb(msg.data))
          }
        } catch (err) {
          console.error('[NativeBridge] Message error:', err)
        }
      })
    }
  }

  public invoke(channel: string, data?: any): Promise<any> {
    if (typeof window === 'undefined') return Promise.resolve(null)

    // Check if running in WebView2
    if ((window as any).chrome?.webview) {
      return new Promise((resolve, reject) => {
        const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        this.pendingRequests.set(id, { resolve, reject })
        ;(window as any).chrome.webview.postMessage({ id, channel, data })

        // Timeout safety
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id)
            resolve(null)
          }
        }, 15000)
      })
    }

    return Promise.resolve(null)
  }

  public on(channel: string, callback: MessageCallback): () => void {
    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set())
    }
    this.eventListeners.get(channel)!.add(callback)
    return () => {
      this.eventListeners.get(channel)?.delete(callback)
    }
  }
}

export const nativeBridge = new NativeBridge()

export function setupNativeBridge() {
  if (typeof window === 'undefined') return

  const isWebView2 = !!(window as any).chrome?.webview
  if (!isWebView2 && (window as any).electronAPI) {
    // Already in Electron, keep existing API
    return
  }

  const api: any = {
    // Window controls
    minimize: () => nativeBridge.invoke('window:minimize'),
    maximize: () => nativeBridge.invoke('window:maximize'),
    close: () => nativeBridge.invoke('window:close'),
    isMaximized: () => nativeBridge.invoke('window:isMaximized'),
    dragWindow: () => nativeBridge.invoke('window:drag'),
    launchInstance: (location: string) => nativeBridge.invoke('instance:launch', location),
    showDesktopNotification: (payload: any) => nativeBridge.invoke('overlay:showNotification', payload),

    // Auth
    checkSession: () => nativeBridge.invoke('auth:checkSession'),
    login: (credentials: any) => nativeBridge.invoke('auth:login', credentials),
    verify2FA: (code: string, type: string) => nativeBridge.invoke('auth:verify2fa', { code, authType: type }),
    logout: () => nativeBridge.invoke('auth:logout'),

    // Friends
    getFriends: (forceRefresh?: boolean) => nativeBridge.invoke('friends:get', { forceRefresh }),
    deleteFriend: (userId: string) => nativeBridge.invoke('friends:delete', userId),
    deleteFriendsBulk: (userIds: string[]) => nativeBridge.invoke('friends:deleteBulk', userIds),

    // User & Profile
    getUserProfile: (userId: string) => nativeBridge.invoke('users:getProfile', userId),
    updateProfile: (data: any) => nativeBridge.invoke('users:updateProfile', data),

    // Worlds & Avatars
    getFavoriteWorlds: () => nativeBridge.invoke('worlds:getFavorites'),
    searchWorlds: (query?: any) => nativeBridge.invoke('worlds:search', typeof query === 'string' ? { query } : query),
    searchAvatars: (query?: any) => nativeBridge.invoke('avatars:search', typeof query === 'string' ? { query } : query),
    getMyAvatars: (releaseStatus?: string) => nativeBridge.invoke('avatars:getMyAvatars', releaseStatus),
    getFavoriteAvatars: () => nativeBridge.invoke('avatars:getFavorites'),
    selectAvatar: (avatarId: string) => nativeBridge.invoke('avatars:select', avatarId),
    addFavoriteAvatar: (avatarId: string, groupTag?: string) =>
      nativeBridge.invoke('avatars:addFavorite', { avatarId, groupTag }),
    removeFavoriteAvatar: (favoriteId: string) =>
      nativeBridge.invoke('avatars:removeFavorite', favoriteId),
    moveFavoriteAvatar: (avatarId: string, currentFavoriteId: string, targetGroupTag: string) =>
      nativeBridge.invoke('avatars:moveFavorite', { avatarId, currentFavoriteId, targetGroupTag }),

    // Radar & Log Watcher
    getRadarState: () => nativeBridge.invoke('log:getState'),
    restartRadar: () => nativeBridge.invoke('log:restart'),
    onRadarUpdate: (callback: (state: any) => void) => nativeBridge.on('radar:update', callback),

    // 24/7 Activity Logs & Live Events
    getActivityLogs: () => nativeBridge.invoke('activity:getLogs'),
    clearActivityLogs: () => nativeBridge.invoke('activity:clearLogs'),
    triggerActivityCheck: () => nativeBridge.invoke('friends:sync'),
    onActivityEvent: (callback: (event: any) => void) => nativeBridge.on('activity:newEvent', callback),
    onActivityToast: (callback: (payload: any) => void) => nativeBridge.on('notification:toast', callback),

    // App Version
    getAppVersion: () => Promise.resolve({ version: '1.0.0', name: 'VRCFX', isPackaged: true }),
    checkForUpdates: () =>
      Promise.resolve({
        status: 'dev_mode',
        currentVersion: '1.0.0',
        message: 'Updates are available in the Windows installer build.'
      }),
    installUpdate: () =>
      Promise.resolve({
        status: 'dev_mode',
        currentVersion: '1.0.0',
        message: 'Updates are available in the Windows installer build.'
      }),
    onUpdateStatus: () => () => {},

    // Settings
    getSettings: () => nativeBridge.invoke('settings:get'),
    saveSettings: (settings: any) => nativeBridge.invoke('settings:save', settings),
    selectLogDir: () => nativeBridge.invoke('settings:selectLogDir'),

    // Notes & Nicknames
    getFriendNotes: () => nativeBridge.invoke('notes:get'),
    saveFriendNote: (userId: string, data: any) =>
      nativeBridge.invoke('friends:saveNote', { userId, nickname: data?.nickname, note: data?.note }),

    // Name History
    getNameHistory: (userId: string) => nativeBridge.invoke('history:getNameHistory', userId),

    // Visited Instances History
    getVisitedInstances: () => nativeBridge.invoke('history:getVisitedInstances'),
    clearVisitedInstances: () => nativeBridge.invoke('history:clearVisitedInstances'),

    // OSC Chatbox & System Stats
    sendOscChatbox: (text: string, directSend?: boolean, notify?: boolean) =>
      nativeBridge.invoke('osc:chatbox', { message: text, direct: directSend, complete: notify }),
    setOscTyping: (isTyping: boolean) => nativeBridge.invoke('osc:typing', { isTyping }),
    startOscLoop: () => Promise.resolve({ success: true }),
    stopOscLoop: () => Promise.resolve({ success: true }),
    isOscLoopRunning: () => Promise.resolve(false),
    startOscStats: () => Promise.resolve({ success: true }),
    stopOscStats: () => Promise.resolve({ success: true }),
    isOscStatsRunning: () => Promise.resolve(false),
    getSystemStats: () => Promise.resolve({ cpuPercent: 0, ramPercent: 0, vramPercent: 0, fps: 0, ping: 0, formatted: '' }),

    // Magic Chatbox Floating HUD
    startMagicHud: () => Promise.resolve({ success: true }),
    stopMagicHud: () => Promise.resolve({ success: true }),
    isMagicHudRunning: () => Promise.resolve(false),
    getLiveHudData: () => Promise.resolve({}),

    // Single-Instance Notification
    onAlreadyRunningNotice: (callback: (payload: any) => void) => nativeBridge.on('app:alreadyRunningNotice', callback)
  }

  ;(window as any).electronAPI = api
}
