import Fuse, { type IFuseOptions } from "fuse.js"
import { Download, Heart, Menu, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { fetchAllTags, getTagCount, type SearchResult, searchTags, type Tag } from "./api/tags"
import {
  getCachedAllTags,
  getTagCacheMeta,
  storeAllTags,
  type TagCacheMeta,
  touchTagCache,
} from "./cache/tagDatabase"
import { formatKey } from "./formatKey"
import SettingsDrawer from "./SettingsDrawer"

function formatDownloads(n: number): string {
  if (n < 100) return String(n)
  if (n < 1000) return `${Math.floor(n / 100) * 100}+`
  if (n < 10000) return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+`
  return `${Math.floor(n / 1000)}k+`
}

// Character ranges [start, end] (inclusive) from Fuse match indices
type MatchRanges = ReadonlyArray<readonly [number, number]>
// Per-field match ranges for one tag, keyed by field name
type FieldMatches = Record<string, MatchRanges>

const FUSE_LIMIT = 100
const SURPRISE_COUNT = 7

const STALE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const JITTER_MS = Math.random() * 24 * 60 * 60 * 1000 // 0–24h spread per session

function isCacheStale(cachedAt: string): boolean {
  return Date.now() - new Date(cachedAt).getTime() > STALE_MS + JITTER_MS
}

const FUSE_KEYS = ["id", "title", "altTitle", "version", "arranger"] as const

const FUSE_OPTIONS: IFuseOptions<Tag> = {
  keys: [
    { name: "id", weight: 4 },
    { name: "title", weight: 3 },
    { name: "altTitle", weight: 2 },
    { name: "version", weight: 2 },
    { name: "arranger", weight: 1 },
  ],
  includeMatches: true,
  threshold: 0.4,
  minMatchCharLength: 2,
  ignoreLocation: true,
  useExtendedSearch: true,
}

// For multi-word queries, require each term to match at least one field.
// This lets "coney smith" find a tag titled "Coney Island" arranged by "Smith".
// Terms shorter than minMatchCharLength are dropped so a trailing "b" doesn't
// exclude results that would otherwise match the longer terms.
function buildFuseQuery(q: string) {
  const terms = q
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
  if (terms.length <= 1) return terms[0] ?? q
  return {
    $and: terms.map((term) => ({ $or: FUSE_KEYS.map((key) => ({ [key]: term })) })),
  }
}

// Highlight a substring match (used in API mode)
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase()
  if (!q || !text) return text

  const parts: React.ReactNode[] = []
  const lower = text.toLowerCase()
  let last = 0
  let idx = lower.indexOf(q)

  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx))
    parts.push(<mark key={idx}>{text.slice(idx, idx + q.length)}</mark>)
    last = idx + q.length
    idx = lower.indexOf(q, last)
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

// Highlight using Fuse character indices (used in local mode)
function highlightWithIndices(text: string, indices: MatchRanges): React.ReactNode {
  if (!indices.length) return text
  const parts: React.ReactNode[] = []
  let last = 0
  for (const [start, end] of indices) {
    if (start > last) parts.push(text.slice(last, start))
    parts.push(<mark key={start}>{text.slice(start, end + 1)}</mark>)
    last = end + 1
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

interface Props {
  initialQuery: string
  initialResult: SearchResult | null
  favorites: Record<string, Tag>
  onSelectTag: (tag: Tag, query: string, result: SearchResult | null) => void
  onRemoveFavorite: (id: string) => void
}

export default function SearchPage({
  initialQuery,
  initialResult,
  favorites,
  onSelectTag,
  onRemoveFavorite,
}: Props) {
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search")
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<SearchResult | null>(initialResult)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localTags, setLocalTags] = useState<Tag[] | null>(null)
  const [cacheMeta, setCacheMeta] = useState<TagCacheMeta | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{
    fetched: number
    total: number
  } | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const [localMatches, setLocalMatches] = useState<Map<string, FieldMatches>>(new Map())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filters, setFilters] = useState({ type: "", parts: "", learningTracks: false })

  const typeOptions = useMemo(
    () => (localTags ? [...new Set(localTags.map((t) => t.type).filter(Boolean))].sort() : []),
    [localTags],
  )

  const partsOptions = useMemo(
    () =>
      localTags
        ? [...new Set(localTags.map((t) => t.parts).filter(Boolean))].sort((a, b) => +a - +b)
        : [],
    [localTags],
  )

  const fuseRef = useRef<Fuse<Tag> | null>(null)
  // True when showing Surprise Me results (no query). Used to prevent the
  // fuzzy search effect from clearing the result on remount.
  const isSurpriseRef = useRef(!initialQuery && !!initialResult)
  const isLocalMode = localTags !== null

  // Load local tag database on mount, then check staleness in background
  useEffect(() => {
    let cancelled = false

    async function refreshIfStale(meta: TagCacheMeta | null) {
      if (!meta || !isCacheStale(meta.cachedAt) || isDownloading) return
      setIsBackgroundRefreshing(true)
      try {
        const liveCount = await getTagCount()
        if (cancelled) return
        if (liveCount === meta.count) {
          // Catalog unchanged — just reset the staleness timer
          const newMeta = await touchTagCache()
          if (!cancelled) setCacheMeta(newMeta)
        } else {
          // New tags available — re-download silently
          const newTags = await fetchAllTags(() => {})
          if (cancelled) return
          await storeAllTags(newTags)
          const newMeta = await getTagCacheMeta()
          if (cancelled) return
          setLocalTags(newTags)
          setCacheMeta(newMeta)
        }
      } catch {
        // Best-effort; user can always refresh manually
      } finally {
        if (!cancelled) setIsBackgroundRefreshing(false)
      }
    }

    ;(async () => {
      const [tags, meta] = await Promise.all([getCachedAllTags(), getTagCacheMeta()])
      if (cancelled) return

      if (!tags || tags.length === 0) {
        // No local cache — seed from the bundled snapshot so local mode is
        // available immediately without the user pressing "Download all tags".
        setIsSeeding(true)
        try {
          const resp = await fetch(`${import.meta.env.BASE_URL}tags-snapshot.json`)
          if (!resp.ok || cancelled) return
          const snapshot = (await resp.json()) as { cachedAt: string; tags: Tag[] }
          if (cancelled) return
          await storeAllTags(snapshot.tags, snapshot.cachedAt)
          const [seededTags, seededMeta] = await Promise.all([
            getCachedAllTags(),
            getTagCacheMeta(),
          ])
          if (cancelled || !seededTags || seededTags.length === 0) return
          setLocalTags(seededTags)
          setCacheMeta(seededMeta)
          // Kick off a background refresh if the bundled snapshot is already stale.
          await refreshIfStale(seededMeta)
        } catch {
          // Snapshot unavailable — fall back to API / manual-download mode.
        } finally {
          if (!cancelled) setIsSeeding(false)
        }
        return
      }

      setLocalTags(tags)
      setCacheMeta(meta)
      await refreshIfStale(meta)
    })()

    return () => {
      cancelled = true
    }
  }, [isDownloading])

  // Build Fuse index when local tags are loaded
  useEffect(() => {
    if (!localTags) {
      fuseRef.current = null
      return
    }
    fuseRef.current = new Fuse(localTags, FUSE_OPTIONS)
  }, [localTags])

  // Run fuzzy search on every query change (or when the index is first built)
  useEffect(() => {
    const fuse = fuseRef.current
    if (!fuse) return

    const q = query.trim()
    if (!q) {
      if (isSurpriseRef.current) return // Preserve Surprise Me results on remount
      setResult(null)
      setLocalMatches(new Map())
      return
    }
    isSurpriseRef.current = false

    const all = fuse.search(buildFuseQuery(q))
    const filtered = all.filter((r) => {
      const tag = r.item
      if (filters.type && tag.type !== filters.type) return false
      if (filters.parts && tag.parts !== filters.parts) return false
      if (filters.learningTracks && !tag.hasLearningTracks) return false
      return true
    })
    const sliced = filtered.slice(0, FUSE_LIMIT)

    setResult({
      available: filtered.length,
      count: sliced.length,
      tags: sliced.map((r) => r.item),
    })

    setLocalMatches(
      new Map(
        sliced.map((r) => [
          r.item.id,
          Object.fromEntries(
            // biome-ignore lint/style/noNonNullAssertion: m.key is checked truthy by filter above
            (r.matches ?? []).filter((m) => m.key).map((m) => [m.key!, m.indices as MatchRanges]),
          ),
        ]),
      ),
    )
  }, [query, filters])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (isLocalMode) return
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchTags(q)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadAll() {
    setIsDownloading(true)
    setError(null)
    setDownloadProgress({ fetched: 0, total: 0 })
    try {
      const tags = await fetchAllTags((fetched, total) => {
        setDownloadProgress({ fetched, total })
      })
      await storeAllTags(tags)
      const meta = await getTagCacheMeta()
      setLocalTags(tags)
      setCacheMeta(meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed")
    } finally {
      setIsDownloading(false)
      setDownloadProgress(null)
    }
  }

  function handleSurpriseMe() {
    if (!localTags) return
    const pool = localTags.filter((tag) => {
      if (filters.type && tag.type !== filters.type) return false
      if (filters.parts && tag.parts !== filters.parts) return false
      if (filters.learningTracks && !tag.hasLearningTracks) return false
      return true
    })
    const copy = [...pool]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    const sampled = copy.slice(0, SURPRISE_COUNT)
    isSurpriseRef.current = true
    setResult({ available: pool.length, count: sampled.length, tags: sampled })
    setLocalMatches(new Map())
  }

  const favoriteTags = Object.values(favorites)

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="m-0 text-2xl font-bold shrink-0">Tagnabbit</h1>
        <div className="relative flex bg-[var(--text-muted)]/25 rounded-full p-0.5 text-sm">
          <div
            className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-200 bg-[var(--accent)]"
            style={{
              left: activeTab === "search" ? "2px" : "50%",
              right: activeTab === "favorites" ? "2px" : "50%",
            }}
          />
          <button
            type="button"
            className={`relative z-10 px-3 py-0.5 w-1/2 rounded-full transition-colors duration-150 font-medium ${activeTab === "search" ? "bg-[var(--accent)]/25 text-[var(--bg-surface)]" : "bg-[var(--bg)] text-[var(--text-muted)]"}`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
          <button
            type="button"
            className={`relative z-10 px-3 py-0.5 w-1/2 rounded-full transition-colors duration-150 font-medium ${activeTab === "favorites" ? "bg-[var(--accent)]/25 text-[var(--bg-surface)]" : "bg-[var(--bg)] text-[var(--text-muted)]"}`}
            onClick={() => setActiveTab("favorites")}
          >
            Favorites
          </button>
        </div>
      </div>
      <button
        type="button"
        className="fixed top-3 right-3 z-50 py-1 px-2 bg-transparent border-transparent leading-none"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        <Menu size={22} color="var(--text-muted)" />
      </button>

      {activeTab === "favorites" && (
        <>
          {favoriteTags.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">
              No favorites yet. Open a tag and tap the heart to save it here.
            </p>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {favoriteTags.map((tag) => (
                <li
                  key={tag.id}
                  className="py-3 px-4 border border-[var(--border)] rounded-lg cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 hover:outline hover:outline-2 hover:outline-[var(--accent)]"
                  onClick={() => onSelectTag(tag, "", null)}
                  onKeyDown={(e) => e.key === "Enter" && onSelectTag(tag, "", null)}
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold">{tag.title}</span>
                      {tag.altTitle && (
                        <span className="text-[var(--text-muted)] text-[0.9em]">
                          {" "}
                          — {tag.altTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[0.8rem] text-[var(--text-muted)] whitespace-nowrap">
                        #{tag.id}
                      </span>
                      <button
                        type="button"
                        className="py-[0.2em] px-[0.3em] bg-transparent border-transparent leading-none"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveFavorite(tag.id)
                        }}
                        aria-label="Remove from favorites"
                      >
                        <Heart size={14} fill="currentColor" color="var(--accent)" />
                      </button>
                    </div>
                  </div>
                  {tag.version && (
                    <div className="text-[0.85em] text-[var(--text-muted)] italic">
                      {tag.version}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-[0.8rem] text-[var(--text-muted)]">
                    {tag.arranger && <span>{tag.arranger}</span>}
                    {tag.key && <span>{formatKey(tag.key)}</span>}
                    {tag.parts && <span>{tag.parts} parts</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === "search" && (
        <>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search barbershop tags..."
                className="w-full py-2 pl-9 pr-3 text-base border border-[var(--border)] rounded-md bg-inherit text-inherit focus:outline-2 focus:outline-[var(--accent)] focus:border-transparent"
                disabled={loading || isDownloading}
              />
            </div>
            {!isLocalMode && (
              <button type="submit" disabled={loading || !query.trim() || isDownloading}>
                {loading ? "Searching…" : "Search"}
              </button>
            )}
          </form>

          {isSeeding && (
            <p className="text-sm text-[var(--text-muted)] m-0">Loading tag database…</p>
          )}

          {isDownloading && downloadProgress && (
            <p className="text-sm text-[var(--text-muted)] m-0">
              Downloading… {downloadProgress.fetched.toLocaleString()}
              {downloadProgress.total > 0 && ` / ${downloadProgress.total.toLocaleString()}`}
              {" tags"}
            </p>
          )}

          {isLocalMode && (
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="font-sans text-sm py-[0.3rem] px-2 border border-[var(--border)] rounded-md bg-[var(--bg-surface)] text-[var(--text)] cursor-pointer"
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="font-sans text-sm py-[0.3rem] px-2 border border-[var(--border)] rounded-md bg-[var(--bg-surface)] text-[var(--text)] cursor-pointer"
                value={filters.parts}
                onChange={(e) => setFilters((f) => ({ ...f, parts: e.target.value }))}
              >
                <option value="">All parts</option>
                {partsOptions.map((p) => (
                  <option key={p} value={p}>
                    {p} parts
                  </option>
                ))}
              </select>
              {/* Hide the learning track filter until we can actually play the learning tracks! */}
              {/* <label className="hidden flex items-center gap-[0.375rem] text-sm cursor-pointer text-[#aaa]">
            <input
              type="checkbox"
              checked={filters.learningTracks}
              onChange={e => setFilters(f => ({ ...f, learningTracks: e.target.checked }))}
            />
            Learning tracks
          </label> */}
              <button type="button" className="ml-auto text-sm" onClick={handleSurpriseMe}>
                Surprise Me!
              </button>
            </div>
          )}

          {!isLocalMode && !isDownloading && !isSeeding && (
            <button type="button" className="self-start text-sm" onClick={handleDownloadAll}>
              Download all tags for instant offline search
            </button>
          )}

          {error && (
            <p className="text-[#f87171] m-0" role="alert">
              {error}
            </p>
          )}

          {result && result.tags.length > 0 && (
            <>
              <p className="text-sm text-[var(--text-muted)] m-0">
                {isLocalMode
                  ? `${result.available.toLocaleString()} matches${result.available > result.count ? `, showing ${result.count}` : ""}`
                  : `${result.available.toLocaleString()} tags found, showing ${result.count}`}
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                {result.tags.map((tag) => {
                  const fm = localMatches.get(tag.id)
                  const hlField = (text: string, field: string) =>
                    fm?.[field] ? highlightWithIndices(text, fm[field]) : highlight(text, query)

                  return (
                    <li
                      key={tag.id}
                      className="py-3 px-4 border border-[var(--border)] rounded-lg cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 hover:outline hover:outline-2 hover:outline-[var(--accent)] focus:bg-[var(--accent)]/10 focus:outline focus:outline-2 focus:outline-[var(--accent)]"
                      onClick={() => onSelectTag(tag, query, result)}
                      onKeyDown={(e) => e.key === "Enter" && onSelectTag(tag, query, result)}
                    >
                      <div className="flex justify-between items-baseline gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold">{hlField(tag.title, "title")}</span>
                          {tag.altTitle && (
                            <span className="text-[var(--text-muted)] text-[0.9em]">
                              {" "}
                              — {hlField(tag.altTitle, "altTitle")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {favorites[tag.id] && (
                            <Heart size={12} fill="currentColor" color="var(--accent)" />
                          )}
                          <span className="text-[0.8rem] text-[var(--text-muted)] whitespace-nowrap">
                            #{hlField(tag.id, "id")}
                          </span>
                        </div>
                      </div>
                      {tag.version && (
                        <div className="text-[0.85em] text-[var(--text-muted)] italic">
                          {hlField(tag.version, "version")}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-[0.8rem] text-[var(--text-muted)]">
                        {tag.arranger && <span>{hlField(tag.arranger, "arranger")}</span>}
                        {tag.key && <span>{formatKey(tag.key)}</span>}
                        {tag.parts && <span>{tag.parts} parts</span>}
                        <span className="inline-flex items-center gap-1">
                          <Download size={11} />
                          {formatDownloads(tag.downloaded)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {result && result.tags.length === 0 && query.trim() && (
            <p className="text-[var(--text-muted)] text-sm">No tags found for "{query.trim()}".</p>
          )}
        </>
      )}

      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cacheMeta={cacheMeta}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        isBackgroundRefreshing={isBackgroundRefreshing}
        onRefreshCache={handleDownloadAll}
      />
    </div>
  )
}
