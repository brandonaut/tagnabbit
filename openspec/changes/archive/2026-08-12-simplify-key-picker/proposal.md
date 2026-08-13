## Why

The tuner's key picker is a chip that opens a popup 4x3 grid of the same 12 notes the pitch wheel already renders as wedges.
This duplicates the wheel's layout in a second, separate control and adds a menu the user has to parse instead of just tapping the wheel that's already in front of them.

## What Changes

- Replace the key-picker chip + dropdown grid with a single small button below the wheel, showing a concise label: `Key: G` (reference key's note name) in just-intonation mode, or `Equal Temp.` in equal-temperament mode.
- Tapping the button enters key-select mode on the pitch wheel itself: the wheel's wedges and center face switch from their normal tap-to-play behavior to key-selection targets.
- **BREAKING**: Tapping a wedge while in key-select mode sets the reference key to that note (and switches to just-intonation mode) instead of playing that note's tone.
- The wheel's center face shows a visible `Equal Temp.` button while in key-select mode; tapping it selects equal temperament. **BREAKING**: removes the wheel's blanket "no hint text on center face" rule — text is now permitted for this one button, only while key-select mode is active.
- Selecting a key or equal temperament immediately applies it and exits key-select mode, matching the old dropdown's immediate-apply behavior.
- Tapping outside the wheel, or pressing Escape, exits key-select mode without changing the current key or temperament.
- Remove the 4x3 grid dropdown, its per-cell `wedgeColor` tinting, and the separate "Equal Temperament" dropdown button entirely.

## Capabilities

### Modified Capabilities
- `tuner-key-picker`: the chip-and-dropdown control is replaced by a concise below-wheel button that toggles a key-select mode on the pitch wheel, rather than opening its own grid.
- `tuner-pitch-wheel`: wedges and the center face gain a second, mode-dependent behavior (key selection) alongside their existing tap-to-play/glide behavior; the wheel is no longer excluded from setting the reference key and temperament; the blanket "no hint text on center face" requirement is removed to allow the `Equal Temp.` button label.

## Impact

- `src/Tuner.tsx`: `KeyPicker` component (chip + dropdown grid) is replaced by a smaller button component; `PitchWheel` gains a key-select mode prop/state, wedge tap handling branches on it, and the center face becomes a tap target for equal temperament in that mode.
- No changes to pitch detection, audio, or persistence logic.
