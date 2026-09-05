## Context

`PlayerPage.tsx` already loads a file into an `<audio>` element and, separately, builds a Web Audio graph (`ensureAudioGraph`) that taps a `MediaElementAudioSourceNode` for balance/mono routing. That graph streams from the `<audio>` element and never exposes raw PCM samples, so it can't supply waveform data on its own — computing peaks requires a second, independent decode of the same file.

`Tuner.tsx` already runs a `requestAnimationFrame` loop (`tick`) alongside an `AnalyserNode` for real-time pitch display; the waveform's pan-sync loop follows the same rAF pattern rather than introducing a new one.

The existing timeline slider (`PlayerPage.tsx:399-414`) and its `handleScrub` function are unchanged by this design — the waveform is an additional, independent scrub surface layered above it. See proposal.md - Why/What Changes for the product motivation.

## Goals / Non-Goals

**Goals:**
- Compute and cache mono peak data once per loaded file, independent of the playback graph.
- Pan the waveform smoothly (rAF-driven) under a playhead while playing, paused, or being scrubbed via the slider — centered through the bulk of the track, moving to the left/right edge near the track's start/end so no blank space is ever shown.
- Give the waveform its own pointer-drag scrub gesture that reuses the existing scrub/persist code path.
- Keep decode/peak computation off the critical path for playback readiness — file is playable immediately, waveform fills in when ready.

**Non-Goals:**
- No zoom control — a single fixed pixels-per-second constant.
- No stereo/multi-channel waveform rendering — mono downmix only.
- No changes to the persisted state shape in `src/cache/playerFile.ts` (position/balance/mono/speed) or to balance/mono/speed audio routing.
- No waveform rendering for formats `decodeAudioData` can't handle — falls back to no waveform, not an error state.

## Decisions

**Decode path: separate `decodeAudioData` pass, not reused from the playback graph.**
`MediaElementAudioSourceNode` (used for balance/mono) never exposes decoded samples. The only way to get PCM for peaks is to independently read the `File` as an `ArrayBuffer` and run `AudioContext.decodeAudioData` (or an `OfflineAudioContext`) on a copy of it. This duplicates decode work the browser does internally for `<audio>` playback, but there's no API to intercept that internal decode, so a second explicit decode is unavoidable. Alternative considered: Web Audio's `AnalyserNode` on the live graph — rejected because it only exposes the current playback moment, not the whole-track peaks needed for a scrollable waveform.

**Peak computation: downsample to a fixed-resolution bucket array immediately after decode, discard the raw buffer.**
A decoded 6-minute stereo 44.1kHz buffer is tens of MB; keeping it around is unnecessary once peaks are extracted. Peaks are computed at the same resolution as the fixed `WAVEFORM_PX_PER_SEC` used for rendering (min/max per bucket, downmixed by averaging channels first), then the `AudioBuffer` reference is dropped so it can be garbage collected.

**Decode runs off the playability critical path.**
Decode/bucketing kicks off asynchronously right after `loadFile` sets up the `<audio>` element, but does not block `audio.load()`, play/pause, or the timeline slider. A placeholder occupies the waveform's space until peaks resolve. This matches the existing restore-on-mount flow (`getStoredPlayerFile`) — decode runs there too, on the restored `File`.

**Pan sync: `requestAnimationFrame` reading `audio.currentTime` directly, not React state / `timeupdate`.**
`timeupdate` fires too sparsely (~4Hz) for visibly smooth panning at the target px/sec rate. Following `Tuner.tsx`'s existing `tick`-loop pattern, an rAF callback reads `audioRef.current.currentTime` each frame and applies a CSS transform directly to the waveform canvas (plus the playhead position, see the rendering decision below), avoiding a React re-render per frame. The loop runs whenever the waveform is mounted and not being actively dragged; it doesn't need to be gated to `isPlaying` since it's cheap to leave running while paused (transform stays put) and this avoids the extra edge cases of pausing/resuming the rAF loop on every play/pause toggle — the only pause it needs is during a drag (below).

