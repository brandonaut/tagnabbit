## Purpose

The pitch wheel widget in `Tuner.tsx` visually represents the barbershop tuner's 12 chromatic notes as wedges arranged in a circle.
This spec defines its color and sizing behavior: how each note's identity is conveyed via hue, how state (idle, reference key, active) is conveyed via saturation/lightness, and how accuracy feedback (the needle and cents readout) stays a separate, unaffected color channel.

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

#### Scenario: Reference-key wedge shows a distinct marker
- **WHEN** a wedge's note is the currently selected reference key, it is not otherwise active, and the tuner is in just-intonation mode
- **THEN** it renders a marker (at the label ring) colored with that note's own hue, at a chroma level between the idle and active tiers

#### Scenario: No reference marker in equal-temperament mode
- **WHEN** the tuner is in equal-temperament mode
- **THEN** no wedge renders the reference-key marker, regardless of which note was last selected as the key

#### Scenario: Active wedge shows a full-saturation fill
- **WHEN** a wedge's note is either the currently detected pitch or is being played via the tap-to-hear gesture
- **THEN** it renders a high-chroma, high-contrast fill in that note's own hue

### Requirement: Detected and played states render identically
Since a wedge cannot simultaneously be the mic-detected pitch and be actively played (playing pauses pitch detection), the wheel SHALL NOT visually distinguish between these two triggers of the active tier.

#### Scenario: Tap-to-play and mic-detected render the same
- **WHEN** a wedge becomes active because the user is tapping/holding it to play its pitch-pipe tone, compared with a wedge becoming active because the microphone detected that pitch
- **THEN** both cases render with the same active-tier color treatment for that wedge

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

### Requirement: Equal temperament as a second tuning mode
The tuner SHALL support two temperament modes — just-intonation (relative to a selected reference key) and equal-temperament — as an independent axis from the selected reference key.
Switching modes SHALL NOT discard the last-selected reference key.
The reference key and temperament mode are set via the `tuner-key-picker` chip and dropdown, not by any gesture on the wheel itself.

#### Scenario: Cents readout reflects equal-tempered pitch in equal-temperament mode
- **WHEN** a pitch is detected while the tuner is in equal-temperament mode
- **THEN** the displayed cents offset is the raw equal-tempered deviation, without any just-intonation offset applied relative to a key

### Requirement: No hint while holding a wedge
While a wedge is held for tap-to-play, the wheel's center face SHALL NOT display any hint text, since tap-to-play is the wedge's only gesture and needs no further discovery aid once already in progress.

#### Scenario: Holding a wedge shows no hint text
- **WHEN** the user presses and holds a wedge to play its tone
- **THEN** the center face displays no hint text for the duration of the hold

### Requirement: Idle hint indicates the tap gesture
When no gesture is in progress and no pitch is currently detected, the wheel's center face SHALL display a hint indicating a wedge can be tapped to play its tone, regardless of whether the microphone is active.

#### Scenario: Idle center shows a tap hint
- **WHEN** no gesture is in progress and no pitch is currently detected
- **THEN** the center face displays a hint indicating a wedge can be tapped to play its tone, whether or not the microphone is currently listening

### Requirement: Wedge accessible label describes tap-to-play only
Each wedge's accessible label SHALL describe only the tap-to-play gesture, with no mention of dragging.

#### Scenario: Wedge accessible label mentions only playing the note
- **WHEN** an assistive technology reads a wedge's hit-target label
- **THEN** the label mentions only that tapping the wedge plays that note's tone

### Requirement: Page-level default temperament
The `Tuner` component SHALL accept an optional default temperament, used when there is no meaningful reference key to default to.

#### Scenario: Search page starts in equal-temperament mode
- **WHEN** the tuner is opened on the search page, which has no specific tag or key context
- **THEN** it starts in equal-temperament mode

#### Scenario: Tag page starts in just-intonation mode
- **WHEN** the tuner is opened on a tag page
- **THEN** it starts in just-intonation mode using that tag's key, as before
