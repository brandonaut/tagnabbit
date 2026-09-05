## Context

`PlayerPage.tsx` currently renders balance as its own three-line block (label, `<input type="range">`, L/R caption row) and Mono as a separate checkbox row beneath it.
Both controls already share one piece of state each (`balance`, `mono`) with existing change handlers (`handleBalanceChange`, `handleMonoChange`) — this change only touches layout and adds one new interaction, not the underlying state model.
See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Fit the balance slider, its percentage readout, and the Mono checkbox into a single row.
- Show balance as a percentage the user can read at a glance, instead of only inferring it from thumb position.
- Add a fast reset-to-center gesture on the slider.

**Non-Goals:**
- Any change to the Web Audio balance/mono routing, gain math, or persistence — `applyBalance`, `applyRouting`, and `playerFile.ts` are untouched.
- Replacing the native `<input type="range">` with a custom control (a rotary knob was considered and explicitly rejected in favor of keeping the native slider, per prior discussion).
- Changing the balance slider's range, step, or default value.

## Decisions

- **Percentage formula**: `Math.round(Math.abs(balance) * 100)`, labeled `"{n}% L"` when `balance < 0`, `"{n}% R"` when `balance > 0`, and `"Center"` when `balance === 0`. Matches the existing `-1..1` state range with no new state needed.
- **Reset gesture implemented as a native double-click handler (`onDoubleClick`) plus a small manual double-tap detector on `onTouchEnd`** (comparing timestamps between successive taps, e.g. within 300ms), rather than pulling in a gesture library. Alternative considered: a dedicated "reset" button next to the slider — rejected because it adds a visible element back into the row the layout change is trying to shrink, working against the compactness goal.
- **Layout**: a single `flex` row containing the range input (given a constrained width via a max-width or flex-basis so it doesn't crowd out the percentage text and checkbox), the percentage text, and the Mono `<label>`/checkbox — replacing the current `flex-col` block. No new component needed, just restructuring existing JSX in `PlayerPage.tsx`.

## Risks / Trade-offs

- [A double-tap on mobile could occasionally be misread as two single taps, or a deliberate quick re-drag could be misread as a double-tap] → Low risk: the 300ms window is a well-established convention (matches typical OS double-tap thresholds), and a false reset is a one-drag fix, not data loss.
- [Removing the dedicated "Balance" label could make the control's purpose less obvious to a first-time user] → Accepted per proposal: the percentage text plus L/R suffixes already communicate what's being adjusted, and screen readers still get an explicit `aria-label` on the slider regardless of the visible text label.
