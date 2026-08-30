import React, { useEffect, useState } from 'react'
import {
  X,
  User,
  Star,
  History,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Clock,
  Shield,
  Edit3,
  Save,
  Trash2,
  LogIn,
  Activity,
  UserCheck
} from 'lucide-react'
import { VRCUser, PastDisplayName, FriendNote } from '../types'
import { formatArabicName } from '../utils/arabic'

interface PlayerModalProps {
  displayName: string
  userId?: string
  friends: VRCUser[]
  onClose: () => void
  onJoinLocation?: (location: string) => void
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  displayName,
  userId,
  friends,
  onClose,
  onJoinLocation
}) => {
  const [copied, setCopied] = useState<string | null>(null)
  const [nameHistory, setNameHistory] = useState<PastDisplayName[]>([])
  const [userProfile, setUserProfile] = useState<VRCUser | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [friendNote, setFriendNote] = useState<FriendNote | null>(null)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [noteInput, setNoteInput] = useState('')

  // Check if this player is in the user's friend list
  const matchedFriend = React.useMemo(() => {
    return friends.find(
      (f) =>
        (userId && f.id === userId) ||
        f.displayName.toLowerCase() === displayName.toLowerCase()
    )
  }, [friends, displayName, userId])

  const targetUserId = userId || matchedFriend?.id

  // Load Name History & Profile
  useEffect(() => {
    const loadDetails = async () => {
      if (targetUserId && window.electronAPI) {
        // Name history
        try {
          if (window.electronAPI.getNameHistory) {
            const hist = await window.electronAPI.getNameHistory(targetUserId)
            if (hist) setNameHistory(hist)
          }
        } catch (e) {
          console.error(e)
        }

        // Friend note
        try {
          if (window.electronAPI.getFriendNotes) {
            const notes = await window.electronAPI.getFriendNotes()
            if (notes && notes[targetUserId]) {
              setFriendNote(notes[targetUserId])
              setNicknameInput(notes[targetUserId].nickname || '')
              setNoteInput(notes[targetUserId].note || '')
            }
          }
        } catch (e) {
          console.error(e)
        }

        // Fetch web profile if not in friend list
        if (!matchedFriend) {
          setIsLoadingProfile(true)
          try {
            if (window.electronAPI.getUserProfile) {
              const prof = await window.electronAPI.getUserProfile(targetUserId)
              if (prof) setUserProfile(prof)
            }
          } catch (e) {
            console.error(e)
          } finally {
            setIsLoadingProfile(false)
          }
        }
      }
    }
    loadDetails()
  }, [targetUserId, matchedFriend])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSaveNote = async () => {
    if (!targetUserId || !window.electronAPI?.saveFriendNote) return
    const noteData = {
      nickname: nicknameInput.trim() || undefined,
      note: noteInput.trim() || undefined
    }
    await window.electronAPI.saveFriendNote(targetUserId, noteData)
    setFriendNote(noteData.nickname || noteData.note ? { ...noteData } : null)
    setIsEditingNote(false)
  }

  const activeUser = matchedFriend || userProfile
  const avatarUrl =
    activeUser?.currentAvatarThumbnailImageUrl ||
    activeUser?.userIcon ||
    activeUser?.profilePicOverride

  const getTrustBadge = (rank?: string) => {
    const r = (rank || '').toLowerCase()
    if (r.includes('veteran') || r.includes('trusted')) {
      return { label: 'Trusted', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
    }
    if (r.includes('known')) {
      return { label: 'Known', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
    }
    if (r.includes('user')) {
      return { label: 'User', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
    }
    if (r.includes('new')) {
      return { label: 'New User', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' }
    }
    return { label: 'Visitor', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' }
  }

  const trust = getTrustBadge(activeUser?.trustRank)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-page">
      <div className="w-full max-w-sm gothic-panel p-5 shadow-2xl border-white/[0.12] relative flex flex-col max-h-[82vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-white/40 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition-all z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Hero */}
        <div className="flex items-center gap-3.5 pb-3.5 border-b border-white/[0.08] shrink-0 pr-6">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-white/15 shadow-md bg-neutral-900"
              />
            ) : (
              <div className="avatar-fallback w-13 h-13 text-xl font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {matchedFriend && (
              <span
                title="Friend in your friends list"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md border border-[#09090b]"
              >
                <Star className="w-2.5 h-2.5 fill-slate-950" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 dir="auto" className="text-sm font-black text-white truncate user-name">
                {formatArabicName(displayName)}
              </h2>
              {matchedFriend && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black shrink-0">
                  Friend
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full border text-[8.5px] font-black uppercase shrink-0 ${trust.color}`}>
                {trust.label}
              </span>
            </div>

            {targetUserId && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-white/40 font-mono truncate max-w-[170px]">
                  {targetUserId}
                </span>
                <button
                  onClick={() => handleCopy(targetUserId, 'id')}
                  className="text-white/40 hover:text-accent p-0.5 transition-colors cursor-pointer"
                  title="Copy User ID"
                >
                  {copied === 'id' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}

            {matchedFriend?.statusDescription && (
              <p dir="auto" className="text-[11px] text-white/60 truncate mt-0.5 font-medium italic">
                "{matchedFriend.statusDescription}"
              </p>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {/* Live Telemetry & Location Banner */}
          {matchedFriend?.location && matchedFriend.location !== 'offline' && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Current Location</span>
                  <span className="text-xs font-bold text-white truncate block">
                    {matchedFriend.location === 'private' ? 'Private Instance' : 'In Active World'}
                  </span>
                </div>
              </div>
              {matchedFriend.location !== 'private' && onJoinLocation && (
                <button
                  onClick={() => onJoinLocation(matchedFriend.location!)}
                  className="btn-crimson-primary px-3 py-1 text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Join</span>
                </button>
              )}
            </div>
          )}

          {/* Previous Username / Name History */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-accent" />
                Username History
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {nameHistory.length > 0
                  ? `${nameHistory.length} recorded`
                  : 'No changes'}
              </span>
            </div>

            {nameHistory.length > 0 ? (
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {nameHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px]"
                  >
                    <span dir="auto" className="font-semibold text-white/90 truncate">
                      {item.displayName}
                    </span>
                    {item.updatedAt && (
                      <span className="text-[9.5px] text-white/40 font-mono shrink-0 ml-2">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/40 italic">
                First time seen as: <strong className="text-white font-bold">{displayName}</strong>.
              </p>
            )}
          </div>

          {/* Notes & Custom Nickname */}
          {targetUserId && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-accent" />
                  Notes & Nickname
                </span>
                <button
                  onClick={() => setIsEditingNote(!isEditingNote)}
                  className="text-[11px] text-accent hover:text-crimson-300 font-bold cursor-pointer"
                >
                  {isEditingNote ? 'Cancel' : friendNote ? 'Edit' : '+ Add Note'}
                </button>
              </div>

              {isEditingNote ? (
                <div className="space-y-2 mt-1">
                  <input
                    type="text"
                    dir="auto"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="Custom nickname..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                  />
                  <textarea
                    dir="auto"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Private notes about this player..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      className="btn-crimson-primary px-3 py-1 text-xs font-black flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ) : friendNote ? (
                <div className="space-y-1 text-xs">
                  {friendNote.nickname && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40 text-[11px]">Nickname:</span>
                      <span dir="auto" className="font-bold text-accent text-xs">
                        {friendNote.nickname}
                      </span>
                    </div>
                  )}
                  {friendNote.note && (
                    <p dir="auto" className="text-white/80 text-[11px] leading-relaxed pt-0.5 italic">
                      "{friendNote.note}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-white/40 italic">
                  No private note or nickname assigned.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2 shrink-0">
          {targetUserId && (
            <a
              href={`https://vrchat.com/home/user/${targetUserId}`}
              target="_blank"
              rel="noreferrer"
              className="btn-gothic-secondary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
              <span>VRChat Profile</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="btn-crimson-primary px-5 py-2 text-xs font-black cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
