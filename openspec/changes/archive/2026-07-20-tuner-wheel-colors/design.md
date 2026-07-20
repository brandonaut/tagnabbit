## Context

`PitchWheel` in `src/Tuner.tsx` is an SVG (`viewBox="0 0 160 160"`, rendered at `width={200} height={200}`) with 12 wedge paths (one per `NOTE_NAMES` entry). Wedge color today is driven by three unrelated sources depending on state: `--text-muted` (idle), `color` prop = `centsColor` (accuracy green/yellow/red, used for the detected-note fill), and `var(--accent)` (playing fill, reference-key dot, armed-drag tint). This design replaces those three sources, for wedges only, with a single per-note color system.

The app has no JS-side theme detection — theming is purely CSS custom properties, with `:root` holding the dark (default) values and `@media (prefers-color-scheme: light)` overriding them (see `src/index.css`). There's no `data-theme` attribute or manual toggle. Any new color tokens should follow this exact pattern rather than introducing a JS `matchMedia` check, to stay consistent with how the rest of the app themes itself.

## Goals / Non-Goals

**Goals:**
- Give each of the 12 wedges a fixed, recognizable hue tied to its position on the wheel.
- Encode idle / reference-key / active state as a saturation-and-lightness progression on top of that hue, replacing the current gray/accent/cents-color logic for wedges.
- Make the wheel read as colorful even at rest (idle tier), not just when something is detected.
- Grow the wheel's rendered size modestly without hand-adjusting every stroke-width/font-size/radius constant.
- Keep the design colorblind-considerate: state must be distinguishable via lightness/chroma contrast, not hue alone.

**Non-Goals:**
- Enharmonic labels, drag-gesture hints, or touch-target geometry changes (all deferred — see proposal).
- Applying the per-note hues anywhere outside the wedges (e.g. the "Key: G" text, other components).
- Changing the needle or `+3¢` accuracy-readout color logic (`centsColor` stays as-is).
- Building a general-purpose theme-detection system in JS — reuse the existing CSS-variable/media-query pattern.

## Decisions

