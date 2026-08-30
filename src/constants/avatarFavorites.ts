/**
 * VRChat avatar favorite lists:
 * - 1 free list (avatars1)
 * - 4 VRC+ exclusive lists (avatars2–avatars5)
 * = 5 lists total. 50 slots per list (250 with VRC+, 50 without).
 */

export interface AvatarFavoriteList {
  tag: string
  name: string
  shortName: string
  isVrcPlus: boolean
  slots: number
}

export const FREE_AVATAR_LIST_TAG = 'avatars1'
export const SLOTS_PER_AVATAR_LIST = 50
export const FREE_AVATAR_SLOTS = SLOTS_PER_AVATAR_LIST
export const VRC_PLUS_AVATAR_LIST_COUNT = 4
export const TOTAL_AVATAR_LISTS = 1 + VRC_PLUS_AVATAR_LIST_COUNT
export const TOTAL_AVATAR_SLOTS_WITH_VRC_PLUS = TOTAL_AVATAR_LISTS * SLOTS_PER_AVATAR_LIST

export const AVATAR_FAVORITE_LISTS: AvatarFavoriteList[] = [
  {
    tag: 'avatars1',
    name: 'Favorites 1 (Free)',
    shortName: 'List 1 · Free',
    isVrcPlus: false,
    slots: SLOTS_PER_AVATAR_LIST
  },
  {
    tag: 'avatars2',
    name: 'Favorites 2 (VRC+)',
    shortName: 'List 2 · VRC+',
    isVrcPlus: true,
    slots: SLOTS_PER_AVATAR_LIST
  },
  {
    tag: 'avatars3',
    name: 'Favorites 3 (VRC+)',
    shortName: 'List 3 · VRC+',
    isVrcPlus: true,
    slots: SLOTS_PER_AVATAR_LIST
  },
  {
    tag: 'avatars4',
    name: 'Favorites 4 (VRC+)',
    shortName: 'List 4 · VRC+',
    isVrcPlus: true,
    slots: SLOTS_PER_AVATAR_LIST
  },
  {
    tag: 'avatars5',
    name: 'Favorites 5 (VRC+)',
    shortName: 'List 5 · VRC+',
    isVrcPlus: true,
    slots: SLOTS_PER_AVATAR_LIST
  }
]

const LIST_BY_TAG = new Map(AVATAR_FAVORITE_LISTS.map((list) => [list.tag, list]))

/** Legacy / extra API tags still treated as VRC+ slots. */
const LEGACY_VRC_PLUS_TAGS = new Set(['avatars6'])

export function isVrcPlusAvatarList(tag: string): boolean {
  if (tag === FREE_AVATAR_LIST_TAG || tag === 'group_0') return false
  if (LEGACY_VRC_PLUS_TAGS.has(tag)) return true
  const list = LIST_BY_TAG.get(tag)
  return list?.isVrcPlus ?? true
}

export function getAvatarListDisplayName(tag: string, customName?: string): string {
  if (customName?.trim()) return customName
  return LIST_BY_TAG.get(tag)?.name ?? tag.toUpperCase()
}

export function getAvatarListShortName(tag: string): string {
  return LIST_BY_TAG.get(tag)?.shortName ?? tag
}
