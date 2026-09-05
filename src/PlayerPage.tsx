import { FastForward, Music, Pause, Play, Rewind, SkipBack, SkipForward } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { getStoredPlayerFile, storePlayerFile, updatePlayerFileState } from "./cache/playerFile"
import Tuner from "./Tuner"
import { useWakeLock } from "./useWakeLock"

const SKIP_SECONDS = 10
const PERSIST_DEBOUNCE_MS = 500
// Clears the bottom tab bar's own height (see Layout.tsx) plus its usual gap.
const TUNER_FLOATING_BOTTOM = "calc(3.75rem + env(safe-area-inset-bottom) + 0.75rem)"
const MARQUEE_PX_PER_SEC = 40
const MARQUEE_MIN_SECONDS = 4
const MARQUEE_MAX_SECONDS = 14
const SPEED_OPTIONS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function PlayerPage() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  // -1 = full left, 0 = centered (original volume), 1 = full right.
  const [balance, setBalance] = useState(0)
  const [mono, setMono] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [marqueeDistance, setMarqueeDistance] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const fileNameBoxRef = useRef<HTMLDivElement>(null)
  const fileNameTextRef = useRef<HTMLSpanElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainLRef = useRef<GainNode | null>(null)
  const gainRRef = useRef<GainNode | null>(null)
  const mergerRef = useRef<ChannelMergerNode | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const balanceRef = useRef(balance)
  const monoRef = useRef(mono)
  const speedRef = useRef(speed)

  useWakeLock(isPlaying)

  useEffect(() => {
    balanceRef.current = balance
  }, [balance])
  useEffect(() => {
    monoRef.current = mono
  }, [mono])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // Measure whether the file name overflows its box, so it only scrolls when
  // it actually needs to — recheck on file change and on viewport resize.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fileName drives a DOM remeasure, not read directly in the effect body
  useEffect(() => {
    function measure() {
      const box = fileNameBoxRef.current
      const text = fileNameTextRef.current
      if (!box || !text) {
        setMarqueeDistance(0)
        return
      }
      const distance = text.scrollWidth - box.clientWidth
      setMarqueeDistance(distance > 0 ? distance : 0)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("resize", measure)
    }
  }, [fileName])

  // Built once, the first time a file loads, and reused for every later file
  // — MediaElementAudioSourceNode can only be created once per <audio> element.
  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audioCtxRef.current) return
    const ctx = new AudioContext()
    const source = ctx.createMediaElementSource(audio)
    const splitter = ctx.createChannelSplitter(2)
    const gainL = ctx.createGain()
    const gainR = ctx.createGain()
    const merger = ctx.createChannelMerger(2)
    source.connect(splitter)
    splitter.connect(gainL, 0)
    splitter.connect(gainR, 1)
    merger.connect(ctx.destination)
    audioCtxRef.current = ctx
    gainLRef.current = gainL
    gainRRef.current = gainR
    mergerRef.current = merger
  }, [])

  // Multiple connections into the same merger input sum automatically, so mono
  // is just wiring both gain outputs into both merger inputs instead of one each.
  const applyRouting = useCallback((monoOn: boolean) => {
    const gainL = gainLRef.current
    const gainR = gainRRef.current
    const merger = mergerRef.current
    if (!gainL || !gainR || !merger) return
    gainL.disconnect()
    gainR.disconnect()
    gainL.connect(merger, 0, 0)
    gainR.connect(merger, 0, 1)
    if (monoOn) {
      gainL.connect(merger, 0, 1)
      gainR.connect(merger, 0, 0)
    }
  }, [])

  const applyBalance = useCallback((value: number) => {
    const gainL = gainLRef.current
    const gainR = gainRRef.current
    if (!gainL || !gainR) return
    gainL.gain.value = value > 0 ? 1 - value : 1
    gainR.gain.value = value < 0 ? 1 + value : 1
  }, [])

  // playbackRate lives on the <audio> element itself, upstream of the Web
  // Audio graph above, so it needs no gain/routing node of its own.
  const applySpeed = useCallback((value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = value
    audio.preservesPitch = true
  }, [])

  useEffect(() => {
    applyRouting(mono)
  }, [mono, applyRouting])

  useEffect(() => {
    applyBalance(balance)
  }, [balance, applyBalance])

  useEffect(() => {
    applySpeed(speed)
  }, [speed, applySpeed])

  const loadFile = useCallback(
    (file: File, restore?: { position: number; balance: number; mono: boolean; speed: number }) => {
      const audio = audioRef.current
      if (!audio) return

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url

      ensureAudioGraph()
      audioCtxRef.current?.resume()
      // The mono/balance effects below only re-run when those *values* change,
      // which they usually don't on load (defaults are 0/false) — so a
      // freshly created graph's gain nodes need to be wired up here directly,
      // or they're left disconnected from the merger and no sound plays.
      applyRouting(restore?.mono ?? false)
      applyBalance(restore?.balance ?? 0)
      applySpeed(restore?.speed ?? 1)

      audio.pause()
      audio.src = url
      audio.load()

      setFileName(file.name)
      setIsPlaying(false)
      setCurrentTime(restore?.position ?? 0)
      setDuration(0)
      setBalance(restore?.balance ?? 0)
      setMono(restore?.mono ?? false)
      setSpeed(restore?.speed ?? 1)

      if (restore) {
        const onLoadedMetadata = () => {
          audio.currentTime = restore.position
          audio.removeEventListener("loadedmetadata", onLoadedMetadata)
        }
        audio.addEventListener("loadedmetadata", onLoadedMetadata)
      }
    },
    [ensureAudioGraph, applyRouting, applyBalance, applySpeed],
  )

  function handleFileSelected(file: File) {
    loadFile(file)
    storePlayerFile({
      blob: file,
      name: file.name,
      type: file.type,
      position: 0,
      balance: 0,
      mono: false,
      speed: 1,
    })
  }

  // Restore the previously loaded file, if any, on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const record = await getStoredPlayerFile()
      if (cancelled || !record) return
      const file = new File([record.blob], record.name, { type: record.type })
      loadFile(file, {
        position: record.position,
        balance: record.balance,
        mono: record.mono,
        speed: record.speed ?? 1,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [loadFile])

  function persistDebounced(
    overrides: Partial<{ position: number; balance: number; mono: boolean; speed: number }>,
  ) {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      updatePlayerFileState({
        position: overrides.position ?? audioRef.current?.currentTime ?? 0,
        balance: overrides.balance ?? balanceRef.current,
        mono: overrides.mono ?? monoRef.current,
        speed: overrides.speed ?? speedRef.current,
      })
    }, PERSIST_DEBOUNCE_MS)
  }

  // Flushes the current position/balance/mono immediately — used whenever
  // continued drift between saves would be noticeable (pause, unmount).
  const persistNow = useCallback(() => {
    if (!objectUrlRef.current) return
    updatePlayerFileState({
      position: audioRef.current?.currentTime ?? 0,
      balance: balanceRef.current,
      mono: monoRef.current,
      speed: speedRef.current,
    })
  }, [])

  useEffect(() => {
    return () => {
      persistNow()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
      audioCtxRef.current?.close()
    }
  }, [persistNow])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelected(file)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    audioCtxRef.current?.resume()
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }

  function skip(seconds: number) {
    const audio = audioRef.current
    if (!audio) return
    const max = duration || audio.duration || 0
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), max)
  }

  function skipToStart() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
  }

  function skipToEnd() {
    const audio = audioRef.current
    if (!audio) return
    const max = duration || audio.duration || 0
    audio.currentTime = max
  }

  function handleScrub(value: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
    persistDebounced({ position: value })
  }

  function handleBalanceChange(value: number) {
    setBalance(value)
    persistDebounced({ balance: value })
  }

  function handleMonoChange(value: boolean) {
    setMono(value)
    persistDebounced({ mono: value })
  }

  function handleSpeedChange(value: number) {
    setSpeed(value)
    persistDebounced({ speed: value })
  }

  return (
    <div className="max-w-2xl mx-auto pt-4 px-4 pb-24 flex flex-col gap-4 relative">
      <h1 className="m-0 text-2xl font-bold">Player</h1>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop zone; the file picker below covers keyboard/non-drag use */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
      >
        {!fileName ? (
          <label
            className={`flex flex-col items-center justify-center gap-2 py-12 px-4 rounded-lg border-2 border-dashed cursor-pointer text-center ${isDraggingOver ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
            style={{ color: "var(--text-muted)" }}
          >
            <Music size={32} />
            <span>Choose an audio file, or drag one here</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelected(file)
              }}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <div ref={fileNameBoxRef} className="overflow-hidden">
              <div
                className={marqueeDistance > 0 ? "flex w-max" : undefined}
                style={
                  marqueeDistance > 0
                    ? {
                        animation: `marquee-loop ${Math.min(MARQUEE_MAX_SECONDS, Math.max(MARQUEE_MIN_SECONDS, marqueeDistance / MARQUEE_PX_PER_SEC))}s linear infinite`,
                      }
                    : undefined
                }
              >
                <span
                  ref={fileNameTextRef}
                  className={`inline-block text-sm text-[var(--text-muted)] whitespace-nowrap ${marqueeDistance > 0 ? "pr-8" : ""}`}
                >
                  {fileName}
                </span>
                {marqueeDistance > 0 && (
                  <span
                    aria-hidden="true"
                    className="inline-block text-sm text-[var(--text-muted)] whitespace-nowrap pr-8"
                  >
                    {fileName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleScrub(Number(e.target.value))}
                className="w-full"
                aria-label="Playback position"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={skipToStart} aria-label="Jump to start">
                <SkipBack size={18} />
              </button>
              <button
                type="button"
                onClick={() => skip(-SKIP_SECONDS)}
                aria-label="Skip back 10 seconds"
                className="relative"
              >
                <Rewind size={20} />
                <span className="absolute inset-x-0 bottom-0.5 text-[0.55rem] font-bold leading-none pointer-events-none">
                  {SKIP_SECONDS}
                </span>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="py-3 px-4"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button
                type="button"
                onClick={() => skip(SKIP_SECONDS)}
                aria-label="Skip forward 10 seconds"
                className="relative"
              >
                <FastForward size={20} />
                <span className="absolute inset-x-0 bottom-0.5 text-[0.55rem] font-bold leading-none pointer-events-none">
                  {SKIP_SECONDS}
                </span>
              </button>
              <button type="button" onClick={skipToEnd} aria-label="Jump to end">
                <SkipForward size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="balance-slider" className="text-xs text-[var(--text-muted)]">
                Balance
              </label>
              <input
                id="balance-slider"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={balance}
                onChange={(e) => handleBalanceChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[0.65rem] text-[var(--text-muted)]">
                <span>L</span>
                <span>R</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mono}
                onChange={(e) => handleMonoChange(e.target.checked)}
              />
              Mono
            </label>

            <label className="flex items-center gap-2 text-sm">
              Speed
              <select
                value={speed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="ml-1"
              >
                {SPEED_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}x
                  </option>
                ))}
              </select>
            </label>

            <label
              className="text-xs underline cursor-pointer w-fit"
              style={{ color: "var(--text-muted)" }}
            >
              Load a different file
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelected(file)
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: instrumental/vocal practice recording, no caption source exists */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false)
          persistNow()
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />

      <Tuner
        defaultKey="C"
        defaultTemperament="et"
        defaultSize="small"
        collapsible
        floatingBottom={TUNER_FLOATING_BOTTOM}
      />
    </div>
  )
}
