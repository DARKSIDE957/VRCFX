import { app, BrowserWindow, ipcMain, dialog, shell, screen, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { JsonStore, AppSettings } from './store'
import { VRChatApi } from './vrchat-api'
import { VRCLogWatcher } from './log-watcher'
import { VrcOscService } from './osc-service'
import { AppUpdater } from './updater'

const APP_NAME = 'VRCFX'
const APP_ID = 'VRCFX'

/** Background friend polling — kept light to avoid VRChat/API contention */
const FRIENDS_ONLINE_POLL_MS = 90_000
const FRIENDS_FULL_SCAN_MS = 15 * 60_000
const FRIENDS_INITIAL_SCAN_DELAY_MS = 90_000

// Windows identity — must run before app.ready / BrowserWindow (taskbar + Task Manager)
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('app-user-model-id', APP_ID)
  app.setAppUserModelId(APP_ID)
}
app.setName(APP_NAME)
process.title = APP_NAME

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let overlayHideTimeout: NodeJS.Timeout | null = null
let tray: Tray | null = null
let store: JsonStore
let api: VRChatApi
let logWatcher: VRCLogWatcher
let oscService: VrcOscService
let friendsTracker: FriendsTrackerService
let appUpdater: AppUpdater
let isQuitting = false

let secondInstanceAttempts = 0
let lastSecondInstanceTime = 0

console.log('[Main Process Starting] PID:', process.pid, 'Argv:', process.argv)
const gotTheLock = app.requestSingleInstanceLock()
console.log('[Main Process] gotTheLock:', gotTheLock)

if (!gotTheLock) {
  console.log('[Main Process] Another instance already holds the lock. Exiting.')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()

      const now = Date.now()
      if (now - lastSecondInstanceTime < 5000) {
        secondInstanceAttempts++
      } else {
        secondInstanceAttempts = 1
      }
      lastSecondInstanceTime = now

      // Only display notice if the user repeatedly clicked 3+ times in a row
      if (secondInstanceAttempts >= 3) {
        mainWindow.webContents.send('app:alreadyRunningNotice', {
          title: 'VRCFX is already active',
          message: 'The application is already running in your background tray and has been focused.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      }
    }
  })
}

function getAppIconPath() {
  const resIco = path.join(process.resourcesPath, 'icon.ico')
  const resPng = path.join(process.resourcesPath, 'icon.png')
  const devIco = path.join(__dirname, '../build/icon.ico')
  const devPng = path.join(__dirname, '../build/icon.png')
  if (fs.existsSync(resIco)) return resIco
  if (fs.existsSync(resPng)) return resPng
  if (fs.existsSync(devIco)) return devIco
  if (fs.existsSync(devPng)) return devPng
  return ''
}

function loadAppIconImage() {
  const candidates: string[] = []

  // Packaged Windows exe embeds the taskbar icon — most reliable source
  if (process.platform === 'win32' && app.isPackaged) {
    candidates.push(process.execPath)
  }

  const resIco = path.join(process.resourcesPath, 'icon.ico')
  const devIco = path.join(__dirname, '../build/icon.ico')
  const resPng = path.join(process.resourcesPath, 'icon.png')
  const devPng = path.join(__dirname, '../build/icon.png')

  if (fs.existsSync(resIco)) candidates.push(resIco)
  if (fs.existsSync(devIco)) candidates.push(devIco)
  if (fs.existsSync(resPng)) candidates.push(resPng)
  if (fs.existsSync(devPng)) candidates.push(devPng)

  for (const candidate of candidates) {
    const image = nativeImage.createFromPath(candidate)
    if (!image.isEmpty()) return image
  }
  return undefined
}

