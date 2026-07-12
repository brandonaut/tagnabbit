import { CircleGauge } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ENHARMONIC, NOTE_FREQUENCIES, NOTE_NAMES } from "./notes"

// How many cents each scale degree sits above its equal-tempered position in 5-limit JI.
// Ratios: 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8
// e.g. the major 3rd (5/4) is 386¢, which is 14¢ BELOW the ET major 3rd (400¢) → -13.7
const JI_OFFSETS = [0, 11.7, 3.9, 15.6, -13.7, -2.0, -9.8, 2.0, 13.7, -15.6, 17.6, -11.7]

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length

  let sum = 0
  for (let i = 0; i < SIZE; i++) sum += buf[i] * buf[i]
  if (sum / SIZE < 0.001) return -1 // raise RMS floor to reject breath/room noise

  const c = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] += buf[j] * buf[j + i]
    }
  }

  // Skip initial peak, find first valley
  let d = 0
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++

  // Search only in the barbershop voice range (65–1050 Hz)
  const minLag = Math.floor(sampleRate / 1050)
  const maxLag = Math.ceil(sampleRate / 65)
  let maxVal = -1,
    maxPos = -1
  for (let i = Math.max(d, minLag); i < Math.min(SIZE - 1, maxLag); i++) {
    if (c[i] > maxVal) {
      maxVal = c[i]
      maxPos = i
    }
  }

  if (maxPos < 1 || maxVal < c[0] * 0.05) return -1 // raise confidence threshold

  // Parabolic interpolation for sub-sample accuracy
  const T0 =
    maxPos + (c[maxPos + 1] - c[maxPos - 1]) / (2 * (2 * c[maxPos] - c[maxPos - 1] - c[maxPos + 1]))

  return sampleRate / T0
}

function freqToNote(freq: number): { note: string; octave: number; cents: number } {
  const semitones = 12 * Math.log2(freq / 440)
  const rounded = Math.round(semitones)
  const cents = Math.round((semitones - rounded) * 100)
  // A4 = semitone 0 = index 9 = octave 4
  const noteIdx = ((rounded % 12) + 12 + 9) % 12
  const octave = Math.floor((rounded + 57) / 12)
  return { note: NOTE_NAMES[noteIdx], octave, cents }
}

// Wheel SVG geometry
const CX = 80
const CY = 80
const OUTER_R = 73
const INNER_R = 42
const LABEL_R = 58
const NEEDLE_TIP_R = 40
const NEEDLE_BASE_R = 30
// Pointer must move this far (SVG user-space units) before a hold becomes a drag
const DEAD_ZONE_R = 8
// Pointer must be within this distance of center to arm a key-change on release
const DROP_ZONE_R = 25