**Drag-to-scrub: pointer events on the waveform, suspend rAF pan-sync while dragging, converge on the same scrub path as the slider.**
`pointerdown` on the waveform starts a drag: the rAF pan-sync loop stops reading `currentTime` (so it doesn't fight the drag), pointer position maps to a time offset via the fixed px/sec constant, and each `pointermove` calls the same function the slider's `onChange` calls today (updates `audio.currentTime`, `currentTime` state, and the debounced persist) so both controls stay backed by one source of truth. `pointerup` ends the drag and lets the rAF loop resume reading `currentTime` normally (which, since the drag already updated `audio.currentTime`, picks up exactly where the drag left off with no jump).

**Tap vs. drag disambiguation: movement threshold decides the gesture; dragging never itself starts or stops playback.**
`pointerdown` only records the start pointer position and playback time — it touches nothing else. `pointermove` compares against the start position; once movement exceeds `TAP_MAX_MOVEMENT_PX`, the gesture is confirmed as a drag (suspends the rAF pan-sync loop, begins calling the same scrub function the slider uses). `pointerup` before that threshold is a tap and calls the existing `togglePlay()` unchanged; a confirmed drag simply ends (no play-state change of any kind — the element's native behavior already covers both cases correctly: setting `currentTime` on a paused element stays silently paused, and on a playing element keeps playing at the new position).

This design tried an intermediate version that made a paused drag audible — playing eagerly on `pointerdown` and restoring the prior play state on release — but that produced audio judged not to sound good in practice (audio starting/stopping and jumping to arbitrary drag positions in quick succession creates jarring, chopped-up bursts rather than a smooth scrub sound) and was removed. The `TAP_MAX_MOVEMENT_PX` gesture-classification mechanism it needed stays, since it's independently useful for tap-to-toggle, but no code path now calls `play()`/`pause()` from inside the drag handlers themselves — only `togglePlay()` (tap) and the audio element's own default seek behavior (drag) touch play state.

**Rendering and pan: full-track canvas drawn once, panned via CSS transform with a clamped offset so the playhead itself moves to the track's edges instead of leaving blank space.**
A canvas sized to the full track width (duration × `WAVEFORM_PX_PER_SEC`, e.g. ~14.4k px for 6 minutes) is drawn once when peaks are ready, then panned by translating it inside a fixed-width, `overflow: hidden` viewport — this avoids per-frame redraw of the waveform shape itself, only the transform changes each frame. Alternative considered for the canvas itself: redraw only the visible slice each frame — rejected as unnecessary complexity given a full-track canvas at this resolution is a small, one-time cost (a few MB) well within what a canvas element handles comfortably.

The naive pan formula (`viewportWidth/2 - time*pxPerSec`, playhead fixed at center) shows blank space past the canvas's actual edges whenever the track is within half a viewport-width of its start or end — for the first/last few seconds of any track, more so for a short one. Instead, the canvas offset is clamped to `[viewportWidth - canvasWidth, 0]` (or centered as a single static value if the whole track is narrower than the viewport), and the playhead — no longer a static centered CSS element, now positioned imperatively each frame alongside the canvas transform — is drawn at `offset + time*pxPerSec` (clamped to the viewport bounds), which reduces to the viewport's horizontal center during the unclamped middle of the track and slides to the left/right edge exactly as the offset clamp engages, matching the track's real start/end. This keeps the canvas always full of real waveform pixels and keeps the playhead visually accurate to the underlying content at every position, including the edges.

## Risks / Trade-offs

- **[Risk] Decoding a very long or unusually large recording could take noticeably longer than the ~2s target, leaving the placeholder up longer.** → Mitigation: decode is already async and non-blocking for playback; a slow decode degrades to "waveform shows up late," not a broken player. No hard timeout is added — silent placeholder persistence is an acceptable degradation per the spec's "computation fails silently" scenario if it errors outright.
- **[Risk] `decodeAudioData` can fail or be unsupported for some file/codec combinations the `<audio>` element itself can still play.** → Mitigation: wrap decode in a try/catch; on failure, skip the waveform entirely and leave the rest of the player (slider, transport) fully functional, per spec.
- **[Risk] Duplicate decode work (browser's internal `<audio>` decode plus this explicit one) costs extra CPU/battery on long files.** → Mitigation: accepted trade-off — it's a one-time cost per file load, not per frame, and there's no browser API to avoid it.
- **[Risk] rAF loop running continuously (even while paused) is mildly wasteful.** → Mitigation: negligible cost (a transform no-op each frame); simplicity of not gating start/stop to every play/pause/drag transition outweighs the marginal battery cost.
- **[Risk] A fixed `TAP_MAX_MOVEMENT_PX` threshold could misclassify a shaky/imprecise tap as a drag (unintentional micro-scrub) or a very deliberate short drag as a tap (unintentional toggle).** → Mitigation: pick a threshold in line with typical touch-target tolerance (a handful of pixels, similar in spirit to the existing `DOUBLE_TAP_MS` constant's role for the balance slider's double-tap); tune by hand during manual verification (task 5.5) rather than over-engineering it up front.
- **[Risk] A silent drag while paused gives no audio feedback about where in the track a position lands — the user is relying on the waveform shape and slider label alone.** → Accepted: this is the deliberate trade-off of removing the audible-drag attempt (see the tap/drag decision above) in favor of a scrub that actually sounds good; revisiting audible scrub (e.g. with a dedicated short-buffer scrub technique instead of repeated `currentTime` jumps) is left for a future change if wanted.

## Open Questions

None — the exploration session resolved the fork points (panning vs. static, slider retained, independent waveform drag, mono downmix, no zoom) before this design was written.