**1. Color function: CSS `oklch()`, not `hsl()`.**
`hsl()` hue rotation at fixed saturation/lightness produces uneven perceived brightness — yellow reads much lighter than blue at the same L. `oklch(L C H)` is perceptually uniform in lightness across hues, so all 12 notes can share the same L/C per tier and look evenly weighted, with no per-hue hand-tuning needed. `oklch()` is supported by all evergreen browsers as of ~2023 (Chrome 111+, Safari 16.4+, Firefox 113+) and works directly as an SVG `fill`/`stroke` value; this app has no browserslist floor pinning it to older engines. Alternative considered: manually tuned `hsl()` per note (works everywhere, but requires hand-picking 12 lightness offsets and re-tuning any time a tier's base lightness changes) — rejected as more ongoing maintenance for a cosmetic system that should stay easy to adjust.

**2. Hue mapping: `hue = noteIndex * 30` (degrees), computed in JS.**
Matches the existing 30°-per-wedge geometry (`segmentArc`, `toXY`) so a note's color-wheel position always matches its position on the pitch wheel. Lives as a small pure helper, not hardcoded per note, so it stays correct if `NOTE_NAMES` ordering is ever touched.

**3. New module `src/noteColors.ts` for the color helper, separate from `notes.ts`.**
`notes.ts` holds domain data (names, frequencies, enharmonic spelling); this is presentation logic specific to how `Tuner.tsx` paints itself. Keeping it separate avoids growing `notes.ts` with UI concerns and keeps `Tuner.tsx` focused on markup rather than color math. The helper exposes something like `wedgeColor(noteIdx: number, tier: "idle" | "reference" | "active"): string`, returning an `oklch(...)` string built from the note's hue and CSS-variable-driven L/C tokens for the given tier.

**4. Tier lightness/chroma values live as CSS custom properties, following the existing theme pattern.**
Add tier tokens (e.g. `--note-l-idle`, `--note-c-idle`, `--note-l-active`, `--note-c-active`, `--note-l-ref`, `--note-c-ref`) to `:root` in `index.css` alongside the existing `--accent`/`--bg-surface`/etc., with light-mode overrides in the existing `@media (prefers-color-scheme: light)` block. `wedgeColor()` reads these via `oklch(var(--note-l-<tier>) var(--note-c-<tier>) ${hue}deg)`. This means light/dark adaptation happens exactly the way the rest of the app already does it — no JS theme detection introduced — while hue assignment itself doesn't need to vary by theme (identity, not contrast, drives hue).

**5. Tier progression: idle = low chroma, reference = medium chroma marker, active = high chroma fill.**
Idle wedges get a low-chroma, near-background-lightness tint (a "whisper" of hue, not a bold wash) so the wheel reads as colorful at rest without looking noisy. Active wedges (detected or played — merged into one visual, see #6) get a high-chroma, higher-contrast fill. The reference-key indicator keeps its existing small-circle-marker mechanism (currently a generic `--accent` dot at the label ring) but recolors it to that note's own hue at a chroma between idle and active — distinct from both without introducing new geometry. Alternative considered: replace the dot with a stroked outline around the whole wedge — visually stronger, but more geometry/rendering change for a state that's meant to read as "quietly persistent," not "loud"; rejected in favor of the lower-risk recolor of the existing marker.

**6. Detected and playing states merge into one "active" visual.**
`isDetected` and `isPlaying` currently render differently (accuracy-color fill vs. accent fill). Since a wheel note can't be playing and being detected at the same time (`pausedRef` stops mic analysis while a note plays), there's no real state to distinguish visually. The wedge fill logic becomes `isActive = isDetected || isPlaying`, using `wedgeColor(i, "active")` instead of the two previous divergent sources. The `color` prop passed into `PitchWheel` (currently `centsColor`) is no longer used for wedge fills — it's only used for the needle and the center note-name text, which are unaffected by this change.

**7. Armed-drag tint reuses the same tier system.**
The center-face tint and label shown while a drag is armed (`armedNoteIdx !== null`) currently use `var(--accent)`. This becomes `wedgeColor(armedNoteIdx, "active")` (or a dedicated `"armed"` tier if visual QA shows `"active"` reads wrong against the center face's different geometry) — the dragged note previews its own identity color rather than a generic blue, consistent with everywhere else state is shown.

**8. Sizing: bump `width`/`height` props only; geometry constants stay untouched.**
Because `viewBox` is fixed at `160 160` and all geometry (`OUTER_R`, `INNER_R`, stroke widths, font sizes) is expressed in that user-space, increasing the rendered `width`/`height` (e.g. `200` → `240`) scales every stroke, label, and radius proportionally for free — no need to touch `CX`/`CY`/`OUTER_R`/etc. or font-size props individually. This also proportionally grows the wedge hit-target areas as a side effect, but that's incidental, not a goal — hit-target sizing stays out of scope per the proposal. Exact target size (240 is a starting point, ~20% larger) is confirmed during implementation via visual comparison on both `TagPage` and `SearchPage`, since both must look identical (same shared component, no per-page size divergence).

## Risks / Trade-offs

- **oklch() browser support** → Mitigation: evergreen-browser support has been broad since 2023; if analytics ever surface meaningful traffic from browsers predating that, fall back to hand-tuned `hsl()` per tier (the `wedgeColor()` helper's signature doesn't change, only its internals).
- **A 12-hue rainbow could read as visually busy/childish rather than "colorful and substantial"** → Mitigation: idle tier stays low-chroma/subtle by design; only the active tier is bold, so the wheel isn't shouting all 12 colors at once in normal use — visual QA against both themes before considering this done.
- **Merging detected/playing loses a previously-available (if minor) visual distinction** → Mitigation: confirmed acceptable with the user; the two states are mutually exclusive at runtime, so there's no real information loss, only a code-path simplification.
- **Reference-key marker (recolored dot) may be too subtle at the new larger size to read as its own tier, distinct from idle** → Mitigation: chroma value for the `"reference"` tier is tunable independently in `index.css`; adjust during visual QA rather than guessing a final value now.

## Migration Plan

Pure frontend styling change, no data migration. Ship behind normal review; no feature flag needed since it only touches presentational rendering of an existing widget. Rollback is a plain revert of `Tuner.tsx` / `noteColors.ts` / `index.css` changes.

## Open Questions

- Exact `width`/`height` target (starting assumption: 240×240) — confirm via visual comparison during implementation.
- Exact oklch L/C values per tier per theme — confirm via visual comparison in both light and dark mode during implementation, not fully pre-specified here.
