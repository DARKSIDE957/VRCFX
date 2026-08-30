import React, { useState, useEffect } from 'react'
import {
  User,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Calendar,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Award,
  Globe,
  Radio,
  Clock,
  Flame,
  MessageSquare
} from 'lucide-react'
import { VRCUser } from '../types'

interface ProfileViewProps {
  currentUser: VRCUser | null
  onUpdateProfile: (updated: VRCUser) => void
}

const STATUS_PRESETS = [
  'In Full-Body VR 🥽',
  'Streaming Live 🔴',
  'Creating Worlds & Avatars 🛠️',
  'Chilling with Friends ☕',
  'AFK / Sleeping 💤',
  'Do Not Disturb 🚫',
  'Dancing & Vibing 🎵'
]

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateProfile }) => {
  const [status, setStatus] = useState<string>(currentUser?.status || 'active')
  const [statusDescription, setStatusDescription] = useState<string>(
    currentUser?.statusDescription || ''
  )
  const [bio, setBio] = useState<string>(currentUser?.bio || '')
  const [bioLinks, setBioLinks] = useState<string[]>(currentUser?.bioLinks || [])
  const [newLink, setNewLink] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser) {
      setStatus(currentUser.status || 'active')
      setStatusDescription(currentUser.statusDescription || '')
      setBio(currentUser.bio || '')
      setBioLinks(currentUser.bioLinks || [])
    }
  }, [currentUser])

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-white/40">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
          <User className="w-8 h-8 text-white/30" />
        </div>
        <p className="text-sm font-bold text-white/80">Not logged in</p>
        <p className="text-xs text-white/40 mt-1">
          Please sign in to view and customize your VRChat profile.
        </p>
      </div>
    )
  }

  const handleAddLink = () => {
    if (newLink.trim() && !bioLinks.includes(newLink.trim())) {
      setBioLinks([...bioLinks, newLink.trim()])
      setNewLink('')
    }
  }

  const handleRemoveLink = (index: number) => {
    setBioLinks(bioLinks.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      if (window.electronAPI?.updateProfile) {
        const res = await window.electronAPI.updateProfile({
          status,
          statusDescription,
          bio,
          bioLinks
        })

        if (res.success && res.user) {
          onUpdateProfile(res.user)
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
        } else {
          setSaveError(res.error || 'Failed to update profile')
        }
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Error updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(id)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const getRankColor = (rank?: string) => {
    switch (rank) {
      case 'admin':
      case 'moderator':
        return 'text-red-400 bg-red-500/20 border-red-500/40'
      case 'trusted':
      case 'veteran':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/40'
      case 'known':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/40'
      case 'user':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
      case 'new_user':
        return 'text-sky-400 bg-sky-500/20 border-sky-500/40'
      default:
        return 'text-neutral-400 bg-neutral-500/20 border-neutral-500/40'
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-app">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Save Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">
              <User className="page-title-icon" />
              <span>My VRChat Profile</span>
            </h1>
            <p className="text-xs text-theme-muted mt-1">
              Real-time profile customization, presence status, past usernames history, and social badges.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-crimson-primary px-5 py-2.5 text-xs font-black flex items-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Status Banners */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-3 animate-fade-in-page shadow-sm">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
            <span>Profile successfully updated and synchronized with official VRChat servers!</span>
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-xl bg-crimson-500/10 border border-crimson-500/30 text-crimson-300 text-xs font-semibold flex items-center gap-3 animate-fade-in-page shadow-sm">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Avatar Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl gothic-panel">
          {/* Blurred backdrop */}
          <div className="absolute inset-0">
            <img
              src={
                currentUser.currentAvatarImageUrl ||
                currentUser.currentAvatarThumbnailImageUrl ||
                currentUser.userIcon ||
                'https://assets.vrchat.com/www/images/default-avatar.png'
              }
              alt=""
              className="w-full h-full object-cover scale-115 opacity-30 blur-2xl"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/70 to-transparent" />
          </div>

          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pt-8 z-10">
            {/* Avatar image */}
            <div className="relative shrink-0">
              <img
                src={
                  currentUser.currentAvatarImageUrl ||
                  currentUser.currentAvatarThumbnailImageUrl ||
                  currentUser.userIcon ||
                  'https://assets.vrchat.com/www/images/default-avatar.png'
                }
                alt="My Avatar"
                className="w-28 h-28 md:w-36 md:h-36 rounded-xl object-cover bg-neutral-900 border border-card"
              />
              {currentUser.hasVRCPlus && (
                <div className="absolute -top-2 -right-2 bg-neutral-950 border border-amber-400/50 text-amber-400 p-1.5 rounded-full shadow-lg">
                  <Sparkles className="w-4 h-4 fill-amber-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-2.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 dir="auto" className="text-2xl md:text-3xl font-black text-white user-name">
                  {currentUser.displayName}
                </h2>
                {currentUser.trustRank && (
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getRankColor(currentUser.trustRank)}`}>
                    {currentUser.trustRank.replace('_', ' ')}
                  </span>
                )}
                {currentUser.hasVRCPlus && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400">
                    <Sparkles className="w-3 h-3 fill-amber-400" /> VRC+
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-white/50 font-mono">
                <span>@{currentUser.username}</span>
                <span>•</span>
                <span className="truncate max-w-xs">{currentUser.id}</span>
                <button
                  onClick={() => copyToClipboard(currentUser.id, 'userId')}
                  className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Copy User ID"
                >
                  {copiedLink === 'userId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Account Quick Stats Grid */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs">
                {currentUser.dateJoined && (
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Joined {new Date(currentUser.dateJoined).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-white/60">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2FA Secured</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Past Display Names Timeline */}
        {currentUser.pastDisplayNames && currentUser.pastDisplayNames.length > 0 && (
          <div className="gothic-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Clock className="w-4 h-4 text-accent" />
                <span>Previous Display Names History</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">
                {currentUser.pastDisplayNames.length} previous names recorded
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {currentUser.pastDisplayNames.map((p, idx) => (
                <div
                  key={idx}
                  dir="auto"
                  className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/50 border border-white/10 text-white/80 text-xs font-semibold shadow-sm"
                >
                  <span className="text-white font-bold">{p.displayName}</span>
                  {p.updatedAt && (
                    <span className="text-[10px] text-white/40 font-mono">
                      ({new Date(p.updatedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Editor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Presence Status & Message */}
          <div className="space-y-4 gothic-panel p-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson-500" />
              <span>Presence Status & Message</span>
            </h3>

            {/* Status Type Picker */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-2.5">
                Online Presence Status
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'join me', label: 'Join Me', dot: 'bg-sky-400' },
                  { id: 'active', label: 'Active', dot: 'bg-emerald-400' },
                  { id: 'ask me', label: 'Ask Me', dot: 'bg-amber-400' },
                  { id: 'busy', label: 'Busy / DnD', dot: 'bg-crimson-500' },
                  { id: 'offline', label: 'Stealth / Off', dot: 'bg-neutral-500' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatus(st.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer ${
                      status === st.id
                        ? 'option-selected ring-1 ring-accent/40'
                        : 'border-white/[0.08] bg-black/30 hover:bg-white/[0.04] text-white/70'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Message */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-2">
                Custom Status Message
              </label>
              <input
                type="text"
                dir="auto"
                value={statusDescription}
                onChange={(e) => setStatusDescription(e.target.value)}
                maxLength={100}
                placeholder="What are you doing in VRChat right now?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              />
              <span className="text-[10px] text-white/40 block text-right mt-1 font-mono">
                {statusDescription.length}/100
              </span>
            </div>

            {/* Quick Status Presets */}
            <div>
              <label className="block text-[11px] font-bold text-white/50 mb-1.5 uppercase tracking-wider">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStatusDescription(preset)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Bio & Social Web Links */}
          <div className="space-y-4 gothic-panel p-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson-500" />
              <span>Biography & Social Web Links</span>
            </h3>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-2">
                About Me (Bio)
              </label>
              <textarea
                dir="auto"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={512}
                placeholder="Tell others about yourself..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 resize-none leading-relaxed transition-all"
              />
              <span className="text-[10px] text-white/40 block text-right mt-1 font-mono">
                {bio.length}/512
              </span>
            </div>

            {/* Links */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-2">
                Social & Web Links ({bioLinks.length}/3)
              </label>
              {bioLinks.length > 0 && (
                <div className="space-y-2 mb-3 max-h-28 overflow-y-auto pr-1">
                  {bioLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-accent font-semibold"
                    >
                      <span className="truncate mr-2 text-[11px] flex items-center gap-1.5">
                        <LinkIcon className="w-3 h-3 text-white/40 shrink-0" />
                        <span>{link}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        className="text-white/40 hover:text-accent p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {bioLinks.length < 3 && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://twitter.com/..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!newLink.trim()}
                    className="btn-gothic-secondary px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-accent" />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VRC+ Supporter Extras & Stickers Showcase */}
        {currentUser.hasVRCPlus && (
          <div className="gothic-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    VRC+ Supporter Perks & Stickers
                  </h3>
                  <span className="text-[10px] text-amber-400/80 font-medium">
                    Active Subscription Tier Perks
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-black uppercase">
                ★ Supporter Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                <span className="text-[11px] font-bold text-white block">Custom User Icon</span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Your custom VRC+ profile picture is enabled and displayed across in-game nameplates and companions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                <span className="text-[11px] font-bold text-white block">Expanded Avatar Favorites</span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Up to 5 avatar favorite lists (250 slots) and custom avatar galleries unlocked.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                <span className="text-[11px] font-bold text-white block">In-Game Chat Stickers</span>
                <div className="flex items-center gap-2 pt-1">
                  {['✨', '🔥', '💖', '👑', '🌸', '⚡', '💎'].map((stk, i) => (
                    <span
                      key={i}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-sm shadow-sm hover:scale-110 transition-transform cursor-default"
                      title="VRC+ Sticker"
                    >
                      {stk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
