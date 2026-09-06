## Why

The tuner's just-intonation mode snaps the detected pitch to a fixed 5-limit just scale built on a single reference key.
That model is only correct for the tonic chord and its close diatonic relatives.
It produces a wolf fifth on the supertonic (ii) chord and lands roughly 27 cents sharp of the barbershop dominant-seventh chord that defines the genre.
Barbershop intonation is vertical and chord-relative — it is negotiated by ear against the other voices in a chord — which a solo tuner cannot represent.
A chord-root picker was considered and rejected as too unwieldy for practice use.
Removing the feature also retires a large share of the tuner's complexity: key-select mode on the wheel, the reference-key marker, the key/temperament chip, and the uneven-target angle math that only exists because just targets are not evenly spaced.

## What Changes

- **BREAKING** Remove just-intonation as a tuning mode. The tuner is equal-temperament only.
- Remove the pitch-wheel key-select mode: tapping a wedge always plays its tone, and the center face is never a temperament button.
- Remove the reference-key wedge outline and the reference wedge-color tier.
- Remove the key/temperament chip (`KeyPicker`) below the wheel.
- Remove the tag page's default of just-intonation in the tag's key; the tag page opens the tuner the same way every other page does.
- Delete just-intonation snapping from `src/tuner/tuning.ts` (`JI_OFFSETS`, `JI_TARGETS`, `JI_GAP_UP`, `JI_GAP_DOWN`, `jiTarget`, `nearestTarget`).
- Simplify `centsToAngle` to a fixed cents-per-degree rate (50 cents maps to half a wedge), since every target gap is now 100 cents.
- Remove the `defaultTemperament` and `defaultKey` props from the `Tuner` component and its three call sites.
- Drone practice is unaffected: holding a wedge sustains its tone, so no separate drone feature is added.

## Capabilities

### New Capabilities

None.

### Removed Capabilities

- `tuner-key-picker`: The `openspec/specs/tuner-key-picker/` directory is deleted outright. There is no reference key or temperament to pick, so nothing in that capability survives.

### Modified Capabilities

- `tuner-pitch-wheel`: Remove the equal-temperament-as-second-mode, key-select-mode, reference-key-marker, page-default-temperament, and both-temperaments-uniform requirements. Replace the piecewise-linear cents-to-angle mapping with a fixed-rate mapping.
- `tuner-pitch-detection`: Reduce note selection to nearest equal-tempered semitone; drop the temperament-dependent and key-dependent boundary behavior.

## Impact

- Code: `src/tuner/tuning.ts`, `src/tuner/tuning.test.ts`, `src/Tuner.tsx`, `src/TunerPage.tsx`, `src/TagPage.tsx`, `src/PlayerPage.tsx`.
- Specs: `openspec/specs/tuner-key-picker/` (deleted), `openspec/specs/tuner-pitch-wheel/`, `openspec/specs/tuner-pitch-detection/`.
- No API, dependency, storage, or routing changes.
- User-visible: the tuner loses its key chip and key-select interaction everywhere; readings are equal-tempered on every page.
