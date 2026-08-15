import { NOTE_NAMES } from "../notes"

// How many cents each scale degree sits above its equal-tempered position in 5-limit JI.
// Ratios: 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8
// e.g. the major 3rd (5/4) is 386¢, which is 14¢ BELOW the ET major 3rd (400¢) → -13.7
export const JI_OFFSETS = [0, 11.7, 3.9, 15.6, -13.7, -2.0, -9.8, 2.0, 13.7, -15.6, 17.6, -11.7]

// Each scale degree's JI target in cents above the tonic, plus the distance to the
// neighbouring target in each direction. These gaps run from 70.7¢ to 133.2¢, which is
// why the wheel can't map cents to degrees at one fixed rate — see centsToAngle.
// Degree 11's neighbour above is the octave (1200¢), not degree 0.
export const JI_TARGETS = JI_OFFSETS.map((offset, degree) => degree * 100 + offset)
export const JI_GAP_UP = JI_TARGETS.map((target, degree) =>
  degree === 11 ? 1200 - target : JI_TARGETS[degree + 1] - target,
)
// The gap below a degree is the gap above the degree beneath it.
export const JI_GAP_DOWN = JI_TARGETS.map((_, degree) => JI_GAP_UP[(degree + 11) % 12])

// Cents above A440. The smoothing pipeline works in this domain rather than in linear Hz
// so that a given interval settles at the same rate in every register.
export function freqToCents(freq: number): number {
  return 1200 * Math.log2(freq / 440)
}

// A tuning target the arc can be flush with: one of the 12 notes in ET, or one of the 12
// JI targets for the current key. The gaps are the distances to the neighbouring targets,
// which set both the wedge's angular scale and where its edges fall.
export interface Target {
  semitone: number // semitones above A440, so it carries the octave
  targetCents: number // the target's own position, in cents above A440
  gapUp: number
  gapDown: number
}

export function etTarget(cents: number): Target {
  const semitone = Math.round(cents / 100)
  return { semitone, targetCents: semitone * 100, gapUp: 100, gapDown: 100 }
}

export function jiTarget(cents: number, keyIdx: number): Target {
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

export function nearestTarget(cents: number, temperament: "ji" | "et", keyIdx: number): Target {
  return temperament === "ji" && keyIdx >= 0 ? jiTarget(cents, keyIdx) : etTarget(cents)
}

export function semitoneToNote(semitone: number): { note: string; octave: number } {
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
export function centsToAngle(deviation: number, target: Target): number {
  const gap = deviation >= 0 ? target.gapUp : target.gapDown
  return Math.max(-15, Math.min(15, (30 * deviation) / gap))
}

export function median3(a: number, b: number, c: number): number {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c))
}
