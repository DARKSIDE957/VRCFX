import React, { useState, useMemo } from 'react'
import {
  Trash2,
  Clock,
  CheckSquare,
  Square,
  ShieldAlert,
  Loader2,
  Calendar,
  Sparkles,
  CheckCircle2,
  X,
  Star,
  Heart
} from 'lucide-react'
import { VRCUser } from '../types'

interface CleanerModalProps {
  isOpen: boolean
  onClose: () => void
  friends: VRCUser[]
  onDeleteBulk: (userIds: string[]) => Promise<any>
}

export const CleanerModal: React.FC<CleanerModalProps> = ({
  isOpen,
  onClose,
  friends,
  onDeleteBulk
}) => {
  const [filterThreshold, setFilterThreshold] = useState<'4months' | '6months' | '1year' | 'allOffline'>('4months')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [completionSummary, setCompletionSummary] = useState<{ count: number } | null>(null)

  const now = useMemo(() => new Date().getTime(), [])

  // Calculate inactive duration in days
  const getInactiveDays = (lastLogin?: string) => {
    if (!lastLogin) return 9999
    const diffMs = now - new Date(lastLogin).getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  // Filter friends according to chosen inactivity duration
  const inactiveFriends = useMemo(() => {
    const offlineOnly = friends.filter((f) => f.location === 'offline' || f.status === 'offline')

    return offlineOnly
      .filter((friend) => {
        const days = getInactiveDays(friend.last_login)
        if (filterThreshold === '4months') {
          return days >= 120 // ~4 months
        } else if (filterThreshold === '6months') {
          return days >= 180 // ~6 months
        } else if (filterThreshold === '1year') {
          return days >= 365 // ~1 year
        } else {
          return true // all offline
        }
      })
      .sort((a, b) => getInactiveDays(b.last_login) - getInactiveDays(a.last_login))
  }, [friends, filterThreshold, now])

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const selectAll = () => {
    if (selectedIds.size === inactiveFriends.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(inactiveFriends.map((f) => f.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsProcessing(true)

    try {
      const result = await onDeleteBulk(Array.from(selectedIds))
      const count = result?.deleted?.length || result?.deletedCount || selectedIds.size
      setCompletionSummary({ count })
      setSelectedIds(new Set())
      setShowConfirm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-in-page">
      <div className="w-full max-w-4xl gothic-panel shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border-white/[0.1]">
        {/* Modal Header */}
        <div className="p-6 border-b border-theme flex items-center justify-between bg-sidebar">
          <div>
            <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-accent" />
              Friend Inactivity Cleaner
            </h2>
            <p className="text-xs text-theme-muted mt-0.5">
              Identify and remove long-dormant accounts from your VRChat friend list.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Completion Banner */}
        {completionSummary && (
          <div className="m-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">
                Successfully cleaned up <strong className="text-white font-bold">{completionSummary.count}</strong> inactive friends.
              </span>
            </div>
            <button
              onClick={() => setCompletionSummary(null)}
              className="text-xs font-bold text-emerald-300 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters and Threshold Selector */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 bg-[#07070a]/70">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-white/40 font-bold uppercase tracking-wider flex items-center gap-1.5 mr-2 text-[10px]">
              <Clock className="w-3.5 h-3.5 text-accent" /> Inactivity Threshold:
            </span>
            {[
              { id: '4months', label: '> 4 Months' },
              { id: '6months', label: '> 6 Months' },
              { id: '1year', label: '> 1 Year' },
              { id: 'allOffline', label: 'All Offline' }
            ].map((th) => {
              const isActive = filterThreshold === th.id
              return (
                <button
                  key={th.id}
                  onClick={() => {
                    setFilterThreshold(th.id as any)
                    setSelectedIds(new Set())
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'tab-pill-active border border-accent scale-105'
                      : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                  }`}
                >
                  {th.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="btn-gothic-secondary flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold"
            >
              {selectedIds.size === inactiveFriends.length && inactiveFriends.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Square className="w-4 h-4 text-white/40" />
              )}
              <span>Select All ({inactiveFriends.length})</span>
            </button>
          </div>
        </div>

        {/* List of Inactive Friends */}
        <div className="flex-1 overflow-y-auto p-6">
          {inactiveFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/40 text-center">
              <Calendar className="w-12 h-12 mb-3 text-white/20" />
              <p className="text-base font-bold text-white/80">No inactive friends found</p>
              <p className="text-xs text-white/40 mt-1">
                There are no friends matching your selected inactivity filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {inactiveFriends.map((friend) => {
                const days = getInactiveDays(friend.last_login)
                const isSelected = selectedIds.has(friend.id)

                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelect(friend.id)}
                    className={`gothic-card p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'option-selected ring-1 ring-accent/40'
                        : 'hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="text-white/40">
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-accent" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-white/30" />
                        )}
                      </div>

                      <div className="relative shrink-0">
                        <img
                          src={
                            friend.userIcon ||
                            friend.currentAvatarThumbnailImageUrl ||
                            'https://assets.vrchat.com/www/images/default-avatar.png'
                          }
                          alt="Avatar"
                          className="w-11 h-11 rounded-xl object-cover border border-white/10 bg-neutral-900 shadow-inner"
                        />
                        {friend.isFavorite && (
                          <span
                            title="Favorite / Best Friend"
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border border-[#09090b]"
                          >
                            <Star className="w-2.5 h-2.5 fill-slate-950" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span dir="auto" className="text-xs font-bold text-white/90 truncate">
                            {friend.displayName}
                          </span>
                          {friend.isFavorite && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              <span>Favorite</span>
                            </span>
                          )}
                          {friend.hasVRCPlus && (
                            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400/30 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">
                          @{friend.username}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-mono font-bold text-accent block">
                        {days >= 9000 ? 'Unknown' : `${days}d`}
                      </span>
                      <span className="text-[10px] text-white/40 font-medium">
                        {days >= 365
                          ? `${(days / 365).toFixed(1)}y inactive`
                          : `${Math.floor(days / 30)}mo inactive`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/[0.08] bg-[#07070a]/90 backdrop-blur-xl flex items-center justify-between">
          <div className="text-xs text-white/50 font-medium">
            Selected: <strong className="text-white font-black">{selectedIds.size}</strong> of{' '}
            {inactiveFriends.length} friends
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-gothic-secondary px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={selectedIds.size === 0 || isProcessing}
              className="btn-crimson-primary px-5 py-2 text-xs font-extrabold flex items-center gap-2 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Unfriend Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Safeguard Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in-page">
          <div className="w-full max-w-md gothic-panel border-crimson-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-accent">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-base font-black text-white">Confirm Bulk Unfriend</h3>
                <p className="text-xs text-white/50">This action will remove selected users from your account</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              You are about to permanently unfriend <strong className="text-accent font-black">{selectedIds.size} friends</strong> from your VRChat account.
            </p>

            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs">
              {inactiveFriends
                .filter((f) => selectedIds.has(f.id))
                .map((f) => (
                  <div key={f.id} className="text-xs text-white/80 flex items-center justify-between">
                    <span dir="auto" className="font-sans font-bold">{f.displayName}</span>
                    <span className="text-white/40 text-[10px]">@{f.username}</span>
                  </div>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isProcessing}
                className="btn-gothic-secondary flex-1 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="btn-crimson-primary flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
