## MODIFIED Requirements

### Requirement: Per-note wedge hue identity
The pitch wheel SHALL render each of its 12 note wedges with a fixed hue derived from that note's index (`hue = noteIndex * 30` degrees), so a wedge's color-wheel position matches its position on the pitch wheel.
This hue assignment SHALL be scoped to the wedges only.

#### Scenario: Wedge hue matches wheel position
- **WHEN** the pitch wheel renders any of the 12 note wedges
- **THEN** that wedge's fill and stroke colors are derived from a hue equal to its note index times 30 degrees, independent of the app's light/dark theme

### Requirement: Equal temperament as a second tuning mode
The tuner SHALL support two temperament modes — just-intonation (relative to a selected reference key) and equal-temperament — as an independent axis from the selected reference key.
Switching modes SHALL NOT discard the last-selected reference key.
The reference key and temperament mode are set via the `tuner-key-picker` chip and dropdown, not by any gesture on the wheel itself.

#### Scenario: Cents readout reflects equal-tempered pitch in equal-temperament mode
- **WHEN** a pitch is detected while the tuner is in equal-temperament mode
- **THEN** the displayed cents offset is the raw equal-tempered deviation, without any just-intonation offset applied relative to a key

## REMOVED Requirements

### Requirement: Armed drag preview uses the dragged note's own hue
**Reason**: The drag-to-set-key / drag-to-equal-temperament gesture is removed from the wheel; there is no in-progress drag to preview.
**Migration**: The current key or equal-temperament state is now shown via the `tuner-key-picker` chip, tinted with the key's own hue where applicable. The wheel's center face no longer changes appearance while a wedge is held.

### Requirement: Key label reflects current temperament mode
**Reason**: The "Key: …" label moves off the wheel into the new `tuner-key-picker` chip.
**Migration**: See the `tuner-key-picker` capability's chip-label requirements.

### Requirement: Armed equal-temperament preview
**Reason**: The drag-to-switch-to-equal-temperament gesture is removed from the wheel.
**Migration**: Equal temperament is now selected via the `tuner-key-picker` dropdown's "Equal Temperament" button, an atomic tap with no in-progress preview state.

### Requirement: Hold-to-play hint indicates the drag gesture
**Reason**: The drag gesture is removed, so there is no longer a second gesture to hint at while holding a wedge.
**Migration**: See "No hint while holding a wedge" below.

### Requirement: Idle hint indicates both tap and drag gestures
**Reason**: The drag gesture is removed; the idle hint no longer needs to describe it.
**Migration**: See "Idle hint indicates the tap gesture" below.

### Requirement: Drag gesture accessible label mentions both outcomes
**Reason**: The drag gesture is removed; wedges have only one interaction to describe.
**Migration**: See "Wedge accessible label describes tap-to-play only" below.

## ADDED Requirements

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