function createWindow() {
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.js')

  const appIcon = loadAppIconImage()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    center: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#050508',
    icon: appIcon,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    },
    show: true
  })

  mainWindow.setTitle(APP_NAME)
  if (appIcon) {
    mainWindow.setIcon(appIcon)
  }

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Failed Load] code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`)
  })

  const url = process.env.VITE_DEV_SERVER_URL
  if (url) {
    mainWindow.loadURL(url)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  const showAndFocus = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  }

  mainWindow.show()
  mainWindow.focus()
  mainWindow.once('ready-to-show', showAndFocus)
  mainWindow.webContents.once('did-finish-load', showAndFocus)

  // Prevent full quit when minimizeToTray is enabled
  mainWindow.on('close', (event) => {
    if (!isQuitting && store?.getSettings()?.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function getTrayIconPath() {
  const resPng = path.join(process.resourcesPath, 'icon.png')
  const devPng = path.join(__dirname, '../build/icon.png')
  if (fs.existsSync(resPng)) return resPng
  if (fs.existsSync(devPng)) return devPng
  return getAppIconPath()
}

function createTray() {
  if (tray) return
  const trayIcon = loadAppIconImage()
  if (!trayIcon) return

  try {
    tray = new Tray(trayIcon)
    tray.setToolTip('VRCFX')

    const updateContextMenu = () => {
      const settings = store.getSettings()
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show VRCFX',
          click: () => {
            mainWindow?.show()
            mainWindow?.focus()
          }
        },
        {
          label: `Status: ${logWatcher?.getState()?.currentWorldName || 'Active'}`,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Rescan Logs',
          click: () => {
            logWatcher?.start()
          }
        },
        {
          label: 'Start with Windows',
          type: 'checkbox',
          checked: !!settings.startWithWindows,
          click: (item) => {
            store.setSettings({ startWithWindows: item.checked })
            app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true })
          }
        },
        {
          label: 'Minimize to Tray',
          type: 'checkbox',
          checked: !!settings.minimizeToTray,
          click: (item) => {
            store.setSettings({ minimizeToTray: item.checked })
          }
        },
        { type: 'separator' },
        {
          label: 'Quit VRCFX',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ])
      tray?.setContextMenu(contextMenu)
    }

    updateContextMenu()

    tray.on('double-click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow?.show()
        mainWindow?.focus()
      }
    })
  } catch (err) {
    console.error('Failed to create tray:', err)
  }
}

interface OverlayNotificationItem {
  title: string
  message: string
  isFriend?: boolean
  location?: string
  avatarUrl?: string
  accentType?: 'online' | 'world' | 'unfriended' | 'name_change' | 'default'
}

interface ActiveOverlaySlot {
  slotIndex: number
  win: BrowserWindow
  timeout: NodeJS.Timeout
  isClosing?: boolean
}

function escapeOverlayHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

class DesktopOverlayManager {
  private activeSlots: Map<number, ActiveOverlaySlot> = new Map()
  private queue: OverlayNotificationItem[] = []
  private maxSlots: number = 3

  public show(payload: OverlayNotificationItem) {
    try {
      const settings = store.getSettings()
      if (settings.desktopOverlayNotifications === false) return

      // Always resolve avatar URL or fallback to known friend avatar
      let avatarUrl = payload.avatarUrl || ''
      if (!avatarUrl) {
        const known = store.getKnownFriends()
        for (const [_, k] of Object.entries(known)) {
          const name = (k as any)?.displayName
          if (
            name &&
            (payload.title?.toLowerCase().includes(name.toLowerCase()) ||
              payload.message?.toLowerCase().includes(name.toLowerCase()))
          ) {
            avatarUrl = (k as any).avatarUrl || ''
            break
          }
        }
      }

      const resolvedPayload: OverlayNotificationItem = {
        ...payload,
        avatarUrl
      }

      // Find next free slot among 0, 1, 2
      let freeSlot = -1
      for (let i = 0; i < this.maxSlots; i++) {
        if (!this.activeSlots.has(i)) {
          freeSlot = i
          break
        }
      }

      if (freeSlot === -1) {
        // All 3 slots occupied -> queue it up
        if (this.queue.length < 15) {
          this.queue.push(resolvedPayload)
        }
        return
      }

      this.renderSlot(freeSlot, resolvedPayload)
    } catch (err) {
      console.error('Failed to show desktop overlay:', err)
    }
  }

  private renderSlot(slotIndex: number, payload: OverlayNotificationItem) {
    try {
      const settings = store.getSettings()
      const pos = settings.notificationPosition || 'bottom-right'

      // Active screen detection where user is currently moving cursor or gaming
      const cursorPoint = screen.getCursorScreenPoint()
      const activeDisplay = screen.getDisplayNearestPoint(cursorPoint) || screen.getPrimaryDisplay()
      const { workArea } = activeDisplay

      const winWidth = 380
      const winHeight = 92
      const gap = 8
      const margin = 16

      let x = workArea.x + workArea.width - winWidth - margin
      let y = workArea.y + workArea.height - ((slotIndex + 1) * (winHeight + gap)) - margin + gap

      if (pos === 'bottom-left') {
        x = workArea.x + margin
        y = workArea.y + workArea.height - ((slotIndex + 1) * (winHeight + gap)) - margin + gap
      } else if (pos === 'top-right') {
        x = workArea.x + workArea.width - winWidth - margin
        y = workArea.y + margin + slotIndex * (winHeight + gap)
      } else if (pos === 'top-left') {
        x = workArea.x + margin
        y = workArea.y + margin + slotIndex * (winHeight + gap)
      }

      const win = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x,
        y,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        resizable: false,
        show: false,
        hasShadow: false, // Prevents Windows DWM blurred/invisible ghost corner artifacts
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      win.setAlwaysOnTop(true, 'screen-saver', 1)
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

      const html = this.generateHtml(payload, pos)
      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

      win.once('ready-to-show', () => {
        if (!win.isDestroyed()) {
          win.showInactive()
          win.moveTop()
        }
      })

      const timeout = setTimeout(() => {
        this.closeSlot(slotIndex)
      }, 5200)

      this.activeSlots.set(slotIndex, { slotIndex, win, timeout })
    } catch (err) {
      console.error('Error rendering overlay slot:', err)
    }
  }

  private closeSlot(slotIndex: number, immediate = false) {
    const slot = this.activeSlots.get(slotIndex)
    if (!slot || slot.isClosing) return

    if (slot.timeout) clearTimeout(slot.timeout)

    const finalize = () => {
      if (slot.win && !slot.win.isDestroyed()) {
        slot.win.destroy()
      }
      this.activeSlots.delete(slotIndex)

      if (this.queue.length > 0) {
        const nextItem = this.queue.shift()
        if (nextItem) {
          setTimeout(() => {
            this.renderSlot(slotIndex, nextItem)
          }, 120)
        }
      }
    }

    if (immediate || slot.win.isDestroyed()) {
      finalize()
      return
    }

    slot.isClosing = true
    slot.win.webContents
      .executeJavaScript(`document.querySelector('.toast')?.classList.add('toast-exit')`)
      .catch(() => {})
    setTimeout(finalize, 320)
  }

  private generateHtml(
    payload: OverlayNotificationItem,
    position: string = 'bottom-right'
  ): string {
    const accentType = payload.accentType || (payload.isFriend ? 'online' : 'default')
    let accentColor = '#e11d48'
    let accentSoft = 'rgba(225, 29, 72, 0.14)'
    let badgeText = '#fda4af'
    let badgeLabel = payload.isFriend ? 'Friend' : 'VRCFX'
    let ringColor = 'transparent'
    let pulseAccent = false

    if (accentType === 'online') {
      accentColor = '#10b981'
      accentSoft = 'rgba(16, 185, 129, 0.14)'
      badgeText = '#6ee7b7'
      badgeLabel = 'Online'
      ringColor = 'rgba(16, 185, 129, 0.55)'
      pulseAccent = true
    } else if (accentType === 'world') {
      accentColor = '#0ea5e9'
      accentSoft = 'rgba(14, 165, 233, 0.14)'
      badgeText = '#7dd3fc'
      badgeLabel = 'World'
      ringColor = 'rgba(14, 165, 233, 0.45)'
    } else if (accentType === 'name_change') {
      accentColor = '#a855f7'
      accentSoft = 'rgba(168, 85, 247, 0.14)'
      badgeText = '#d8b4fe'
      badgeLabel = 'Renamed'
    } else if (accentType === 'unfriended') {
      accentColor = '#e11d48'
      accentSoft = 'rgba(225, 29, 72, 0.18)'
      badgeText = '#fda4af'
      badgeLabel = 'Removed'
    }

    const slideFromRight = position === 'bottom-right' || position === 'top-right'
    const enterKeyframe = slideFromRight ? 'toastEnterRight' : 'toastEnterLeft'
    const exitKeyframe = slideFromRight ? 'toastExitRight' : 'toastExitLeft'

    const title = escapeOverlayHtml(payload.title)
    const message = escapeOverlayHtml(payload.message)
    const avatarUrl = payload.avatarUrl ? escapeOverlayHtml(payload.avatarUrl) : ''
    const fallbackInitials = escapeOverlayHtml(
      (payload.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'FX').toUpperCase()
    )

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      user-select: none;
      background: transparent;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    @keyframes toastEnterRight {
      0% { transform: translateX(28px) scale(0.97); opacity: 0; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes toastEnterLeft {
      0% { transform: translateX(-28px) scale(0.97); opacity: 0; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes toastExitRight {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      100% { transform: translateX(28px) scale(0.97); opacity: 0; }
    }
    @keyframes toastExitLeft {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      100% { transform: translateX(-28px) scale(0.97); opacity: 0; }
    }
    @keyframes accentPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    @keyframes progressDrain {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
    .toast {
      width: 100%;
      height: 100%;
      background: #111114;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 10px;
      display: flex;
      align-items: stretch;
      position: relative;
      overflow: hidden;
      animation: ${enterKeyframe} 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), 0 1px 0 rgba(255,255,255,0.04) inset;
    }
    .toast.toast-exit { animation: ${exitKeyframe} 0.3s cubic-bezier(0.4, 0, 1, 1) forwards; }
    .accent {
      width: 3px;
      background: ${accentColor};
      flex-shrink: 0;
      ${pulseAccent ? 'animation: accentPulse 1.6s ease-in-out 2;' : ''}
    }
    .body {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px 16px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #1a1a1f;
      border: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px ${ringColor};
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-fallback {
      font-size: 13px;
      font-weight: 600;
      color: ${accentColor};
      letter-spacing: 0.04em;
    }
    .content { flex: 1; min-width: 0; }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 3px;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      color: #f4f4f5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${badgeText};
      background: ${accentSoft};
      padding: 2px 7px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .message {
      font-size: 11px;
      color: #a1a1aa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }
    .progress-track {
      position: absolute;
      left: 3px;
      right: 0;
      bottom: 0;
      height: 2px;
      background: rgba(255, 255, 255, 0.06);
    }
    .progress-fill {
      height: 100%;
      background: ${accentColor};
      transform-origin: left center;
      animation: progressDrain 5s linear forwards;
    }
  </style>
</head>
<body>
  <div class="toast">
    <div class="accent"></div>
    <div class="body">
      <div class="avatar">
        ${
          avatarUrl
            ? `<img src="${avatarUrl}" alt="" onerror="this.parentElement.innerHTML='<span class=\\'avatar-fallback\\'>${fallbackInitials}</span>'">`
            : `<span class="avatar-fallback">${fallbackInitials}</span>`
        }
      </div>
      <div class="content">
        <div class="row">
          <span class="title">${title}</span>
          <span class="badge">${badgeLabel}</span>
        </div>
        <div class="message">${message}</div>
      </div>
    </div>
    <div class="progress-track"><div class="progress-fill"></div></div>
  </div>
</body>
</html>`
  }

  public stopAll() {
    for (const [_, slot] of this.activeSlots) {
      if (slot.timeout) clearTimeout(slot.timeout)
      if (slot.win && !slot.win.isDestroyed()) {
        slot.win.destroy()
      }
    }
    this.activeSlots.clear()
    this.queue = []
  }
}

