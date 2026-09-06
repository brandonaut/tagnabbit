import { GripVertical, Music, Plus, Trash2, X } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import type { PlaylistTrack } from "./cache/playerFile"

interface PlaylistListProps {
  tracks: PlaylistTrack[]
  activeTrackId: string | null
  errorMessage: string | null
  onDismissError: () => void
  onFilesAdded: (files: File[]) => void
  onSelectTrack: (track: PlaylistTrack) => void
  onRemoveTrack: (id: string) => void
  onDragHandlePointerDown: (e: React.PointerEvent, track: PlaylistTrack, index: number) => void
  onDragHandlePointerMove: (e: React.PointerEvent) => void
  onDragHandlePointerUp: (e: React.PointerEvent) => void
  onRowPointerDown: (e: React.PointerEvent<HTMLDivElement>, track: PlaylistTrack) => void
  onRowPointerMove: (e: React.PointerEvent<HTMLDivElement>, track: PlaylistTrack) => void
  onRowPointerUp: (e: React.PointerEvent<HTMLDivElement>, track: PlaylistTrack) => void
}

const BUTTON_RESET = "bg-transparent border-0"

export default function PlaylistList({
  tracks,
  activeTrackId,
  errorMessage,
  onDismissError,
  onFilesAdded,
  onSelectTrack,
  onRemoveTrack,
  onDragHandlePointerDown,
  onDragHandlePointerMove,
  onDragHandlePointerUp,
  onRowPointerDown,
  onRowPointerMove,
  onRowPointerUp,
}: PlaylistListProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const prevRectsRef = useRef(new Map<string, DOMRect>())
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // A lightweight FLIP: whenever the track order changes, each row is measured
  // before/after and given a compensating transform that immediately animates
  // back to zero, so reordering (including live drag steps) settles into its
  // new position with a small slide rather than an instant jump.
  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>()
    for (const track of tracks) {
      const el = rowRefs.current.get(track.id)
      if (el) newRects.set(track.id, el.getBoundingClientRect())
    }
    for (const track of tracks) {
      const el = rowRefs.current.get(track.id)
      const prev = prevRectsRef.current.get(track.id)
      const next = newRects.get(track.id)
      if (!(el && prev && next)) continue
      const deltaY = prev.top - next.top
      if (deltaY === 0) continue
      el.style.transition = "none"
      el.style.transform = `translateY(${deltaY}px)`
      el.getBoundingClientRect() // force a reflow so the starting transform registers
      requestAnimationFrame(() => {
        el.style.transition = "transform 200ms ease"
        el.style.transform = ""
      })
    }
    prevRectsRef.current = newRects
  }, [tracks])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFilesAdded(files)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFilesAdded(files)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="m-0 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          Playlist{tracks.length > 0 ? ` · ${tracks.length}` : ""}
        </h2>
        <label
          className="flex items-center cursor-pointer"
          style={{ color: "var(--accent)" }}
          aria-label="Add to playlist"
        >
          <Plus size={20} />
          <input
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </label>
      </div>

      {errorMessage && (
        <div
          className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 text-sm"
          style={{ color: "var(--accent)" }}
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            className={BUTTON_RESET}
            style={{ color: "var(--accent)" }}
            onClick={onDismissError}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop zone; the header file picker covers keyboard/non-drag use */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-2"
        style={{
          outline: isDraggingOver ? "2px dashed var(--accent)" : undefined,
          outlineOffset: "-2px",
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
      >
        {tracks.length === 0 ? (
          <label
            className="flex flex-col items-center justify-center gap-2 h-full px-4 text-center cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <Music size={32} />
            <span>Playlist is empty — tap to add audio files</span>
            <input
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </label>
        ) : (
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            {tracks.map((track, index) => {
              const isActive = track.id === activeTrackId
              const rowBg = isActive ? "var(--bg)" : "var(--bg-surface)"
              return (
                <li
                  key={track.id}
                  data-playlist-row
                  ref={(el) => {
                    if (el) rowRefs.current.set(track.id, el)
                    else rowRefs.current.delete(track.id)
                  }}
                  className="relative overflow-hidden rounded-md touch-pan-y"
                >
                  {/* Swipe reveal — hidden behind the row's own background until the
                      foreground below slides away during a swipe. */}
                  <div
                    className="absolute inset-0 flex items-center justify-center px-4 bg-red-500 text-white"
                    aria-hidden="true"
                  >
                    <Trash2 size={18} />
                  </div>

                  <div
                    className="group relative flex items-center h-11"
                    style={{
                      backgroundColor: rowBg,
                      borderLeft: `3px solid ${isActive ? "var(--accent)" : "transparent"}`,
                    }}
                    onPointerDown={(e) => onRowPointerDown(e, track)}
                    onPointerMove={(e) => onRowPointerMove(e, track)}
                    onPointerUp={(e) => onRowPointerUp(e, track)}
                    onPointerCancel={(e) => onRowPointerUp(e, track)}
                  >
                    <button
                      type="button"
                      className={`${BUTTON_RESET} cursor-grab touch-none shrink-0 flex items-center -mr-1`}
                      aria-label="Drag to reorder"
                      style={{ color: "var(--text-muted)" }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        onDragHandlePointerDown(e, track, index)
                      }}
                      onPointerMove={(e) => {
                        e.stopPropagation()
                        onDragHandlePointerMove(e)
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation()
                        onDragHandlePointerUp(e)
                      }}
                      onPointerCancel={(e) => {
                        e.stopPropagation()
                        onDragHandlePointerUp(e)
                      }}
                    >
                      <GripVertical size={16} />
                    </button>

                    <button
                      type="button"
                      className={`${BUTTON_RESET} flex-1 min-w-0 h-full text-left truncate ${
                        isActive ? "font-semibold" : ""
                      }`}
                      style={{ color: isActive ? "var(--accent)" : "var(--text)" }}
                      onClick={() => onSelectTrack(track)}
                    >
                      {track.name}
                    </button>

                    <button
                      type="button"
                      className={`${BUTTON_RESET} absolute right-0 top-0 h-full flex items-center px-2 z-10 opacity-0 group-hover:opacity-100`}
                      aria-label={`Remove ${track.name}`}
                      style={{ color: "var(--text-muted)", backgroundColor: rowBg }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveTrack(track.id)
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
