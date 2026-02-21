import { useState } from 'react';
import { searchTags, type Tag, type SearchResult } from './api/tags';

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
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
          disabled={loading}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <>
          <p className="result-count">
            {result.available.toLocaleString()} tags found, showing {result.count}
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
                <span className="tag-title">{tag.title}</span>
                {tag.version && (
                  <span className="tag-version"> — {tag.version}</span>
                )}
                <div className="tag-meta">
                  <span>#{tag.id}</span>
                  {tag.arranger && <span>arr. {tag.arranger}</span>}
                  {tag.key && <span>{tag.key}</span>}
                  <span>{tag.downloaded.toLocaleString()} downloads</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
