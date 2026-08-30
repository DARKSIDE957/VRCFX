import axios, { AxiosInstance } from 'axios'
import { JsonStore } from './store'

export interface VRCUser {
  id: string
  username: string
  displayName: string
  pastDisplayNames?: { displayName: string; updatedAt?: string }[]
  trustRank?: 'visitor' | 'new_user' | 'user' | 'known' | 'trusted' | 'admin'
  nickname?: string
  customNote?: string
  userIcon?: string
  profilePicOverride?: string
  currentAvatarImageUrl?: string
  currentAvatarThumbnailImageUrl?: string
  currentAvatarId?: string
  currentAvatarTags?: string[]
  bio?: string
  bioLinks?: string[]
  status: 'active' | 'join me' | 'ask me' | 'busy' | 'offline'
  statusDescription?: string
  state?: string
  tags?: string[]
  developerType?: string
  last_login?: string
  last_activity?: string
  last_platform?: string
  friendKey?: string
  location?: string
  worldId?: string
  instanceId?: string
  isFriend?: boolean
  isFavorite?: boolean
  favoriteGroup?: string
  favoriteGroupName?: string
  hasVRCPlus?: boolean
  dateJoined?: string
}

export interface VRCWorld {
  id: string
  name: string
  description: string
  authorName: string
  authorId: string
  capacity: number
  imageUrl: string
  thumbnailImageUrl: string
  occupants?: number
  publicOccupants?: number
  privateOccupants?: number
  favorites?: number
  visits?: number
  tags?: string[]
  favoriteGroup?: string
  favoriteTags?: string[]
  updated_at?: string
}

export interface VRCAvatar {
  id: string
  name: string
  description: string
  authorName: string
  authorId: string
  imageUrl: string
  thumbnailImageUrl: string
  assetUrl?: string
  releaseStatus?: string
  tags?: string[]
  unityPackages?: { platform: string; unityVersion?: string; performanceRating?: string }[]
  featured?: boolean
  updated_at?: string
  isFavorite?: boolean
  favoriteGroup?: string
  favoriteGroupName?: string
  favoriteId?: string
  isVrcPlusGroup?: boolean
  isVrcPlusLocked?: boolean
}

export interface VRCInventoryItem {
  id: string
  name: string
  description?: string
  imageUrl?: string
  itemType: 'sticker' | 'emoji' | 'prop' | 'droneskin' | 'portalskin' | 'warpeffect' | 'bundle' | 'print' | string
  tags?: string[]
  flags?: string[]
  createdAt?: string
  updatedAt?: string
  authorName?: string
  authorId?: string
  assetUrl?: string
  data?: any
}

export interface VRCPrint {
  id: string
  name: string
  description?: string
  fileId?: string
  imageUrl: string
  thumbnailUrl?: string
  authorId: string
  authorName?: string
  createdAt: string
  tags?: string[]
}

export interface VRCProp {
  id: string
  name: string
  description?: string
  imageUrl?: string
  assetUrl?: string
  authorId?: string
  authorName?: string
  tags?: string[]
  itemType?: string
  createdAt?: string
}

export class VRChatApi {
  private client: AxiosInstance
  private store: JsonStore
  private cookies: Record<string, string> = {}
  private currentUser: VRCUser | null = null

