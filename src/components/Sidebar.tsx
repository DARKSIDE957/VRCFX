import React, { useState, useEffect } from 'react'
import {
  Users,
  UserX,
  Globe,
  Radio,
  User,
  Settings,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bell,
  BellOff,
  Shirt,
  Download,
  Loader2
} from 'lucide-react'
import { VRCUser } from '../types'
import { TranslationDictionary } from '../i18n'

export type NavTab = 'friends' | 'worlds' | 'avatars' | 'radar' | 'cleaner' | 'profile' | 'settings' | 'guide'

interface SidebarProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onlineCount: number
  totalFriendsCount: number
  currentUser: VRCUser | null
  onRefresh: () => void
  isRefreshing: boolean
  isMuted?: boolean
  onToggleMute?: () => void
  onCheckUpdate?: () => void
  updateBusy?: boolean
  updateLabel?: string
  onLogout: () => void
  t: TranslationDictionary
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onlineCount,
  currentUser,
  onRefresh,
  isRefreshing,
  isMuted = false,
  onToggleMute,
  onCheckUpdate,
  updateBusy = false,
  updateLabel,
  onLogout,
  t
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [tooltip, setTooltip] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', String(collapsed))
    } catch {}
  }, [collapsed])

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'friends',
      label: t.navFriends,
      icon: <Users className="w-4 h-4" />,
      badge: onlineCount > 0 ? `${onlineCount}` : undefined
    },
    { id: 'worlds', label: t.navWorlds, icon: <Globe className="w-4 h-4" /> },
    { id: 'avatars', label: t.navAvatars, icon: <Shirt className="w-4 h-4" /> },
    { id: 'radar', label: t.navRadar, icon: <Radio className="w-4 h-4" /> },
    { id: 'cleaner', label: t.navCleaner, icon: <UserX className="w-4 h-4" /> },
    { id: 'guide', label: t.navGuide, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'profile', label: t.navProfile, icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: t.navSettings, icon: <Settings className="w-4 h-4" /> }
  ]

  const statusDotClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-400'
      case 'join me': return 'bg-sky-400'
      case 'ask me': return 'bg-amber-400'
      case 'busy': return 'bg-crimson-500'
      default: return 'bg-neutral-500'
    }
  }

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-theme bg-sidebar transition-[width] duration-200 select-none shrink-0 z-20 ${
        collapsed ? 'w-[60px]' : 'w-52'
      }`}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-2.5 top-9 z-30 w-5 h-5 rounded bg-card border border-card text-theme-muted hover:text-theme-primary flex items-center justify-center transition-colors cursor-pointer"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className="flex-1 py-3 px-2 overflow-hidden flex flex-col">
        {!collapsed && (
          <div className="section-label px-2.5 pb-2 pt-1">
            {t.navTitle || 'Navigation'}
          </div>
        )}
        <nav className="space-y-0.5 flex-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id
            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => onSelectTab(item.id)}
                  onMouseEnter={() => collapsed && setTooltip(item.label)}
                  onMouseLeave={() => setTooltip(null)}
                  className={`w-full flex items-center rounded-lg text-xs transition-colors duration-150 cursor-pointer ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2 justify-between'
                  } ${
                    isActive
                      ? 'nav-item-active font-medium text-theme-primary'
                      : 'text-theme-muted hover:text-theme-primary hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 ${
                        isActive ? 'text-accent' : 'text-theme-muted'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="text-left truncate">{item.label}</span>
                    )}
                  </div>
                  {!collapsed && item.badge && (
                    <span className="px-1.5 py-px text-[10px] font-medium rounded bg-accent-subtle text-accent tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>

                {collapsed && tooltip === item.label && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-md bg-card border border-card text-xs font-medium text-theme-primary whitespace-nowrap shadow-lg animate-pop-in pointer-events-none flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] text-accent tabular-nums">{item.badge}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      <div className="p-2 border-t border-theme space-y-1">
        {onCheckUpdate && (
          <button
            onClick={onCheckUpdate}
            disabled={updateBusy}
            onMouseEnter={() => collapsed && setTooltip(updateLabel || 'Check for Updates')}
            onMouseLeave={() => setTooltip(null)}
            className={`w-full flex items-center gap-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 ${
              updateBusy
                ? 'text-accent bg-accent-subtle'
                : 'text-theme-muted hover:text-theme-primary hover:bg-white/[0.03]'
            } ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2 justify-center'}`}
            title="Check GitHub for a newer VRCFX release"
          >
            {updateBusy ? (
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0" />
            )}
            {!collapsed && <span>{updateLabel || (updateBusy ? 'Updating…' : 'Update')}</span>}
          </button>
        )}

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            onMouseEnter={() => collapsed && setTooltip(isMuted ? 'Unmute Alerts' : 'Mute Alerts')}
            onMouseLeave={() => setTooltip(null)}
            className={`w-full flex items-center gap-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
              isMuted
                ? 'text-accent bg-accent-subtle'
                : 'text-theme-muted hover:text-theme-primary hover:bg-white/[0.03]'
            } ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2 justify-center'}`}
            title={isMuted ? 'Notifications muted' : 'Mute notifications'}
          >
            {isMuted ? (
              <BellOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            {!collapsed && <span>{isMuted ? 'Muted' : 'Mute'}</span>}
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          onMouseEnter={() => collapsed && setTooltip('Sync with VRChat')}
          onMouseLeave={() => setTooltip(null)}
          className={`w-full flex items-center gap-2 rounded-lg text-xs font-medium text-theme-muted hover:text-theme-primary hover:bg-white/[0.03] transition-colors duration-150 disabled:opacity-40 cursor-pointer ${
            collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2 justify-center'
          }`}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {!collapsed && <span>{isRefreshing ? 'Syncing…' : 'Sync'}</span>}
        </button>

        {currentUser && (
          <div
            className={`flex items-center gap-2.5 p-1.5 rounded-lg ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="relative shrink-0">
              <img
                src={
                  currentUser.userIcon ||
                  currentUser.currentAvatarThumbnailImageUrl ||
                  'https://assets.vrchat.com/www/images/default-avatar.png'
                }
                alt=""
                onClick={() => onSelectTab('profile')}
                className="w-7 h-7 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
              />
              <span
                className={`absolute -bottom-px -right-px w-2 h-2 rounded-full border border-sidebar ${statusDotClass(currentUser.status)}`}
              />
            </div>
            {!collapsed && (
              <>
                <div
                  className="flex flex-col min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectTab('profile')}
                >
                  <span dir="auto" className="text-xs font-medium text-theme-primary truncate user-name">
                    {currentUser.displayName}
                  </span>
                  <span dir="auto" className="text-[10px] text-theme-muted truncate capitalize">
                    {currentUser.statusDescription || currentUser.status}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1 rounded text-theme-muted hover:text-accent transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
