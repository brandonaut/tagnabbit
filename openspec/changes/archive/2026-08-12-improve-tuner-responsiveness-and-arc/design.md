## Context

All tuner behavior lives in `src/Tuner.tsx`.
A `requestAnimationFrame` loop reads 2048 samples from an `AnalyserNode`, runs a hand-rolled autocorrelation, smooths the result, and drives a rotating needle on an SVG pitch wheel.

The reported symptoms are that the display trails the voice and sometimes freezes on a stale note.
Measuring the pipeline stage by stage shows the smoothing filter is responsible for roughly an order of magnitude more delay than everything else combined:

| Stage | Current lag | Source |
|---|---|---|
| 2048-sample window at 48 kHz | ~21 ms (mean of a 43 ms window) | `analyser.fftSize = 2048` |
| 80 ms frame throttle (~12 fps) | 0–80 ms, ~40 ms average | `tick` throttle |
| `autoCorrelate` compute | 5–15 ms on a phone | O(n²) over the full buffer |
| **EMA, α=0.25 at 12 fps** | **277 ms to 63%, 833 ms to 95%** | `smoothedFreqRef` |
| Two-frame note-name confirmation | +80 ms, and see below | `pendingFramesRef` |
| CSS `transform` transition | +80 ms | needle `<g>` style |

The freezing has three independent causes, only one of which is the EMA's speed.

First, the two-frame confirmation resets its counter on every frame in which the detected note differs from the previous frame's.
During any pitch change the EMA is gliding, so the note differs every frame, the counter never reaches two, and `setPitch` falls back to `prev?.note`.
The displayed name stays pinned to the old note for the entire glide while the cents readout swings wildly:

```
sing C ────────── jump to D ─────────────────────────▶
raw note:   C  C  C │ D  D  D  D  D  D  D  D  D  D
EMA note:   C  C  C │ C  C# C# D  D  D  D  D  D
pending:    3  4  5 │ 1  1  1  1  2  3  4  5  6      ← resets every frame
DISPLAYED:  C  C  C │ C  C  C  C  D  D  D  D  D      ← frozen ~350 ms
```

Second, the silence hold is 1500 ms, so the display sits frozen for a second and a half after the voice stops.
`smoothedFreqRef` is only reset when that timer fires, so a pause shorter than 1500 ms leaves the EMA anchored to the previous pitch and the next note glides in from wherever the last one ended.

Third, the autocorrelation is unnormalized.
`c[i]` sums only `j < SIZE - i` terms without dividing by that count, so a candidate at lag 740 (65 Hz) is scaled by 0.64 while its octave-up candidate at lag 370 is scaled by 0.82.
Any voice whose second harmonic is within about 78% of its fundamental's peak gets reported an octave high.

A fourth issue is not a lag but pure waste: `c` is computed for every lag from 0 to `SIZE`, then only the range `[minLag, maxLag]` is searched.

Finally, `getUserMedia({ audio: true })` accepts the browser defaults, which enable auto gain control, noise suppression, and echo cancellation.
All three are tuned for speech and are hostile to sustained-tone pitch detection.

On the visual side, the needle is a line and dot at r 30–40 rotating about the wheel's center.
It communicates direction but gives the eye nothing to judge alignment against, so "in tune" reads as a guess.

### The just-intonation mapping is broken

Just-intonation mode redefines each wedge's center to be that scale degree's just target, but leaves the wedge at 30° and the pitch-to-angle rate at a fixed 0.3°/cent.
Each wedge's mapping is therefore shifted independently by `−offset × 0.3°`, which makes the wheel twelve disconnected mappings rather than one function.

Just targets in the key of C, with the gap between consecutive targets:

```
C    C#     D     D#    E     F     F#    G     G#    A     A#     B     C
0  111.7 203.9 315.6 386.3 498.0 590.2 702.0 813.7 884.4 1017.6 1088.3 1200
 └111.7┘└92.2┘└111.7┘└70.7┘└111.7┘└92.2┘└111.7┘└111.7┘└70.7┘└133.2┘└70.7┘└111.7┘
```

