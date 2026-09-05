## Why

Changing playback speed today requires opening the dropdown and picking a value — two taps for a one-step nudge (e.g. slowing down by one notch to work through a tricky passage). A quick +/- lets a user nudge speed without leaving the flow of practicing.

## What Changes

- Add "-" and "+" buttons flanking the existing speed dropdown, stepping through the same `SPEED_OPTIONS` preset list by adjacent index (not a fixed numeric increment), so every reachable value stays one the dropdown can already display.
- Both buttons clamp at the ends of the list (no-op at 0.5x and 2x) rather than wrapping.
- Remove the visible "Speed" text label for compactness; the control keeps an `aria-label` so it isn't orphaned for screen reader users.
- Dropdown itself is unchanged — still there for jumping straight to a specific value.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `practice-audio-player`: the "Playback speed control" requirement gains stepper buttons and drops its visible label.

## Impact

- `src/PlayerPage.tsx`: speed control JSX and its surrounding `<label>` wrapper.
- No changes to `SPEED_OPTIONS`, `handleSpeedChange`, or any persistence — speed already resets to 1x on every track load and is never persisted (per the playlist change), unaffected here.
- No changes outside the Practice Player screen.
