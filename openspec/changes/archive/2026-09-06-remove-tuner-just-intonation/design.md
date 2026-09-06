## Context

See proposal.md - Why.

The tuner today carries two coupled axes: a reference key (12 choices) and a temperament (`"ji"` / `"et"`).
Just-intonation mode drives three things that equal temperament does not need:

- `jiTarget()` in `src/tuner/tuning.ts` snaps a cents value to the nearest degree of a fixed 5-limit scale built on the reference key, and reports the uneven gaps to its neighbours (`JI_GAP_UP` / `JI_GAP_DOWN`).
- `centsToAngle()` divides the deviation by whichever neighbour gap applies, so the arc reaches a wedge edge at the (uneven) midpoint between just targets.
- `Tuner.tsx` renders a `KeyPicker` chip, a wheel "key-select mode" (`pickingKey`) that repurposes wedge taps and the center face, a reference-key wedge outline, and page-level `defaultTemperament`.

`etTarget()` already exists and already returns `gapUp === gapDown === 100`.
In equal temperament `centsToAngle()` already reduces to `30 * deviation / 100`, clamped to ±15°.
So equal-temperament behaviour is a strict subset of what runs today; this change deletes the other subset.

## Goals / Non-Goals

**Goals:**

- One tuning model: nearest equal-tempered semitone, everywhere.
- Remove the key/temperament state, the chip, and key-select mode from `Tuner.tsx`.
- Collapse `tuning.ts` to the equal-tempered path and drop the now-dead exports and their tests.
- Keep tap-to-play, glide, the accuracy arc, silence handling, panel sizing, and enharmonic labels exactly as they are.

**Non-Goals:**

- No drone feature. Holding a wedge already sustains a tone.
- No change to pitch detection, smoothing, or the autocorrelation path.
- No re-theming of the wheel beyond deleting the reference-key tier.

## Decisions

### Delete the JI exports rather than keep them behind a dead flag

Remove `JI_OFFSETS`, `JI_TARGETS`, `JI_GAP_UP`, `JI_GAP_DOWN`, `jiTarget`, and `nearestTarget` from `tuning.ts`, plus their cases in `tuning.test.ts`.
`Tuner.tsx` calls `nearestTarget(smoothed, temperament, keyIdx)` in one place; it becomes `etTarget(smoothed)`.
Alternative considered: keep the functions, always pass `"et"`. Rejected — it leaves the uneven-gap machinery and its tests in the tree with no caller, which is exactly the complexity this change exists to remove.

### Simplify `Target` and `centsToAngle`

`Target` keeps `semitone` and `targetCents`; `gapUp` / `gapDown` are dropped since they are always 100.
`centsToAngle(deviation)` becomes `clamp(-15, 15, 0.3 * deviation)`.
The hysteresis check in `Tuner.tsx` that reads `target.gapUp / 2` / `target.gapDown / 2` becomes a flat `50 + HYSTERESIS_CENTS`.
Alternative considered: leave `Target` shaped as-is with constant 100 gaps. Rejected — carrying fields that are always the same constant invites the reader to think they vary.

### Remove `defaultKey` and `defaultTemperament` props entirely

`defaultTemperament` has no meaning left.
`defaultKey` only ever fed `selectedKey` / `referenceNoteIdx`, both of which are removed.
Three call sites change: `TunerPage.tsx`, `PlayerPage.tsx` (both currently pass `defaultTemperament="et"`), and `TagPage.tsx` (currently passes the tag's key and relied on the `"ji"` default).
Alternative considered: keep `defaultKey` as a no-op for API stability. Rejected — there are three in-repo call sites and no external consumers.

### Keep the enharmonic-label requirement, reword one scenario

`NOTE_DISPLAY` labelling is static and key-independent already.
Only the scenario "Label does not change with selected key or temperament" names a removed concept; it is reworded to "Label does not change with wheel state".

## Risks / Trade-offs

- [Users who set a reference key for tonic-chord practice lose that readout] → Accepted. The proposal establishes the readout was only correct for the tonic and its relatives and was wrong for the barbershop seventh; an unqualified equal-tempered reference is more honest than a sometimes-right one.
- [`selectedKey` also gated the mic-pause during key-select (`pickingKeyRef`)] → Removing `pickingKey` removes that branch; the mic-pause on active wheel gestures (`gesturesAudioRef.current.size > 0`) is untouched, which is the only pause that still matters.
- [Escape / outside-click handler was scoped to `pickingKey`] → It is removed with `pickingKey`; nothing else on the wheel used it.

## Migration Plan

Single PR, no data or storage migration.
Rollback is a straight revert; there is no persisted state tied to the removed feature.
