import React, { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, User as UserIcon, Globe } from 'lucide-react'
import { VRCUser } from '../types'

interface TitleBarProps {
  currentUser: VRCUser | null
  onOpenProfile: () => void
  onOpenLogin: () => void
  currentWorldName?: string
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentUser,
  onOpenProfile,
  onOpenLogin,
  currentWorldName
}) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [clock, setClock] = useState('')

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized)
    }
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const handleMinimize = () => {
    window.electronAPI?.minimize()
  }

  const handleMaximize = async () => {
    if (window.electronAPI?.maximize) {
      const state = await window.electronAPI.maximize()
      setIsMaximized(state)
    }
  }

  const handleClose = () => {
    window.electronAPI?.close()
  }

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.app-no-drag, button, input, a, img')) return
    if (e.buttons === 1 && (window.electronAPI as any)?.dragWindow) {
      ;(window.electronAPI as any).dragWindow()
    }
  }

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
    <header
      dir="ltr"
      onMouseDown={handleHeaderMouseDown}
      className="h-10 w-full bg-sidebar border-b border-theme flex items-center justify-between px-4 select-none app-drag-region z-50 shrink-0"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 app-no-drag">
        <span className="text-[13px] font-semibold tracking-tight text-theme-primary">
          VRCFX
        </span>
      </div>

      {/* Center status */}
      <div className="hidden md:flex items-center gap-3 text-xs text-theme-secondary">
        <span className="font-mono tabular-nums text-[11px] text-theme-muted">
          {clock}
        </span>

        {currentWorldName && currentWorldName !== 'Waiting for VRChat...' && (
          <>
            <span className="text-theme-muted/40">·</span>
            <div className="flex items-center gap-1.5 max-w-[240px]">
              <Globe className="w-3 h-3 text-theme-muted shrink-0" />
              <span className="truncate text-theme-secondary">{currentWorldName}</span>
            </div>
          </>
        )}

        {currentUser ? (
          <>
            <span className="text-theme-muted/40">·</span>
            <button
              onClick={onOpenProfile}
              className="app-no-drag flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
            >
              {currentUser.currentAvatarThumbnailImageUrl || currentUser.userIcon ? (
                <img
                  src={currentUser.userIcon || currentUser.currentAvatarThumbnailImageUrl}
                  alt=""
                  className="w-4 h-4 rounded object-cover"
                />
              ) : (
                <UserIcon className="w-3.5 h-3.5" />
              )}
              <span dir="auto" className="font-medium text-xs">
                {currentUser.displayName}
              </span>
              {currentUser.hasVRCPlus && (
                <span className="text-[9px] font-semibold uppercase text-amber-500/90 tracking-wide">
                  VRC+
                </span>
              )}
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass(currentUser.status)}`} />
            </button>
          </>
        ) : (
          <>
            <span className="text-theme-muted/40">·</span>
            <button
              onClick={onOpenLogin}
              className="app-no-drag text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      {/* Window controls */}
      <div className="flex items-center app-no-drag">
        <button
          onClick={handleMinimize}
          className="w-9 h-9 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-white/[0.05] transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-9 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-white/[0.05] transition-colors cursor-pointer"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center text-theme-muted hover:text-white hover:bg-crimson-600 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
