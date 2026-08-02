## 1. Display-label data

- [x] 1.1 Add `NOTE_DISPLAY` to `src/notes.ts`: a `Record<number, [primary: string, secondary: string]>` covering the 5 accidental indices, per design.md's table.

## 2. Pitch wheel

- [x] 2.1 In the wedge-rendering loop (`Tuner.tsx:185-212`), look up `NOTE_DISPLAY[i]` alongside the existing `note`/`isSharp` logic.
- [x] 2.2 For accidental notes, render two `<text>` elements (or one `<text>` with two `<tspan>`s) at the label position: primary shifted up, secondary shifted down, both `textAnchor="middle"`.
- [x] 2.3 Give the secondary line a smaller `fontSize` and reduced `fillOpacity` relative to the primary line.
- [x] 2.4 Keep the primary line's existing `fontWeight`/`fill` active-state logic; apply the same `fill` color choice to the secondary line (opacity/size still reduced).
- [x] 2.5 Confirm natural-note wedges are unchanged (single `<text>`, same as today).
- [x] 2.6 Visually verify on the running wheel that two-line labels don't crowd into neighboring wedges or divider lines; adjust font sizes if needed.

## 3. Key picker dropdown

- [x] 3.1 In the grid-rendering loop (`Tuner.tsx:366-387`), look up `NOTE_DISPLAY[i]` alongside the existing `note` logic.
- [x] 3.2 For accidental notes, render the button content as two stacked lines (tight line-height, e.g. `leading-none`) sized to fit within the existing single-line button height: primary at or near the existing size/weight, secondary below it at a smaller size and reduced opacity.
- [x] 3.3 Update each accidental button's `aria-label` to identify both names (e.g. `"C#, Db"`).
- [x] 3.4 Confirm natural-note buttons are unchanged in content (single line, same `aria-label={note}` as today) but stay the same fixed size as the two-line buttons, vertically centered.
- [x] 3.5 Visually verify all 12 grid cells render at a consistent size (only the Equal Temperament button differs), and that two-line labels stay legible at that fixed size.

## 4. Verification

- [x] 4.1 Run `bun run lint`.
- [x] 4.2 Run `bun run build` to confirm no type errors.
- [x] 4.3 Manually test the wheel and dropdown in the dev server: check all 5 accidental notes show correct primary/secondary ordering (`C#/Db`, `D#/Eb`, `F#/Gb`, `Ab/G#`, `Bb/A#`), across both temperament modes and with a wedge active/detected.
