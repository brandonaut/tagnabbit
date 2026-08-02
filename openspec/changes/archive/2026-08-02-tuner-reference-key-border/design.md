## Context

The pitch wheel's reference-key marker (`Tuner.tsx:246-254`) is currently a filled `<circle>` at `radius = LABEL_R + 9`, colored via `wedgeColor(i, "reference")`.
It renders only when `isReference` is true, where `isReference = i === referenceNoteIdx && temperament === "ji"` (`Tuner.tsx:189`).
`wedgeColor`'s `"reference"` tier (`src/noteColors.ts`) already sits at a lightness/chroma deliberately between the `"idle"` and `"active"` tiers, so this change reuses an existing color value — it does not introduce a new one.

`segmentArc(i)` (`Tuner.tsx:82-90`) returns a single closed SVG path string covering the wedge's outer arc, both radial edges, and the inner arc.
It's already drawn once per wedge as the wedge's filled background (`Tuner.tsx:199`).

## Goals / Non-Goals

**Goals:**
- Replace the dot with a stroked outline of the wedge's own shape, reusing `segmentArc(i)` rather than introducing new geometry.
- Keep the exact same visibility rule as today (`isReference`, JI mode only) — this changes how the marker renders, not when.
- Preserve the existing hit-target/gesture-capture behavior untouched.

**Non-Goals:**
- No change to `wedgeColor` or the tier system's color values.
- No change to equal-temperament behavior — still no marker of any kind.
- No change to the key picker dropdown's own selected-cell treatment.
- Not locking in an exact `strokeWidth` value — left to implementation-time visual QA.

## Decisions

**1. Stroke `segmentArc(i)` a second time, rather than drawing new geometry for the border.**
Add a second `<path>` using the same `d={segmentArc(i)}` as the wedge's fill path, but with `fill="none"`, `stroke={wedgeColor(i, "reference")}`, and `strokeLinejoin="round"` (to keep the arc-to-radial-edge joins clean).
Render it only `{isReference && (...)}`, replacing the current `<circle>` block entirely.

*Alternative considered*: stroke only the two radial edges (a "bracket" look), skipping both arcs to avoid touching the outer ring's existing boundary stroke.
Rejected per explicit decision — the full outline (Option A) is preferred specifically because the outer arc overpainting the outer ring's boundary in the note's hue is a desired visual tie-in to the wheel's existing hue-identity system, not a side effect to avoid.

**2. The border stroke ignores pointer events.**
Add `style={{ pointerEvents: "none" }}` to the new stroke path, matching the outgoing dot.
The transparent hit-target `<path>` (`Tuner.tsx:256-264`) is already layered on top of everything else in the wedge's `<g>` and already captures all gesture handling regardless of what's painted beneath it, so this is purely a carry-over of existing behavior, not a new consideration.

**3. Draw order: stroke path sits after the fill/divider/labels, before the hit-target path.**
This matches where the old `<circle>` sat in the JSX — after the label text(s), before the hit-target.
Since the stroke has `fill="none"`, it won't obscure the label text beneath it; it only adds a colored outline at the wedge's boundary.

## Risks / Trade-offs

- **Visual competition with the outer ring stroke** → the bordered wedge's outer arc sits exactly on top of the outer ring's plain `var(--border)` circle for that 30° slice, so the two strokes' widths and z-order need to resolve cleanly rather than looking like a doubled, muddy edge.
  Mitigation: this is the intended visual (rim lights up in the note's hue), but exact `strokeWidth` should be checked visually against the existing outer-ring `strokeWidth={1}` so the reference-key slice reads as a clean color change rather than an overlapping double-line artifact.
- **Border crowds the two-line accidental label** → the label sits at `LABEL_R`, and the border traces out to `OUTER_R` and in to `INNER_R`; for accidental wedges the two-line label already uses most of the vertical space between those radii.
  Mitigation: since the border is a boundary stroke rather than fill, it shouldn't overlap label text directly, but should be checked visually alongside an accidental wedge (e.g. `C#/Db`) specifically, not just a natural-note wedge.
- **Losing the dot removes a secondary "at the label ring" spatial cue** → the dot sat at a specific radius near the label; a full outline is a different shape of signal (perimeter vs. point).
  Mitigation: this is the explicit intent of the change (whole-shape signal over point signal), not treated as a regression.

## Migration Plan

Pure UI change, single component, no data or state changes.
Rollback is a plain revert — the dot's removal and the border's addition are both scoped to the same `isReference` block in `Tuner.tsx`.

## Open Questions

- Exact `strokeWidth` for the border — left to implementation-time visual QA against the running wheel, same treatment as prior visual-detail decisions in this component.
