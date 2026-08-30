import fs from 'fs'
import path from 'path'
import { app } from 'electron'

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

export interface AppSettings {
  vrcLogPath: string
  autoRefreshFriends: boolean
  refreshIntervalMinutes: number
  theme: 'pitch-black' | 'dark' | 'midnight' | 'onyx' | 'pink'
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

const defaultSettings: AppSettings = {
  vrcLogPath: '',
  autoRefreshFriends: false,
  refreshIntervalMinutes: 15,
  theme: 'pitch-black',
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
  notifyUnfriendedDesktop: true,
  notifyNameChange: true,
  notifyNameChangeDesktop: true,
  notifyFriendAdded: true
}

export class JsonStore {
  private filePath: string
  private data: Record<string, any> = {}
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private savePending = false

  constructor(filename: string = 'vrcfx-data.json') {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      try {
        fs.mkdirSync(userDataPath, { recursive: true })
      } catch (e) {
        console.error('Failed to create userData directory:', e)
      }
    }
    this.filePath = path.join(userDataPath, filename)
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8')
        this.data = JSON.parse(raw)
      } else {
        this.data = {
          settings: defaultSettings,
          cookies: {},
          lastUser: null,
          cachedFriends: []
        }
        this.save(true)
      }
    } catch (err) {
      console.error('Error loading store:', err)
      this.data = {
        settings: defaultSettings,
        cookies: {},
        lastUser: null,
        cachedFriends: []
      }
    }
  }

  public save(immediate = false) {
    this.savePending = true
    if (immediate) {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer)
        this.saveTimer = null
      }
      this.flushSave()
      return
    }

    if (this.saveTimer) return

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.flushSave()
    }, 2500)
  }

  public flushPendingSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    this.flushSave()
  }

  private flushSave() {
    if (!this.savePending) return
    this.savePending = false

    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('Error saving store to', this.filePath, err)
    }
  }

  public get(key: string, defaultValue: any = null): any {
    return this.data[key] !== undefined ? this.data[key] : defaultValue
  }

  public set(key: string, value: any): void {
    this.data[key] = value
    this.save()
  }

  public getSettings(): AppSettings {
    const settings = { ...defaultSettings, ...(this.data.settings || {}) }
    if ((settings.theme as string) === 'light') {
      settings.theme = 'pitch-black'
    }
    if (settings.refreshIntervalMinutes < 5) {
      settings.refreshIntervalMinutes = 5
    }
    return settings
  }

  public setSettings(settings: Partial<AppSettings>): AppSettings {
    const normalized = { ...settings }
    if ((normalized.theme as string) === 'light') {
      normalized.theme = 'pitch-black'
    }
    const current = this.getSettings()
    const updated = { ...current, ...normalized }
    this.set('settings', updated)
    return updated
  }

  // Friend Notes & Nicknames
  public getFriendNotes(): Record<string, { nickname?: string; note?: string; updatedAt?: string }> {
    return this.get('friendNotes', {}) || {}
  }

  public saveFriendNote(userId: string, noteData: { nickname?: string; note?: string }): Record<string, any> {
    const notes = this.getFriendNotes()
    if (!noteData.nickname && !noteData.note) {
      delete notes[userId]
    } else {
      notes[userId] = {
        ...noteData,
        updatedAt: new Date().toISOString()
      }
    }
    this.set('friendNotes', notes)
    return notes
  }

  // Name History Tracking
  public recordDisplayName(userId: string, currentDisplayName: string): void {
    if (!userId || !currentDisplayName) return
    const allHistory: Record<string, { displayName: string; updatedAt?: string }[]> =
      this.get('nameHistory', {}) || {}
    const userHistory = allHistory[userId] || []

    const lastEntry = userHistory[userHistory.length - 1]
    if (!lastEntry || lastEntry.displayName !== currentDisplayName) {
      userHistory.push({
        displayName: currentDisplayName,
        updatedAt: new Date().toISOString()
      })
      // Keep last 20 names
      allHistory[userId] = userHistory.slice(-20)
      this.set('nameHistory', allHistory)
    }
  }

  public getNameHistory(userId: string): { displayName: string; updatedAt?: string }[] {
    const allHistory = this.get('nameHistory', {}) || {}
    return allHistory[userId] || []
  }

  // Visited World Instance History
  public recordVisitedInstance(instance: {
    worldId: string
    worldName: string
    instanceId: string
    instanceType: string
    visitedAt: string
    playerCount?: number
  }): void {
    if (!instance.worldId && !instance.worldName) return
    const list: any[] = this.get('visitedInstances', []) || []
    // Prevent duplicate entries for immediate re-entries
    const last = list[0]
    if (last && last.worldId === instance.worldId && last.instanceId === instance.instanceId) {
      last.playerCount = instance.playerCount || last.playerCount
      this.set('visitedInstances', list)
      return
    }

    list.unshift(instance)
    // Keep last 100 visited instances
    this.set('visitedInstances', list.slice(0, 100))
  }

  public getVisitedInstances(): any[] {
    return this.get('visitedInstances', []) || []
  }

  public clearVisitedInstances(): void {
    this.set('visitedInstances', [])
  }

  // 24/7 Activity Event Logs
  public addActivityLog(item: Omit<ActivityLogItem, 'id' | 'timestamp' | 'isoTimestamp'>): ActivityLogItem {
    const logs: ActivityLogItem[] = this.get('activityLogs', []) || []
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const isoTimestamp = now.toISOString()
    const newItem: ActivityLogItem = {
      ...item,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      isoTimestamp
    }

    logs.unshift(newItem)
    // Retain last 250 activity logs (covers full 24h activity)
    this.set('activityLogs', logs.slice(0, 250))
    return newItem
  }

  public getActivityLogs(): ActivityLogItem[] {
    return this.get('activityLogs', []) || []
  }

  public clearActivityLogs(): void {
    this.set('activityLogs', [])
  }

  // Known Friends Registry (for detecting unfriended users & name changes across sessions)
  public getKnownFriends(): Record<string, { displayName: string; avatarUrl?: string; lastSeen?: string }> {
    return this.get('knownFriends', {}) || {}
  }

  public saveKnownFriends(friendsMap: Record<string, { displayName: string; avatarUrl?: string; lastSeen?: string }>): void {
    this.set('knownFriends', friendsMap)
  }

  public exportBackupData(): {
    version: string
    exportedAt: string
    settings: AppSettings
    friendNotes: Record<string, any>
    nameHistory: Record<string, any>
    visitedInstances: any[]
  } {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      friendNotes: this.getFriendNotes(),
      nameHistory: this.get('nameHistory', {}) || {},
      visitedInstances: this.getVisitedInstances()
    }
  }

  public importBackupData(backup: any): {
    success: boolean
    importedCount: { notes: number; names: number; instances: number }
    error?: string
  } {
    if (!backup || typeof backup !== 'object') {
      return {
        success: false,
        importedCount: { notes: 0, names: 0, instances: 0 },
        error: 'Invalid backup file format'
      }
    }

    // Merge settings
    if (backup.settings && typeof backup.settings === 'object') {
      this.setSettings(backup.settings)
    }

    // Merge friend notes
    let noteCount = 0
    if (backup.friendNotes && typeof backup.friendNotes === 'object') {
      const currentNotes = this.getFriendNotes()
      for (const [uid, note] of Object.entries(backup.friendNotes)) {
        currentNotes[uid] = note as any
        noteCount++
      }
      this.set('friendNotes', currentNotes)
    }

    // Merge name history
    let nameCount = 0
    if (backup.nameHistory && typeof backup.nameHistory === 'object') {
      const currentHistory = this.get('nameHistory', {}) || {}
      for (const [uid, list] of Object.entries(backup.nameHistory)) {
        if (Array.isArray(list)) {
          currentHistory[uid] = list
          nameCount++
        }
      }
      this.set('nameHistory', currentHistory)
    }

    // Merge visited instances
    let instCount = 0
    if (Array.isArray(backup.visitedInstances)) {
      const currentInst = this.getVisitedInstances()
      const merged = [...backup.visitedInstances, ...currentInst]
      const seen = new Set<string>()
      const unique = merged.filter((item) => {
        const key = `${item.worldId}_${item.instanceId}_${item.visitedAt}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      this.set('visitedInstances', unique.slice(0, 200))
      instCount = backup.visitedInstances.length
    }

    this.save(true)
    return {
      success: true,
      importedCount: { notes: noteCount, names: nameCount, instances: instCount }
    }
  }
}
