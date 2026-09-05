## Why

The balance control currently spans three stacked rows (a "Balance" label, the slider, an L/R caption row) with the Mono checkbox in its own row below.
That's a lot of vertical space for two related, small controls, and the current balance value isn't shown as a number — only implied by slider position.

## What Changes

- Collapse the "Balance" label, slider, L/R caption row, and separate Mono checkbox row into a single compact row: the slider, an inline percentage readout ("35% L" / "35% R" / "Center" at the midpoint), and the Mono checkbox.
- Drop the standalone "Balance" text label.
- Add a reset gesture: double-tap (touch) or double-click (mouse) on the balance slider snaps it back to center, as a faster alternative to dragging.
- No change to the underlying balance/mono audio behavior, routing, or persistence — this is a layout and interaction change only.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `practice-audio-player`: the "Left/right balance adjustment" requirement gains a percentage-display requirement and a double-tap/double-click reset-to-center gesture.

## Impact

- `src/PlayerPage.tsx`: balance/mono UI restructured into one flex row; new double-tap/double-click handler on the slider.
- No changes to `src/cache/playerFile.ts` or the Web Audio balance/mono routing graph — persisted state and audio behavior are unaffected.
