## Context

`PitchWheel` in `src/Tuner.tsx` currently supports only tap-and-hold: `onPointerDown` on a wedge's `<path>` calls `setPointerCapture` on that specific element, and `onPointerUp`/`onPointerCancel` stop the tone. There is no `onPointerMove` handling. Because the pointer is captured to the originating element, dragging across other wedges today has no effect — the first wedge keeps sounding until release, regardless of where the pointer ends up.

Each tap also creates a brand-new `AudioContext` in `handlePlayStart` and tears it down in `handlePlayStop`. This is adequate for one deliberate tap but does not extend to a rapid multi-note glide or to multiple concurrent pointers.

The wheel's previous drag gesture (drag-to-center to set the reference key) was removed in favor of the `KeyPicker` dropdown, which is what makes the ring's whole surface available for a new gesture without a conflict.

## Goals / Non-Goals

**Goals:**
- Let a single pointer glide across wedges and sound each one it crosses, quantized to the 12 chromatic positions.
- Let multiple pointers do this independently and concurrently (multi-touch chords).
- Replace the per-tap `AudioContext` pattern with an engine that scales to concurrent, rapidly-changing voices.

**Non-Goals:**
- No keyboard/non-pointer equivalent for this gesture (matches today's tap-to-play, which is also pointer-only).
- No change to the mic pitch-detection/JI-offset logic, needle rendering, or wheel geometry constants.
- No anti-click gain envelope shaping beyond what exists today — note on/off remains an instant gain step, matching current tap-to-play behavior.
- No cap on concurrent voices and no radius-based gating of the glide (both decided in favor of the simpler option during exploration).

## Decisions

**Angle-only hit detection, computed independently of the native element under the pointer.**
Because `setPointerCapture` locks subsequent events to the element that received `pointerdown`, we cannot rely on entering a different wedge's `<path>` to fire a new `onPointerDown`. Instead, on every `pointermove` for a captured pointer, convert its coordinates to the wheel's SVG space (as `toSvgPoint` already does) and compute `atan2` from center to get an angle, then `noteIdx = Math.round(angle / 30) % 12` — the same 30°-per-wedge convention `segmentArc`/`toXY` already use. This is deliberately radius-independent: whether the pointer is near the inner edge, mid-ring, past the outer edge, or over the center face, only its angle determines the current note. A gesture may only *start* via `pointerdown` on a wedge's hit target (unchanged from today); once started, movement is angle-only with no radius gating.

**Per-gesture state keyed by `pointerId`, not a singleton ref.**
Today's `playRef`/`playingNoteIdx` (a single object / `number | null`) is replaced by a `Map<pointerId, { noteIdx, osc, gain }>`-shaped ref, so concurrent pointers don't overwrite each other's state. The wedge "active" highlight becomes derived from the set of currently-tracked `noteIdx` values across that map (rendered as a `Set<number>`) instead of one `playingNoteIdx`.

**Legato-step audio: one oscillator per gesture, frequency snapped (not ramped) on each crossing.**
When a tracked pointer's computed `noteIdx` changes (including re-entering a previously-visited wedge — no de-dup by note identity), the existing oscillator for that `pointerId` has `osc.frequency.value` set directly to the new note's frequency. No `linearRampToValueAtTime`/portamento — the "quantized, not continuous" requirement means the tone jumps discretely between the 12 chromatic frequencies, while remaining a single continuous sound (no re-attack) for the duration of one finger's gesture.

**One shared, lazily-created `AudioContext` for the `Tuner` instance's playback lifetime, holding one oscillator/gain pair per active pointer.**
Replaces per-tap `new AudioContext()`. The context is created on the first pointer's `pointerdown` and closed when the last active gesture ends (mirroring how the mic's `AudioContext` already persists across `active`). Each concurrent pointer gets its own `OscillatorNode`/`GainNode` pair within that shared context, started on that pointer's `pointerdown` and stopped on its `pointerup`/`pointercancel`, independent of other pointers' oscillators.

**Mic pause is reference-counted, not a single boolean.**
`pausedRef` becomes derived from "the gesture map is non-empty" rather than being flipped true/false by whichever single gesture starts or ends. This prevents one finger lifting from resuming mic analysis while another finger is still holding a note.

**Idle hint removed unconditionally.**
The center face shows no hint text whether idle or mid-gesture — simpler than today's "hint when idle, no hint when held" split, since there's no longer a single gesture state to key the hint off of.

## Risks / Trade-offs

- **[Risk]** Angle computed every `pointermove` could jitter across a 30° boundary near-instantaneously if a finger trembles exactly on a boundary line → **Mitigation**: none added by design (explicitly out of scope per the radius-gating decision); acceptable because a boundary-line trace is a deliberate, unlikely gesture, and the retrigger-on-reentry behavior means a jitter just re-sounds the same note rather than corrupting state.
- **[Risk]** Unbounded concurrent voices means a device reporting many simultaneous pointers (e.g. an accidental palm touch) could spawn many oscillators at once → **Mitigation**: none added by design (explicitly chosen over a cap); each oscillator is cheap and torn down on release, so the worst case is a brief unintended chord, not a resource leak.
- **[Risk]** Sharing one `AudioContext` across concurrent gestures means closing it must wait until the *last* gesture ends, not the first → **Mitigation**: gate context teardown on the gesture map becoming empty, mirroring the mic-pause ref-counting decision above.

## Migration Plan

Single-PR code change confined to `src/Tuner.tsx` (per the project's "no tests" constraint, verified via `bun run build`, `bun run lint`, and a manual checklist covering single-finger glide, multi-finger chords, and mic pause/resume interplay). No persisted data or schema is touched, so rollback is a plain revert.

## Open Questions

None outstanding — the exploration prior to this proposal resolved the open forks (legato-step vs. retrigger, voice cap vs. unbounded, angle-only vs. radius-gated).
