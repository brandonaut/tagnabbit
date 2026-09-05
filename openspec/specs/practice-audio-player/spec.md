## Purpose

Lets a user load a local audio recording and play it back with transport controls and an adjustable left/right balance, so they can practice singing along with a track.

## Requirements

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
The player SHALL display the current balance as a percentage next to the slider, indicating which side it favors (or that it is centered), updating as the slider moves.
Double-tapping (touch) or double-clicking (mouse) the slider SHALL reset the balance to centered.

#### Scenario: Adjusting balance during playback
- **WHEN** a user moves the balance slider while a file is playing
- **THEN** the volume of each channel changes immediately to match the slider position

#### Scenario: Isolating a single channel at a balance extreme
- **WHEN** a user moves the balance slider to its full-left or full-right position
- **THEN** only that side's channel content is audible, with the opposite channel faded to silent

#### Scenario: Balance persists across pause and resume
- **WHEN** a user sets a non-centered balance, pauses, then resumes playback
- **THEN** playback resumes at the previously set balance

#### Scenario: Percentage readout reflects slider position
- **WHEN** a user moves the balance slider to a non-centered position
- **THEN** the displayed percentage updates to show how far left or right the balance is set, and shows the balance as centered when the slider is at its midpoint

#### Scenario: Resetting balance with a double-tap
- **WHEN** a user double-taps or double-clicks the balance slider while it is set away from center
- **THEN** the balance immediately returns to centered, and the percentage readout updates to reflect that

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

### Requirement: Panning waveform display
Once a file is loaded, the player SHALL display a waveform of the file's audio above the timeline slider, panning horizontally as playback position advances so the waveform content stays aligned with a playhead marker.
The playhead SHALL remain centered while the current position is in the middle of the track, and SHALL move toward the left edge of the display as the position approaches the start of the track and toward the right edge as it approaches the end, so the display never shows empty space beyond the track's actual start or end.
The waveform SHALL represent a mono downmix of the file's audio content.
While the waveform is being computed for a newly loaded file, the player SHALL show a lightweight placeholder in its place, and playback, the timeline slider, and other transport controls SHALL remain usable during that computation.
If waveform computation fails (including unsupported audio formats), the player SHALL continue to function normally without a waveform, with no error shown to the user.

#### Scenario: Waveform appears after loading a file
- **WHEN** a user loads an audio file
- **THEN** the player shows a placeholder above the timeline slider, then replaces it with the file's waveform once computed

#### Scenario: Playback and transport remain usable while the waveform computes
- **WHEN** a user starts playback or uses the timeline slider while the waveform placeholder is still showing
- **THEN** playback and the timeline slider respond normally, unaffected by the waveform still being computed

#### Scenario: Waveform pans with playback
- **WHEN** a file is playing and the current position is in the middle of the track
- **THEN** the waveform pans horizontally beneath a centered playhead to track the current playback position

#### Scenario: Playhead reaches the edges near the start and end of the track
- **WHEN** the current position is at or close to the very start or very end of the track
- **THEN** the playhead moves toward the corresponding edge of the display (left at the start, right at the end) instead of remaining centered, and no empty space is shown beyond the track's actual content

#### Scenario: Waveform reflects a new file
- **WHEN** a user loads a different file while a waveform is already displayed
- **THEN** the displayed waveform is replaced by the placeholder and then the new file's waveform, matching the newly loaded audio

#### Scenario: Waveform computation fails silently
- **WHEN** the player cannot compute a waveform for the loaded file
- **THEN** the player continues to function normally for playback and scrubbing, with no waveform shown and no error displayed

### Requirement: Waveform drag-to-scrub
The waveform SHALL support its own drag gesture, independent of the timeline slider, that scrubs playback position as the user drags.
A press-and-release on the waveform SHALL only be treated as a drag once the pointer has moved beyond a small movement threshold; a press-and-release that never crosses that threshold is a tap, governed by the waveform tap-to-toggle requirement instead, and SHALL NOT scrub position.
Dragging the waveform SHALL update playback position live as the drag moves, and SHALL leave the waveform reflecting the dragged position until the drag ends.
Dragging SHALL NOT itself start or stop playback: if playback was paused when the drag starts, it SHALL remain paused (silently) throughout and after the drag; if it was already playing, it SHALL continue playing at the newly dragged position.
Scrubbing via the waveform SHALL update the same playback position used by the timeline slider, so the two controls never disagree about the current position.

#### Scenario: Dragging the waveform scrubs playback
- **WHEN** a user drags on the waveform
- **THEN** playback position updates live to follow the drag, and the timeline slider reflects the same position

#### Scenario: Dragging while paused stays silent
- **WHEN** a user drags on the waveform while playback is paused
- **THEN** the position updates to follow the drag, but no sound is produced, and the file remains paused after the drag ends

#### Scenario: Dragging while playing continues playing at the new position
- **WHEN** a user drags on the waveform while playback is playing
- **THEN** playback continues, audibly following the dragged position, and is still playing once the drag ends

#### Scenario: Waveform scrubbing is independent of the timeline slider
- **WHEN** a user drags the waveform
- **THEN** the timeline slider's own drag behavior is unaffected and remains available for jumping to any point in the track

### Requirement: Waveform tap toggles playback
Tapping the waveform (a press and release that does not cross the drag movement threshold) SHALL toggle play/pause from the current playback position, the same as the main play/pause button, without changing playback position.

#### Scenario: Tapping while paused starts playback
- **WHEN** a user taps the waveform while playback is paused
- **THEN** playback starts from the current position, unchanged by the tap

#### Scenario: Tapping while playing pauses playback
- **WHEN** a user taps the waveform while playback is playing
- **THEN** playback pauses at the current position, unchanged by the tap

#### Scenario: A tap does not scrub position
- **WHEN** a user taps the waveform
- **THEN** playback position is the same immediately before and after the tap
