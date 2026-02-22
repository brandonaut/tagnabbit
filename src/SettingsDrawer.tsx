import { useEffect } from 'react';
import { type TagCacheMeta } from './cache/tagDatabase';

const APP_VERSION = '0.0.0';
const RELEASE_DATE = '2026-02-21';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cacheMeta: TagCacheMeta | null;
  isDownloading: boolean;
  downloadProgress: { fetched: number; total: number } | null;
  onRefreshCache: () => void;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  cacheMeta,
  isDownloading,
  downloadProgress,
  onRefreshCache,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="drawer-header">
          <h2>Settings</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <section className="drawer-section">
          <h3>Cache</h3>
          {cacheMeta ? (
            <p className="cache-info">
              {cacheMeta.count.toLocaleString()} tags cached<br />
              Last updated {new Date(cacheMeta.cachedAt).toLocaleDateString()}
            </p>
          ) : (
            <p className="cache-info">No tags cached.</p>
          )}
          {isDownloading && downloadProgress && (
            <p className="download-progress">
              Downloading…{' '}
              {downloadProgress.fetched.toLocaleString()}
              {downloadProgress.total > 0 && ` / ${downloadProgress.total.toLocaleString()}`}
              {' tags'}
            </p>
          )}
          <button onClick={onRefreshCache} disabled={isDownloading}>
            {isDownloading ? 'Downloading…' : cacheMeta ? 'Refresh cache' : 'Download all tags'}
          </button>
        </section>

        <section className="drawer-section">
          <h3>About</h3>
          <p className="about-info">
            Version {APP_VERSION}<br />
            Released {RELEASE_DATE}
          </p>
          <a href="#" target="_blank" rel="noopener noreferrer">GitHub</a>
        </section>
      </div>
    </>
  );
}
