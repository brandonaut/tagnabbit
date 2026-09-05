## Why

The Practice Player currently holds exactly one file: loading a new one throws away the old one. Switching between songs across a rehearsal session means re-opening the file picker and re-navigating the device's file browser every single time, with no way to queue up more than one track in advance.

## What Changes

- Replace the single-file model with a persisted, reorderable playlist. "Load a different file" becomes "Add to playlist."
- Adding tracks supports selecting multiple files at once (file picker `multiple` + drag-and-drop of several files), appending to the existing playlist rather than replacing it.
- The playlist and its order persist across sessions (IndexedDB), evolving `src/cache/playerFile.ts` from a single keyed record into a store of multiple track records.
- Playback position, balance, and speed are never persisted per track — every track always starts at position zero, centered balance, and normal (1x) speed when selected, same as loading a new file did before.
- **BREAKING**: `mono` becomes a single global player setting instead of resetting per loaded file — it no longer varies by track and is not reset when switching tracks.
- Tapping a playlist track loads it (position zero, centered balance, normal speed, current global mono) and autoplays immediately — no separate play step.
- Tracks can be reordered via a per-row drag handle (pointer-based, works for touch and mouse).
- Tracks can be removed via swipe (touch) or a hover-revealed delete control (mouse), with no confirmation prompt; removal deletes that track's cached audio data.
- The playlist is user-curated storage, not a cache: no automatic eviction. If storage capacity is ever exceeded, the system surfaces a clear message rather than silently dropping a track.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `practice-audio-player`: replaces the single-file loading/persistence model with a playlist (add, persist, select, reorder, remove); balance and speed keep resetting to defaults on every track load, same as before; mono becomes a global setting instead of resetting on every load.

## Impact

- `src/cache/playerFile.ts`: reworked from a single keyed IndexedDB record to a store of playlist track records (blob, name, type, order), plus a separate persisted global mono setting. Balance and speed are not part of the persisted record at all.
- `src/PlayerPage.tsx`: playlist UI (add/select/reorder/remove), restore-on-mount now restores the whole playlist plus the last-active track (loaded, paused — not autoplaying on a cold restore, consistent with browser autoplay-without-gesture restrictions), and the mono control now reads from/writes to shared global state instead of a single flat record; balance and speed are plain in-memory UI state that reset with every track load, never persisted.
- No changes to the waveform display, drag-to-scrub, tap-to-toggle, transport controls (play/pause/skip/timeline), tuner popup, or wake-lock behavior added in prior changes — these continue to act on "whichever track is currently active."
- No changes outside the Practice Player screen.
