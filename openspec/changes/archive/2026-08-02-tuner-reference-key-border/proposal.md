## Why

The pitch wheel currently marks the selected reference key with a small filled dot near the label ring (`Tuner.tsx:246-254`).
This dot is an isolated, easy-to-miss token, and it's gotten harder to notice since accidental wedges now carry two-line labels that crowd that same area.
A border around the whole wedge reads as a stronger, single-glance signal — closer to how the key picker dropdown already marks its selected cell by recoloring the entire button, rather than adding a small separate marker.

## What Changes

- Replace the reference-key dot marker with a full outline of the wedge itself: `segmentArc(i)`'s path SHALL be stroked a second time with `fill="none"` and `stroke={wedgeColor(i, "reference")}`, tracing both radial edges, the inner arc, and the outer arc.
- This is deliberate about the outer arc: that slice of the wheel's outer-ring boundary (currently a plain `var(--border)` stroke) gets overpainted in the reference key's own hue, tying "this is the selected key" to the wheel's existing per-note hue identity system.
- Scope is unchanged from today: the marker (now a border) SHALL only appear when the tuner is in just-intonation mode and only on the wedge matching `referenceNoteIdx` — no marker of any kind in equal-temperament mode.
- The border stroke SHALL NOT intercept pointer events, matching the outgoing dot's behavior, since the transparent hit-target path already layered on top handles gesture capture regardless.
- Exact `strokeWidth` is an implementation-time visual-QA detail, not locked in here.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `tuner-pitch-wheel`: the "State-driven wedge color intensity" requirement's reference-key scenario changes from "renders a marker (at the label ring)" to "renders a border outlining the whole wedge."

## Impact

- `src/Tuner.tsx`: the `isReference` marker block (currently lines 246-254) changes from a filled `<circle>` to a stroked, unfilled version of `segmentArc(i)`.
- No change to `src/notes.ts`, `src/noteColors.ts`'s tier definitions, the key picker dropdown, or any audio/frequency logic — this only changes how the existing "reference" tier color is drawn on the wheel.
