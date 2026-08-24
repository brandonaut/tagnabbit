import { CircleGauge, Maximize2, Minimize2, Pencil } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { wedgeColor } from "./noteColors"
import { ENHARMONIC, NOTE_DISPLAY, NOTE_FREQUENCIES, NOTE_NAMES } from "./notes"
import {
  ARC_INNER_R,
  ARC_OUTER_R,
  angleToNoteIdx,
  CX,
  CY,
  DIVIDER_INNER_R,
  INNER_R,
  LABEL_R,
  OUTER_R,
  ringSegment,
  segmentArc,
  toXY,
} from "./tuner/geometry"
import {
  DECIMATED_SIZE,
  type DetectBuffers,
  detectPitch,
  FFT_SIZE,
  REFINE_HALF_WIDTH,
} from "./tuner/pitchDetection"
import {
  centsToAngle,
  freqToCents,
  median3,
  nearestTarget,
  semitoneToNote,
  type Target,
} from "./tuner/tuning"

interface WheelProps {
  detectedNoteIdx: number | null
  cents: number
  angleOffset: number
  color: string
  noteName: string | null
  octave: number | null
  referenceNoteIdx: number
  temperament: "ji" | "et"
  pickingKey: boolean
  onPlayStart: (pointerId: number, noteIdx: number) => void
  onNoteChange: (pointerId: number, noteIdx: number) => void
  onPlayStop: (pointerId: number) => void
  onSelectKey: (noteIdx: number) => void
  onSelectET: () => void
}

