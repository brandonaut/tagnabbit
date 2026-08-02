## Context

Both the pitch wheel (`Tuner.tsx:185-212`) and the key picker dropdown (`Tuner.tsx:366-387`) render their 12 note labels by mapping over `NOTE_NAMES` (`src/notes.ts:1`), a sharps-only array.
That same array also serves as the canonical index for angle math (`angleToNoteIdx`) and the key into `NOTE_FREQUENCIES` for oscillator pitch.
Today each note renders as a single text string — an SVG `<text>` element in the wheel, plain button text in the dropdown.

`NOTE_FREQUENCIES` (`src/notes.ts:12-30`) already maps every flat spelling to the identical frequency as its sharp twin, since this is pure 12-TET.
So there is no acoustic reason to prefer one spelling over the other — this change only adds a second, subordinate line of text to the 5 accidental labels.

## Goals / Non-Goals

**Goals:**
- Add a secondary enharmonic name to the 5 accidental note labels, in both the wheel and the dropdown, without touching indexing, frequency lookup, or gesture/angle math.
- Keep the primary/secondary visual hierarchy consistent across both widgets (same relative font-size and opacity ratio).
- Preserve existing per-note color, active-state, and reference-key marker behavior unchanged.

**Non-Goals:**
- No context-awareness — labels do not change based on `selectedKey` or `temperament`.
- No change to `NOTE_NAMES`, `NOTE_FREQUENCIES`, `ENHARMONIC`, or any JI/ET frequency computation.
- No change to tag list/detail key display (`formatKey.ts`, `TagListItem.tsx`) — this is scoped to the tuner's own wheel and key picker.
- Not attempting pixel-perfect final sizing here — exact font-size/opacity values are a visual-QA pass during implementation, not a design decision to lock in advance.

## Decisions

**1. New display-label table, keyed by note index, ordered pair per accidental.**
Add to `src/notes.ts`:
```ts
export const NOTE_DISPLAY: Record<number, [primary: string, secondary: string]> = {
  1: ["C#", "Db"],
  3: ["D#", "Eb"],
  6: ["F#", "Gb"],
  8: ["Ab", "G#"],
  10: ["Bb", "A#"],
}
```
Natural notes (indices 0, 2, 4, 5, 7, 9, 11) have no entry.
Callers fall back to `NOTE_NAMES[i]` as a single-line label when no entry exists.
Keying by index rather than by the sharp spelling keeps ordering explicit per note, so the flat-first exception for `Ab`/`Bb` is a plain data fact rather than a runtime rule.
This also keeps `NOTE_NAMES` as the untouched canonical index/frequency key.

*Alternative considered*: a parallel 12-element array of `[string, string?]` tuples.
Rejected — a sparse map keyed by the 5 accidental indices is more direct about "only these 5 notes are special" and avoids `undefined`-checking across all 12 entries.

**2. Wheel: two stacked `<text>` elements (or `<tspan>`s) instead of one, only for accidental notes.**
When `NOTE_DISPLAY[i]` exists, render primary text shifted up from the current label position and secondary text shifted down, both still `textAnchor="middle"`.
Primary keeps the existing active-state fill/fontWeight logic.
Secondary uses the same fill color but at reduced `fillOpacity` (e.g. ~0.55-0.65) and a smaller `fontSize` than primary.
Natural notes render exactly as today (single `<text>`, unchanged).

*Alternative considered*: single `<text>` with `"C#/Db"` inline.
Rejected per earlier discussion — a 5-character inline label doesn't fit the narrow wedge width near the center, and slash-separated same-size text reads as "two equal options" rather than "one primary, one alternate."

**3. Dropdown: stack primary/secondary as two lines inside the button, only for accidental notes, at a fixed button size shared by all 12 grid cells.**
All 12 grid cells SHALL remain the same size as each other, whether they show one line or two — only the Equal Temperament button (a separate, full-width control below the grid) is exempt from this.
To fit two lines in the existing single-line button height, reduce line-height/leading on both lines rather than growing the button (e.g. `leading-none` or a fixed smaller line-height, plus a smaller secondary font size than the wheel's secondary label if needed for fit).
Render primary text at a size/weight close to the existing `text-[11px] font-semibold` (may need a slight reduction to leave room for the secondary line) and secondary text below it at a smaller size and reduced opacity.
Natural-note buttons stay single-line, vertically centered within the same fixed button height as the two-line cells.

*Alternative considered*: let two-line cells grow taller than one-line cells.
Rejected — explicit product decision that all 12 cells must stay visually consistent in size; only the Equal Temperament button is allowed to differ, since it's already a distinct, full-width control.

**4. Accessibility label includes both names regardless of visual stacking.**
The dropdown button's `aria-label` (currently `aria-label={note}`) should read both names for accidental notes (e.g. `"C sharp or D flat"`, or simply `"C#, Db"`), so screen reader users get the same information sighted users get from the secondary line.
The wheel's outer `aria-label="Pitch wheel tuner"` is unaffected, since per-wedge elements aren't independently focusable today.

## Risks / Trade-offs

- **Wedge crowding** → the wheel's wedges are already narrow near the label radius, so a second line of text risks visually crowding into neighboring wedges or the divider lines.
  Mitigation: keep secondary font size meaningfully smaller than primary (not just a notch smaller) and verify visually at implementation time; this is explicitly left as a visual-QA task rather than pre-decided here.
- **Active-state contrast** → when a wedge is active/detected, primary text switches to `var(--note-text-on-active)` for contrast against the colored wedge fill.
  Secondary text must follow the same color switch (just at reduced opacity) or it could become unreadable against certain hues.
  Mitigation: secondary always inherits primary's fill color choice, only opacity/size differ.
- **Dropdown two-line legibility at fixed size** → since all 12 grid cells must stay the same size, the 5 two-line cells have to fit both names into the same vertical space a single-line cell uses today, which leaves less room per line than the wheel's secondary label gets.
  Mitigation: use tighter line-height and, if needed, a smaller secondary font size than the wheel's; verify legibility visually at implementation time rather than pre-deciding exact values here.

## Migration Plan

Pure UI addition — no data migration, no state/schema changes, no persisted values affected.
Ships as a single change; rollback is a plain revert since `NOTE_NAMES`/`NOTE_FREQUENCIES`/`ENHARMONIC` are untouched and no other code depends on the new `NOTE_DISPLAY` export.

## Open Questions

- Exact font-size and opacity values for the secondary label (both wheel and dropdown) — left to implementation-time visual QA against the real wheel geometry.
- Exact aria-label wording for accidental dropdown buttons (e.g. spoken form "C sharp or D flat" vs. literal "C#, Db").
