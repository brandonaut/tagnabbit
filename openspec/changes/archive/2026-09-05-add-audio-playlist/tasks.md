## 1. Storage layer (`src/cache/playerFile.ts` rework)

- [x] 1.1 Define the new record shapes: a per-track record `{ id, blob, name, type, order, balance, speed }` and a global-state record `{ mono, activeTrackId }`.
- [x] 1.2 Add new IndexedDB object store(s) for tracks (keyed by `id`) and for the global-state record, bumping `DB_VERSION` and creating them in `onupgradeneeded` alongside (not replacing) the existing single-record store.
- [x] 1.3 Add `addTracks(files: File[])`: generate a fresh id (`crypto.randomUUID()`) per file, append with `order` continuing from the current max, default `balance: 0` and `speed: 1`, and persist each record.
- [x] 1.4 Add `getPlaylist()`: return all track records sorted by `order`.
- [x] 1.5 Add `updateTrackState(id, { balance, speed })`: partial update of a single track's own persisted balance/speed.
- [x] 1.6 Add `reorderTracks(orderedIds: string[])`: rewrite the `order` field of affected track records to match the given sequence.
- [x] 1.7 Add `removeTrack(id)`: delete that track's record (and its blob) from storage.
- [x] 1.8 Add `getGlobalState()` / `setGlobalState({ mono, activeTrackId })` for the shared mono setting and which track was last active.
- [x] 1.9 Wrap `addTracks` so a storage-quota error partway through a batch leaves already-persisted tracks in place and reports which files failed, rather than rolling back the whole batch.
- [x] 1.10 Remove `getStoredPlayerFile` / `storePlayerFile` / `updatePlayerFileState` and the single-record constants (`RECORD_KEY`, old `STORE_NAME`) now that the playlist model replaces them — no migration of the old record, per design.md.

## 2. `PlayerPage.tsx` — playlist data and active-track wiring

- [x] 2.1 Replace `loadFile(file, restore?)` with a `loadTrack(track)` that sets `audio.src` from `track.blob`, restores `track.balance`/`track.speed`, applies the current global `mono`, and always resets position to 0 — with a separate `autoplay: boolean` parameter/flag so cold-restore (paused) and tap-to-select (autoplay) can share the same loading logic.
- [x] 2.2 Replace `handleFileSelected(file)` with `handleFilesAdded(files: File[])` that calls `addTracks` and updates in-memory playlist state.
- [x] 2.3 Update `handleDrop` to iterate all of `e.dataTransfer.files` (not just the first) and call `handleFilesAdded`.
- [x] 2.4 Add the `multiple` attribute to the file `<input>`; remove the old main-screen "Load a different file" link and empty-state dropzone entirely — the add-tracks affordance moves into the playlist modal per task 3.2.
- [x] 2.5 Rewire `handleBalanceChange` / `handleSpeedChange` to persist via `updateTrackState` on the active track's own id, and `handleMonoChange` to persist via `setGlobalState` instead of the old flat per-file record.
- [x] 2.6 On mount, restore the playlist (`getPlaylist`) and global state (`getGlobalState`); if there's an `activeTrackId` present in the restored playlist, load it via `loadTrack(..., autoplay: false)`.

## 3. Playlist UI

