import React, { useState, useEffect, useCallback } from 'react'
import {
  Globe,
  Search,
  Users,
  Heart,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Bookmark,
  TrendingUp,
  Clock,
  Gamepad2,
  X,
  Flame,
  Radio
} from 'lucide-react'
import { VRCWorld } from '../types'

interface CategoryTag {
  id: string
  label: string
  icon: React.ReactNode
  sort?: string
  query?: string
}

const WORLD_CATEGORIES: CategoryTag[] = [
  { id: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" />, sort: 'popularity' },
  { id: 'favorites', label: 'Top Rated', icon: <Heart className="w-3.5 h-3.5" />, sort: 'favorites' },
  { id: 'recent', label: 'Updated', icon: <Clock className="w-3.5 h-3.5" />, sort: 'updated' },
  { id: 'heat', label: 'Hot Now', icon: <TrendingUp className="w-3.5 h-3.5" />, sort: 'heat' },
  { id: 'games', label: 'Games', icon: <Gamepad2 className="w-3.5 h-3.5" />, query: 'game' },
  { id: 'hangout', label: 'Hangout', icon: <Sparkles className="w-3.5 h-3.5" />, query: 'hangout' },
  { id: 'club', label: 'Music & Club', icon: <Radio className="w-3.5 h-3.5" />, query: 'club' }
]

export const WorldsView: React.FC = () => {
  const [favorites, setFavorites] = useState<VRCWorld[]>([])
  const [exploreWorlds, setExploreWorlds] = useState<VRCWorld[]>([])
  const [activeTab, setActiveTab] = useState<'favorites' | 'explore_worlds'>('favorites')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [activeCategory, setActiveCategory] = useState<string>('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedWorld, setSelectedWorld] = useState<VRCWorld | null>(null)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setIsLoading(true)
    try {
      if (window.electronAPI?.getFavoriteWorlds) {
        const favs = await window.electronAPI.getFavoriteWorlds()
        setFavorites(favs || [])
      }
    } catch (err) {
      console.error('Failed to load favorite worlds:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExploreWorlds = useCallback(async (query: string = '', sort: string = 'popularity') => {
    setIsLoading(true)
    try {
      if (!window.electronAPI?.searchWorlds) {
        setExploreWorlds([])
        return
      }
      const results = await window.electronAPI.searchWorlds({
        query: query.trim(),
        sort: query.trim() ? sort || 'relevance' : sort || 'popularity',
        n: 60
      })
      setExploreWorlds(Array.isArray(results) ? results : [])
    } catch (err) {
      console.error('Failed to search worlds:', err)
      setExploreWorlds([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'explore_worlds' && exploreWorlds.length === 0) {
      fetchExploreWorlds('', 'popularity')
    }
  }, [activeTab, exploreWorlds.length, fetchExploreWorlds])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (activeTab === 'explore_worlds') {
      fetchExploreWorlds(searchQuery, 'relevance')
    }
  }

  const handleSelectCategory = (cat: CategoryTag) => {
    setActiveCategory(cat.id)
    setSearchQuery(cat.query || '')
    fetchExploreWorlds(cat.query || '', cat.sort || 'popularity')
  }

  const copyLaunchLink = (worldId: string) => {
    const link = `https://vrchat.com/home/launch?worldId=${worldId}`
    navigator.clipboard.writeText(link)
    setCopiedId(worldId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const availableGroups = React.useMemo(() => {
    const groups = new Set<string>()
    favorites.forEach((w) => {
      if (w.favoriteGroup) groups.add(w.favoriteGroup)
    })
    return Array.from(groups).sort()
  }, [favorites])

  const displayedFavorites = React.useMemo(() => {
    return favorites.filter((w) => {
      const matchesGroup = selectedGroup === 'all' || w.favoriteGroup === selectedGroup
      const matchesSearch =
        searchQuery.trim() === '' ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesGroup && matchesSearch
    })
  }, [favorites, selectedGroup, searchQuery])

  const displayedWorlds = activeTab === 'favorites' ? displayedFavorites : exploreWorlds

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden bg-app">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">
              <Globe className="page-title-icon" />
              <span>Worlds</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 font-mono font-bold shrink-0">
              {activeTab === 'favorites'
                ? `${favorites.length} Saved`
                : `${exploreWorlds.length} Worlds`}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1 font-medium">
            Browse your saved worlds or explore trending VRChat worlds.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold shrink-0 backdrop-blur-md overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'tab-pill-active'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Worlds ({favorites.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('explore_worlds')
              if (exploreWorlds.length === 0) fetchExploreWorlds('', 'popularity')
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'explore_worlds'
                ? 'tab-pill-active'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Explore Worlds</span>
          </button>
        </div>
      </div>

      {activeTab === 'favorites' && availableGroups.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
              selectedGroup === 'all'
                ? 'tab-pill-active border border-accent'
                : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            All Saved ({favorites.length})
          </button>
          {availableGroups.map((grp) => {
            const count = favorites.filter((w) => w.favoriteGroup === grp).length
            return (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  selectedGroup === grp
                    ? 'tab-pill-active border border-accent'
                    : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {grp} ({count})
              </button>
            )
          })}
        </div>
      )}

      {activeTab === 'explore_worlds' && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          {WORLD_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id && !searchQuery
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'tab-pill-active border border-accent'
                    : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2.5 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            dir="auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'favorites'
                ? 'Filter saved worlds by title, author...'
                : 'Search any VRChat world (e.g. Black Cat, Just Dance, Horror)...'
            }
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-white placeholder-white/30 text-xs focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                if (activeTab === 'explore_worlds') fetchExploreWorlds('', 'popularity')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-crimson-primary px-4 sm:px-5 py-2.5 text-xs font-black flex items-center gap-2 shrink-0 cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Search</span>
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="gothic-panel overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/[0.05]" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3.5 w-3/4 rounded-full bg-white/[0.08]" />
                  <div className="h-2.5 w-1/2 rounded-full bg-white/[0.05]" />
                  <div className="h-2 w-full rounded-full bg-white/[0.03] mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedWorlds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-white/40 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Globe className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-sm font-bold text-white/80">No worlds found</p>
            <p className="text-xs text-white/40 mt-1 max-w-sm">
              {activeTab === 'favorites'
                ? 'No saved worlds match your search filter.'
                : 'Try different search keywords or select a category tag above.'}
            </p>
            {activeTab === 'explore_worlds' && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  fetchExploreWorlds('', 'popularity')
                }}
                className="btn-gothic-secondary mt-4 px-4 py-2 text-xs font-bold"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pb-8">
            {displayedWorlds.map((world) => {
              const occupancyPct = world.capacity
                ? Math.min(100, Math.round(((world.occupants || 0) / world.capacity) * 100))
                : 0
              return (
                <div
                  key={world.id}
                  onClick={() => setSelectedWorld(world)}
                  className="gothic-card overflow-hidden flex flex-col justify-between group cursor-pointer"
                >
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={world.thumbnailImageUrl || world.imageUrl}
                      alt={world.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                      {world.favoriteGroup ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-crimson-600/90 text-white backdrop-blur-md shadow-sm">
                          {world.favoriteGroup}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/80 text-white backdrop-blur-md border border-white/10 shrink-0">
                        <Users className="w-3 h-3 text-accent" />
                        {world.occupants || 0} / {world.capacity || '—'}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h3 dir="auto" className="text-xs font-black text-white truncate drop-shadow-md">
                        {world.name}
                      </h3>
                      <p dir="auto" className="text-[10px] text-white/60 truncate font-medium">
                        by {world.authorName}
                      </p>
                    </div>
                  </div>

                  {world.capacity > 0 && (
                    <div className="px-3 pt-2">
                      <div className="h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            occupancyPct >= 90
                              ? 'bg-accent'
                              : occupancyPct >= 60
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-3 flex items-center justify-between gap-2 border-t border-white/[0.07] mt-2">
                    <div className="flex items-center gap-2.5 text-[10px] text-white/50 font-mono min-w-0">
                      {world.favorites !== undefined && (
                        <span className="flex items-center gap-1 truncate">
                          <Heart className="w-3 h-3 text-accent fill-crimson-400/20" />
                          {world.favorites.toLocaleString()}
                        </span>
                      )}
                      {world.visits !== undefined && (
                        <span className="flex items-center gap-1 truncate">
                          <Eye className="w-3 h-3 text-sky-400" />
                          {world.visits.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => copyLaunchLink(world.id)}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                        title="Copy Launch Link"
                      >
                        {copiedId === world.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={`https://vrchat.com/home/launch?worldId=${world.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-crimson-primary flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold"
                        title="Open in VRChat"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Launch</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedWorld && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in-page"
          onClick={() => setSelectedWorld(null)}
        >
          <div
            className="gothic-panel max-w-lg w-full overflow-hidden shadow-2xl border-white/[0.12]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black overflow-hidden">
              <img
                src={selectedWorld.imageUrl || selectedWorld.thumbnailImageUrl}
                alt={selectedWorld.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedWorld(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-crimson-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <h2 dir="auto" className="text-lg font-black text-white drop-shadow-md">
                  {selectedWorld.name}
                </h2>
                <p dir="auto" className="text-xs text-neutral-300 font-medium">
                  by {selectedWorld.authorName}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p
                dir="auto"
                className="text-xs text-white/70 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap font-medium"
              >
                {selectedWorld.description || 'No description provided for this world.'}
              </p>

              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-black/40 border border-white/[0.08] text-center">
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-semibold block">Capacity</span>
                  <span className="text-xs font-black text-white mt-0.5 block">
                    {selectedWorld.capacity} Players
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-semibold block">Favorites</span>
                  <span className="text-xs font-black text-accent mt-0.5 block">
                    {(selectedWorld.favorites || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-semibold block">Visits</span>
                  <span className="text-xs font-black text-sky-400 mt-0.5 block">
                    {(selectedWorld.visits || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedWorld.tags && selectedWorld.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {selectedWorld.tags
                    .filter((t) => !t.startsWith('author_tag_') && !t.startsWith('system_'))
                    .slice(0, 8)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/50 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  onClick={() => copyLaunchLink(selectedWorld.id)}
                  className="btn-gothic-secondary flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {copiedId === selectedWorld.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Launch Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (window.electronAPI?.launchInstance) {
                      await window.electronAPI.launchInstance(selectedWorld.id)
                    }
                  }}
                  className="btn-crimson-primary flex items-center gap-2 px-5 py-2 text-xs font-black cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch in VRChat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
