## Why

The player screen has two position controls that look equally prominent but behave differently: the detail waveform scrubs by relative pointer movement (only reaches as far as a finger can travel across the visible window), while the timeline slider is the only way to jump anywhere in the track.
Nothing communicates that split, so reaching a distant part of a long recording is confusing.
The playback-adjustment controls (speed, balance, mono) are also a loose vertical pile with inconsistent alignment, and the speed control carries both a dropdown and stepper buttons that do the same job.

## What Changes

- Replace the plain timeline range slider with a **full-track minimap scrubber**: a small full-width canvas that renders the whole track's already-computed waveform peaks, where tapping or dragging anywhere seeks to that absolute position.
- The minimap shows a **window box** marking the slice the detail waveform is currently panned to, plus a **playhead** at the current position.
- Add a visually-hidden `<input type="range">` layered over the minimap so keyboard and assistive-technology users can still seek (a canvas is not focusable).
- Group the **speed, balance, and mono** controls into one bordered/tinted box with a fixed-width label column so the rows align.
- **Remove the playback-speed dropdown.** Keep the decrease/increase stepper buttons, with the current speed shown as a fixed-width readout between them.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `practice-audio-player`: the "scrubbable timeline" in **Playback transport controls** becomes a full-track minimap scrubber (absolute-position seek, window box, playhead, keyboard/AT range input); **Playback speed control** drops the dropdown and keeps only the stepper buttons plus a speed readout; **Waveform drag-to-scrub** scenario wording that refers to "the timeline slider" is updated to the minimap.

## Impact

- `src/PlayerPage.tsx` — only file touched. Replaces the `<input type="range">` timeline block with the minimap (new canvas + overlay range + window-box/playhead elements and their pointer handlers), wraps the speed/balance/mono JSX in a grouped container, and removes the `<select>` from the speed control.
- No changes to `src/cache/playerFile.ts`, the audio graph, or persisted state.
- Reuses the existing `waveformPeaks` / `bucketWaveformPeaks` output — no new audio decoding.
