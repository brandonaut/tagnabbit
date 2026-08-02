export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

// Display-only enharmonic pairs for the 5 accidental notes, ordered [primary, secondary].
// Sharp-first for C#/D#/F#, flat-first for Ab/Bb (matching common usage), by note index.
// Natural notes have no entry and render as a single name.
export const NOTE_DISPLAY: Record<number, [primary: string, secondary: string]> = {
  1: ["C#", "Db"],
  3: ["D#", "Eb"],
  6: ["F#", "Gb"],
  8: ["Ab", "G#"],
  10: ["Bb", "A#"],
}

export const ENHARMONIC: Record<string, string> = {
  Cb: "B",
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
}

export const NOTE_FREQUENCIES: Record<string, number> = {
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
