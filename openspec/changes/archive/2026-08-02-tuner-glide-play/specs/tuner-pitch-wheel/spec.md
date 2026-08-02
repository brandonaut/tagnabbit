## MODIFIED Requirements

### Requirement: Wedge accessible label describes tap-to-play and glide
Each wedge's accessible label SHALL describe both that tapping it plays its tone and that dragging across the ring plays other notes as they're crossed.

#### Scenario: Wedge accessible label mentions playing and gliding
- **WHEN** an assistive technology reads a wedge's hit-target label
- **THEN** the label mentions both that tapping the wedge plays that note's tone and that dragging across the ring plays other notes as the pointer crosses them

## REMOVED Requirements

### Requirement: No hint while holding a wedge
**Reason**: Superseded by the broader "No hint text on the wheel's center face" requirement, which removes the hint unconditionally rather than only while a wedge is held.
**Migration**: See the new "No hint text on the wheel's center face" requirement.

### Requirement: Idle hint indicates the tap gesture
**Reason**: The idle hint is removed entirely rather than updated to also describe gliding; see the new "No hint text on the wheel's center face" requirement.
**Migration**: See the new "No hint text on the wheel's center face" requirement.

## ADDED Requirements

### Requirement: No hint text on the wheel's center face
The wheel's center face SHALL NOT display any hint text, regardless of whether a gesture is in progress, idle, or a pitch is detected.

#### Scenario: Center face never shows hint text
- **WHEN** the wheel is idle, a gesture is in progress, or a pitch is detected
- **THEN** the center face displays no hint text in any of these states
