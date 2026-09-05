import { ChevronDown, GripVertical, Music, Plus, Trash2, X } from "lucide-react"
import { useLayoutEffect, useRef } from "react"
import type { PlaylistTrack } from "./cache/playerFile"

interface PlaylistModalProps {
  isOpen: boolean
  tracks: PlaylistTrack[]
  activeTrackId: string | null
  errorMessage: string | null
  onDismissError: () => void
  onClose: () => void
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

export default function PlaylistModal({
  isOpen,
  tracks,
  activeTrackId,
  errorMessage,
  onDismissError,
  onClose,
  onFilesAdded,
  onSelectTrack,
  onRemoveTrack,
  onDragHandlePointerDown,
  onDragHandlePointerMove,
  onDragHandlePointerUp,
  onRowPointerDown,
  onRowPointerMove,
  onRowPointerUp,
}: PlaylistModalProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const prevRectsRef = useRef(new Map<string, DOMRect>())

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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal panel; stopPropagation keeps clicks inside from closing via the backdrop's onClick */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same as above — no keyboard interaction needed for a stopPropagation-only handler */}
      <div
        className={`w-full sm:max-w-md max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ backgroundColor: "var(--bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-bold m-0">Playlist</h2>
          <button
            type="button"
            className={BUTTON_RESET}
            style={{ color: "var(--text)" }}
            onClick={onClose}
            aria-label="Close playlist"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        {errorMessage && (
          <div
            className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
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

        <div className="overflow-y-auto flex-1 p-2">
          {tracks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              <Music size={32} />
              <span>Playlist is empty</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-1 m-0 p-0 list-none">
              {tracks.map((track, index) => {
                const rowBg = track.id === activeTrackId ? "var(--bg)" : "var(--bg-surface)"
                return (
                  <li
                    key={track.id}
                    data-playlist-row
                    ref={(el) => {
                      if (el) rowRefs.current.set(track.id, el)
                      else rowRefs.current.delete(track.id)
                    }}
                    className="relative overflow-hidden rounded-md touch-none"
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
                      className="group relative flex items-center gap-3 h-11 pl-2"
                      style={{ backgroundColor: rowBg }}
                      onPointerDown={(e) => onRowPointerDown(e, track)}
                      onPointerMove={(e) => onRowPointerMove(e, track)}
                      onPointerUp={(e) => onRowPointerUp(e, track)}
                      onPointerCancel={(e) => onRowPointerUp(e, track)}
                    >
                      <button
                        type="button"
                        className={`${BUTTON_RESET} cursor-grab touch-none shrink-0 flex items-center`}
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
                        <GripVertical size={18} />
                      </button>

                      <button
                        type="button"
                        className={`${BUTTON_RESET} flex-1 min-w-0 h-full text-left truncate`}
                        style={{ color: "var(--text)" }}
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

        <label
          className="flex items-center justify-center m-2 p-2 rounded-full cursor-pointer self-center"
          style={{ color: "var(--accent)" }}
          aria-label="Add to playlist"
        >
          <Plus size={22} />
          <input
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </label>
      </div>
    </div>
  )
}
