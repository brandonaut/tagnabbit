## Context

`Tuner.tsx` renders a floating panel (`variant="floating"`) fixed to `bottom-3 right-3`, containing the `PitchWheel` SVG (fixed `viewBox="0 0 160 160"`, rendered at `width={240} height={240}`), the `KeyPicker` chip/dropdown, and a round tune-toggle button below the panel.
It's mounted twice, once per page, and each mount is independent — `App.tsx` renders either `SearchPage` or `TagPage`, never both, so `Tuner` fully remounts on navigation and carries no state across pages.
The `defaultKey`/`defaultTemperament` props already establish the pattern of a page passing its own default into `Tuner`, with `Tuner` owning the resulting state internally.

## Goals / Non-Goals

**Goals:**
- Let the user toggle the tuner panel between two sizes via a button in the panel's corner.
- Default to large on the search page, small on a tag page.
- Keep the panel pinned to the bottom-right screen corner at both sizes.

**Non-Goals:**
- No continuous/slider resizing — two fixed states only.
- No persistence of the user's chosen size across navigation or reloads.
- No collision avoidance with sheet music content on tag pages; overlap at large size is acceptable.
- No change to the wheel's internal SVG geometry (`CX`/`CY`/`OUTER_R`/etc.) or to `PitchWheel`'s own props.

## Decisions

**Whole-panel CSS transform, not per-element width/height changes.**
Wrap the existing panel `<div>` (the one currently holding `PitchWheel` + `KeyPicker`) in a single `transform: scale(...)` toggle, rather than resizing the SVG's `width`/`height` and separately bumping `KeyPicker`'s font sizes.
One transform keeps the wheel, note labels, and key-picker chip in proportion with zero risk of them drifting out of sync, and it's a one-line change versus threading a size prop through both child components.

**`transform-origin: bottom right`, matching the panel's existing anchor.**
The floating wrapper is already `fixed bottom-3 right-3` with `items-end` (bottom-right anchored). Scaling from that same corner means the panel grows up and to the left on enlarge, staying pinned to the screen edge with no separate repositioning logic needed.

**Binary `size` state (`"small" | "large"`), not a numeric scale.**
Matches the corner-button toggle UX (one tap flips it) and keeps the scenario space small and testable. A future continuous control is out of scope.

**New `defaultSize` prop on `Tuner`, mirroring `defaultKey`/`defaultTemperament`.**
`Tuner` owns a `useState<"small" | "large">(defaultSize)` internally. Since `Tuner` remounts per page (see Context), no lifting to a shared/persisted store is needed — the prop alone gives each page its own default, and a user's in-session toggle naturally resets when they navigate away and back.
- `SearchPage.tsx` passes `defaultSize="large"`.
- `TagPage.tsx` passes `defaultSize="small"`.

**Corner button reuses the existing `lucide-react` icon set.**
`Maximize2`/`Minimize2` (already available via the `lucide-react` dependency used for `ChevronDown`/`CircleGauge`) sit absolutely-positioned in the panel's corner, inside the same `(!collapsible || active)` conditional block that already gates the panel's visibility — so the size toggle only exists while the panel itself is showing.

## Risks / Trade-offs

- **Overlap with sheet music at large size on a tag page** → Accepted per proposal; user-initiated and temporary, not a regression since the panel already floats over content at its current fixed size.
- **`transform: scale` blurring text/SVG at non-integer scale factors** → Low risk: both are vector content (SVG paths/text, CSS text), which browsers rasterize post-scale, not pre-scale.
- **Small viewports where "large" pushes the panel off-screen** → Accepted as out of scope; no existing viewport clamping logic to extend, and the current fixed size already assumes reasonable viewport width.

## Open Questions

- Exact scale factor for "large" (e.g. 1.4x vs 1.5x) — a visual/eyeballing decision made during implementation, not an architectural one.
