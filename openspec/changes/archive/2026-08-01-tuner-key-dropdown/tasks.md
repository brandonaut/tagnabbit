## 1. Remove the wheel's drag gesture

- [x] 1.1 Remove `Gesture` interface, `GestureResult` type, `gestureRef`, `armedNoteIdx`, `isDragging`, `DEAD_ZONE_R`, and `DROP_ZONE_R` from `PitchWheel` in `src/Tuner.tsx`
- [x] 1.2 Collapse `handlePointerDown`, `handlePointerMove`, `endGesture` (rename/simplify to a plain pointer-up handler), and `cancelGesture` to tap-to-play only, with no drag tracking
- [x] 1.3 Remove the `onPlayStart`/`onPlayStop`-adjacent `onGestureEnd` prop from `WheelProps` and its caller (`handleGestureEnd` in `Tuner`)
- [x] 1.4 Remove the armed-preview center-face text/color states ("Equal Temp" preview, armed-note-name preview) and the "Drag to center" hold hint; leave the center face blank while a wedge is held
- [x] 1.5 Update the idle center-face hint to mention tap-to-play only
- [x] 1.6 Update each wedge hit target's `aria-label` to describe only tap-to-play
- [x] 1.7 Remove the reference-key "Key: …" text block below the wheel (superseded by the chip in section 2)

## 2. Build the key/temperament chip and dropdown

- [x] 2.1 Add a chip button in place of the removed "Key: …" text, showing the current reference key (tinted via `wedgeColor`) or "Equal Temperament" (untinted)
- [x] 2.2 Add local open/closed state for the dropdown, toggled by tapping the chip
- [x] 2.3 Render the dropdown as a 4-column by 3-row grid of the 12 `NOTE_NAMES`, each cell tinted via `wedgeColor(i, "idle")`, with the current reference key's cell using `wedgeColor(i, "reference")` when in just-intonation mode
- [x] 2.4 Add a full-width "Equal Temperament" button below the grid, visually marked when it's the active mode
- [x] 2.5 Wire grid-cell taps to `setSelectedKey` + `setTemperament("ji")`, and the Equal Temperament button to `setTemperament("et")`; close the dropdown on either action
- [x] 2.6 Add outside-click and Escape-key dismissal that closes the dropdown without changing state, mirroring the pattern in `SettingsDrawer.tsx`
- [x] 2.7 Add accessible names to the chip (reflecting current state) and to each grid cell / the Equal Temperament button

## 3. Verify

- [x] 3.1 Run `bun run lint`
- [x] 3.2 Run `bun run build`
- [x] 3.3 Manually verify in the browser: tap-to-play still works on every wedge, chip opens/closes the dropdown, selecting a key updates the wheel's reference marker and JI cents math, selecting Equal Temperament updates the cents math and chip label, outside-click/Escape dismiss without side effects
- [x] 3.4 Manually verify on both `Tuner` usages (`SearchPage.tsx`, `TagPage.tsx`) since they differ in `defaultKey`/`defaultTemperament`
