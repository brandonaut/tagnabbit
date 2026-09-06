import { FastForward, Minus, Pause, Play, Plus, Rewind, SkipBack, SkipForward } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  addTracks,
  getGlobalState,
  getPlaylist,
  type PlaylistTrack,
  removeTrack,
  reorderTracks,
  setGlobalState,
} from "./cache/playerFile"
import PlaylistList from "./PlaylistList"
import Tuner from "./Tuner"
import { useWakeLock } from "./useWakeLock"

const SKIP_SECONDS = 10
// Clears the bottom tab bar's own height (see Layout.tsx) plus its usual gap.
const TUNER_FLOATING_BOTTOM = "calc(3.75rem + env(safe-area-inset-bottom) + 0.75rem)"
const MARQUEE_PX_PER_SEC = 22
const MARQUEE_MIN_SECONDS = 8
const MARQUEE_MAX_SECONDS = 20
const SPEED_OPTIONS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2]
const WAVEFORM_PX_PER_SEC = 40
const WAVEFORM_HEIGHT = 56
// Below this many pixels of pointer movement, a waveform press-and-release is a tap
// (toggles play/pause) rather than a drag (scrubs position).
const TAP_MAX_MOVEMENT_PX = 6
// Beyond this many pixels of horizontal swipe on a playlist row, releasing removes it.
const SWIPE_REMOVE_THRESHOLD_PX = 80
// Pointer travel on a playlist row before its gesture locks to an axis: a
// horizontal lock becomes a swipe-to-remove, a vertical lock is left to the
// browser as a list scroll.
const SWIPE_DIRECTION_LOCK_PX = 10
const DEFAULT_ROW_HEIGHT_PX = 56
// The previous-track control restarts the current track below this many elapsed
// seconds; past it, the first press restarts the track instead of switching tracks.
const PREV_TRACK_THRESHOLD_SECONDS = 3

interface WaveformPeaks {
  min: Float32Array
  max: Float32Array
  bucketCount: number
}

