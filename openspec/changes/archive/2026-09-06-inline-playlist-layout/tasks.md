## 1. Turn the former modal into an inline list

- [x] 1.1 Rename `src/PlaylistModal.tsx` to `src/PlaylistList.tsx` (and the default export / component name), update the import in `src/PlayerPage.tsx`.
- [x] 1.2 Remove the overlay shell: the `fixed inset-0 z-50` backdrop wrapper, the `translate-y-full` sheet wrapper and its transition classes, the modal header (`<h2>Playlist</h2>` + `ChevronDown` close button), and the `isOpen` / `onClose` props.
- [x] 1.3 Keep intact: the `<ul>` and row markup, `rowRefs` / `prevRectsRef` and the FLIP `useLayoutEffect`, the "Playlist is empty" branch, `handleFileInputChange`, and all gesture-handler props (`onDragHandle*`, `onRow*`, `onSelectTrack`, `onRemoveTrack`, `onFilesAdded`).
- [x] 1.4 Give the component a `shrink-0` header region (track count `Playlist · {tracks.length}` plus the add-files `<label><input type="file" hidden multiple accept="audio/*">`, moved up from the old footer) and make the `<ul>` wrapper `flex-1 min-h-0 overflow-y-auto`. Component root: `flex flex-col min-h-0`.
- [x] 1.5 Move the drag-and-drop-to-add handling into this component: local `isDraggingOver` state and `onDragOver` / `onDragLeave` / `onDrop` on the list region, calling `onFilesAdded` with the dropped files; keep the drop-target border/highlight styling.
- [x] 1.6 Remove the old bottom-centered add `<label>` once the header one is in place.

## 2. Player screen becomes a fixed pane

- [x] 2.1 In `src/PlayerPage.tsx`, change the root element to a fixed pane: `fixed inset-x-0 top-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] overflow-hidden`, with an inner `max-w-2xl mx-auto h-full flex flex-col` wrapper holding everything.
- [x] 2.2 Remove the old page header (`<h1>Player</h1>` and the "Playlist (N)" button) and all modal state: `isPlaylistOpen`, `setIsPlaylistOpen`, and the `<PlaylistModal isOpen … onClose … />` wiring.
- [x] 2.3 Render `<PlaylistList />` as the scrollable middle region, passing the same handler props it received as the modal (minus `isOpen` / `onClose`).
- [x] 2.4 Remove the whole-screen drag-and-drop wrapper (`onDragOver` / `onDragLeave` / `onDrop` / `isDraggingOver` and its state) from `PlayerPage` now that `PlaylistList` owns it.

## 3. Pin the player block at the bottom

- [x] 3.1 Wrap the existing active-track player JSX (track name marquee, detail waveform, minimap + time labels, transport row, adjustments box) in a `shrink-0 border-t` container that is the last child of the flex column.
- [x] 3.2 Render that container only when `activeTrack` is set; when it is null (empty playlist) the list region's "Playlist is empty" prompt is the only content.
- [x] 3.3 Keep `<audio>` and `<Tuner … floatingBottom={TUNER_FLOATING_BOTTOM} />` mounted regardless of `activeTrack`; leave the tuner's position as-is.
- [x] 3.4 Adjust per-region padding (the old root had `pt-4 px-4 gap-4`) so the header, list, and player block each have sensible spacing within the fixed column.

## 4. Verify

- [x] 4.1 `bun run lint` and `bun run build` pass.
- [x] 4.2 Manual check: with several tracks, the track list scrolls while the header stays on top and the player block stays pinned at the bottom above the tab bar; the page itself does not scroll.
- [x] 4.3 Manual check: selecting a track, drag-handle reorder (with the FLIP slide), and swipe / hover-delete all still work in the inline list.
- [x] 4.4 Manual check: dragging audio files onto the list region adds them; dropping elsewhere does not; the file-picker add control works.
- [x] 4.5 Manual check: empty playlist shows only the "Playlist is empty" prompt with no player block; adding the first file reveals the player block with that track active and paused.
- [x] 4.6 Manual check on a small viewport / mobile: transport row sits in thumb reach above the tab bar; nothing important is clipped (tuner overlap is expected and accepted).

> Note (2.1): the pane's `bottom` offset is an inline `style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}` rather than a `bottom-[…]` arbitrary class — `calc()` needs spaces around `+`, which the class form strips. Matches how `Layout.tsx` and `TUNER_FLOATING_BOTTOM` already express this.
> 4.2–4.6 are interactive browser checks left for the user to run (`bun run dev`); the dev server is not started automatically per project convention.
