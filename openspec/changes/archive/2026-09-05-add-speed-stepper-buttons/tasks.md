## 1. Speed stepper

- [x] 1.1 Add a `getAdjacentSpeed(offset: 1 | -1)` helper: find the current speed's index in `SPEED_OPTIONS`, return the neighboring value or `null` if past either end.
- [x] 1.2 Add "decrease speed" and "increase speed" buttons flanking the existing dropdown; each calls `handleSpeedChange` with `getAdjacentSpeed`'s result when it's not `null`, and no-ops otherwise (also `disabled` at the clamped ends, for a visual affordance in addition to the no-op). Styled plain (`bg-transparent border-0`, `disabled:opacity-40`) to work around the same leftover scaffold `button{}` CSS rule already worked around in the playlist's buttons.
- [x] 1.3 Remove the visible "Speed" text label; add `aria-label="Playback speed"` to the control's wrapping element so the group still has an accessible name.
- [x] 1.4 Confirm no press-and-hold-to-repeat behavior is added — plain single-tap buttons, matching the ±10-second skip buttons.

## 2. Verification

- [x] 2.1 Manually test stepping down and up through the full range (0.5x → 0.75x → 0.9x → 1x → 1.25x → 1.5x → 2x) via the buttons, confirming each step matches what the dropdown would show.
- [x] 2.2 Manually test clamping: decrease button at 0.5x does nothing; increase button at 2x does nothing (no wrap in either direction).
- [x] 2.3 Manually test that the dropdown still works for jumping directly to any value, and that using it updates correctly if you then use the stepper buttons afterward.
- [x] 2.4 Manually confirm the control reads sensibly without the visible "Speed" label (visually and via a screen reader / accessibility inspector, if available).
- [x] 2.5 Run `bun run lint` and `bun run build`.
