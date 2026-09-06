import { NOTE_NAMES } from "../notes"

// Cents above A440. The smoothing pipeline works in this domain rather than in linear Hz
// so that a given interval settles at the same rate in every register.
export function freqToCents(freq: number): number {
  return 1200 * Math.log2(freq / 440)
}

// A tuning target the arc can be flush with: one of the 12 equal-tempered notes.
export interface Target {
  semitone: number // semitones above A440, so it carries the octave
  targetCents: number // the target's own position, in cents above A440
}

export function etTarget(cents: number): Target {
  const semitone = Math.round(cents / 100)
  return { semitone, targetCents: semitone * 100 }
}

export function semitoneToNote(semitone: number): { note: string; octave: number } {
  // A4 = semitone 0 = index 9 = octave 4
  const noteIdx = ((semitone % 12) + 12 + 9) % 12
  return { note: NOTE_NAMES[noteIdx], octave: Math.floor((semitone + 57) / 12) }
}

// Maps cents of deviation from the target to the arc's angular offset. Each wedge is 30°
// wide and spans 100¢, so the arc reaches the wedge edge — half a wedge, 15° — at 50¢,
// the midpoint to the next note, and is clamped there so it never rides into the neighbour.
export function centsToAngle(deviation: number): number {
  return Math.max(-15, Math.min(15, 0.3 * deviation))
}

export function median3(a: number, b: number, c: number): number {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c))
}
