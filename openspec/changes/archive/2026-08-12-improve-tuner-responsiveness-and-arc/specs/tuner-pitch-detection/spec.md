## ADDED Requirements

### Requirement: Microphone capture bypasses speech processing

The tuner SHALL request the microphone with automatic gain control, noise suppression, and echo cancellation explicitly disabled.
These processors are enabled by default and are tuned for speech rather than sustained musical tones: gain control destabilizes the amplitude gate, noise suppression distorts held notes, and echo cancellation attempts to subtract the tone the app itself is playing.
Where a browser does not honor a constraint, detection SHALL still function, only with degraded accuracy.

#### Scenario: Capture constraints request unprocessed audio

- **WHEN** the tuner starts and requests microphone access
- **THEN** the request explicitly disables automatic gain control, noise suppression, and echo cancellation rather than accepting the browser defaults

#### Scenario: Unsupported constraints do not block the tuner

- **WHEN** a browser grants microphone access but ignores one or more of the requested processing constraints
- **THEN** the tuner still starts and detects pitch, rather than erroring or refusing to run

### Requirement: Autocorrelation is unbiased across the detection range

The autocorrelation SHALL be normalized for the number of samples contributing at each lag, so a candidate period's score does not depend on how far into the buffer that lag reaches.
An unnormalized correlation sum attenuates long lags relative to short ones, which systematically favors reporting a pitch one octave above the true fundamental whenever the second harmonic is comparable in strength — the common case for low bass voices captured on a phone microphone.

#### Scenario: Low fundamental is not reported an octave high

- **WHEN** a sustained low bass note whose second harmonic is comparable in strength to its fundamental is sung into the tuner
- **THEN** the detected note and octave match the sung fundamental rather than the octave above it

#### Scenario: Long and short lags are scored comparably

- **WHEN** two candidate periods of equal per-sample correlation strength are compared, one near the low end of the detection range and one near the high end
- **THEN** neither is favored over the other on account of its lag length alone

### Requirement: Detection runs at an interactive frame rate

The detection loop SHALL analyze at no fewer than 30 updates per second, rather than the throttled rate used previously.
To keep this affordable on the main thread, the signal SHALL be decimated before correlation, exploiting the fact that only fundamentals within the barbershop vocal range need to be resolved.
Analysis SHALL remain on the main thread; no audio worklet is introduced.

#### Scenario: Loop analyzes at least 30 times per second

- **WHEN** the tuner is active and no wheel gesture is in progress
- **THEN** pitch analysis runs at least 30 times per second

#### Scenario: Detection range is preserved after decimation

- **WHEN** pitches across the supported vocal range, from the lowest bass to the highest tenor, are sung into the tuner
- **THEN** each is still detected, with decimation having reduced compute cost without narrowing the usable range

#### Scenario: Analysis stays on the main thread

- **WHEN** the tuner performs pitch analysis
- **THEN** it does so on the main thread, without an audio worklet

### Requirement: Smoothing operates in the cents domain

Pitch smoothing SHALL be applied to a logarithmic (cents) representation of the frequency rather than to linear hertz.
Smoothing linear frequency makes the perceived settling rate depend on register, so the same filter feels sluggish in one octave and twitchy in another.

#### Scenario: Settling rate is consistent across registers

- **WHEN** a singer moves by the same musical interval in a low register and again in a high register
- **THEN** the display takes a comparable amount of time to settle in both cases

### Requirement: Outliers are rejected before smoothing

Raw readings SHALL pass through a small median filter before entering the smoothing stage, so a single spurious reading cannot drag the displayed pitch.
This SHALL replace outlier rejection by heavy smoothing, which trades away responsiveness to achieve the same end.

#### Scenario: A single spurious reading is discarded

- **WHEN** one analysis frame returns a pitch far from its immediate neighbors while a steady note is being sung
- **THEN** the displayed pitch is unaffected by that frame

#### Scenario: A sustained change is not treated as an outlier

- **WHEN** several consecutive frames agree on a new pitch
- **THEN** the displayed pitch follows them rather than continuing to reject them

### Requirement: Display tracks a sustained pitch promptly

