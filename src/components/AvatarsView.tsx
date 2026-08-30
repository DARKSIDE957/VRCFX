import React, { useState, useEffect, useMemo } from 'react'
import {
  Shirt,
  Star,
  Search,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Tag,
  Layers,
  Cpu,
  Smartphone,
  ShieldCheck,
  Lock,
  Unlock,
  Globe,
  SlidersHorizontal,
  Zap,
  Info,
  Crown,
  AlertTriangle,
  FolderHeart,
  Eye,
  X,
  ArrowRightLeft,
  Trash2,
  Plus,
  BookmarkPlus,
  FolderInput
} from 'lucide-react'
import { VRCAvatar, VRCUser } from '../types'
import { TranslationDictionary } from '../i18n'

interface AvatarsViewProps {
  currentUser: VRCUser | null
  t: TranslationDictionary
  onInspectUser?: (user: { displayName: string; userId?: string }) => void
  onNotify?: (title: string, message: string, type?: any) => void
  onUpdateCurrentUser?: (user: VRCUser) => void
}

type AvatarTab = 'favorites' | 'uploaded' | 'search'
type ReleaseFilter = 'all' | 'public' | 'private'

import {
  AVATAR_FAVORITE_LISTS,
  FREE_AVATAR_SLOTS,
  TOTAL_AVATAR_LISTS,
  TOTAL_AVATAR_SLOTS_WITH_VRC_PLUS,
  getAvatarListDisplayName,
  isVrcPlusAvatarList
} from '../constants/avatarFavorites'

