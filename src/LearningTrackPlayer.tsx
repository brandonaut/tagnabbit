import { ChevronDown, Pause, Play } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface Props {
  tracks: Record<string, string>
  visible?: boolean
}

export default function LearningTrackPlayer({ tracks, visible = true }: Props) {
  const trackNames = Object.keys(tracks)
  const [selectedTrack, setSelectedTrack] = useState(trackNames[0] ?? "")
  const [playing, setPlaying] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    if (!pickerOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [pickerOpen])

  function selectTrack(name: string) {
    const wasPlaying = playing
    audioRef.current?.pause()
    setSelectedTrack(name)
    setPickerOpen(false)
    if (wasPlaying && audioRef.current) {
      audioRef.current.src = tracks[name] ?? ""
      audioRef.current.play()
    }
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      if (!audio.src || !audio.src.endsWith(encodeURIComponent(tracks[selectedTrack] ?? ""))) {
        audio.src = tracks[selectedTrack] ?? ""
      }
      audio.play()
      setPlaying(true)
    }
  }

  if (trackNames.length === 0) return null

  return (
    <>
      {/* biome-ignore lint/a11y/useMediaCaption: learning tracks are audio-only, captions not applicable */}
      <audio
        ref={audioRef}
        src={tracks[selectedTrack]}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only */}
      <div
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 opacity-90 z-50 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-24"}`}
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {pickerOpen && (
          <div className="absolute bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 flex flex-col gap-1 bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#3334] rounded-lg p-2 z-10 min-w-max">
            {trackNames.map((name) => (
              <button
                key={name}
                type="button"
                className={`text-[0.85rem] py-[0.35em] px-3 text-left${name === selectedTrack ? " bg-[#646cff] border-[#646cff] text-white" : ""}`}
                onClick={() => selectTrack(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div className="flex">
          <button
            type="button"
            className={`text-[0.85rem] select-none rounded-l-[6px] rounded-r-none border-r-0 flex items-center gap-1.5${playing ? " bg-[#646cff] border-[#646cff] text-white" : ""}`}
            onClick={togglePlay}
            aria-label={playing ? "Pause learning track" : "Play learning track"}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {selectedTrack}
          </button>
          {trackNames.length > 1 && (
            <button
              type="button"
              className="py-[0.6em] px-[0.6em] rounded-l-none rounded-r-[6px] leading-none"
              onClick={() => setPickerOpen((o) => !o)}
              aria-label="Change learning track"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
