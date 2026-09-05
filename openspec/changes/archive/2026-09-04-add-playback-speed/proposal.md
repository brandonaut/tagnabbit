## Why

Practicing a barbershop part often means slowing a track down to catch a hard passage, or speeding it up once it's learned.
The practice audio player currently only plays at the recording's native speed, so a user has to rely on external tools for that.

## What Changes

- Add a playback speed control to the player screen: a dropdown with fixed values 0.5, 0.75, 0.9, 1, 1.25, 1.5, 2 (times normal speed).
- Selecting a value sets the loaded file's playback rate immediately, whether paused or playing.
- Pitch is preserved at all speeds, so slowing down does not drop the voice in pitch.
- Speed defaults to 1 (normal) for a newly loaded file.
- The selected speed is persisted alongside the existing position, balance, and mono settings, and restored the next time the player screen is opened.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `practice-audio-player`: adds a playback speed requirement (dropdown, fixed values, pitch preserved, default and persistence behavior matching the existing balance/mono pattern).

## Impact

- `src/PlayerPage.tsx`: new speed dropdown control, wired to `HTMLAudioElement.playbackRate` and `preservesPitch`.
- `src/cache/playerFile.ts`: `PlayerFileRecord` gains a `speed` field; `updatePlayerFileState` persists it the same way as `balance`/`mono`.
- No changes to the existing Web Audio balance/mono routing graph — playback rate is a property of the `<audio>` element itself, independent of that graph.
