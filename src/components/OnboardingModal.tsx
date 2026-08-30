import React, { useState } from 'react'
import {
  Sparkles,
  Users,
  Radio,
  Bell,
  Layers,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  Palette,
  Layout,
  Languages,
  Moon,
  Heart,
  Volume2
} from 'lucide-react'
import { TranslationDictionary, SupportedLanguage } from '../i18n'
import { AppSettings, AppTheme, normalizeTheme } from '../types'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  t: TranslationDictionary
  isArabic: boolean
  settings: AppSettings
  onUpdateSettings: (settings: Partial<AppSettings>) => void
  currentLang: SupportedLanguage
  onChangeLanguage: (lang: SupportedLanguage) => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  t,
  isArabic,
  settings,
  onUpdateSettings,
  currentLang,
  onChangeLanguage
}) => {
  const [step, setStep] = useState(0)

  if (!isOpen) return null

  const handleThemeSelect = (newTheme: AppTheme) => {
    try {
      localStorage.setItem('vrcfx-theme', newTheme)
    } catch {}
    document.documentElement.className = `theme-${newTheme}`
    document.documentElement.setAttribute('data-theme', newTheme)
    document.body.className = `theme-${newTheme}`
    document.body.setAttribute('data-theme', newTheme)
    onUpdateSettings({ theme: newTheme })
  }

  const totalSteps = 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-in-page">
      <div className="w-full max-w-xl gothic-panel p-8 shadow-2xl border-white/[0.12] flex flex-col justify-between relative min-h-[500px] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-crimson-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer z-10"
          title={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-theme-primary flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {t.welcomeTitle}
          </h2>
          <p className="text-xs text-white/50 mt-1 font-medium">
            {currentLang === 'ar' ? 'قم بتخصيص إعداداتك المفضلة لبدء الاستخدام' : 'Configure your setup preferences to get started with VRCFX'}
          </p>
        </div>

        {/* Dynamic Wizard Steps */}
        <div className="flex-1 flex flex-col justify-center">
          {/* STEP 0: Feature Overview */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in-page">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08]">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent block mb-1">
                  {currentLang === 'ar' ? 'الميزات الأساسية' : 'Core Intelligence'}
                </span>
                <h3 className="text-sm font-black text-white mb-2">
                  {currentLang === 'ar' ? 'ماذا يقدم لك VRCFX؟' : 'What VRCFX does for you'}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  {currentLang === 'ar'
                    ? 'تطبيق سطح مكتب خفيف ومباشر يراقب غرفتك في VRChat، ويكشف الأصدقاء المتصلين ومواقعهم، ويعرض إشعارات عائمة فوق ألعابك.'
                    : 'A fast, real-time desktop companion that tracks your VRChat rooms, detects friend locations, and displays floating overlays above your games.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Users className="w-4 h-4 text-accent" />
                    <span>{t.navFriends}</span>
                  </div>
                  <p className="text-[10px] text-white/50">
                    {currentLang === 'ar' ? 'مجموعات المفضلة والملاحظات والأسماء السابقة' : 'Favorite groups, notes, and past name history'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Bell className="w-4 h-4 text-accent" />
                    <span>{t.overlayToggle}</span>
                  </div>
                  <p className="text-[10px] text-white/50">
                    {currentLang === 'ar' ? 'إشعارات عائمة فوق VRChat بدون سحب تركيز الفأرة' : 'Floating in-game toasts over fullscreen games'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Theme & Language Customization */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-page">
              {/* Language Selection */}
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-2 mb-2.5">
                  <Languages className="w-4 h-4 text-accent" />
                  <span>{t.languageSection}</span>
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'العربية' },
                    { code: 'es', label: 'Español' },
                    { code: 'fr', label: 'Français' }
                  ].map((lang) => {
                    const isSelected = currentLang === lang.code
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => onChangeLanguage(lang.code as SupportedLanguage)}
                        className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'option-selected'
                            : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04] text-white/70'
                        }`}
                      >
                        {lang.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-2 mb-2.5">
                  <Palette className="w-4 h-4 text-accent" />
                  <span>{t.themeSection}</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'pitch-black', label: t.themeBlack, icon: <Moon className="w-3.5 h-3.5" /> },
                    { id: 'dark', label: t.themeDark, icon: <Moon className="w-3.5 h-3.5" /> },
                    { id: 'midnight', label: t.themeMidnight, icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { id: 'onyx', label: t.themeEmerald, icon: <Layers className="w-3.5 h-3.5" /> },
                    { id: 'pink', label: t.themePink, icon: <Heart className="w-3.5 h-3.5" /> }
                  ].map((thm) => {
                    const isSelected = normalizeTheme(settings.theme) === thm.id
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => handleThemeSelect(thm.id as AppTheme)}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'option-selected ring-1 ring-accent/40'
                            : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04] text-white/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-accent">
                          {thm.icon}
                        </div>
                        <span className="font-bold text-[11px] block truncate">{thm.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Notification Placement & Audio */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in-page">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-2 mb-2.5">
                  <Bell className="w-4 h-4 text-accent" />
                  <span>{t.cornerPlacement}</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'bottom-right', label: t.cornerBR, desc: 'Lower right corner (Default)' },
                    { id: 'bottom-left', label: t.cornerBL, desc: 'Lower left corner' },
                    { id: 'top-right', label: t.cornerTR, desc: 'Upper right corner' },
                    { id: 'top-left', label: t.cornerTL, desc: 'Upper left corner' }
                  ].map((pos) => {
                    const isSelected = (settings.notificationPosition || 'bottom-right') === pos.id
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => onUpdateSettings({ notificationPosition: pos.id as any })}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'option-selected ring-1 ring-accent/40'
                            : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04] text-white/70'
                        }`}
                      >
                        <span className="font-bold text-xs block mb-1">{pos.label}</span>
                        <span className="text-[10px] text-white/40 block">{pos.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-accent" />
                  <div>
                    <span className="text-xs font-bold text-white block">{t.soundAlertsToggle}</span>
                    <span className="text-[10px] text-white/50">{t.soundAlertsDesc}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundAlerts}
                  onChange={(e) => onUpdateSettings({ soundAlerts: e.target.checked })}
                  className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Startup & Background System Tray */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in-page">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-1 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Layout className="w-4 h-4 text-accent" />
                  <span>{t.startupSection}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  {currentLang === 'ar'
                    ? 'اختر كيف يعمل البرنامج في الخلفية وعلى جهازك.'
                    : 'Configure background execution and auto-launch options.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">{t.startWithWindows}</span>
                  <span className="text-[10px] text-white/50">{t.startWithWindowsDesc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.startWithWindows || false}
                  onChange={(e) => onUpdateSettings({ startWithWindows: e.target.checked })}
                  className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">{t.minimizeToTray}</span>
                  <span className="text-[10px] text-white/50">{t.minimizeToTrayDesc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.minimizeToTray ?? true}
                  onChange={(e) => onUpdateSettings({ minimizeToTray: e.target.checked })}
                  className="w-4.5 h-4.5 accent-crimson-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Step Indicator & Controls */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/[0.08]">
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  step === i ? 'w-7 bg-accent' : 'w-2.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="btn-gothic-secondary px-4 py-2 text-xs font-semibold"
              >
                {t.back}
              </button>
            )}

            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="btn-crimson-primary flex items-center gap-2 px-5 py-2 text-xs font-black"
              >
                <span>{t.next}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="btn-crimson-primary px-6 py-2 text-xs font-black flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.getStarted}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
