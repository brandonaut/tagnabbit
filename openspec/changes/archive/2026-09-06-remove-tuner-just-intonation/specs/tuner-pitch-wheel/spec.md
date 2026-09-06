## ADDED Requirements

### Requirement: Two-tier wedge color intensity
Each wedge's saturation and lightness SHALL vary across two tiers — idle and active — while its hue stays fixed.
This lets the current state of a wedge be distinguishable primarily through a lightness/chroma contrast rather than through hue alone.

#### Scenario: Idle wedge shows a low-saturation tint of its hue
- **WHEN** a wedge is not the detected pitch and not being played
- **THEN** it renders with a low-chroma tint of its own hue, rather than a flat muted-gray fill

#### Scenario: Active wedge shows a full-saturation fill
- **WHEN** a wedge's note is either the currently detected pitch or is being played via the tap-to-hear gesture
- **THEN** it renders a high-chroma, high-contrast fill in that note's own hue

### Requirement: Wedge accessible label describes tapping and gliding
Each wedge's accessible label SHALL describe both that tapping it plays its tone and that dragging across the ring plays other notes as they're crossed.

#### Scenario: Wedge accessible label mentions playing and gliding
- **WHEN** an assistive technology reads a wedge's hit-target label
- **THEN** the label mentions both that tapping the wedge plays that note's tone and that dragging across the ring plays other notes as the pointer crosses them

### Requirement: Wedge geometry is fixed and uniform
The wheel SHALL always render 12 wedges of equal angular width at fixed positions.
The wheel is a map of the 12 chromatic scale-degree positions, not a proportional map of pitch space.
This preserves the wedge hue rule (`hue = noteIndex * 30`), which requires a wedge's position on the wheel to match its position on the color wheel, and it keeps the wheel's tap-and-glide landmarks fixed.

#### Scenario: Wedge geometry never changes
- **WHEN** the tuner is running, idle, or has a pitch detected
- **THEN** all 12 wedges keep the same angular width and position

### Requirement: Cents-to-angle mapping is a fixed rate
Each wedge's angular center SHALL represent that note's equal-tempered pitch.
The accuracy arc's angular offset from that center SHALL be proportional to the pitch deviation in cents, at a fixed rate of half a wedge's angular width per 50 cents.
The offset SHALL be clamped to half a wedge's width, which corresponds to the equal-tempered midpoint between adjacent notes.
The resulting mapping SHALL be continuous and monotonic across wedge boundaries.

#### Scenario: Fifty cents maps to half a wedge
- **WHEN** a detected pitch deviates by 50¢ from its note's equal-tempered pitch
- **THEN** the arc is offset by exactly half a wedge's angular width, leaving it half overlapping its wedge

#### Scenario: Deviation beyond half a wedge is clamped
- **WHEN** a detected pitch deviates by more than 50¢ from its note's equal-tempered pitch
- **THEN** the arc's angular offset is clamped to half a wedge's width rather than continuing to rotate

#### Scenario: Arc motion is continuous and monotonic
- **WHEN** a detected pitch rises steadily through any part of the wheel
- **THEN** the arc rotates steadily in one direction, never backward, and moves continuously across each note boundary

## REMOVED Requirements

### Requirement: State-driven wedge color intensity
**Reason**: The three-tier model existed for the reference-key tier, which is removed with just-intonation mode. Replaced by "Two-tier wedge color intensity" (idle and active only).
**Migration**: None. Wedges render idle unless they are the detected or played note, in which case they render active.

### Requirement: Wedge accessible label describes tap-to-play and glide
**Reason**: The label had a key-select-mode branch, and key-select mode is removed. Replaced by "Wedge accessible label describes tapping and gliding".
**Migration**: None. Every wedge's label always describes tap-to-play and drag-to-glide.

### Requirement: Wedges stay uniform in both temperaments
**Reason**: There is only one temperament now. Replaced by "Wedge geometry is fixed and uniform".
**Migration**: None.

### Requirement: Cents-to-angle mapping is piecewise linear between tuning targets
**Reason**: The piecewise-linear mapping existed only because just-intonation targets are unevenly spaced. With equal temperament every neighbouring target is 100¢ away, so the mapping reduces to a fixed rate. Replaced by "Cents-to-angle mapping is a fixed rate".
**Migration**: None. The equal-tempered behaviour is identical to what the piecewise mapping already produced in equal-temperament mode.

### Requirement: Equal temperament as a second tuning mode
**Reason**: Equal temperament is now the only tuning mode, not one of two.
**Migration**: None. Every reading is equal-tempered.

### Requirement: Key-select mode changes wedge tap behavior
**Reason**: There is no reference key to select, so key-select mode is removed. Tapping a wedge always plays its tone.
**Migration**: None.

### Requirement: Key-select mode makes the center face a visible "Equal Temp." button
**Reason**: Key-select mode is removed and there is no alternate temperament to switch to.
**Migration**: None. The center face keeps its idle / detected-pitch display and does not intercept pointer input.

### Requirement: Wedges render a distinct visual tier during key-select mode
**Reason**: Key-select mode is removed, so its wedge tier is removed. Wedges have only idle and active tiers.
**Migration**: None.

### Requirement: Page-level default temperament
**Reason**: There is no temperament to default, so the `Tuner` component no longer accepts a default temperament.
**Migration**: Call sites drop the `defaultTemperament` prop; the tuner opens the same way on every page.
