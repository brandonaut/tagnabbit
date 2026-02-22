import { useState, useEffect } from 'react';
import { type Tag } from './api/tags';
import { getSheetMusic } from './cache/sheetMusic';
import { formatKey } from './formatKey';
import PitchPipe from './PitchPipe';

interface Props {
  tag: Tag;
  onBack: () => void;
}

export default function TagPage({ tag, onBack }: Props) {
  const sheetUrl = tag.sheetMusicUrl || tag.sheetMusicAltUrl;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!sheetUrl) return;

    let cancelled = false;
    let createdUrl: string | null = null;

    setLoading(true);
    setError(null);
    setObjectUrl(null);

    getSheetMusic(sheetUrl)
      .then(({ objectUrl: url, mimeType: mime }) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
        } else {
          createdUrl = url;
          setObjectUrl(url);
          setMimeType(mime);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sheet music');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [sheetUrl]);

  const isImage = mimeType.startsWith('image/');

  return (
    <div className="tag-page">
      <div className="tag-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="tag-header-title">{tag.title}</span>
        <span className="tag-id">#{tag.id}</span>
        <button className="info-btn" onClick={() => setInfoOpen(true)}>ⓘ</button>
      </div>

      {infoOpen && (
        <>
          <div className="info-overlay" onClick={() => setInfoOpen(false)} />
          <div className="info-popup" role="dialog" aria-label="Tag information">
            <div className="info-popup-header">
              <strong>{tag.title}</strong>
              <button className="info-close" onClick={() => setInfoOpen(false)}>✕</button>
            </div>
            <dl className="info-fields">
              {tag.altTitle && <><dt>Alt title</dt><dd>{tag.altTitle}</dd></>}
              {tag.version && <><dt>Version</dt><dd>{tag.version}</dd></>}
              {tag.arranger && <><dt>Arranger</dt><dd>{tag.arranger}</dd></>}
              {tag.key && <><dt>Key</dt><dd>{formatKey(tag.key)}</dd></>}
              {tag.parts && <><dt>Parts</dt><dd>{tag.parts}</dd></>}
              {tag.type && <><dt>Type</dt><dd>{tag.type}</dd></>}
              {tag.ratingCount && tag.ratingCount !== '0' && (
                <><dt>Rating</dt><dd>{tag.rating} / 5 ({tag.ratingCount} ratings)</dd></>
              )}
            </dl>
          </div>
        </>
      )}

      {!sheetUrl && <p className="no-sheet-music">No sheet music available.</p>}

      {sheetUrl && loading && <p className="loading">Loading sheet music…</p>}

      {sheetUrl && error && (
        <div>
          <p className="error" role="alert">{error}</p>
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
            Open sheet music externally
          </a>
        </div>
      )}

      {objectUrl && (
        <div className="sheet-music-container">
          <div className="sheet-music-wrapper">
            {isImage ? (
              <img
                src={objectUrl}
                alt={`Sheet music for ${tag.title}`}
                className="sheet-music-image"
              />
            ) : (
              <iframe
                src={objectUrl}
                title={`Sheet music for ${tag.title}`}
                className="sheet-music"
              />
            )}
            <PitchPipe defaultNote={tag.key ? formatKey(tag.key) : 'C'} />
          </div>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sheet-music-link"
          >
            Open in new tab
          </a>
        </div>
      )}
    </div>
  );
}
