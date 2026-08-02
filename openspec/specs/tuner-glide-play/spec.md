## Purpose

The pitch wheel widget in `Tuner.tsx` supports gliding a pointer across its wedges to play a sequence of notes as one continuous, legato tone.
This spec defines gesture entry, angle-only note tracking, quantized note transitions, and independent handling of multiple concurrent gestures.

## Requirements

### Requirement: Glide gesture must start inside a wedge
A glide gesture SHALL only begin when a pointer's initial press lands on one of the 12 wedge hit targets, matching the existing tap-to-play entry point. Pressing outside all wedges (e.g. the center face, or outside the outer ring) SHALL NOT start a gesture.

#### Scenario: Press inside a wedge starts a gesture
- **WHEN** a pointer presses down inside a wedge's hit target
- **THEN** a gesture begins for that pointer and its note begins sounding

#### Scenario: Press outside any wedge does not start a gesture
- **WHEN** a pointer presses down on the center face or outside the outer ring
- **THEN** no gesture begins and no note sounds for that pointer

### Requirement: Note tracking during a glide is angle-only
Once a gesture has started, the wheel SHALL determine which note is current for that pointer using only the pointer's angle from the wheel's center, independent of its distance from center. Movement toward the center face, past the outer ring's edge, or anywhere at a given angle SHALL all resolve to the same note as that angle's wedge.

#### Scenario: Angle determines the note regardless of radius
- **WHEN** an active gesture's pointer moves to a new position at the same angle from center but a different distance from center
- **THEN** the gesture's current note does not change

#### Scenario: Crossing a wedge boundary changes the note
- **WHEN** an active gesture's pointer moves past the angular boundary between two wedges
- **THEN** the gesture's current note updates to the wedge now at that angle

### Requirement: Note transitions during a glide are quantized, not continuous
A glide SHALL sound one of the 12 chromatic notes at a time. Transitions between notes SHALL be discrete snaps between chromatic frequencies, never a continuous pitch bend through intermediate frequencies.

#### Scenario: Crossing a boundary snaps directly to the new note's pitch
- **WHEN** a gesture's current note changes because the pointer crossed a wedge boundary
- **THEN** the sounding pitch changes immediately to the new note's frequency with no intermediate pitch sweep

### Requirement: A single gesture's tone is legato across note changes
For a single pointer's gesture, the sounding tone SHALL remain one continuous sound across note changes — the same oscillator's frequency snaps at each crossing rather than the tone stopping and restarting.

#### Scenario: Gliding through several wedges produces one continuous tone
- **WHEN** a single gesture crosses multiple wedge boundaries in sequence without releasing
- **THEN** the tone sounds continuously throughout, with its pitch snapping at each crossing, and no audible gap or re-attack between notes

### Requirement: Re-entering a wedge re-triggers it
Re-entering a wedge that the same gesture already visited earlier SHALL be treated the same as entering any other new wedge — the note is considered newly current again, with no suppression based on having already been visited during this gesture.

#### Scenario: Gliding back into a previously-visited wedge sounds it again
- **WHEN** a gesture's pointer leaves a wedge, crosses into others, and then re-enters the original wedge
- **THEN** that wedge's note becomes current again, identically to any other crossing

### Requirement: Multiple concurrent gestures are independent
The wheel SHALL support more than one active gesture at the same time, each tracked independently by its own pointer. One gesture's note, movement, or release SHALL have no effect on any other concurrent gesture's note or sound.

#### Scenario: Two pointers glide independently
- **WHEN** two pointers each have an active gesture on the wheel at the same time
- **THEN** each pointer's current note is tracked and sounded independently, and moving one pointer does not change the other's sounding note

#### Scenario: Releasing one gesture does not affect another
- **WHEN** two gestures are active and one pointer is released
- **THEN** only that pointer's tone stops; the other gesture's tone continues unaffected

### Requirement: No cap on concurrent voices
The wheel SHALL NOT impose an artificial limit on the number of simultaneous gestures; every distinct pointer reported by the platform that presses inside a wedge SHALL be tracked as its own gesture.

#### Scenario: A third simultaneous pointer is still tracked
- **WHEN** a third pointer presses inside a wedge while two other gestures are already active
- **THEN** the third pointer's gesture also begins and sounds independently

### Requirement: Mic pause spans all active gestures
While one or more gestures are active, the mic pitch-detection loop SHALL remain paused. It SHALL only resume once every active gesture has ended, not as soon as any single gesture ends.

#### Scenario: Mic stays paused while any gesture is still active
- **WHEN** two gestures are active and one is released while the other continues
- **THEN** mic pitch-detection analysis remains paused

#### Scenario: Mic resumes once the last gesture ends
- **WHEN** the last remaining active gesture is released
- **THEN** mic pitch-detection analysis resumes
