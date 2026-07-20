## Why

The tuner's pitch wheel (`Tuner.tsx`) currently renders all 12 notes in the same flat, muted gray with only faint hairline strokes, and at a small fixed size. Feedback from an explore-mode session identified that this makes the widget feel like a minor, easy-to-miss toy rather than a usable instrument — the problem is visual richness and scale, not touch accuracy or discoverability (those are tracked separately and intentionally deferred). We want the wheel to read as colorful and substantial at a glance, on both pages it appears.

## What Changes

- Each of the 12 wedges gets a fixed identity hue (`hue = noteIndex * 30°`), so a note's position on the wheel matches its position on the color wheel. Hue is scoped to the wedges only — no other note-name occurrence in the app (e.g. the "Key: G" label) changes color.
- Wedge color now has three saturation/lightness tiers driven by state, replacing the current gray/accent/cents-color logic used for idle, playing, detected, reference-key, and armed-drag states:
  - **Idle**: pale, low-saturation tint of the note's hue (replaces flat `--text-muted` gray).
  - **Reference key**: a subtle marker/outline in the note's own hue (replaces the generic `--accent` dot).
  - **Active** (mic-detected pitch or tap-to-play): full-saturation fill in the note's own hue. Detected and played states render identically — they cannot occur simultaneously (playing pauses mic analysis), so no visual distinction between them is needed.
  - **Armed** (drag-to-set-key in progress): full-saturation fill in the *dragged* note's own hue, replacing the generic `--accent` tint on the center face.
- Color-vision-deficient accessibility is preserved structurally: note identity (hue) already has redundant non-color cues (fixed wheel position + always-visible text label), so the state signal (idle → reference → active) is designed to carry a strong saturation/lightness jump, not rely on hue discrimination alone.
- The needle and the cents-accuracy readout (`+3¢`, green/yellow/red) are unchanged — they remain a separate color channel from the new per-note identity hues.
- The wheel's overall rendered size grows modestly from the current 200×200px, with strokes, fonts, and radii scaled proportionally so it reads as a deliberately bigger instrument rather than a blurrier version of the same widget. Applies identically wherever `Tuner` is rendered (`TagPage.tsx`, `SearchPage.tsx`) — same component, no per-page divergence.

Explicitly out of scope (deferred to future changes):
- Enharmonic note-name display (C♯/D♭) on wedge labels.
- Any visible (non-screen-reader) hint about the drag-to-center-to-set-key gesture.
- Touch-target/hit-area geometry changes beyond what naturally falls out of the size increase.

## Capabilities

### New Capabilities
- `tuner-pitch-wheel`: Visual behavior of the pitch wheel widget in `Tuner.tsx` — per-note color identity, state-driven color intensity, and sizing. This is the first spec written for this widget, so its full current + revised behavior is captured here rather than as a delta against a prior spec.

### Modified Capabilities
(none — no existing specs in `openspec/specs/`)

## Impact

- `src/Tuner.tsx`: `PitchWheel` component (wedge fill/stroke logic, center face, SVG dimensions) and the `Tuner` wrapper (container sizing).
- `src/index.css`: current theme variables (`--accent`, `--bg-surface`, `--border`, `--text-muted`) are referenced for context but the new per-note hues are a separate, additive color system, likely needing their own light/dark handling.
- No change to `src/notes.ts` (`NOTE_NAMES`, `ENHARMONIC`, `NOTE_FREQUENCIES`) — enharmonic spelling is out of scope for this change.
- No change to gesture/interaction logic (`autoCorrelate`, drag/play handlers) — this change is styling only.
