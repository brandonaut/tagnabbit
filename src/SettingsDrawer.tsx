import { X } from "lucide-react"
import { useEffect } from "react"
import type { TagCacheMeta } from "./cache/tagDatabase"

const APP_VERSION = "0.0.0"
const RELEASE_DATE = "2026-02-21"

interface Props {
  isOpen: boolean
  onClose: () => void
  cacheMeta: TagCacheMeta | null
  isDownloading: boolean
  downloadProgress: { fetched: number; total: number } | null
  isBackgroundRefreshing: boolean
  onRefreshCache: () => void
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  cacheMeta,
  isDownloading,
  downloadProgress,
  isBackgroundRefreshing,
  onRefreshCache,
}: Props) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay, keyboard handled by Escape listener */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />
      <div
        className="fixed top-0 right-0 h-full w-[min(320px,85vw)] bg-[var(--bg-surface)] z-[101] p-6 flex flex-col gap-6 overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.4)]"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-xl">Settings</h2>
          <button
            type="button"
            className="py-1 px-2 bg-transparent border-transparent leading-none"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Cache
          </h3>
          {cacheMeta ? (
            <p className="text-sm text-[var(--text-muted)] m-0 leading-relaxed">
              {cacheMeta.count.toLocaleString()} tags cached
              <br />
              Last updated {new Date(cacheMeta.cachedAt).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-sm text-[var(--text-muted)] m-0 leading-relaxed">No tags cached.</p>
          )}
          {isDownloading && downloadProgress && (
            <p className="text-sm text-[var(--text-muted)] m-0">
              Downloading… {downloadProgress.fetched.toLocaleString()}
              {downloadProgress.total > 0 && ` / ${downloadProgress.total.toLocaleString()}`}
              {" tags"}
            </p>
          )}
          {isBackgroundRefreshing && (
            <p className="text-sm text-[var(--text-muted)] m-0 leading-relaxed">
              Checking for updates…
            </p>
          )}
          <button
            type="button"
            onClick={onRefreshCache}
            disabled={isDownloading || isBackgroundRefreshing}
          >
            {isDownloading ? "Downloading…" : cacheMeta ? "Refresh cache" : "Download all tags"}
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            About
          </h3>
          <p className="text-sm text-[var(--text-muted)] m-0 leading-relaxed">
            Version {APP_VERSION}
            <br />
            Released {RELEASE_DATE}
          </p>
          <a
            href="https://github.com/brandonaut/tagnabbit"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <p className="text-sm text-[var(--text-muted)] m-0 leading-relaxed">
            Tags sourced from{" "}
            <a href="https://www.barbershoptags.com" target="_blank" rel="noopener noreferrer">
              BarbershopTags.com
            </a>
          </p>
        </section>
      </div>
    </>
  )
}
