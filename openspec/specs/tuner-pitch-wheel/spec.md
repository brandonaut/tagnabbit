## Purpose

The pitch wheel widget in `Tuner.tsx` visually represents the barbershop tuner's 12 chromatic notes as wedges arranged in a circle.
This spec defines its color and sizing behavior: how each note's identity is conveyed via hue, how state (idle, reference key, active) is conveyed via saturation/lightness, and how accuracy feedback (the arc segment and cents readout) stays a separate, unaffected color channel.
It also defines the accuracy arc itself — its geometry, its alignment reference, and the mapping from cents deviation to angular offset in each temperament.

## Requirements

### Requirement: Per-note wedge hue identity
The pitch wheel SHALL render each of its 12 note wedges with a fixed hue derived from that note's index (`hue = noteIndex * 30` degrees), so a wedge's color-wheel position matches its position on the pitch wheel.
This hue assignment SHALL be scoped to the wedges only.

#### Scenario: Wedge hue matches wheel position
- **WHEN** the pitch wheel renders any of the 12 note wedges
- **THEN** that wedge's fill and stroke colors are derived from a hue equal to its note index times 30 degrees, independent of the app's light/dark theme

### Requirement: State-driven wedge color intensity
Each wedge's saturation and lightness SHALL vary across three tiers — idle, reference key, and active — while its hue stays fixed.
This lets the current state of a wedge be distinguishable primarily through a lightness/chroma contrast rather than through hue alone.

#### Scenario: Idle wedge shows a low-saturation tint of its hue
- **WHEN** a wedge is not the detected pitch, not being played, and not the current reference key
- **THEN** it renders with a low-chroma tint of its own hue, rather than a flat muted-gray fill

#### Scenario: Reference-key wedge shows a border outlining the whole wedge
- **WHEN** a wedge's note is the currently selected reference key, it is not otherwise active, and the tuner is in just-intonation mode
- **THEN** the wedge's full outline (both radial edges, the inner arc, and the outer arc) is stroked in that note's own hue, at the same chroma level between the idle and active tiers used previously, rather than showing a separate point marker

#### Scenario: No reference marker in equal-temperament mode
- **WHEN** the tuner is in equal-temperament mode
- **THEN** no wedge renders the reference-key border, regardless of which note was last selected as the key

#### Scenario: Active wedge shows a full-saturation fill
- **WHEN** a wedge's note is either the currently detected pitch or is being played via the tap-to-hear gesture
- **THEN** it renders a high-chroma, high-contrast fill in that note's own hue

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

### Requirement: Wheel size follows the panel's size state
The pitch wheel SHALL render at a size determined by the enclosing panel's size state (small or large, per `tuner-panel-size`), rather than at one fixed size everywhere the `Tuner` component appears.

#### Scenario: Wheel is larger when the panel is in the large state
- **WHEN** the tuner panel's size state is large
- **THEN** the pitch wheel renders visibly larger than it does when the panel's size state is small

#### Scenario: Wheel size can differ between search and tag pages
- **WHEN** the tuner is opened on the search page (defaulting to large) and, separately, on a tag page (defaulting to small)
- **THEN** the pitch wheel renders at different sizes in each place, reflecting each page's default panel size

### Requirement: Equal temperament as a second tuning mode
The tuner SHALL support two temperament modes — just-intonation (relative to a selected reference key) and equal-temperament — as an independent axis from the selected reference key.
Switching modes SHALL NOT discard the last-selected reference key.
The reference key and temperament mode are set via the `tuner-key-picker` chip and dropdown, not by any gesture on the wheel itself.

#### Scenario: Cents readout reflects equal-tempered pitch in equal-temperament mode
- **WHEN** a pitch is detected while the tuner is in equal-temperament mode
- **THEN** the displayed cents offset is the raw equal-tempered deviation, without any just-intonation offset applied relative to a key

### Requirement: No hint text on the wheel's center face
The wheel's center face SHALL NOT display any hint text, regardless of whether a gesture is in progress, idle, or a pitch is detected.

#### Scenario: Center face never shows hint text
- **WHEN** the wheel is idle, a gesture is in progress, or a pitch is detected
- **THEN** the center face displays no hint text in any of these states

### Requirement: Wedge accessible label describes tap-to-play and glide
Each wedge's accessible label SHALL describe both that tapping it plays its tone and that dragging across the ring plays other notes as they're crossed.

#### Scenario: Wedge accessible label mentions playing and gliding
- **WHEN** an assistive technology reads a wedge's hit-target label
- **THEN** the label mentions both that tapping the wedge plays that note's tone and that dragging across the ring plays other notes as the pointer crosses them

### Requirement: Page-level default temperament
The `Tuner` component SHALL accept an optional default temperament, used when there is no meaningful reference key to default to.

#### Scenario: Search page starts in equal-temperament mode
- **WHEN** the tuner is opened on the search page, which has no specific tag or key context
- **THEN** it starts in equal-temperament mode

#### Scenario: Tag page starts in just-intonation mode
- **WHEN** the tuner is opened on a tag page
- **THEN** it starts in just-intonation mode using that tag's key, as before

### Requirement: Accidental wedges show a secondary enharmonic name
Each of the 5 accidental note wedges (`C#/Db`, `D#/Eb`, `F#/Gb`, `Ab/G#`, `Bb/A#`) SHALL render both names as a stacked two-line label, with the first-listed name as primary (top line) and the second-listed name as secondary (bottom line).
The 7 natural-note wedges (`C D E F G A B`) SHALL continue to render a single-line label, unchanged.
This labeling SHALL be static: it does not depend on the currently selected reference key or temperament mode.

#### Scenario: Accidental wedge renders two stacked names
- **WHEN** the pitch wheel renders the wedge at note index 1 (sharp name `C#`)
- **THEN** the wedge displays `C#` as the top line and `Db` as the bottom line

#### Scenario: Flat-first accidental wedge renders flat name on top
- **WHEN** the pitch wheel renders the wedge at note index 8 (sharp name `G#`)
- **THEN** the wedge displays `Ab` as the top line and `G#` as the bottom line

#### Scenario: Natural note wedge is unaffected
- **WHEN** the pitch wheel renders a natural-note wedge (e.g. note index 0, `C`)
- **THEN** the wedge displays a single-line label reading `C`, with no secondary line

#### Scenario: Label does not change with selected key or temperament
- **WHEN** the user changes the reference key or switches temperament mode
- **THEN** every wedge's primary/secondary label content stays the same as before the change

### Requirement: Secondary enharmonic name is visually subordinate
The secondary (bottom) line of an accidental wedge's label SHALL render at a smaller font size and reduced opacity relative to the primary (top) line, while both lines SHALL use the same fill color rule as the wheel's existing active/inactive text color (`var(--note-text-on-active)` vs. `var(--text)`).

#### Scenario: Secondary line is smaller and fainter than primary
- **WHEN** an accidental wedge renders its two-line label
- **THEN** the bottom line's font size is smaller than the top line's, and the bottom line's opacity is lower than the top line's

#### Scenario: Secondary line follows active-state color like primary
- **WHEN** an accidental wedge becomes active (detected or played)
- **THEN** both the primary and secondary lines switch to the active-state text color, with the secondary line retaining its reduced opacity relative to the primary
