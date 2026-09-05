## Why

The player's timeline is a bare range slider with no sense of the recording's shape, making it hard to spot a phrase, breath, or section by eye.
A panning waveform above the slider gives that visual landmark and adds a second, finer scrub gesture for nudging position while listening, without disturbing the slider's existing role as the coarse jump-anywhere control.

## What Changes

- Add a panning waveform display above the timeline slider on the Practice Player screen.
- The waveform pans under a fixed center playhead as the file plays, driven by `requestAnimationFrame` for smooth motion.
- Waveform peaks are computed once per loaded file: decode the file via `decodeAudioData`, downmix to mono, and bucket into peaks at a fixed pixels-per-second resolution; the peaks array is cached and the raw decoded buffer is discarded.
- While peaks are being computed, the waveform area shows a lightweight "analyzing" placeholder; playback, the existing slider, and transport controls remain usable immediately and are not blocked on decode.
- The waveform supports its own drag-to-scrub gesture (pointer events), independent of the slider, for fine live scrubbing while watching/hearing the waveform move. Dragging routes through the same scrub handling the slider already uses, so persisted state stays single-sourced.
- The existing timeline slider is unchanged — it remains the full-track, coarse, jump-anywhere control.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `practice-audio-player`: adds a waveform display and its own drag-to-scrub interaction alongside the existing timeline slider requirement.

## Impact

- `src/PlayerPage.tsx`: new waveform component/section, peak computation and caching, pointer-drag scrub handling, `requestAnimationFrame`-driven pan sync.
- No changes to `src/cache/playerFile.ts` persistence shape (position/balance/mono/speed fields are unaffected) or to the balance/mono/speed Web Audio graph in `ensureAudioGraph`.
- No changes outside the Practice Player screen.
