import { describe, expect, it } from "vitest"
import { centsToAngle, etTarget, freqToCents, median3, semitoneToNote } from "./tuning"

describe("freqToCents", () => {
  it("is 0 at A440, and ±1200 an octave away", () => {
    expect(freqToCents(440)).toBeCloseTo(0, 6)
    expect(freqToCents(880)).toBeCloseTo(1200, 6)
    expect(freqToCents(220)).toBeCloseTo(-1200, 6)
  })
})

describe("etTarget", () => {
  it("rounds to the nearest semitone", () => {
    const t = etTarget(250)
    expect(t.semitone).toBe(3)
    expect(t.targetCents).toBe(300)
  })

  it("rounds negative cents the same way", () => {
    const t = etTarget(-150)
    expect(t.semitone).toBe(-1)
    expect(t.targetCents).toBe(-100)
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
  it("is 0 at the target", () => {
    expect(centsToAngle(0)).toBe(0)
  })

  it("scales linearly at 0.3° per cent", () => {
    expect(centsToAngle(50)).toBeCloseTo(15, 6)
    expect(centsToAngle(-50)).toBeCloseTo(-15, 6)
  })

  it("clamps to ±15° past 50¢", () => {
    expect(centsToAngle(100)).toBe(15)
    expect(centsToAngle(-100)).toBe(-15)
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
