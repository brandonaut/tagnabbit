## ADDED Requirements

### Requirement: Accuracy is shown as a wedge-width arc segment

The wheel SHALL indicate tuning accuracy with an arc segment spanning the same angular width as one note wedge, rendered as a band on the wheel's inner face just inside the wedge ring.
The arc's angular center SHALL track the detected pitch, so being in tune means the arc's edges line up flush with the detected wedge's edges across the seam between the band and the ring.
This replaces the rotating needle, which offered no reference against which to judge alignment.

#### Scenario: In-tune pitch aligns the arc with its wedge

- **WHEN** a detected pitch has no cents deviation from its target
- **THEN** the arc's angular edges line up with the detected wedge's angular edges

#### Scenario: Deviation rotates the arc off its wedge

- **WHEN** a detected pitch deviates sharp or flat from its target
- **THEN** the arc rotates in the corresponding direction and its edges no longer line up with the detected wedge's edges

#### Scenario: No needle is rendered

- **WHEN** a pitch is detected
- **THEN** the wheel renders the arc segment and no needle line or needle tip

### Requirement: Wedges stay uniform in both temperaments

The wheel SHALL always render 12 wedges of equal angular width, in both equal-temperament and just-intonation modes, and SHALL NOT resize or reposition wedges when the reference key changes.
The wheel is a map of scale-degree positions, not a proportional map of pitch space.
This preserves the wedge hue rule (`hue = noteIndex * 30`), which requires a wedge's position on the wheel to match its position on the color wheel, and it keeps the wheel's tap-and-glide landmarks fixed as the key changes.

#### Scenario: Wedge geometry is unchanged by temperament mode

- **WHEN** the tuner switches between equal-temperament and just-intonation modes
- **THEN** all 12 wedges keep the same angular width and position

#### Scenario: Wedge geometry is unchanged by reference key

- **WHEN** the user selects a different reference key while in just-intonation mode
- **THEN** all 12 wedges keep the same angular width and position

### Requirement: Cents-to-angle mapping is piecewise linear between tuning targets

Each wedge's angular center SHALL represent that note's tuning target — the equal-tempered pitch in equal-temperament mode, or the just-intonation target for that scale degree relative to the reference key in just-intonation mode.
Because just-intonation targets are not evenly spaced, the arc's angular offset SHALL scale the pitch deviation by the distance to the neighboring target in the direction of that deviation, rather than by a fixed cents-per-degree rate.
The offset SHALL be clamped to half a wedge's width, which corresponds to the midpoint between the current target and that neighbor.
The resulting mapping SHALL be continuous and monotonic across wedge boundaries in both modes.

In equal-temperament mode every neighboring target is 100¢ away, so this reduces exactly to the previous fixed rate with 50¢ mapping to half a wedge.

#### Scenario: Equal temperament maps fifty cents to half a wedge

- **WHEN** a detected pitch deviates by 50¢ while the tuner is in equal-temperament mode
- **THEN** the arc is offset by exactly half a wedge's angular width, leaving it half overlapping its wedge

#### Scenario: Deviation toward a close neighbor subtends more angle

- **WHEN** a pitch is detected on a scale degree whose neighboring just-intonation target in that direction is closer than 100¢ away, such as the major third in the key of C, whose neighbor above is 70.7¢ away
- **THEN** a given deviation in cents rotates the arc further than the same deviation would in equal-temperament mode, and the arc reaches the wedge edge exactly at the midpoint to that neighbor

#### Scenario: Deviation toward a distant neighbor subtends less angle

- **WHEN** a pitch is detected on a scale degree whose neighboring just-intonation target in that direction is further than 100¢ away, such as the sixth degree in the key of C, whose neighbor above is 133.2¢ away
- **THEN** a given deviation in cents rotates the arc less than the same deviation would in equal-temperament mode, and the arc still reaches the wedge edge exactly at the midpoint to that neighbor

#### Scenario: Every part of every wedge is reachable

- **WHEN** a pitch sweeps across the full span between two adjacent just-intonation targets
- **THEN** the arc sweeps the full half-wedge on each side, with no portion of either wedge left unreachable

#### Scenario: Arc never freezes mid-sweep

- **WHEN** a pitch sweeps continuously between two adjacent just-intonation targets more than 100¢ apart
- **THEN** the arc moves continuously throughout, without a range of pitches over which it sits motionless at a wedge edge

#### Scenario: Arc motion is continuous across a note change in just intonation

- **WHEN** a rising pitch in just-intonation mode crosses from near the top of one wedge into the bottom of the next
- **THEN** the arc's position moves continuously through the crossing, with no visible jump

#### Scenario: Arc motion is monotonic

- **WHEN** a detected pitch rises steadily through any part of the wheel in either mode
- **THEN** the arc rotates steadily in one direction and never moves backward

### Requirement: Wedge dividers extend across the arc band

The wedge divider lines SHALL extend inward past the wedge ring's inner edge to span the arc band's radial range.
Without this the arc has no visible reference to be judged against, and small misalignments cannot be read.

#### Scenario: Dividers give the arc an alignment reference

- **WHEN** the wheel renders its wedge dividers
- **THEN** each divider continues inward across the radial range occupied by the arc band

### Requirement: Arc uses the accuracy color scale

The arc SHALL be filled with the same accuracy-based color used by the cents readout — green when in tune, yellow and red as the pitch deviates further.
Geometry alone cannot resolve small deviations, since a few cents of error produces only a degree or two of rotation; color carries that range.

#### Scenario: Arc color tracks tuning accuracy

- **WHEN** a detected pitch moves from in tune to progressively further out of tune
- **THEN** the arc's fill color follows the same accuracy thresholds as the cents readout

#### Scenario: Small deviations remain readable

- **WHEN** a detected pitch deviates by only a few cents, too little to see as rotation
- **THEN** the arc's color still communicates that the pitch is not exactly in tune

### Requirement: Arc fades out when the reading clears

When the detected pitch clears, the arc SHALL fade out rather than disappearing instantly.

#### Scenario: Arc fades when the singer stops

- **WHEN** the detected pitch clears after the silence hold elapses
- **THEN** the arc fades out rather than vanishing in a single frame

### Requirement: Arc does not intercept pointer input

The arc SHALL be non-interactive, so it never captures a pointer event that would otherwise reach the wheel's wedge hit targets.

#### Scenario: Pressing through the arc still reaches the wheel

- **WHEN** a pointer presses at a position overlapped by the arc
- **THEN** the arc does not intercept the event, and wedge gesture handling behaves as if the arc were not there

## MODIFIED Requirements

### Requirement: Accuracy feedback stays visually independent of note-identity color

The accuracy arc and the cents-offset readout (e.g. "+3¢") SHALL continue to use their existing accuracy-based color (green when in tune, yellow/red as pitch deviates), unaffected by the per-note wedge hue system.

#### Scenario: Cents readout color reflects tuning accuracy, not note identity

- **WHEN** a pitch is detected and the cents offset is displayed
- **THEN** its color reflects how in-tune the pitch is (per the existing accuracy thresholds), regardless of which note's hue is active on the wheel

#### Scenario: Arc color reflects tuning accuracy, not note identity

- **WHEN** a pitch is detected and the accuracy arc is displayed over or beside a wedge of any hue
- **THEN** the arc's color reflects how in-tune the pitch is, not the detected note's hue
