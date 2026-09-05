import Fuse, { type FuseResult, type IFuseOptions } from "fuse.js"
import { Dices, Menu, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useSearchParams } from "wouter"
import { fetchAllTags, getTagCount, type SearchResult, type Tag } from "./api/tags"
import {
  getCachedAllTags,
  getTagCacheMeta,
  storeAllTags,
  type TagCacheMeta,
  touchTagCache,
} from "./cache/tagDatabase"
import SettingsDrawer from "./SettingsDrawer"
import { type FieldMatches, type MatchRanges, TagListItem } from "./TagListItem"

const FUSE_LIMIT = 100
const ID_PREFIX_LIMIT = 20
const PURE_NUMERIC = /^\d+$/
const SURPRISE_COUNT = 7

const STALE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const JITTER_MS = Math.random() * 24 * 60 * 60 * 1000 // 0–24h spread per session

function isCacheStale(cachedAt: string): boolean {
  return Date.now() - new Date(cachedAt).getTime() > STALE_MS + JITTER_MS
}

// Priority order for the text pass: a tag only falls through to the next
// field if it didn't already match a higher-priority one.
const FUSE_FIELDS = ["title", "altTitle", "arranger", "version"] as const

const FUSE_OPTIONS: Omit<IFuseOptions<Tag>, "keys"> = {
  includeMatches: true,
  includeScore: true,
  findAllMatches: false,
  threshold: 0.3,
  minMatchCharLength: 2,
  ignoreLocation: true,
}

// Snapshot of the current result, stashed on the /search history entry so
// it survives visiting a tag and coming back — the only way to recover
// Surprise Me's random sample, which isn't derivable from the URL.
interface SearchSnapshot {
  q: string
  type: string
  parts: string
  tagIds: string[]
  available: number
}

function isSearchSnapshot(value: unknown): value is SearchSnapshot {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as SearchSnapshot).q === "string" &&
    Array.isArray((value as SearchSnapshot).tagIds)
  )
}

interface Props {
  favorites: Record<string, Tag>
}

