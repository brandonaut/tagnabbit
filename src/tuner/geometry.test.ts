import { describe, expect, it } from "vitest"
import { angleToNoteIdx, CX, CY, ringSegment, toXY } from "./geometry"

describe("toXY", () => {
  it("places 0° straight up from center", () => {
    const p = toXY(0, 10)
    expect(p.x).toBeCloseTo(CX, 6)
    expect(p.y).toBeCloseTo(CY - 10, 6)
  })

  it("places 90° to the right of center", () => {
    const p = toXY(90, 10)
    expect(p.x).toBeCloseTo(CX + 10, 6)
    expect(p.y).toBeCloseTo(CY, 6)
  })

  it("places 180° straight down from center", () => {
    const p = toXY(180, 10)
    expect(p.x).toBeCloseTo(CX, 6)
    expect(p.y).toBeCloseTo(CY + 10, 6)
  })

  it("places 270° to the left of center", () => {
    const p = toXY(270, 10)
    expect(p.x).toBeCloseTo(CX - 10, 6)
    expect(p.y).toBeCloseTo(CY, 6)
  })
})

describe("angleToNoteIdx", () => {
  it("inverts toXY at every wedge center", () => {
    for (let i = 0; i < 12; i++) {
      const { x, y } = toXY(i * 30, 50)
      expect(angleToNoteIdx(x, y)).toBe(i)
    }
  })

  it("stays with the nearer wedge just off a boundary", () => {
    const justBefore = toXY(29, 50)
    expect(angleToNoteIdx(justBefore.x, justBefore.y)).toBe(1)
    const justAfter = toXY(1, 50)
    expect(angleToNoteIdx(justAfter.x, justAfter.y)).toBe(0)
  })

  it("is independent of distance from center", () => {
    const near = toXY(150, 5)
    const far = toXY(150, 70)
    expect(angleToNoteIdx(near.x, near.y)).toBe(angleToNoteIdx(far.x, far.y))
  })
})

describe("ringSegment", () => {
  it("starts its path at the outer edge of the center angle minus 15°", () => {
    const outerR = 73
    const innerR = 42
    const path = ringSegment(60, innerR, outerR)
    const start = toXY(60 - 15, outerR)
    const [mx, my] = path.split(" ").slice(1, 3).map(Number)
    expect(mx).toBeCloseTo(start.x, 6)
    expect(my).toBeCloseTo(start.y, 6)
  })
})
