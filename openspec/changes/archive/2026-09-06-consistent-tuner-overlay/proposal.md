## Why

The tuner is reachable three different ways with three different behaviors: a floating collapsible button baked into the tag and player pages, a full-screen `/tuner` route with its own tab, and nothing at all on search and favorites. The entry point, position, and lifecycle all differ by page. Users want one predictable way to open the tuner anywhere, and the freedom to move it out of the way of whatever is underneath.

## What Changes

- Introduce a single `Tuner` instance owned by `App`, rendered as a global overlay available on every screen (search, favorites, tag detail, player).
- The overlay is **draggable** by a dedicated chrome handle strip. It is **clamped to the viewport and kept clear of the bottom tab bar** — it can never overlap the tab bar. The pitch wheel keeps its own pointer gestures for glide-play; the handle never overlaps the wheel.
- The overlay is rendered **semi-transparent** so sheet music (or whatever else is beneath it) stays partly visible through the panel.
- Nothing about the overlay is **remembered**: every time it opens it starts **small, in the bottom-right corner**. Position and size are session-only and reset on the next open.
- The overlay runs the microphone only while it is open and stops capture when it closes.
- The overlay's **open/closed state does not persist**: it always starts closed, and any screen navigation closes it. Within a screen, hiding the tag detail immersive chrome does not close it. It is closed only from the tab-bar toggle (no separate close button).
- The TabBar's fourth slot stops being a navigation destination and becomes an open/close **toggle** for the overlay, marked with a chevron to distinguish it from the three page tabs. It shows pressed/unpressed state, never `aria-current`.
- The `/tuner` route and `TunerPage.tsx` are removed. No redirect is added — the route was never released, so an unknown `/tuner` path falls through to the existing catch-all that shows search.
- The tag detail screen gains its own TabBar (rendered outside `Layout`, in a wrapper that slides away with the immersive `uiVisible` chrome toggle). The overlay is **not** tied to `uiVisible` — hiding the chrome hides the TabBar but leaves the tuner in place.
- On the tag detail screen, no navigation tab is shown as active (option A).
- The per-page `<Tuner>` mounts in `TagPage` and `PlayerPage`, the `floating` / `collapsible` / `visible` / `floatingBottom` props, and the round tune-toggle button are removed.

## Capabilities

### New Capabilities

- `tuner-overlay`: A single app-owned tuner overlay available on every screen — its tab-bar open/close toggle, non-persistent open state (closes on navigation), microphone lifecycle, drag-by-handle repositioning, viewport clamping that keeps it clear of the tab bar, its semi-transparent rendering, the fixed small bottom-right corner it opens at every time, and how it coexists with the tag detail immersive chrome.

### Modified Capabilities

- `primary-navigation`: The fourth tab-bar slot is an overlay toggle, not a destination; the active-destination indicator covers only Search, Favorites, and Player; the tab bar now also appears on the tag detail screen, and slides away with the immersive chrome there.
- `client-routing`: The tuner no longer has its own screen or URL (the route was never released; no redirect is added).
- `tuner-panel-size`: There is one default size (small), applied every time the overlay opens; size is not remembered between opens or across reloads. The panel scales in place rather than staying pinned to a screen corner. The size toggle is always available (no collapsed state).

## Impact

- `src/App.tsx` — owns `tunerOpen` only (resets to closed on navigation); renders the overlay; removes the `/tuner` route. No persisted overlay state.
- `src/Tuner.tsx` — drop `floating`/`inline` variants, `collapsible`, `visible`, `floatingBottom`, the round toggle button. Self-contained: internal session-only position + size state (opens small, bottom-right corner), a drag handle, viewport+tab-bar clamping, and semi-transparent rendering. No props.
- `src/TabBar.tsx` — fourth slot becomes a toggle with a chevron and pressed state; accepts overlay open state + handler.
- `src/TagPage.tsx` — render its own `<TabBar>` in a `uiVisible` slide wrapper; remove the `<Tuner>` mount.
- `src/PlayerPage.tsx` — remove the `<Tuner>` mount and `TUNER_FLOATING_BOTTOM`.
- `src/Layout.tsx` — unchanged structurally; still wraps the three non-tag screens.
- `src/TunerPage.tsx` — deleted; `/tuner` route removed from the router (no redirect).
- `src/tunerPlacement.ts` — pure geometry helpers only (viewport+tab-bar clamp, default corner). No `localStorage`.
- Specs: `openspec/specs/primary-navigation`, `openspec/specs/client-routing`, `openspec/specs/tuner-panel-size` updated; new `openspec/specs/tuner-overlay`.
- `tuner-glide-play`, `tuner-pitch-detection`, `tuner-pitch-wheel` behavior is unchanged.