Every gap is allotted 30° regardless of its size, and the gaps span 70.7¢ to 133.2¢ — a 1.9× spread.
The surplus or shortfall, `(100 − gap)` cents' worth, has to go somewhere, and surfaces as one of two artifacts.

**Gaps under 100¢ produce a tear.** At the D♯/E boundary (gap 70.7¢), a pitch at 350¢ above C maps to 100.32° if read as D♯ (+50¢ ET, offset +15.6) and to 109.11° if read as E (−50¢ ET, offset −13.7).
An 8.8° discontinuity, repeated at G♯/A and A♯/B.

**Gaps over 100¢ produce a dead zone.** At A/A♯ (gap 133.2¢) both sides hit the ±50¢ clamp before reaching the boundary: A pins from ET +34.4¢ and A♯ stays pinned until ET −32.4¢, so the arc sits motionless at 285° across 33.2 cents of pitch change.

The same clamp interaction also makes parts of some wedges unreachable.
A♯ in the key of C has `displayCents` capped at 50 − 17.6 = 32.4, so its arc tops out at 309.7° against a boundary at 315°.

None of this is visible with a thin needle and nothing to align against.
With a wedge-width arc whose entire purpose is flush alignment, it is not tolerable.

## Goals / Non-Goals

**Goals:**

- Cut end-to-end latency from roughly 1 s to settle to under 200 ms.
- Eliminate the three distinct freezing behaviors.
- Fix the octave-high bias and the wasted correlation work.
- Replace the needle with an indicator whose correctness is judged by fit rather than by position.
- Do all of the above without raising CPU cost above what the tuner already uses.

**Non-Goals:**

- No `AudioWorklet`.
  Analysis stays on the main thread.
- No FFT-based autocorrelation.
  Decimation plus a restricted lag range gets the cost low enough without the extra code.
- No change to the just-intonation offset table or the accuracy color thresholds.
- No resizing of wedges in just-intonation mode.
  The wheel stays 12 uniform 30° wedges in both modes; see the mapping decision below.
- No deliberate expansion of the near-zero region for readability.
  Coarse-but-honest geometry was chosen deliberately; color carries the fine range.
  The mapping does acquire a mild nonlinearity in just-intonation mode, but as a consequence of correctness, not as a readability device.
- No attempt to make just-intonation targets chord-relative rather than key-relative.
  Barbershop tuning is really relative to the current chord root, and using the song key as a proxy is an approximation with a larger error than anything addressed here — but it is the existing behavior and is out of scope.
- No tests.
  This project has none, and this change does not introduce a test harness.

## Decisions

### Capture unprocessed audio

Pass explicit constraints:

```
audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false }
```

These are advisory — browsers may ignore them — so nothing downstream may assume they took effect.

Disabling echo cancellation means the glide-play tone is no longer subtracted from the mic signal.
This is already handled: the `tick` loop skips analysis entirely while any gesture is active, and resumes only once the last one releases.

### Normalize the autocorrelation, and only compute lags that will be searched

Compute the correlation only over `[minLag, maxLag]` instead of the full buffer.
The initial-valley scan (`while (d < SIZE - 1 && c[d] > c[d + 1]) d++`) exists to skip the lag-0 peak; with the search already restricted to `minLag` it is redundant and can go.

**Correction, found during implementation.** The plan was to divide each `c[i]` by its term count `(SIZE - i)`, removing the taper that favors short lags.
That is necessary but not sufficient, and shipping it alone is worse than the status quo.
The taper was doing two jobs: it biased against the true fundamental in favor of the octave above it (the defect), *and* it suppressed subharmonics (load-bearing).
Once every integer multiple of the true period scores equally, a plain argmax lands on an arbitrary one — a synthetic sweep had 440 Hz reading as 110 Hz and 1047 Hz as 80 Hz.

The correct fix is the standard pair, both halves required:

