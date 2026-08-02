## 1. Shared audio engine

- [x] 1.1 In `src/Tuner.tsx`, replace the per-tap `new AudioContext()` in `handlePlayStart`/`handlePlayStop` with a single `AudioContext` ref created lazily on the first active gesture and closed when the gesture map becomes empty.
- [x] 1.2 Add a `Map<number, { noteIdx: number; osc: OscillatorNode; gain: GainNode }>` ref (keyed by `pointerId`) to track each concurrent gesture's own oscillator/gain pair within the shared context.
- [x] 1.3 On a gesture's first press, create and start that pointer's oscillator/gain pair at the pressed note's frequency; on that gesture's release, stop and disconnect only its own pair, leaving other concurrent gestures untouched.
- [x] 1.4 When a tracked pointer's computed note changes, set `osc.frequency.value` directly (no ramp) on that pointer's existing oscillator, rather than stopping/restarting it.

## 2. Angle-based hit detection and gesture tracking

- [x] 2.1 Add an angle-from-center helper (inverse of the existing `toXY`) that maps an SVG-space point to a wedge index, independent of distance from center.
- [x] 2.2 Replace the singleton `playRef`/`playingNoteIdx` in `PitchWheel` with a `Map<pointerId, gesture>`-shaped ref plus a `Set<number>` of currently-active note indices for rendering.
- [x] 2.3 Keep gesture start gated on `pointerdown` landing on a wedge hit target (unchanged entry point); wire `onPointerMove` on the captured element to recompute the angle-based note index for that `pointerId` on every move, regardless of radius.
- [x] 2.4 When a tracked pointer's computed note index changes (including a value it already visited earlier in the same gesture), update that pointer's entry and drive the legato-step frequency snap from Task 1.4.
- [x] 2.5 On `pointerup`/`pointercancel`, remove that pointer's entry from the gesture map and stop its oscillator, without affecting other pointers' entries.

## 3. Mic pause reference counting

- [x] 3.1 Replace the boolean `pausedRef` with a check against the gesture map's size (paused iff non-empty), so the mic analysis loop only resumes once every concurrent gesture has ended.

## 4. Visual state and rendering

- [x] 4.1 Update wedge rendering in `PitchWheel` to treat "active" as membership in the `Set<number>` of currently-sounding notes (Task 2.2) rather than equality with a single `playingNoteIdx`.
- [x] 4.2 Remove the idle "tap to play" hint text and any held-state hint branching from the center face rendering, per the `tuner-pitch-wheel` spec's new "no hint text" requirement.

## 5. Accessible labels

- [x] 5.1 Update each wedge's `aria-label` to mention both tapping to play and dragging across the ring to play other notes.

## 6. Verification

- [x] 6.1 Run `bun run build` and confirm it succeeds with no type errors.
- [x] 6.2 Run `bun run lint` and confirm no new errors.
- [x] 6.3 Manually verify via `bun run dev`: single-finger tap still plays one note; single-finger glide across several wedges produces one continuous tone whose pitch snaps at each boundary; gliding back into an earlier wedge re-sounds it; two simultaneous pointers each glide/hold independently without affecting each other; mic pause only resumes after the last of several concurrent gestures ends; the center face shows no hint text in any state.
