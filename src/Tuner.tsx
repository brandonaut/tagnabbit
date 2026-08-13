import { CircleGauge, Maximize2, Minimize2, Pencil } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { wedgeColor } from "./noteColors"
import { ENHARMONIC, NOTE_DISPLAY, NOTE_FREQUENCIES, NOTE_NAMES } from "./notes"

// How many cents each scale degree sits above its equal-tempered position in 5-limit JI.
// Ratios: 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8
// e.g. the major 3rd (5/4) is 386¢, which is 14¢ BELOW the ET major 3rd (400¢) → -13.7
const JI_OFFSETS = [0, 11.7, 3.9, 15.6, -13.7, -2.0, -9.8, 2.0, 13.7, -15.6, 17.6, -11.7]

// Each scale degree's JI target in cents above the tonic, plus the distance to the
// neighbouring target in each direction. These gaps run from 70.7¢ to 133.2¢, which is
// why the wheel can't map cents to degrees at one fixed rate — see centsToAngle.
// Degree 11's neighbour above is the octave (1200¢), not degree 0.
const JI_TARGETS = JI_OFFSETS.map((offset, degree) => degree * 100 + offset)
const JI_GAP_UP = JI_TARGETS.map((target, degree) =>
  degree === 11 ? 1200 - target : JI_TARGETS[degree + 1] - target,
)
// The gap below a degree is the gap above the degree beneath it.
const JI_GAP_DOWN = JI_TARGETS.map((_, degree) => JI_GAP_UP[(degree + 11) % 12])

// Detection range: the barbershop voice range.
const MIN_HZ = 65
const MAX_HZ = 1050
const FFT_SIZE = 2048
// Only fundamentals below MAX_HZ matter, so the signal is decimated before the coarse
// correlation pass — 16x less work for an O(n²) search. The 8-tap boxcar prefilter has
// a null at exactly the post-decimation Nyquist and stays below -13 dB above it.
const DECIM = 4
const BOXCAR = 8
const DECIMATED_SIZE = Math.floor((FFT_SIZE - BOXCAR) / DECIM)
// Coarse peaks resolve to DECIM full-rate samples, so the true peak is within ±DECIM/2
// decimated samples; this window has ample margin.
const REFINE_HALF_WIDTH = 16
// Take the first NSDF peak within this fraction of the global maximum rather than the
// global maximum itself. Once the function is properly normalized, every integer multiple
// of the true period is a peak of comparable height, so a plain argmax lands on an
// arbitrary subharmonic and reports a pitch one or two octaves low.
const PEAK_RATIO = 0.9
// NSDF clarity at the chosen peak: 1 is perfectly periodic. Breath and room noise fall far
// below this.
const CLARITY = 0.45
const RMS_FLOOR = 0.001
// Extra lags searched past each end of the range so peaks at the extremes still have
// neighbours for the local-maximum test.
const LAG_MARGIN = 2

// 8-tap boxcar antialias filter applied as a running sum, keeping every DECIM-th output.
// O(1) per output sample. The output is unscaled — only the argmax of the correlation
// matters downstream, and the confidence test runs against the full-rate signal.
function decimate(src: Float32Array, dst: Float32Array): void {
  let sum = 0
  for (let i = 0; i < BOXCAR; i++) sum += src[i]
  dst[0] = sum
  let base = 0
  for (let out = 1; out < dst.length; out++) {
    for (let k = 0; k < DECIM; k++) {
      sum += src[base + BOXCAR] - src[base]
      base++
    }
    dst[out] = sum
  }
}

// power[k] = sum of squares of buf[0..k), so the NSDF denominator over any lag's overlap
// window is one subtraction rather than a second inner loop.
function buildPower(buf: Float32Array, size: number, power: Float32Array): void {
  power[0] = 0
  for (let i = 0; i < size; i++) power[i + 1] = power[i] + buf[i] * buf[i]
}

// Normalized square difference function (McLeod). Bounded to [-1, 1] and 1 at perfect
// periodicity, so peak heights are comparable across lags and across input levels. A raw
// correlation sum is neither: it attenuates long lags, which biases toward reporting a
// pitch an octave high whenever the fundamental is weak relative to the 2nd harmonic —
// the common case for low bass on a phone mic.
function nsdf(
  buf: Float32Array,
  size: number,
  lo: number,
  hi: number,
  power: Float32Array,
  out: Float32Array,
): void {
  for (let lag = lo; lag <= hi; lag++) {
    const n = size - lag
    let r = 0
    for (let j = 0; j < n; j++) r += buf[j] * buf[j + lag]
    const m = power[n] + power[size] - power[lag]
    out[lag - lo] = m > 0 ? (2 * r) / m : 0
  }
}

