import React, { useState, useMemo } from 'react'
import {
  BookOpen,
  Search,
  Users,
  Radio,
  Bell,
  Trash2,
  Settings,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Shield,
  FolderOpen,
  Monitor,
  Volume2,
  Star,
  CheckCircle2,
  Layout,
  Globe,
  AlertTriangle,
  Edit3,
  Activity
} from 'lucide-react'
import { TranslationDictionary, SupportedLanguage } from '../i18n'

interface ManualViewProps {
  t: TranslationDictionary
  currentLang: SupportedLanguage
  onNavigateTab?: (tab: string) => void
}

export const ManualView: React.FC<ManualViewProps> = ({
  t,
  currentLang,
  onNavigateTab
}) => {
  const [selectedSection, setSelectedSection] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')

  const sections = useMemo(() => {
    const isAr = currentLang === 'ar'
    return [
      {
        id: 'overview',
        title: isAr ? 'نظرة عامة والبدء' : 'Overview & Getting Started',
        icon: <BookOpen className="w-4 h-4 text-accent" />,
        content: (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-black text-white mb-1.5">
                {isAr ? 'مرحباً بك في VRCFX' : 'Welcome to VRCFX Companion'}
              </h3>
              <p className="text-xs text-white/70 leading-relaxed font-medium">
                {isAr
                  ? 'VRCFX هو تطبيق سطح مكتب متقدم وشامل مصمم لمرافقة تجربة VRChat الخاصة بك. يتيح لك مراقبة نشاط أصدقائك على مدار 24 ساعة، ومعرفة من دخل اللعبة أو غادرها حتى وإن لم تكن داخل اللعبة، واكتشاف العوالم والأفاتارات، واستقبال إشعارات عائمة مخصصة فوق أي شاشة ولعبة.'
                  : 'VRCFX is an ultra-fast, premium desktop companion tailored for VRChat. It operates 24/7 in the background to track when your friends launch the game, travel between worlds, change their display names, or unfriend you—even when you are not in VRChat.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'تسجيل دخول رسمي وآمن' : 'Official VRChat Sign-in'}</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  {isAr
                    ? 'تسجيل الدخول يتم مباشرة مع خوادم VRChat الرسمية مع دعم كامل للتحقق بخطوتين (2FA) والجلسات المحفوظة.'
                    : 'Direct authentication with official VRChat servers supporting TOTP and Email Two-Factor Authentication.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                  <Radio className="w-4 h-4 text-accent" />
                  <span>{isAr ? 'مراقبة حية على مدار 24 ساعة' : '24/7 Live Background Intelligence'}</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  {isAr
                    ? 'يعمل التطبيق في الخلفية بهدوء لتنبيهك فور دخول أي صديق إلى اللعبة أو انتقاله إلى عالم آخر.'
                    : 'Runs quietly in the system tray to detect when friends launch VRChat, travel, or update statuses in real time.'}
                </p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'tracking',
        title: isAr ? 'التتبع الحي وكشف إلغاء الصداقة والأسماء' : '24/7 Friend Tracking & Unfriend Alerts',
        icon: <Activity className="w-4 h-4 text-accent" />,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white">
              {isAr ? 'كيف يعمل التتبع على مدار 24 ساعة؟' : '24/7 Intelligence & Unfriend Detection'}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {isAr
                ? 'يقوم VRCFX بمقارنة حالة قائمة الأصدقاء بشكل دوري ومستمر، حتى لو كانت لعبة VRChat مغلقة لديك، لتسجيل الأحداث فور وقوعها.'
                : 'VRCFX monitors friend snapshots 24/7 and archives events into a persistent activity feed on your device.'}
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Star className="w-4 h-4 fill-emerald-400" />
                  <span>{isAr ? 'دخول اللعبة (Joined Game)' : 'Friend Launched Game / Came Online'}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  {isAr
                    ? 'عندما يبدأ صديقك تشغيل VRChat، يرسل التطبيق إشعاراً يحتوي على صورة الأفاتار واسمه والعالم الذي يتواجد فيه.'
                    : 'Notifies you immediately when a friend launches VRChat or comes online, showing their avatar thumbnail and current world.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-crimson-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-accent">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isAr ? 'كشف إلغاء الصداقة (Unfriended Detection)' : 'Unfriended / Removal Detection'}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  {isAr
                    ? 'يقوم التطبيق بالاحتفاظ بسجل دائم لأصدقائك. إذا قام شخص بحذفك أو إلغاء الصداقة، يتم تسجيل ذلك في سجل النشاط وتنبيهك داخل التطبيق.'
                    : 'Maintains a friendship registry. If a user unfriends or removes you, VRCFX flags it in your 24/7 activity stream.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Edit3 className="w-4 h-4" />
                  <span>{isAr ? 'كشف تغيير الأسماء (Display Name Changes)' : 'Display Name Change Tracking'}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  {isAr
                    ? 'إذا قام صديق بتغيير اسمه في VRChat، يتم حفظ الاسم القديم والجديد وتاريخ التغيير في سجل الأسماء.'
                    : 'Automatically captures past and new usernames with exact timestamps so you always recognize your friends.'}
                </p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'overlay',
        title: isAr ? 'الإشعارات العائمة والصوت المحسن' : 'Floating Overlays & Audio Engine',
        icon: <Bell className="w-4 h-4 text-accent" />,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white">
              {isAr ? 'الإشعارات العائمة فوق الشاشة الكاملة' : 'Floating Overlay Notifications'}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {isAr
                ? 'نافذة شفافة فائقة السرعة تظهر فوق VRChat وأي لعبة بملء الشاشة دون سحب تركيز الفأرة أو الكيبورد، وتعرض صورة الأفاتار ولون الحدث.'
                : 'Dedicated transparent overlay window rendering crystal-clear notifications with real avatar photos without stealing game focus.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                <span className="text-xs font-bold text-white block">
                  {isAr ? 'المواضع الأربعة' : '4 Screen Corners'}
                </span>
                <p className="text-[11px] text-white/50">
                  Bottom-Right (Default), Bottom-Left, Top-Right, Top-Left.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                <span className="text-xs font-bold text-white block">
                  {isAr ? 'محرك الصوت النقي' : 'Zero-Jitter Audio Synthesis'}
                </span>
                <p className="text-[11px] text-white/50">
                  Web Audio API synthesizer with crystal harmonic chimes and smart volume control.
                </p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'worlds_avatars',
        title: isAr ? 'استكشاف العوالم' : 'Explore Worlds',
        icon: <Globe className="w-4 h-4 text-accent" />,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white">
              {isAr ? 'مركز العوالم' : 'Worlds Explorer'}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {isAr
                ? 'تصفح عوالمك المفضلة المحفوظة مقسمة حسب المجموعات، أو استكشف العوالم الشائعة بمحرك بحث سريع.'
                : 'Browse saved worlds by favorite group, or explore trending community worlds with quick search and category filters.'}
            </p>
          </div>
        )
      },
      {
        id: 'radar',
        title: isAr ? 'الرادار وسجلات الغرفة المباشرة' : 'Live Game Radar & Room Logs',
        icon: <Radio className="w-4 h-4 text-accent" />,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white">
              {isAr ? 'الرادار المحلي وقراءة السجلات' : 'Local Room Radar & Log Streaming'}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {isAr
                ? 'يقوم VRCFX بقراءة ملفات سجلات VRChat (output_log) على جهازك فور حدوث أي حدث، مما يتيح له معرفة العالم الحالي، ونوع الغرفة، وقائمة كل من يتواجد معك في نفس الغرفة.'
                : 'VRCFX continuously reads local VRChat output log files to detect the current room, instance type, and every player entering or leaving your room in real-time.'}
            </p>
          </div>
        )
      },
      {
        id: 'cleaner',
        title: isAr ? 'أداة تنظيف الأصدقاء غير النشطين' : 'Inactive Friends Cleaner',
        icon: <Trash2 className="w-4 h-4 text-accent" />,
        content: (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white">
              {isAr ? 'تنظيم وإلغاء صداقة الحسابات المنقطعة' : 'Purging Inactive Friends'}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {isAr
                ? 'تتيح لك أداة التنظيف فرز أصدقائك بحسب آخر ظهور (أكثر من 30 يوماً، 90 يوماً، 180 يوماً، سنة أو أكثر) وتحديدهم للحذف دفعة واحدة بسرعة وأمان.'
                : 'The cleaner tool filters friends by inactivity thresholds (30+ days, 90+ days, 180+ days, or 1+ year) and allows safe bulk removal.'}
            </p>
          </div>
        )
      }
    ]
  }, [currentLang])

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    )
  }, [sections, searchQuery])

  const activeSectionData = sections.find((s) => s.id === selectedSection) || sections[0]

  return (
    <div className="flex-1 flex overflow-hidden bg-app">
      {/* Sidebar List of Manual Chapters */}
      <div className="w-72 md:w-80 border-r border-white/[0.08] bg-[#07070a]/90 backdrop-blur-xl p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-theme">
            <BookOpen className="w-4 h-4 text-accent shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-theme-primary">
                {t.navGuide}
              </h2>
              <span className="text-[10px] text-white/40 font-medium">
                {currentLang === 'ar' ? 'دليل الاستخدام والخصائص' : 'Documentation & Features Guide'}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentLang === 'ar' ? 'ابحث في الدليل...' : 'Search guide...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-crimson-500 transition-all"
            />
          </div>

          {/* Chapters list */}
          <div className="space-y-1.5 pt-1 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredSections.map((sec) => {
              const isSelected = selectedSection === sec.id
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.id)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-xs font-bold text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'tab-pill-active border border-accent'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isSelected ? 'text-white' : 'text-accent'}>
                      {sec.icon}
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-white/30'}`} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Help Footer */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs space-y-1 mt-4">
          <span className="font-bold text-white block text-[11px]">
            {currentLang === 'ar' ? 'تشغيل على مدار 24 ساعة' : 'Always Active 24/7'}
          </span>
          <p className="text-[10px] text-white/40 leading-relaxed">
            {currentLang === 'ar'
              ? 'اترك التطبيق في شريط المهام ليبقى التتبع حياً ومباشراً.'
              : 'Keep VRCFX running in the system tray for real-time tracking.'}
          </p>
        </div>
      </div>

      {/* Main Chapter Content Area */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-page">
          <div className="flex items-center justify-between pb-4 border-b border-theme">
            <h1 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
              <span className="text-accent">{activeSectionData.icon}</span>
              {activeSectionData.title}
            </h1>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab(activeSectionData.id === 'friends' ? 'friends' : activeSectionData.id === 'radar' ? 'radar' : activeSectionData.id === 'worlds_avatars' ? 'worlds' : 'settings')}
                className="btn-gothic-secondary flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
              >
                <span>{currentLang === 'ar' ? 'الانتقال إلى القسم' : 'Go to Feature'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-accent" />
              </button>
            )}
          </div>

          <div className="gothic-panel p-6 md:p-8">
            {activeSectionData.content}
          </div>
        </div>
      </div>
    </div>
  )
}
