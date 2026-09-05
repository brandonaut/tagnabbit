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
const WAVEFORM_PX_PER_SEC = 40
const WAVEFORM_HEIGHT = 56
// Below this many pixels of pointer movement, a waveform press-and-release is a tap
// (toggles play/pause) rather than a drag (scrubs position).
const TAP_MAX_MOVEMENT_PX = 6

interface WaveformPeaks {
  min: Float32Array
  max: Float32Array
  bucketCount: number
}

async function computeFileWaveform(file: File): Promise<WaveformPeaks> {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    return bucketWaveformPeaks(audioBuffer, WAVEFORM_PX_PER_SEC)
  } finally {
    ctx.close()
  }
}

// One [min, max] pair per pixel column, downmixed across channels — computed directly
// from the decoded buffer without ever materializing a full-length mono copy of it.
function bucketWaveformPeaks(buffer: AudioBuffer, pxPerSec: number): WaveformPeaks {
  const { sampleRate, numberOfChannels, length } = buffer
  const channels: Float32Array[] = []
  for (let c = 0; c < numberOfChannels; c++) channels.push(buffer.getChannelData(c))

  const samplesPerBucket = Math.max(1, Math.round(sampleRate / pxPerSec))
  const bucketCount = Math.max(1, Math.ceil(length / samplesPerBucket))
  const min = new Float32Array(bucketCount)
  const max = new Float32Array(bucketCount)

  let bucketIndex = 0
  let bucketMin = Infinity
  let bucketMax = -Infinity
  let countInBucket = 0
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let c = 0; c < numberOfChannels; c++) sum += channels[c][i]
    const value = sum / numberOfChannels
    if (value < bucketMin) bucketMin = value
    if (value > bucketMax) bucketMax = value
    countInBucket++
    if (countInBucket >= samplesPerBucket) {
      min[bucketIndex] = bucketMin
      max[bucketIndex] = bucketMax
      bucketIndex++
      bucketMin = Infinity
      bucketMax = -Infinity
      countInBucket = 0
    }
  }
  if (countInBucket > 0 && bucketIndex < bucketCount) {
    min[bucketIndex] = bucketMin
    max[bucketIndex] = bucketMax
  }

  return { min, max, bucketCount }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi)
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatBalance(value: number): string {
  if (value === 0) return "Center"
  const percent = Math.round(Math.abs(value) * 100)
  return `${percent}% ${value < 0 ? "L" : "R"}`
}