export default function SearchPage({ favorites }: Props) {
  const [, navigate] = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "")
  const [result, setResult] = useState<SearchResult | null>(null)
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
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [localMatches, setLocalMatches] = useState<Map<string, FieldMatches>>(new Map())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filters, setFilters] = useState(() => ({
    type: searchParams.get("type") ?? "",
    parts: searchParams.get("parts") ?? "",
    learningTracks: false,
  }))

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

  const fuseRef = useRef<Fuse<Tag>[] | null>(null)
  // True when showing Surprise Me results (no query). Used to prevent the
  // fuzzy search effect from clearing the result on remount.
  const isSurpriseRef = useRef(false)
  // A history-state snapshot left by a prior mount, pending re-application
  // once localTags loads. Only used if it matches the current URL exactly.
  const pendingSnapshotRef = useRef<SearchSnapshot | null>(
    (() => {
      const snapshot = isSearchSnapshot(history.state) ? history.state : null
      if (
        snapshot &&
        snapshot.q === (searchParams.get("q") ?? "") &&
        snapshot.type === (searchParams.get("type") ?? "") &&
        snapshot.parts === (searchParams.get("parts") ?? "")
      ) {
        return snapshot
      }
      return null
    })(),
  )
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

  // Debounce the query so Fuse doesn't run on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(id)
  }, [query])

  // Reflect the debounced query and filters in the URL so search state is
  // shareable/refresh-safe (`replace: true` avoids a history entry per
  // keystroke), and snapshot the current result as history state in the same
  // call so a later back-navigation can restore it exactly — this has to be
  // one combined replace, not two separate ones, since a second replaceState
  // call would silently wipe out whatever state the first one just set.
  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQuery) next.set("q", debouncedQuery)
    if (filters.type) next.set("type", filters.type)
    if (filters.parts) next.set("parts", filters.parts)
    const snapshot: SearchSnapshot | undefined = result
      ? {
          q: debouncedQuery.trim(),
          type: filters.type,
          parts: filters.parts,
          tagIds: result.tags.map((t) => t.id),
          available: result.available,
        }
      : undefined
    setSearchParams(next, { replace: true, state: snapshot })
  }, [debouncedQuery, filters.type, filters.parts, result, setSearchParams])

  // Build Fuse index when local tags are loaded
  useEffect(() => {
    if (!localTags) {
      fuseRef.current = null
      return
    }
    fuseRef.current = FUSE_FIELDS.map(
      (field) => new Fuse(localTags, { ...FUSE_OPTIONS, keys: [field] }),
    )
  }, [localTags])

  // Run search on every query change (or when the index is first built)
  useEffect(() => {
    const fuseIndexes = fuseRef.current
    if (!fuseIndexes || !localTags) return

    const q = debouncedQuery.trim()
    if (!q) {
      if (isSurpriseRef.current) return
      setResult(null)
      setLocalMatches(new Map())
      return
    }
    isSurpriseRef.current = false

    function passesFilters(tag: Tag): boolean {
      if (filters.type && tag.type !== filters.type) return false
      if (filters.parts && tag.parts !== filters.parts) return false
      if (filters.learningTracks && !tag.hasLearningTracks) return false
      return true
    }

    // ID pass (pure numeric queries only)
    let pinnedTag: Tag | undefined
    let allIdPrefixMatches: Tag[] = []
    let idPrefixMatches: Tag[] = []

    if (PURE_NUMERIC.test(q)) {
      pinnedTag = localTags.find((t) => t.id === q && passesFilters(t))
      allIdPrefixMatches = localTags.filter(
        (t) => t.id.startsWith(q) && t.id !== q && passesFilters(t),
      )
      idPrefixMatches = [...allIdPrefixMatches]
        .sort((a, b) => (b.downloaded ?? 0) - (a.downloaded ?? 0))
        .slice(0, ID_PREFIX_LIMIT)
    }

    // Text pass: search fields in priority order. A tag that matches a
    // higher-priority field is excluded from later fields, so scores never
    // combine across fields (e.g. a title match always outranks an
    // altTitle-only match, no matter how strong the altTitle match is).
    const matchedIds = new Set<string>()
    const fuseAll: FuseResult<Tag>[] = []
    for (const fuseForField of fuseIndexes) {
      const tierResults = fuseForField
        .search(q)
        .filter((r) => !matchedIds.has(r.item.id))
        .sort((a, b) => {
          const scoreDiff = (a.score ?? 0) - (b.score ?? 0)
          if (scoreDiff !== 0) return scoreDiff
          return (b.item.downloaded ?? 0) - (a.item.downloaded ?? 0)
        })
      for (const r of tierResults) matchedIds.add(r.item.id)
      fuseAll.push(...tierResults)
    }

    // Merge: pinned → ID prefix → Fuse text (deduplicated by id)
    const seen = new Set<string>()
    const mergedTags: Tag[] = []
    const newMatches = new Map<string, FieldMatches>()

    if (pinnedTag) {
      seen.add(pinnedTag.id)
      mergedTags.push(pinnedTag)
      newMatches.set(pinnedTag.id, { id: [[0, q.length - 1]] as MatchRanges })
    }

    for (const tag of idPrefixMatches) {
      if (seen.has(tag.id)) continue
      seen.add(tag.id)
      mergedTags.push(tag)
      newMatches.set(tag.id, { id: [[0, q.length - 1]] as MatchRanges })
    }

    // Exclude all allIdPrefixMatches items from Fuse results to prevent double-counting available count
    for (const tag of allIdPrefixMatches) seen.add(tag.id)

    const fuseFiltered = fuseAll.filter((r) => !seen.has(r.item.id) && passesFilters(r.item))
    const fuseSliced = fuseFiltered.slice(0, FUSE_LIMIT)

    for (const r of fuseSliced) {
      seen.add(r.item.id)
      mergedTags.push(r.item)
      newMatches.set(
        r.item.id,
        Object.fromEntries(
          // biome-ignore lint/style/noNonNullAssertion: m.key is checked truthy by filter above
          (r.matches ?? []).filter((m) => m.key).map((m) => [m.key!, m.indices as MatchRanges]),
        ),
      )
    }

    setResult({
      available: (pinnedTag ? 1 : 0) + allIdPrefixMatches.length + fuseFiltered.length,
      count: mergedTags.length,
      tags: mergedTags,
    })
    setLocalMatches(newMatches)
  }, [debouncedQuery, filters, localTags])

  // Apply a pending history-state snapshot (from a prior mount) once
  // localTags is available. For a typed query this just avoids an initial
  // blank flash — the Fuse-search effect above still recomputes and
  // overwrites it deterministically. For Surprise Me (empty q) there's no
  // recompute to correct it, so this is the only source of the exact sample;
  // isSurpriseRef is set here so the empty-query branch above doesn't clear it.
  useEffect(() => {
    if (!localTags) return
    const snapshot = pendingSnapshotRef.current
    if (!snapshot) return
    pendingSnapshotRef.current = null

    const byId = new Map(localTags.map((t) => [t.id, t]))
    const tags = snapshot.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => !!t)
    if (tags.length === 0) return

    isSurpriseRef.current = !snapshot.q
    setResult({ available: snapshot.available, count: tags.length, tags })
  }, [localTags])

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

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-4">
      <h1 className="m-0 text-2xl font-bold shrink-0">Tagnabbit</h1>
      <button
        type="button"
        className="fixed top-3 right-3 z-50 py-1 px-2 bg-transparent border-transparent leading-none"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        <Menu size={22} color="var(--text-muted)" />
      </button>

      <form className="flex gap-2">
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
            disabled={isDownloading}
          />
        </div>
      </form>

      {isSeeding && <p className="text-sm text-[var(--text-muted)] m-0">Loading tag database…</p>}

      {isDownloading && downloadProgress && (
        <p className="text-sm text-[var(--text-muted)] m-0">
          Downloading… {downloadProgress.fetched.toLocaleString()}
          {downloadProgress.total > 0 && ` / ${downloadProgress.total.toLocaleString()}`}
          {" tags"}
        </p>
      )}

      {localTags !== null && (
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
          <button
            type="button"
            className="ml-auto flex items-center gap-1 text-sm"
            style={{ backgroundColor: "var(--accent)", color: "#10141e" }}
            onClick={handleSurpriseMe}
          >
            <Dices size={16} />
            Surprise Me!
          </button>
        </div>
      )}

      {error && (
        <p className="text-[#f87171] m-0" role="alert">
          {error}
        </p>
      )}

      {result && result.tags.length > 0 && (
        <>
          <p className="text-sm text-[var(--text-muted)] m-0">
            {`${result.available.toLocaleString()} matches${result.available > result.count ? `, showing ${result.count}` : ""}`}
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {result.tags.map((tag) => (
              <TagListItem
                key={tag.id}
                tag={tag}
                onClick={() => navigate(`/tag/${tag.id}`)}
                fieldMatches={localMatches.get(tag.id)}
                query={query}
                isFavorited={!!favorites[tag.id]}
              />
            ))}
          </ul>
        </>
      )}

      {result && result.tags.length === 0 && query.trim() && (
        <p className="text-[var(--text-muted)] text-sm">No tags found for "{query.trim()}".</p>
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