// The first peak within PEAK_RATIO of the tallest one, as an index into `out`. Taking the
// tallest peak outright is wrong: multiples of the true period score just as high once the
// function is normalized, so an argmax picks a subharmonic more or less at random.
function firstStrongPeak(out: Float32Array, count: number): number {
  let tallest = 0
  for (let i = 0; i < count; i++) if (out[i] > tallest) tallest = out[i]
  if (tallest <= 0) return -1
  const threshold = tallest * PEAK_RATIO
  for (let i = 1; i < count - 1; i++) {
    if (out[i] > out[i - 1] && out[i] >= out[i + 1] && out[i] >= threshold) return i
  }
  return -1
}

// Recompute at full sample rate in a narrow window around the coarse peak, then
// parabolic-interpolate. Interpolating on the decimated peak alone is far too coarse: a
// 1050 Hz fundamental is only ~11 decimated samples per period, which carries ~15¢ of
// systematic bias. The window holds a single peak, so a plain argmax is right here.
function refinePeak(
  buf: Float32Array,
  size: number,
  center: number,
  minLag: number,
  maxLag: number,
  power: Float32Array,
  scratch: Float32Array,
): { lag: number; clarity: number } {
  const lo = Math.max(minLag, center - REFINE_HALF_WIDTH)
  const hi = Math.min(maxLag, center + REFINE_HALF_WIDTH)
  nsdf(buf, size, lo, hi, power, scratch)
  let best = Number.NEGATIVE_INFINITY
  let at = lo
  for (let lag = lo; lag <= hi; lag++) {
    if (scratch[lag - lo] > best) {
      best = scratch[lag - lo]
      at = lag
    }
  }
  if (at <= lo || at >= hi) return { lag: at, clarity: best }
  const left = scratch[at - lo - 1]
  const mid = scratch[at - lo]
  const right = scratch[at - lo + 1]
  const denom = 2 * (2 * mid - left - right)
  return { lag: denom === 0 ? at : at + (right - left) / denom, clarity: best }
}

interface DetectBuffers {
  decimated: Float32Array
  power: Float32Array
  coarsePower: Float32Array
  coarse: Float32Array
  scratch: Float32Array
}

function detectPitch(buf: Float32Array, b: DetectBuffers, sampleRate: number): number {
  const size = buf.length
  buildPower(buf, size, b.power)
  if (b.power[size] / size < RMS_FLOOR) return -1 // reject breath and room noise

  decimate(buf, b.decimated)
  const coarseSize = b.decimated.length
  const coarseRate = sampleRate / DECIM
  // LAG_MARGIN past each end of the range: a peak sitting on the very first or last lag
  // has no neighbour to be compared against, so the local-maximum test cannot see it and
  // the pitch at that edge of the range gets missed entirely.
  const coarseLo = Math.max(2, Math.floor(coarseRate / MAX_HZ) - LAG_MARGIN)
  const coarseHi = Math.min(coarseSize - 2, Math.ceil(coarseRate / MIN_HZ) + LAG_MARGIN)
  buildPower(b.decimated, coarseSize, b.coarsePower)
  nsdf(b.decimated, coarseSize, coarseLo, coarseHi, b.coarsePower, b.coarse)
  const peak = firstStrongPeak(b.coarse, coarseHi - coarseLo + 1)
  if (peak < 0) return -1

  const { lag, clarity } = refinePeak(
    buf,
    size,
    (coarseLo + peak) * DECIM,
    Math.max(2, Math.floor(sampleRate / MAX_HZ) - LAG_MARGIN * DECIM),
    Math.min(size - 2, Math.ceil(sampleRate / MIN_HZ) + LAG_MARGIN * DECIM),
    b.power,
    b.scratch,
  )
  if (lag <= 0 || clarity < CLARITY) return -1
  return sampleRate / lag
}

// Cents above A440. The smoothing pipeline works in this domain rather than in linear Hz
// so that a given interval settles at the same rate in every register.
function freqToCents(freq: number): number {
  return 1200 * Math.log2(freq / 440)
}

// A tuning target the arc can be flush with: one of the 12 notes in ET, or one of the 12
// JI targets for the current key. The gaps are the distances to the neighbouring targets,
// which set both the wedge's angular scale and where its edges fall.
interface Target {
  semitone: number // semitones above A440, so it carries the octave
  targetCents: number // the target's own position, in cents above A440
  gapUp: number
  gapDown: number
}