const DOUBLE_TAP_MS = 300

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
  const [waveformPeaks, setWaveformPeaks] = useState<WaveformPeaks | null>(null)
  const [isAnalyzingWaveform, setIsAnalyzingWaveform] = useState(false)

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
  const lastBalanceTapRef = useRef(0)

  const waveformRequestIdRef = useRef(0)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const waveformPlayheadRef = useRef<HTMLDivElement>(null)
  const waveformViewportRef = useRef<HTMLDivElement>(null)
  const waveformViewportWidthRef = useRef(0)
  const waveformBucketCountRef = useRef(0)
  const waveformPanAnimRef = useRef<number>(0)
  const waveformDraggingRef = useRef(false)
  const waveformPointerIdRef = useRef<number | null>(null)
  const waveformDragConfirmedRef = useRef(false)
  const waveformDragStartXRef = useRef(0)
  const waveformDragStartTimeRef = useRef(0)

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

      // Decoding is a separate pass from the <audio>/MediaElementAudioSourceNode
      // playback path above, kept off the critical path for playability — the file
      // is already loading/playable by the time this kicks off.
      const requestId = ++waveformRequestIdRef.current
      waveformBucketCountRef.current = 0
      setWaveformPeaks(null)
      setIsAnalyzingWaveform(true)
      computeFileWaveform(file)
        .then((peaks) => {
          if (waveformRequestIdRef.current === requestId) setWaveformPeaks(peaks)
        })
        .catch(() => {
          // Unsupported format or decode failure — leave the waveform unset;
          // the rest of the player keeps working normally.
        })
        .finally(() => {
          if (waveformRequestIdRef.current === requestId) setIsAnalyzingWaveform(false)
        })
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

  // Draws the full-track waveform once, when peaks for the current file become ready.
  // One canvas pixel column per peak bucket — panning afterward is a transform only.
  useEffect(() => {
    if (!waveformPeaks) return
    const canvas = waveformCanvasRef.current
    if (!canvas) return
    waveformBucketCountRef.current = waveformPeaks.bucketCount
    canvas.width = waveformPeaks.bucketCount
    canvas.height = WAVEFORM_HEIGHT
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = getComputedStyle(canvas).color
    const mid = WAVEFORM_HEIGHT / 2
    for (let x = 0; x < waveformPeaks.bucketCount; x++) {
      const yTop = mid + waveformPeaks.min[x] * mid
      const yBottom = mid + waveformPeaks.max[x] * mid
      ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop))
    }
  }, [waveformPeaks])

  // Tracks the waveform viewport's width for the pan-offset math below, without
  // triggering a re-render on resize. Re-attaches on `fileName` since the viewport
  // only exists in the DOM once a file is loaded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fileName drives a DOM (re)mount, not read directly in the effect body
  useEffect(() => {
    const el = waveformViewportRef.current
    if (!el) return
    waveformViewportWidthRef.current = el.clientWidth
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) waveformViewportWidthRef.current = entry.contentRect.width
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fileName])

  // Pans the canvas to keep `time` under the playhead, except near the very start or
  // end of the track, where panning further would show blank space past the actual
  // waveform — there the canvas offset clamps to its start/end position instead, and
  // the playhead itself moves off-center (to the left edge at time 0, to the right
  // edge at the track's end) to stay aligned with the real position underneath it.
  const panWaveformTo = useCallback((time: number) => {
    const canvas = waveformCanvasRef.current
    const playhead = waveformPlayheadRef.current
    if (!canvas || !playhead) return
    const viewportWidth = waveformViewportWidthRef.current
    const canvasWidth = waveformBucketCountRef.current

    const offset =
      canvasWidth <= viewportWidth
        ? (viewportWidth - canvasWidth) / 2
        : clamp(viewportWidth / 2 - time * WAVEFORM_PX_PER_SEC, viewportWidth - canvasWidth, 0)

    canvas.style.transform = `translateX(${offset}px)`
    playhead.style.left = `${clamp(offset + time * WAVEFORM_PX_PER_SEC, 0, viewportWidth)}px`
  }, [])

  // Pans the waveform every frame — timeupdate fires too sparsely (~4Hz) for smooth
  // motion at this px/sec rate. Runs continuously whenever the waveform is mounted
  // (paused included, where it's a cheap no-op); suspended only while an active drag
  // is directly driving the transform itself.
  useEffect(() => {
    function pan() {
      if (!waveformDraggingRef.current) {
        const audio = audioRef.current
        if (audio) panWaveformTo(audio.currentTime)
      }
      waveformPanAnimRef.current = requestAnimationFrame(pan)
    }
    waveformPanAnimRef.current = requestAnimationFrame(pan)
    return () => {
      if (waveformPanAnimRef.current) cancelAnimationFrame(waveformPanAnimRef.current)
    }
  }, [panWaveformTo])

  // A press-and-release that never crosses TAP_MAX_MOVEMENT_PX is a tap (toggles
  // play/pause via the same togglePlay() the main button uses); crossing it promotes
  // the gesture to a drag (scrubs position only — silent while paused, exactly like
  // the timeline slider, continuing to play at the new position if it already was).
  // Nothing about playback is touched until pointerup resolves which gesture it was.
  function handleWaveformPointerDown(e: React.PointerEvent) {
    const audio = audioRef.current
    if (!audio) return
    e.currentTarget.setPointerCapture(e.pointerId)
    waveformPointerIdRef.current = e.pointerId
    waveformDragStartXRef.current = e.clientX
    waveformDragStartTimeRef.current = audio.currentTime
    waveformDragConfirmedRef.current = false
  }

  function handleWaveformPointerMove(e: React.PointerEvent) {
    if (waveformPointerIdRef.current !== e.pointerId) return
    const audio = audioRef.current
    if (!audio) return
    const deltaX = e.clientX - waveformDragStartXRef.current

    if (!waveformDragConfirmedRef.current) {
      if (Math.abs(deltaX) < TAP_MAX_MOVEMENT_PX) return
      waveformDragConfirmedRef.current = true
      waveformDraggingRef.current = true
    }

    const max = duration || audio.duration || 0
    const newTime = clamp(waveformDragStartTimeRef.current - deltaX / WAVEFORM_PX_PER_SEC, 0, max)
    handleScrub(newTime)
    panWaveformTo(newTime)
  }

  function handleWaveformPointerUp(e: React.PointerEvent) {
    if (waveformPointerIdRef.current !== e.pointerId) return
    waveformPointerIdRef.current = null
    const wasDrag = waveformDragConfirmedRef.current
    waveformDraggingRef.current = false
    waveformDragConfirmedRef.current = false

    if (!wasDrag) togglePlay()
  }

  function handleBalanceChange(value: number) {
    setBalance(value)
    persistDebounced({ balance: value })
  }

  // Range inputs have no native double-tap event, so touch double-taps are
  // detected manually; onDoubleClick below covers mouse/trackpad for free.
  function handleBalanceTouchEnd() {
    const now = Date.now()
    if (now - lastBalanceTapRef.current < DOUBLE_TAP_MS) {
      handleBalanceChange(0)
      lastBalanceTapRef.current = 0
    } else {
      lastBalanceTapRef.current = now
    }
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

            {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: pointer-only tap/drag surface, no native role fits; aria-label still documents it for screen readers */}
            <div
              ref={waveformViewportRef}
              className="relative h-14 overflow-hidden rounded-md touch-none select-none"
              style={{ backgroundColor: "var(--bg-surface)" }}
              onPointerDown={handleWaveformPointerDown}
              onPointerMove={handleWaveformPointerMove}
              onPointerUp={handleWaveformPointerUp}
              onPointerCancel={handleWaveformPointerUp}
              aria-label="Waveform — tap to play or pause, drag to scrub"
            >
              {isAnalyzingWaveform && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
                  Analyzing waveform…
                </div>
              )}
              <canvas
                ref={waveformCanvasRef}
                className="absolute top-0 left-0 h-14"
                style={{ color: "var(--text-muted)" }}
              />
              <div
                ref={waveformPlayheadRef}
                className="pointer-events-none absolute inset-y-0 w-px bg-[var(--accent)]"
                style={{ left: "50%" }}
              />
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

            <div className="flex items-center gap-3">
              <input
                id="balance-slider"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={balance}
                onChange={(e) => handleBalanceChange(Number(e.target.value))}
                onDoubleClick={() => handleBalanceChange(0)}
                onTouchEnd={handleBalanceTouchEnd}
                aria-label="Balance"
                className="flex-1 max-w-[10rem]"
              />
              <span className="text-xs text-[var(--text-muted)] w-14 shrink-0">
                {formatBalance(balance)}
              </span>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={mono}
                  onChange={(e) => handleMonoChange(e.target.checked)}
                />
                Mono
              </label>
            </div>

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