const overlayManager = new DesktopOverlayManager()

function showDesktopOverlay(payload: OverlayNotificationItem) {
  overlayManager.show(payload)
}

// 24/7 Background Friends Tracker Engine
export class FriendsTrackerService {
  private api: VRChatApi
  private store: JsonStore
  private getWindow: () => BrowserWindow | null
  private fastPollTimer: NodeJS.Timeout | null = null
  private fullScanTimer: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private isFirstRun: boolean = true
  private lastOnlineSnapshot: Map<string, any> = new Map()
  private lastFullSnapshot: Map<string, any> = new Map()

  constructor(api: VRChatApi, store: JsonStore, getWindow: () => BrowserWindow | null) {
    this.api = api
    this.store = store
    this.getWindow = getWindow
  }

  public start() {
    if (!this.api.hasSavedSession()) return

    this.stop()
    this.isRunning = true

    // Defer the heavy full roster sync so we don't compete with VRChat at launch
    setTimeout(() => {
      if (this.isRunning) this.checkFullFriends()
    }, FRIENDS_INITIAL_SCAN_DELAY_MS)

    this.fastPollTimer = setInterval(() => {
      this.checkOnlineFriends()
    }, FRIENDS_ONLINE_POLL_MS)

    this.fullScanTimer = setInterval(() => {
      this.checkFullFriends()
    }, FRIENDS_FULL_SCAN_MS)
  }

