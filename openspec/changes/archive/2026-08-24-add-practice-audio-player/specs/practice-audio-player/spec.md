## Purpose

Lets a user load a local audio recording and play it back with transport controls and an adjustable left/right balance, so they can practice singing along with a track.

## ADDED Requirements

### Requirement: Loading a local audio file
The player screen SHALL let the user load a single audio file from their device, via a file picker and via dragging a file onto the screen.
Loading a new file SHALL replace any file currently loaded, resetting playback position, balance, and mono setting to their defaults.

#### Scenario: Selecting a file via the picker
- **WHEN** a user selects an audio file through the file picker
- **THEN** the player loads that file and becomes ready to play it

#### Scenario: Dropping a file onto the player
- **WHEN** a user drags an audio file onto the player screen and drops it
- **THEN** the player loads that file the same as if it had been chosen via the picker

#### Scenario: Loading a new file replaces the current one
- **WHEN** a file is already loaded and playing, and the user loads a different file
- **THEN** playback of the previous file stops, the new file loads at position zero, and the balance slider and mono switch reset to their defaults

### Requirement: Remembering the loaded file across sessions
The system SHALL persist the loaded file, its playback position, its balance setting, and its mono setting, and SHALL restore them the next time the player screen is opened, including after a fresh page load.
Loading a different file SHALL overwrite the persisted file and state with the new one.
Failure to persist or restore (including lack of storage support or exhausted storage quota) SHALL be handled silently, falling back to the player's empty state with no error shown and no other functionality affected.

#### Scenario: Reopening the player restores the previous file
- **WHEN** a user leaves the player screen with a file loaded, then returns to it later (including a fresh page load)
- **THEN** the player loads the same file, at the same playback position, balance, and mono setting it had when the user left

#### Scenario: Loading a new file overwrites the persisted one
- **WHEN** a user loads a different file while a previous file was persisted
- **THEN** the new file, at its default position, balance, and mono setting, becomes what is persisted going forward

#### Scenario: Storage unavailable or full
- **WHEN** the system cannot persist or restore the loaded file (storage unsupported, quota exceeded, or similar)
- **THEN** the player still functions normally for the current session, showing its empty state on the next visit instead of erroring

### Requirement: Playback transport controls
Once a file is loaded, the player SHALL provide play/pause, skip back 10 seconds, skip forward 10 seconds, and a scrubbable timeline showing playback position and total duration.
Skipping SHALL clamp to the start and end of the track rather than erroring or wrapping.

#### Scenario: Play and pause
- **WHEN** a user taps play on a loaded, paused file
- **THEN** playback starts from the current position, and tapping again pauses it at that position

#### Scenario: Skip forward near the end of the track
- **WHEN** a user taps skip-forward-10-seconds with less than 10 seconds remaining in the track
- **THEN** playback position moves to the end of the track rather than past it

#### Scenario: Skip back near the start of the track
- **WHEN** a user taps skip-back-10-seconds with less than 10 seconds elapsed
- **THEN** playback position moves to the start of the track rather than before it

#### Scenario: Scrubbing the timeline
- **WHEN** a user drags the timeline to a new position
- **THEN** playback position updates to that point, and playback continues from there if it was already playing

### Requirement: Left/right balance adjustment
The player SHALL provide a slider that adjusts the relative volume of the loaded file's own left and right channels during playback.
At the centered position, both channels play at their original volume.
Moving the slider toward one side SHALL fade down the opposite channel's volume, so that at a full-left or full-right position only that channel's content is audible.
The slider SHALL NOT move or swap which output speaker each channel plays through.
The slider SHALL default to centered for each newly loaded file.

#### Scenario: Adjusting balance during playback
- **WHEN** a user moves the balance slider while a file is playing
- **THEN** the volume of each channel changes immediately to match the slider position

#### Scenario: Isolating a single channel at a balance extreme
- **WHEN** a user moves the balance slider to its full-left or full-right position
- **THEN** only that side's channel content is audible, with the opposite channel faded to silent

#### Scenario: Balance persists across pause and resume
- **WHEN** a user sets a non-centered balance, pauses, then resumes playback
- **THEN** playback resumes at the previously set balance

### Requirement: Mono output switch
The player SHALL provide a switch that, when enabled, combines the balance-adjusted left and right channels into a single signal and plays that same signal on both output channels.
The switch SHALL apply on top of whatever mix the balance slider currently produces, not the file's raw unweighted channels.
The switch SHALL default to off for each newly loaded file.

#### Scenario: Enabling mono during playback
- **WHEN** a user enables the mono switch while a file is playing
- **THEN** both output channels immediately carry the same combined signal

#### Scenario: Mono combines with the current balance setting
- **WHEN** the mono switch is enabled and the balance slider is set toward one side
- **THEN** the combined output reflects that balance-weighted mix, not an equal blend of both channels

#### Scenario: Disabling mono restores stereo output
- **WHEN** a user disables the mono switch
- **THEN** the left and right output channels separate again according to the current balance slider position

### Requirement: In-page tuner access
The player screen SHALL offer the tuner via the same floating, collapsible popup used on the tag detail screen, so a user can check pitch without leaving the player.
The floating tuner's position and the player's transport controls SHALL NOT overlap, in both its collapsed and expanded states.

#### Scenario: Opening the floating tuner on the player screen
- **WHEN** a user taps the floating tuner's toggle on the player screen
- **THEN** the tuner expands, the same way it does on the tag detail screen

#### Scenario: Floating tuner does not cover transport controls
- **WHEN** the floating tuner is expanded on the player screen
- **THEN** the play/pause, skip, timeline, balance, and mono controls remain fully visible and reachable

### Requirement: Screen wake lock during playback
While the loaded file is playing, the system SHALL request a screen wake lock to prevent the device display from dimming or locking.
The wake lock SHALL be released when playback is paused or stopped, when the player screen is left, or when the platform revokes it while backgrounded — re-requesting it if the user returns to the foreground with playback still active.
Failure to acquire the wake lock (including lack of platform support) SHALL be handled silently, with no error shown and no other functionality affected.

#### Scenario: Wake lock acquired on play
- **WHEN** a user starts playback
- **THEN** the system requests a screen wake lock

#### Scenario: Wake lock released on pause
- **WHEN** a user pauses playback
- **THEN** the held wake lock is released

#### Scenario: Wake lock released when leaving the player screen
- **WHEN** the user navigates away from the player screen while a file is playing
- **THEN** the held wake lock is released

#### Scenario: Unsupported browser is unaffected
- **WHEN** the Screen Wake Lock API is not available in the current browser
- **THEN** playback works normally with no error or change in behavior other than the screen following its normal timeout
