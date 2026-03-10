import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63,
  "C#": 277.18,
  Db: 277.18,
  D: 293.66,
  "D#": 311.13,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  Gb: 369.99,
  G: 392.0,
  "G#": 415.3,
  Ab: 415.3,
  A: 440.0,
  "A#": 466.16,
  Bb: 466.16,
  B: 493.88,
}

const ENHARMONIC: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
}

interface Props {
  defaultNote: string
  visible?: boolean
}

export default function PitchPipe({ defaultNote, visible = true }: Props) {
  const [selectedNote, setSelectedNote] = useState(() => ENHARMONIC[defaultNote] ?? defaultNote)
  const [pickerOpen, setPickerOpen] = useState(false)
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) {
        audio.osc.stop()
        audio.ctx.close()
        audioRef.current = null
      }
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

  function startTone() {
    if (audioRef.current) return
    const freq = NOTE_FREQUENCIES[selectedNote]
    if (!freq) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = freq
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    audioRef.current = { ctx, osc, gain }
  }

  function stopTone() {
    const audio = audioRef.current
    if (!audio) return
    audio.osc.stop()
    audio.ctx.close()
    audioRef.current = null
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only, not an interactive element */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, not an interactive element */}
      <div
        className={`fixed bottom-3 left-3 opacity-90 z-50 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-24"}`}
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {pickerOpen && (
          <div className="absolute bottom-[calc(100%+0.5rem)] left-0 grid grid-cols-[repeat(4,2.75rem)] gap-1 bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#3334] rounded-lg p-2 z-10">
            {CHROMATIC_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                className={`text-[0.85rem] py-[0.35em] w-full text-center${note === selectedNote ? " bg-[#646cff] border-[#646cff] text-white" : ""}`}
                onClick={() => {
                  setSelectedNote(note)
                  setPickerOpen(false)
                }}
              >
                {note}
              </button>
            ))}
          </div>
        )}
        <div className="flex">
          <button
            type="button"
            className="text-base select-none rounded-l-[6px] rounded-r-none border-r-0 active:bg-[#646cff] active:border-[#646cff] active:text-white"
            onMouseDown={startTone}
            onMouseUp={stopTone}
            onMouseLeave={stopTone}
            onTouchStart={startTone}
            onTouchEnd={stopTone}
            onTouchCancel={stopTone}
          >
            {selectedNote}
          </button>
          <button
            type="button"
            className="py-[0.6em] px-[0.6em] rounded-l-none rounded-r-[6px] leading-none"
            onClick={() => setPickerOpen((o) => !o)}
            aria-label="Change pitch"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