For a steady sung note, the displayed cents offset SHALL settle to within a few cents of the detected value in well under a quarter of a second.
The previous pipeline required roughly 280 ms to cover 63% of a change and roughly 830 ms to cover 95%, which reads as the display trailing the voice.

#### Scenario: Steady note settles quickly

- **WHEN** a singer holds a steady note
- **THEN** the displayed cents offset settles to within a few cents of the detected value in well under a quarter of a second

### Requirement: Deliberate note changes are immediate, not glided

When a new reading differs from the current smoothed value by more than roughly a semitone, the smoothing state SHALL be reset to the new reading rather than interpolated toward it.
Smoothing across such a gap makes the display sweep through every pitch in between, which both delays the correct reading and renders intermediate notes that were never sung.

#### Scenario: Jumping to a distant note lands directly

- **WHEN** a singer moves from one note to another more than a semitone away
- **THEN** the display moves to the new note directly, without sweeping through the intervening pitches

#### Scenario: Small drift within a note is still smoothed

- **WHEN** a singer's pitch drifts by well under a semitone while holding a note
- **THEN** the display smooths that drift rather than snapping to each reading

### Requirement: Note selection is nearest-target within the active temperament

The detected note SHALL be the one whose tuning target is nearest the smoothed pitch, evaluated against the targets of the temperament currently in effect.
In equal-temperament mode those are the equal-tempered pitches, so boundaries fall at the equal-tempered midpoints.
In just-intonation mode those are the just-intonation targets for the reference key, so boundaries fall at the midpoints between adjacent just targets.

This makes note selection key-dependent in just-intonation mode, which is intentional: the same boundary also defines where the accuracy arc reaches its wedge edge, and the two must agree or the arc pins against an edge while the label still names the previous note.
The shift is small — just-intonation midpoints sit between roughly 8¢ below and 6¢ above their equal-tempered counterparts — and is only reachable when the pitch is already close to half a semitone out of tune.

#### Scenario: Boundaries follow just targets in just-intonation mode

- **WHEN** the tuner is in just-intonation mode and a pitch falls between two adjacent just-intonation targets
- **THEN** the note reported is the one whose just target is nearer, not the one whose equal-tempered pitch is nearer

#### Scenario: Boundaries follow equal-tempered pitches in equal-temperament mode

- **WHEN** the tuner is in equal-temperament mode
- **THEN** note boundaries fall at the equal-tempered midpoints, independent of any previously selected reference key

#### Scenario: Note boundary agrees with the arc's wedge edge

- **WHEN** a pitch reaches the boundary between two notes in either mode
- **THEN** the accuracy arc reaches its wedge edge at that same pitch, rather than pinning before or after the label changes

### Requirement: Displayed note name is stabilized by boundary hysteresis

The displayed note name SHALL change only once the smoothed pitch passes slightly beyond the boundary defined above, providing hysteresis so a pitch sitting on the boundary does not flicker.
This SHALL replace the previous rule requiring a fixed number of consecutive frames agreeing on the same note.
That counter reset on every frame in which the reading moved, so during any pitch change it never reached its threshold and the displayed name stayed pinned to the previous note until the pitch had fully settled.

#### Scenario: Name does not flicker at a note boundary

- **WHEN** a sung pitch hovers near the boundary between two adjacent notes
- **THEN** the displayed note name does not alternate rapidly between them

#### Scenario: Name is not pinned to the previous note during a change

- **WHEN** a singer moves from one note to another
- **THEN** the displayed note name updates as the smoothed pitch crosses the boundary, rather than remaining on the previous note until the pitch has fully settled

### Requirement: Silence clears the reading promptly and resets smoothing

When no pitch is detected, the tuner SHALL clear the reading after a hold of roughly 300 ms rather than roughly 1500 ms.
When the hold elapses, the smoothing state SHALL be reset, so a pitch sung afterward is picked up fresh rather than interpolated from the pitch that preceded the silence.

#### Scenario: Reading clears shortly after the voice stops

- **WHEN** a singer stops singing
- **THEN** the displayed reading clears after roughly 300 ms rather than holding for over a second

#### Scenario: Pitch after a silence is picked up fresh

- **WHEN** a singer pauses long enough for the reading to clear, then sings a different note
- **THEN** the new note is displayed directly, without the display gliding from the pre-silence pitch