function etTarget(cents: number): Target {
  const semitone = Math.round(cents / 100)
  return { semitone, targetCents: semitone * 100, gapUp: 100, gapDown: 100 }
}

function jiTarget(cents: number, keyIdx: number): Target {
  const tonic = (keyIdx - 9) * 100 // C is 9 semitones below A440
  const octave = Math.floor((cents - tonic) / 1200)
  const within = cents - tonic - octave * 1200
  let degree = 0
  let oct = octave
  let bestDist = Number.POSITIVE_INFINITY
  for (let d = 0; d < 12; d++) {
    const dist = Math.abs(within - JI_TARGETS[d])
    if (dist < bestDist) {
      bestDist = dist
      degree = d
    }
  }
  // The tonic an octave up is nearer than any degree in this one.
  if (Math.abs(within - 1200) < bestDist) {
    degree = 0
    oct = octave + 1
  }
  const targetCents = tonic + oct * 1200 + JI_TARGETS[degree]
  return {
    semitone: Math.round(targetCents / 100),
    targetCents,
    gapUp: JI_GAP_UP[degree],
    gapDown: JI_GAP_DOWN[degree],
  }
}

function nearestTarget(cents: number, temperament: "ji" | "et", keyIdx: number): Target {
  return temperament === "ji" && keyIdx >= 0 ? jiTarget(cents, keyIdx) : etTarget(cents)
}

function semitoneToNote(semitone: number): { note: string; octave: number } {
  // A4 = semitone 0 = index 9 = octave 4
  const noteIdx = ((semitone % 12) + 12 + 9) % 12
  return { note: NOTE_NAMES[noteIdx], octave: Math.floor((semitone + 57) / 12) }
}

// Piecewise linear between tuning targets. Every wedge is 30° wide, but the pitch span it
// represents is the gap to its neighbour, so the arc reaches the wedge edge exactly at the
// midpoint between two targets however far apart they are. Mapping at a fixed 0.3°/cent
// instead — as this did before — tears the wheel by up to 8.8° where JI intervals are
// narrower than a semitone, and freezes the arc across 33¢ where they are wider. In ET
// every gap is 100¢ and this reduces to the old fixed rate.
function centsToAngle(deviation: number, target: Target): number {
  const gap = deviation >= 0 ? target.gapUp : target.gapDown
  return Math.max(-15, Math.min(15, (30 * deviation) / gap))
}

function median3(a: number, b: number, c: number): number {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c))
}

// Wheel SVG geometry
const CX = 80
const CY = 80
const OUTER_R = 73
const INNER_R = 42
const LABEL_R = 58
// The accuracy arc sits just inside the wedge ring, leaving a 1-unit seam at INNER_R to
// read alignment against. Dividers reach past it so every wedge edge continues across the
// band — without that the arc has nothing to be judged against.
const ARC_OUTER_R = 41
const ARC_INNER_R = 33
const DIVIDER_INNER_R = 32

function toXY(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

// Inverse of toXY's angle mapping: which of the 12 wedges a point falls under,
// independent of its distance from center.
function angleToNoteIdx(x: number, y: number): number {
  const deg = (Math.atan2(y - CY, x - CX) * 180) / Math.PI + 90
  const idx = Math.round(deg / 30)
  return ((idx % 12) + 12) % 12
}

// A 30°-wide ring segment centred on an arbitrary angle. Wedges are pinned to multiples
// of 30°; the accuracy arc is the same shape free to sit anywhere.
function ringSegment(centerDeg: number, innerR: number, outerR: number): string {
  const start = centerDeg - 15
  const end = centerDeg + 15
  const o1 = toXY(start, outerR)
  const o2 = toXY(end, outerR)
  const i2 = toXY(end, innerR)
  const i1 = toXY(start, innerR)
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 0 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 0 0 ${i1.x} ${i1.y} Z`
}

function segmentArc(noteIdx: number): string {
  return ringSegment(noteIdx * 30, INNER_R, OUTER_R)
}

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
}

export default function Tuner({
  defaultKey,
  defaultTemperament = "ji",
  defaultSize = "small",
  variant = "floating",
  visible = true,
  collapsible = false,
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
          ? `fixed bottom-3 right-3 opacity-90 z-50 flex flex-col items-end gap-1 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-24"}`
          : "flex flex-col items-center gap-1"
      }
      onClick={isFloating ? (e) => e.stopPropagation() : undefined}
    >
      {(!collapsible || active) && (
        <div
          className="relative rounded-lg p-2 flex flex-col items-center gap-1"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            transform: size === "large" ? "scale(1.4)" : "scale(1)",
            transformOrigin: "bottom right",
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