function toXY(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function segmentArc(noteIdx: number): string {
  const start = noteIdx * 30 - 15
  const end = noteIdx * 30 + 15
  const o1 = toXY(start, OUTER_R)
  const o2 = toXY(end, OUTER_R)
  const i2 = toXY(end, INNER_R)
  const i1 = toXY(start, INNER_R)
  return `M ${o1.x} ${o1.y} A ${OUTER_R} ${OUTER_R} 0 0 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${INNER_R} ${INNER_R} 0 0 0 ${i1.x} ${i1.y} Z`
}

interface WheelProps {
  detectedNoteIdx: number | null
  cents: number
  color: string
  noteName: string | null
  octave: number | null
  referenceNoteIdx: number
  idleLabel: string
  onPlayStart: (noteIdx: number) => void
  onPlayStop: () => void
  onGestureEnd: (committedNoteIdx: number | null) => void
}

interface Gesture {
  pointerId: number
  noteIdx: number
  startX: number
  startY: number
  dragging: boolean
}

function PitchWheel({
  detectedNoteIdx,
  cents,
  color,
  noteName,
  octave,
  referenceNoteIdx,
  idleLabel,
  onPlayStart,
  onPlayStop,
  onGestureEnd,
}: WheelProps) {
  const hasNote = detectedNoteIdx !== null
  // Each note occupies 30°; ±50¢ spans ±15° (half a semitone). Clamp so
  // JI-adjusted cents > ±50 don't push the needle past the segment boundary.
  const needleAngle = hasNote
    ? detectedNoteIdx * 30 + (Math.max(-50, Math.min(50, cents)) / 50) * 15
    : 0

  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const [playingNoteIdx, setPlayingNoteIdx] = useState<number | null>(null)
  const [armedNoteIdx, setArmedNoteIdx] = useState<number | null>(null)

  function toSvgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scale = 160 / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale }
  }

  function handlePointerDown(noteIdx: number, e: React.PointerEvent<SVGPathElement>) {
    if (gestureRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = toSvgPoint(e)
    gestureRef.current = { pointerId: e.pointerId, noteIdx, startX: x, startY: y, dragging: false }
    setPlayingNoteIdx(noteIdx)
    onPlayStart(noteIdx)
  }

  function handlePointerMove(e: React.PointerEvent<SVGPathElement>) {
    const g = gestureRef.current
    if (!g || e.pointerId !== g.pointerId) return
    const { x, y } = toSvgPoint(e)

    if (!g.dragging && Math.hypot(x - g.startX, y - g.startY) > DEAD_ZONE_R) {
      g.dragging = true
      setPlayingNoteIdx(null)
      onPlayStop()
    }

    if (g.dragging) {
      const distFromCenter = Math.hypot(x - CX, y - CY)
      setArmedNoteIdx(distFromCenter <= DROP_ZONE_R ? g.noteIdx : null)
    }
  }

  function endGesture(e: React.PointerEvent<SVGPathElement>) {
    const g = gestureRef.current
    if (!g || e.pointerId !== g.pointerId) return
    if (!g.dragging) onPlayStop()
    const { x, y } = toSvgPoint(e)
    const committed = g.dragging && Math.hypot(x - CX, y - CY) <= DROP_ZONE_R ? g.noteIdx : null
    gestureRef.current = null
    setPlayingNoteIdx(null)
    setArmedNoteIdx(null)
    onGestureEnd(committed)
  }

  return (
    <svg ref={svgRef} viewBox="0 0 160 160" width={200} height={200} aria-label="Pitch wheel tuner">
      {/* Outer ring */}
      <circle cx={CX} cy={CY} r={OUTER_R} fill="var(--bg-surface)" />
      <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="var(--border)" strokeWidth={1} />
      {/* Inner face — tints accent while a drag is armed to set the key */}
      <circle
        cx={CX}
        cy={CY}
        r={INNER_R}
        fill={armedNoteIdx !== null ? "var(--accent)" : "var(--bg)"}
        opacity={armedNoteIdx !== null ? 0.18 : 1}
      />
      <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="var(--border)" strokeWidth={0.75} />

      {/* Note segments, dividers, labels, reference-key marker, and play/drag hit targets */}
      {NOTE_NAMES.map((note, i) => {
        const isDetected = hasNote && i === detectedNoteIdx
        const isPlaying = i === playingNoteIdx
        const isReference = i === referenceNoteIdx
        const { x: lx, y: ly } = toXY(i * 30, LABEL_R)
        const { x: dx1, y: dy1 } = toXY(i * 30 - 15, INNER_R)
        const { x: dx2, y: dy2 } = toXY(i * 30 - 15, OUTER_R)
        const { x: rx, y: ry } = toXY(i * 30, LABEL_R + 9)
        const isSharp = note.includes("#")

        return (
          <g key={note}>
            {(isDetected || isPlaying) && (
              <path d={segmentArc(i)} fill={isPlaying ? "var(--accent)" : color} opacity={0.22} />
            )}
            <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} stroke="var(--border)" strokeWidth={0.75} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isSharp ? 7.5 : 9}
              fontWeight={isDetected ? "700" : "400"}
              fill={isDetected ? color : "var(--text-muted)"}
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {note}
            </text>
            {isReference && (
              <circle
                cx={rx}
                cy={ry}
                r={2.5}
                fill="var(--accent)"
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
              aria-label={`Play ${note}, or drag to the center to set it as the reference key`}
            />
          </g>
        )
      })}

      {/* Center: candidate key while a drag is armed, detected note + octave, or idle label */}
      {armedNoteIdx !== null ? (
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={20}
          fontWeight="700"
          fill="var(--accent)"
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none" }}
        >
          {NOTE_NAMES[armedNoteIdx]}
        </text>
      ) : hasNote && noteName ? (
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
        </>
      ) : (
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="var(--text-muted)"
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none" }}
        >
          {idleLabel}
        </text>
      )}

      {/* Needle — rotated group for smooth CSS transition */}
      {hasNote && (
        <g
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: "transform 0.08s ease-out",
          }}
        >
          <line
            x1={CX}
            y1={CY - NEEDLE_BASE_R}
            x2={CX}
            y2={CY - NEEDLE_TIP_R}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY - NEEDLE_TIP_R} r={3} fill={color} />
        </g>
      )}
    </svg>
  )
}

interface PitchInfo {
  note: string
  octave: number
  cents: number
}

interface Props {
  defaultKey: string
  variant?: "floating" | "inline"
  visible?: boolean
  collapsible?: boolean
}

