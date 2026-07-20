## 1. Gesture outcome plumbing

- [x] 1.1 In `PitchWheel`, change `onGestureEnd`'s signature from `(committedNoteIdx: number | null) => void` to a three-way result: `{ type: "key"; noteIdx: number } | { type: "et" } | { type: "none" }`
- [x] 1.2 In `endGesture` (the `onPointerUp` handler), compute the result: not dragging → `{ type: "none" }`; dragging and inside drop zone → `{ type: "key", noteIdx }`; dragging and outside drop zone → `{ type: "et" }`
- [x] 1.3 Give `onPointerCancel` its own handler that clears gesture/playing/armed state without calling `onGestureEnd` at all, so a cancelled gesture never commits a key or an equal-temperament switch

## 2. Temperament state

- [x] 2.1 Add `temperament: "ji" | "et"` state to the `Tuner` wrapper, seeded from a new `defaultTemperament?: "ji" | "et"` prop (default `"ji"`)
- [x] 2.2 Add a `temperamentRef` mirroring `temperament`, following the existing `selectedKeyRef` pattern, so the `tick()` closure reads current temperament without stale closures
- [x] 2.3 Update `handleGestureEnd` (the `onGestureEnd` callback passed to `PitchWheel`) to branch on the new result type: `"key"` → `setSelectedKey` + `setTemperament("ji")`; `"et"` → `setTemperament("et")`; `"none"` → no state change

## 3. Cents calculation

- [x] 3.1 In `tick()`, branch the cents calculation on `temperamentRef.current`: `"et"` uses `result.cents` directly; `"ji"` keeps the existing `degreeIdx`/`JI_OFFSETS` math unchanged

## 4. Reference marker and key label

- [x] 4.1 Pass `temperament` as a new prop to `PitchWheel`
- [x] 4.2 Change the reference-marker render condition from `isReference` to `isReference && temperament === "ji"`
- [x] 4.3 Update the "Key: …" label below the wheel to show `Key: Equal temperament` when `temperament === "et"`, and the existing `Key: {selectedKey}` otherwise

## 5. Center-face content precedence

- [x] 5.1 Add an "armed-ET" preview: when a drag is past the dead-zone and outside the drop zone, show plain-text "Equal Temp" in the center face (no note-hue color)
- [x] 5.2 Add a "held-pre-drag" hint: when `playingNoteIdx !== null` and no drag has started, show a "Drag to center" hint in the center face
- [x] 5.3 Replace the `idleLabel` prop and its two conditional strings ("listening…" / "hold a note") with a single constant two-line idle hint: "Tap to play" / "drag to set key", shown whenever no gesture is in progress and no pitch is detected, regardless of mic-active state
- [x] 5.4 Remove the now-unused `idleLabel` prop from `WheelProps` and its computation in the `Tuner` wrapper
- [ ] 5.5 Verify the full center-face precedence order renders correctly: armed-key → armed-ET → held-pre-drag hint → detected pitch+cents → idle hint

## 6. Accessibility and page defaults

- [x] 6.1 Update the per-wedge hit-target `aria-label` to mention all three outcomes: playing the note, dragging to center to set the key, and dragging away to switch to equal temperament
- [x] 6.2 Add `defaultTemperament="et"` to the `Tuner` usage in `SearchPage.tsx`
- [x] 6.3 Confirm `TagPage.tsx` is unchanged and still starts in just-intonation mode via its existing `defaultKey`

## 7. Verification

- [ ] 7.1 Manually test: dragging a wedge outside the drop zone and releasing switches the wheel to equal-temperament mode (center label, "Key: …" line, and reference marker all update)
- [ ] 7.2 Manually test: dragging a wedge into the drop zone and releasing commits that key and returns to just-intonation mode from equal temperament
- [ ] 7.3 Manually test: cancelling a drag (e.g. via browser gesture takeover, or simulate by checking the code path) leaves both key and temperament unchanged
- [ ] 7.4 Manually test: cents readout in equal-temperament mode matches raw pitch deviation (no JI offset), verified against a known non-root scale degree
- [ ] 7.5 Manually test: idle hint, held-pre-drag hint, and armed-ET preview all render as designed, in both light and dark mode
- [ ] 7.6 Manually test: search page opens with the tuner in equal-temperament mode by default; a tag page opens in just-intonation mode with the tag's key
- [x] 7.7 Run `bun run lint` and `bun run build`