export const AvatarsView: React.FC<AvatarsViewProps> = ({
  currentUser,
  t,
  onInspectUser,
  onNotify,
  onUpdateCurrentUser
}) => {
  const [activeTab, setActiveTab] = useState<AvatarTab>('favorites')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [releaseFilter, setReleaseFilter] = useState<ReleaseFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<'all' | 'pc' | 'quest'>('all')

  const [uploadedAvatars, setUploadedAvatars] = useState<VRCAvatar[]>([])
  const [favoriteAvatars, setFavoriteAvatars] = useState<VRCAvatar[]>([])
  const [searchResults, setSearchResults] = useState<VRCAvatar[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const [switchingAvatarId, setSwitchingAvatarId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<VRCAvatar | null>(null)

  // Moving / Favoriting Modal State
  const [moveModalAvatar, setMoveModalAvatar] = useState<VRCAvatar | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [unfavoritingId, setUnfavoritingId] = useState<string | null>(null)

  const [equippedAvatarName, setEquippedAvatarName] = useState<string | null>(null)

  const equippedAvatarId = currentUser?.currentAvatarId
  const equippedAvatarFromLists = useMemo(() => {
    if (!equippedAvatarId) return null
    return (
      favoriteAvatars.find((a) => a.id === equippedAvatarId) ||
      uploadedAvatars.find((a) => a.id === equippedAvatarId) ||
      searchResults.find((a) => a.id === equippedAvatarId) ||
      null
    )
  }, [equippedAvatarId, favoriteAvatars, uploadedAvatars, searchResults])

  const equippedThumbnailUrl =
    currentUser?.currentAvatarThumbnailImageUrl ||
    equippedAvatarFromLists?.thumbnailImageUrl ||
    currentUser?.currentAvatarImageUrl

  const equippedDisplayName =
    equippedAvatarName || equippedAvatarFromLists?.name || 'Unknown avatar'

  const hasVrcPlus = !!(
    currentUser?.hasVRCPlus ||
    currentUser?.tags?.includes('system_supporter')
  )

  // Fetch avatars from backend
  const fetchAvatars = async () => {
    if (!window.electronAPI) return
    setIsLoading(true)
    try {
      const [myAvatars, favAvatars] = await Promise.all([
        window.electronAPI.getMyAvatars ? window.electronAPI.getMyAvatars('all') : Promise.resolve([]),
        window.electronAPI.getFavoriteAvatars ? window.electronAPI.getFavoriteAvatars() : Promise.resolve([])
      ])
      setUploadedAvatars(myAvatars || [])
      setFavoriteAvatars(favAvatars || [])
    } catch (err) {
      console.error('Failed to load avatars:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAvatars()
  }, [])

  // Live avatar search — empty query loads featured / favorites browse set
  useEffect(() => {
    if (activeTab !== 'search') return

    const timer = setTimeout(async () => {
      if (!window.electronAPI?.searchAvatars) return
      setIsSearching(true)
      try {
        const res = await window.electronAPI.searchAvatars({
          query: searchQuery.trim(),
          n: 60
        })
        setSearchResults(Array.isArray(res) ? res : [])
      } catch (err) {
        console.error('Avatar search error:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, searchQuery.trim() ? 350 : 0)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab])

  // Switch / Wear Avatar
  const handleWearAvatar = async (avatar: VRCAvatar) => {
    if (avatar.id?.startsWith('wrld_') || avatar.tags?.includes('avatar_world_hub')) {
      onNotify?.(
        'Avatar World Hub',
        `"${avatar.name}" is a world, not a wearable avatar. Open it from the Worlds tab to visit the hub.`,
        'unfriended'
      )
      return
    }

    if (!avatar.id?.startsWith('avtr_')) {
      onNotify?.('Cannot Equip', 'This item is not a valid VRChat avatar.', 'unfriended')
      return
    }

    if (avatar.isVrcPlusLocked) {
      onNotify?.(
        'VRC+ Required',
        `"${avatar.name}" is stored in a VRC+ slot. Click "Move to Standard List" to make it usable without VRC+!`,
        'unfriended'
      )
      return
    }

    if (!window.electronAPI?.selectAvatar) return
    setSwitchingAvatarId(avatar.id)
    try {
      const res = await window.electronAPI.selectAvatar(avatar.id)
      if (res?.success) {
        setEquippedAvatarName(avatar.name)
        if (res.user) {
          onUpdateCurrentUser?.(res.user)
        } else if (currentUser) {
          onUpdateCurrentUser?.({
            ...currentUser,
            currentAvatarId: avatar.id,
            currentAvatarThumbnailImageUrl:
              avatar.thumbnailImageUrl || currentUser.currentAvatarThumbnailImageUrl,
            currentAvatarImageUrl: avatar.imageUrl || currentUser.currentAvatarImageUrl
          })
        }
        onNotify?.(
          'Avatar Changed',
          `Equipped "${avatar.name}". If VRChat is open, the change applies on the next avatar sync / instance change.`,
          'online'
        )
      } else {
        onNotify?.('Avatar Switch Failed', res?.error || 'Could not select avatar', 'unfriended')
      }
    } catch (err: any) {
      onNotify?.('Avatar Switch Failed', err?.message || 'Network error', 'unfriended')
    } finally {
      setSwitchingAvatarId(null)
    }
  }

  // Remove from Favorites (Unfavorite)
  const handleRemoveFavorite = async (avatar: VRCAvatar, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!avatar.favoriteId || !window.electronAPI?.removeFavoriteAvatar) return
    setUnfavoritingId(avatar.id)
    try {
      const res = await window.electronAPI.removeFavoriteAvatar(avatar.favoriteId)
      if (res.success) {
        setFavoriteAvatars((prev) => prev.filter((a) => a.id !== avatar.id))
        if (selectedAvatar?.id === avatar.id) {
          setSelectedAvatar(null)
        }
        onNotify?.('Removed from Favorites', `"${avatar.name}" removed from your favorites.`, 'default')
      } else {
        onNotify?.('Error', res.error || 'Failed to remove from favorites', 'unfriended')
      }
    } catch (err: any) {
      onNotify?.('Error', err?.message || 'Network error', 'unfriended')
    } finally {
      setUnfavoritingId(null)
    }
  }

  // Move or Add Avatar to Target Favorite List
  const handleMoveOrAddToList = async (targetTag: string) => {
    if (!moveModalAvatar || !window.electronAPI) return
    setIsMoving(true)
    try {
      const isExistingFavorite = !!moveModalAvatar.isFavorite && !!moveModalAvatar.favoriteId

      if (isExistingFavorite && window.electronAPI.moveFavoriteAvatar) {
        // Move existing favorite to new group
        const res = await window.electronAPI.moveFavoriteAvatar(
          moveModalAvatar.id,
          moveModalAvatar.favoriteId!,
          targetTag
        )
        if (res.success) {
          const targetListName = getAvatarListDisplayName(targetTag)
          const isTargetVrcPlus = isVrcPlusAvatarList(targetTag)
          const isLockedNow = isTargetVrcPlus && !hasVrcPlus

          setFavoriteAvatars((prev) =>
            prev.map((a) => {
              if (a.id === moveModalAvatar.id) {
                return {
                  ...a,
                  favoriteGroup: targetTag,
                  favoriteGroupName: targetListName,
                  favoriteId: res.newFavoriteId || a.favoriteId,
                  isVrcPlusGroup: isTargetVrcPlus,
                  isVrcPlusLocked: isLockedNow
                }
              }
              return a
            })
          )

          onNotify?.(
            'Avatar Moved',
            `Moved "${moveModalAvatar.name}" to ${targetListName}${isLockedNow ? ' (VRC+ Locked)' : ' (Ready to Wear)'}.`,
            'online'
          )
          setMoveModalAvatar(null)
          if (selectedAvatar?.id === moveModalAvatar.id) {
            setSelectedAvatar((prev) =>
              prev
                ? {
                    ...prev,
                    favoriteGroup: targetTag,
                    favoriteGroupName: targetListName,
                    isVrcPlusGroup: isTargetVrcPlus,
                    isVrcPlusLocked: isLockedNow
                  }
                : null
            )
          }
        } else {
          onNotify?.('Move Failed', res.error || 'Could not move avatar to list', 'unfriended')
        }
      } else if (window.electronAPI.addFavoriteAvatar) {
        // Add new favorite to group
        const res = await window.electronAPI.addFavoriteAvatar(moveModalAvatar.id, targetTag)
        if (res.success) {
          const targetListName = getAvatarListDisplayName(targetTag)
          const isTargetVrcPlus = isVrcPlusAvatarList(targetTag)
          const isLockedNow = isTargetVrcPlus && !hasVrcPlus

          const newFavItem: VRCAvatar = {
            ...moveModalAvatar,
            isFavorite: true,
            favoriteGroup: targetTag,
            favoriteGroupName: targetListName,
            favoriteId: res.favoriteId,
            isVrcPlusGroup: isTargetVrcPlus,
            isVrcPlusLocked: isLockedNow
          }

          setFavoriteAvatars((prev) => [newFavItem, ...prev])
          onNotify?.('Added to Favorites', `Added "${moveModalAvatar.name}" to ${targetListName}.`, 'online')
          setMoveModalAvatar(null)
        } else {
          onNotify?.('Favorite Failed', res.error || 'Could not add to favorites', 'unfriended')
        }
      }
    } catch (err: any) {
      onNotify?.('Action Failed', err?.message || 'Network error', 'unfriended')
    } finally {
      setIsMoving(false)
    }
  }

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    onNotify?.('Copied to Clipboard', `Avatar ID ${id} copied.`, 'default')
  }

  // Calculate favorite list groups
  const favoriteGroups = useMemo(() => {
    const counts = new Map<string, number>()
    favoriteAvatars.forEach((a) => {
      const key = a.favoriteGroup || 'avatars1'
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    const groups = AVATAR_FAVORITE_LISTS.map((list) => ({
      groupKey: list.tag,
      name: list.name,
      count: counts.get(list.tag) || 0,
      isVrcPlus: list.isVrcPlus
    }))

    // Legacy/extra API lists (e.g. avatars6) still appear if the account uses them
    counts.forEach((count, key) => {
      if (!AVATAR_FAVORITE_LISTS.some((list) => list.tag === key)) {
        const sample = favoriteAvatars.find((a) => (a.favoriteGroup || 'avatars1') === key)
        groups.push({
          groupKey: key,
          name: getAvatarListDisplayName(key, sample?.favoriteGroupName),
          count,
          isVrcPlus: isVrcPlusAvatarList(key)
        })
      }
    })

    return groups.sort((a, b) => a.groupKey.localeCompare(b.groupKey))
  }, [favoriteAvatars])

  // Count locked favorites
  const lockedFavorites = useMemo(() => {
    return favoriteAvatars.filter((a) => a.isVrcPlusLocked)
  }, [favoriteAvatars])

  // Filtered avatar lists
  const currentList = useMemo(() => {
    let list: VRCAvatar[] = []
    if (activeTab === 'uploaded') list = uploadedAvatars
    else if (activeTab === 'favorites') list = favoriteAvatars
    else list = searchResults

    return list.filter((a) => {
      // Group Filter (Favorites Only)
      if (activeTab === 'favorites' && selectedGroup !== 'all') {
        if ((a.favoriteGroup || 'avatars1') !== selectedGroup) return false
      }

      // Search Query
      const matchesSearch =
        activeTab === 'search'
          ? true
          : !searchQuery.trim() ||
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.favoriteGroupName && a.favoriteGroupName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.tags && a.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))

      // Release Status (Uploaded Tab)
      const matchesRelease =
        releaseFilter === 'all' ||
        (releaseFilter === 'public' && a.releaseStatus === 'public') ||
        (releaseFilter === 'private' && (a.releaseStatus === 'private' || a.releaseStatus === 'hidden'))

      // Platform Support
      const hasPc = a.unityPackages?.some(
        (p) =>
          p.platform?.toLowerCase().includes('standalonewindows') ||
          p.platform?.toLowerCase().includes('pc')
      )
      const hasQuest = a.unityPackages?.some(
        (p) =>
          p.platform?.toLowerCase().includes('android') ||
          p.platform?.toLowerCase().includes('quest')
      )

      const matchesPlatform =
        platformFilter === 'all' ||
        (platformFilter === 'pc' && hasPc) ||
        (platformFilter === 'quest' && hasQuest)

      return matchesSearch && matchesRelease && matchesPlatform
    })
  }, [
    activeTab,
    uploadedAvatars,
    favoriteAvatars,
    searchResults,
    selectedGroup,
    searchQuery,
    releaseFilter,
    platformFilter
  ])

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden select-none">
      {/* Header Bar */}
      <div className="px-6 py-5 border-b border-theme bg-sidebar shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title">
              <Shirt className="page-title-icon" />
              Avatars
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-card border border-card text-theme-muted tabular-nums">
              {favoriteAvatars.length} favorites · {uploadedAvatars.length} uploaded
            </span>
            {lockedFavorites.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {lockedFavorites.length} VRC+ locked
              </span>
            )}
          </div>
          <p className="text-xs text-theme-muted mt-1 max-w-2xl">
            5 favorite lists total — 1 free list plus 4 VRC+ lists. Move locked avatars to the free list to wear them without VRC+.
          </p>
        </div>

        {/* Current Active Avatar & VRC+ Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* VRC+ Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              hasVrcPlus
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>
              {hasVrcPlus
                ? `VRC+ Active (${TOTAL_AVATAR_LISTS} lists · ${TOTAL_AVATAR_SLOTS_WITH_VRC_PLUS} slots)`
                : `Free (${FREE_AVATAR_SLOTS} slots · ${TOTAL_AVATAR_LISTS - 1} lists need VRC+)`}
            </span>
          </div>

          {/* Current Avatar */}
          {currentUser && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 bg-white/5 shrink-0">
                {equippedThumbnailUrl ? (
                  <img
                    key={equippedThumbnailUrl}
                    src={equippedThumbnailUrl}
                    alt="Active Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shirt className="w-3.5 h-3.5 m-auto text-white/40" />
                )}
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold tracking-wider text-white/40 block leading-none">
                  Equipped
                </span>
                <span className="text-xs font-semibold text-white/90 truncate max-w-[120px] block">
                  {equippedDisplayName}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={fetchAvatars}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white transition-all duration-150 cursor-pointer disabled:opacity-50"
            title="Refresh Avatars"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="px-6 py-3 border-b border-white/[0.06] bg-[#07070a]/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] gap-1">
          <button
            onClick={() => {
              setActiveTab('favorites')
              setSelectedGroup('all')
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-crimson-500 text-white shadow-md shadow-crimson-500/30 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>Favorite Avatars ({favoriteAvatars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('uploaded')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'uploaded'
                ? 'bg-crimson-500 text-white shadow-md shadow-crimson-500/30 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>My Uploaded ({uploadedAvatars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-crimson-500 text-white shadow-md shadow-crimson-500/30 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Public Avatars</span>
          </button>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md ml-auto">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'search'
                  ? 'Search avatar worlds, models, creators...'
                  : 'Filter avatars by name, ID, or creator...'
              }
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] focus:border-crimson-500/60 rounded-xl text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          {/* Release Filter (Uploaded Only) */}
          {activeTab === 'uploaded' && (
            <select
              value={releaseFilter}
              onChange={(e) => setReleaseFilter(e.target.value as ReleaseFilter)}
              className="bg-[#0f1017] border border-white/[0.08] text-white/80 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-crimson-500 cursor-pointer"
            >
              <option value="all">All Release</option>
              <option value="public">Public</option>
              <option value="private">Private / Hidden</option>
            </select>
          )}

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as any)}
            className="bg-[#0f1017] border border-white/[0.08] text-white/80 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-crimson-500 cursor-pointer"
          >
            <option value="all">All Platforms</option>
            <option value="pc">PC Only</option>
            <option value="quest">Quest / Android</option>
          </select>
        </div>
      </div>

      {/* Favorite Groups Pill Selector (Shown in Favorites Tab) */}
      {activeTab === 'favorites' && (
        <div className="px-6 py-2.5 border-b border-white/[0.05] bg-[#07070a]/40 backdrop-blur-sm flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider shrink-0 mr-1">
            Favorite Lists:
          </span>

          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedGroup === 'all'
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            All Lists ({favoriteAvatars.length})
          </button>

          {favoriteGroups.map((grp) => {
            const isSelected = selectedGroup === grp.groupKey
            const isLocked = grp.isVrcPlus && !hasVrcPlus

            return (
              <button
                key={grp.groupKey}
                onClick={() => setSelectedGroup(grp.groupKey)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-white/15 text-white border-white/25 shadow-sm'
                    : isLocked
                    ? 'bg-amber-500/10 text-amber-300/80 border-amber-500/20 hover:bg-amber-500/15'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04] border-transparent'
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                ) : grp.isVrcPlus ? (
                  <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <FolderHeart className="w-3 h-3 text-accent shrink-0" />
                )}
                <span>
                  {grp.name} ({grp.count})
                </span>
                {isLocked && (
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    Locked
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading || isSearching ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-white/40">
            <RefreshCw className="w-8 h-8 animate-spin text-crimson-500" />
            <span className="text-xs font-medium">Loading avatars and favorite lists from VRChat...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-white/40 border border-dashed border-white/[0.08] rounded-2xl p-8">
            <Shirt className="w-12 h-12 stroke-[1.2] text-white/20" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white/70">
                {activeTab === 'uploaded'
                  ? 'No uploaded avatars found'
                  : activeTab === 'favorites'
                  ? 'No favorite avatars found in this list'
                  : 'No search results'}
              </p>
              <p className="text-xs text-white/40 mt-1 max-w-sm">
                {activeTab === 'uploaded'
                  ? 'Avatars you upload via Unity VRChat SDK will appear here.'
                  : activeTab === 'favorites'
                  ? 'Favorite avatars in VRChat to organize and switch them from VRCFX.'
                  : 'Try searching with different keywords.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentList.map((avatar) => {
              const hasPc = avatar.unityPackages?.some(
                (p) =>
                  p.platform?.toLowerCase().includes('standalonewindows') ||
                  p.platform?.toLowerCase().includes('pc')
              )
              const hasQuest = avatar.unityPackages?.some(
                (p) =>
                  p.platform?.toLowerCase().includes('android') ||
                  p.platform?.toLowerCase().includes('quest')
              )
              const isSwitching = switchingAvatarId === avatar.id
              const isUnfavoriting = unfavoritingId === avatar.id
              const isCurrent = equippedAvatarId
                ? avatar.id === equippedAvatarId
                : !!(
                    currentUser?.currentAvatarThumbnailImageUrl &&
                    avatar.thumbnailImageUrl &&
                    currentUser.currentAvatarThumbnailImageUrl === avatar.thumbnailImageUrl
                  )
              const isLocked = avatar.isVrcPlusLocked

              return (
                <div
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar)}
                  onDoubleClick={() => {
                    if (!avatar.isVrcPlusLocked) handleWearAvatar(avatar)
                  }}
                  className={`group relative rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-2xl ${
                    isCurrent
                      ? 'border-crimson-500/70 shadow-lg shadow-crimson-500/20'
                      : isLocked
                      ? 'border-amber-500/30 hover:border-amber-500/50 opacity-90'
                      : 'border-white/[0.08] hover:border-crimson-500/40'
                  }`}
                >
                  {/* Thumbnail Banner */}
                  <div className="relative w-full aspect-[4/3] bg-black/50 overflow-hidden">
                    {avatar.thumbnailImageUrl || avatar.imageUrl ? (
                      <img
                        src={avatar.thumbnailImageUrl || avatar.imageUrl}
                        alt={avatar.name}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          isLocked ? 'filter grayscale-[30%] brightness-75' : ''
                        }`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Shirt className="w-10 h-10" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-transparent to-black/40 pointer-events-none" />

                    {/* VRC+ Locked Frosted Center Overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 backdrop-blur-[2px] bg-black/40 flex flex-col items-center justify-center gap-1.5 p-3 text-center pointer-events-none">
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-lg">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black text-amber-200 tracking-wide">
                          VRC+ Locked Slot
                        </span>
                        <span className="text-[9px] text-white/70 leading-tight">
                          Click "Move" to put in free standard list
                        </span>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                      {/* Release Status or Favorite Group */}
                      {avatar.favoriteGroupName ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border flex items-center gap-1 ${
                            isLocked
                              ? 'bg-amber-500/30 text-amber-200 border-amber-500/40'
                              : avatar.isVrcPlusGroup
                              ? 'bg-purple-500/30 text-purple-200 border-purple-500/40'
                              : 'bg-black/60 text-white/80 border-white/10'
                          }`}
                        >
                          {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Star className="w-2.5 h-2.5 fill-current" />}
                          <span className="truncate max-w-[90px]">{avatar.favoriteGroupName}</span>
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                            avatar.releaseStatus === 'public'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {avatar.releaseStatus === 'public' ? 'Public' : 'Private'}
                        </span>
                      )}

                      {/* Platforms Badge */}
                      <div className="flex items-center gap-1">
                        {hasPc && (
                          <span
                            className="p-1 rounded-md bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/30 text-[10px]"
                            title="PC Compatible"
                          >
                            <Cpu className="w-3 h-3" />
                          </span>
                        )}
                        {hasQuest && (
                          <span
                            className="p-1 rounded-md bg-black/60 backdrop-blur-md text-emerald-300 border border-emerald-500/30 text-[10px]"
                            title="Quest / Android Compatible"
                          >
                            <Smartphone className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Wear Banner */}
                    {isCurrent && (
                      <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-full bg-crimson-500/90 text-white text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-md">
                        <Sparkles className="w-2.5 h-2.5" /> Currently Wearing
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-crimson-300 transition-colors truncate">
                        {avatar.name}
                      </h3>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        by <span className="text-white/70 font-medium">{avatar.authorName}</span>
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] space-y-2">
                      {/* Primary Wear Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleWearAvatar(avatar)
                        }}
                        disabled={isSwitching || isLocked}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                          isLocked
                            ? 'bg-amber-500/15 text-amber-300/80 border border-amber-500/20 cursor-not-allowed'
                            : isCurrent
                            ? 'bg-white/10 text-white/60 hover:bg-white/15'
                            : 'bg-gradient-to-r from-crimson-600 to-crimson-500 hover:from-crimson-500 hover:to-crimson-400 text-white shadow-crimson-500/25'
                        }`}
                        title={isLocked ? 'VRC+ subscription required to equip' : 'Equip avatar in VRChat'}
                      >
                        {isSwitching ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isLocked ? (
                          <>
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>VRC+ Locked</span>
                          </>
                        ) : isCurrent ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Equipped</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Wear Avatar</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Action Toolbar */}
                      <div className="flex items-center gap-1.5">
                        {/* Move / Reassign List Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMoveModalAvatar(avatar)
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            isLocked
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-bold'
                              : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/[0.08]'
                          }`}
                          title="Move avatar to another favorite list"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{isLocked ? 'Move to Free' : 'Move'}</span>
                        </button>

                        {/* Unfavorite / Favorite Button */}
                        {avatar.isFavorite && (
                          <button
                            onClick={(e) => handleRemoveFavorite(avatar, e)}
                            disabled={isUnfavoriting}
                            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-crimson-500/20 text-white/50 hover:text-accent border border-white/[0.08] hover:border-crimson-500/30 transition-colors cursor-pointer"
                            title="Remove from favorites"
                          >
                            {isUnfavoriting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Copy ID Button */}
                        <button
                          onClick={(e) => handleCopyId(avatar.id, e)}
                          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Copy Avatar ID"
                        >
                          {copiedId === avatar.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Move / Add to Favorite List Modal */}
      {moveModalAvatar && (
        <div
          onClick={() => setMoveModalAvatar(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#090a10] border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-theme-primary flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-accent" />
                  Choose Favorite List
                </h3>
                <p className="text-xs text-theme-muted mt-0.5">
                  {moveModalAvatar.isFavorite ? 'Move avatar to a different list' : 'Add avatar to your favorites'}
                </p>
              </div>

              <button
                onClick={() => setMoveModalAvatar(null)}
                className="p-1 rounded-full text-theme-muted hover:text-theme-primary hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Target Avatar Preview Card */}
            <div className="my-4 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black/50 overflow-hidden shrink-0 border border-white/10">
                {moveModalAvatar.thumbnailImageUrl ? (
                  <img
                    src={moveModalAvatar.thumbnailImageUrl}
                    alt={moveModalAvatar.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shirt className="w-6 h-6 m-auto text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{moveModalAvatar.name}</h4>
                <p className="text-[11px] text-white/50 truncate">by {moveModalAvatar.authorName}</p>
                {moveModalAvatar.favoriteGroupName && (
                  <span className="text-[10px] text-amber-300 font-semibold mt-0.5 block">
                    Current: {moveModalAvatar.favoriteGroupName}
                  </span>
                )}
              </div>
            </div>

            {/* Favorite Lists Grid */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/40 block mb-2">
                Select Destination List:
              </span>

              {AVATAR_FAVORITE_LISTS.map((list) => {
                const isCurrent = moveModalAvatar.favoriteGroup === list.tag
                const isVrcPlusRequired = list.isVrcPlus && !hasVrcPlus

                return (
                  <button
                    key={list.tag}
                    onClick={() => handleMoveOrAddToList(list.tag)}
                    disabled={isMoving || isCurrent}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer text-left ${
                      isCurrent
                        ? 'bg-white/10 border-white/20 text-white/50 cursor-not-allowed'
                        : list.tag === 'avatars1'
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-white'
                        : isVrcPlusRequired
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-white'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          list.tag === 'avatars1'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isVrcPlusRequired
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {list.tag === 'avatars1' ? (
                          <FolderHeart className="w-4 h-4" />
                        ) : isVrcPlusRequired ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Crown className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <span className="text-xs font-bold block">{list.name}</span>
                        <span className="text-[10px] text-white/50">
                          {list.tag === 'avatars1'
                            ? `Free list · ${list.slots} slots (always usable)`
                            : isVrcPlusRequired
                            ? `VRC+ list · locked without subscription`
                            : `VRC+ list · ${list.slots} slots (unlocked)`}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/60">
                          Current
                        </span>
                      ) : list.tag === 'avatars1' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Free Slot
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          VRC+
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Detail Modal */}
      {selectedAvatar && (
        <div
          onClick={() => setSelectedAvatar(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#090a10] border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]"
          >
            {/* Modal Left Image */}
            <div className="md:w-1/2 relative bg-black/60 aspect-square md:aspect-auto">
              <img
                src={selectedAvatar.imageUrl || selectedAvatar.thumbnailImageUrl}
                alt={selectedAvatar.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a10] via-transparent to-transparent md:hidden" />
            </div>

            {/* Modal Right Info */}
            <div className="p-6 md:w-1/2 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-crimson-500/20 text-crimson-300 border border-crimson-500/30">
                      {selectedAvatar.releaseStatus || 'Public'}
                    </span>
                    {selectedAvatar.isVrcPlusLocked && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> VRC+ Slot
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAvatar(null)}
                    className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <h2 className="text-xl font-black text-white mt-3 leading-tight">{selectedAvatar.name}</h2>
                <p className="text-xs text-white/60 mt-1">
                  Created by <span className="text-white font-semibold">{selectedAvatar.authorName}</span>
                </p>

                {selectedAvatar.isVrcPlusLocked && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">VRChat Plus Favorite Slot</p>
                      <p className="text-white/70 text-[11px] mt-0.5">
                        This avatar is stored in your {selectedAvatar.favoriteGroupName || 'VRC+ favorite list'}. Click "Move to Free Standard List" below to unlock and wear it!
                      </p>
                    </div>
                  </div>
                )}

                {selectedAvatar.description && (
                  <p className="text-xs text-white/70 mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] whitespace-pre-wrap leading-relaxed">
                    {selectedAvatar.description}
                  </p>
                )}

                {/* Technical Specs */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]">
                    <span className="text-white/40">Avatar ID:</span>
                    <span className="text-white/80 font-mono text-[11px] truncate max-w-[180px]">
                      {selectedAvatar.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]">
                    <span className="text-white/40">Platforms:</span>
                    <div className="flex items-center gap-1.5">
                      {selectedAvatar.unityPackages?.map((pkg, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-white/80"
                        >
                          {pkg.platform?.replace('standalonewindows', 'PC')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedAvatar.favoriteGroupName && (
                    <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]">
                      <span className="text-white/40">Favorite List:</span>
                      <span className="text-white/80 font-semibold">{selectedAvatar.favoriteGroupName}</span>
                    </div>
                  )}

                  {selectedAvatar.updated_at && (
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-white/40">Last Updated:</span>
                      <span className="text-white/70">{new Date(selectedAvatar.updated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWearAvatar(selectedAvatar)}
                    disabled={switchingAvatarId === selectedAvatar.id || selectedAvatar.isVrcPlusLocked}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                      selectedAvatar.isVrcPlusLocked
                        ? 'bg-amber-500/20 text-amber-300/80 border border-amber-500/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-crimson-600 to-crimson-500 hover:from-crimson-500 hover:to-crimson-400 text-white shadow-crimson-500/30 cursor-pointer'
                    }`}
                  >
                    {selectedAvatar.isVrcPlusLocked ? (
                      <>
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>VRC+ Locked</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>{switchingAvatarId === selectedAvatar.id ? 'Equipping...' : 'Equip / Wear Avatar'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={(e) => handleCopyId(selectedAvatar.id, e)}
                    className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Copy Avatar ID"
                  >
                    {copiedId === selectedAvatar.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Move / Unfavorite Tools in Modal */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMoveModalAvatar(selectedAvatar)}
                    className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedAvatar.isFavorite ? 'Move to Another List' : 'Add to Favorites'}</span>
                  </button>

                  {selectedAvatar.isFavorite && (
                    <button
                      onClick={(e) => handleRemoveFavorite(selectedAvatar, e)}
                      disabled={unfavoritingId === selectedAvatar.id}
                      className="py-2 px-3 rounded-xl bg-crimson-500/10 hover:bg-crimson-500/20 border border-crimson-500/30 text-xs font-semibold text-crimson-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
