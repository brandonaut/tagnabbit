// Wheel SVG geometry
export const CX = 80
export const CY = 80
export const OUTER_R = 73
export const INNER_R = 42
export const LABEL_R = 58
// The accuracy arc sits just inside the wedge ring, leaving a 1-unit seam at INNER_R to
// read alignment against. Dividers reach past it so every wedge edge continues across the
// band — without that the arc has nothing to be judged against.
export const ARC_OUTER_R = 41
export const ARC_INNER_R = 33
export const DIVIDER_INNER_R = 32

export function toXY(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

// Inverse of toXY's angle mapping: which of the 12 wedges a point falls under,
// independent of its distance from center.
export function angleToNoteIdx(x: number, y: number): number {
  const deg = (Math.atan2(y - CY, x - CX) * 180) / Math.PI + 90
  const idx = Math.round(deg / 30)
  return ((idx % 12) + 12) % 12
}

// A 30°-wide ring segment centred on an arbitrary angle. Wedges are pinned to multiples
// of 30°; the accuracy arc is the same shape free to sit anywhere.
export function ringSegment(centerDeg: number, innerR: number, outerR: number): string {
  const start = centerDeg - 15
  const end = centerDeg + 15
  const o1 = toXY(start, outerR)
  const o2 = toXY(end, outerR)
  const i2 = toXY(end, innerR)
  const i1 = toXY(start, innerR)
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 0 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 0 0 ${i1.x} ${i1.y} Z`
}

export function segmentArc(noteIdx: number): string {
  return ringSegment(noteIdx * 30, INNER_R, OUTER_R)
}
