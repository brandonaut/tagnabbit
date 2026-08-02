## Context

`PitchWheel` (inside `src/Tuner.tsx`) currently combines two gestures on the same 12-wedge hit targets: tap-and-hold plays a wedge's tone, and dragging (past `DEAD_ZONE_R`) repurposes the same pointer stream into a "set reference key" gesture — drop within `DROP_ZONE_R` of center commits the dragged note as the key (just-intonation mode), releasing anywhere else switches to equal temperament. This is tracked by `gestureRef`, `armedNoteIdx`, `isDragging`, and reported via `onGestureEnd`/`GestureResult` to `handleGestureEnd` in the parent `Tuner` component, which calls `setSelectedKey`/`setTemperament`.

Per `openspec/changes/tuner-key-dropdown/proposal.md`, this drag gesture is being removed and replaced with an explicit chip + dropdown control, both to eliminate the "any imprecise drag defaults to equal temperament" side effect and to leave the ring free for a possible future swipe-to-glide feature (out of scope here).

## Goals / Non-Goals

**Goals:**
- Replace drag-based key/temperament selection with an explicit, tap-driven chip and dropdown.
- Reduce the wheel's wedges to tap-to-play only, removing all drag-tracking state.
- Reuse the existing `wedgeColor` hue/tier system so the new picker visually agrees with the wheel instead of introducing a new color language.
- Keep the picker colocated in `Tuner.tsx`, consistent with how `PitchWheel` is already colocated rather than split into its own file.

**Non-Goals:**
- Ring-swipe glide-play (deferred to a future proposal — this change only frees the ring, it doesn't add new ring gestures).
- Any change to pitch-detection, JI-offset math, or tap-to-play tone synthesis.
- A full-screen/modal picker (`SettingsDrawer`-style slide-in) — the picker is a small, local, non-modal dropdown.

## Decisions

**Custom `<div>`-based dropdown, not a native `<select>`.** A native select can't render per-option background colors reliably across mobile browsers (notably iOS Safari) and can't mix a 4×3 grid with a full-width footer button. A local popover gives full control over layout and per-cell `wedgeColor` tinting.

**Grid order matches `NOTE_NAMES` directly (4 cols × 3 rows, chromatic order).** `NOTE_NAMES` is already the canonical index used by `wedgeColor(i, tier)` and by the wheel's own wedge layout (`toXY` places index 0 at 12 o'clock and steps clockwise by semitone), so the grid needs no reordering or translation table — cell `i` just renders `NOTE_NAMES[i]` tinted with `wedgeColor(i, tier)`.

**Selected-key cell uses the existing "reference" tier**, the same tier already used for the wheel's reference-key marker dot. No new color tier is introduced.

**Equal Temperament is a full-width row below the grid, not a 13th grid cell.** It's a different axis (mode) than a specific note, and the proposal frames it as "an additional button in the dropdown" rather than a 13th key.

**Dropdown open/close state is local to `Tuner`** (a single boolean), not extracted into a separate component/file — matches the existing pattern where `PitchWheel` lives in the same file rather than being split out.

**Dismissal mirrors `SettingsDrawer`'s existing convention**: outside click and Escape both close without applying a change, since that pattern is already established in this codebase (`SettingsDrawer.tsx`) rather than inventing a new dismissal convention.

**Full removal, not feature-flagging, of the drag gesture.** `Gesture`, `gestureRef`, `armedNoteIdx`, `isDragging`, `DEAD_ZONE_R`, `DROP_ZONE_R`, `GestureResult`, `onGestureEnd`/`handleGestureEnd`, and the drag branches inside `handlePointerMove`/`endGesture`/`cancelGesture` are deleted outright. `handlePointerDown`/`endGesture`/`cancelGesture` collapse to plain play-start/play-stop, since tap-to-play is the only remaining wedge gesture — there's no reason to keep dead drag-tracking code paths around.

## Risks / Trade-offs

- **[Risk]** Users who learned the old drag gesture lose it without warning. → **Mitigation**: the replacement chip sits in the exact spot the old static "Key: …" label occupied, and "tap to open a picker" is a far more standard/discoverable mobile pattern than a drag-to-a-target gesture that had no visible affordance until touched.
- **[Risk]** A custom dropdown means hand-rolling focus/outside-click/Escape handling instead of native `<select>` semantics. → **Mitigation**: reuse the already-implemented outside-click + Escape pattern from `SettingsDrawer.tsx` rather than designing new interaction handling from scratch.
- **[Risk]** The floating tuner widget is only 240px wide; a legible 4×3 grid of tappable cells may not fit within that width at a reasonable touch-target size. → **Mitigation**: the dropdown is a free-floating overlay, not constrained to the wheel's own width — it can render wider than 240px if needed to keep cells at a comfortable minimum touch-target size.

## Migration Plan

Client-only UI change with no data/model migration. Ships as a single PR; no feature flag needed since there's no backend or persisted-state dependency (the reference key and temperament are already ordinary React state in `Tuner`, untouched by this change beyond how they're set).

## Open Questions

- Should opening the key-picker dropdown interrupt an in-progress tap-to-play gesture on the wheel, or are the two regions naturally mutually exclusive (dropdown trigger sits outside the wheel's own hit targets)? Expected to be a non-issue by construction, but worth a quick check during implementation.
