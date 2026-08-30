import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  FolderOpen,
  RefreshCw,
  Palette,
  Shield,
  LogOut,
  CheckCircle2,
  HelpCircle,
  Moon,
  Sparkles,
  Layers,
  Volume2,
  Bell,
  Layout,
  Languages,
  BookOpen,
  Heart,
  Save,
  Check,
  Database,
  Download,
  Upload,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { AppSettings, AppTheme, VRCUser, normalizeTheme } from '../types'
import { TranslationDictionary, SupportedLanguage } from '../i18n'
import { soundService } from '../utils/sound-service'
import notificationSound from '../assets/sounds/notification.mp3'

interface SettingsViewProps {
  settings: AppSettings
  onSaveSettings: (settings: Partial<AppSettings>) => void
  currentUser: VRCUser | null
  onLogout: () => void
  onTestNotification?: () => void
  onOpenGuide?: () => void
  t: TranslationDictionary
  currentLang: SupportedLanguage
  onChangeLanguage: (lang: SupportedLanguage) => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  currentUser,
  onLogout,
  onTestNotification,
  onOpenGuide,
  t,
  currentLang,
  onChangeLanguage
}) => {
  const [logPath, setLogPath] = useState(settings.vrcLogPath || '')
  const [autoRefresh, setAutoRefresh] = useState(settings.autoRefreshFriends)
  const [refreshMinutes, setRefreshMinutes] = useState(settings.refreshIntervalMinutes || 15)
  const [theme, setTheme] = useState<AppTheme>(
    normalizeTheme((localStorage.getItem('vrcfx-theme') as string) || settings.theme || 'pitch-black')
  )
  const [soundAlerts, setSoundAlerts] = useState(settings.soundAlerts)
  const [enableWatcher, setEnableWatcher] = useState(settings.enableLogWatcher)
  const [notifPosition, setNotifPosition] = useState<
    'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  >(settings.notificationPosition || 'bottom-right')
  const [savedNotice, setSavedNotice] = useState(false)
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleSelectDir = async () => {
    if (window.electronAPI?.selectLogDir) {
      const selected = await window.electronAPI.selectLogDir()
      if (selected) {
        setLogPath(selected)
        onSaveSettings({ vrcLogPath: selected })
        showNotice()
      }
    }
  }

  const showNotice = () => {
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleSave = () => {
    onSaveSettings({
      vrcLogPath: logPath,
      autoRefreshFriends: autoRefresh,
      refreshIntervalMinutes: refreshMinutes,
      theme,
      soundAlerts,
      enableLogWatcher: enableWatcher,
      notificationPosition: notifPosition,
      language: currentLang
    })
    showNotice()
  }

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme)
    try {
      localStorage.setItem('vrcfx-theme', newTheme)
    } catch {}
    document.documentElement.className = `theme-${newTheme}`
    document.documentElement.setAttribute('data-theme', newTheme)
    document.body.className = `theme-${newTheme}`
    document.body.setAttribute('data-theme', newTheme)
    onSaveSettings({ theme: newTheme })
    showNotice()
  }

  const handlePositionChange = (
    pos: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  ) => {
    setNotifPosition(pos)
    onSaveSettings({ notificationPosition: pos })
    showNotice()
  }

  const simpleThemeName = (th: string) => {
    switch (th) {
      case 'pitch-black':
        return t.themeBlack
      case 'dark':
        return t.themeDark
      case 'midnight':
        return t.themeMidnight
      case 'onyx':
        return t.themeEmerald
      case 'pink':
        return t.themePink
      default:
        return t.themeBlack
    }
  }

  const handleExportBackup = async () => {
    if (!window.electronAPI?.exportBackup) return
    setIsExporting(true)
    setBackupMessage(null)
    try {
      const res = await window.electronAPI.exportBackup()
      if (res.success) {
        setBackupMessage({
          type: 'success',
          text: `Backup exported successfully to ${res.filePath || 'file'}!`
        })
      } else if (res.error !== 'Export canceled') {
        setBackupMessage({ type: 'error', text: res.error || 'Failed to export backup' })
      }
    } catch (err: any) {
      setBackupMessage({ type: 'error', text: err?.message || 'Error exporting backup' })
    } finally {
      setIsExporting(false)
      setTimeout(() => setBackupMessage(null), 5000)
    }
  }

  const handleImportBackup = async () => {
    if (!window.electronAPI?.importBackup) return
    setIsImporting(true)
    setBackupMessage(null)
    try {
      const res = await window.electronAPI.importBackup()
      if (res.success) {
        const counts = res.importedCount
        const details = counts
          ? `(${counts.notes} notes, ${counts.names} names, ${counts.instances} instances)`
          : ''
        setBackupMessage({
          type: 'success',
          text: `Backup imported and restored successfully! ${details}`
        })
      } else if (res.error !== 'Import canceled') {
        setBackupMessage({ type: 'error', text: res.error || 'Failed to import backup' })
      }
    } catch (err: any) {
      setBackupMessage({ type: 'error', text: err?.message || 'Error importing backup' })
    } finally {
      setIsImporting(false)
      setTimeout(() => setBackupMessage(null), 5000)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-app">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">
              <SettingsIcon className="page-title-icon" />
              <span>{t.settingsTitle}</span>
            </h1>
            <p className="text-xs text-theme-muted mt-1">
              {t.settingsDesc}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenGuide && (
              <button
                onClick={onOpenGuide}
                className="btn-gothic-secondary px-4 py-2 text-xs font-bold flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-accent" />
                <span>{t.navGuide}</span>
              </button>
            )}
            <button
              onClick={handleSave}
              className="btn-crimson-primary px-5 py-2 text-xs font-black flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{t.saveAll}</span>
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-3 animate-fade-in-page shadow-sm">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
            <span>{t.savedNotice}</span>
          </div>
        )}

        {/* Section 1: Language & Localization */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
              <Languages className="w-4 h-4 text-accent" />
              <span>{t.languageSection}</span>
            </div>
            <span className="text-[10px] text-accent font-mono font-bold px-2 py-0.5 rounded bg-crimson-500/15 border border-crimson-500/30 uppercase">
              {currentLang}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { code: 'en', label: 'English', native: 'English' },
              { code: 'ar', label: 'العربية', native: 'Arabic' },
              { code: 'es', label: 'Español', native: 'Spanish' },
              { code: 'fr', label: 'Français', native: 'French' }
            ].map((lang) => {
              const isSelected = currentLang === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onChangeLanguage(lang.code as SupportedLanguage)}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'option-selected'
                      : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
                  }`}
                >
                  <span className="font-bold text-xs block">{lang.label}</span>
                  <span className="text-[10px] text-white/40 mt-1 block">{lang.native}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: Visual Themes */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
              <Palette className="w-4 h-4 text-accent" />
              <span>{t.themeSection}</span>
            </div>
            <span className="text-[11px] text-accent font-bold">
              {t.themeCurrent}: {simpleThemeName(theme)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Black */}
            <button
              type="button"
              onClick={() => handleThemeChange('pitch-black')}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                theme === 'pitch-black'
                  ? 'option-selected ring-1 ring-accent/40'
                  : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-accent" />
                <span className="font-bold text-xs">{t.themeBlack}</span>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block font-mono">Gothic Obsidian</span>
            </button>

            {/* 2. Dark */}
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                theme === 'dark'
                  ? 'option-selected ring-1 ring-accent/40'
                  : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-accent" />
                <span className="font-bold text-xs">{t.themeDark}</span>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block font-mono">Slate Dark</span>
            </button>

            {/* 3. Midnight */}
            <button
              type="button"
              onClick={() => handleThemeChange('midnight')}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                theme === 'midnight'
                  ? 'option-selected ring-1 ring-accent/40'
                  : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold text-xs">{t.themeMidnight}</span>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block font-mono">Violet Dark</span>
            </button>

            {/* 4. Emerald */}
            <button
              type="button"
              onClick={() => handleThemeChange('onyx')}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                theme === 'onyx'
                  ? 'option-selected ring-1 ring-accent/40'
                  : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-xs">{t.themeEmerald}</span>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block font-mono">Green Dark</span>
            </button>

            {/* 5. Velvet Rose */}
            <button
              type="button"
              onClick={() => handleThemeChange('pink')}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                theme === 'pink'
                  ? 'option-selected ring-1 ring-accent/40'
                  : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-bold text-xs">{t.themePink}</span>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block font-mono">Blood Velvet</span>
            </button>
          </div>
        </div>

        {/* Section 3: 24/7 Live Notifications & In-Game Overlay */}
        <div className="gothic-panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
              <Bell className="w-4 h-4 text-accent" />
              <span>{t.notifSection} & 24/7 Intelligence</span>
            </div>

            <div className="flex items-center gap-2.5">
              {onTestNotification && (
                <button
                  type="button"
                  onClick={onTestNotification}
                  className="btn-crimson-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{t.testPopup}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundService.play(settings.soundChimeType || 'harmonic', settings.soundVolume ?? 75, true)
                }}
                className="btn-gothic-secondary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Play test chime"
              >
                <Volume2 className="w-3.5 h-3.5 text-accent" />
                <span>{t.testSound}</span>
              </button>
            </div>
          </div>

          {/* Corner Placement */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-2.5">
              {t.cornerPlacement} (Floating Game Overlay)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'bottom-right', label: t.cornerBR, desc: 'Lower right' },
                { id: 'bottom-left', label: t.cornerBL, desc: 'Lower left' },
                { id: 'top-right', label: t.cornerTR, desc: 'Upper right' },
                { id: 'top-left', label: t.cornerTL, desc: 'Upper left' }
              ].map((pos) => {
                const isSelected = notifPosition === pos.id
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => handlePositionChange(pos.id as any)}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'option-selected ring-1 ring-accent/40'
                        : 'border-white/[0.08] bg-black/30 hover:border-white/20 text-white/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{pos.label}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-accent" />
                      )}
                    </div>
                    <span className="text-[10px] text-white/40">{pos.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Granular Notification Rules Grid */}
          <div className="pt-2 space-y-3 border-t border-white/[0.08]">
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Notification Rules & Desktop Display
            </span>

            {/* Rule 1: Friend Joined Game */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/[0.08] gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Friend Joined VRChat (Came Online)</span>
                <span className="text-[11px] text-white/50">Alert when friends launch the game even if you are offline</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyFriendOnline ?? true}
                    onChange={(e) => onSaveSettings({ notifyFriendOnline: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>In-App</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyFriendOnlineDesktop ?? true}
                    onChange={(e) => onSaveSettings({ notifyFriendOnlineDesktop: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>Desktop Overlay</span>
                </label>
              </div>
            </div>

            {/* Rule 2: Friend Traveled */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/[0.08] gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Friend Traveled / Changed World</span>
                <span className="text-[11px] text-white/50">Alert when a friend joins a new room or world</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyFriendWorld ?? true}
                    onChange={(e) => onSaveSettings({ notifyFriendWorld: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>In-App</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyFriendWorldDesktop ?? true}
                    onChange={(e) => onSaveSettings({ notifyFriendWorldDesktop: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>Desktop Overlay</span>
                </label>
              </div>
            </div>

            {/* Rule 3: Unfriended Alert */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/[0.08] gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Unfriended / Removal Detection</span>
                <span className="text-[11px] text-white/50">Track when a friend is removed from your friends list</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyUnfriended ?? true}
                    onChange={(e) => onSaveSettings({ notifyUnfriended: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>In-App</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyUnfriendedDesktop ?? false}
                    onChange={(e) => onSaveSettings({ notifyUnfriendedDesktop: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>Desktop Overlay</span>
                </label>
              </div>
            </div>

            {/* Rule 4: Display Name Change */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/[0.08] gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Display Name Changes</span>
                <span className="text-[11px] text-white/50">Track when a friend updates their display username</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyNameChange ?? true}
                    onChange={(e) => onSaveSettings({ notifyNameChange: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>In-App</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyNameChangeDesktop ?? false}
                    onChange={(e) => onSaveSettings({ notifyNameChangeDesktop: e.target.checked })}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer"
                  />
                  <span>Desktop Overlay</span>
                </label>
              </div>
            </div>
          </div>

          {/* Audio Chime Engine & Volume Slider */}
          <div className="pt-3 space-y-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {t.soundAlertsToggle}
                </span>
                <span className="text-[11px] text-white/50">
                  {t.soundAlertsDesc}
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => {
                  setSoundAlerts(e.target.checked)
                  onSaveSettings({ soundAlerts: e.target.checked })
                }}
                className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
              />
            </div>

            {soundAlerts && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-4">
                {/* Chime Preset */}
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">
                    Chime Tone Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'harmonic', label: 'Crystal Harmonic', desc: 'Warm resonance' },
                      { id: 'ping', label: 'Modern Ping', desc: 'Crisp precision' },
                      { id: 'classic', label: 'Classic Bell', desc: 'Dual tone' },
                      { id: 'subtle', label: 'Mellow Subtle', desc: 'Soft attack' }
                    ].map((style) => {
                      const isSelected = (settings.soundChimeType || 'harmonic') === style.id
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            onSaveSettings({ soundChimeType: style.id as any })
                            soundService.play(style.id as any, settings.soundVolume ?? 75, true)
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-crimson-500 bg-crimson-900/20 text-white'
                              : 'border-white/[0.08] bg-black/30 hover:border-white/20 text-white/70'
                          }`}
                        >
                          <span className="text-xs font-bold block">{style.label}</span>
                          <span className="text-[10px] text-white/40">{style.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white/70">
                      Alert Volume: <strong className="text-accent">{settings.soundVolume ?? 75}%</strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.soundVolume ?? 75}
                    onChange={(e) => {
                      const vol = Number(e.target.value)
                      onSaveSettings({ soundVolume: vol })
                    }}
                    onMouseUp={() => {
                      soundService.play(settings.soundChimeType || 'harmonic', settings.soundVolume ?? 75, true)
                    }}
                    className="w-full accent-crimson-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Windows Startup & System Tray */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
            <Layout className="w-4 h-4 text-accent" />
            <span>{t.startupSection}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">
                {t.startWithWindows}
              </span>
              <span className="text-[11px] text-white/50">
                {t.startWithWindowsDesc}
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.startWithWindows || false}
              onChange={(e) => onSaveSettings({ startWithWindows: e.target.checked })}
              className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">
                {t.minimizeToTray}
              </span>
              <span className="text-[11px] text-white/50">
                {t.minimizeToTrayDesc}
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.minimizeToTray ?? true}
              onChange={(e) => onSaveSettings({ minimizeToTray: e.target.checked })}
              className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 5: VRChat Game Logs & Radar */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
            <FolderOpen className="w-4 h-4 text-accent" />
            <span>{t.logsSection}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-2">
              {t.logDir}
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={logPath}
                onChange={(e) => setLogPath(e.target.value)}
                placeholder="Auto-detected AppData\LocalLow\VRChat\VRChat"
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono placeholder-white/30 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500"
              />
              <button
                type="button"
                onClick={handleSelectDir}
                className="btn-gothic-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-accent" />
                <span>{t.browse}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">
                {t.enableLogWatcher}
              </span>
              <span className="text-[11px] text-white/50">
                {t.enableLogWatcherDesc}
              </span>
            </div>
            <input
              type="checkbox"
              checked={enableWatcher}
              onChange={(e) => setEnableWatcher(e.target.checked)}
              className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 6: Background Sync */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
            <RefreshCw className="w-4 h-4 text-accent" />
            <span>{t.syncSection}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">
                {t.autoRefresh}
              </span>
              <span className="text-[11px] text-white/50">
                {t.autoRefreshDesc}
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
            />
          </div>

          {autoRefresh && (
            <div className="pt-4 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/70 font-semibold">
                  {t.refreshInterval}: <strong className="text-accent">{refreshMinutes} min</strong>
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={refreshMinutes}
                onChange={(e) => setRefreshMinutes(Number(e.target.value))}
                className="w-full accent-crimson-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Section 7: Account & Session */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
            <Shield className="w-4 h-4 text-accent" />
            <span>Account Session</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">
                {currentUser ? `Signed in as ${currentUser.displayName}` : 'Not Signed In'}
              </span>
              <span className="text-[11px] text-white/50">
                {currentUser
                  ? `User ID: ${currentUser.id}`
                  : 'Log in to sync friends, worlds, and profile data.'}
              </span>
            </div>

            {currentUser && (
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl bg-crimson-900/20 hover:bg-crimson-900/40 text-accent hover:text-white border border-crimson-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 8: Data Backup & Migration (Export / Import) */}
        <div className="gothic-panel p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
            <Database className="w-4 h-4 text-accent" />
            <span>Data Backup & Migration</span>
          </div>

          <p className="text-xs text-white/60 leading-relaxed font-medium">
            Export all your private friend notes, custom nicknames, username tracking history, visited world logs, and preferences to a backup file. Easily import it on any new PC or system.
          </p>

          {backupMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-fade-in-page ${
                backupMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-crimson-500/10 border-crimson-500/30 text-crimson-300'
              }`}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="btn-crimson-primary px-5 py-2.5 text-xs font-black flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting Backup...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Data Backup (.json)</span>
                </>
              )}
            </button>

            <button
              onClick={handleImportBackup}
              disabled={isImporting}
              className="btn-gothic-secondary px-5 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Backup...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-accent" />
                  <span>Import Backup File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
