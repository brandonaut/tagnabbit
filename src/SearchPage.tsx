import { useState, useEffect } from 'react';
import { searchTags, fetchAllTags, type Tag, type SearchResult } from './api/tags';
import { formatKey } from './formatKey';
import {
  getCachedAllTags,
  storeAllTags,
  getTagCacheMeta,
  searchLocal,
  type TagCacheMeta,
} from './cache/tagDatabase';

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

  // Live local search whenever query or local tags change
  useEffect(() => {
    if (!localTags) return;
    setResult(searchLocal(localTags, query));
  }, [query, localTags]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (isLocalMode) return; // search is live in local mode
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

  return (
    <div className="search-page">
      <h1>tagnabbit</h1>

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

      {!isLocalMode && !isDownloading && (
        <button className="download-all-btn" onClick={handleDownloadAll}>
          Download all tags for instant offline search
        </button>
      )}

      {isLocalMode && cacheMeta && (
        <p className="local-mode-indicator">
          {cacheMeta.count.toLocaleString()} tags cached
          · {new Date(cacheMeta.cachedAt).toLocaleDateString()}
        </p>
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
            {result.tags.map(tag => (
              <li
                key={tag.id}
                className="tag-item"
                onClick={() => onSelectTag(tag, query, result)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelectTag(tag, query, result)}
              >
                <span className="tag-title">{highlight(tag.title, query)}</span>
                {tag.version && (
                  <span className="tag-version"> — {highlight(tag.version, query)}</span>
                )}
                <div className="tag-meta">
                  <span>#{tag.id}</span>
                  {tag.arranger && <span>arr. {highlight(tag.arranger, query)}</span>}
                  {tag.key && <span>{formatKey(tag.key)}</span>}
                  <span>{tag.downloaded.toLocaleString()} downloads</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {result && result.tags.length === 0 && query.trim() && (
        <p className="no-results">No tags found for "{query.trim()}".</p>
      )}
    </div>
  );
}