export default function Tuner({
  defaultKey,
  variant = "floating",
  visible = true,
  collapsible = false,
}: Props) {
  const [active, setActive] = useState(false)
  const [pitch, setPitch] = useState<PitchInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState(() => ENHARMONIC[defaultKey] ?? defaultKey)

  const selectedKeyRef = useRef(selectedKey)
  useEffect(() => {
    selectedKeyRef.current = selectedKey
  }, [selectedKey])

  const audioRef = useRef<{
    ctx: AudioContext
    analyser: AnalyserNode
    stream: MediaStream
    buffer: Float32Array<ArrayBuffer>
  } | null>(null)
  const animRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Smoothing: EMA on raw frequency + note-name stability over 2 frames
  const smoothedFreqRef = useRef(0)
  const pendingNoteRef = useRef("")
  const pendingFramesRef = useRef(0)
  // True while a wheel note is playing — makes the mic tick loop skip analysis
  const pausedRef = useRef(false)
  const playAudioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(
    null,
  )

  const resetSmoothing = useCallback(() => {
    smoothedFreqRef.current = 0
    pendingNoteRef.current = ""
    pendingFramesRef.current = 0
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
      const audio = playAudioRef.current
      if (audio) {
        audio.osc.stop()
        audio.ctx.close()
        playAudioRef.current = null
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      audioRef.current = { ctx, analyser, stream, buffer }
      setActive(true)

      function tick(timestamp: number) {
        if (timestamp - lastTickRef.current < 80) {
          // ~12 fps
          animRef.current = requestAnimationFrame(tick)
          return
        }
        lastTickRef.current = timestamp

        if (pausedRef.current) {
          // A wheel note is playing — skip analysis so the needle freezes
          // instead of reacting to the played tone.
          animRef.current = requestAnimationFrame(tick)
          return
        }

        const audio = audioRef.current
        if (!audio) return

        audio.analyser.getFloatTimeDomainData(audio.buffer)
        const freq = autoCorrelate(audio.buffer, audio.ctx.sampleRate)

        if (freq > 0) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          // EMA smoothing: blend 25% new reading into the running average
          smoothedFreqRef.current =
            smoothedFreqRef.current === 0 ? freq : 0.25 * freq + 0.75 * smoothedFreqRef.current

          const result = freqToNote(smoothedFreqRef.current)

          // Shift cents relative to the JI target for this scale degree
          const keyIdx = NOTE_NAMES.indexOf(selectedKeyRef.current)
          const noteIdx = NOTE_NAMES.indexOf(result.note)
          const degreeIdx = keyIdx >= 0 && noteIdx >= 0 ? (noteIdx - keyIdx + 12) % 12 : -1
          const jiCents =
            degreeIdx >= 0 ? Math.round(result.cents - JI_OFFSETS[degreeIdx]) : result.cents

          // Require 2 consecutive frames on the same note before updating name
          if (result.note !== pendingNoteRef.current) {
            pendingNoteRef.current = result.note
            pendingFramesRef.current = 1
          } else {
            pendingFramesRef.current++
          }

          setPitch((prev) => ({
            note: pendingFramesRef.current >= 2 ? result.note : (prev?.note ?? result.note),
            octave: pendingFramesRef.current >= 2 ? result.octave : (prev?.octave ?? result.octave),
            cents: jiCents,
          }))
        } else if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            setPitch(null)
            resetSmoothing()
            silenceTimerRef.current = null
          }, 1500)
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

  function handlePlayStart(noteIdx: number) {
    if (playAudioRef.current) return
    const freq = NOTE_FREQUENCIES[NOTE_NAMES[noteIdx]]
    if (!freq) return
    if (active) {
      pausedRef.current = true
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    }
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = freq
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    playAudioRef.current = { ctx, osc, gain }
  }

  function handlePlayStop() {
    const audio = playAudioRef.current
    if (!audio) return
    audio.osc.stop()
    audio.ctx.close()
    playAudioRef.current = null
  }

  function handleGestureEnd(committedNoteIdx: number | null) {
    pausedRef.current = false
    if (committedNoteIdx !== null) {
      setSelectedKey(NOTE_NAMES[committedNoteIdx])
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
          ? `fixed bottom-3 right-3 opacity-90 z-50 flex flex-col items-end gap-1 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-24"}`
          : "flex flex-col items-center gap-1"
      }
      onClick={isFloating ? (e) => e.stopPropagation() : undefined}
    >
      {(!collapsible || active) && (
        <div
          className="rounded-lg p-2 flex flex-col items-center gap-1"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <PitchWheel
            detectedNoteIdx={detectedNoteIdx}
            cents={pitch?.cents ?? 0}
            color={centsColor}
            noteName={active ? (pitch?.note ?? null) : null}
            octave={active ? (pitch?.octave ?? null) : null}
            referenceNoteIdx={referenceNoteIdx}
            idleLabel={active ? "listening…" : "hold a note"}
            onPlayStart={handlePlayStart}
            onPlayStop={handlePlayStop}
            onGestureEnd={handleGestureEnd}
          />
          <div className="text-xs pb-1 flex flex-col items-center gap-0.5">
            {active && pitch && (
              <span className="font-semibold tabular-nums" style={{ color: centsColor }}>
                {pitch.cents > 0 ? "+" : ""}
                {pitch.cents}¢
              </span>
            )}
            <span className="text-[var(--text-muted)]">Key: {selectedKey}</span>
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
