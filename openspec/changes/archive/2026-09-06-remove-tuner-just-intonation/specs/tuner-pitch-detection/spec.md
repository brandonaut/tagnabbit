## ADDED Requirements

### Requirement: Note selection is nearest equal-tempered semitone

The detected note SHALL be the one whose equal-tempered pitch is nearest the smoothed pitch.
Note boundaries therefore fall at the equal-tempered midpoints between adjacent semitones, independent of any musical key.
This same boundary defines where the accuracy arc reaches its wedge edge, so the label and the arc always agree.

#### Scenario: Nearest equal-tempered semitone is reported

- **WHEN** a pitch is detected
- **THEN** the note reported is the one whose equal-tempered pitch is closest to the smoothed value

#### Scenario: Boundaries fall at equal-tempered midpoints

- **WHEN** a smoothed pitch sits exactly between two adjacent equal-tempered semitones
- **THEN** it is at the boundary between those two notes, and moving slightly either way selects the nearer one

#### Scenario: Note boundary agrees with the arc's wedge edge

- **WHEN** a pitch reaches the boundary between two notes
- **THEN** the accuracy arc reaches its wedge edge at that same pitch, rather than pinning before or after the label changes

## REMOVED Requirements

### Requirement: Note selection is nearest-target within the active temperament

**Reason**: Just-intonation mode is removed, so note selection is no longer temperament- or key-dependent. Replaced by "Note selection is nearest equal-tempered semitone".
**Migration**: None. Selection is always the nearest equal-tempered semitone, and note boundaries are the equal-tempered midpoints.
