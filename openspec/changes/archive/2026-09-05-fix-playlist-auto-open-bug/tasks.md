## 1. Fix

- [x] 1.1 Change `isPlaylistOpen`'s initializer in `src/PlayerPage.tsx` from `useState(true)` back to `useState(false)`.

## 2. Verification

- [x] 2.1 Manually confirm: with tracks already in the playlist, close the modal, navigate to another tab (Search/Tuner/Favorites), then back to Player — the modal stays closed.
- [x] 2.2 Manually confirm: with an empty playlist, the main screen shows "Playlist is empty" and the header's "Playlist" button still opens the modal on tap.
- [x] 2.3 Run `bun run lint` and `bun run build`.
