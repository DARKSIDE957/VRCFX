import React, { useState, useMemo, useEffect } from 'react'
import {
  Users,
  Search,
  Sparkles,
  MapPin,
  Clock,
  Trash2,
  ExternalLink,
  User,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
  Edit3,
  Save,
  Tag,
  StickyNote,
  X,
  LogIn,
  Lock,
  Play,
  Star,
  LayoutGrid,
  List,
  Heart,
  Shield,
  Layers
} from 'lucide-react'
import { VRCUser, FriendNote, PastDisplayName } from '../types'
import { formatArabicName } from '../utils/arabic'

interface FriendsViewProps {
  onlineFriends: VRCUser[]
  offlineFriends: VRCUser[]
  onDeleteFriend: (userId: string) => Promise<boolean>
  onOpenCleaner: () => void
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  onlineFriends,
  offlineFriends,
  onDeleteFriend,
  onOpenCleaner
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<
    'all' | 'favorites' | 'group_0' | 'group_1' | 'group_2' | 'group_3' | 'online' | 'in-world' | 'offline'
  >('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'last_login'>('status')
  const [selectedFriend, setSelectedFriend] = useState<VRCUser | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<VRCUser | null>(null)
  const [joiningLocation, setJoiningLocation] = useState<string | null>(null)

  // Friend Notes & Nicknames state
  const [friendNotes, setFriendNotes] = useState<Record<string, FriendNote>>({})
  const [editingNote, setEditingNote] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const handleJoin = async (e: React.MouseEvent, location?: string) => {
    e.stopPropagation()
    if (!location || location === 'offline' || location === 'private') return
    setJoiningLocation(location)
    try {
      if (window.electronAPI?.launchInstance) {
        await window.electronAPI.launchInstance(location)
      }
    } catch (err) {
      console.error('Failed to launch instance:', err)
    } finally {
      setTimeout(() => setJoiningLocation(null), 2500)
    }
  }

  // Load friend notes on mount
  useEffect(() => {
    if (window.electronAPI?.getFriendNotes) {
      window.electronAPI
        .getFriendNotes()
        .then((notes) => {
          if (notes) setFriendNotes(notes)
        })
        .catch(console.error)
    }
  }, [])

  // Sync selected friend notes to editor
  useEffect(() => {
    if (selectedFriend) {
      const note = friendNotes[selectedFriend.id]
      setNicknameInput(note?.nickname || selectedFriend.nickname || '')
      setNoteInput(note?.note || selectedFriend.customNote || '')
      setEditingNote(false)
    }
  }, [selectedFriend, friendNotes])

  const handleSaveNote = async () => {
    if (!selectedFriend || !window.electronAPI?.saveFriendNote) return
    setIsSavingNote(true)
    try {
      const updatedNotes = await window.electronAPI.saveFriendNote(selectedFriend.id, {
        nickname: nicknameInput.trim(),
        note: noteInput.trim()
      })
      if (updatedNotes) {
        setFriendNotes(updatedNotes)
        setSelectedFriend((prev) =>
          prev
            ? {
                ...prev,
                nickname: nicknameInput.trim(),
                customNote: noteInput.trim()
              }
            : null
        )
      }
      setEditingNote(false)
    } catch (e) {
      console.error('Failed to save note:', e)
    } finally {
      setIsSavingNote(false)
    }
  }

  const allFriends = useMemo(() => {
    return [...onlineFriends, ...offlineFriends].map((friend) => {
      const note = friendNotes[friend.id]
      return {
        ...friend,
        nickname: note?.nickname || friend.nickname,
        customNote: note?.note || friend.customNote
      }
    })
  }, [onlineFriends, offlineFriends, friendNotes])

  // Count summaries
  const counts = useMemo(() => {
    const total = allFriends.length
    const favorites = allFriends.filter((f) => f.isFavorite).length
    const online = allFriends.filter((f) => f.location !== 'offline').length
    const inWorld = allFriends.filter(
      (f) => f.location !== 'offline' && f.location !== 'private' && f.location?.startsWith('wrld_')
    ).length
    const offline = allFriends.filter((f) => f.location === 'offline' || f.status === 'offline').length
    const grp0 = allFriends.filter((f) => f.favoriteGroup === 'group_0').length
    const grp1 = allFriends.filter((f) => f.favoriteGroup === 'group_1').length
    const grp2 = allFriends.filter((f) => f.favoriteGroup === 'group_2').length
    const grp3 = allFriends.filter((f) => f.favoriteGroup === 'group_3').length

    return { total, favorites, online, inWorld, offline, grp0, grp1, grp2, grp3 }
  }, [allFriends])

  const filteredFriends = useMemo(() => {
    return allFriends
      .filter((friend) => {
        const pastNamesText = (friend.pastDisplayNames || []).map((p) => p.displayName).join(' ')
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          friend.displayName.toLowerCase().includes(query) ||
          friend.username.toLowerCase().includes(query) ||
          (friend.nickname && friend.nickname.toLowerCase().includes(query)) ||
          pastNamesText.toLowerCase().includes(query) ||
          (friend.location && friend.location.toLowerCase().includes(query))

        if (!matchesSearch) return false

        if (filterTab === 'favorites') {
          return !!friend.isFavorite
        } else if (filterTab === 'group_0') {
          return friend.favoriteGroup === 'group_0'
        } else if (filterTab === 'group_1') {
          return friend.favoriteGroup === 'group_1'
        } else if (filterTab === 'group_2') {
          return friend.favoriteGroup === 'group_2'
        } else if (filterTab === 'group_3') {
          return friend.favoriteGroup === 'group_3'
        } else if (filterTab === 'online') {
          return friend.location !== 'offline'
        } else if (filterTab === 'in-world') {
          return (
            friend.location !== 'offline' &&
            friend.location !== 'private' &&
            friend.location &&
            friend.location.startsWith('wrld_')
          )
        } else if (filterTab === 'offline') {
          return friend.location === 'offline' || friend.status === 'offline'
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          const nameA = a.nickname || a.displayName
          const nameB = b.nickname || b.displayName
          return nameA.localeCompare(nameB)
        } else if (sortBy === 'last_login') {
          const timeA = a.last_login ? new Date(a.last_login).getTime() : 0
          const timeB = b.last_login ? new Date(b.last_login).getTime() : 0
          return timeB - timeA
        } else {
          // Status order: In World > Online > Offline, then favorites first
          const favScoreA = a.isFavorite ? 10 : 0
          const favScoreB = b.isFavorite ? 10 : 0
          const isOnlineA = a.location !== 'offline' ? 5 : 0
          const isOnlineB = b.location !== 'offline' ? 5 : 0
          return isOnlineB + favScoreB - (isOnlineA + favScoreA)
        }
      })
  }, [allFriends, searchQuery, filterTab, sortBy])

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 30) return `${diffDays}d ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${(diffDays / 365).toFixed(1)}y ago`
  }

  const handleDelete = async (user: VRCUser) => {
    setIsDeletingId(user.id)
    const success = await onDeleteFriend(user.id)
    setIsDeletingId(null)
    setConfirmDeleteUser(null)
    if (selectedFriend?.id === user.id) {
      setSelectedFriend(null)
    }
  }

  const getStatusColor = (status: string, location?: string) => {
    if (location === 'offline' || status === 'offline') return 'bg-neutral-500'
    if (status === 'join me') return 'bg-sky-400'
    if (status === 'active') return 'bg-emerald-400'
    if (status === 'ask me') return 'bg-amber-400'
    if (status === 'busy') return 'bg-crimson-500'
    return 'bg-neutral-500'
  }

  const getTrustBadge = (rank?: string) => {
    switch (rank) {
      case 'admin':
        return { label: 'Admin', color: 'bg-crimson-500/15 text-crimson-300 border-crimson-500/30' }
      case 'trusted':
        return { label: 'Trusted', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
      case 'known':
        return { label: 'Known', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
      case 'user':
        return { label: 'User', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      case 'new_user':
        return { label: 'New User', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' }
      default:
        return { label: 'Visitor', color: 'bg-white/[0.04] text-white/50 border-white/[0.08]' }
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-app">
      {/* Main Friends Column with generous spacing */}
      <div className="flex-1 flex flex-col min-w-0 p-8 overflow-hidden">
        {/* Header with Title & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="page-title">
                <Users className="page-title-icon" />
                Friends
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-card border border-card text-theme-muted font-mono tabular-nums">
                {filteredFriends.length} / {allFriends.length}
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
              Real-time locations, favorite groups, nickname notes, and past display names.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-card border border-card">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-accent text-white'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-accent text-white'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Inactivity cleaner button */}
            <button
              onClick={onOpenCleaner}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-card text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors duration-150 cursor-pointer"
              title="Clean Inactive Friends"
            >
              <Trash2 className="w-4 h-4 text-accent" />
              <span>Inactive Cleaner</span>
            </button>
          </div>
        </div>

        {/* Favorite Groups & Filter Tabs Bar */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 shrink-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Friends', count: counts.total },
            { id: 'favorites', label: '★ Favorites', count: counts.favorites },
            ...(counts.grp0 > 0 ? [{ id: 'group_0', label: 'Group 1', count: counts.grp0 }] : []),
            ...(counts.grp1 > 0 ? [{ id: 'group_1', label: 'Group 2', count: counts.grp1 }] : []),
            ...(counts.grp2 > 0 ? [{ id: 'group_2', label: 'Group 3', count: counts.grp2 }] : []),
            ...(counts.grp3 > 0 ? [{ id: 'group_3', label: 'Group 4', count: counts.grp3 }] : []),
            { id: 'online', label: 'Online', count: counts.online },
            { id: 'in-world', label: 'In World', count: counts.inWorld },
            { id: 'offline', label: 'Offline', count: counts.offline }
          ].map((tab) => {
            const isActive = filterTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-card text-theme-muted border border-card hover:text-theme-primary hover:bg-card-hover'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-px rounded font-mono tabular-nums ${
                    isActive
                      ? 'bg-black/20 text-white/90'
                      : 'text-theme-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search & Sort Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-3.5 mb-6 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by display name, past username, nickname, or world..."
              className="w-full pl-9 pr-4 py-2 rounded-lg app-input text-xs"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg app-input text-xs shrink-0 cursor-pointer"
          >
            <option value="status" className="bg-[#121217] text-white">Sort: Status & Favorites</option>
            <option value="name" className="bg-[#121217] text-white">Sort: Display Name (A-Z)</option>
            <option value="last_login" className="bg-[#121217] text-white">Sort: Last Seen</option>
          </select>
        </div>

        {/* Friends Cards Container */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-white/40 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4 text-white/30">
                <User className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white/80">No matching friends found</p>
              <p className="text-xs text-white/40 mt-1 max-w-sm">
                Try adjusting your search query or selecting a different favorite filter tab.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {filteredFriends.map((friend) => {
                const isOnline = friend.location !== 'offline' && friend.status !== 'offline'
                const trust = getTrustBadge(friend.trustRank)
                const avatar =
                  friend.currentAvatarThumbnailImageUrl ||
                  friend.userIcon ||
                  friend.profilePicOverride
                const hasPastNames =
                  friend.pastDisplayNames && friend.pastDisplayNames.length > 0
                const isSelected = selectedFriend?.id === friend.id

                return (
                  <div
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className={`gothic-card p-4 flex flex-col justify-between group cursor-pointer transition-all ${
                      isSelected
                        ? 'option-selected ring-1 ring-accent/50'
                        : ''
                    }`}
                  >
                    {/* Top Row: Avatar & Info */}
                    <div className="flex items-start gap-3.5">
                      {/* Avatar with Status Dot & Fav Star */}
                      <div className="relative shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md group-hover:border-crimson-500/40 transition-colors"
                          />
                        ) : (
                          <div className="avatar-fallback w-12 h-12 text-base font-medium">
                            {friend.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Status Indicator */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#09090b] ${getStatusColor(
                            friend.status,
                            friend.location
                          )}`}
                          title={`Status: ${friend.status}`}
                        />

                        {/* Favorite Star Badge */}
                        {friend.isFavorite && (
                          <span
                            title="Favorite Friend"
                            className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border-2 border-sidebar"
                          >
                            <Star className="w-2.5 h-2.5 fill-slate-950" />
                          </span>
                        )}
                      </div>

                      {/* Name & Metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            dir="auto"
                            className="font-bold text-xs text-white/95 group-hover:text-accent transition-colors truncate user-name"
                            title={friend.displayName}
                          >
                            {formatArabicName(friend.nickname ? friend.nickname : friend.displayName)}
                          </span>
                          {friend.nickname && (
                            <span
                              dir="auto"
                              className="text-[10px] text-white/40 font-mono truncate user-name"
                              title={`Original: ${friend.displayName}`}
                            >
                              ({formatArabicName(friend.displayName)})
                            </span>
                          )}
                          {friend.hasVRCPlus && (
                            <span title="VRChat Plus Supporter" className="shrink-0 text-amber-400">
                              <Sparkles className="w-3 h-3 fill-amber-400/30" />
                            </span>
                          )}
                        </div>

                        {/* Status Message */}
                        <p
                          dir="auto"
                          className="text-[11px] text-white/50 truncate capitalize mt-0.5 font-medium"
                        >
                          {friend.statusDescription || friend.status}
                        </p>

                        {/* Trust Rank & Past Names Badges */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${trust.color}`}
                          >
                            {trust.label}
                          </span>

                          {hasPastNames && (
                            <span
                              className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              title={`Formerly: ${friend.pastDisplayNames!.map((p) => p.displayName).join(', ')}`}
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>{friend.pastDisplayNames!.length} Past</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Location or Last Seen */}
                    <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-[11px] text-white/50 gap-2">
                      {isOnline ? (
                        <div className="flex items-center gap-1.5 text-accent font-semibold truncate min-w-0 flex-1">
                          {friend.location === 'private' ? (
                            <>
                              <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span className="truncate text-amber-300/90 text-[10px]">Private World</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-crimson-500" />
                              <span dir="auto" className="truncate text-white/80">
                                {friend.location?.startsWith('wrld_')
                                  ? 'In World'
                                  : friend.location || 'Online'}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-white/40 truncate min-w-0 flex-1">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Last seen: {formatLastSeen(friend.last_login)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOnline && friend.location && friend.location !== 'offline' && friend.location !== 'private' && (
                          <button
                            onClick={(e) => handleJoin(e, friend.location)}
                            className="btn-crimson-primary flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
                            title={`Join ${friend.displayName} in VRChat`}
                          >
                            <LogIn className="w-3 h-3" />
                            <span>{joiningLocation === friend.location ? 'Joining...' : 'Join'}</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteUser(friend)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-white/40 hover:text-accent hover:bg-crimson-500/10 rounded-lg transition-all duration-150 cursor-pointer"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Compact List View */
            <div className="space-y-2 pb-8">
              {filteredFriends.map((friend) => {
                const isOnline = friend.location !== 'offline' && friend.status !== 'offline'
                const trust = getTrustBadge(friend.trustRank)
                const avatar =
                  friend.currentAvatarThumbnailImageUrl ||
                  friend.userIcon ||
                  friend.profilePicOverride
                const isSelected = selectedFriend?.id === friend.id

                return (
                  <div
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className={`gothic-card p-3.5 flex items-center justify-between gap-4 group cursor-pointer transition-all ${
                      isSelected
                        ? 'option-selected ring-1 ring-accent/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-sm"
                          />
                        ) : (
                          <div className="avatar-fallback w-10 h-10 text-sm font-medium">
                            {friend.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#09090b] ${getStatusColor(
                            friend.status,
                            friend.location
                          )}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span dir="auto" className="font-bold text-xs text-white/95 group-hover:text-accent transition-colors truncate user-name">
                            {formatArabicName(friend.nickname ? friend.nickname : friend.displayName)}
                          </span>
                          {friend.isFavorite && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${trust.color}`}
                          >
                            {trust.label}
                          </span>
                        </div>
                        <p dir="auto" className="text-[11px] text-white/50 truncate font-medium">
                          {friend.statusDescription || friend.status}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {isOnline ? (
                        <span className="text-xs text-accent font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {friend.location === 'private'
                            ? 'Private World'
                            : friend.location?.startsWith('wrld_')
                            ? 'In World'
                            : 'Online'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/40">
                          {formatLastSeen(friend.last_login)}
                        </span>
                      )}

                      {isOnline && friend.location && friend.location !== 'offline' && friend.location !== 'private' && (
                        <button
                          onClick={(e) => handleJoin(e, friend.location)}
                          className="btn-crimson-primary flex items-center gap-1.5 px-3 py-1 font-bold text-[10px] cursor-pointer"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Join</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer: Friend Detailed Profile */}
      {selectedFriend && (
        <aside className="w-76 md:w-80 bg-sidebar border-l border-theme p-4 flex flex-col justify-between overflow-y-auto animate-slide-in-right shrink-0 z-20">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <span className="section-label">
                Profile
              </span>
              <button
                onClick={() => setSelectedFriend(null)}
                className="text-theme-muted hover:text-theme-primary text-xs px-2 py-1 rounded-md hover:bg-white/[0.05] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {/* Avatar & Hero */}
            <div className="text-center pb-3">
              <div className="relative inline-block mx-auto mb-3">
                {selectedFriend.currentAvatarImageUrl ||
                selectedFriend.currentAvatarThumbnailImageUrl ||
                selectedFriend.userIcon ? (
                  <img
                    src={
                      selectedFriend.currentAvatarImageUrl ||
                      selectedFriend.currentAvatarThumbnailImageUrl ||
                      selectedFriend.userIcon
                    }
                    alt={selectedFriend.displayName}
                    className="w-22 h-22 rounded-xl object-cover border border-card mx-auto"
                  />
                ) : (
                  <div className="w-22 h-22 rounded-xl bg-card border border-card flex items-center justify-center text-accent text-2xl font-semibold mx-auto">
                    {selectedFriend.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full border-2 border-[#07070a] ${getStatusColor(
                    selectedFriend.status,
                    selectedFriend.location
                  )}`}
                />
              </div>

              <h2 dir="auto" className="text-base font-semibold text-theme-primary truncate user-name">
                {formatArabicName(selectedFriend.displayName)}
              </h2>
              {selectedFriend.nickname && (
                <p dir="auto" className="text-xs text-accent font-bold mt-0.5 user-name">
                  Nickname: {formatArabicName(selectedFriend.nickname)}
                </p>
              )}

              <div className="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
                <span
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${
                    getTrustBadge(selectedFriend.trustRank).color
                  }`}
                >
                  {getTrustBadge(selectedFriend.trustRank).label}
                </span>
                {selectedFriend.isFavorite && (
                  <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-amber-300" />
                    <span>Favorite</span>
                  </span>
                )}
                {selectedFriend.hasVRCPlus && (
                  <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider bg-amber-500/20 text-amber-300 border-amber-500/30">
                    VRC+
                  </span>
                )}
              </div>
            </div>

            {/* Custom Notes & Nickname Card */}
            <div className="gothic-panel p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-accent" />
                  <span>Notes & Nickname</span>
                </span>
                <button
                  onClick={() => setEditingNote(!editingNote)}
                  className="text-[11px] text-accent hover:text-crimson-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{editingNote ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>

              {editingNote ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[10px] text-white/50 font-semibold block mb-1">Custom Nickname</label>
                    <input
                      type="text"
                      dir="auto"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      placeholder="e.g. Best Friend, Streamer..."
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/50 font-semibold block mb-1">Private Note</label>
                    <textarea
                      dir="auto"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Write notes about this friend..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                    className="btn-crimson-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingNote ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedFriend.customNote ? (
                    <p dir="auto" className="text-white/80 text-xs leading-relaxed italic bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
                      "{selectedFriend.customNote}"
                    </p>
                  ) : (
                    <p className="text-white/35 text-[11px] italic">No private note added yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Past Username History Card */}
            {selectedFriend.pastDisplayNames && selectedFriend.pastDisplayNames.length > 0 && (
              <div className="gothic-panel p-3.5 text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>Previous Usernames ({selectedFriend.pastDisplayNames.length})</span>
                </span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {selectedFriend.pastDisplayNames.map((past, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/[0.06]"
                    >
                      <span dir="auto" className="font-semibold text-white/90">
                        {past.displayName}
                      </span>
                      {past.updatedAt && (
                        <span className="text-[10px] text-white/40 font-mono">
                          {new Date(past.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {selectedFriend.bio && (
              <div className="gothic-panel p-3.5 text-xs">
                <span className="text-[10px] font-bold uppercase text-white/40 block mb-1.5">Bio</span>
                <p dir="auto" className="text-white/70 leading-relaxed max-h-24 overflow-y-auto font-medium">
                  {selectedFriend.bio}
                </p>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <span className="text-[9px] text-white/40 font-semibold uppercase block">Status</span>
                <span className="font-bold text-white capitalize text-xs mt-0.5 block">
                  {selectedFriend.status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <span className="text-[9px] text-white/40 font-semibold uppercase block">Platform</span>
                <span className="font-bold text-white capitalize text-xs mt-0.5 block">
                  {selectedFriend.last_platform || 'PC VR'}
                </span>
              </div>
            </div>

            {/* Social Links */}
            {selectedFriend.bioLinks && selectedFriend.bioLinks.length > 0 && (
              <div className="gothic-panel p-3 text-xs">
                <span className="text-[9px] font-bold uppercase text-white/40 block mb-1.5">
                  Social Links
                </span>
                <div className="space-y-1.5">
                  {selectedFriend.bioLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-accent hover:text-crimson-300 hover:underline truncate text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-white/[0.08] mt-4 space-y-2.5">
            {selectedFriend.location && selectedFriend.location !== 'offline' && selectedFriend.location !== 'private' && (
              <button
                onClick={(e) => handleJoin(e, selectedFriend.location)}
                className="btn-crimson-primary w-full py-3 text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {joiningLocation === selectedFriend.location
                    ? 'Opening VRChat...'
                    : 'Join Friend in VRChat'}
                </span>
              </button>
            )}

            <a
              href={`https://vrchat.com/home/user/${selectedFriend.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-gothic-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
              <span>VRChat Web Profile</span>
            </a>
            <button
              onClick={() => setConfirmDeleteUser(selectedFriend)}
              className="w-full py-2.5 rounded-xl bg-crimson-900/20 hover:bg-crimson-900/40 text-accent hover:text-white border border-crimson-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unfriend User</span>
            </button>
          </div>
        </aside>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-page">
          <div className="w-full max-w-sm gothic-panel p-6 shadow-2xl border-crimson-500/40">
            <div className="flex items-center gap-3 text-accent mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Unfriend Confirmation</h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-5">
              Are you sure you want to remove{' '}
              <strong dir="auto" className="text-white font-bold">
                {confirmDeleteUser.displayName}
              </strong>{' '}
              from your VRChat friends list?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="btn-gothic-secondary flex-1 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteUser)}
                disabled={isDeletingId === confirmDeleteUser.id}
                className="btn-crimson-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingId === confirmDeleteUser.id ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
