## Why

The next/previous-track transport buttons always force playback to start, even if the player was paused before the skip. Skipping through a paused playlist to line up a track shouldn't start audio playing.

## What Changes

- `handleNextTrack` and `handlePreviousTrack` pass `{ autoplay: isPlaying }` (the play/pause state already in effect) to `loadTrack`, instead of the hardcoded `{ autoplay: true }`.
- No change to tapping a track in the playlist modal (still always autoplays — a separate, deliberate requirement).
- **Correction found during verification**: auto-advance at a track's natural end turned out *not* to be unaffected as originally assumed — reusing `handleNextTrack` for it broke auto-advance, since the browser fires a `pause` event just before `ended`, flipping `isPlaying` to `false` right before the shared handler would read it. Fixed with a new, separate `handleTrackEnded` function that always autoplays (see design.md).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `practice-audio-player`: the "Jumping between playlist tracks" requirement's next/previous controls preserve the prior play/pause state instead of always starting playback.

## Impact

- `src/PlayerPage.tsx`: `handleNextTrack`, `handlePreviousTrack`, and a new `handleTrackEnded` (now wired to the `<audio>` element's `onEnded` instead of `handleNextTrack`).
- No other files change.