function PitchWheel({
  detectedNoteIdx,
  cents,
  angleOffset,
  color,
  noteName,
  octave,
  referenceNoteIdx,
  temperament,
  pickingKey,
  onPlayStart,
  onNoteChange,
  onPlayStop,
  onSelectKey,
  onSelectET,
}: WheelProps) {
  const hasNote = detectedNoteIdx !== null

  // The arc stays mounted so it can fade rather than vanish when the reading clears, so
  // its last angle is held here — otherwise it would swing back to C mid-fade.
  const lastArcAngleRef = useRef(0)
  if (hasNote) lastArcAngleRef.current = detectedNoteIdx * 30 + angleOffset
  const arcAngle = lastArcAngleRef.current

  const svgRef = useRef<SVGSVGElement>(null)
  // Each active pointer glides independently; noteIdx is whichever wedge that
  // pointer's angle currently falls under, updated as it crosses boundaries.
  const gesturesRef = useRef<Map<number, number>>(new Map())
  const [activeNoteIdxs, setActiveNoteIdxs] = useState<Set<number>>(new Set())

  function toSvgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scale = 160 / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale }
  }

  function handlePointerDown(noteIdx: number, e: React.PointerEvent<SVGPathElement>) {
    if (pickingKey) {
      onSelectKey(noteIdx)
      return
    }
    if (gesturesRef.current.has(e.pointerId)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    gesturesRef.current.set(e.pointerId, noteIdx)
    setActiveNoteIdxs(new Set(gesturesRef.current.values()))
    onPlayStart(e.pointerId, noteIdx)
  }

  function handlePointerMove(e: React.PointerEvent<SVGPathElement>) {
    if (!gesturesRef.current.has(e.pointerId)) return
    const { x, y } = toSvgPoint(e)
    const noteIdx = angleToNoteIdx(x, y)
    if (gesturesRef.current.get(e.pointerId) === noteIdx) return
    gesturesRef.current.set(e.pointerId, noteIdx)
    setActiveNoteIdxs(new Set(gesturesRef.current.values()))
    onNoteChange(e.pointerId, noteIdx)
  }

  function endGesture(e: React.PointerEvent<SVGPathElement>) {
    if (!gesturesRef.current.has(e.pointerId)) return
    gesturesRef.current.delete(e.pointerId)
    setActiveNoteIdxs(new Set(gesturesRef.current.values()))
    onPlayStop(e.pointerId)
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 160 160"
      width={240}
      height={240}
      aria-label="Pitch wheel tuner"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: "none",
      }}
    >
      {/* Outer ring */}
      <circle cx={CX} cy={CY} r={OUTER_R} fill="var(--bg-surface)" />
      <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="var(--border)" strokeWidth={1} />
      {/* Inner face */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="var(--bg)" />
      <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="var(--border)" strokeWidth={0.75} />

      {/* Accuracy arc — one wedge wide, so being in tune means it sits flush with the
          detected wedge. Drawn before the segments so the dividers paint over it. The
          rotation transition is about one frame: the smoothing filter has already done
          the smoothing, and anything longer here is pure added lag. */}
      <g
        style={{
          transform: `rotate(${arcAngle}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          opacity: hasNote ? 1 : 0,
          transition: "transform 0.03s linear, opacity 0.3s ease-out",
          pointerEvents: "none",
        }}
      >
        <path d={ringSegment(0, ARC_INNER_R, ARC_OUTER_R)} fill={color} />
      </g>

      {/* Note segments, dividers, labels, reference-key marker, and tap hit targets */}
      {NOTE_NAMES.map((note, i) => {
        const isDetected = hasNote && i === detectedNoteIdx
        const isPlaying = activeNoteIdxs.has(i)
        const isActive = isDetected || isPlaying
        const isReference = i === referenceNoteIdx && temperament === "ji"
        const { x: lx, y: ly } = toXY(i * 30, LABEL_R)
        const { x: dx1, y: dy1 } = toXY(i * 30 - 15, DIVIDER_INNER_R)
        const { x: dx2, y: dy2 } = toXY(i * 30 - 15, OUTER_R)
        const display = NOTE_DISPLAY[i]
        const textFill = isActive ? "var(--note-text-on-active)" : "var(--text)"

        const wedgeTier = pickingKey ? "selectable" : isActive ? "active" : "idle"

        return (
          <g key={note}>
            <path d={segmentArc(i)} fill={wedgeColor(i, wedgeTier)} />
            <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} stroke="var(--border)" strokeWidth={0.75} />
            {display ? (
              <>
                <text
                  x={lx}
                  y={ly - 3.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={7}
                  fontWeight={isActive ? "700" : "400"}
                  fill={textFill}
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {display[0]}
                </text>
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={5.5}
                  fontWeight={isActive ? "700" : "400"}
                  fill={textFill}
                  fillOpacity={0.6}
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {display[1]}
                </text>
              </>
            ) : (
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fontWeight={isActive ? "700" : "400"}
                fill={textFill}
                fontFamily="system-ui, sans-serif"
                style={{ pointerEvents: "none" }}
              >
                {note}
              </text>
            )}
            {isReference && (
              <path
                d={segmentArc(i)}
                fill="none"
                stroke={wedgeColor(i, "reference")}
                strokeWidth={1.75}
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
            )}
            {/* Hit target on top so it always captures the gesture regardless of what's painted beneath it */}
            <path
              d={segmentArc(i)}
              fill="transparent"
              style={{ touchAction: "none", cursor: "pointer" }}
              onPointerDown={(e) => handlePointerDown(i, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              aria-label={
                pickingKey
                  ? `Set ${note} as the reference key`
                  : `Play ${note}, or drag across the ring to play other notes as you cross them`
              }
            />
          </g>
        )
      })}

      {/* Center: Equal Temp. button while picking a key, blank while any note is playing,
          otherwise detected note + octave + cents */}
      {pickingKey ? (
        // biome-ignore lint/a11y/useSemanticElements: SVG has no native button element to swap to
        <g
          onClick={onSelectET}
          role="button"
          tabIndex={0}
          aria-label="Select equal temperament"
          style={{ cursor: "pointer" }}
        >
          <rect
            x={CX - 26}
            y={CY - 11}
            width={52}
            height={22}
            rx={6}
            fill="var(--bg-surface)"
            stroke="var(--border)"
            strokeWidth={1.25}
          />
          <text
            x={CX}
            y={CY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight="600"
            fill="var(--text)"
            fontFamily="system-ui, sans-serif"
            style={{ pointerEvents: "none" }}
          >
            Equal Temp.
          </text>
        </g>
      ) : activeNoteIdxs.size > 0 ? null : hasNote && noteName ? (
        <>
          <text
            x={CX}
            y={CY + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={20}
            fontWeight="700"
            fill={color}
            fontFamily="system-ui, sans-serif"
            style={{ letterSpacing: "-0.02em", pointerEvents: "none" }}
          >
            {noteName}
          </text>
          {octave !== null && (
            <text
              x={CX + 12}
              y={CY - 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill={color}
              opacity={0.65}
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {octave}
            </text>
          )}
          <text
            x={CX}
            y={CY + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontWeight="600"
            fill={color}
            fontFamily="system-ui, sans-serif"
            style={{ pointerEvents: "none" }}
          >
            {cents > 0 ? "+" : ""}
            {cents}¢
          </text>
        </>
      ) : null}
    </svg>
  )
}

interface KeyPickerProps {
  selectedKey: string
  temperament: "ji" | "et"
  pickingKey: boolean
  onToggle: () => void
}

function KeyPicker({ selectedKey, temperament, pickingKey, onToggle }: KeyPickerProps) {
  const selectedIdx = NOTE_NAMES.indexOf(selectedKey)
  const chipLabel = temperament === "et" ? "Equal Temp." : `Key: ${selectedKey}`
  const chipColor =
    temperament === "et" ? "var(--text-muted)" : wedgeColor(selectedIdx, "reference")

  return (
    <button
      type="button"
      className={`flex items-center gap-1 py-0.5 px-1.5 text-xs rounded${pickingKey ? " bg-[#646cff] border-[#646cff] text-white" : " bg-transparent border-transparent"}`}
      style={pickingKey ? undefined : { color: chipColor }}
      onClick={onToggle}
      aria-pressed={pickingKey}
      aria-label={`${chipLabel}. Tap to ${pickingKey ? "stop" : "start"} choosing a key on the wheel.`}
    >
      {chipLabel}
      <Pencil size={12} />
    </button>
  )
}

interface PitchInfo {
  note: string
  octave: number
  cents: number
  angleOffset: number
}

// ~60 fps. The old 80 ms throttle (~12 fps) meant every stage downstream paid for it.
const TICK_INTERVAL_MS = 15
const EMA_ALPHA = 0.4
// A reading further than this from the smoothed value is a deliberate note change, not
// drift or vibrato, so the filter snaps to it rather than gliding through every pitch in
// between. Above the widest plausible vibrato, below a semitone.
const JUMP_CENTS = 70
// How far past a wedge edge the pitch must go before the displayed note flips.
const HYSTERESIS_CENTS = 5
const SILENCE_HOLD_MS = 300

interface Props {
  defaultKey: string
  defaultTemperament?: "ji" | "et"
  defaultSize?: "small" | "large"
  variant?: "floating" | "inline"
  visible?: boolean
  collapsible?: boolean
  // How far the floating variant sits from the bottom of the viewport — override
  // when another fixed-position element (e.g. a bottom tab bar) would otherwise
  // overlap it. Ignored for the inline variant.
  floatingBottom?: string
}

export default function Tuner({
  defaultKey,
  defaultTemperament = "ji",
  defaultSize = "small",
  variant = "floating",
  visible = true,
  collapsible = false,
  floatingBottom = "0.75rem",
}: Props) {
  const [active, setActive] = useState(false)
  const [pitch, setPitch] = useState<PitchInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState(() => ENHARMONIC[defaultKey] ?? defaultKey)
  const [temperament, setTemperament] = useState<"ji" | "et">(defaultTemperament)
  const [size, setSize] = useState<"small" | "large">(defaultSize)
  const [pickingKey, setPickingKey] = useState(false)
  const wheelAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickingKey) return

    function handlePointerDown(e: PointerEvent) {
      if (wheelAreaRef.current && !wheelAreaRef.current.contains(e.target as Node)) {
        setPickingKey(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPickingKey(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [pickingKey])

  const pickingKeyRef = useRef(pickingKey)
  useEffect(() => {
    pickingKeyRef.current = pickingKey
  }, [pickingKey])

  const selectedKeyRef = useRef(selectedKey)
  const temperamentRef = useRef(temperament)
  // The sticky target below is derived from the key and temperament, so it has to be
  // dropped when either changes or the wheel keeps aiming at the old tuning.
  const displayedTargetRef = useRef<Target | null>(null)

  useEffect(() => {
    selectedKeyRef.current = selectedKey
    displayedTargetRef.current = null
  }, [selectedKey])

  useEffect(() => {
    temperamentRef.current = temperament
    displayedTargetRef.current = null
  }, [temperament])

  const audioRef = useRef<{
    ctx: AudioContext
    analyser: AnalyserNode
    stream: MediaStream
    buffer: Float32Array<ArrayBuffer>
    buffers: DetectBuffers
  } | null>(null)
  const animRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Smoothing, all in the cents domain: median-of-3 to reject single bad frames, then a
  // light EMA. The displayed target is sticky so the note name has hysteresis at wedge
  // edges rather than depending on frames agreeing with each other.
  const historyRef = useRef<[number, number, number]>([0, 0, 0])
  const historyCountRef = useRef(0)
  const smoothedCentsRef = useRef<number | null>(null)
  // Shared across all concurrent wheel gestures; created lazily on the first
  // press and closed once every gesture has released.
  const sharedAudioCtxRef = useRef<AudioContext | null>(null)
  // One oscillator/gain pair per active pointer, keyed by pointerId.
  const gesturesAudioRef = useRef<Map<number, { osc: OscillatorNode; gain: GainNode }>>(new Map())

  const resetSmoothing = useCallback(() => {
    historyCountRef.current = 0
    smoothedCentsRef.current = null
    displayedTargetRef.current = null
  }, [])

  const stop = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = 0
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.stream.getTracks().forEach((t) => {
        t.stop()
      })
      audioRef.current.ctx.close()
      audioRef.current = null
    }
    resetSmoothing()
  }, [resetSmoothing])

  useEffect(() => stop, [stop])

  useEffect(() => {
    return () => {
      for (const audio of gesturesAudioRef.current.values()) {
        audio.osc.stop()
      }
      gesturesAudioRef.current.clear()
      if (sharedAudioCtxRef.current) {
        sharedAudioCtxRef.current.close()
        sharedAudioCtxRef.current = null
      }
    }
  }, [])

  async function toggle() {
    if (active) {
      stop()
      setActive(false)
      setError(null)
      setPitch(null)
      return
    }

    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not supported")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // The browser enables all three by default. They are tuned for speech and are
        // hostile to sustained tones: gain control destabilizes the RMS floor, noise
        // suppression distorts held notes, and echo cancellation tries to subtract the
        // pitch-pipe tone this app plays. Advisory — a browser may ignore them.
        audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
        video: false,
      })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      // Allocated once and reused; the tick loop must not allocate.
      const buffers: DetectBuffers = {
        decimated: new Float32Array(DECIMATED_SIZE),
        power: new Float32Array(FFT_SIZE + 1),
        coarsePower: new Float32Array(DECIMATED_SIZE + 1),
        coarse: new Float32Array(DECIMATED_SIZE),
        scratch: new Float32Array(REFINE_HALF_WIDTH * 2 + 1),
      }
      audioRef.current = { ctx, analyser, stream, buffer, buffers }
      setActive(true)

      function tick(timestamp: number) {
        if (timestamp - lastTickRef.current < TICK_INTERVAL_MS) {
          animRef.current = requestAnimationFrame(tick)
          return
        }
        lastTickRef.current = timestamp

        if (gesturesAudioRef.current.size > 0 || pickingKeyRef.current) {
          // A wheel note is playing, or the user is picking a key — skip analysis so
          // the mic doesn't drive the display while attention is on the wheel/chip.
          animRef.current = requestAnimationFrame(tick)
          return
        }

        const audio = audioRef.current
        if (!audio) return

        audio.analyser.getFloatTimeDomainData(audio.buffer)
        const freq = detectPitch(audio.buffer, audio.buffers, audio.ctx.sampleRate)

        if (freq > 0) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          const raw = freqToCents(freq)
          const history = historyRef.current
          history[historyCountRef.current % 3] = raw
          historyCountRef.current++
          const median =
            historyCountRef.current >= 3 ? median3(history[0], history[1], history[2]) : raw

          const smoothedBefore = smoothedCentsRef.current
          if (smoothedBefore === null || Math.abs(median - smoothedBefore) > JUMP_CENTS) {
            // A deliberate note change. Land on it rather than sweeping through every
            // pitch in between and rendering notes that were never sung.
            smoothedCentsRef.current = median
            displayedTargetRef.current = null
          } else {
            smoothedCentsRef.current = EMA_ALPHA * median + (1 - EMA_ALPHA) * smoothedBefore
          }
          const smoothed = smoothedCentsRef.current

          // Hysteresis: hold the current target until the pitch passes a little past the
          // wedge edge, which in JI is the midpoint between adjacent just targets.
          const target = displayedTargetRef.current
          const deviation = target === null ? 0 : smoothed - target.targetCents
          const held =
            target !== null &&
            deviation <= target.gapUp / 2 + HYSTERESIS_CENTS &&
            deviation >= -target.gapDown / 2 - HYSTERESIS_CENTS
          const current = held
            ? target
            : nearestTarget(
                smoothed,
                temperamentRef.current,
                NOTE_NAMES.indexOf(selectedKeyRef.current),
              )
          displayedTargetRef.current = current

          const offset = smoothed - current.targetCents
          const { note, octave } = semitoneToNote(current.semitone)
          setPitch({
            note,
            octave,
            cents: Math.round(offset),
            angleOffset: centsToAngle(offset, current),
          })
        } else if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            setPitch(null)
            resetSmoothing()
            silenceTimerRef.current = null
          }, SILENCE_HOLD_MS)
        }

        animRef.current = requestAnimationFrame(tick)
      }
      animRef.current = requestAnimationFrame(tick)
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone access denied"
          : "Could not access microphone"
      setError(msg)
    }
  }

  function handlePlayStart(pointerId: number, noteIdx: number) {
    if (gesturesAudioRef.current.has(pointerId)) return
    const freq = NOTE_FREQUENCIES[NOTE_NAMES[noteIdx]]
    if (!freq) return
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (!sharedAudioCtxRef.current) {
      sharedAudioCtxRef.current = new AudioContext()
    }
    const ctx = sharedAudioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = freq
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gesturesAudioRef.current.set(pointerId, { osc, gain })
  }

  function handleNoteChange(pointerId: number, noteIdx: number) {
    const freq = NOTE_FREQUENCIES[NOTE_NAMES[noteIdx]]
    const audio = gesturesAudioRef.current.get(pointerId)
    if (!freq || !audio) return
    audio.osc.frequency.value = freq
  }

  function handlePlayStop(pointerId: number) {
    const audio = gesturesAudioRef.current.get(pointerId)
    if (!audio) return
    audio.osc.stop()
    audio.osc.disconnect()
    audio.gain.disconnect()
    gesturesAudioRef.current.delete(pointerId)
    if (gesturesAudioRef.current.size === 0 && sharedAudioCtxRef.current) {
      sharedAudioCtxRef.current.close()
      sharedAudioCtxRef.current = null
    }
  }

  const absC = pitch ? Math.abs(pitch.cents) : 0
  const centsColor = pitch ? (absC <= 10 ? "#4ade80" : absC <= 25 ? "#facc15" : "#f87171") : "#888"
  const detectedNoteIdx = active && pitch ? NOTE_NAMES.indexOf(pitch.note) : null
  const referenceNoteIdx = NOTE_NAMES.indexOf(selectedKey)
  const isFloating = variant === "floating"

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only, not an interactive element
    // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, not an interactive element
    <div
      className={
        isFloating
          ? `fixed right-3 opacity-90 z-50 flex flex-col items-end gap-1 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-24"}`
          : "flex flex-col items-center gap-1"
      }
      style={isFloating ? { bottom: floatingBottom } : undefined}
      onClick={isFloating ? (e) => e.stopPropagation() : undefined}
    >
      {(!collapsible || active) && (
        <div
          className="relative rounded-lg p-2 flex flex-col items-center gap-1"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            transform: size === "large" ? "scale(1.4)" : "scale(1)",
            transformOrigin: isFloating ? "bottom right" : "top center",
            transition: "transform 0.2s ease-out",
          }}
        >
          <button
            type="button"
            className="absolute top-1 right-1 p-1 bg-transparent border-transparent"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setSize((v) => (v === "large" ? "small" : "large"))}
            aria-label={size === "large" ? "Shrink tuner" : "Enlarge tuner"}
            title={size === "large" ? "Shrink tuner" : "Enlarge tuner"}
          >
            {size === "large" ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <div ref={wheelAreaRef} className="flex flex-col items-center gap-1">
            <PitchWheel
              detectedNoteIdx={detectedNoteIdx}
              cents={pitch?.cents ?? 0}
              angleOffset={pitch?.angleOffset ?? 0}
              color={centsColor}
              noteName={active ? (pitch?.note ?? null) : null}
              octave={active ? (pitch?.octave ?? null) : null}
              referenceNoteIdx={referenceNoteIdx}
              temperament={temperament}
              pickingKey={pickingKey}
              onPlayStart={handlePlayStart}
              onNoteChange={handleNoteChange}
              onPlayStop={handlePlayStop}
              onSelectKey={(noteIdx) => {
                setSelectedKey(NOTE_NAMES[noteIdx])
                setTemperament("ji")
                setPickingKey(false)
              }}
              onSelectET={() => {
                setTemperament("et")
                setPickingKey(false)
              }}
            />
            <KeyPicker
              selectedKey={selectedKey}
              temperament={temperament}
              pickingKey={pickingKey}
              onToggle={() => setPickingKey((v) => !v)}
            />
          </div>
        </div>
      )}
      {!active && error && (
        <div
          className={`text-xs max-w-[10rem] ${isFloating ? "text-right" : "text-center"}`}
          style={{ color: "#f87171" }}
        >
          {error}
        </div>
      )}
      <button
        type="button"
        className={`py-[0.45em] px-[0.65em] select-none${active ? " bg-[#646cff] border-[#646cff] text-white" : ""}`}
        onClick={toggle}
        aria-label={active ? "Stop tuner" : "Start tuner"}
        title={active ? "Stop tuner" : "Tune"}
      >
        <CircleGauge size={18} />
      </button>
    </div>
  )
}
