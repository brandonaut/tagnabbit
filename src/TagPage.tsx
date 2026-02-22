import { useState, useEffect, useRef } from 'react';
import { type Tag } from './api/tags';
import { getSheetMusic } from './cache/sheetMusic';
import { formatKey } from './formatKey';

const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 261.63,
  'C#': 277.18, 'Db': 277.18,
  'D': 293.66,
  'D#': 311.13, 'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99, 'Gb': 369.99,
  'G': 392.00,
  'G#': 415.30, 'Ab': 415.30,
  'A': 440.00,
  'A#': 466.16, 'Bb': 466.16,
  'B': 493.88,
};

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

  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.osc.stop();
        audio.ctx.close();
        audioRef.current = null;
      }
    };
  }, []);

  function startTone() {
    if (audioRef.current || !tag.key) return;
    const freq = NOTE_FREQUENCIES[formatKey(tag.key)];
    if (!freq) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    audioRef.current = { ctx, osc, gain };
  }

  function stopTone() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.osc.stop();
    audio.ctx.close();
    audioRef.current = null;
  }

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
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="tag-title-row">
        <h1>{tag.title}</h1>
        <span className="tag-id">#{tag.id}</span>
      </div>
      {tag.version && <p className="tag-version">{tag.version}</p>}

      <div className="tag-meta">
        {tag.arranger && <span>{tag.arranger}</span>}
      </div>

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
            {tag.key && (
              <button
                className="tone-btn"
                onMouseDown={startTone}
                onMouseUp={stopTone}
                onMouseLeave={stopTone}
                onTouchStart={startTone}
                onTouchEnd={stopTone}
                onTouchCancel={stopTone}
              >
                {formatKey(tag.key)}
              </button>
            )}
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
