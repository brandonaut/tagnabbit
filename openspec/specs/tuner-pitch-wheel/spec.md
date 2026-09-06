## Purpose

The pitch wheel widget in `Tuner.tsx` visually represents the barbershop tuner's 12 chromatic notes as wedges arranged in a circle.
This spec defines its color and sizing behavior: how each note's identity is conveyed via hue, how state (idle, active) is conveyed via saturation/lightness, and how accuracy feedback (the arc segment and cents readout) stays a separate, unaffected color channel.
It also defines the accuracy arc itself — its geometry, its alignment reference, and the mapping from cents deviation to angular offset.
## Requirements
### Requirement: Per-note wedge hue identity
The pitch wheel SHALL render each of its 12 note wedges with a fixed hue derived from that note's index (`hue = noteIndex * 30` degrees), so a wedge's color-wheel position matches its position on the pitch wheel.
This hue assignment SHALL be scoped to the wedges only.

#### Scenario: Wedge hue matches wheel position
- **WHEN** the pitch wheel renders any of the 12 note wedges
- **THEN** that wedge's fill and stroke colors are derived from a hue equal to its note index times 30 degrees, independent of the app's light/dark theme

### Requirement: Detected and played states render identically
Since a wedge cannot simultaneously be the mic-detected pitch and be actively played (playing pauses pitch detection), the wheel SHALL NOT visually distinguish between these two triggers of the active tier.

#### Scenario: Tap-to-play and mic-detected render the same
- **WHEN** a wedge becomes active because the user is tapping/holding it to play its pitch-pipe tone, compared with a wedge becoming active because the microphone detected that pitch
- **THEN** both cases render with the same active-tier color treatment for that wedge

### Requirement: Accuracy feedback stays visually independent of note-identity color
The accuracy arc and the cents-offset readout (e.g. "+3¢") SHALL continue to use their existing accuracy-based color (green when in tune, yellow/red as pitch deviates), unaffected by the per-note wedge hue system.

#### Scenario: Cents readout color reflects tuning accuracy, not note identity
- **WHEN** a pitch is detected and the cents offset is displayed
- **THEN** its color reflects how in-tune the pitch is (per the existing accuracy thresholds), regardless of which note's hue is active on the wheel

#### Scenario: Arc color reflects tuning accuracy, not note identity
- **WHEN** a pitch is detected and the accuracy arc is displayed over or beside a wedge of any hue
- **THEN** the arc's color reflects how in-tune the pitch is, not the detected note's hue

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

### Requirement: Wheel size follows the panel's size state
The pitch wheel SHALL render at a size determined by the enclosing panel's size state (small or large, per `tuner-panel-size`), rather than at one fixed size everywhere the `Tuner` component appears.

#### Scenario: Wheel is larger when the panel is in the large state
- **WHEN** the tuner panel's size state is large
- **THEN** the pitch wheel renders visibly larger than it does when the panel's size state is small

#### Scenario: Wheel size can differ between search and tag pages
- **WHEN** the tuner is opened on the search page (defaulting to large) and, separately, on a tag page (defaulting to small)
- **THEN** the pitch wheel renders at different sizes in each place, reflecting each page's default panel size

### Requirement: Accidental wedges show a secondary enharmonic name
Each of the 5 accidental note wedges (`C#/Db`, `D#/Eb`, `F#/Gb`, `Ab/G#`, `Bb/A#`) SHALL render both names as a stacked two-line label, with the first-listed name as primary (top line) and the second-listed name as secondary (bottom line).
The 7 natural-note wedges (`C D E F G A B`) SHALL continue to render a single-line label, unchanged.
This labeling SHALL be static: it does not depend on the detected pitch or any other wheel state.

#### Scenario: Accidental wedge renders two stacked names
- **WHEN** the pitch wheel renders the wedge at note index 1 (sharp name `C#`)
- **THEN** the wedge displays `C#` as the top line and `Db` as the bottom line

#### Scenario: Flat-first accidental wedge renders flat name on top
- **WHEN** the pitch wheel renders the wedge at note index 8 (sharp name `G#`)
- **THEN** the wedge displays `Ab` as the top line and `G#` as the bottom line

#### Scenario: Natural note wedge is unaffected
- **WHEN** the pitch wheel renders a natural-note wedge (e.g. note index 0, `C`)
- **THEN** the wedge displays a single-line label reading `C`, with no secondary line

#### Scenario: Label does not change with wheel state
- **WHEN** the detected pitch changes or a wedge becomes active
- **THEN** every wedge's primary/secondary label content stays the same as before

### Requirement: Secondary enharmonic name is visually subordinate
The secondary (bottom) line of an accidental wedge's label SHALL render at a smaller font size and reduced opacity relative to the primary (top) line, while both lines SHALL use the same fill color rule as the wheel's existing active/inactive text color (`var(--note-text-on-active)` vs. `var(--text)`).

#### Scenario: Secondary line is smaller and fainter than primary
- **WHEN** an accidental wedge renders its two-line label
- **THEN** the bottom line's font size is smaller than the top line's, and the bottom line's opacity is lower than the top line's

#### Scenario: Secondary line follows active-state color like primary
- **WHEN** an accidental wedge becomes active (detected or played)
- **THEN** both the primary and secondary lines switch to the active-state text color, with the secondary line retaining its reduced opacity relative to the primary

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

