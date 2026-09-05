## 1. Peak computation

- [x] 1.1 Add a function that takes the loaded `File`, reads it as an `ArrayBuffer`, and runs `decodeAudioData` to get an `AudioBuffer`.
- [x] 1.2 Downmix the decoded channels to mono (average per-sample across channels).
- [x] 1.3 Bucket the mono samples into a peaks array (min/max per bucket) at a fixed `WAVEFORM_PX_PER_SEC` resolution constant.
- [x] 1.4 Discard the decoded `AudioBuffer` reference after bucketing so it can be garbage collected; keep only the peaks array.
- [x] 1.5 Wrap decode/bucketing in a try/catch; on failure, leave the waveform unset with no error surfaced to the user.
- [x] 1.6 Kick off peak computation asynchronously from `loadFile` (both the file-picker/drop path and the restore-on-mount path), without blocking `audio.load()` or making playback/slider wait on it.

## 2. Waveform rendering

- [x] 2.1 Add a waveform section above the timeline slider in `PlayerPage.tsx`, showing a lightweight placeholder while peaks for the current file are not yet ready.
- [x] 2.2 Once peaks are ready, draw the full-track waveform once to a canvas (or equivalent) sized to duration × `WAVEFORM_PX_PER_SEC`, inside a fixed-width `overflow: hidden` viewport with a playhead marker.
- [x] 2.3 Clear/reset the waveform (back to placeholder) when a new file is loaded, matching the existing reset-on-load behavior for balance/mono/speed.

## 3. Pan sync

- [x] 3.1 Add a `requestAnimationFrame` loop (mirroring `Tuner.tsx`'s `tick` pattern) that reads `audioRef.current.currentTime` each frame and applies a CSS transform to pan the waveform under the playhead.
- [x] 3.2 Ensure the loop runs while the waveform is mounted and not actively being dragged, and correctly reflects position whether the file is playing, paused, or was just scrubbed via the slider.
- [x] 3.3 Clamp the canvas pan offset to the track's actual start/end (instead of the naive always-centered formula), and move the playhead marker itself — not just the canvas — so it sits at the left edge at time 0, tracks center through the middle of the track, and sits at the right edge at the end, with no blank space ever shown past the track's real content.

## 4. Waveform tap-to-toggle and drag-to-scrub

- [x] 4.1 Add a `TAP_MAX_MOVEMENT_PX` constant and pointer event handlers (`pointerdown`/`pointermove`/`pointerup`) on the waveform viewport.
- [x] 4.2 On `pointerdown`, record the start pointer position and playback time; do not touch playback.
- [x] 4.3 On `pointermove`, once movement from the start position exceeds `TAP_MAX_MOVEMENT_PX` and the gesture isn't already a confirmed drag, promote it to a drag: suspend the rAF pan-sync loop's reading of `currentTime`.
- [x] 4.4 On `pointermove` while in a confirmed drag, convert pointer movement to a time offset via `WAVEFORM_PX_PER_SEC` and call the same scrub function the timeline slider uses (updating `audio.currentTime`, `currentTime` state, and the debounced persist) — no play/pause calls; a paused file stays silently paused, a playing file keeps playing at the new position, matching the audio element's native behavior.
- [x] 4.5 On `pointerup`: if a drag was confirmed, just end it (resume the rAF pan-sync loop, no play-state change); if it never crossed the tap threshold (a tap), call the existing `togglePlay()`.
- [x] 4.6 ~~Audible playback during a paused drag~~ — implemented, tried, and removed: eagerly starting playback on `pointerdown` and repeatedly jumping `currentTime` on every `pointermove` produced jarring, chopped-up audio rather than a smooth scrub sound. Left for a possible future change with a dedicated scrub-audio technique; out of scope here.

## 5. Verification

- [ ] 5.1 Manually test with a short file and a ~6 minute file: confirm placeholder shows during decode, waveform appears, playback/slider remain usable throughout.
- [ ] 5.2 Manually test panning during playback for smoothness, and confirm slider-driven scrubs (both directions, including to the very start/end) reposition the waveform correctly; confirm the playhead visibly moves to the left edge at the very start and the right edge at the very end, with no blank space shown past the track's real content, and sits centered everywhere in between.
- [ ] 5.3 Manually test waveform drag-to-scrub: live position updates during drag, correct position on release, no interference with the timeline slider's own behavior.
- [ ] 5.4 Manually test that dragging is silent while paused (no audio, stays paused after) and continues playing audibly at the new position when dragging while already playing.
- [ ] 5.5 Manually test tapping the waveform: toggles play/pause from the current position with no position change, in both starting states (paused and playing); confirm a deliberate small drag still scrubs rather than toggling, and tune `TAP_MAX_MOVEMENT_PX` if the two feel like they conflict.
- [ ] 5.6 Manually test loading a second file over a first: waveform resets to placeholder and reflects the new file; loading a file `decodeAudioData` can't handle degrades to no waveform with the rest of the player unaffected.
- [x] 5.7 Run `bun run lint` and `bun run build`.
