// Pure geometry for placing the tuner overlay. Nothing here persists — the overlay
// opens small in the bottom-right corner every time (see src/Tuner.tsx).

// The bottom tab bar is 3.75rem tall (see Layout.tsx). Used as the bottom reserve when
// the live tab bar can't be measured; callers pass the measured value when they can.
export const TAB_BAR_PX = 60
const MARGIN = 12

export function clampToViewport(
  pos: { x: number; y: number },
  panelW: number,
  panelH: number,
  bottomReserve: number,
): { x: number; y: number } {
  const maxX = Math.max(0, window.innerWidth - panelW)
  const maxY = Math.max(0, window.innerHeight - bottomReserve - panelH)
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  }
}

export function defaultTunerPosition(
  panelW: number,
  panelH: number,
  bottomReserve: number,
): { x: number; y: number } {
  return {
    x: Math.max(MARGIN, window.innerWidth - panelW - MARGIN),
    y: Math.max(MARGIN, window.innerHeight - bottomReserve - panelH - MARGIN),
  }
}
