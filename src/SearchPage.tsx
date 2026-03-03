import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { searchTags, fetchAllTags, getTagCount, type Tag, type SearchResult } from './api/tags';
import { formatKey } from './formatKey';
import {
  getCachedAllTags,
  storeAllTags,
  getTagCacheMeta,
  touchTagCache,
  type TagCacheMeta,
} from './cache/tagDatabase';
import SettingsDrawer from './SettingsDrawer';

// Character ranges [start, end] (inclusive) from Fuse match indices
type MatchRanges = ReadonlyArray<readonly [number, number]>;
// Per-field match ranges for one tag, keyed by field name
type FieldMatches = Record<string, MatchRanges>;

const FUSE_LIMIT = 100;
const SURPRISE_COUNT = 7;

const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const JITTER_MS = Math.random() * 24 * 60 * 60 * 1000; // 0–24h spread per session

function isCacheStale(cachedAt: string): boolean {
  return Date.now() - new Date(cachedAt).getTime() > STALE_MS + JITTER_MS;
}

const FUSE_OPTIONS: IFuseOptions<Tag> = {
  keys: [
    { name: 'id', weight: 3 },
    { name: 'title', weight: 3 },
    { name: 'altTitle', weight: 2 },
    { name: 'arranger', weight: 1 },
  ],
  includeMatches: true,
  threshold: 0.4,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

// Highlight a substring match (used in API mode)
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q || !text) return text;

  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  let last = 0;
  let idx = lower.indexOf(q);

  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(<mark key={idx}>{text.slice(idx, idx + q.length)}</mark>);
    last = idx + q.length;
    idx = lower.indexOf(q, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// Highlight using Fuse character indices (used in local mode)
function highlightWithIndices(text: string, indices: MatchRanges): React.ReactNode {
  if (!indices.length) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const [start, end] of indices) {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(<mark key={start}>{text.slice(start, end + 1)}</mark>);
    last = end + 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

interface Props {
  initialQuery: string;
  initialResult: SearchResult | null;
  onSelectTag: (tag: Tag, query: string, result: SearchResult | null) => void;
}

export default function SearchPage({ initialQuery, initialResult, onSelectTag }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localTags, setLocalTags] = useState<Tag[] | null>(null);
  const [cacheMeta, setCacheMeta] = useState<TagCacheMeta | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ fetched: number; total: number } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [localMatches, setLocalMatches] = useState<Map<string, FieldMatches>>(new Map());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filters, setFilters] = useState({ type: '', parts: '', learningTracks: false });

  const typeOptions = useMemo(() =>
    localTags ? [...new Set(localTags.map(t => t.type).filter(Boolean))].sort() : []
    , [localTags]);

  const partsOptions = useMemo(() =>
    localTags ? [...new Set(localTags.map(t => t.parts).filter(Boolean))].sort((a, b) => +a - +b) : []
    , [localTags]);

  const fuseRef = useRef<Fuse<Tag> | null>(null);
  const isLocalMode = localTags !== null;

  // Load local tag database on mount, then check staleness in background
  useEffect(() => {
    let cancelled = false;

    async function refreshIfStale(meta: TagCacheMeta | null) {
      if (!meta || !isCacheStale(meta.cachedAt) || isDownloading) return;
      setIsBackgroundRefreshing(true);
      try {
        const liveCount = await getTagCount();
        if (cancelled) return;
        if (liveCount === meta.count) {
          // Catalog unchanged — just reset the staleness timer
          const newMeta = await touchTagCache();
          if (!cancelled) setCacheMeta(newMeta);
        } else {
          // New tags available — re-download silently
          const newTags = await fetchAllTags(() => { });
          if (cancelled) return;
          await storeAllTags(newTags);
          const newMeta = await getTagCacheMeta();
          if (cancelled) return;
          setLocalTags(newTags);
          setCacheMeta(newMeta);
        }
      } catch {
        // Best-effort; user can always refresh manually
      } finally {
        if (!cancelled) setIsBackgroundRefreshing(false);
      }
    }

    (async () => {
      const [tags, meta] = await Promise.all([getCachedAllTags(), getTagCacheMeta()]);
      if (cancelled) return;

      if (!tags || tags.length === 0) {
        // No local cache — seed from the bundled snapshot so local mode is
        // available immediately without the user pressing "Download all tags".
        setIsSeeding(true);
        try {
          const resp = await fetch('/tags-snapshot.json');
          if (!resp.ok || cancelled) return;
          const snapshot = await resp.json() as { cachedAt: string; tags: Tag[] };
          if (cancelled) return;
          await storeAllTags(snapshot.tags, snapshot.cachedAt);
          const [seededTags, seededMeta] = await Promise.all([getCachedAllTags(), getTagCacheMeta()]);
          if (cancelled || !seededTags || seededTags.length === 0) return;
          setLocalTags(seededTags);
          setCacheMeta(seededMeta);
          // Kick off a background refresh if the bundled snapshot is already stale.
          await refreshIfStale(seededMeta);
        } catch {
          // Snapshot unavailable — fall back to API / manual-download mode.
        } finally {
          if (!cancelled) setIsSeeding(false);
        }
        return;
      }

      setLocalTags(tags);
      setCacheMeta(meta);
      await refreshIfStale(meta);
    })();

    return () => { cancelled = true; };
  }, []);

  // Build Fuse index when local tags are loaded
  useEffect(() => {
    if (!localTags) { fuseRef.current = null; return; }
    fuseRef.current = new Fuse(localTags, FUSE_OPTIONS);
  }, [localTags]);

  // Run fuzzy search on every query change (or when the index is first built)
  useEffect(() => {
    const fuse = fuseRef.current;
    if (!fuse) return;

    const q = query.trim();
    if (!q) {
      setResult(null);
      setLocalMatches(new Map());
      return;
    }

    const all = fuse.search(q);
    const filtered = all.filter(r => {
      const tag = r.item;
      if (filters.type && tag.type !== filters.type) return false;
      if (filters.parts && tag.parts !== filters.parts) return false;
      if (filters.learningTracks && !tag.hasLearningTracks) return false;
      return true;
    });
    const sliced = filtered.slice(0, FUSE_LIMIT);

    setResult({
      available: filtered.length,
      count: sliced.length,
      tags: sliced.map(r => r.item),
    });

    setLocalMatches(new Map(
      sliced.map(r => [
        r.item.id,
        Object.fromEntries(
          (r.matches ?? [])
            .filter(m => m.key)
            .map(m => [m.key!, m.indices as MatchRanges])
        ),
      ])
    ));
  }, [query, localTags, filters]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (isLocalMode) return;
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchTags(q);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadAll() {
    setIsDownloading(true);
    setError(null);
    setDownloadProgress({ fetched: 0, total: 0 });
    try {
      const tags = await fetchAllTags((fetched, total) => {
        setDownloadProgress({ fetched, total });
      });
      await storeAllTags(tags);
      const meta = await getTagCacheMeta();
      setLocalTags(tags);
      setCacheMeta(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }

  function handleSurpriseMe() {
    if (!localTags) return;
    const pool = localTags.filter(tag => {
      if (filters.type && tag.type !== filters.type) return false;
      if (filters.parts && tag.parts !== filters.parts) return false;
      if (filters.learningTracks && !tag.hasLearningTracks) return false;
      return true;
    });
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    const sampled = copy.slice(0, SURPRISE_COUNT);
    setResult({ available: pool.length, count: sampled.length, tags: sampled });
    setLocalMatches(new Map());
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="m-0">Tagnabbit</h1>
        <button
          className="text-2xl py-1 px-2 bg-transparent border-transparent leading-none"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ☰
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search barbershop tags..."
          className="flex-1 py-2 px-3 text-base border border-[#555] rounded-md bg-inherit text-inherit focus:outline-2 focus:outline-[#646cff] focus:border-transparent"
          autoFocus
          disabled={loading || isDownloading}
        />
        {!isLocalMode && (
          <button type="submit" disabled={loading || !query.trim() || isDownloading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        )}
      </form>

      {isSeeding && (
        <p className="text-sm text-[#888] m-0">Loading tag database…</p>
      )}

      {isDownloading && downloadProgress && (
        <p className="text-sm text-[#888] m-0">
          Downloading…{' '}
          {downloadProgress.fetched.toLocaleString()}
          {downloadProgress.total > 0 && ` / ${downloadProgress.total.toLocaleString()}`}
          {' tags'}
        </p>
      )}

      {isLocalMode && (
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="font-sans text-sm py-[0.3rem] px-2 border border-[#555] rounded-md bg-[#f9f9f9] dark:bg-[#1a1a1a] cursor-pointer"
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">All types</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="font-sans text-sm py-[0.3rem] px-2 border border-[#555] rounded-md bg-[#f9f9f9] dark:bg-[#1a1a1a] cursor-pointer"
            value={filters.parts}
            onChange={e => setFilters(f => ({ ...f, parts: e.target.value }))}
          >
            <option value="">All parts</option>
            {partsOptions.map(p => <option key={p} value={p}>{p} parts</option>)}
          </select>
          <label className="flex items-center gap-[0.375rem] text-sm cursor-pointer text-[#aaa]">
            <input
              type="checkbox"
              checked={filters.learningTracks}
              onChange={e => setFilters(f => ({ ...f, learningTracks: e.target.checked }))}
            />
            Learning tracks
          </label>
          <button className="ml-auto text-sm" onClick={handleSurpriseMe}>
            Surprise Me!
          </button>
        </div>
      )}

      {!isLocalMode && !isDownloading && !isSeeding && (
        <button className="self-start text-sm" onClick={handleDownloadAll}>
          Download all tags for instant offline search
        </button>
      )}

      {error && <p className="text-[#f87171] m-0" role="alert">{error}</p>}

      {result && result.tags.length > 0 && (
        <>
          <p className="text-sm text-[#888] m-0">
            {isLocalMode
              ? `${result.available.toLocaleString()} matches${result.available > result.count ? `, showing ${result.count}` : ''}`
              : `${result.available.toLocaleString()} tags found, showing ${result.count}`
            }
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {result.tags.map(tag => {
              const fm = localMatches.get(tag.id);
              const hlField = (text: string, field: string) =>
                fm?.[field]
                  ? highlightWithIndices(text, fm[field])
                  : highlight(text, query);

              return (
                <li
                  key={tag.id}
                  className="py-3 px-4 border border-[#3334] rounded-lg cursor-pointer transition-colors duration-150 hover:bg-[#ffffff10] hover:outline hover:outline-2 hover:outline-[#646cff] focus:bg-[#ffffff10] focus:outline focus:outline-2 focus:outline-[#646cff]"
                  onClick={() => onSelectTag(tag, query, result)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectTag(tag, query, result)}
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <div>
                      <span className="font-semibold">{hlField(tag.title, 'title')}</span>
                      {tag.altTitle && (
                        <span className="text-[#aaa] text-[0.9em]"> — {hlField(tag.altTitle, 'altTitle')}</span>
                      )}
                    </div>
                    <span className="text-[0.8rem] text-[#888] whitespace-nowrap">#{hlField(tag.id, 'id')}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[0.8rem] text-[#888]">
                    {tag.arranger && <span>{hlField(tag.arranger, 'arranger')}</span>}
                    {tag.key && <span>{formatKey(tag.key)}</span>}
                    {tag.parts && <span>{tag.parts} parts</span>}
                    <span>{tag.downloaded.toLocaleString()} downloads</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {result && result.tags.length === 0 && query.trim() && (
        <p className="text-[#888] text-sm">No tags found for "{query.trim()}".</p>
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
  );
}
