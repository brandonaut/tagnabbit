## Context

See proposal.md — Why.

Relevant current state in `src/PlayerPage.tsx`:

- The detail waveform is a `<canvas>` drawn once at `bucketCount` px wide (1 px per peak bucket, `WAVEFORM_PX_PER_SEC = 40`) inside an `overflow-hidden` viewport; a `requestAnimationFrame` loop (`panWaveformTo`) writes `transform: translateX(...)` on the canvas and `left` on the playhead every frame, driven straight off `audioRef.current.currentTime` with no React state.
- Position is also controlled by a plain `<input type="range">` bound to `currentTime` / `duration`, calling `handleScrub(value)`.
- `waveformPeaks` (`{ min, max, bucketCount }`, one pair per bucket over the whole track) is already computed per track by `computeFileWaveform` / `bucketWaveformPeaks`.
- Speed control: a `<select>` over `SPEED_OPTIONS` plus `Minus` / `Plus` stepper buttons; `getAdjacentSpeed` walks `SPEED_OPTIONS` via `indexOf(speed)`.
- Balance is a `<input type="range">` + percentage readout; mono is a `<input type="checkbox">` with inline text. The two live in separate rows with different `gap` values and no shared alignment.

## Goals / Non-Goals

**Goals:**

- One whole-track position control (the minimap) that reaches any point in a single gesture, visually distinct from the detail waveform's local drag.
- Keep keyboard/AT seek working without a focusable canvas.
- Speed/balance/mono read as one aligned panel.
- Touch only `src/PlayerPage.tsx`; reuse existing `waveformPeaks`; no new state persistence, no audio-graph changes.

**Non-Goals:**

- Dragging the minimap's window box to pan the detail waveform (detail waveform still pans itself off playback position).
- Zoom controls or a configurable minimap height.
- Changing how `waveformPeaks` is computed or cached.

## Decisions

### Minimap as its own canvas, resampled to element width

A second `<canvas>` in its own wrapper, drawn from `waveformPeaks` but resampled so the whole track spans the wrapper's client width: for each device pixel column `x`, map to `bucket = Math.floor((x / width) * bucketCount)` and fill from `min[bucket]`/`max[bucket]`. Redraw when peaks arrive and on wrapper resize (`ResizeObserver`, matching the existing viewport-width pattern).

- Alternative — style the existing range input as a thin bar: rejected earlier with the user; a range input can't show the track's waveform or a window box.
- Alternative — draw at `bucketCount` width and CSS-scale down: rejected; scaling blurs and complicates px-based window-box math.
- Alternative — one canvas toggled between zoomed/overview: rejected; two static canvases are simpler than a mode switch, and both are visible at once anyway.

### Absolute seek, no tap/drag disambiguation

`pointerdown` on the minimap wrapper does `setPointerCapture` and seeks immediately; `pointermove` while captured keeps seeking; `pointerup` releases. `time = clamp((clientX - rect.left) / rect.width * duration, 0, duration)` → `handleScrub(time)`. Unlike the waveform (which needs a movement threshold to tell tap-to-toggle from drag-to-scrub), every minimap press is a seek, so no threshold logic.

### Playhead + window box updated in the existing rAF loop

The `panWaveformTo` rAF loop already runs every frame whenever a track is mounted. Extend it (or add a sibling writer in the same loop) to also set the minimap playhead `left` and the window-box `left`/`width` via direct style writes — no new React state, no new timer. Window box mirrors `panWaveformTo`'s own clamp math: visible span seconds `= viewportWidth / WAVEFORM_PX_PER_SEC`, visible start time clamped to `[0, duration - span]`; convert both to minimap px with `* minimapWidth / duration`. Guard all of it on `duration > 0` (same reason the waveform playhead stays hidden until peaks exist).

### Keyboard/AT seek via a visually hidden range input

Keep an `<input type="range" aria-label="Playback position">` bound to `currentTime` / `duration` / `handleScrub`, positioned over the minimap with the `sr-only` clip pattern so it stays focusable and operable by keyboard and screen readers but is not painted. Pointer users seek via the canvas handlers instead.

- Trade-off: an `sr-only` input is effectively unreachable by pointer-only assistive tech (switch access). Accepted — the panning waveform is already pointer-gesture-only, and the minimap canvas carries its own `aria-label`.
- Alternative — a full-size `opacity-0` input over the canvas: rejected; it would swallow the pointer events the canvas needs for drag-seek.

### Grouped adjustments box with a fixed label column

Wrap the speed, balance, and mono controls in one `rounded-lg border border-[var(--border)] p-3 flex flex-col gap-3` container. Each row becomes `flex items-center gap-3` with a leading `<span class="w-16 shrink-0 text-sm text-[var(--text-muted)]">` label ("Speed", "Balance", "Mono"). Mono's checkbox moves next to its label column instead of carrying its own inline text.

### Remove the speed `<select>`

Delete the `<select>`; between the steppers put `<span class="w-12 text-center tabular-nums">{speed}x</span>`. `SPEED_OPTIONS`, `getAdjacentSpeed`, `handleSpeedStep`, and `handleSpeedChange` are unchanged — `speed` is only ever set to a member of `SPEED_OPTIONS` (load sets `1`, steppers clamp to the list), so `indexOf` stays valid.

## Risks / Trade-offs

- [Per-frame minimap style writes add work to the rAF loop] → It is a handful of `style.left` / `style.width` assignments per frame on top of the pan the loop already does; negligible.
- [Low horizontal resolution for long tracks — the whole track in one screen width] → Acceptable by design; the minimap is an overview, the detail waveform remains the precision control.
- [Window-box math drifting from `panWaveformTo`] → Derive both from the same constants (`WAVEFORM_PX_PER_SEC`, viewport width ref) and the same clamp; if `panWaveformTo` changes, update both together.
- [`sr-only` range unreachable by pointer-only AT] → Documented above; consistent with the existing pointer-only waveform.

## Open Questions

- Exact minimap height and window-box styling (fill vs outline) — visual polish, safe to settle during implementation without affecting the specs or task breakdown.
