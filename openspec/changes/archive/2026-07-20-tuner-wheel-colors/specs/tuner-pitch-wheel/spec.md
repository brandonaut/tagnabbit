## ADDED Requirements

### Requirement: Per-note wedge hue identity
The pitch wheel SHALL render each of its 12 note wedges with a fixed hue derived from that note's index (`hue = noteIndex * 30` degrees), so a wedge's color-wheel position matches its position on the pitch wheel. This hue assignment SHALL be scoped to the wedges only and SHALL NOT be applied to the reference-key text label or any other note-name text in the application.

#### Scenario: Wedge hue matches wheel position
- **WHEN** the pitch wheel renders any of the 12 note wedges
- **THEN** that wedge's fill and stroke colors are derived from a hue equal to its note index times 30 degrees, independent of the app's light/dark theme

#### Scenario: Reference-key text label stays uncolored by note hue
- **WHEN** the reference key text (e.g. "Key: G") is displayed below the wheel
- **THEN** its color is unaffected by the per-note hue system introduced for the wedges

### Requirement: State-driven wedge color intensity
Each wedge's saturation and lightness SHALL vary across three tiers — idle, reference key, and active — while its hue stays fixed, so that the current state of a wedge is distinguishable primarily through a lightness/chroma contrast rather than through hue alone.

#### Scenario: Idle wedge shows a low-saturation tint of its hue
- **WHEN** a wedge is not the detected pitch, not being played, and not the current reference key
- **THEN** it renders with a low-chroma tint of its own hue, rather than the previous flat muted-gray fill

#### Scenario: Reference-key wedge shows a distinct marker
- **WHEN** a wedge's note is the currently selected reference key and it is not otherwise active
- **THEN** it renders a marker (at the label ring) colored with that note's own hue, at a chroma level between the idle and active tiers

#### Scenario: Active wedge shows a full-saturation fill
- **WHEN** a wedge's note is either the currently detected pitch or is being played via the tap-to-hear gesture
- **THEN** it renders a high-chroma, high-contrast fill in that note's own hue

### Requirement: Detected and played states render identically
Since a wedge cannot simultaneously be the mic-detected pitch and be actively played (playing pauses pitch detection), the wheel SHALL NOT visually distinguish between these two triggers of the active tier.

#### Scenario: Tap-to-play and mic-detected render the same
- **WHEN** a wedge becomes active because the user is tapping/holding it to play its pitch-pipe tone, compared with a wedge becoming active because the microphone detected that pitch
- **THEN** both cases render with the same active-tier color treatment for that wedge

### Requirement: Armed drag preview uses the dragged note's own hue
While a drag gesture is armed to change the reference key, the center face and label SHALL preview the dragged note's own identity hue rather than a generic accent color.

#### Scenario: Dragging a wedge toward the center
- **WHEN** the user drags a wedge inward and it enters the drop zone (armed to become the new reference key)
- **THEN** the center face tint and the armed note-name label are colored using that note's own hue rather than the app's generic accent color

### Requirement: Accuracy feedback stays visually independent of note-identity color
The needle and the cents-offset readout (e.g. "+3¢") SHALL continue to use their existing accuracy-based color (green when in tune, yellow/red as pitch deviates), unaffected by the per-note wedge hue system.

#### Scenario: Cents readout color reflects tuning accuracy, not note identity
- **WHEN** a pitch is detected and the cents offset is displayed
- **THEN** its color reflects how in-tune the pitch is (per the existing accuracy thresholds), regardless of which note's hue is active on the wheel

### Requirement: Consistent enlarged wheel size across all usages
The pitch wheel SHALL render at the same, modestly increased overall size everywhere the `Tuner` component appears, with no per-page size or behavior divergence.

#### Scenario: Wheel size matches between search and tag pages
- **WHEN** the tuner is opened on the search page and, separately, on a tag page
- **THEN** the pitch wheel renders at the same increased dimensions and with the same visual behavior in both places