- [x] 3.1 Add a "Playlist" trigger control on the main player screen (e.g. a button/icon, optionally showing the track count) that opens the playlist as a modal/overlay.
- [x] 3.2 Move the "Add to playlist" control (the file-picker trigger) inside the modal — not on the main player screen — including for the very first track ever added (the modal's own empty state, not a main-screen dropzone, is what shows the add-prompt when the playlist is empty).
- [x] 3.3 Render the playlist inside the modal as a list of rows (track name, drag handle, delete affordance).
- [x] 3.4 Tapping a row (outside the drag handle and delete control) selects that track: `loadTrack(track, autoplay: true)`, persists it as `activeTrackId`, and closes the modal, returning to the main screen showing the newly active track (flagged in design.md as an assumption — confirm or adjust).
- [x] 3.5 Visually indicate which row is the currently active track.
- [x] 3.6 Keep whole-screen drag-and-drop of files working to append to the playlist regardless of whether the modal is open or closed (drag-and-drop is screen-wide, independent of the modal — only the deliberate "Add to playlist" button lives inside it).

## 4. Reordering

- [x] 4.1 Add a drag handle icon to each playlist row.
- [x] 4.2 Implement pointer-event dragging from the handle (`pointerdown`/`pointermove`/`pointerup`) that visually reorders rows live during the drag, following the same pointer-based approach as the waveform's drag-to-scrub from the prior change.
- [x] 4.3 On drop, persist the new order via `reorderTracks`.

## 5. Removal

- [x] 5.1 Implement swipe-to-remove on a row for touch input — removes immediately, no confirmation.
- [x] 5.2 Implement a hover-revealed delete control on a row for mouse input — removes immediately, no confirmation.
- [x] 5.3 Removing the currently active track stops playback and clears the active-track UI state (back to "no track active"), leaving the rest of the playlist unaffected.
- [x] 5.4 Both removal paths call the same `removeTrack` storage function, deleting the cached blob, not just the in-memory row.

## 6. Storage-limit handling

- [x] 6.1 Catch storage-quota-exceeded errors from `addTracks` and surface a clear, non-blocking message to the user.
- [x] 6.2 Confirm tracks that fit within a batch stay persisted even if a later file in the same batch fails (per task 1.9).

## 7. Verification

- [ ] 7.1 Manually test adding multiple files at once, both via the "Add to playlist" picker inside the modal and via dragging several files onto the main screen at once (modal closed).
- [ ] 7.2 Manually test tapping between tracks: confirms autoplay, position always resets to 0, each track's own balance/speed is restored correctly, and mono stays global (unaffected by switching tracks).
- [ ] 7.3 Manually test reordering via the drag handle on both touch and mouse, and confirm the new order survives a page reload.
- [ ] 7.4 Manually test removal via swipe and via hover-reveal delete: no confirmation prompt either way; removing the active track returns to the empty-active-track state without affecting the rest of the playlist.
- [ ] 7.5 Manually test a full reload: playlist, order, per-track balance/speed, and global mono all restore; the last-active track loads but does not autoplay; the playlist modal is open by default.
- [ ] 7.6 Manually test (or simulate via devtools storage quota override) that exceeding storage capacity while adding tracks shows a clear message and doesn't silently drop existing tracks.
- [ ] 7.8 Manually test previous/next track controls: next advances to the next track, or jumps the current track to its end on the last track; previous restarts the current track when more than ~3s in, and falls back to the previous track when pressed again near the start (or restarts the first track if there's no earlier one).
- [ ] 7.9 Manually test auto-advance: let a track play to its natural end with a next track queued (auto-advances and autoplays) and as the last track (playback just stops, track stays active).
- [ ] 7.10 Manually check the playlist row layout (handle/title/delete reading as one unified row), that the delete button only appears on hover (desktop), the "Add to playlist" steady-state control reads as a plus icon, and the close button reads as a collapse/chevron rather than an X.
- [x] 7.7 Run `bun run lint` and `bun run build` (re-run after section 8's changes — still passes).

## 8. Playback navigation and UI polish

- [x] 8.1 Add `getAdjacentTrack(offset)` finding the neighboring track by the active track's index in the playlist array.
- [x] 8.2 Repurpose the "jump to start"/"jump to end" buttons as previous-track/next-track controls: next advances if a next track exists, otherwise falls back to jumping the current track to its end; previous restarts the current track past `PREV_TRACK_THRESHOLD_SECONDS`, otherwise falls back to the previous track (or restarts from zero if there is none).
- [x] 8.3 Wire the `<audio>` element's `onEnded` to the same next-track logic, so reaching the end of a track auto-advances when a next track exists.
- [x] 8.4 Default `isPlaylistOpen` to `true` so the playlist modal is open when the player screen is first opened.
- [x] 8.5 Restyle playlist rows so the drag handle, title, and delete control read as one unified row; make the delete control hover-only (no longer always-visible on touch, since swipe already covers that input mode).
- [x] 8.6 Replace the steady-state "Add to playlist" text control with a plus-icon button.
- [x] 8.7 Replace the modal's close button icon with a collapse/chevron-down style icon instead of an X.

## 9. Playlist polish: animation and visual refinement

- [x] 9.1 Next-track control falls back to jumping the current track to its end (instead of a no-op) when there is no next track, mirroring the previous-track control's already-existing start-of-track fallback.
- [x] 9.2 Keep the playlist modal always mounted and drive open/close via a CSS `transition` on `opacity`/`translate-y` (gated by an `isOpen` prop) instead of conditionally rendering it, so both opening and closing animate smoothly.
- [x] 9.3 Reset all playlist buttons (drag handle, title, delete, add, close, dismiss-error) to a plain, unfilled, unbordered appearance consistent with the plus-icon add button.
- [x] 9.4 Let track titles truncate against the full row width; move the hover-revealed delete button to an absolutely-positioned overlay (matching the row's background) at the row's end instead of reserving flex space for it.
- [x] 9.5 Animate reordering with a manual FLIP (record each row's position before/after a `tracks` change, apply a compensating transform that eases back to zero) so rows slide into their new position instead of jumping.
- [x] 9.6 Change the waveform's loading placeholder text from "Analyzing waveform…" to "Loading…".
- [x] 9.7 Restructure each playlist row into a reveal layer (red background, centered trash icon) behind a foreground layer that the swipe gesture actually translates, so swiping uncovers an obvious delete indicator before release.

## 10. Additional verification (round 3)

- [ ] 10.1 Manually confirm the playlist modal slides smoothly open and closed (not an instant snap) on both the header trigger and the collapse button.
- [ ] 10.2 Manually confirm playlist buttons all read as plain/unfilled/unbordered, titles run to the row's edge, and the delete button only appears (and covers trailing title text) on hover.
- [ ] 10.3 Manually confirm reordering rows animates into place rather than jumping instantly.
- [ ] 10.4 Manually confirm the waveform placeholder now reads "Loading…".
- [ ] 10.5 Manually confirm a swipe on a playlist row reveals a red/trash-can backdrop as it slides, before the track is removed.
- [ ] 10.6 Manually confirm the next-track control jumps to the end of the current track (rather than doing nothing) when activated on the last track in the playlist.
- [x] 10.7 Run `bun run lint` and `bun run build`.

## 11. Swipe direction, always-active-track invariant, and two more fixes

- [x] 11.1 Set the swipe reveal layer's `justify-content` on every `pointermove` based on the sign of the swipe delta, so the trash icon appears anchored to whichever side the row is sliding away from (matching the iOS Mail-style convention) instead of always centered.
- [x] 11.2 Fix the dark-mode invisible-text bug on the playlist's title, close, and dismiss-error buttons by giving them explicit `color` (they were inheriting a leftover template `button { color: #10141e }` rule from `src/index.css` instead of the theme's text color).
- [x] 11.3 Enforce "always an active track when the playlist is non-empty": fall back to `playlist[0]` (loaded, paused) on mount when the persisted `activeTrackId` is missing/stale, when adding tracks to a playlist that had none active, and when removing the active track while others remain — only removing the *last* remaining track still goes to the empty state.
- [x] 11.4 Explicitly clear the waveform canvas (`clearRect`) when a new track starts loading, not just its `peaks` state, so the previous track's waveform image doesn't linger behind the "Loading…" placeholder.
- [ ] 11.5 Manually confirm swipe direction: swiping left reveals the trash icon anchored right, swiping right reveals it anchored left.
- [ ] 11.6 Manually confirm playlist titles (and the close/dismiss buttons) are clearly visible/legible, particularly in dark mode.
- [ ] 11.7 Manually confirm a track is always active whenever the playlist is non-empty: fresh load with a persisted playlist, adding tracks to an empty playlist, and removing the active track while others remain (vs. removing the very last track, which should still go to the empty state).
- [ ] 11.8 Manually confirm the waveform area shows no stale image from the previous track while a newly selected track's "Loading…" placeholder is up.
- [x] 11.9 Run `bun run lint` and `bun run build`.

## 12. Drop per-track balance/speed persistence; hide the waveform playhead until loaded

- [x] 12.1 ~~Per-track persisted balance/speed~~ (tasks 1.1/1.3/1.5/2.1/2.5) — reverted: balance and speed no longer persist at all, joining position as always-reset-to-default on every track load. Removed `updateTrackState`, its debounce timer, and the `balance`/`speed` fields from `PlaylistTrack` entirely, rather than leaving unused plumbing in place.
- [x] 12.2 `loadTrack` now always applies/sets balance to centered (0) and speed to normal (1) rather than reading them from the track record.
- [x] 12.3 `handleBalanceChange`/`handleSpeedChange` simplified to plain in-memory state updates, matching how `handleScrub` already worked for position (no persistence call at all).
- [x] 12.4 Hide the waveform playhead line until `waveformPeaks` is actually loaded (was always visible, including during the "Loading…" placeholder and on decode failure).
- [ ] 12.5 Manually confirm balance and speed always reset to centered/1x on every track switch (including reselecting the same track), and are never restored from a previous visit.
- [ ] 12.6 Manually confirm the waveform playhead line is absent while "Loading…" is showing (or if decode fails) and only appears once the waveform is actually drawn.
- [x] 12.7 Run `bun run lint` and `bun run build`.

## 13. Consolidate the empty-playlist presentations

- [x] 13.1 Main screen's empty state: change "No track selected" to "Playlist is empty" and remove the redundant "Open playlist" button (the header's "Playlist" trigger already opens it).
- [x] 13.2 Modal's empty state: replace the large dashed-border dropzone card (its own text + hidden file input) with the same "Playlist is empty" message.
- [x] 13.3 Modal's plus-icon "Add to playlist" control now always renders (previously only in the non-empty state), so the empty and non-empty states share one add affordance instead of two different ones.
- [ ] 13.4 Manually confirm: main screen with no tracks shows "Playlist is empty" and no button; opening the modal with no tracks shows "Playlist is empty" plus the plus-icon button, matching the non-empty state's control.
- [x] 13.5 Run `bun run lint` and `bun run build`.

## 14. Fix multi-file add silently keeping only one file on an empty/fresh playlist

- [x] 14.1 Memoize `openDB()` in `src/cache/playerFile.ts` as a single module-scoped connection promise, so every function (`getPlaylist`, `getGlobalState`, `setGlobalState`, `addTracks`, `reorderTracks`, `removeTrack`) shares one `IDBDatabase` connection instead of each opening its own — eliminates the concurrent-`indexedDB.open()` race between the mount-restore read and an immediate `addTracks` call on a brand-new database (best-evidence diagnosis; not reproduced live, see design.md).
- [ ] 14.2 Manually confirm the original bug is actually gone: on a completely empty playlist (clear site data / a fresh browser profile if needed to get a truly new IndexedDB), select multiple files at once and confirm all of them appear — not just the first.
- [ ] 14.3 If 14.2 still reproduces, gather more evidence (console errors; Application → IndexedDB → tagnabbit-player → tracks — does it actually contain all the files, or just one?) since the root cause wasn't empirically confirmed here.
- [x] 14.4 Run `bun run lint` and `bun run build`.
