## Why

The playlist opens as a modal that flies up from the bottom of the screen, triggered by a button in the top-right of the header — the trigger and the motion are at opposite edges, and a full-screen dim sits in between.
The playlist is the main object of the Player screen (the queue being practiced through), yet it is hidden behind modal state that has already needed one bug fix for reopening on its own.
Putting the queue permanently on screen and moving the transport controls down into easy thumb reach removes the modal, its state, and the spatial mismatch in one move.

## What Changes

- **Remove the playlist modal.** Delete `PlaylistModal` and all modal state (`isPlaylistOpen`, the slide-up sheet, the backdrop, the close button, the header trigger). The playlist becomes an inline list on the Player screen.
- **Player screen becomes a fixed, non-scrolling pane** sized to the viewport minus the tab bar, laid out as a vertical stack:
  - top: a playlist header (`Playlist · N` count and an add-files control) — fixed height
  - middle: the scrollable track list — the only part of the screen that scrolls
  - bottom: the player block (track name, waveform, minimap, transport row, adjustments) — fixed height, pinned above the tab bar so the transport sits in thumb reach
- **Empty playlist**: the list area shows the existing "Playlist is empty" prompt and the player block is hidden.
- **Drag-and-drop to add files** is scoped to the track-list region instead of the whole screen.
- Track selection, reordering (drag handle), swipe/hover-to-remove, and the FLIP reorder animation move onto the inline list unchanged.
- The floating tuner stays where it is (bottom-right, above the tab bar) for now. It will visually overlap the relocated transport row; resolving that is deferred to a later change.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `practice-audio-player`: **Adding tracks to the playlist** — the drag-and-drop target narrows from "the player screen" to the playlist list region. **In-page tuner access** — drops the guarantee that the floating tuner never overlaps the transport controls (the new bottom-pinned layout puts them in the same corner; deferred). Adds a **Player screen layout** requirement describing the fixed top-list / bottom-player arrangement and the empty state.

## Impact

- `src/PlayerPage.tsx` — screen container becomes a fixed-height flex column; the playlist button and `PlaylistModal` usage are removed; the player block is wrapped as the pinned bottom section; the add-files `<input type="file">` and drop handlers move to the list region.
- `src/PlaylistModal.tsx` — removed, or reduced to an inline `PlaylistList` component holding the list/rows/empty-state markup and the reorder + swipe handlers it already receives as props.
- No changes to `src/cache/playerFile.ts`, the audio graph, persistence, or any playback behavior.
- `src/Layout.tsx` / `src/TabBar.tsx` — unchanged; the Player screen works within the existing global bottom padding for the tab bar.