  public stop() {
    if (this.fastPollTimer) {
      clearInterval(this.fastPollTimer)
      this.fastPollTimer = null
    }
    if (this.fullScanTimer) {
      clearInterval(this.fullScanTimer)
      this.fullScanTimer = null
    }
    this.isRunning = false
  }

  public async checkFriends(forceManual: boolean = false) {
    await this.checkFullFriends(forceManual)
  }

  // Fast real-time online status checker (Zero rate limit risk)
  public async checkOnlineFriends() {
    if (!this.api.hasSavedSession()) return
    try {
      const onlineFriends = await this.api.getOnlineFriends()
      const currentOnlineMap = new Map<string, any>()
      onlineFriends.forEach((f) => currentOnlineMap.set(f.id, f))

      const settings = this.store.getSettings()
      const knownFriends = this.store.getKnownFriends()

      if (this.lastOnlineSnapshot.size === 0) {
        this.lastOnlineSnapshot = currentOnlineMap
        return
      }

      // Check online, world changes, and name changes
      for (const [id, currentFriend] of currentOnlineMap.entries()) {
        const prevFriend = this.lastOnlineSnapshot.get(id)
        const avatarUrl =
          currentFriend.currentAvatarThumbnailImageUrl ||
          currentFriend.userIcon ||
          currentFriend.currentAvatarImageUrl ||
          ''

        // Friend newly came online
        if (!prevFriend) {
          const log = this.store.addActivityLog({
            type: 'online',
            title: 'Friend Joined Game',
            message: `${currentFriend.displayName} launched VRChat / came online`,
            displayName: currentFriend.displayName,
            userId: currentFriend.id,
            avatarUrl,
            location: currentFriend.location
          })
          this.emitActivityEvent(log)

          if (settings.notifyFriendOnline) {
            this.emitToastNotification({
              type: 'friend_online',
              title: 'Friend Launched VRChat',
              message: `${currentFriend.displayName} is now active in VRChat`,
              displayName: currentFriend.displayName,
              userId: currentFriend.id,
              isFriend: true,
              location: currentFriend.location,
              avatarUrl
            })
          }

          if (settings.notifyFriendOnlineDesktop) {
            showDesktopOverlay({
              title: 'Friend Joined Game',
              message: `${currentFriend.displayName} is now online`,
              isFriend: true,
              location: currentFriend.location,
              avatarUrl,
              accentType: 'online'
            })
          }
        }
        // Friend changed world
        else if (
          currentFriend.location &&
          currentFriend.location !== 'offline' &&
          currentFriend.location !== prevFriend.location
        ) {
          const log = this.store.addActivityLog({
            type: 'world_change',
            title: 'Friend Changed World',
            message: `${currentFriend.displayName} traveled to a new instance`,
            displayName: currentFriend.displayName,
            userId: currentFriend.id,
            avatarUrl,
            location: currentFriend.location
          })
          this.emitActivityEvent(log)

          if (settings.notifyFriendWorld) {
            this.emitToastNotification({
              type: 'world_change',
              title: 'Friend Changed World',
              message: `${currentFriend.displayName} joined a new room`,
              displayName: currentFriend.displayName,
              userId: currentFriend.id,
              isFriend: true,
              location: currentFriend.location,
              avatarUrl
            })
          }

          if (settings.notifyFriendWorldDesktop) {
            showDesktopOverlay({
              title: 'Friend Changed World',
              message: `${currentFriend.displayName} traveled to a new instance`,
              isFriend: true,
              location: currentFriend.location,
              avatarUrl,
              accentType: 'world'
            })
          }
        }

        // Check Display Name Changes
        const knownRecord = knownFriends[id]
        if (
          knownRecord &&
          knownRecord.displayName &&
          knownRecord.displayName !== currentFriend.displayName
        ) {
          const oldName = knownRecord.displayName
          const newName = currentFriend.displayName
          this.store.recordDisplayName(id, newName)

          const log = this.store.addActivityLog({
            type: 'name_change',
            title: 'Display Name Changed',
            message: `${oldName} changed their name to ${newName}`,
            displayName: newName,
            oldValue: oldName,
            newValue: newName,
            userId: currentFriend.id,
            avatarUrl
          })
          this.emitActivityEvent(log)

          if (settings.notifyNameChange) {
            this.emitToastNotification({
              type: 'name_change',
              title: 'Name Change Detected',
              message: `${oldName} is now known as ${newName}`,
              displayName: newName,
              userId: currentFriend.id,
              isFriend: true,
              avatarUrl
            })
          }

          if (settings.notifyNameChangeDesktop) {
            showDesktopOverlay({
              title: 'Name Change Detected',
              message: `${oldName} ➔ ${newName}`,
              isFriend: true,
              avatarUrl,
              accentType: 'name_change'
            })
          }
        }
      }

      // Check friends who went offline
      for (const [id, prevFriend] of this.lastOnlineSnapshot.entries()) {
        if (!currentOnlineMap.has(id)) {
          const log = this.store.addActivityLog({
            type: 'offline',
            title: 'Friend Left Game',
            message: `${prevFriend.displayName} logged off / went offline`,
            displayName: prevFriend.displayName,
            userId: prevFriend.id,
            avatarUrl: prevFriend.userIcon || prevFriend.currentAvatarThumbnailImageUrl || ''
          })
          this.emitActivityEvent(log)
        }
      }

      this.lastOnlineSnapshot = currentOnlineMap
    } catch (err) {
      console.error('Error checking online friends:', err)
    }
  }

