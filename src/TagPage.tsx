import { ArrowLeft, Heart, Info, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { Tag } from "./api/tags"
import { getSheetMusic } from "./cache/sheetMusic"
import { formatKey } from "./formatKey"
import PdfViewer from "./PdfViewer"
import PitchPipe from "./PitchPipe"
import Tuner from "./Tuner"

interface Props {
  tag: Tag
  onBack: () => void
  favorites: Record<string, Tag>
  onToggleFavorite: (tag: Tag) => void
}

export default function TagPage({ tag, onBack, favorites, onToggleFavorite }: Props) {
  const favorited = !!favorites[tag.id]
  const sheetUrl = tag.sheetMusicUrl || tag.sheetMusicAltUrl
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [uiVisible, setUiVisible] = useState(true)

  useEffect(() => {
    if (!sheetUrl) return

    let cancelled = false
    let createdUrl: string | null = null

    setLoading(true)
    setError(null)
    setObjectUrl(null)

    getSheetMusic(sheetUrl)
      .then(({ objectUrl: url, mimeType: mime }) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
        } else {
          createdUrl = url
          setObjectUrl(url)
          setMimeType(mime)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sheet music")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [sheetUrl])

  const isImage = mimeType.startsWith("image/")
  const isPdf = mimeType === "application/pdf"

  return (
    <div className="relative pb-20">
      {infoOpen && (
        <>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay, dialog has Escape key via focus */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
          <div className="fixed inset-0 z-[100]" onClick={() => setInfoOpen(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] p-5 w-[min(360px,90vw)] flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            role="dialog"
            aria-label="Tag information"
          >
            <div className="flex items-start justify-between gap-3">
              <strong className="text-base leading-[1.3]">{tag.title}</strong>
              <button
                type="button"
                className="py-[0.2em] px-[0.45em] bg-transparent border-transparent leading-none shrink-0"
                onClick={() => setInfoOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[0.4rem] m-0 text-[0.9rem]">
              {tag.altTitle && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Alt title
                  </dt>
                  <dd className="m-0">{tag.altTitle}</dd>
                </>
              )}
              {tag.version && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Version
                  </dt>
                  <dd className="m-0">{tag.version}</dd>
                </>
              )}
              {tag.arranger && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Arranger
                  </dt>
                  <dd className="m-0">{tag.arranger}</dd>
                </>
              )}
              {tag.key && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Key
                  </dt>
                  <dd className="m-0">{tag.key}</dd>
                </>
              )}
              {tag.parts && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Parts
                  </dt>
                  <dd className="m-0">{tag.parts}</dd>
                </>
              )}
              {tag.type && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Type
                  </dt>
                  <dd className="m-0">{tag.type}</dd>
                </>
              )}
              {!!tag.downloaded && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Downloads
                  </dt>
                  <dd className="m-0">{tag.downloaded.toLocaleString()}</dd>
                </>
              )}
              {tag.posted && (
                <>
                  <dt className="text-[var(--text-muted)] text-xs uppercase tracking-[0.05em] self-center">
                    Posted
                  </dt>
                  <dd className="m-0">{tag.posted}</dd>
                </>
              )}
            </dl>
          </div>
        </>
      )}

      {/* Header in normal flow when sheet music isn't loaded yet */}
      {!objectUrl && (
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="shrink-0 flex items-center gap-1 text-[0.9rem]"
              onClick={onBack}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[0.95rem] font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
                {tag.title}
                {tag.altTitle && <span className="font-normal"> – {tag.altTitle}</span>}
              </div>
              {tag.arranger && (
                <div className="text-[0.75rem] text-[var(--text-muted)] overflow-hidden whitespace-nowrap text-ellipsis">
                  {tag.arranger}
                </div>
              )}
            </div>
            <span className="text-[0.8rem] text-[var(--text-muted)] whitespace-nowrap shrink-0">
              #{tag.id}
            </span>
            <button
              type="button"
              className="py-[0.3em] px-[0.5em] bg-transparent border-transparent shrink-0 leading-none"
              onClick={() => onToggleFavorite(tag)}
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                size={18}
                fill={favorited ? "var(--accent)" : "none"}
                color={favorited ? "var(--accent)" : "var(--text-muted)"}
              />
            </button>
            <button
              type="button"
              className="py-[0.3em] px-[0.5em] bg-transparent border-transparent shrink-0 leading-none"
              onClick={() => setInfoOpen(true)}
              aria-label="Tag information"
            >
              <Info size={18} color="var(--text-muted)" />
            </button>
          </div>

          {!sheetUrl && <p className="text-[var(--text-muted)]">No sheet music available.</p>}
          {sheetUrl && loading && <p className="text-[var(--text-muted)]">Loading sheet music…</p>}
          {sheetUrl && error && (
            <div>
              <p className="text-[#f87171] m-0" role="alert">
                {error}
              </p>
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                Open sheet music externally
              </a>
            </div>
          )}
        </div>
      )}

      {/* Sheet music with overlaid header */}
      {objectUrl && (
        <>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-toggle UI overlay */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: tap-to-toggle UI overlay */}
          <div className="relative" onClick={() => setUiVisible((v) => !v)}>
            {isImage ? (
              <img src={objectUrl} alt={`Sheet music for ${tag.title}`} className="w-full h-auto" />
            ) : isPdf ? (
              <PdfViewer url={objectUrl} title={`Sheet music for ${tag.title}`} />
            ) : (
              <iframe
                src={objectUrl}
                title={`Sheet music for ${tag.title}`}
                className="w-full h-[80vh]"
              />
            )}

            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only */}
            <div
              className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ${uiVisible ? "translate-y-0" : "-translate-y-full"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-b from-black/75 to-transparent px-4 pt-3 pb-12">
                <div className="flex items-center gap-2 text-white">
                  <button
                    type="button"
                    className="shrink-0 flex items-center gap-1 text-[0.9rem] bg-transparent border-transparent"
                    onClick={onBack}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.95rem] font-semibold overflow-hidden whitespace-nowrap text-ellipsis drop-shadow">
                      {tag.title}
                      {tag.altTitle && <span className="font-normal"> – {tag.altTitle}</span>}
                    </div>
                    {tag.arranger && (
                      <div className="text-[0.75rem] text-white/60 overflow-hidden whitespace-nowrap text-ellipsis">
                        {tag.arranger}
                      </div>
                    )}
                  </div>
                  <span className="text-[0.8rem] text-white/60 whitespace-nowrap shrink-0">
                    #{tag.id}
                  </span>
                  <button
                    type="button"
                    className="py-[0.3em] px-[0.5em] bg-transparent border-transparent shrink-0 leading-none"
                    onClick={() => onToggleFavorite(tag)}
                    aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      size={18}
                      fill={favorited ? "var(--accent)" : "none"}
                      color={favorited ? "var(--accent)" : "rgba(255,255,255,0.7)"}
                    />
                  </button>
                  <button
                    type="button"
                    className="py-[0.3em] px-[0.5em] bg-transparent border-transparent shrink-0 leading-none"
                    onClick={() => setInfoOpen(true)}
                    aria-label="Tag information"
                  >
                    <Info size={18} color="rgba(255,255,255,0.7)" />
                  </button>
                </div>
              </div>
            </div>

            <PitchPipe defaultNote={tag.key ? formatKey(tag.key) : "C"} visible={uiVisible} />
            <Tuner tagKey={tag.key ? formatKey(tag.key) : "C"} visible={uiVisible} />
          </div>
        </>
      )}
    </div>
  )
}
