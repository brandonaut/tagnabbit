## 1. Fix

- [x] 1.1 In `handleNextTrack`, change `loadTrack(next, { autoplay: true })` to `loadTrack(next, { autoplay: isPlaying })`.
- [x] 1.2 In `handlePreviousTrack`, change `loadTrack(prev, { autoplay: true })` to `loadTrack(prev, { autoplay: isPlaying })`.

- [x] 1.3 Add a separate `handleTrackEnded` function (always autoplays the next track if one exists, no jump-to-end fallback) and wire the `<audio>` element's `onEnded` to it instead of `handleNextTrack` — found necessary during verification of 2.3, see design.md's correction note.

## 2. Verification

- [x] 2.1 Manually confirm: while playing, use next/previous to switch tracks — the new track continues playing.
- [x] 2.2 Manually confirm: while paused, use next/previous to switch tracks — the new track loads at its start but stays paused.
- [x] 2.3 Manually confirm: tapping a track in the playlist modal still always autoplays; a track reaching its natural end auto-advances into playing the next one (this was broken by 1.1/1.2 until 1.3's fix — re-verify it now actually autoplays).
- [x] 2.4 Run `bun run lint` and `bun run build`.
