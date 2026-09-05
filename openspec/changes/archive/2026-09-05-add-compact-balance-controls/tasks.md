## 1. Layout restructure

- [x] 1.1 In `PlayerPage.tsx`, replace the balance block's `flex-col` wrapper (label + slider + L/R caption row) and the separate Mono `<label>` row with a single `flex` row containing the slider, the percentage text, and the Mono checkbox/label.
- [x] 1.2 Remove the standalone "Balance" text label and the L/R caption row.
- [x] 1.3 Give the slider a constrained width (e.g. `flex-1` with a `max-width`, or a fixed width) so the percentage text and Mono checkbox have room in the row.

## 2. Percentage readout

- [x] 2.1 Add a small helper (e.g. `formatBalance(value: number): string`) that returns `"Center"` at `0`, `` `${Math.round(Math.abs(value) * 100)}% L` `` when negative, and the `R` equivalent when positive.
- [x] 2.2 Render the formatted string next to the slider, updating live as `balance` state changes.

## 3. Reset-to-center gesture

- [x] 3.1 Add an `onDoubleClick` handler on the balance slider that calls `handleBalanceChange(0)`.
- [x] 3.2 Add manual double-tap detection on `onTouchEnd` (compare timestamp to the previous tap, treat two taps within ~300ms as a double-tap) that also calls `handleBalanceChange(0)`.
- [x] 3.3 Verify a double-tap/double-click does not also register as a drag that leaves balance somewhere other than center.

## 4. Verification

- [x] 4.1 Manually verify: dragging the slider updates the percentage text live and matches the audible balance.
- [x] 4.2 Manually verify: double-clicking the slider (desktop) resets balance to center and the readout shows "Center".
- [x] 4.3 Manually verify: double-tapping the slider (touch/mobile emulation) resets balance to center.
- [x] 4.4 Manually verify: Mono checkbox still toggles mono correctly in its new position, and the row doesn't overflow or wrap awkwardly at narrow viewport widths.
- [x] 4.5 Manually verify: balance still persists across pause/resume and across a reload, unchanged from before this change.
- [x] 4.6 Run `bun run lint` and `bun run build`.
