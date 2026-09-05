## MODIFIED Requirements

### Requirement: Loading a local audio file
The player screen SHALL let the user load a single audio file from their device, via a file picker and via dragging a file onto the screen.
Loading a new file SHALL replace any file currently loaded, resetting playback position, balance, mono setting, and speed to their defaults.

#### Scenario: Selecting a file via the picker
- **WHEN** a user selects an audio file through the file picker
- **THEN** the player loads that file and becomes ready to play it

#### Scenario: Dropping a file onto the player
- **WHEN** a user drags an audio file onto the player screen and drops it
- **THEN** the player loads that file the same as if it had been chosen via the picker

#### Scenario: Loading a new file replaces the current one
- **WHEN** a file is already loaded and playing, and the user loads a different file
- **THEN** playback of the previous file stops, the new file loads at position zero, and the balance slider, mono switch, and speed control reset to their defaults

### Requirement: Remembering the loaded file across sessions
The system SHALL persist the loaded file, its playback position, its balance setting, its mono setting, and its speed setting, and SHALL restore them the next time the player screen is opened, including after a fresh page load.
Loading a different file SHALL overwrite the persisted file and state with the new one.
Failure to persist or restore (including lack of storage support or exhausted storage quota) SHALL be handled silently, falling back to the player's empty state with no error shown and no other functionality affected.

#### Scenario: Reopening the player restores the previous file
- **WHEN** a user leaves the player screen with a file loaded, then returns to it later (including a fresh page load)
- **THEN** the player loads the same file, at the same playback position, balance, mono setting, and speed it had when the user left

#### Scenario: Loading a new file overwrites the persisted one
- **WHEN** a user loads a different file while a previous file was persisted
- **THEN** the new file, at its default position, balance, mono setting, and speed, becomes what is persisted going forward

#### Scenario: Storage unavailable or full
- **WHEN** the system cannot persist or restore the loaded file (storage unsupported, quota exceeded, or similar)
- **THEN** the player still functions normally for the current session, showing its empty state on the next visit instead of erroring

## ADDED Requirements

### Requirement: Playback speed control
Once a file is loaded, the player SHALL provide a dropdown for selecting the playback speed, offering the fixed values 0.5, 0.75, 0.9, 1, 1.25, 1.5, and 2 (each a multiple of the file's normal speed).
Selecting a value SHALL apply it to playback immediately, whether the file is currently playing or paused, and SHALL NOT change the current playback position.
The system SHALL preserve the pitch of the audio at every speed, so slowing down or speeding up does not raise or lower the pitch of the recording.
The speed control SHALL default to 1 (normal speed) for each newly loaded file.

#### Scenario: Changing speed during playback
- **WHEN** a user selects a different speed value while a file is playing
- **THEN** playback continues from the same position at the newly selected speed

#### Scenario: Changing speed while paused
- **WHEN** a user selects a different speed value while a file is paused
- **THEN** the paused position is unchanged, and playback uses the newly selected speed once resumed

#### Scenario: Pitch stays constant across speeds
- **WHEN** a user selects a speed other than 1
- **THEN** the audio plays faster or slower without shifting the pitch of the recording

#### Scenario: Speed persists across pause and resume
- **WHEN** a user sets a non-default speed, pauses, then resumes playback
- **THEN** playback resumes at the previously selected speed
