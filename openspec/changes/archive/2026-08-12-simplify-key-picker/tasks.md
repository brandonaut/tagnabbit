## 1. Wheel: key-select mode plumbing

- [x] 1.1 Add `pickingKey: boolean` state to `Tuner`, alongside `selectedKey`/`temperament`.
- [x] 1.2 Pass `pickingKey` and `onSelectKey`/`onSelectET` callbacks (reusing existing `setSelectedKey`/`setTemperament` logic) into `PitchWheel` as props.

## 2. Wheel: wedge tap dispatch

- [x] 2.1 In `PitchWheel`'s `handlePointerDown`, branch on `pickingKey`: if true, call `onSelectKey(noteIdx)`, set `pickingKey` false, and return before any pointer-capture/glide/oscillator logic runs.
- [x] 2.2 Skip `handlePointerMove`/`endGesture` glide behavior entirely while `pickingKey` is true (no pointer capture is taken, so no move/up events for that gesture will fire on the wedge).
- [x] 2.3 Update each wedge's `aria-label` to describe "tap to set as reference key" when `pickingKey` is true, versus the existing tap-to-play/glide description when false.

## 3. Wheel: center-face equal-temperament button

- [x] 3.1 Render a visible, bordered/shadowed button labeled `Equal Temp.`, sized to fit within `INNER_R`, only when `pickingKey` is true, replacing the center face's normal content for that duration.
- [x] 3.2 On tap, call `onSelectET()` and set `pickingKey` false.
- [x] 3.3 Ensure the center face's existing note/octave/cents display and its non-interactivity are unchanged when `pickingKey` is false.

## 4. Wheel: key-select visual tier

- [x] 4.1 Add a "selectable" tier to `wedgeColor` (or a wheel-local equivalent) distinct from idle/reference/active, used for all 12 wedges while `pickingKey` is true.
- [x] 4.2 Apply this tier to every wedge's fill while `pickingKey` is true, overriding the normal idle/reference/active tier selection for that duration.
- [x] 4.3 Confirm wedges revert to their normal tier logic immediately once `pickingKey` becomes false, regardless of exit path.

## 5. Button: replace `KeyPicker` chip+dropdown

- [x] 5.1 Replace `KeyPicker`'s dropdown/grid markup with a single chip-styled button showing the concise label: `Key: G` (selected key's note name, "Key:" prefix kept) in JI mode, or `Equal Temp.` in ET mode.
- [x] 5.2 Wire the button's `onClick` to toggle `pickingKey` instead of opening a dropdown.
- [x] 5.2a Swap the chip's icon from `ChevronDown` to `Pencil` (lucide-react), reflecting "toggle key-select mode" instead of "open dropdown".
- [x] 5.2b Give the chip a distinct pressed/active visual state (matching the existing `CircleGauge` "Tune" toggle's active-state treatment) while `pickingKey` is true.
- [x] 5.3 Update the button's `aria-label`/`aria-pressed` to reflect current key/temperament and that activating it toggles key selection on the wheel.
- [x] 5.4 Remove the grid's outside-pointerdown/Escape listeners from `KeyPicker` and move equivalent dismissal (exit `pickingKey` without changing selection) to wherever `pickingKey` is owned (`Tuner`), reusing the same outside-tap/Escape pattern.

## 6. Cleanup

- [x] 6.1 Delete the now-unused grid rendering, per-cell `wedgeColor` tinting, and "Equal Temperament" dropdown button code from the old `KeyPicker`.
- [x] 6.2 Remove any now-dead props/handlers left over from the dropdown implementation.

## 7. Verification

- [ ] 7.1 Manually verify: tapping the button enters key-select mode, wedges show the distinct tier, center face becomes tappable.
- [ ] 7.2 Manually verify: tapping a wedge in key-select mode sets the key, switches to JI, and exits the mode.
- [ ] 7.3 Manually verify: tapping the center face in key-select mode switches to ET and exits the mode.
- [ ] 7.4 Manually verify: tapping outside the wheel, and pressing Escape, exit key-select mode without changing key/temperament.
- [ ] 7.5 Manually verify: outside key-select mode, tap-to-play and drag-to-glide on the wheel are unaffected.
- [x] 7.6 Run `bun run lint` and `bun run build`.
