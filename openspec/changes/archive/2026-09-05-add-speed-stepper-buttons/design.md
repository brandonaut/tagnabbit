## Context

`PlayerPage.tsx` has a fixed, non-uniform speed preset array (`SPEED_OPTIONS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2]`) bound to a plain `<select>` via `handleSpeedChange`. See proposal.md - Why for the motivation.

## Goals / Non-Goals

**Goals:**
- Add a decrease/increase control that steps through the existing preset list, without introducing any speed value the dropdown can't already display.
- Keep the dropdown for jumping directly to a specific value.

**Non-Goals:**
- No press-and-hold-to-repeat — a 7-item list doesn't need it, matching the existing ±10-second skip buttons.
- No change to `SPEED_OPTIONS` itself, to persistence (speed is already never persisted), or to `handleSpeedChange`'s effect on playback.

## Decisions

**Stepping: adjacent-index lookup in `SPEED_OPTIONS`, reusing `handleSpeedChange`.** A `getAdjacentSpeed(offset: 1 | -1)` helper finds the current speed's index in `SPEED_OPTIONS` and returns the neighboring value, or `null` at either end. Both buttons call `handleSpeedChange` with that value when it exists — the exact same function the dropdown's `onChange` already calls, so there's one code path for "speed changed," regardless of which control triggered it. This mirrors `getAdjacentTrack` (added for previous/next-track navigation) — same shape: find current position in a fixed ordered list, step by one, clamp at the ends. Alternative considered: step by a fixed numeric increment (e.g. ±0.1) — rejected because it could produce a value not present in `SPEED_OPTIONS`, which an HTML `<select>` can't represent as selected, and because it would throw away the array's intentional non-uniform spacing (a fine 0.9→1 step, coarser steps at the extremes) that presumably exists on purpose for slowing down tricky passages without overshooting.

**Clamping, not wrapping, at the ends.** `getAdjacentSpeed` returns `null` past either end of the array; both button handlers no-op on `null` rather than jumping to the opposite end. Matches the spec's explicit requirement and the same clamping behavior already established for previous/next-track and the old skip-to-start/-end controls.

**Layout: buttons flank the dropdown; visible "Speed" label removed in favor of an `aria-label`.** `[-] [dropdown] [+]`, no leading text — for compactness, per direct request. The control's wrapping element carries `aria-label="Playback speed"` so screen readers still get a name for the group, following the same pattern already used for the balance slider (which lost its visible label to a percentage readout, keeping `aria-label="Balance"` on the slider itself).

## Risks / Trade-offs

- **[Risk] Removing the visible label could make the control's purpose less obvious to a first-time sighted user, since "1x" alone doesn't say "this is speed" as explicitly as a "Speed" label did.** → Accepted: this was an explicit request for compactness; the dropdown's own values (`0.5x`–`2x`) and the +/- buttons' position next to it still make the control's purpose readable in context.
