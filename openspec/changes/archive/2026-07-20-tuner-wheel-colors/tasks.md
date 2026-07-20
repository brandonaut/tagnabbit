## 1. Color foundation

- [x] 1.1 Add tier color tokens to `src/index.css` (`--note-l-idle`, `--note-c-idle`, `--note-l-reference`, `--note-c-reference`, `--note-l-active`, `--note-c-active`) in `:root`, with light-mode overrides in the existing `@media (prefers-color-scheme: light)` block
- [x] 1.2 Create `src/noteColors.ts` exporting a `wedgeColor(noteIdx: number, tier: "idle" | "reference" | "active"): string` helper that computes `hue = noteIdx * 30` and returns an `oklch(...)` string built from the tier's CSS custom properties

## 2. Wedge rendering

- [x] 2.1 In `PitchWheel` (`src/Tuner.tsx`), replace the idle-state `--text-muted` fill/stroke on wedge labels and segments with `wedgeColor(i, "idle")`
- [x] 2.2 Replace the `isPlaying` (`var(--accent)`) and `isDetected` (`color`/`centsColor`) wedge-fill branches with a single `isActive = isDetected || isPlaying` check using `wedgeColor(i, "active")`
- [x] 2.3 Recolor the reference-key marker (currently the `var(--accent)` dot at the label ring) to `wedgeColor(referenceNoteIdx, "reference")`
- [x] 2.4 Recolor the armed-drag center-face tint and armed note-name label (currently `var(--accent)`) to `wedgeColor(armedNoteIdx, "active")`
- [x] 2.5 Confirm the needle and center note-name/cents-readout color logic (`centsColor`) is untouched by the above changes

## 3. Sizing

- [x] 3.1 Increase the `PitchWheel` SVG's rendered `width`/`height` props (starting point: 240×240) while leaving `viewBox`, `CX`/`CY`, radii, stroke widths, and font sizes unchanged
- [ ] 3.2 Visually verify proportional scaling looks correct (no clipping, no awkward whitespace) on both `TagPage` and `SearchPage`

## 4. Verification

- [x] 4.1 Manually test in the browser: idle wheel shows a visible pale rainbow across all 12 wedges in both light and dark mode
- [x] 4.2 Manually test: tapping a wedge to play it, and singing/humming a detected pitch, both show the same full-saturation active color for that note
- [x] 4.3 Manually test: dragging a wedge to the center previews that note's own hue, and committing the drag updates the reference-key marker to the new note's hue
- [x] 4.4 Manually test: cents readout and needle still show green/yellow/red accuracy colors, unaffected by wedge hue
- [x] 4.5 Confirm wheel renders identically (size and behavior) on the search page and a tag page
- [x] 4.6 Run `bun run lint` and `bun run build`
