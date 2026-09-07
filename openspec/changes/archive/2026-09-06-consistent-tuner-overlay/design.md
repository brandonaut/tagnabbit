## Context

See proposal.md — Why.

The tuner today is three separate mounts of `src/Tuner.tsx`:

- `TagPage` and `PlayerPage` each mount `<Tuner variant="floating" collapsible>` — a `position: fixed` widget that shows only a round `CircleGauge` button until the mic is active.
- `TunerPage` (route `/tuner`, a `TabBar` destination) mounts `<Tuner variant="inline" defaultSize="large">` full-screen.
- Search and favorites have no tuner.

`App.tsx` uses `wouter` with a hash-location hook. `TagPage` renders **outside** `Layout` (which is the only thing that renders `<TabBar>`), so the tag detail screen has no tab bar and runs its own immersive `uiVisible` chrome toggle. `Tuner` already owns all pitch-wheel pointer events with `touch-action: none` for glide-play, and manages an `AudioContext` + `getUserMedia` stream tied to its mount and its internal `active` state.

## Goals / Non-Goals

**Goals:**

- One `Tuner` instance, owned by `App`, reachable identically from every screen.
- Repositionable by drag within a session, clamped to the viewport and always clear of the bottom tab bar.
- Semi-transparent so content underneath (sheet music) stays partly visible.
- Microphone bound to overlay open/close.
- Tag detail gets a tab bar without being pulled inside `Layout`.

**Non-Goals:**

- No change to pitch detection, smoothing, the pitch wheel, glide-play, or the key picker.
- No change to how `Layout` wraps the three non-tag screens.
- No persistence of any kind — open state, position, and size all reset. The overlay starts closed on every load, every navigation closes it, and every open is a fresh small bottom-right-corner panel. (Avoids a mic-permission prompt on cold load and a mic silently left running on another screen; keeps the widget predictable.)
- No resize handle — size stays the existing two-state small/large toggle.
- No close/minimize control on the overlay itself — the tab-bar toggle is the only way to close it.
- No multi-instance or per-screen tuner configuration.

## Decisions

### Single instance owned by `App`, rendered outside `<Switch>`

`App` holds only `tunerOpen: boolean` and renders `<Tuner>` once, as a sibling of the `<Router>`'s screen switch, while `tunerOpen` is true. The alternative — a context provider plus a portal mounted per screen — adds indirection with no benefit, since there is only ever one consumer and `App` is already the state owner for `favorites`.

`tunerOpen` resets to `false` on every navigation: an effect in `App` keyed on the `wouter` location sets it false whenever the path changes. So the overlay is a per-screen thing — you open it where you need it, and leaving the screen dismisses it.

`tunerOpen` and a `setTunerOpen` handler are passed to every `TabBar`. `TabBar` no longer treats the fourth slot as a route; it renders a button that calls the handler and reflects `tunerOpen` as a pressed state, with a small chevron (e.g. `ChevronUp`) marking it as a toggle rather than a destination.

### `Tuner` is self-contained; no persistence

Remove `variant`, `collapsible`, `visible`, `floatingBottom`, and the round `CircleGauge` toggle button from `Tuner`. It becomes a single overlay panel with **no props**: a fixed-position container whose top-left is an internal `pos`, containing a **drag handle strip** (grip affordance + the size toggle, nothing else) above the existing `PitchWheel`.

Because nothing is remembered, `Tuner` owns its own state: `size` starts `"small"`, and `pos` is seeded (via `useState` initialiser) to the bottom-right corner computed from the viewport minus a rough panel-size estimate minus the tab-bar height. The mount-time clamp effect (below) then corrects that estimate against the real measured panel. Closing the overlay unmounts the component, so this state is naturally discarded and re-derived on the next open — there is no reset code to write and no store to touch. `src/tunerPlacement.ts` keeps only the pure geometry helpers (`clampToViewport`, `defaultTunerPosition`); its `localStorage` read/write is deleted.

`active` (mic on/off) is driven by an effect: start capture on mount, stop on unmount. Mounted only while `tunerOpen` is true, so "mounted" and "open" are the same thing; the existing `stop()` cleanup releases the stream and closes the `AudioContext`. Navigation flips `tunerOpen` to false → unmount → mic released, for free.

Alternative considered: keep `Tuner` always mounted and gate the mic on an `open` prop. Rejected — it keeps a hidden component alive holding wheel state and timers for no reason, and the conditional-mount approach reuses the existing unmount cleanup exactly and gives placement-reset for free.

### Drag on a handle, never the wheel

The wheel's wedges already `setPointerCapture` and consume move events for glide-play, and the center face / outer ring deliberately do nothing. Adding drag anywhere on the panel body would either fight pointer capture or require distinguishing "drag" from "play" by movement threshold — fragile. Instead the drag handle is its own element with its own `onPointerDown` → `setPointerCapture` → `onPointerMove` updating `pos`. The handle is visually a title strip, so there is no ambiguity about where to grab. Pointer-downs that land on a button inside the strip are ignored by the drag handler so the size toggle still works.