async function computeFileWaveform(blob: Blob): Promise<WaveformPeaks> {
  const arrayBuffer = await blob.arrayBuffer()
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
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([])
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [addTracksError, setAddTracksError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  // -1 = full left, 0 = centered (original volume), 1 = full right.
  const [balance, setBalance] = useState(0)
  const [mono, setMono] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [marqueeDistance, setMarqueeDistance] = useState(0)
  const [waveformPeaks, setWaveformPeaks] = useState<WaveformPeaks | null>(null)
  const [isAnalyzingWaveform, setIsAnalyzingWaveform] = useState(false)

  const activeTrack = playlist.find((t) => t.id === activeTrackId) ?? null

  const audioRef = useRef<HTMLAudioElement>(null)
  const fileNameBoxRef = useRef<HTMLDivElement>(null)
  const fileNameTextRef = useRef<HTMLSpanElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainLRef = useRef<GainNode | null>(null)
  const gainRRef = useRef<GainNode | null>(null)
  const mergerRef = useRef<ChannelMergerNode | null>(null)
  const activeTrackIdRef = useRef<string | null>(null)
  const monoRef = useRef(mono)
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

  const minimapViewportRef = useRef<HTMLDivElement>(null)
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null)
  const minimapPlayheadRef = useRef<HTMLDivElement>(null)
  const minimapWindowRef = useRef<HTMLDivElement>(null)
  const minimapWidthRef = useRef(0)
  const minimapPointerActiveRef = useRef(false)

  const dragTrackIdRef = useRef<string | null>(null)
  const dragStartYRef = useRef(0)
  const dragOriginIndexRef = useRef(0)
  const dragRowHeightRef = useRef(DEFAULT_ROW_HEIGHT_PX)

  const swipePointerIdRef = useRef<number | null>(null)
  const swipeTrackIdRef = useRef<string | null>(null)
  const swipeStartXRef = useRef(0)
  const swipeStartYRef = useRef(0)
  const swipeAxisRef = useRef<"undecided" | "x" | "y">("undecided")

  useWakeLock(isPlaying)

  useEffect(() => {
    monoRef.current = mono
  }, [mono])

  // Measure whether the track name overflows its box, so it only scrolls when
  // it actually needs to — recheck on track change and on viewport resize.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeTrack drives a DOM remeasure, not read directly in the effect body
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
  }, [activeTrack?.name])

  // Built once, the first time a track loads, and reused for every later track
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

  const loadTrack = useCallback(
    (track: PlaylistTrack, opts: { autoplay: boolean }) => {
      const audio = audioRef.current
      if (!audio) return

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(track.blob)
      objectUrlRef.current = url

      ensureAudioGraph()
      audioCtxRef.current?.resume()
      // Balance and speed are never persisted — every track always starts at
      // centered balance and normal speed, same as position always starts at 0.
      // The mono/balance effects below only re-run when those *values* change,
      // which they usually don't on load — so a freshly created graph's gain
      // nodes need to be wired up here directly, or they're left disconnected
      // from the merger and no sound plays.
      applyRouting(monoRef.current)
      applyBalance(0)
      applySpeed(1)

      audio.pause()
      audio.src = url
      audio.load()

      activeTrackIdRef.current = track.id
      setActiveTrackId(track.id)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setBalance(0)
      setSpeed(1)

      setGlobalState({ activeTrackId: track.id })

      // Decoding is a separate pass from the <audio>/MediaElementAudioSourceNode
      // playback path above, kept off the critical path for playability — the
      // track is already loading/playable by the time this kicks off.
      const requestId = ++waveformRequestIdRef.current
      waveformBucketCountRef.current = 0
      setWaveformPeaks(null)
      setIsAnalyzingWaveform(true)
      // setWaveformPeaks(null) alone doesn't repaint the canvas — the draw effect
      // only runs when peaks arrive, so without this the previous track's waveform
      // would keep showing through behind the "Loading…" placeholder.
      const canvas = waveformCanvasRef.current
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
      const minimapCanvas = minimapCanvasRef.current
      minimapCanvas?.getContext("2d")?.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height)
      computeFileWaveform(track.blob)
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

      if (opts.autoplay) {
        audioCtxRef.current?.resume()
        audio.play()
      }
    },
    [ensureAudioGraph, applyRouting, applyBalance, applySpeed],
  )

  async function handleFilesAdded(files: File[]) {
    if (files.length === 0) return
    const result = await addTracks(files)
    if (result.added.length > 0) {
      setPlaylist((prev) => [...prev, ...result.added].sort((a, b) => a.order - b.order))
      // Invariant: whenever the playlist is non-empty, some track is active. If
      // nothing was active before this add (an empty playlist), the first newly
      // added track becomes active — loaded paused, since adding files isn't a
      // tap on a specific track.
      if (!activeTrackIdRef.current) {
        loadTrack(result.added[0], { autoplay: false })
      }
    }
    if (result.failed.some((f) => f.reason === "quota")) {
      setAddTracksError("Not enough storage space to add every file — some tracks weren't added.")
    } else if (result.failed.length > 0) {
      setAddTracksError("Some files couldn't be added.")
    }
  }

  function handleSelectTrack(track: PlaylistTrack) {
    loadTrack(track, { autoplay: true })
  }

  async function removeTrackFromPlaylist(id: string) {
    await removeTrack(id)
    const remaining = playlist.filter((t) => t.id !== id)
    setPlaylist(remaining)
    if (activeTrackIdRef.current !== id) return

    // Invariant: whenever the playlist is non-empty, some track is active — fall
    // back to the new first track (paused, no gesture behind this) rather than
    // leaving the player in its empty state while tracks still remain.
    if (remaining.length > 0) {
      loadTrack(remaining[0], { autoplay: false })
      return
    }
    const audio = audioRef.current
    audio?.pause()
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    activeTrackIdRef.current = null
    setActiveTrackId(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setWaveformPeaks(null)
    setGlobalState({ activeTrackId: null })
  }

  // Restore the persisted playlist, global settings, and last-active track (if
  // any) on mount. The active track loads paused, not autoplaying — there's no
  // user gesture behind a bare page load, unlike an explicit tap in the playlist.
  // Invariant: whenever the restored playlist is non-empty, some track ends up
  // active — falling back to the first track if there's no persisted (or no
  // longer valid) activeTrackId.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [tracks, globalState] = await Promise.all([getPlaylist(), getGlobalState()])
      if (cancelled) return
      setPlaylist(tracks)
      setMono(globalState.mono)
      // Set directly rather than waiting for the mono-sync effect above (which
      // runs after this commits) — loadTrack below needs the restored value now.
      monoRef.current = globalState.mono
      const restoredActive = tracks.find((t) => t.id === globalState.activeTrackId)
      if (restoredActive) {
        loadTrack(restoredActive, { autoplay: false })
      } else if (tracks.length > 0) {
        loadTrack(tracks[0], { autoplay: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadTrack])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

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

  // Finds the track adjacent to the active one in playlist order — used by both
  // the manual previous/next controls and the auto-advance-on-end handler below.
  function getAdjacentTrack(offset: 1 | -1): PlaylistTrack | null {
    if (!activeTrackId) return null
    const index = playlist.findIndex((t) => t.id === activeTrackId)
    if (index === -1) return null
    return playlist[index + offset] ?? null
  }

  function handleNextTrack() {
    const next = getAdjacentTrack(1)
    if (next) {
      loadTrack(next, { autoplay: isPlaying })
      return
    }
    // No next track — mirrors the previous-track control's fallback (jump to an
    // edge of the current track) rather than doing nothing.
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = duration || audio.duration || 0
  }

  // Separate from handleNextTrack: reaching a track's natural end fires a
  // `pause` event (per the HTML media spec) before `ended`, which already
  // flips isPlaying to false by the time this runs — so this can't reuse
  // handleNextTrack's isPlaying-based autoplay decision. Reaching "ended"
  // means it was playing by definition, so this always autoplays the next
  // track if one exists, and does nothing (no jump-to-end) otherwise.
  function handleTrackEnded() {
    const next = getAdjacentTrack(1)
    if (next) loadTrack(next, { autoplay: true })
  }

  // Classic media-player "previous" behavior: restart the current track if
  // meaningfully into it, otherwise fall back one track in the playlist.
  function handlePreviousTrack() {
    const audio = audioRef.current
    const nearStart = !audio || audio.currentTime <= PREV_TRACK_THRESHOLD_SECONDS
    if (!nearStart) {
      handleScrub(0)
      return
    }
    const prev = getAdjacentTrack(-1)
    if (prev) {
      loadTrack(prev, { autoplay: isPlaying })
    } else {
      handleScrub(0)
    }
  }

  function handleScrub(value: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  // Draws the full-track waveform once, when peaks for the current track become ready.
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

  // The minimap shows the whole track at once (one device pixel column per
  // resampled peak bucket), so its width tracks the element rather than the
  // bucket count — redrawn on peaks-ready and on resize.
  const drawMinimap = useCallback(() => {
    const wrapper = minimapViewportRef.current
    const canvas = minimapCanvasRef.current
    if (!wrapper || !canvas || !waveformPeaks) return
    const cssWidth = wrapper.clientWidth
    const cssHeight = wrapper.clientHeight
    if (cssWidth === 0 || cssHeight === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = getComputedStyle(canvas).color
    const mid = canvas.height / 2
    const { min, max, bucketCount } = waveformPeaks
    for (let x = 0; x < canvas.width; x++) {
      const b = Math.min(bucketCount - 1, Math.floor((x / canvas.width) * bucketCount))
      const yTop = mid + min[b] * mid
      const yBottom = mid + max[b] * mid
      ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop))
    }
  }, [waveformPeaks])

  // Re-attaches on the active track since the minimap only exists in the DOM
  // once a track is loaded; drawMinimap's own dependency on waveformPeaks covers
  // the redraw when analysis finishes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeTrack drives a DOM (re)mount, not read directly in the effect body
  useEffect(() => {
    const el = minimapViewportRef.current
    if (!el) return
    minimapWidthRef.current = el.clientWidth
    drawMinimap()
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) minimapWidthRef.current = entry.contentRect.width
      drawMinimap()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [drawMinimap, activeTrack])

  // Tracks the waveform viewport's width for the pan-offset math below, without
  // triggering a re-render on resize. Re-attaches on the active track since the
  // viewport only exists in the DOM once a track is loaded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeTrack drives a DOM (re)mount, not read directly in the effect body
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
  }, [activeTrack])

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

    // The minimap playhead and window box are driven from the same frame: the
    // window box marks the slice the detail waveform above is currently showing,
    // derived from the very `offset` just computed so the two never disagree.
    const minimapWidth = minimapWidthRef.current
    const minimapPlayhead = minimapPlayheadRef.current
    const minimapWindow = minimapWindowRef.current
    const trackDuration = audioRef.current?.duration ?? 0
    if (minimapWidth > 0 && Number.isFinite(trackDuration) && trackDuration > 0) {
      if (minimapPlayhead) {
        minimapPlayhead.style.left = `${(time / trackDuration) * minimapWidth}px`
        minimapPlayhead.hidden = false
      }
      if (minimapWindow) {
        const spanSeconds = viewportWidth / WAVEFORM_PX_PER_SEC
        const startTime = canvasWidth <= viewportWidth ? 0 : -offset / WAVEFORM_PX_PER_SEC
        minimapWindow.style.left = `${(startTime / trackDuration) * minimapWidth}px`
        minimapWindow.style.width = `${clamp(spanSeconds / trackDuration, 0, 1) * minimapWidth}px`
        minimapWindow.hidden = false
      }
    } else {
      if (minimapPlayhead) minimapPlayhead.hidden = true
      if (minimapWindow) minimapWindow.hidden = true
    }
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

  // Unlike the waveform's relative drag, every press on the minimap is an
  // absolute seek: pointer x maps straight to a fraction of the whole track.
  function seekFromMinimap(clientX: number) {
    const wrapper = minimapViewportRef.current
    const audio = audioRef.current
    if (!wrapper || !audio) return
    const rect = wrapper.getBoundingClientRect()
    const max = duration || audio.duration || 0
    if (rect.width === 0 || max <= 0) return
    const time = clamp(((clientX - rect.left) / rect.width) * max, 0, max)
    handleScrub(time)
    panWaveformTo(time)
  }

  function handleMinimapPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    minimapPointerActiveRef.current = true
    seekFromMinimap(e.clientX)
  }

  function handleMinimapPointerMove(e: React.PointerEvent) {
    if (!minimapPointerActiveRef.current) return
    seekFromMinimap(e.clientX)
  }

  function handleMinimapPointerUp(e: React.PointerEvent) {
    if (!minimapPointerActiveRef.current) return
    minimapPointerActiveRef.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  function handleBalanceChange(value: number) {
    setBalance(value)
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
    setGlobalState({ mono: value })
  }

  function handleSpeedChange(value: number) {
    setSpeed(value)
  }

  // Steps to the adjacent preset in SPEED_OPTIONS — same shape as
  // getAdjacentTrack (find current position in a fixed ordered list, step by
  // one, clamp at the ends) rather than a fixed numeric increment, so the
  // result is always a value the dropdown can already display.
  function getAdjacentSpeed(offset: 1 | -1): number | null {
    const index = SPEED_OPTIONS.indexOf(speed)
    if (index === -1) return null
    return SPEED_OPTIONS[index + offset] ?? null
  }

  function handleSpeedStep(offset: 1 | -1) {
    const next = getAdjacentSpeed(offset)
    if (next !== null) handleSpeedChange(next)
  }

  function handleDragHandlePointerDown(e: React.PointerEvent, track: PlaylistTrack, index: number) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragTrackIdRef.current = track.id
    dragStartYRef.current = e.clientY
    dragOriginIndexRef.current = index
    const row = (e.currentTarget as HTMLElement).closest("[data-playlist-row]")
    dragRowHeightRef.current = row?.getBoundingClientRect().height || DEFAULT_ROW_HEIGHT_PX
  }

  function handleDragHandlePointerMove(e: React.PointerEvent) {
    const trackId = dragTrackIdRef.current
    if (!trackId) return
    const deltaY = e.clientY - dragStartYRef.current
    const rowHeight = dragRowHeightRef.current || DEFAULT_ROW_HEIGHT_PX
    const shift = Math.round(deltaY / rowHeight)
    setPlaylist((prev) => {
      const currentIndex = prev.findIndex((t) => t.id === trackId)
      if (currentIndex === -1) return prev
      const targetIndex = clamp(dragOriginIndexRef.current + shift, 0, prev.length - 1)
      if (targetIndex === currentIndex) return prev
      const next = [...prev]
      const [moved] = next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  function handleDragHandlePointerUp() {
    if (!dragTrackIdRef.current) return
    dragTrackIdRef.current = null
    setPlaylist((prev) => {
      reorderTracks(prev.map((t) => t.id))
      return prev
    })
  }

  // No pointer capture on press: the browser keeps handling the touch (so a
  // vertical drag scrolls the list) until a move locks the gesture to the
  // horizontal axis, at which point this takes the pointer for a swipe.
  function handleRowPointerDown(e: React.PointerEvent<HTMLDivElement>, track: PlaylistTrack) {
    swipePointerIdRef.current = e.pointerId
    swipeTrackIdRef.current = track.id
    swipeStartXRef.current = e.clientX
    swipeStartYRef.current = e.clientY
    swipeAxisRef.current = "undecided"
  }

  function handleRowPointerMove(e: React.PointerEvent<HTMLDivElement>, track: PlaylistTrack) {
    if (swipePointerIdRef.current !== e.pointerId || swipeTrackIdRef.current !== track.id) return
    const deltaX = e.clientX - swipeStartXRef.current
    const deltaY = e.clientY - swipeStartYRef.current

    if (swipeAxisRef.current === "undecided") {
      if (
        Math.abs(deltaX) < SWIPE_DIRECTION_LOCK_PX &&
        Math.abs(deltaY) < SWIPE_DIRECTION_LOCK_PX
      ) {
        return
      }
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        // Vertical intent — let the browser scroll the list; stop tracking.
        swipeAxisRef.current = "y"
        swipePointerIdRef.current = null
        swipeTrackIdRef.current = null
        return
      }
      swipeAxisRef.current = "x"
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    e.currentTarget.style.transform = `translateX(${deltaX}px)`
    // The reveal layer sits behind this row as its previous sibling — swiping
    // left uncovers its right side first (and vice versa), so the trash icon
    // is justified to whichever side the swipe is opening up from.
    const reveal = e.currentTarget.previousElementSibling as HTMLElement | null
    if (reveal) reveal.style.justifyContent = deltaX < 0 ? "flex-end" : "flex-start"
  }

  function handleRowPointerUp(e: React.PointerEvent<HTMLDivElement>, track: PlaylistTrack) {
    if (swipePointerIdRef.current !== e.pointerId) return
    const deltaX = e.clientX - swipeStartXRef.current
    const wasSwipe = swipeAxisRef.current === "x"
    swipePointerIdRef.current = null
    swipeTrackIdRef.current = null
    swipeAxisRef.current = "undecided"
    if (wasSwipe && Math.abs(deltaX) > SWIPE_REMOVE_THRESHOLD_PX) {
      removeTrackFromPlaylist(track.id)
    } else {
      e.currentTarget.style.transform = ""
    }
  }

  return (
    <div
      className="fixed inset-x-0 top-0 overflow-hidden"
      style={{
        bottom: "calc(3.75rem + env(safe-area-inset-bottom))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="max-w-2xl mx-auto h-full flex flex-col">
        <PlaylistList
          tracks={playlist}
          activeTrackId={activeTrackId}
          errorMessage={addTracksError}
          onDismissError={() => setAddTracksError(null)}
          onFilesAdded={handleFilesAdded}
          onSelectTrack={handleSelectTrack}
          onRemoveTrack={removeTrackFromPlaylist}
          onDragHandlePointerDown={handleDragHandlePointerDown}
          onDragHandlePointerMove={handleDragHandlePointerMove}
          onDragHandlePointerUp={handleDragHandlePointerUp}
          onRowPointerDown={handleRowPointerDown}
          onRowPointerMove={handleRowPointerMove}
          onRowPointerUp={handleRowPointerUp}
        />

        {activeTrack && (
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-3 flex flex-col gap-4">
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
                  {activeTrack.name}
                </span>
                {marqueeDistance > 0 && (
                  <span
                    aria-hidden="true"
                    className="inline-block text-sm text-[var(--text-muted)] whitespace-nowrap pr-8"
                  >
                    {activeTrack.name}
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
                  Loading…
                </div>
              )}
              <canvas
                ref={waveformCanvasRef}
                className="absolute top-0 left-0 h-14"
                style={{ color: "var(--text-muted)" }}
              />
              <div
                ref={waveformPlayheadRef}
                className={`pointer-events-none absolute inset-y-0 w-px bg-[var(--accent)] ${
                  waveformPeaks ? "" : "hidden"
                }`}
                style={{ left: "50%" }}
              />
            </div>

            <div className="flex flex-col gap-1">
              {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: pointer-only seek surface, no native role fits; the visually-hidden range input below is the keyboard/AT equivalent */}
              <div
                ref={minimapViewportRef}
                className="relative h-8 overflow-hidden rounded-md touch-none select-none"
                style={{ backgroundColor: "var(--bg-surface)" }}
                onPointerDown={handleMinimapPointerDown}
                onPointerMove={handleMinimapPointerMove}
                onPointerUp={handleMinimapPointerUp}
                onPointerCancel={handleMinimapPointerUp}
                aria-label="Track minimap — tap or drag anywhere to seek"
              >
                {isAnalyzingWaveform && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
                    Loading…
                  </div>
                )}
                <canvas
                  ref={minimapCanvasRef}
                  className="absolute inset-0 h-full w-full"
                  style={{ color: "var(--text-muted)" }}
                />
                <div
                  ref={minimapWindowRef}
                  hidden
                  className="pointer-events-none absolute inset-y-0"
                  style={{
                    border: "1px solid var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
                  }}
                />
                <div
                  ref={minimapPlayheadRef}
                  hidden
                  className="pointer-events-none absolute inset-y-0 w-px bg-[var(--accent)]"
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleScrub(Number(e.target.value))}
                  className="sr-only"
                  aria-label="Playback position"
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={handlePreviousTrack} aria-label="Previous track">
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
              <button type="button" onClick={handleNextTrack} aria-label="Next track">
                <SkipForward size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-[var(--text-muted)]">Speed</span>
                <button
                  type="button"
                  className="bg-transparent border-0 p-0 disabled:opacity-40"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => handleSpeedStep(-1)}
                  disabled={getAdjacentSpeed(-1) === null}
                  aria-label="Decrease speed"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center tabular-nums">{speed}x</span>
                <button
                  type="button"
                  className="bg-transparent border-0 p-0 disabled:opacity-40"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => handleSpeedStep(1)}
                  disabled={getAdjacentSpeed(1) === null}
                  aria-label="Increase speed"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <label htmlFor="balance-slider" className="w-16 shrink-0 text-[var(--text-muted)]">
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
                  onDoubleClick={() => handleBalanceChange(0)}
                  onTouchEnd={handleBalanceTouchEnd}
                  aria-label="Balance"
                  className="flex-1 max-w-[10rem]"
                />
                <span className="text-xs text-[var(--text-muted)] w-14 shrink-0">
                  {formatBalance(balance)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <label
                  htmlFor="mono-toggle"
                  className="w-16 shrink-0 text-[var(--text-muted)] cursor-pointer"
                >
                  Mono
                </label>
                <input
                  id="mono-toggle"
                  type="checkbox"
                  checked={mono}
                  onChange={(e) => handleMonoChange(e.target.checked)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: instrumental/vocal practice recording, no caption source exists */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={handleTrackEnded}
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
