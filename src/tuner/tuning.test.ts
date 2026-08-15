import { describe, expect, it } from "vitest"
import {
  centsToAngle,
  etTarget,
  freqToCents,
  JI_GAP_DOWN,
  JI_GAP_UP,
  JI_TARGETS,
  jiTarget,
  median3,
  nearestTarget,
  semitoneToNote,
} from "./tuning"

describe("freqToCents", () => {
  it("is 0 at A440, and ±1200 an octave away", () => {
    expect(freqToCents(440)).toBeCloseTo(0, 6)
    expect(freqToCents(880)).toBeCloseTo(1200, 6)
    expect(freqToCents(220)).toBeCloseTo(-1200, 6)
  })
})

describe("etTarget", () => {
  it("rounds to the nearest semitone and carries a 100¢ gap on both sides", () => {
    const t = etTarget(250)
    expect(t.semitone).toBe(3)
    expect(t.targetCents).toBe(300)
    expect(t.gapUp).toBe(100)
    expect(t.gapDown).toBe(100)
  })

  it("rounds negative cents the same way", () => {
    const t = etTarget(-150)
    expect(t.semitone).toBe(-1)
    expect(t.targetCents).toBe(-100)
  })
})

describe("jiTarget", () => {
  it("picks the nearest scale degree and reports its table gaps", () => {
    // Key of A: tonic sits at 0¢, so cents line up directly with JI_TARGETS.
    const t = jiTarget(JI_TARGETS[4], 9)
    expect(t.targetCents).toBeCloseTo(JI_TARGETS[4], 6)
    expect(t.gapUp).toBe(JI_GAP_UP[4])
    expect(t.gapDown).toBe(JI_GAP_DOWN[4])
  })

  it("shifts the whole table by the key's tonic offset", () => {
    // Key of C: C sits 9 semitones below A440.
    const t = jiTarget(-900, 0)
    expect(t.targetCents).toBeCloseTo(-900, 6)
    expect(t.semitone).toBe(-9)
  })

  it("prefers the octave-up tonic over the last degree when closer", () => {
    // Key of A, cents just below the octave: nearer to the A an octave up
    // (1200¢) than to degree 11 (JI_TARGETS[11] ≈ 1088.3¢).
    const t = jiTarget(1199, 9)
    expect(t.targetCents).toBeCloseTo(1200, 6)
    expect(t.semitone).toBe(12)
  })
})

describe("nearestTarget", () => {
  it("uses JI when temperament is ji and a key is selected", () => {
    const t = nearestTarget(JI_TARGETS[4], "ji", 9)
    expect(t.targetCents).toBeCloseTo(JI_TARGETS[4], 6)
  })

  it("falls back to ET when no key is selected, even in ji mode", () => {
    const t = nearestTarget(250, "ji", -1)
    expect(t).toEqual(etTarget(250))
  })

  it("uses ET when temperament is et regardless of key", () => {
    const t = nearestTarget(250, "et", 9)
    expect(t).toEqual(etTarget(250))
  })
})

describe("semitoneToNote", () => {
  it("maps semitone 0 to A4", () => {
    expect(semitoneToNote(0)).toEqual({ note: "A", octave: 4 })
  })

  it("wraps forward across the octave boundary", () => {
    // 3 semitones above A4 is C5.
    expect(semitoneToNote(3)).toEqual({ note: "C", octave: 5 })
  })

  it("wraps backward across the octave boundary", () => {
    // 12 semitones below A4 is A3.
    expect(semitoneToNote(-12)).toEqual({ note: "A", octave: 3 })
  })

  it("handles negative semitones within an octave", () => {
    // 9 semitones below A4 is C4.
    expect(semitoneToNote(-9)).toEqual({ note: "C", octave: 4 })
  })
})

describe("centsToAngle", () => {
  const symmetric = { semitone: 0, targetCents: 0, gapUp: 100, gapDown: 100 }

  it("is 0 at the target", () => {
    expect(centsToAngle(0, symmetric)).toBe(0)
  })

  it("scales linearly within the gap", () => {
    expect(centsToAngle(50, symmetric)).toBeCloseTo(15, 6)
    expect(centsToAngle(-50, symmetric)).toBeCloseTo(-15, 6)
  })

  it("clamps to ±15° past the gap", () => {
    expect(centsToAngle(100, symmetric)).toBe(15)
    expect(centsToAngle(-100, symmetric)).toBe(-15)
  })

  it("uses gapUp above the target and gapDown below it", () => {
    const asymmetric = { semitone: 0, targetCents: 0, gapUp: 70.7, gapDown: 133.2 }
    expect(centsToAngle(17.675, asymmetric)).toBeCloseTo(7.5, 4)
    expect(centsToAngle(-33.3, asymmetric)).toBeCloseTo(-7.5, 2)
  })
})

describe("median3", () => {
  it("returns the middle value regardless of input order", () => {
    expect(median3(1, 5, 3)).toBe(3)
    expect(median3(5, 1, 3)).toBe(3)
    expect(median3(3, 5, 1)).toBe(3)
  })

  it("handles negatives", () => {
    expect(median3(-1, -5, -3)).toBe(-3)
  })

  it("handles ties", () => {
    expect(median3(2, 2, 5)).toBe(2)
  })
})
