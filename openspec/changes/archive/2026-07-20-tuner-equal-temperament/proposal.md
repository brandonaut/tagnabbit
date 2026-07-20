## Why

The pitch wheel's drag-to-center gesture currently only does one thing: commit a note as the reference key.
Dropping a drag anywhere outside the center is already a distinct, detected gesture outcome — it just silently discards today.
Barbershop singers often want to check pitch against plain equal temperament rather than a specific key's just-intonation offsets, and there's no way to do that from the wheel.
Giving the existing "drop outside center" outcome a real meaning — switching to equal temperament — closes that gap without adding new gesture plumbing.
At the same time, neither the tap-to-play nor the drag-to-set-key gesture is discoverable today (no visible hint, only an aria-label), so this change adds on-wheel hints as both gestures gain real consequences.

## What Changes

- Dragging a wedge and releasing outside the center drop zone (but past the drag dead-zone) now switches the tuner to equal-temperament mode, instead of silently discarding.
- Dragging a wedge and releasing inside the center drop zone still commits that note as the reference key (unchanged) and additionally switches the tuner back to just-intonation mode if it wasn't already.
- Add `temperament: "ji" | "et"` state to the `Tuner` wrapper, independent of `selectedKey`. Switching to equal temperament does not forget the last selected key — it changes how cents are computed and what's displayed.
- Cents calculation skips the `JI_OFFSETS`-relative-to-key math entirely in equal-temperament mode, using the raw equal-tempered cents value instead.
- The reference-key marker dot on the wheel only renders in just-intonation mode.
- The "Key: X" label below the wheel reads "Key: Equal temperament" while in equal-temperament mode, instead of a note name.
- The wheel's center face gains two new transient states: an "Equal Temp" preview while a drag is armed outside the drop zone, and a "Drag to center" hint while a note is being held (tap, pre-drag).
- The wheel's idle center text changes from the current two-state "listening…"/"hold a note" (conditional on mic-active) to a single constant two-line hint: "Tap to play" / "drag to set key".
- `Tuner` gains an optional `defaultTemperament?: "ji" | "et"` prop (default `"ji"`). `SearchPage.tsx` passes `"et"`, since it has no real tag-key context. `TagPage.tsx` is unchanged.
- The per-wedge hit-target `aria-label` is updated to mention the drag-away-for-equal-temperament outcome alongside the existing drag-to-center wording.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `tuner-pitch-wheel`: adds equal-temperament as a second tuning mode reachable via the existing drag gesture, plus discoverability hints for both the tap-to-play and drag-to-set-key gestures. Existing color/sizing requirements from the prior change are unaffected.

## Impact

- `src/Tuner.tsx`: `PitchWheel` component (gesture-outcome branching, center-face content precedence, reference-marker visibility) and the `Tuner` wrapper (new `temperament` state, cents calculation branch, "Key: X" label, `defaultTemperament` prop, aria-label wording).
- `src/SearchPage.tsx`: passes `defaultTemperament="et"` to `Tuner`.
- `src/TagPage.tsx`: no change (implicitly starts in `"ji"` mode via its existing `defaultKey`).
- No change to `src/noteColors.ts` or the CSS color tokens — the reference-key color tier simply never applies while in equal-temperament mode, since no wedge is flagged as the reference in that mode.
- No change to wheel sizing, enharmonic note names, or touch-target hit-area geometry.
- No persistence of temperament or key choice across mounts — matches the existing `selectedKey` behavior (resets to the default prop on every mount).