1. **NSDF** (McLeod's normalized square difference) rather than a term-count divide: `n(τ) = 2·r(τ) / m(τ)`, where `m(τ)` sums `x[j]² + x[j+τ]²` over the overlap.
   Bounded to `[-1, 1]`, 1 at perfect periodicity, and amplitude-invariant, so peak heights are comparable across lags *and* across input levels.
   `m(τ)` comes from a prefix-sum array, so the denominator costs one subtraction rather than a second inner loop.
2. **First peak within `PEAK_RATIO` of the tallest**, not the tallest outright.
   This is what actually rejects subharmonics, since they are never the *first* strong peak.

The clarity gate then reads the NSDF value at the chosen peak directly, so no separate unnormalized `c[0]` is needed — the RMS floor uses the same prefix-sum array's total.

A peak sitting on the first or last searched lag has no neighbour to be compared against, so the local-maximum test cannot see it.
The search therefore runs `LAG_MARGIN` lags past each end of the range; without that margin, both 65 Hz and 1050 Hz — the two endpoints of the stated range — are missed entirely.

### Two-stage pitch search: decimated coarse pass, full-rate refine

Naive 4× decimation is cheap but imprecise.
At 12 kHz a 1050 Hz fundamental has a period of only 11.4 samples, and parabolic interpolation on a peak that coarsely sampled carries a systematic bias of roughly 15¢ — unacceptable in a tuner.

So: search coarse, refine fine.

1. Decimate 48 kHz → 12 kHz with an 8-tap boxcar (computed as a running sum, so O(1) per output sample) taking every 4th sample.
   The 8-tap boxcar has a null at exactly 6 kHz, the new Nyquist, and stays below −13 dB across the rest of the stopband.
2. Coarse-search the decimated buffer over lags 11–185, covering 65–1050 Hz.
3. Map the winning lag back to the full-rate buffer and re-correlate over a narrow window of about ±16 full-rate samples around it, then parabolic-interpolate at full resolution.

Cost per frame:

| | Multiply-adds |
|---|---|
| Current: full `c`, all 2048 lags | ~2,100,000 |
| Decimation filter (running sum) | ~2,000 |
| Coarse search, 175 lags on 512 samples | ~72,000 |
| Full-rate refine, 33 lags on 2048 samples | ~68,000 |
| **New total** | **~142,000** |

Measured on a desktop after implementation, against the old function verbatim on identical input:

| | Per frame | At its own frame rate |
|---|---|---|
| Old, 12.5 fps | 14.93 ms | 187 ms/s |
| New, 66 fps | 0.29 ms | 19 ms/s |

52× cheaper per frame, and roughly a tenth the total CPU despite running five times as often.
The old function was blocking the main thread for 15 ms per frame on a desktop, which is most of a frame budget on its own — this is what makes it safe to keep the analysis on the main thread alongside the PDF viewer on `TagPage`.

*Alternative considered:* decimate by 2 only, with no refine stage.
Simpler, but only ~7× cheaper overall and still ~3¢ of interpolation bias at the top of the range.
The refine stage is roughly twenty lines and buys both precision and a further 2× — worth it.

### Smooth in cents, with a median prefilter and a jump-snap escape

Replace the single slow EMA on linear Hz with three cheap stages operating on cents:

```
raw Hz ─▶ to cents ─▶ median-of-3 ─▶ jump? ─▶ snap ────▶ smoothed cents
                                       │                      ▲
                                       └──▶ EMA α=0.4 ────────┘
```

- **Cents, not Hz.** A fixed α on linear frequency settles at a rate that depends on register.
- **Median-of-3** does the outlier rejection the heavy EMA was doing, at a cost of exactly one frame instead of hundreds of milliseconds.
- **EMA α=0.4 at 60 fps** gives ~32 ms to 63% and ~98 ms to 95%, against 277 ms and 833 ms today.
- **Jump-snap at 70¢**: if a reading is more than 70¢ from the smoothed value, overwrite the state instead of blending toward it.
  70¢ sits above the widest plausible vibrato and below a semitone, so intentional note changes snap while drift within a note still smooths.

### Boundary hysteresis instead of frame counting

Track which note is currently displayed and flip only when the smoothed pitch passes ±55¢ from it, 5¢ past the true midpoint.
This gives flicker resistance at the boundary with zero added latency, and it cannot get stuck the way the frame counter does, because it depends on the smoothed pitch's position rather than on frame-to-frame agreement.

A jump-snap bypasses hysteresis and re-seeds the displayed note to the nearest note of the new reading.

Hysteresis operates on **equal-tempered** cents, not on the just-intonation-adjusted display value.
Otherwise the note name would depend on the selected key, which is wrong.
The JI offset continues to affect only the displayed cents and the arc's angle, exactly as it does now.

### Silence: 300 ms hold, then reset

Shorten the hold from 1500 ms to 300 ms and reset the median and EMA state when it fires, so a note sung after a pause is picked up fresh rather than glided into from the previous pitch.

### Warp the mapping, do not resize the wedges

Three ways to resolve the just-intonation defect:

| | **A. Leave it** | **B. Warp the mapping** | **C. Resize wedges** |
|---|---|---|---|
| Wedge width | 30° uniform | 30° uniform | 21°–40°, varies with key |
| Continuous and monotonic | no | yes | yes |
| Flush means in tune | yes | yes | yes, if the arc inherits the wedge's shape |
| Hue matches wheel position | yes | yes | no |
| Geometry stable across keys | yes | yes | no |
| Angle linear in cents | within a wedge | no, 0.225–0.424°/¢ | globally |
| Dead zones, tears, unreachable arcs | yes | none | none |

**C** is the direct reading of the problem — size each wedge to the pitch territory it actually owns — and it is implementable, since the arc would inherit the detected wedge's asymmetric shape and translate by the deviation, preserving flush-at-zero.
It is rejected for two reasons.
The wedge hue rule is defined as `hue = noteIndex * 30` precisely so that a wedge's position on the wheel matches its position on the color wheel, and variable widths break that.
And the wheel doubles as a tap-and-glide pitch pipe, where stable landmarks matter; reshaping all 12 wedges on every key change is heavy churn to fix an artifact that only appears at wedge edges.

**B is chosen.** Keep the 12 wedges uniform and let the pitch-to-angle function absorb the uneven spacing — piecewise linear, one segment per gap, pinned so each just target lands exactly on its wedge center:

```
gapUp   = T[d+1] - T[d]
gapDown = T[d]   - T[d-1]

angleOffset = clamp(
  displayCents >= 0 ? 30 * displayCents / gapUp
                    : 30 * displayCents / gapDown,
  -15, +15)
```

In equal-temperament mode every gap is 100, so this collapses to exactly today's `cents / 50 * 15`.
Two extra lookups per frame.

The clamp point is now the midpoint between adjacent just targets, which is also the nearest-target boundary.
That is a strict improvement over the status quo, where the ±50¢ clamp and the note-name boundary sit at different pitches.

The cost is the one row in the table: 10¢ of error subtends 4.2° inside a narrow just interval and 2.3° inside a wide one.
Bounded at 1.9×, never inverting, and invisible in equal-temperament mode.

### Note selection follows the active temperament's targets

B forces a matching change to note selection.
If wedge edges move to just midpoints but the note name still flips at equal-tempered midpoints, there is a band where the arc pins against an edge while the label still names the previous note.

So in just-intonation mode the detected note becomes the nearest *just* target rather than the nearest equal-tempered pitch, and the ±55¢ hysteresis applies around that boundary.
This makes note names key-dependent in just-intonation mode, which sounds worse than it is: just midpoints sit between roughly 8¢ below and 6¢ above their equal-tempered counterparts, and that band is only reachable when the pitch is already near half a semitone out.

This supersedes the earlier decision to run hysteresis on equal-tempered cents.

### Arc geometry

New constants beside the existing `CX`/`CY`/`OUTER_R`/`INNER_R`; `NEEDLE_TIP_R` and `NEEDLE_BASE_R` are deleted.

```
ARC_INNER_R  = 33
ARC_OUTER_R  = 41      ← 1 unit clear of INNER_R = 42, forming the seam
DIVIDER_INNER_R = 32   ← dividers were INNER_R, now reach past the arc
```

```
        r=73 ─╮
   ╭──────────┴──────────╮
   │   ╲   C   │  C#   ╱ │   wedges  r 42-73
   │    ╲──────┼──────╱  │
   │  ═══╲▓▓▓▓▓│═════╱═══│ ← r=42 seam
   │      ╲▓▓▓▓│    ╱    │   arc     r 33-41
   │       ╲───┴───╱     │   dividers reach r=32
   ╰─────────────────────╯
```

The arc reuses the same angular math as `segmentArc`, spanning 30° centered on `noteIdx * 30 + angleOffset`, with `angleOffset` from the piecewise-linear mapping above.
Because the offset is clamped to ±15° and a wedge is 30°, the arc is exactly half off its wedge at the clamp and can never rotate clear of it.
The clamp is reached exactly at the midpoint to the neighboring target, which is the same pitch at which the note name flips, so the arc arrives at the wedge edge precisely as the wedge beneath it changes — that is what makes the motion continuous across boundaries in both modes.

**Z-order.** The arc element is inserted after the two inner-face circles and before the `NOTE_NAMES.map`, and the dividers inside that map get their inner radius changed from `INNER_R` to `DIVIDER_INNER_R`.
Document order then puts the dividers on top of the arc, which is the readable arrangement: in tune, each divider sits exactly on an arc edge; out of tune, a colored sliver crosses one divider and a gap opens at the other.
No other element occupies r 33–41, so nothing else in the map conflicts and the existing single-pass structure is preserved.
The arc gets `pointerEvents: "none"`; the wedge hit targets span r 42–73 and so never overlap it, but the guard is free.

**Fade-out.** The arc stays mounted and animates `opacity` between 1 and 0 over ~300 ms.
Its angle is held in a ref that only updates while a pitch is detected, so during the fade it holds its last position instead of snapping back to 0°.

**Rotation transition.** The needle's `transition: transform 0.08s` is reduced to roughly one frame or removed outright.
At 60 fps with the new filter it would only add lag re-smoothing something already smoothed.

### Projected latency

| Stage | Now | After |
|---|---|---|
| Analysis window | 21 ms | 21 ms |
| Frame period | ~40 ms | ~8 ms |
| Compute | 5–15 ms | ~1 ms |
| Median prefilter | — | 17 ms |
| Smoothing to 95% | 833 ms | 98 ms |
| CSS transition | 80 ms | ~16 ms |
| **Total to settle** | **~1.0 s** | **~160 ms** |

## Risks / Trade-offs

- **Disabling noise suppression raises the room-noise floor** → The RMS gate at `sum / SIZE < 0.001` was tuned against suppressed input and may now let noise through, or may need raising.
  Verify in a live rehearsal room, not a quiet one, and retune the gate if false detections appear between phrases.

- **Disabling echo cancellation lets the glide-play tone into the mic** → Already mitigated: analysis is paused for the whole duration of any gesture and resumes only after the last one releases.
  Residual room decay immediately after release could produce one or two bogus frames; the median-of-3 should absorb them.

- **60 fps analysis shares the main thread with the PDF viewer on `TagPage`** → Net CPU goes *down* (~8.5M vs ~25M ops/s), so this should improve rather than regress.
  If jank still appears, fall back to 30 fps before considering a worklet — that alone halves the cost and still beats today's latency by 5×.

- **Jump-snap at 70¢ could misfire on wide vibrato or an aggressive scoop** → A singer with unusually wide vibrato would see the display snap rather than average.
  70¢ is well above typical barbershop vibrato width; if it proves twitchy the threshold is a single constant to raise.

- **A 30° arc cannot resolve small errors geometrically** → 5¢ of error is roughly 1.5° of rotation, effectively invisible.
  Accepted deliberately: the accuracy color carries that range.

- **The same cents error subtends different angles on different scale degrees in just-intonation mode** → Between 0.225 and 0.424°/¢, a 1.9× spread, so a singer cannot compare arc offsets across notes as a measure of who is further out.
  The numeric cents readout remains exact and linear, and this is the unavoidable price of a continuous mapping over unevenly spaced targets.
  Equal-temperament mode is unaffected.

- **Note names become key-dependent in just-intonation mode** → The same physical pitch can be named differently under two keys.
  Bounded to a band roughly 8¢ below to 6¢ above the equal-tempered midpoints, and only reachable when already near half a semitone out of tune.
  If it proves confusing in practice, the fallback is to revert note selection to equal-tempered midpoints and accept a small disagreement between the arc's pin point and the label.

- **The arc is a visible break from the current look** → Purely visual and self-contained in `PitchWheel`; revertable independently of the detection work, since the two halves of this change share no code.
