## Why

The tuner's pitch wheel only supports tapping one wedge at a time to hear its tone.
Barbershop tuning is fundamentally about hearing intervals and chords, not isolated notes, and the wheel's own drag surface has been free since the drag-to-set-key gesture was replaced by the key-picker dropdown.
Turning the ring into a playable, glideable, multi-touch surface lets a user sweep through a scale or hold several fingers down to check a chord, without adding any new widget.

## What Changes

- Add a glide gesture: after pressing inside a wedge, moving the pointer around the ring changes which note sounds as each 30° wedge boundary is crossed, quantized to the 12 chromatic wedges (no continuous pitch bend).
- Note transitions during a glide are legato-step: one continuous oscillator per gesture whose frequency snaps at each crossing, rather than a fresh attack per note.
- Re-entering a previously-visited wedge during the same glide re-triggers that note the same as any new crossing (no de-dup by note identity).
- Hit detection during a glide is angle-only: a pointer's current note is derived purely from its angle around the center, independent of how close it is to the inner or outer edge of the ring (including the center face and just outside the outer edge).
- **BREAKING**: Support multiple simultaneous, independent gestures (multi-touch) — each active pointer gets its own tracked wedge and its own oscillator, with no cap on concurrent voices, so several notes/a chord can sound at once.
- Replace the current per-tap `new AudioContext()` pattern with a single `AudioContext` shared for the `Tuner` instance's lifetime, holding one oscillator/gain pair per currently active pointer.
- Mic pause/resume around wheel playback is reference-counted across concurrent gestures, so one finger releasing does not resume mic analysis while another finger is still holding a note.
- Remove the idle "tap to play" hint text from the wheel's center face entirely (not just while a wedge is held).

## Capabilities

### New Capabilities
- `tuner-glide-play`: The glide/multi-touch gesture model for playing notes on the pitch wheel — angle-based hit detection, legato-step note transitions, retrigger-on-reentry, and unbounded concurrent voices with a shared audio engine.

### Modified Capabilities
- `tuner-pitch-wheel`: The wedge accessible-label requirement ("tap-to-play only, no mention of dragging") and the idle/held hint requirements need to change now that dragging is a real gesture and the idle hint is removed entirely. The "active" wedge-color tier must also support multiple wedges lit simultaneously instead of a single `playingNoteIdx`.

## Impact

- `src/Tuner.tsx`: `PitchWheel`'s pointer-event handlers (hit detection, gesture state, active-wedge rendering) and `Tuner`'s audio playback (`handlePlayStart`/`handlePlayStop`, `AudioContext` lifecycle, `pausedRef`) are rewritten.
- No new dependencies; still native Pointer Events and Web Audio API.
- `openspec/specs/tuner-pitch-wheel/spec.md`: requirements on wedge accessible labels and idle/held hints are superseded.
