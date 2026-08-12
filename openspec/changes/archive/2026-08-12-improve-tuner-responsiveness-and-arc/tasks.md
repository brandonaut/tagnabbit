## 1. Microphone capture

- [x] 1.1 Pass explicit `autoGainControl: false`, `noiseSuppression: false`, `echoCancellation: false` constraints to the `getUserMedia` call in `toggle`
- [x] 1.2 Confirm the tuner still starts and detects pitch when a browser ignores those constraints, rather than erroring

## 2. Autocorrelation correctness

- [x] 2.1 Restrict the `c` computation loop to the `[minLag, maxLag]` range instead of computing all 2048 lags
- [x] 2.2 Compute the unnormalized `c[0]` separately, since the confidence test still needs it as a denominator
- [x] 2.3 Divide each `c[i]` by its term count `(SIZE - i)` to remove the short-lag bias
- [x] 2.4 Delete the now-redundant initial-valley scan (`while (d < SIZE - 1 && c[d] > c[d + 1]) d++`)
- [x] 2.5 Re-check the `maxVal < c[0] * 0.05` confidence threshold against the newly normalized scores and adjust if it now rejects or admits the wrong frames
- [x] 2.6 Verify by ear that a low bass note with a strong second harmonic reports the correct octave

## 3. Two-stage pitch search

- [x] 3.1 Add an 8-tap boxcar decimator computed as a running sum, producing a 12 kHz / 512-sample buffer from the 48 kHz / 2048-sample input
- [x] 3.2 Allocate the decimated buffer once and reuse it across frames rather than per tick
- [x] 3.3 Run the coarse normalized search on the decimated buffer over lags 11–185 (65–1050 Hz)
- [x] 3.4 Map the winning coarse lag back to full rate and re-correlate over roughly ±16 full-rate samples around it
- [x] 3.5 Apply parabolic interpolation at full rate on the refined peak and return that frequency
- [x] 3.6 Verify the full 65–1050 Hz range is still detected end to end after decimation

## 4. Smoothing pipeline

- [x] 4.1 Replace `smoothedFreqRef` with cents-domain state and convert the raw frequency to cents on entry
- [x] 4.2 Add a median-of-3 prefilter over the last three raw cents readings
- [x] 4.3 Apply an EMA with α≈0.4 to the median output
- [x] 4.4 Add the jump-snap: when a reading is more than 70¢ from the smoothed value, overwrite the state instead of blending
- [x] 4.5 Remove `pendingNoteRef` and `pendingFramesRef` and the two-frame confirmation branch in `setPitch`
- [x] 4.6 Select the detected note as the nearest target of the active temperament — equal-tempered pitches in ET mode, just targets for the reference key in JI mode
- [x] 4.7 Track the currently displayed note and flip it only once the smoothed pitch passes ~5¢ beyond that boundary
- [x] 4.8 Re-seed the displayed note to the nearest target of the new reading whenever a jump-snap fires, bypassing hysteresis
- [x] 4.9 Update `resetSmoothing` to clear the new median and EMA state

## 5. Loop rate and silence handling

- [x] 5.1 Lower the `tick` throttle from 80 ms to a 30–60 fps budget
- [x] 5.2 Shorten the silence hold from 1500 ms to ~300 ms
- [x] 5.3 Call `resetSmoothing` when the silence hold fires so the next note is picked up fresh
- [ ] 5.4 Measure the per-frame analysis cost on a phone and drop to 30 fps if 60 fps shows jank on `TagPage`

## 6. Just-intonation angle mapping

- [x] 6.1 Derive a just-target table `T[d] = 100 * d + JI_OFFSETS[d]` from the existing offsets, plus the wrapped gaps `T[d+1] - T[d]` including the 11→0 wrap across the octave
- [x] 6.2 Replace the `(clamp(cents, ±50) / 50) * 15` angle calculation with the piecewise-linear form, dividing by `gapUp` when the deviation is positive and `gapDown` when negative, clamped to ±15°
- [x] 6.3 Pass whatever the mapping needs (degree index, or the two gaps) from `Tuner` into `PitchWheel`, since the wheel currently receives only `cents`
- [x] 6.4 Verify the mapping reduces exactly to the previous behavior in equal-temperament mode, where every gap is 100¢
- [x] 6.5 Confirm the arc reaches exactly ±15° at the midpoint between adjacent just targets, with no dead zone and no unreachable sector
- [x] 6.6 Confirm the clamp point and the note-name boundary from task 4.6 land on the same pitch

## 7. Arc rendering

- [x] 7.1 Add `ARC_INNER_R = 33`, `ARC_OUTER_R = 41`, and `DIVIDER_INNER_R = 32`; delete `NEEDLE_TIP_R` and `NEEDLE_BASE_R`
- [x] 7.2 Add an arc path helper spanning 30° centered on an arbitrary angle, reusing the same construction as `segmentArc`
- [x] 7.3 Insert the arc element after the two inner-face circles and before the `NOTE_NAMES.map`, so the dividers paint over it
- [x] 7.4 Change the divider lines' inner radius from `INNER_R` to `DIVIDER_INNER_R`
- [x] 7.5 Delete the needle `<g>`, its line, and its tip circle
- [x] 7.6 Fill the arc with the existing `color` prop (the accuracy color) and set `pointerEvents: "none"`
- [x] 7.7 Hold the last arc angle in a ref that only updates while a pitch is detected
- [x] 7.8 Keep the arc mounted and transition `opacity` 1 → 0 over ~300 ms when the reading clears, so it fades from its last position
- [x] 7.9 Reduce the rotation transition from `0.08s` to roughly one frame, or remove it

## 8. Verification

- [x] 8.1 Run `bun run lint` and `bun run build` clean
- [ ] 8.2 Check the arc reads correctly at both panel sizes, in light and dark themes
- [x] 8.3 Confirm the arc sits flush with its wedge at 0¢ in both temperaments
- [x] 8.4 Confirm the arc sits exactly half off its wedge at ±50¢ in equal-temperament mode
- [x] 8.5 In the key of C, sweep the A/A♯ region and confirm the arc no longer freezes across the 33-cent dead zone
- [x] 8.6 In the key of C, sweep the D♯/E boundary and confirm the arc no longer tears by ~8.8°
- [x] 8.7 Confirm the arc can reach both edges of the A♯ wedge in the key of C
- [x] 8.8 Sweep a full octave in just-intonation mode and confirm arc motion is monotonic throughout
- [x] 8.9 Confirm a deliberate note change lands immediately without sweeping through intervening notes
- [x] 8.10 Confirm the note name is no longer pinned to the previous note during a change
- [ ] 8.11 Confirm the arc fades rather than vanishing when the voice stops
- [ ] 8.12 Confirm wedge tap and glide gestures still work with the arc present, including mic pause and resume
- [ ] 8.13 Test in a room with background noise to confirm the RMS gate still behaves with noise suppression disabled
