## 1. Persistence layer

- [x] 1.1 Add `speed: number` to `PlayerFileRecord` in `src/cache/playerFile.ts`.
- [x] 1.2 Include `speed` in the `Pick<...>` type and write path of `updatePlayerFileState`.

## 2. Player state and audio wiring

- [x] 2.1 Add `speed` state (default `1`) and a `speedRef` mirroring it, matching the existing `balance`/`balanceRef` pattern.
- [x] 2.2 Add an `applySpeed` callback that sets `audioRef.current.playbackRate` and `audioRef.current.preservesPitch = true`.
- [x] 2.3 Call `applySpeed` from a `useEffect` keyed on `speed`, matching the existing `applyBalance` effect.
- [x] 2.4 In `loadFile`, apply the restored (or default `1`) speed directly to the audio element on load, the same way balance/mono are applied directly rather than relying solely on the effect.
- [x] 2.5 Add a `handleSpeedChange` function that updates state and calls `persistDebounced({ speed: value })`, matching `handleBalanceChange`.
- [x] 2.6 Include `speed` in `persistDebounced`'s and `persistNow`'s payloads, defaulting to `speedRef.current`.
- [x] 2.7 Include `speed: 1` in the `storePlayerFile` call in `handleFileSelected`.
- [x] 2.8 Reset `speed` to `1` alongside balance/mono when a new file is loaded via `loadFile`.

## 3. UI

- [x] 3.1 Add a speed `<select>` dropdown near the balance/mono controls, with options 0.5, 0.75, 0.9, 1, 1.25, 1.5, 2 (labeled e.g. "0.5x" … "2x").
- [x] 3.2 Wire the dropdown's `onChange` to `handleSpeedChange`, converting the selected value to a number.
- [x] 3.3 Ensure the dropdown reflects the current `speed` state (including after restoring a persisted file).

## 4. Verification

- [x] 4.1 Manually verify: loading a file, changing speed while playing, and while paused, applies immediately without resetting position.
- [x] 4.2 Manually verify: pitch stays constant across all seven speed options.
- [x] 4.3 Manually verify: leaving and reopening the player screen (and a fresh page load) restores the previously selected speed.
- [x] 4.4 Manually verify: loading a new file resets speed to 1 (normal).
- [x] 4.5 Run `bun run lint` and `bun run build`.