  // Robust periodic full scan with false-positive unfriend protection
  public async checkFullFriends(forceManual: boolean = false) {
    if (!this.api.hasSavedSession()) return
    try {
      const friendsData = await this.api.getFriends(true)
      const allFriends = [...(friendsData.online || []), ...(friendsData.offline || [])]
      if (allFriends.length === 0 && !forceManual) return

      const currentFriendsMap = new Map<string, any>()
      allFriends.forEach((f) => currentFriendsMap.set(f.id, f))

      const knownFriends = this.store.getKnownFriends()
      const settings = this.store.getSettings()

      // First run: establish verified snapshot baseline
      if (this.isFirstRun || this.lastFullSnapshot.size === 0) {
        this.lastFullSnapshot = currentFriendsMap
        const updatedKnown: Record<string, any> = { ...knownFriends }
        allFriends.forEach((f) => {
          updatedKnown[f.id] = {
            displayName: f.displayName,
            avatarUrl:
              f.currentAvatarThumbnailImageUrl || f.userIcon || f.currentAvatarImageUrl || '',
            lastSeen: new Date().toISOString()
          }
        })
        this.store.saveKnownFriends(updatedKnown)
        this.isFirstRun = false
        return
      }

      // Safety Guard: If total friends dropped anomalously (>15%), skip unfriend checks to prevent false alerts caused by API rate limiting or pagination glitches!
      const previousTotal = this.lastFullSnapshot.size
      const currentTotal = currentFriendsMap.size
      const isDropAnomalous = previousTotal > 10 && currentTotal < previousTotal * 0.85

      if (!isDropAnomalous) {
        // Detect genuinely removed / unfriended users
        for (const [id, prevFriend] of this.lastFullSnapshot.entries()) {
          if (!currentFriendsMap.has(id)) {
            // Double check by querying user profile to confirm friendship actually ended
            try {
              const profile = await this.api.getUserProfile(id)
              // Only alert if profile confirms they are NOT a friend anymore
              if (profile && profile.isFriend === false) {
                const known = knownFriends[id] || prevFriend
                const log = this.store.addActivityLog({
                  type: 'unfriended',
                  title: 'Unfriended / Removed',
                  message: `${known.displayName} is no longer on your friends list`,
                  displayName: known.displayName,
                  userId: id,
                  avatarUrl: known.avatarUrl
                })
                this.emitActivityEvent(log)

                if (settings.notifyUnfriended) {
                  this.emitToastNotification({
                    type: 'unfriended',
                    title: 'Friendship Removed',
                    message: `${known.displayName} unfriended or was removed`,
                    displayName: known.displayName,
                    userId: id,
                    isFriend: false,
                    avatarUrl: known.avatarUrl
                  })
                }

                if (settings.notifyUnfriendedDesktop) {
                  showDesktopOverlay({
                    title: 'Friendship Removed',
                    message: `${known.displayName} is no longer on your friends list`,
                    isFriend: false,
                    avatarUrl: known.avatarUrl,
                    accentType: 'unfriended'
                  })
                }

                delete knownFriends[id]
              }
            } catch (checkErr) {
              // If profile check failed or rate limited, don't emit false unfriend!
              console.warn(`Could not verify unfriend for ${id}, skipping to avoid false positive:`, checkErr)
            }
          }
        }
      }

      // Update registry & snapshot
      allFriends.forEach((f) => {
        knownFriends[f.id] = {
          displayName: f.displayName,
          avatarUrl:
            f.currentAvatarThumbnailImageUrl || f.userIcon || f.currentAvatarImageUrl || '',
          lastSeen: new Date().toISOString()
        }
      })
      this.store.saveKnownFriends(knownFriends)
      this.lastFullSnapshot = currentFriendsMap
    } catch (err) {
      console.error('Error in checkFullFriends:', err)
    }
  }

