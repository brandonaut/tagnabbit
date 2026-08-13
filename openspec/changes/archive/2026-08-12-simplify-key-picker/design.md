## Context

`Tuner.tsx` has two separate 12-note UIs today: the `PitchWheel`'s 12 wedges (tap-to-play, drag-to-glide) and `KeyPicker`'s dropdown grid (tap-to-set-key), plus a chip that opens/closes the grid.
The grid duplicates the wheel's own note layout and color language (`wedgeColor`) purely to offer a second tap target for the same 12 notes.

The wheel's wedge hit targets, gesture handlers (`handlePointerDown`/`handlePointerMove`/`endGesture`), and the center face's idle content are all defined in `PitchWheel` (`Tuner.tsx:309-541`).
`KeyPicker` (`Tuner.tsx:550-654`) owns its own open/close state, outside-click/Escape handling, and the grid/ET-button markup.

## Goals / Non-Goals

**Goals:**
- One button, no popup: replace the chip+dropdown with a button that toggles a mode on the existing wheel.
- Reuse the wheel's existing wedges as the key-selection targets instead of a duplicate grid.
- Keep the always-visible key/temperament label below the wheel, shortened where redundant (`Key: G` unchanged / `Equal Temp.` instead of `Equal Temperament`).
- Preserve immediate-apply-and-close semantics from the old dropdown (tap a note → applied, mode exits).
- Preserve cancel-without-change via tap-outside and Escape, matching the old dropdown's dismissal behavior.

**Non-Goals:**
- No change to pitch detection, audio playback, or the accuracy arc.
- No change to the wheel's existing tap-to-play / drag-to-glide behavior outside of key-select mode.
- No change to the wedges' own labeling (still icon/color-only, no new per-wedge text).

## Decisions

### One boolean mode flag on `Tuner`, not a separate component tree
`Tuner` owns a `pickingKey: boolean` state, lifted alongside `selectedKey`/`temperament`. `PitchWheel` receives it as a prop and branches wedge/center tap handling on it, rather than `KeyPicker` remaining a self-contained popup.
Alternative considered: keep `KeyPicker` as a component that renders an invisible overlay on top of the wheel to capture taps. Rejected — the wheel already owns pointer capture and hit-testing (`angleToNoteIdx`, per-wedge `<path>` hit targets); a second overlay would duplicate that geometry and fight the wheel's own `pointerId` tracking for the drag-glide gesture.

### Mode indication combines a non-text wedge tier with a labeled center button
`tuner-pitch-wheel`'s blanket "no hint text on center face" requirement is removed by this change (see spec deltas) specifically to allow a labeled center button. Key-select mode is signaled by:
- The wedges rendering in a distinct visual tier (reusing the existing idle/reference/active tier system with the note's own hue, at a tier between idle and active — e.g. a mid-chroma "selectable" look) so the whole ring reads as "different from normal" without new text.
- The center face rendering a visible, bordered/shadowed button labeled `Equal Temp.`, replacing the blank/detected-pitch display for the duration of key-select mode.
Alternative considered: keep the center face text-free, relying on shape/affordance alone (a plain tappable circle) or an icon (e.g. lucide `Equal`) instead of a label. Rejected — discoverability of the equal-temperament target was judged more important than avoiding text in this one spot; the label removes any ambiguity about what tapping the center does.

### Chip keeps its pill styling; icon swaps from chevron to pencil, plus a pressed visual state

The chip retains its existing pill shape/sizing (`Tuner.tsx:590` today renders `ChevronDown`).
The trailing icon changes from `ChevronDown` (implies "opens a dropdown") to `Pencil` (lucide-react; edit metaphor), matching the chip's new behavior of toggling key-select mode on the wheel rather than opening a popup.
While key-select mode is active, the chip additionally renders in a distinct pressed/active visual state (e.g. filled/inverted background, matching the `CircleGauge` "Tune" toggle button's existing active-state treatment), giving a persistent on-screen signal of the mode beyond the initial tap.
Alternative considered: `SlidersHorizontal` (adjustment metaphor). Superseded — pencil's edit metaphor was judged clearer for "change the key," and the chip's own pressed state (new) now carries the primary "mode is active" signal, so the icon's job is just to hint at the action, not the state.

### Same button is the toggle in and out

The below-wheel button doubles as both the entry point and, while in key-select mode, the way to cancel: tapping it again exits the mode without change.
This mirrors the old chip's open/close-by-re-tap behavior, so no new interaction pattern is introduced — only the destination of the tap (wheel, not a dropdown) changes.

### Wedge tap dispatch branches once, at the top of the pointer-down handler

`handlePointerDown` in `PitchWheel` checks `pickingKey` first: if true, call `onSelectKey(noteIdx)` and stop — no pointer capture, no glide tracking, no oscillator.
If false, existing play-tone logic runs unchanged.
This keeps the two behaviors mutually exclusive by construction rather than by convention.

### Center tap target only exists while `pickingKey` is true

Today the center face has no pointer handling.
A center hit target (e.g. a `<circle>` sized to `INNER_R`) is only rendered/interactive when `pickingKey` is true, so it never intercepts normal idle/active-state center content (note name, octave, cents) which continues to render exactly as before when not picking.

## Risks / Trade-offs

- [Overloading wedge taps with two meanings could confuse users who don't notice the button state] → Mitigation: distinct wedge tier + distinct center circle give two simultaneous non-text signals; button itself changes appearance while active (e.g. pressed/active style), consistent with other toggle buttons already in this component (size toggle, tune toggle).
- [Removing the dropdown removes the only place all 12 keys were visible at once as a labeled grid] → Mitigation: the wheel already labels all 12 notes at all times; key-select mode doesn't hide those labels, it just changes what tapping them does.
- [Center tap for equal temperament is a smaller, less discoverable target than the old explicit "Equal Temperament" button] → Accepted trade-off per proposal; center face is large enough (`INNER_R` radius) to be an easy target, and it's the natural "away from all wedges" gesture.

## Open Questions

None outstanding — resolved in prior discussion (button + wheel-tap for keys, center-tap for equal temperament, concise below-wheel label).