  constructor(store: JsonStore) {
    this.store = store
    this.cookies = {
      apiKey: 'JlE5Jldo5Jibnk5O5hTx6izvhY2ExrU7',
      ...(this.store.get('cookies', {}) || {})
    }

    this.client = axios.create({
      baseURL: 'https://api.vrchat.cloud/api/1',
      params: {
        apiKey: 'JlE5Jldo5Jibnk5O5hTx6izvhY2ExrU7'
      },
      headers: {
        'User-Agent': 'VRCFX/1.0.0 (contact: support@vrcfx.app)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      withCredentials: true,
      validateStatus: () => true
    })

    // Request interceptor to attach cookies and apiKey
    this.client.interceptors.request.use((config) => {
      config.params = {
        apiKey: 'JlE5Jldo5Jibnk5O5hTx6izvhY2ExrU7',
        ...(config.params || {})
      }

      const cookieHeader = Object.entries(this.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
      if (cookieHeader) {
        config.headers['Cookie'] = cookieHeader
      }
      return config
    })

    // Response interceptor to capture set-cookie
    this.client.interceptors.response.use((response) => {
      try {
        const setCookie = response.headers['set-cookie']
        if (setCookie) {
          const list = Array.isArray(setCookie) ? setCookie : [setCookie]
          let changed = false
          for (const cookieStr of list) {
            if (typeof cookieStr !== 'string') continue
            const parts = cookieStr.split(';')[0].split('=')
            if (parts.length >= 2) {
              const key = parts[0].trim()
              const val = parts.slice(1).join('=').trim()
              if (val && val !== '""' && val !== 'deleted') {
                this.cookies[key] = val
                changed = true
              }
            }
          }
          if (changed) {
            this.store.set('cookies', this.cookies)
          }
        }
      } catch (err) {
        console.error('Error parsing set-cookie header:', err)
      }
      return response
    })
  }

  public hasSavedSession(): boolean {
    return !!(this.cookies['auth'] || this.cookies['twoFactorAuth'])
  }

  public async checkSession(): Promise<{ success: boolean; user?: VRCUser; requires2FA?: string[] }> {
    // Reload cookies from store on check
    const storedCookies = this.store.get('cookies', {}) || {}
    this.cookies = {
      apiKey: 'JlE5Jldo5Jibnk5O5hTx6izvhY2ExrU7',
      ...storedCookies
    }

    if (!this.hasSavedSession()) {
      return { success: false }
    }

    try {
      const res = await this.client.get('/auth/user')
      if (res.status === 200 && res.data && res.data.id) {
        this.currentUser = this.formatUser(res.data)
        this.store.set('lastUser', this.currentUser)
        this.store.set('cookies', this.cookies)
        return { success: true, user: this.currentUser }
      } else if (res.data?.requiresTwoFactorAuth) {
        return {
          success: false,
          requires2FA: res.data.requiresTwoFactorAuth
        }
      }
    } catch (err) {
      console.error('Session check failed:', err)
    }
    return { success: false }
  }

  public async login(credentials: { username: string; password: string }): Promise<{
    success: boolean
    requires2FA?: string[]
    user?: VRCUser
    error?: string
  }> {
    try {
      // Basic Auth
      const basicAuth = Buffer.from(
        `${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}`
      ).toString('base64')

      const res = await this.client.get('/auth/user', {
        headers: {
          Authorization: `Basic ${basicAuth}`
        }
      })

      if (res.status === 200 && res.data?.id) {
        this.currentUser = this.formatUser(res.data)
        this.store.set('lastUser', this.currentUser)
        return { success: true, user: this.currentUser }
      }

      if (res.data?.requiresTwoFactorAuth) {
        return {
          success: false,
          requires2FA: res.data.requiresTwoFactorAuth
        }
      }

      if (res.status === 401 || res.status === 400) {
        return {
          success: false,
          error: res.data?.error?.message || 'Invalid username or password'
        }
      }

      return {
        success: false,
        error: res.data?.error?.message || `Login failed with status ${res.status}`
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error during login'
      }
    }
  }

  public async verify2FA(code: string, type: 'totp' | 'emailOtp' | 'otp' = 'totp'): Promise<{
    success: boolean
    user?: VRCUser
    error?: string
  }> {
    try {
      const endpoint = type === 'emailOtp' 
        ? '/auth/twofactorauth/emailotp/verify' 
        : (type === 'otp' ? '/auth/twofactorauth/otp/verify' : '/auth/twofactorauth/totp/verify')

      const res = await this.client.post(endpoint, { code: code.trim() })

      if (res.status === 200 && res.data?.verified) {
        // Explicitly persist updated 2FA cookies
        this.store.set('cookies', this.cookies)

        // Fetch current user details after 2FA
        const userRes = await this.client.get('/auth/user')
        if (userRes.status === 200 && userRes.data?.id) {
          this.currentUser = this.formatUser(userRes.data)
          this.store.set('lastUser', this.currentUser)
          this.store.set('cookies', this.cookies)
          return { success: true, user: this.currentUser }
        }
        return { success: true }
      }

      return {
        success: false,
        error: res.data?.error?.message || 'Invalid 2FA code'
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to verify 2FA'
      }
    }
  }

  public async logout(): Promise<void> {
    try {
      await this.client.put('/logout')
    } catch (e) {
      // ignore
    }
    this.cookies = {}
    this.currentUser = null
    this.store.set('cookies', {})
    this.store.set('lastUser', null)
  }

  public async getOnlineFriends(): Promise<VRCUser[]> {
    try {
      const res = await this.client.get('/auth/user/friends?offline=false&n=100')
      if (res.status === 200 && Array.isArray(res.data)) {
        return res.data.map((u: any) => this.formatUser(u))
      }
      return []
    } catch (e) {
      return []
    }
  }

  public async getFriends(forceRefresh: boolean = false): Promise<{
    online: VRCUser[]
    offline: VRCUser[]
  }> {
    try {
      // Fetch online and offline friends and favorite friends in parallel
      const [onlineRes, offlineRes, favRes] = await Promise.all([
        this.client.get('/auth/user/friends?offline=false&n=100'),
        this.client.get('/auth/user/friends?offline=true&n=100'),
        this.client.get('/favorites?type=friend&n=100').catch(() => ({ data: [] }))
      ])

      // Map favorite groups
      const favoritesMap = new Map<string, { tags: string[] }>()
      if (Array.isArray(favRes?.data)) {
        favRes.data.forEach((fav: any) => {
          if (fav.favoriteId) {
            favoritesMap.set(fav.favoriteId, { tags: fav.tags || ['group_0'] })
          }
        })
      }

      const formatWithFav = (u: any): VRCUser => {
        const user = this.formatUser(u)
        const favInfo = favoritesMap.get(user.id)
        if (favInfo) {
          user.isFavorite = true
          user.favoriteGroup = favInfo.tags[0] || 'group_0'
        }
        return user
      }

      const online: VRCUser[] = Array.isArray(onlineRes.data)
        ? onlineRes.data.map(formatWithFav)
        : []

      const offline: VRCUser[] = Array.isArray(offlineRes.data)
        ? offlineRes.data.map(formatWithFav)
        : []

      // If more than 100 offline friends, fetch next pages up to 500
      if (offline.length === 100) {
        for (let offset = 100; offset <= 400; offset += 100) {
          const nextRes = await this.client.get(`/auth/user/friends?offline=true&n=100&offset=${offset}`)
          if (Array.isArray(nextRes.data) && nextRes.data.length > 0) {
            offline.push(...nextRes.data.map(formatWithFav))
            if (nextRes.data.length < 100) break
          } else {
            break
          }
        }
      }

      const all = [...online, ...offline]
      this.store.set('cachedFriends', all)

      return { online, offline }
    } catch (err) {
      console.error('Failed to fetch friends:', err)
      const cached = this.store.get('cachedFriends', [])
      const online = cached.filter((u: VRCUser) => u.location !== 'offline')
      const offline = cached.filter((u: VRCUser) => u.location === 'offline')
      return { online, offline }
    }
  }

  public async deleteFriend(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.client.delete(`/auth/user/friends/${userId}`)
      if (res.status === 200 || res.status === 204) {
        return { success: true }
      }
      return { success: false, error: res.data?.error?.message || 'Failed to remove friend' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error deleting friend' }
    }
  }

  public async deleteFriendsBulk(userIds: string[]): Promise<{
    success: boolean
    deleted: string[]
    failed: { id: string; error: string }[]
  }> {
    const deleted: string[] = []
    const failed: { id: string; error: string }[] = []

    for (const id of userIds) {
      const result = await this.deleteFriend(id)
      if (result.success) {
        deleted.push(id)
      } else {
        failed.push({ id, error: result.error || 'Failed' })
      }
      // Small pause to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    return {
      success: failed.length === 0,
      deleted,
      failed
    }
  }

  public async getUserProfile(userId: string): Promise<VRCUser | null> {
    try {
      const res = await this.client.get(`/users/${userId}`)
      if (res.status === 200 && res.data) {
        return this.formatUser(res.data)
      }
    } catch (err) {
      console.error('Failed to get user profile:', err)
    }
    return null
  }

  public async updateProfile(data: {
    bio?: string
    status?: string
    statusDescription?: string
    bioLinks?: string[]
  }): Promise<{ success: boolean; user?: VRCUser; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Not logged in' }
    }

    try {
      const res = await this.client.put(`/users/${this.currentUser.id}`, data)
      if (res.status === 200 && res.data) {
        this.currentUser = this.formatUser(res.data)
        this.store.set('lastUser', this.currentUser)
        return { success: true, user: this.currentUser }
      }
      return { success: false, error: res.data?.error?.message || 'Failed to update profile' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Profile update failed' }
    }
  }

  public async getFavoriteWorlds(): Promise<VRCWorld[]> {
    try {
      const allFavorites: any[] = []

      // 1. Fetch all pages of favorites (up to 400 favorites across all groups)
      for (let offset = 0; offset <= 400; offset += 100) {
        const res = await this.client.get(`/favorites?type=world&n=100&offset=${offset}`)
        if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
          allFavorites.push(...res.data)
          if (res.data.length < 100) break
        } else {
          break
        }
      }

      if (allFavorites.length === 0) {
        return []
      }

      // Default Group Mapping
      const groupMap: Record<string, string> = {
        'world-group-0': 'Group 1',
        'world-group-1': 'Group 2',
        'world-group-2': 'Group 3',
        'world-group-3': 'Group 4'
      }

      // Fetch user's custom favorite group display names if available
      if (this.currentUser?.id) {
        try {
          const gRes = await this.client.get(`/favorite/groups?ownerId=${this.currentUser.id}`)
          if (gRes.status === 200 && Array.isArray(gRes.data)) {
            gRes.data.forEach((g: any) => {
              if (g.name && g.displayName) {
                groupMap[g.name] = g.displayName
              }
            })
          }
        } catch (e) {
          // ignore
        }
      }

      // Map favoriteId to group name and tags
      const favMetaMap = new Map<string, { group: string; tags: string[] }>()
      for (const fav of allFavorites) {
        const tags = Array.isArray(fav.tags) ? fav.tags : []
        let groupName = 'Group 1'
        for (const t of tags) {
          if (groupMap[t]) {
            groupName = groupMap[t]
            break
          } else if (t.startsWith('world-group-')) {
            const num = parseInt(t.replace('world-group-', ''), 10) + 1
            groupName = `Group ${num}`
            break
          }
        }
        favMetaMap.set(fav.favoriteId, { group: groupName, tags })
      }

      const worldIds = allFavorites.map((f) => f.favoriteId)
      const uniqueWorldIds = Array.from(new Set(worldIds))
      const worlds: VRCWorld[] = []

      // Batch fetch full world details in parallel chunks of 10
      const chunkSize = 10
      for (let i = 0; i < uniqueWorldIds.length; i += chunkSize) {
        const chunk = uniqueWorldIds.slice(i, i + chunkSize)
        const results = await Promise.allSettled(
          chunk.map((id) => this.client.get(`/worlds/${id}`))
        )
        for (let j = 0; j < results.length; j++) {
          const r = results[j]
          const wid = chunk[j]
          if (r.status === 'fulfilled' && r.value.status === 200 && r.value.data) {
            const formatted = this.formatWorld(r.value.data)
            const meta = favMetaMap.get(wid)
            if (meta) {
              formatted.favoriteGroup = meta.group
              formatted.favoriteTags = meta.tags
            }
            worlds.push(formatted)
          }
        }
      }

      return worlds
    } catch (err) {
      console.error('Failed to get favorite worlds:', err)
    }
    return []
  }

  private normalizeWorldSort(sort?: string): string {
    const allowed = new Set([
      'popularity', 'heat', 'trust', 'shuffle', 'random', 'favorites',
      'reportScore', 'reportCount', 'publicationDate', 'labsPublicationDate',
      'created', '_created_at', 'updated', '_updated_at', 'order',
      'relevance', 'magic', 'name'
    ])
    const value = (sort || 'popularity').trim()
    return allowed.has(value) ? value : 'popularity'
  }

  public async searchWorlds(
    query: string = '',
    n: number = 60,
    sort: string = 'popularity',
    tag?: string
  ): Promise<VRCWorld[]> {
    try {
      const cleanQuery = query.trim()
      const limit = Math.min(Math.max(n, 1), 100)
      const sortValue = this.normalizeWorldSort(cleanQuery ? (sort || 'relevance') : (sort || 'popularity'))

      const buildParams = (overrides: Record<string, string> = {}) => {
        const params = new URLSearchParams()
        params.set('n', String(limit))
        params.set('order', 'descending')
        params.set('releaseStatus', 'public')
        for (const [k, v] of Object.entries(overrides)) {
          if (v) params.set(k, v)
        }
        return params
      }

      // Trending / empty browse: active worlds are more reliable than a bare /worlds list
      if (!cleanQuery && !tag) {
        const activeParams = buildParams({ sort: sortValue === 'relevance' ? 'popularity' : sortValue })
        const activeRes = await this.client.get(`/worlds/active?${activeParams.toString()}`)
        if (activeRes.status === 200 && Array.isArray(activeRes.data) && activeRes.data.length > 0) {
          return activeRes.data.map((w: any) => this.formatWorld(w))
        }
      }

      const primary = buildParams({
        sort: sortValue,
        ...(cleanQuery ? { search: cleanQuery, fuzzy: 'true' } : {}),
        ...(tag?.trim() ? { tag: tag.trim() } : {})
      })

      let res = await this.client.get(`/worlds?${primary.toString()}`)
      if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((w: any) => this.formatWorld(w))
      }

      if (cleanQuery) {
        // Fallback 1: popularity sort + fuzzy
        const simple = buildParams({
          search: cleanQuery,
          sort: 'popularity',
          fuzzy: 'true'
        })
        res = await this.client.get(`/worlds?${simple.toString()}`)
        if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map((w: any) => this.formatWorld(w))
        }

        // Fallback 2: treat the keyword as a tag (game, hangout, club, avatar, …)
        const tagParams = buildParams({
          tag: cleanQuery.toLowerCase().replace(/\s+/g, ''),
          sort: 'popularity'
        })
        res = await this.client.get(`/worlds?${tagParams.toString()}`)
        if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map((w: any) => this.formatWorld(w))
        }
      }
    } catch (err) {
      console.error('Failed to search worlds:', err)
    }
    return []
  }

  public async searchAvatars(
    query: string = '',
    n: number = 60
  ): Promise<VRCAvatar[]> {
    try {
      const cleanQuery = query.trim().toLowerCase()
      const limit = Math.min(Math.max(n, 1), 100)
      const seen = new Set<string>()
      const avatars: VRCAvatar[] = []

      const pushList = (list: any[]) => {
        for (const raw of list) {
          const av = this.formatAvatar(raw)
          if (!av.id?.startsWith('avtr_') || seen.has(av.id)) continue
          seen.add(av.id)
          avatars.push(av)
        }
      }

      const matchesQuery = (av: VRCAvatar) => {
        if (!cleanQuery) return true
        const hay = `${av.name} ${av.authorName} ${(av.tags || []).join(' ')}`.toLowerCase()
        return hay.includes(cleanQuery)
      }

      // 1. Featured public avatars (only browsable public set for normal users)
      try {
        const featuredParams = new URLSearchParams({
          featured: 'true',
          n: String(limit),
          order: 'descending',
          sort: 'popularity',
          releaseStatus: 'public'
        })
        if (cleanQuery) featuredParams.set('tag', cleanQuery.replace(/\s+/g, ''))
        const featuredRes = await this.client.get(`/avatars?${featuredParams.toString()}`)
        if (featuredRes.status === 200 && Array.isArray(featuredRes.data)) {
          pushList(featuredRes.data)
        }
      } catch {
        // continue
      }

      // 2. Own uploaded avatars (search param is not supported on /avatars — filter client-side)
      try {
        const mineRes = await this.client.get(
          `/avatars?user=me&n=${limit}&order=descending&sort=updated&releaseStatus=all`
        )
        if (mineRes.status === 200 && Array.isArray(mineRes.data)) {
          pushList(mineRes.data.filter((a: any) => matchesQuery(this.formatAvatar(a))))
        }
      } catch {
        // continue
      }

      // 3. Favorited avatars — this endpoint DOES support `search`
      try {
        const favParams = new URLSearchParams({
          n: String(limit),
          order: 'descending',
          sort: 'updated'
        })
        if (cleanQuery) favParams.set('search', query.trim())
        const favRes = await this.client.get(`/avatars/favorites?${favParams.toString()}`)
        if (favRes.status === 200 && Array.isArray(favRes.data)) {
          pushList(favRes.data)
        }
      } catch {
        // continue
      }

      // 4. Cached favorites as offline/local filter
      if (avatars.length === 0) {
        const cached = (this.store.get('cachedFavoriteAvatars', []) as VRCAvatar[]) || []
        for (const av of cached) {
          if (av.id?.startsWith('avtr_') && matchesQuery(av) && !seen.has(av.id)) {
            seen.add(av.id)
            avatars.push(av)
          }
        }
      }

      if (avatars.length > 0) {
        return avatars.slice(0, limit)
      }

      // 5. Last resort: avatar worlds for discovery (NOT wearable — UI must treat wrld_ ids carefully)
      const worldQuery = cleanQuery ? `${query.trim()} Avatar` : 'Avatar'
      const avatarWorlds = await this.searchWorlds(worldQuery, Math.min(limit, 30), 'popularity', 'author_tag_avatar')
      const worldsFallback =
        avatarWorlds.length > 0
          ? avatarWorlds
          : await this.searchWorlds(worldQuery, Math.min(limit, 30), 'relevance')

      return worldsFallback.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description || `Avatar World by ${w.authorName} — open in Worlds to visit`,
        authorName: w.authorName,
        authorId: w.authorId,
        imageUrl: w.imageUrl,
        thumbnailImageUrl: w.thumbnailImageUrl || w.imageUrl,
        releaseStatus: 'public',
        tags: [...(w.tags || []), 'avatar_world_hub'],
        featured: true,
        updated_at: w.updated_at
      }))
    } catch (err) {
      console.error('Failed to search avatars:', err)
    }
    return []
  }

  public async getUserUploadedAvatars(releaseStatus: string = 'all'): Promise<VRCAvatar[]> {
    try {
      const res = await this.client.get(`/avatars?user=me&releaseStatus=${releaseStatus}&n=100`)
      if (Array.isArray(res.data)) {
        const avatars = res.data.map((a: any) => this.formatAvatar(a))
        this.store.set('cachedMyAvatars', avatars)
        return avatars
      }
    } catch (err) {
      console.error('Failed to fetch user uploaded avatars:', err)
    }
    return this.store.get('cachedMyAvatars', []) || []
  }

  public async getFavoriteAvatars(): Promise<VRCAvatar[]> {
    try {
      const hasVRCPlus = !!(
        this.currentUser?.hasVRCPlus ||
        this.currentUser?.tags?.includes('system_supporter')
      )

      // Fetch user's custom favorite group names if available
      const groupNamesMap = new Map<string, string>()
      try {
        const groupsRes = await this.client.get('/favorite/groups?ownerId=me&n=100').catch(() => null)
        if (groupsRes?.data && Array.isArray(groupsRes.data)) {
          groupsRes.data.forEach((g: any) => {
            if (g.name && g.displayName) {
              groupNamesMap.set(g.name, g.displayName)
            }
          })
        }
      } catch {}

      // 1. Fetch favorite avatar list (all slots)
      const favRes = await this.client.get('/favorites?type=avatar&n=100')
      if (Array.isArray(favRes.data) && favRes.data.length > 0) {
        const favItems = favRes.data
        const favGroupMap = new Map<string, { favoriteId: string; group: string; groupName: string; isVrcPlus: boolean }>()

        favItems.forEach((f: any) => {
          if (f.favoriteId) {
            const rawGroup = Array.isArray(f.tags) && f.tags.length > 0 ? f.tags[0] : 'avatars1'
            // avatars1 = free list; avatars2–avatars5 = VRC+ lists (avatars6 legacy)
            const isVrcPlusSlot = rawGroup !== 'avatars1' && rawGroup !== 'group_0'
            const customName = groupNamesMap.get(rawGroup) || (
              rawGroup === 'avatars1' ? 'Favorites 1 (Free)' :
              rawGroup === 'avatars2' ? 'Favorites 2 (VRC+)' :
              rawGroup === 'avatars3' ? 'Favorites 3 (VRC+)' :
              rawGroup === 'avatars4' ? 'Favorites 4 (VRC+)' :
              rawGroup === 'avatars5' ? 'Favorites 5 (VRC+)' :
              rawGroup === 'avatars6' ? 'Favorites 6 (VRC+ · Legacy)' :
              rawGroup.toUpperCase()
            )

            favGroupMap.set(f.favoriteId, {
              favoriteId: f.id,
              group: rawGroup,
              groupName: customName,
              isVrcPlus: isVrcPlusSlot
            })
          }
        })

        // Fetch avatar metadata for each favorite in parallel (chunks of 12)
        const avatarIds = Array.from(favGroupMap.keys())
        const results: VRCAvatar[] = []
        for (let i = 0; i < avatarIds.length; i += 12) {
          const chunk = avatarIds.slice(i, i + 12)
          const promises = chunk.map((id) =>
            this.client.get(`/avatars/${id}`).then((res) => {
              if (res.status === 200 && res.data?.id) {
                const formatted = this.formatAvatar(res.data)
                const favInfo = favGroupMap.get(formatted.id)
                if (favInfo) {
                  formatted.isFavorite = true
                  formatted.favoriteGroup = favInfo.group
                  formatted.favoriteGroupName = favInfo.groupName
                  formatted.favoriteId = favInfo.favoriteId
                  formatted.isVrcPlusGroup = favInfo.isVrcPlus
                  formatted.isVrcPlusLocked = favInfo.isVrcPlus && !hasVRCPlus
                }
                return formatted
              }
              return null
            }).catch(() => null)
          )
          const chunkAvatars = await Promise.all(promises)
          chunkAvatars.forEach((a) => {
            if (a) results.push(a)
          })
        }

        if (results.length > 0) {
          this.store.set('cachedFavoriteAvatars', results)
          return results
        }
      }
    } catch (err) {
      console.error('Failed to fetch favorite avatars:', err)
    }
    return this.store.get('cachedFavoriteAvatars', []) || []
  }

  public async selectAvatar(avatarId: string): Promise<{ success: boolean; error?: string; user?: VRCUser }> {
    try {
      const id = (avatarId || '').trim()
      if (!id.startsWith('avtr_')) {
        return {
          success: false,
          error: id.startsWith('wrld_')
            ? 'That result is an Avatar World hub, not a wearable avatar. Open it from the Worlds tab.'
            : 'Invalid avatar ID. Only avatars (avtr_…) can be equipped.'
        }
      }

      // Soft local guard — VRChat API is the source of truth if this is stale
      const cachedFavs = this.store.get('cachedFavoriteAvatars', []) as VRCAvatar[]
      const favMatch = cachedFavs.find((a) => a.id === id)
      const hasVRCPlus = !!(
        this.currentUser?.hasVRCPlus ||
        this.currentUser?.tags?.includes('system_supporter')
      )
      if (favMatch?.isVrcPlusLocked && !hasVRCPlus) {
        return {
          success: false,
          error: 'This avatar is in a VRC+ favorite slot. Move it to Favorites 1 (Free) or renew VRC+ to equip it.'
        }
      }

      // PUT /avatars/{id}/select returns CurrentUser (not Avatar)
      const res = await this.client.put(`/avatars/${id}/select`)
      if (res.status === 200 && res.data) {
        let updatedUser = res.data.id
          ? this.formatUser(res.data)
          : this.currentUser
            ? { ...this.currentUser }
            : undefined

        // Prefer a fresh /auth/user snapshot when the select body is incomplete
        if (!updatedUser?.id || !updatedUser.currentAvatarImageUrl) {
          try {
            const userRes = await this.client.get('/auth/user')
            if (userRes.status === 200 && userRes.data?.id) {
              updatedUser = this.formatUser(userRes.data)
            }
          } catch (refreshErr) {
            console.warn('Avatar selected but failed to refresh auth user:', refreshErr)
          }
        }

        if (updatedUser) {
          updatedUser.currentAvatarId = updatedUser.currentAvatarId || id
          // If API hasn't refreshed image URLs yet, keep prior thumbs rather than wiping them
          if (!updatedUser.currentAvatarThumbnailImageUrl && favMatch?.thumbnailImageUrl) {
            updatedUser.currentAvatarThumbnailImageUrl = favMatch.thumbnailImageUrl
            updatedUser.currentAvatarImageUrl = favMatch.imageUrl || favMatch.thumbnailImageUrl
          }
          this.currentUser = updatedUser
          this.store.set('lastUser', updatedUser)
          return { success: true, user: updatedUser }
        }

        return { success: true }
      }

      const apiMsg =
        res.data?.error?.message ||
        res.data?.message ||
        (res.status === 404
          ? 'Avatar not found or you no longer have access to wear it.'
          : res.status === 401
            ? 'Session expired — please log in again.'
            : `HTTP ${res.status}`)
      return { success: false, error: apiMsg }
    } catch (err: any) {
      console.error('Failed to select avatar:', err)
      return {
        success: false,
        error: err?.response?.data?.error?.message || err?.message || 'Failed to switch avatar in VRChat'
      }
    }
  }

  public async addFavoriteAvatar(avatarId: string, groupTag: string = 'avatars1'): Promise<{ success: boolean; favoriteId?: string; error?: string }> {
    try {
      const res = await this.client.post('/favorites', {
        type: 'avatar',
        favoriteId: avatarId,
        tags: [groupTag]
      })
      if (res.status === 200 || res.status === 201) {
        return { success: true, favoriteId: res.data?.id }
      }
      return { success: false, error: res.data?.error?.message || `HTTP ${res.status}` }
    } catch (err: any) {
      console.error('Failed to add favorite avatar:', err)
      return { success: false, error: err?.response?.data?.error?.message || err?.message || 'Failed to favorite avatar' }
    }
  }

  public async removeFavoriteAvatar(favoriteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.client.delete(`/favorites/${encodeURIComponent(favoriteId)}`)
      if (res.status === 200) {
        return { success: true }
      }
      return { success: false, error: res.data?.error?.message || `HTTP ${res.status}` }
    } catch (err: any) {
      console.error('Failed to remove favorite avatar:', err)
      return { success: false, error: err?.response?.data?.error?.message || err?.message || 'Failed to unfavorite avatar' }
    }
  }

  public async moveFavoriteAvatar(avatarId: string, currentFavoriteId: string, targetGroupTag: string): Promise<{ success: boolean; newFavoriteId?: string; error?: string }> {
    try {
      if (currentFavoriteId) {
        await this.removeFavoriteAvatar(currentFavoriteId)
      }
      const addRes = await this.addFavoriteAvatar(avatarId, targetGroupTag)
      return addRes
    } catch (err: any) {
      console.error('Failed to move favorite avatar:', err)
      return { success: false, error: err?.message || 'Failed to move avatar to new list' }
    }
  }

  public async getUserInventory(types?: string): Promise<VRCInventoryItem[]> {
    try {
      const typeQuery = types ? `&types=${encodeURIComponent(types)}` : ''
      const res = await this.client.get(`/inventory?n=100${typeQuery}`)
      if (Array.isArray(res.data)) {
        const items = res.data.map((item: any) => ({
          id: item.id || item.itemId || '',
          name: item.name || item.item?.name || 'Untitled Item',
          description: item.description || item.item?.description || '',
          imageUrl: item.imageUrl || item.item?.imageUrl || item.iconUrl || '',
          itemType: item.type || item.item?.type || 'item',
          tags: Array.isArray(item.tags) ? item.tags : item.item?.tags || [],
          flags: Array.isArray(item.flags) ? item.flags : item.item?.flags || [],
          createdAt: item.created_at || item.createdAt,
          updatedAt: item.updated_at || item.updatedAt,
          authorName: item.authorName || item.item?.authorName,
          authorId: item.authorId || item.item?.authorId,
          assetUrl: item.assetUrl || item.item?.assetUrl,
          data: item.data || item.item?.data
        }))
        this.store.set('cachedInventory', items)
        return items
      }
    } catch (err) {
      console.error('Failed to fetch user inventory:', err)
    }
    return this.store.get('cachedInventory', []) || []
  }

  public async getUserPrints(userId?: string): Promise<VRCPrint[]> {
    try {
      const targetId = userId || this.currentUser?.id || 'me'
      const endpoint = targetId === 'me' ? '/prints' : `/prints/user/${encodeURIComponent(targetId)}`
      const res = await this.client.get(`${endpoint}?n=100`)
      if (Array.isArray(res.data)) {
        const prints: VRCPrint[] = res.data.map((p: any) => ({
          id: p.id || '',
          name: p.name || p.note || 'Photo Print',
          description: p.description || p.note || '',
          fileId: p.fileId || '',
          imageUrl: p.imageUrl || p.image?.url || (p.fileId ? `https://api.vrchat.cloud/api/1/file/${p.fileId}/1/file` : ''),
          thumbnailUrl: p.thumbnailUrl || p.image?.thumbnailUrl || p.imageUrl || '',
          authorId: p.authorId || p.ownerId || targetId,
          authorName: p.authorName || this.currentUser?.displayName || 'User',
          createdAt: p.created_at || p.createdAt || new Date().toISOString(),
          tags: Array.isArray(p.tags) ? p.tags : []
        }))
        this.store.set('cachedPrints', prints)
        return prints
      }
    } catch (err) {
      console.error('Failed to fetch user prints:', err)
    }
    return this.store.get('cachedPrints', []) || []
  }

  public async getUserProps(authorId?: string): Promise<VRCProp[]> {
    try {
      const targetId = authorId || this.currentUser?.id || 'me'
      const res = await this.client.get(`/props?authorId=${encodeURIComponent(targetId)}&n=100`)
      if (Array.isArray(res.data)) {
        const props: VRCProp[] = res.data.map((p: any) => ({
          id: p.id || '',
          name: p.name || 'Custom Prop',
          description: p.description || '',
          imageUrl: p.imageUrl || p.iconUrl || '',
          assetUrl: p.assetUrl || '',
          authorId: p.authorId || targetId,
          authorName: p.authorName || this.currentUser?.displayName || 'User',
          tags: Array.isArray(p.tags) ? p.tags : [],
          itemType: p.type || 'prop',
          createdAt: p.created_at || p.createdAt
        }))
        this.store.set('cachedProps', props)
        return props
      }
    } catch (err) {
      console.error('Failed to fetch user props:', err)
    }
    return this.store.get('cachedProps', []) || []
  }

  public async getUserVrcPlusOverview(): Promise<{
    hasVRCPlus: boolean
    iconSlotsUsed: number
    iconSlotsTotal: number
    printSlotsUsed: number
    printSlotsTotal: number
    prints: VRCPrint[]
    inventory: VRCInventoryItem[]
    props: VRCProp[]
    customIcons: string[]
  }> {
    const hasVRCPlus = !!(this.currentUser?.hasVRCPlus || this.currentUser?.tags?.includes('system_supporter'))

    const [prints, inventory, props] = await Promise.all([
      this.getUserPrints(),
      this.getUserInventory(),
      this.getUserProps()
    ])

    const customIcons = this.currentUser?.profilePicOverride ? [this.currentUser.profilePicOverride] : []
    if (this.currentUser?.userIcon && !customIcons.includes(this.currentUser.userIcon)) {
      customIcons.push(this.currentUser.userIcon)
    }

    return {
      hasVRCPlus,
      iconSlotsUsed: customIcons.length,
      iconSlotsTotal: hasVRCPlus ? 64 : 1,
      printSlotsUsed: prints.length,
      printSlotsTotal: hasVRCPlus ? 100 : 0,
      prints,
      inventory,
      props,
      customIcons
    }
  }

  private formatAvatar(data: any): VRCAvatar {
    return {
      id: data.id || '',
      name: data.name || 'Untitled Avatar',
      description: data.description || '',
      authorName: data.authorName || 'Unknown Creator',
      authorId: data.authorId || '',
      imageUrl: data.imageUrl || '',
      thumbnailImageUrl: data.thumbnailImageUrl || data.imageUrl || '',
      assetUrl: data.assetUrl || '',
      releaseStatus: data.releaseStatus || 'public',
      tags: Array.isArray(data.tags) ? data.tags : [],
      unityPackages: Array.isArray(data.unityPackages)
        ? data.unityPackages.map((p: any) => ({ platform: p.platform, unityVersion: p.unityVersion }))
        : [],
      featured: data.featured || false,
      updated_at: data.updated_at
    }
  }

  private calculateTrustRank(tags: string[], developerType?: string): 'visitor' | 'new_user' | 'user' | 'known' | 'trusted' | 'admin' {
    if (developerType === 'internal' || tags.includes('admin_moderator') || tags.includes('admin_scripting_access')) return 'admin'
    if (tags.includes('system_trust_veteran')) return 'trusted'
    if (tags.includes('system_trust_trusted')) return 'known'
    if (tags.includes('system_trust_known')) return 'user'
    if (tags.includes('system_trust_basic')) return 'new_user'
    return 'visitor'
  }

  private formatUser(data: any): VRCUser {
    const tags = Array.isArray(data.tags) ? data.tags : []
    const hasVRCPlus = tags.includes('system_supporter') || !!data.profilePicOverride
    const displayName = data.displayName || data.username || 'Unknown'
    const userId = data.id || ''

    // Record name in local history
    if (userId && displayName) {
      this.store.recordDisplayName(userId, displayName)
    }

    // Merge API pastDisplayNames with locally recorded history
    const apiPastNames: { displayName: string; updatedAt?: string }[] = Array.isArray(data.pastDisplayNames)
      ? data.pastDisplayNames.map((p: any) => ({ displayName: p.displayName, updatedAt: p.updatedAt }))
      : []
    const localPastNames = userId ? this.store.getNameHistory(userId) : []

    const nameMap = new Map<string, { displayName: string; updatedAt?: string }>()
    apiPastNames.forEach((n) => nameMap.set(n.displayName, n))
    localPastNames.forEach((n) => {
      if (!nameMap.has(n.displayName)) nameMap.set(n.displayName, n)
    })
    // Remove current display name from past names list
    nameMap.delete(displayName)

    const pastDisplayNames = Array.from(nameMap.values())

    // Attach custom nickname and notes
    const friendNotes = this.store.getFriendNotes()
    const userNote = userId ? friendNotes[userId] : null

    return {
      id: userId,
      username: data.username || '',
      displayName: displayName,
      pastDisplayNames,
      trustRank: this.calculateTrustRank(tags, data.developerType),
      nickname: userNote?.nickname || '',
      customNote: userNote?.note || '',
      userIcon: data.userIcon || '',
      profilePicOverride: data.profilePicOverride || '',
      currentAvatarImageUrl: data.currentAvatarImageUrl || '',
      currentAvatarThumbnailImageUrl: data.currentAvatarThumbnailImageUrl || data.currentAvatarImageUrl || '',
      currentAvatarId: data.currentAvatar || data.currentAvatarId || '',
      currentAvatarTags: data.currentAvatarTags || [],
      bio: data.bio || '',
      bioLinks: data.bioLinks || [],
      status: (data.status || 'offline').toLowerCase(),
      statusDescription: data.statusDescription || '',
      state: data.state || 'offline',
      tags: tags,
      developerType: data.developerType || 'none',
      last_login: data.last_login || data.last_activity,
      last_activity: data.last_activity,
      last_platform: data.last_platform || 'standalonewindows',
      friendKey: data.friendKey,
      location: data.location || 'offline',
      worldId: data.worldId,
      instanceId: data.instanceId,
      isFriend: data.isFriend ?? true,
      hasVRCPlus,
      dateJoined: data.date_joined || data.dateJoined
    }
  }

  private formatWorld(data: any): VRCWorld {
    return {
      id: data.id || '',
      name: data.name || 'Untitled World',
      description: data.description || '',
      authorName: data.authorName || 'Unknown Author',
      authorId: data.authorId || '',
      capacity: data.capacity || 0,
      imageUrl: data.imageUrl || '',
      thumbnailImageUrl: data.thumbnailImageUrl || data.imageUrl || '',
      occupants: data.occupants ?? data.publicOccupants ?? 0,
      publicOccupants: data.publicOccupants ?? 0,
      privateOccupants: data.privateOccupants ?? 0,
      favorites: data.favorites || 0,
      visits: data.visits || 0,
      tags: data.tags || [],
      updated_at: data.updated_at
    }
  }
}
