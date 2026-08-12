## Why

The tuner visibly lags behind the singer's voice and sometimes appears to freeze on a stale note.
The dominant cause is a slow exponential moving average (α=0.25) running at only ~12 fps, which takes roughly 280 ms to reach 63% of a pitch change and 830 ms to reach 95%; several smaller defects in the detection pipeline compound it.
Separately, the rotating needle is a weak in-tune indicator: it gives the eye no reference to judge alignment against, so "in tune" is a guess rather than a visible fit.

## What Changes

**Microphone capture**

- Constrain `getUserMedia` to disable auto gain control, noise suppression, and echo cancellation.
  All three are on by default, are tuned for speech rather than sustained tones, and actively fight pitch detection.

**Pitch detection**

- Normalize the autocorrelation by its shrinking window `(SIZE - i)`.
  The current unnormalized sum attenuates long lags, biasing detection toward reporting a pitch one octave high when the fundamental is weak relative to the second harmonic — the common case for low bass on a phone mic.
- Decimate the input 4× before correlating.
  Only fundamentals up to ~1050 Hz matter, so this cuts the O(n²) correlation cost roughly 16× and buys the headroom for a higher frame rate.
- Keep all analysis on the main thread; no AudioWorklet.

**Smoothing and latency**

- Raise the detection loop from ~12 fps to 30–60 fps.
- Smooth in cents rather than linear Hz, so the perceptual response rate no longer depends on register.
- Replace the single slow EMA with a median-of-3 outlier filter feeding a light EMA (α≈0.4), giving a time constant near 40 ms instead of 280 ms.
- Snap the smoothed value instead of gliding when a new reading is more than ~70¢ away, so deliberate note changes land immediately.
- Replace the two-consecutive-frame note-name confirmation with ±55¢ boundary hysteresis.
  The frame counter currently resets on every frame of a glide, which pins the displayed note name to the previous note for hundreds of milliseconds — the "stuck" symptom.
- Shorten the silence hold from 1500 ms to ~300 ms and reset the smoothing state when it fires.

**In-tune visualization**

- **BREAKING** (visual): replace the rotating needle line-and-dot with a 30°-wide arc band at radius 33–41, just inside the wedge ring's inner edge.
  In tune means the arc sits flush with the detected wedge; deviation shows as visible rotational misalignment across the r=42 seam.
- Extend the wedge divider lines inward from r=42 to r≈32 so each wedge edge continues across the arc band and gives the eye something to judge alignment against.
- Fill the arc with the existing green/yellow/red accuracy color, so offsets too small to see geometrically (under ~2°) are still readable.
- Fade the arc out on silence rather than having it vanish.

**Just-intonation mapping**

- Replace the fixed 0.3°/cent mapping with a piecewise-linear one that scales each deviation by the distance to the neighboring tuning target.
  The current mapping gives every interval 30° of wheel regardless of its true size, but just-intonation intervals range from 70.7¢ to 133.2¢.
  The mismatch currently shows up as an 8.8° tear at three wedge boundaries, a 33-cent span at the A/A♯ boundary where the indicator sits frozen, and portions of some wedges the indicator can never reach.
- Keep all 12 wedges at a uniform 30° in both modes rather than resizing them to their true pitch territory, which would break the `hue = noteIndex * 30` rule and reshape the wheel on every key change.
- Move the note-name boundary in just-intonation mode to the midpoint between adjacent just targets, so the label changes at the same pitch where the arc reaches its wedge edge.
- In equal-temperament mode all of this reduces exactly to the current behavior.

## Capabilities

### New Capabilities

- `tuner-pitch-detection`: microphone capture constraints, autocorrelation correctness, smoothing and latency behavior, and silence handling for the mic-driven tuner.

### Modified Capabilities

- `tuner-pitch-wheel`: the accuracy indicator changes from a needle to a wedge-width arc segment, the wedge dividers extend inward to serve as its alignment reference, and the cents-to-angle mapping becomes piecewise linear between tuning targets so just-intonation mode is continuous.

## Impact

- `src/Tuner.tsx` — the `autoCorrelate` function, the `tick` loop and its smoothing refs, the `toggle` function's `getUserMedia` call, the `needleAngle` calculation, and the `PitchWheel` component's needle and divider rendering.
- A derived table of just-intonation targets and inter-target gaps alongside the existing `JI_OFFSETS` constant.
- New geometry constants for the arc band radii alongside the existing `CX`/`CY`/`OUTER_R`/`INNER_R` set; `NEEDLE_TIP_R` and `NEEDLE_BASE_R` are removed.
- No API, dependency, or data-layer changes.
- No effect on `tuner-glide-play`, `tuner-key-picker`, or `tuner-panel-size` behavior.
