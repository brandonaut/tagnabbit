## Why

The pitch wheel's drag-to-center gesture (set reference key) and drag-away gesture (switch to equal temperament) overload the entire ring with directional-drag semantics.
In practice, any imprecise drag that doesn't land cleanly in the small center drop zone silently switches the tuner to equal temperament — an easy-to-trigger, confusing side effect.
This also blocks a planned future feature (swiping around the ring to glide-play tones), since that needs the ring's drag surface free of competing gestures.
Replacing the drag gesture with an explicit, compact dropdown makes key/temperament selection deliberate and frees the wheel for tap-only interaction.

## What Changes

- Remove the wheel's drag-to-center (set key) / drag-away (switch to equal temperament) gesture entirely. **BREAKING**: wedges support tap-to-play only; the previously specified drag behavior, its armed-preview color states, and its accessible-label wording are removed.
- Replace the static "Key: G" / "Key: Equal temperament" text below the wheel with a tappable chip showing the current key (or "Equal Temperament"), tinted using that key's own hue via the existing `wedgeColor` helper.
- Tapping the chip opens a dropdown containing a 4×3 grid of the 12 chromatic keys, each cell tinted with `wedgeColor`, with the current reference key highlighted using the existing "reference" tint, plus a full-width "Equal Temperament" button below the grid.
- Selecting a key or Equal Temperament in the dropdown immediately applies it and closes the dropdown.
- Wheel hold/idle hint text and hit-target accessible labels are simplified to describe tap-to-play only.

## Capabilities

### New Capabilities
- `tuner-key-picker`: the tappable key/temperament chip and its dropdown grid for selecting the reference key or equal temperament.

### Modified Capabilities
- `tuner-pitch-wheel`: removes the drag-to-set-key / drag-to-equal-temperament gesture, its armed-preview color states (center face tint, "Equal Temp" preview text), hold/idle hint text referencing dragging, and accessible label wording referencing dragging. Wedges become tap-to-play-only. The "Key: …" label requirement is superseded by the new `tuner-key-picker` capability.

## Impact

- `src/Tuner.tsx`: remove drag-gesture state and handlers (`gestureRef`, `armedNoteIdx`, `isDragging`, `DEAD_ZONE_R`, `DROP_ZONE_R`, `handlePointerMove` drag branch, `cancelGesture`'s drag branch, `onGestureEnd`/`handleGestureEnd`, `GestureResult` type); remove drag-related SVG hint/preview text and accessible labels; add chip + dropdown UI and its open/close state; wire selection directly to the existing `setSelectedKey`/`setTemperament` setters.
- `openspec/specs/tuner-pitch-wheel/spec.md`: delta spec removing/modifying drag-related requirements.
- New `openspec/specs/tuner-key-picker/spec.md`.
- No changes to `src/noteColors.ts` (reused as-is), pitch-detection logic, or the tap-to-play tone playback.
