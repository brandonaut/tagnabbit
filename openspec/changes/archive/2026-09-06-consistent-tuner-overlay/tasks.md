## 1. Geometry helpers

- [x] 1.1 `src/tunerPlacement.ts`: keep only pure geometry — `clampToViewport(pos, panelW, panelH)` and `defaultTunerPosition(panelW, panelH)`. No `localStorage`, no placement type, no `getTunerPlacement` / `setTunerPlacement`.
- [x] 1.2 `clampToViewport` bounds `pos` to `[0, innerWidth - panelW] × [0, innerHeight - TAB_BAR_PX - panelH]`, so the panel can never overlap the bottom tab bar
- [x] 1.3 `defaultTunerPosition` returns a bottom-right corner spot, clear of the tab bar height + margin

## 2. `Tuner` component: self-contained overlay

- [x] 2.1 Remove `variant`, `collapsible`, `visible`, `floatingBottom` props and the `isFloating` branching
- [x] 2.2 Remove the round `CircleGauge` tune-toggle button; always render the panel
- [x] 2.3 Component takes **no props**. Internal state: `size` starts `"small"`; `pos` seeded via `useState` initialiser to `defaultTunerPosition(estimate)`
- [x] 2.4 Drag-handle strip above the `PitchWheel`: grip affordance + the size toggle only. **No minimize/close button.**
- [x] 2.5 Handle drag: `onPointerDown` (ignored if the target is a button) → `setPointerCapture`, `onPointerMove` → clamped `setPos`, `onPointerUp` → release; nothing draggable on the wheel or panel body
- [x] 2.6 Clamp on mount, on `window` `resize`, and whenever `size` changes, using `offsetWidth/offsetHeight × scale`
- [x] 2.7 Mic capture from mount/unmount: start on mount, existing `stop()` cleanup on unmount
- [x] 2.8 Pitch wheel keeps `touch-action: none` and its glide-play pointer capture unchanged
- [x] 2.9 Panel is semi-transparent (`opacity` ≈ 0.82 on the panel element) so sheet music shows through

## 3. `App` owns only open state

- [x] 3.1 `src/App.tsx`: `tunerOpen` state (default `false`) only — no position, size, or persistence
- [x] 3.2 Effect keyed on the `wouter` location sets `tunerOpen` to `false` on every path change
- [x] 3.3 Render `<Tuner />` (no props) once, outside the route `<Switch>`, only while `tunerOpen`
- [x] 3.4 Remove the `/tuner` `<Route>` and `TunerPage` import entirely (no redirect)
- [x] 3.5 Delete `src/TunerPage.tsx`

## 4. `TabBar` fourth slot becomes a toggle

- [x] 4.1 `src/TabBar.tsx` accepts `tunerOpen: boolean`, `onToggleTuner()`, and optional `hidden?: boolean`
- [x] 4.2 Slot four is a button that calls `onToggleTuner`, shows a pressed state when `tunerOpen`, carries a chevron mark alongside the `CircleGauge` icon; not a route link, never `aria-current`
- [x] 4.3 Slots 1–3 (Search, Favorites, Player) stay route destinations with the existing active-highlight logic

## 5. Thread props to both `TabBar` call sites

- [x] 5.1 Pass `tunerOpen` / `onToggleTuner` from `App` through `Layout` to its `<TabBar>`
- [x] 5.2 `src/TagPage.tsx` renders its own `<TabBar>` fed the same props from `App`; `hidden` slides it away with the immersive chrome (`!!objectUrl && !uiVisible`)
- [x] 5.3 Remove the `<Tuner>` mount from `TagPage`
- [x] 5.4 Remove the `<Tuner>` mount and `TUNER_FLOATING_BOTTOM` constant from `src/PlayerPage.tsx`

## 8. Chrome-aware bottom clamp

- [x] 8.1 `clampToViewport` / `defaultTunerPosition` take a `bottomReserve` argument instead of hard-coding the tab-bar height; export `TAB_BAR_PX` for the fallback
- [x] 8.2 Add `data-tabbar` to the `TabBar` `<nav>`
- [x] 8.3 `Tuner.bottomReserve()` measures `nav[data-tabbar]` — `max(0, innerHeight - navRect.top)`, or `TAB_BAR_PX` when the nav is absent — and feeds every clamp call (mount, resize, drag, size change)
- [x] 8.4 `IntersectionObserver` on the nav re-runs the clamp as the tab bar slides in/out, so a bottom-parked panel is lifted when the chrome returns

## 6. Spec Purpose reconciliation

- [x] 6.1 When syncing/archiving, update `openspec/specs/primary-navigation/spec.md` `## Purpose` to describe three destinations + a tuner overlay toggle, and the tab bar appearing on tag detail
- [x] 6.2 When syncing/archiving, update `openspec/specs/tuner-panel-size/spec.md` `## Purpose` to drop "stays anchored on screen" / "per-page defaults" / "when the size toggle is available" and reflect the single small default + drag-positioned, non-persistent overlay

## 7. Verification

- [x] 7.1 `bun run lint` and `bun run build` pass
- [x] 7.2 Manually verify on each screen (search, favorites, tag detail, player): the tab bar toggle opens/closes the overlay, the chevron + pressed state render, and no nav tab lights on tag detail
- [x] 7.3 Manually verify the overlay opens small in the bottom-right corner every time; with the tab bar visible it stops above the bar; on tag detail with the chrome hidden it drags to the bottom edge, and is lifted back above the bar when the chrome returns; a wheel drag still plays notes and does not move the panel
- [x] 7.4 Manually verify placement is not remembered: drag it / enlarge it, close, reopen → back to small in the corner; reload → same; nothing under the `tunerPlacement` key in localStorage
- [x] 7.5 Manually verify the overlay is see-through enough to read sheet music beneath it
- [x] 7.6 Manually verify the overlay has no close/minimize button — only the tab-bar toggle closes it
- [x] 7.7 Manually verify the mic starts on open and is released on close via the tab-bar toggle and via navigating away (browser tab mic indicator); open state does not survive a reload
- [x] 7.8 Manually verify tag detail: hiding the chrome slides the tab bar away while an open overlay stays visible; restoring the chrome + toggling closes it; visiting `/#/tuner` lands on search
- [x] 7.9 `openspec validate consistent-tuner-overlay --strict` passes
