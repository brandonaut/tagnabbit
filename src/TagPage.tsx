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
}

export default function TagPage({ tag, onBack }: Props) {
  const sheetUrl = tag.sheetMusicUrl || tag.sheetMusicAltUrl
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

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
    <div className="flex flex-col gap-3 p-4 pb-20">
      <div className="flex items-center gap-2">
        <button type="button" className="text-[0.9rem] shrink-0" onClick={onBack}>
          ← Back
        </button>
        <span className="flex-1 text-[0.95rem] font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
          {tag.title}
        </span>
        <span className="text-[0.8rem] text-[#888] whitespace-nowrap shrink-0">#{tag.id}</span>
        <button
          type="button"
          className="text-base py-[0.3em] px-[0.5em] bg-transparent border-transparent shrink-0 leading-none"
          onClick={() => setInfoOpen(true)}
        >
          ⓘ
        </button>
      </div>

      {infoOpen && (
        <>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay, dialog has Escape key via focus */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
          <div className="fixed inset-0 z-[100]" onClick={() => setInfoOpen(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#3334] rounded-[10px] p-5 w-[min(360px,90vw)] flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            role="dialog"
            aria-label="Tag information"
          >
            <div className="flex items-start justify-between gap-3">
              <strong className="text-base leading-[1.3]">{tag.title}</strong>
              <button
                type="button"
                className="text-[0.9rem] py-[0.2em] px-[0.45em] bg-transparent border-transparent leading-none shrink-0"
                onClick={() => setInfoOpen(false)}
              >
                ✕
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[0.4rem] m-0 text-[0.9rem]">
              {tag.altTitle && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Alt title
                  </dt>
                  <dd className="m-0">{tag.altTitle}</dd>
                </>
              )}
              {tag.version && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Version
                  </dt>
                  <dd className="m-0">{tag.version}</dd>
                </>
              )}
              {tag.arranger && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Arranger
                  </dt>
                  <dd className="m-0">{tag.arranger}</dd>
                </>
              )}
              {tag.key && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Key
                  </dt>
                  <dd className="m-0">{tag.key}</dd>
                </>
              )}
              {tag.parts && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Parts
                  </dt>
                  <dd className="m-0">{tag.parts}</dd>
                </>
              )}
              {tag.type && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Type
                  </dt>
                  <dd className="m-0">{tag.type}</dd>
                </>
              )}
              {tag.ratingCount && tag.ratingCount !== "0" && (
                <>
                  <dt className="text-[#888] text-xs uppercase tracking-[0.05em] self-center">
                    Rating
                  </dt>
                  <dd className="m-0">
                    {tag.rating} / 5 ({tag.ratingCount} ratings)
                  </dd>
                </>
              )}
            </dl>
          </div>
        </>
      )}

      {!sheetUrl && <p className="text-[#888]">No sheet music available.</p>}

      {sheetUrl && loading && <p className="text-[#888]">Loading sheet music…</p>}

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

      {objectUrl && (
        <div className="flex flex-col gap-2">
          <div className="relative -mx-4">
            {isImage ? (
              <img
                src={objectUrl}
                alt={`Sheet music for ${tag.title}`}
                className="w-full h-auto border border-[#3334] rounded-md"
              />
            ) : isPdf ? (
              <PdfViewer url={objectUrl} title={`Sheet music for ${tag.title}`} />
            ) : (
              <iframe
                src={objectUrl}
                title={`Sheet music for ${tag.title}`}
                className="w-full h-[80vh] border border-[#3334] rounded-md"
              />
            )}
            <PitchPipe defaultNote={tag.key ? formatKey(tag.key) : "C"} />
            <Tuner tagKey={tag.key ? formatKey(tag.key) : "C"} />
          </div>
        </div>
      )}
    </div>
  )
}
