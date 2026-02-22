import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { searchTags, fetchAllTags, type Tag, type SearchResult } from './api/tags';
import { formatKey } from './formatKey';
import {
  getCachedAllTags,
  storeAllTags,
  getTagCacheMeta,
  type TagCacheMeta,
} from './cache/tagDatabase';
import SettingsDrawer from './SettingsDrawer';

// Character ranges [start, end] (inclusive) from Fuse match indices
type MatchRanges = ReadonlyArray<readonly [number, number]>;
// Per-field match ranges for one tag, keyed by field name
type FieldMatches = Record<string, MatchRanges>;

const FUSE_LIMIT = 100;
const SURPRISE_COUNT = 7;

const FUSE_OPTIONS: Fuse.IFuseOptions<Tag> = {
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

  // Load local tag database on mount
  useEffect(() => {
    Promise.all([getCachedAllTags(), getTagCacheMeta()]).then(([tags, meta]) => {
      if (tags && tags.length > 0) {
        setLocalTags(tags);
        setCacheMeta(meta);
      }
    });
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
    <div className="search-page">
      <div className="search-header">
        <h1>Tagnabbit</h1>
        <button
          className="hamburger-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ☰
        </button>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search barbershop tags..."
          className="search-input"
          autoFocus
          disabled={loading || isDownloading}
        />
        {!isLocalMode && (
          <button type="submit" disabled={loading || !query.trim() || isDownloading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        )}
      </form>

      {isDownloading && downloadProgress && (
        <p className="download-progress">
          Downloading…{' '}
          {downloadProgress.fetched.toLocaleString()}
          {downloadProgress.total > 0 && ` / ${downloadProgress.total.toLocaleString()}`}
          {' tags'}
        </p>
      )}

      {isLocalMode && (
        <div className="filters">
          <select
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">All types</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filters.parts}
            onChange={e => setFilters(f => ({ ...f, parts: e.target.value }))}
          >
            <option value="">All parts</option>
            {partsOptions.map(p => <option key={p} value={p}>{p} parts</option>)}
          </select>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.learningTracks}
              onChange={e => setFilters(f => ({ ...f, learningTracks: e.target.checked }))}
            />
            Learning tracks
          </label>
          <button className="surprise-btn" onClick={handleSurpriseMe}>
            Surprise Me!
          </button>
        </div>
      )}

      {!isLocalMode && !isDownloading && (
        <button className="download-all-btn" onClick={handleDownloadAll}>
          Download all tags for instant offline search
        </button>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {result && result.tags.length > 0 && (
        <>
          <p className="result-count">
            {isLocalMode
              ? `${result.available.toLocaleString()} matches${result.available > result.count ? `, showing ${result.count}` : ''}`
              : `${result.available.toLocaleString()} tags found, showing ${result.count}`
            }
          </p>
          <ul className="tag-list">
            {result.tags.map(tag => {
              const fm = localMatches.get(tag.id);
              const hlField = (text: string, field: string) =>
                fm?.[field]
                  ? highlightWithIndices(text, fm[field])
                  : highlight(text, query);

              return (
                <li
                  key={tag.id}
                  className="tag-item"
                  onClick={() => onSelectTag(tag, query, result)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectTag(tag, query, result)}
                >
                  <div className="tag-title-line">
                    <div>
                      <span className="tag-title">{hlField(tag.title, 'title')}</span>
                      {tag.altTitle && (
                        <span className="tag-alt-title"> — {hlField(tag.altTitle, 'altTitle')}</span>
                      )}
                    </div>
                    <span className="tag-id">#{hlField(tag.id, 'id')}</span>
                  </div>
                  <div className="tag-meta">
                    {tag.arranger && <span>{hlField(tag.arranger, 'arranger')}</span>}
                    {tag.key && <span>{formatKey(tag.key)}</span>}
                    {tag.parts && <span>{tag.parts} parts</span>}
                    <span className="tag-downloads">{tag.downloaded.toLocaleString()} downloads</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {result && result.tags.length === 0 && query.trim() && (
        <p className="no-results">No tags found for "{query.trim()}".</p>
      )}

      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cacheMeta={cacheMeta}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        onRefreshCache={handleDownloadAll}
      />
    </div>
  );
}
