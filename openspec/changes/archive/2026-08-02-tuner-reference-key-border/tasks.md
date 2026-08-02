## 1. Wheel reference marker

- [x] 1.1 In the wedge-rendering loop (`Tuner.tsx`), replace the `isReference` `<circle>` block with a `<path>` using `d={segmentArc(i)}`, `fill="none"`, `stroke={wedgeColor(i, "reference")}`, and `strokeLinejoin="round"`.
- [x] 1.2 Set `style={{ pointerEvents: "none" }}` on the new stroke path, matching the outgoing dot.
- [x] 1.3 Remove the now-unused `rx`/`ry` label-ring-offset coordinates if nothing else references them after the dot is removed.
- [x] 1.4 Confirm the border only renders when `isReference` is true (JI mode, matching `referenceNoteIdx`) — no change to that gating logic itself.

## 2. Verification

- [x] 2.1 Run `bun run lint`.
- [x] 2.2 Run `bun run build` to confirm no type errors.
- [x] 2.3 Manually verify in the dev server: the selected reference key's wedge shows a full colored outline (not a dot), the outer-ring slice for that wedge visibly picks up the note's hue, the border doesn't crowd an accidental wedge's two-line label (check e.g. `Ab/G#` as the reference key), and no border appears in equal-temperament mode.
