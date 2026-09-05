## MODIFIED Requirements

### Requirement: Playback speed control
Once a track is loaded, the player SHALL provide a dropdown for selecting the playback speed, offering the fixed values 0.5, 0.75, 0.9, 1, 1.25, 1.5, and 2 (each a multiple of the track's normal speed).
The player SHALL also provide "decrease speed" and "increase speed" buttons that step to the adjacent value in that same fixed list, without requiring the dropdown to be opened.
The decrease-speed button SHALL have no effect when the speed is already at the lowest offered value (0.5), and the increase-speed button SHALL have no effect when the speed is already at the highest offered value (2) — neither button SHALL wrap around to the opposite end of the list.
Selecting a value (via the dropdown or either stepper button) SHALL apply it to playback immediately, whether the track is currently playing or paused, and SHALL NOT change the current playback position.
The system SHALL preserve the pitch of the audio at every speed, so slowing down or speeding up does not raise or lower the pitch of the recording.
The speed control SHALL default to 1 (normal speed) whenever a track is selected, including switching between playlist tracks — speed is not remembered per track.

#### Scenario: Changing speed during playback
- **WHEN** a user selects a different speed value while a track is playing
- **THEN** playback continues from the same position at the newly selected speed

#### Scenario: Changing speed while paused
- **WHEN** a user selects a different speed value while a track is paused
- **THEN** the paused position is unchanged, and playback uses the newly selected speed once resumed

#### Scenario: Pitch stays constant across speeds
- **WHEN** a user selects a speed other than 1
- **THEN** the audio plays faster or slower without shifting the pitch of the recording

#### Scenario: Speed persists across pause and resume
- **WHEN** a user sets a non-default speed, pauses, then resumes playback
- **THEN** playback resumes at the previously selected speed

#### Scenario: Switching tracks resets speed to normal
- **WHEN** a user selects a different track in the playlist
- **THEN** the speed control resets to 1x, regardless of what it was set to for the previously active track

#### Scenario: Stepping speed down
- **WHEN** a user activates the decrease-speed button while the current speed is not already the lowest offered value
- **THEN** the speed moves to the next lower value in the fixed list and applies immediately

#### Scenario: Stepping speed up
- **WHEN** a user activates the increase-speed button while the current speed is not already the highest offered value
- **THEN** the speed moves to the next higher value in the fixed list and applies immediately

#### Scenario: Decrease button at the lowest speed
- **WHEN** a user activates the decrease-speed button while the speed is already at the lowest offered value
- **THEN** the speed is unchanged

#### Scenario: Increase button at the highest speed
- **WHEN** a user activates the increase-speed button while the speed is already at the highest offered value
- **THEN** the speed is unchanged
