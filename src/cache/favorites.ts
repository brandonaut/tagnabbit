import type { Tag } from "../api/tags"

const FAVORITES_KEY = "favorites"

export function getFavorites(): Record<string, Tag> {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "{}") as Record<string, Tag>
  } catch {
    return {}
  }
}

export function isFavorite(id: string): boolean {
  return id in getFavorites()
}

export function addFavorite(tag: Tag): void {
  const favs = getFavorites()
  favs[tag.id] = tag
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
}

export function removeFavorite(id: string): void {
  const favs = getFavorites()
  delete favs[id]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
}

// Returns true if now favorited, false if removed
export function toggleFavorite(tag: Tag): boolean {
  if (isFavorite(tag.id)) {
    removeFavorite(tag.id)
    return false
  }
  addFavorite(tag)
  return true
}

export function getFavoriteSheetUrls(): Set<string> {
  const favs = getFavorites()
  const urls = new Set<string>()
  for (const tag of Object.values(favs)) {
    if (tag.sheetMusicUrl) urls.add(tag.sheetMusicUrl)
    if (tag.sheetMusicAltUrl) urls.add(tag.sheetMusicAltUrl)
  }
  return urls
}
