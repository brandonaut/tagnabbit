## Context

See proposal.md — Why.

Current state:

- `PlayerPage.tsx` renders a scrolling document: `<div className="max-w-2xl mx-auto pt-4 px-4 pb-24 flex flex-col gap-4 relative">` holding the header (title + "Playlist (N)" button), a drag-and-drop wrapper around the whole player area, the `<audio>`, the floating `<Tuner>`, and `<PlaylistModal>`.
- `PlaylistModal.tsx` is a `fixed inset-0 z-50` overlay with a backdrop and a `translate-y-full` → `translate-y-0` sheet. It owns the list `<ul>`, the row markup, a FLIP reorder animation (`useLayoutEffect` over `tracks`), the empty state, and a bottom-centered add-files `<label><input type="file"></label>`. Every gesture handler (drag-handle pointer events, row swipe pointer events, select, remove) is passed in as a prop from `PlayerPage`; the modal adds no playback logic of its own.
- `Layout.tsx` wraps every screen in a div with `paddingBottom: calc(3.75rem + env(safe-area-inset-bottom))`; `TabBar` is `position: fixed; bottom: 0`.
- The floating `Tuner` variant is `position: fixed` (viewport-relative), offset up by `TUNER_FLOATING_BOTTOM` to clear the tab bar.

## Goals / Non-Goals

**Goals:**

- Playlist always on screen; no modal, no `isPlaylistOpen`, no sheet animation, no backdrop.
- Player screen is a fixed pane: playlist header and player block hold position, only the track list scrolls.
- Transport controls pinned at the bottom, above the tab bar.
- Reuse the existing list/row/FLIP/gesture code — this is a relayout, not a rewrite.
- Touch `PlayerPage.tsx` and the former-modal component only.

**Non-Goals:**

- Auto-scrolling the list while a reorder drag is held near its top/bottom edge (pre-existing limitation, unchanged).
- Resolving the floating tuner overlapping the bottom transport row (deferred; spec updated to permit it).
- Any change to persistence, the audio graph, wake lock, or playback behavior.
- Collapsible adjustments, mini-player, or cross-tab persistent player (discussed, out of scope).

## Decisions

### Fixed pane via `position: fixed`, anchored above the tab bar

`PlayerPage`'s root becomes `fixed inset-x-0 top-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] overflow-hidden`, with an inner `max-w-2xl mx-auto h-full flex flex-col` wrapper. Anchoring `bottom` to the tab bar's height pins the pane to the real visual viewport without depending on `100vh` / `100dvh` quirks or on `Layout.tsx`'s bottom padding (which becomes a harmless no-op for this screen since the fixed pane is out of flow).

- Alternative — `h-[100dvh]` in normal flow: rejected; nested inside `Layout`'s padded wrapper it makes the body `100dvh + tab bar` tall and scroll slightly, and `dvh` still shifts as the mobile URL bar animates.
- Alternative — `position: sticky` player block inside a scrolling page: rejected; fighting the fixed `TabBar` and the page scroll for the exact behavior we can get declaratively from a flex column.

The floating `Tuner` is `position: fixed`, so it stays viewport-relative and needs no change; its visual overlap with the relocated transport row is the accepted, spec-permitted tradeoff.

### Three-region flex column

Inside the `h-full flex flex-col` wrapper:

1. **Playlist header** — `shrink-0`. Track count (`Playlist · N`) and the add-files control (the `<label><input type="file" hidden>` moved here from the modal's footer). Replaces the old header title + "Playlist (N)" button.
2. **Track list** — `flex-1 min-h-0 overflow-y-auto`. `min-h-0` lets it shrink below its content so it, not the page, is what scrolls. Holds the `<ul>`, rows, FLIP animation, empty state, and the drag-and-drop target.
3. **Player block** — `shrink-0 border-t`. The existing `activeTrack` player JSX (track name, detail waveform, minimap + times, transport row, adjustments box), rendered only when `activeTrack` is set.

Because the "always an active track when the playlist is non-empty" invariant already holds, `activeTrack == null` is exactly "playlist empty", so one condition drives both the empty prompt (region 2) and hiding the player block (region 3).

### Former modal becomes `PlaylistList.tsx`

Rename `PlaylistModal.tsx` → `PlaylistList.tsx` and drop the overlay shell: the `fixed inset-0` backdrop, the `translate-y` sheet wrapper, the modal header, and the close button. Keep the `<ul>`/row markup, the `rowRefs`/`prevRectsRef` FLIP `useLayoutEffect`, the empty state, and `handleFileInputChange`. Props lose `isOpen` and `onClose`; it renders regions 1 and 2 (header + scrollable list). It keeps receiving every gesture handler from `PlayerPage` as today.

- Alternative — keep one component that renders inline vs. modal by prop: rejected; the modal affordances are all being deleted, so a mode flag would be dead weight.

### Drag-and-drop scoped to the list region

`handleDrop` / `onDragOver` / `onDragLeave` and the `isDraggingOver` highlight move from the whole-screen wrapper onto the track-list region (inside `PlaylistList`). `handleFilesAdded` stays in `PlayerPage` and is passed as `onFilesAdded` (unchanged). `isDraggingOver` moves into `PlaylistList` as local state.

## Risks / Trade-offs

- [Reorder drag has no edge auto-scroll now that the list is the scroll container] → Pre-existing (the modal's list scrolled too); out of scope. Lists are short in practice.
- [Floating tuner overlaps the bottom transport row] → Accepted by the user; the "In-page tuner access" requirement is updated to permit it, with a fix deferred.
- [`position: fixed` pane is a departure from the other tabs' normal scrolling] → Intentional; Player is app-like. Other screens are untouched.
- [Very small viewports: player block + header could leave little room for the list] → Adjustments box is always shown per decision; if the list gets too cramped in practice, making that box collapsible is the follow-up lever (noted, not done here).

## Open Questions

- Exact placement of the add-files control within the header (leading vs. trailing, icon vs. icon+label) — visual detail, settle during implementation.