  private emitActivityEvent(item: any) {
    const win = this.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('activity:newEvent', item)
    }
  }

  private emitToastNotification(payload: any) {
    const win = this.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('activity:toast', payload)
    }
  }
}

app.whenReady().then(() => {
  store = new JsonStore()
  api = new VRChatApi(store)
  logWatcher = new VRCLogWatcher(store, () => mainWindow)
  oscService = new VrcOscService()
  friendsTracker = new FriendsTrackerService(api, store, () => mainWindow)
  appUpdater = new AppUpdater(() => mainWindow)

  createWindow()
  createTray()
  registerIpcHandlers()

  if (store.getSettings().enableLogWatcher) {
    logWatcher.start()
  }

  if (api.hasSavedSession()) {
    friendsTracker.start()
  }

  // Apply startup setting
  const initialSettings = store.getSettings()
  if (initialSettings.startWithWindows) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
  overlayManager.stopAll()
  if (friendsTracker) friendsTracker.stop()
  if (logWatcher) logWatcher.stop()
  if (oscService) oscService.close()
  store?.flushPendingSave()
})

app.on('window-all-closed', () => {
  if (!store?.getSettings()?.minimizeToTray) {
    overlayManager.stopAll()
    if (friendsTracker) friendsTracker.stop()
    if (logWatcher) logWatcher.stop()
    if (oscService) oscService.close()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }
})