Clamping: `clampToViewport(pos, w, h, bottomReserve)` bounds `pos` to `[0, innerWidth - w] × [0, innerHeight - bottomReserve - h]`. It runs on every drag move, on a `window` `resize` listener, and once on mount and whenever `size` changes. Panel dimensions are `offsetWidth/offsetHeight × scale` (the panel scales via CSS `transform: scale()`, and `offsetWidth` is the pre-transform box), so the measurement is stable regardless of the scale transition.

`bottomReserve` is dynamic, not a constant: `Tuner` measures the live tab bar via `document.querySelector("nav[data-tabbar]")` and returns `max(0, innerHeight - navRect.top)` — how far the bar actually intrudes into the viewport. On the tag detail screen, when the immersive chrome hides and the `<nav>` is `translate-y-full` off-screen, `navRect.top >= innerHeight` so the reserve is 0 and the panel can be dragged to the very bottom. When the bar is not in the DOM at all (the transient tag loading / not-found states), it falls back to the `TAB_BAR_PX` constant. An `IntersectionObserver` on the `<nav>` re-runs the clamp as the bar slides in or out, so a panel parked at the bottom is lifted back above the bar when the chrome returns.

### Transparency

The panel carries `opacity: ~0.82`. It has to be whole-panel opacity rather than just a translucent background colour, because the `PitchWheel` SVG paints opaque `var(--bg-surface)` / `var(--bg)` fills for its ring and face; fading only the container would leave the wheel itself blocking the view. The wheel text stays legible enough at that level, and the point is to glance at the staff underneath, not to read through the wheel.

### Tag detail gets its own `<TabBar>`

`TagPage` renders `<TabBar tunerOpen={…} onToggleTuner={…} />` directly, inside a wrapper `div` that carries the same `translate-y` transition as the header, keyed off `uiVisible`. `Layout` is untouched. This keeps `TagPage`'s `absolute`/immersive layout intact — moving it inside `Layout` would impose `Layout`'s bottom padding and break the full-bleed sheet music view.

`TabBar`'s active-highlight logic (`location === path`) already yields "nothing active" for `/tag/:id`, so option A (no lit tab on tag detail) needs no special-casing.

### `/tuner` removal

Delete `src/TunerPage.tsx` and drop its `<Route path="/tuner">` from `App`'s switch entirely. No redirect: the route was never released, so nothing points at `/tuner`, and the existing catch-all `<Redirect to="/search" />` already handles the path if anyone hits it.

## Risks / Trade-offs

- **Overlay covers content on small screens** → It is semi-transparent and draggable; the user can move it and still see through it. Matches the existing "enlarged panel may overlap content" spec.
- **Drag handle adds vertical height to the panel** → Keep the strip minimal (grab affordance + size toggle); the size toggle moves into the strip rather than staying a separate corner button, so net chrome is roughly unchanged.
- **Rough corner estimate places the panel slightly off before it measures itself** → The mount clamp runs against the real `offsetWidth/Height` on the first commit, so any visible misplacement is a single frame at most.
- **Mic starts the moment the overlay opens** → Same behavior users get today when they tap the round tuner button; the permission prompt appears on first open, not on app load.
- **Re-opening the overlay after each navigation, and losing its position/size, is friction if a user wanted it sticky** → Accepted: the user explicitly asked for a predictable always-small corner widget with no memory.
- **Two `TabBar` call sites now** (Layout + TagPage) → Both pass the same two props from their nearest owner of `tunerOpen`; `App` is the single source, threaded through `TagPage` and `Layout` as props.

## Migration Plan

1. Strip `src/tunerPlacement.ts` to the geometry helpers only (`clampToViewport` reserving the tab-bar height, `defaultTunerPosition`); delete the `localStorage` read/write and the placement type.
2. `App`: keep only `tunerOpen` plus the navigation effect that resets it; render `<Tuner />` (no props) while open.
3. Rewrite `Tuner` to the propless self-contained shape: internal `pos` (corner) + `size` (`"small"`) state, drag handle strip with grip + size toggle only, `opacity` on the panel, clamp on mount / resize / size change.
4. Update `TabBar` to take `tunerOpen` + `onToggleTuner`, make slot four a toggle with a chevron.
5. Thread the props through `Layout` and `TagPage`.
6. Give `TagPage` its own `<TabBar>` in a `uiVisible` slide wrapper; remove its `<Tuner>` mount.
7. Remove the `<Tuner>` mount and `TUNER_FLOATING_BOTTOM` from `PlayerPage`.
8. Delete `TunerPage.tsx` and its `/tuner` `<Route>` (no redirect).
9. Update the `primary-navigation` and `tuner-panel-size` spec `## Purpose` lines when syncing or archiving — these are not reachable via delta.

Rollback: revert the branch; no data migration.
