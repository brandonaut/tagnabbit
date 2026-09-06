## 1. Collapse tuning.ts to equal temperament

- [x] 1.1 Delete `JI_OFFSETS`, `JI_TARGETS`, `JI_GAP_UP`, `JI_GAP_DOWN` from `src/tuner/tuning.ts`
- [x] 1.2 Delete `jiTarget` and `nearestTarget` from `src/tuner/tuning.ts`
- [x] 1.3 Reduce `Target` to `{ semitone, targetCents }`; update `etTarget` to return that shape
- [x] 1.4 Rewrite `centsToAngle` as `clamp(-15, 15, 0.3 * deviation)` taking only the deviation
- [x] 1.5 Update `src/tuner/tuning.test.ts`: remove `jiTarget` / `nearestTarget` / JI-gap describe blocks and imports; keep and adjust `etTarget`, `centsToAngle`, `freqToCents`, `semitoneToNote`, `median3` cases to the new signatures

## 2. Strip key/temperament from Tuner.tsx

- [x] 2.1 Remove the `KeyPicker` component and its `KeyPickerProps` interface
- [x] 2.2 Remove state and refs: `selectedKey`, `temperament`, `pickingKey`, `pickingKeyRef`, `selectedKeyRef`, `temperamentRef`, `wheelAreaRef`
- [x] 2.3 Remove the `useEffect` blocks for outside-click / Escape dismissal and for syncing `selectedKeyRef` / `temperamentRef`
- [x] 2.4 In the tick loop, replace the `nearestTarget(smoothed, temperamentRef.current, ...)` call with `etTarget(smoothed)`, and drop the `pickingKeyRef.current` guard from the analysis-skip check
- [x] 2.5 Replace the `target.gapUp / 2` / `target.gapDown / 2` hysteresis bounds with `50 + HYSTERESIS_CENTS`
- [x] 2.6 Remove `Props.defaultKey` and `Props.defaultTemperament`; delete the `ENHARMONIC` import if now unused
- [x] 2.7 In `PitchWheel`: remove props `referenceNoteIdx`, `temperament`, `pickingKey`, `onSelectKey`, `onSelectET`; remove `isReference` / the reference `<path>` outline; remove the `pickingKey` branch in `handlePointerDown`; set `wedgeTier` to `isActive ? "active" : "idle"`
- [x] 2.8 In `PitchWheel`: remove the `pickingKey` center-face "Equal Temp." button branch, keeping the detected-note / cents display; simplify each wedge hit target's `aria-label` to the tap-to-play + glide text only
- [x] 2.9 Remove the `<KeyPicker>` element and the `wheelAreaRef` wrapper `div` from the render tree; drop the now-unused `Pencil` import

## 3. Update call sites

- [x] 3.1 `src/TunerPage.tsx`: drop `defaultKey` and `defaultTemperament` from the `<Tuner>` element
- [x] 3.2 `src/PlayerPage.tsx`: drop `defaultKey` and `defaultTemperament` from the `<Tuner>` element
- [x] 3.3 `src/TagPage.tsx`: drop `defaultKey`; remove the `formatKey` import if it is now unused there

## 4. Verify

- [x] 4.1 `bun run lint` and `bunx tsc -b` are clean
- [x] 4.2 `bunx vitest run src/tuner` passes
- [ ] 4.3 Manual: on the Tuner page, sing/play a pitch — wheel shows nearest equal-tempered note, arc reaches the wedge edge at 50¢, no key chip is present
- [x] 4.4 Manual: on a tag page and the player page, the tuner mounts with no key chip and reads equal-tempered
- [x] 4.5 Manual: tap-and-hold a wedge sustains its tone; glide across wedges still plays legato

## 5. Close out the change

- [x] 5.1 `openspec validate remove-tuner-just-intonation --strict` passes
- [ ] 5.2 Run `openspec archive remove-tuner-just-intonation` (or `/opsx:archive`) to fold the deltas into `openspec/specs/` and delete `openspec/specs/tuner-key-picker/`