function registerIpcHandlers() {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
      return false
    } else {
      mainWindow?.maximize()
      return true
    }
  })

  ipcMain.handle('window:close', () => {
    if (store.getSettings().minimizeToTray) {
      mainWindow?.hide()
    } else {
      mainWindow?.close()
    }
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() || false
  })

  // Desktop Floating Overlay Notification
  ipcMain.handle('app:showDesktopNotification', (_, payload) => {
    showDesktopOverlay(payload)
    return true
  })

  // Launch VRChat Game Instance or Link
  ipcMain.handle('app:launchInstance', async (_, location: string) => {
    if (!location) return false
    try {
      if (location.startsWith('wrld_')) {
        await shell.openExternal(`vrchat://launch?ref=vrcfx&id=${encodeURIComponent(location)}`)
        return true
      } else if (location.startsWith('http://') || location.startsWith('https://') || location.startsWith('vrchat://')) {
        await shell.openExternal(location)
        return true
      }
    } catch (err) {
      console.error('Failed to launch instance:', err)
      if (location.startsWith('wrld_')) {
        const parts = location.split(':')
        const worldId = parts[0]
        const instanceId = parts.slice(1).join(':')
        await shell.openExternal(`https://vrchat.com/home/launch?worldId=${worldId}&instanceId=${encodeURIComponent(instanceId)}`)
        return true
      }
    }
    return false
  })

  // VRChat API handlers
  ipcMain.handle('auth:checkSession', async () => {
    return await api.checkSession()
  })

  ipcMain.handle('auth:login', async (_, credentials) => {
    const result = await api.login(credentials)
    if (result?.success) {
      friendsTracker.start()
    }
    return result
  })

  ipcMain.handle('auth:verify2FA', async (_, { code, type }) => {
    const result = await api.verify2FA(code, type)
    if (result?.success) {
      friendsTracker.start()
    }
    return result
  })

  ipcMain.handle('auth:logout', async () => {
    friendsTracker.stop()
    return await api.logout()
  })

  ipcMain.handle('friends:get', async (_, forceRefresh) => {
    return await api.getFriends(forceRefresh)
  })

  ipcMain.handle('friends:delete', async (_, userId) => {
    return await api.deleteFriend(userId)
  })

  ipcMain.handle('friends:deleteBulk', async (_, userIds) => {
    return await api.deleteFriendsBulk(userIds)
  })

  ipcMain.handle('user:getProfile', async (_, userId) => {
    return await api.getUserProfile(userId)
  })

  ipcMain.handle('user:updateProfile', async (_, data) => {
    return await api.updateProfile(data)
  })

  ipcMain.handle('worlds:getFavorites', async () => {
    return await api.getFavoriteWorlds()
  })

  ipcMain.handle('worlds:search', async (_, payload) => {
    if (typeof payload === 'string') {
      return await api.searchWorlds(payload)
    } else if (payload && typeof payload === 'object') {
      return await api.searchWorlds(
        payload.query || '',
        payload.n || 60,
        payload.sort || 'popularity',
        payload.tag
      )
    }
    return await api.searchWorlds('', 60, 'popularity')
  })

  // Avatars API
  ipcMain.handle('avatars:getMyAvatars', async (_, releaseStatus?: string) => {
    return await api.getUserUploadedAvatars(releaseStatus)
  })

  ipcMain.handle('avatars:getFavorites', async () => {
    return await api.getFavoriteAvatars()
  })

  ipcMain.handle('avatars:select', async (_, avatarId: string) => {
    return await api.selectAvatar(avatarId)
  })

  ipcMain.handle('avatars:addFavorite', async (_, payload: { avatarId: string; groupTag?: string }) => {
    return await api.addFavoriteAvatar(payload.avatarId, payload.groupTag || 'avatars1')
  })

  ipcMain.handle('avatars:removeFavorite', async (_, favoriteId: string) => {
    return await api.removeFavoriteAvatar(favoriteId)
  })

  ipcMain.handle('avatars:moveFavorite', async (_, payload: { avatarId: string; currentFavoriteId: string; targetGroupTag: string }) => {
    return await api.moveFavoriteAvatar(payload.avatarId, payload.currentFavoriteId, payload.targetGroupTag)
  })

  ipcMain.handle('avatars:search', async (_, payload) => {
    const q = typeof payload === 'string' ? payload : payload?.query || ''
    const n = typeof payload === 'object' ? payload?.n || 60 : 60
    return await api.searchAvatars(q, n)
  })

  // VRC+ Inventory, Prints & Props
  ipcMain.handle('inventory:getItems', async (_, types?: string) => {
    return await api.getUserInventory(types)
  })

  ipcMain.handle('inventory:getPrints', async (_, userId?: string) => {
    return await api.getUserPrints(userId)
  })

  ipcMain.handle('inventory:getProps', async (_, authorId?: string) => {
    return await api.getUserProps(authorId)
  })

  ipcMain.handle('inventory:getVrcPlusOverview', async () => {
    return await api.getUserVrcPlusOverview()
  })

  // Radar & Log Watcher
  ipcMain.handle('radar:getState', () => {
    return logWatcher.getState()
  })

  ipcMain.handle('radar:restart', () => {
    logWatcher.start()
    return logWatcher.getState()
  })

  // Settings
  ipcMain.handle('settings:get', () => {
    return store.getSettings()
  })

  ipcMain.handle('settings:save', (_, settings: Partial<AppSettings>) => {
    const updated = store.setSettings(settings)
    if (updated.enableLogWatcher) {
      logWatcher.start()
    } else {
      logWatcher.stop()
    }

    if (settings.startWithWindows !== undefined) {
      app.setLoginItemSettings({ openAtLogin: !!updated.startWithWindows, openAsHidden: true })
    }

    return updated
  })

  ipcMain.handle('settings:selectLogDir', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select VRChat Log Directory'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Friend Notes & Nicknames
  ipcMain.handle('notes:get', () => {
    return store.getFriendNotes()
  })

  ipcMain.handle('notes:save', (_, { userId, data }) => {
    return store.saveFriendNote(userId, data)
  })

  // Name History
  ipcMain.handle('history:getNameHistory', (_, userId: string) => {
    return store.getNameHistory(userId)
  })

  // Visited Instances History
  ipcMain.handle('history:getInstances', () => {
    return store.getVisitedInstances()
  })

  ipcMain.handle('history:clearInstances', () => {
    store.clearVisitedInstances()
    return true
  })

  // OSC Chatbox & System Stats handlers
  ipcMain.handle('osc:sendChatbox', async (_, { text, directSend, notify }) => {
    return await oscService.sendChatbox(text, directSend ?? true, notify ?? false)
  })

  ipcMain.handle('osc:setTyping', async (_, isTyping: boolean) => {
    return await oscService.setTyping(isTyping)
  })

  ipcMain.handle('osc:startLoop', (_, { messages, intervalSeconds, directSend, notify }) => {
    oscService.startLoop(messages, intervalSeconds || 8, directSend ?? true, notify ?? false)
    return true
  })

  ipcMain.handle('osc:stopLoop', () => {
    oscService.stopLoop()
    return true
  })

  ipcMain.handle('osc:isLoopRunning', () => {
    return oscService.isLoopRunning()
  })

  ipcMain.handle('osc:startStats', (_, { template, intervalSeconds, directSend }) => {
    oscService.startStatsBroadcast(template || '⚡ CPU: {cpu} | RAM: {ram} | 🕒 {time}', intervalSeconds || 5, directSend ?? true)
    return true
  })

  ipcMain.handle('osc:stopStats', () => {
    oscService.stopStatsBroadcast()
    return true
  })

  ipcMain.handle('osc:isStatsRunning', () => {
    return oscService.isStatsBroadcasting()
  })

  ipcMain.handle('osc:getSystemStats', async () => {
    return await oscService.getSystemStats()
  })

  // Magic Chatbox HUD handlers
  ipcMain.handle('osc:startMagicHud', (_, config) => {
    oscService.startMagicHud(config)
    return true
  })

  ipcMain.handle('osc:stopMagicHud', () => {
    oscService.stopMagicHud()
    return true
  })

  ipcMain.handle('osc:isMagicHudRunning', () => {
    return oscService.isMagicHudRunning()
  })

  ipcMain.handle('osc:getLiveHudData', async (_, { city, hypeRateSessionId, simulatedBpm, hypeRateApiKey } = {}) => {
    return await oscService.getLiveHudData(city, hypeRateSessionId, simulatedBpm, hypeRateApiKey)
  })

  // Data Backup Export & Import
  ipcMain.handle('backup:export', async () => {
    if (!mainWindow) return { success: false, error: 'Window not available' }
    const dateStr = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export VRCFX Data Backup',
      defaultPath: `vrcfx-backup-${dateStr}.json`,
      filters: [{ name: 'VRCFX Backup (*.json)', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export canceled' }
    }

    try {
      const backupData = store.exportBackupData()
      fs.writeFileSync(result.filePath, JSON.stringify(backupData, null, 2), 'utf-8')
      return { success: true, filePath: result.filePath }
    } catch (err: any) {
      console.error('Failed to export backup:', err)
      return { success: false, error: err?.message || 'Failed to write backup file' }
    }
  })

  ipcMain.handle('backup:import', async () => {
    if (!mainWindow) return { success: false, error: 'Window not available' }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import VRCFX Data Backup',
      properties: ['openFile'],
      filters: [{ name: 'VRCFX Backup (*.json)', extensions: ['json'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Import canceled' }
    }

    try {
      const filePath = result.filePaths[0]
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      const importResult = store.importBackupData(parsed)
      return importResult
    } catch (err: any) {
      console.error('Failed to import backup:', err)
      return { success: false, error: err?.message || 'Failed to parse backup file' }
    }
  })

  // 24/7 Activity Logs Handlers
  ipcMain.handle('activity:getLogs', () => {
    return store.getActivityLogs()
  })

  ipcMain.handle('activity:clearLogs', () => {
    store.clearActivityLogs()
    return true
  })

  ipcMain.handle('activity:triggerCheck', async () => {
    if (friendsTracker) {
      await friendsTracker.checkFriends(true)
    }
    return store.getActivityLogs()
  })

  // App Version & Smart Updates (GitHub private releases)
  ipcMain.handle('app:getVersion', () => {
    return {
      version: app.getVersion() || '1.0.0',
      name: 'VRCFX',
      isPackaged: app.isPackaged,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome
    }
  })

  ipcMain.handle('app:checkForUpdates', async () => {
    return await appUpdater.checkForUpdates()
  })

  ipcMain.handle('app:installUpdate', async () => {
    return await appUpdater.checkAndInstall()
  })
}
