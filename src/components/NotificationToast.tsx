import React, { useEffect, useState, useCallback } from 'react'
import {
  UserCheck,
  UserX,
  MapPin,
  X,
  LogIn,
  Star,
  Bell,
  AlertTriangle,
  Edit3
} from 'lucide-react'

export interface AppNotification {
  id: string
  type:
    | 'player_join'
    | 'player_leave'
    | 'friend_online'
    | 'friend_offline'
    | 'world_change'
    | 'unfriended'
    | 'name_change'
    | 'info'
  title: string
  message: string
  displayName?: string
  userId?: string
  isFriend?: boolean
  worldName?: string
  location?: string
  avatarUrl?: string
  timestamp: string
  duration?: number
}

interface NotificationToastContainerProps {
  notifications: AppNotification[]
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onDismiss: (id: string) => void
  onJoin?: (location: string) => void
  onInspectUser?: (displayName: string, userId?: string) => void
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  notifications,
  position = 'bottom-right',
  onDismiss,
  onJoin,
  onInspectUser
}) => {
  if (notifications.length === 0) return null

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'fixed bottom-5 left-5 z-50 flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none'
      case 'top-right':
        return 'fixed top-14 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none'
      case 'top-left':
        return 'fixed top-14 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none'
      case 'bottom-right':
      default:
        return 'fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none'
    }
  }

  const isLeft = position.includes('left')

  return (
    <div className={getPositionClasses()}>
      {notifications.slice(0, 3).map((n) => (
        <NotificationToastItem
          key={n.id}
          notification={n}
          isLeft={isLeft}
          onDismiss={onDismiss}
          onJoin={onJoin}
          onInspectUser={onInspectUser}
        />
      ))}
    </div>
  )
}

const NotificationToastItem: React.FC<{
  notification: AppNotification
  isLeft: boolean
  onDismiss: (id: string) => void
  onJoin?: (location: string) => void
  onInspectUser?: (displayName: string, userId?: string) => void
}> = ({ notification, isLeft, onDismiss, onJoin, onInspectUser }) => {
  const [imgError, setImgError] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const duration = notification.duration || 5500

  const dismissWithAnimation = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => onDismiss(notification.id), 280)
  }, [isExiting, notification.id, onDismiss])

  useEffect(() => {
    const timer = setTimeout(dismissWithAnimation, duration)
    return () => clearTimeout(timer)
  }, [notification.id, duration, dismissWithAnimation])

  const accent = getAccent(notification.type, notification.isFriend)

  const getIcon = () => {
    switch (notification.type) {
      case 'friend_online':
        return <Star className="w-4 h-4 text-emerald-400" />
      case 'player_join':
        return <UserCheck className={`w-4 h-4 ${notification.isFriend ? 'text-emerald-400' : 'text-accent'}`} />
      case 'unfriended':
        return <AlertTriangle className="w-4 h-4 text-accent" />
      case 'name_change':
        return <Edit3 className="w-4 h-4 text-purple-400" />
      case 'player_leave':
      case 'friend_offline':
        return <UserX className="w-4 h-4 text-theme-muted" />
      case 'world_change':
        return <MapPin className="w-4 h-4 text-sky-400" />
      default:
        return <Bell className="w-4 h-4 text-accent" />
    }
  }

  const animationClass = isExiting
    ? isLeft
      ? 'toast-exit-left'
      : 'toast-exit-right'
    : isLeft
    ? 'toast-enter-left'
    : 'toast-enter-right'

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-lg bg-card border border-card flex items-start gap-3 p-3.5 ${animationClass}`}
      style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: accent.color }}
      />

      <div
        className="shrink-0 ml-0.5"
        style={{ boxShadow: accent.ring ? `0 0 0 2px ${accent.ring}` : undefined, borderRadius: 8 }}
      >
        {notification.avatarUrl && !imgError ? (
          <img
            src={notification.avatarUrl}
            alt=""
            onError={() => setImgError(true)}
            className="w-10 h-10 rounded-lg object-cover bg-surface"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-surface border border-card flex items-center justify-center">
            {getIcon()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-theme-primary truncate">
              {notification.title}
            </span>
            <span
              className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded shrink-0"
              style={{ color: accent.badgeText, backgroundColor: accent.badgeBg }}
            >
              {accent.label}
            </span>
          </div>
          <span className="text-[10px] text-theme-muted font-mono tabular-nums shrink-0">
            {notification.timestamp}
          </span>
        </div>

        <p dir="auto" className="text-xs text-theme-secondary mt-0.5 leading-relaxed break-words">
          {notification.message}
        </p>

        {(notification.location || notification.displayName) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-theme">
            {notification.location && onJoin && (
              <button
                onClick={() => onJoin(notification.location!)}
                className="btn-crimson-primary flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium"
              >
                <LogIn className="w-3 h-3" />
                <span>Join</span>
              </button>
            )}

            {notification.displayName && onInspectUser && (
              <button
                onClick={() => onInspectUser(notification.displayName!, notification.userId)}
                className="btn-gothic-secondary flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium"
              >
                <span>Profile</span>
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={dismissWithAnimation}
        className="absolute top-2 right-2 text-theme-muted hover:text-theme-primary p-1 rounded transition-colors cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="absolute left-[3px] right-0 bottom-0 h-[2px] bg-white/[0.06]">
        <div
          className="h-full toast-progress"
          style={{ backgroundColor: accent.color, animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  )
}

function getAccent(type: AppNotification['type'], isFriend?: boolean) {
  switch (type) {
    case 'friend_online':
      return { color: '#10b981', badgeBg: 'rgba(16,185,129,0.14)', badgeText: '#6ee7b7', label: 'Online', ring: 'rgba(16,185,129,0.45)' }
    case 'world_change':
      return { color: '#0ea5e9', badgeBg: 'rgba(14,165,233,0.14)', badgeText: '#7dd3fc', label: 'World', ring: undefined }
    case 'name_change':
      return { color: '#a855f7', badgeBg: 'rgba(168,85,247,0.14)', badgeText: '#d8b4fe', label: 'Renamed', ring: undefined }
    case 'unfriended':
      return { color: '#e11d48', badgeBg: 'rgba(225,29,72,0.16)', badgeText: '#fda4af', label: 'Removed', ring: undefined }
    case 'player_join':
      return isFriend
        ? { color: '#10b981', badgeBg: 'rgba(16,185,129,0.14)', badgeText: '#6ee7b7', label: 'Friend', ring: 'rgba(16,185,129,0.45)' }
        : { color: '#e11d48', badgeBg: 'rgba(225,29,72,0.14)', badgeText: '#fda4af', label: 'Join', ring: undefined }
    default:
      return isFriend
        ? { color: '#10b981', badgeBg: 'rgba(16,185,129,0.14)', badgeText: '#6ee7b7', label: 'Friend', ring: undefined }
        : { color: '#e11d48', badgeBg: 'rgba(225,29,72,0.14)', badgeText: '#fda4af', label: 'Alert', ring: undefined }
  }
}
