export type WedgeColorTier = "idle" | "reference" | "active"

// Each note's hue matches its 30°-per-wedge position on the pitch wheel, so
// color-wheel position and pitch-wheel position always agree.
export function wedgeColor(noteIdx: number, tier: WedgeColorTier): string {
  const hue = noteIdx * 30
  return `oklch(var(--note-l-${tier}) var(--note-c-${tier}) ${hue}deg)`
}
