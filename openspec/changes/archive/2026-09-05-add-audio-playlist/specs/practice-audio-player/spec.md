## REMOVED Requirements

### Requirement: Loading a local audio file
**Reason**: Replaced by a playlist model — see the ADDED "Adding tracks to the playlist" and "Selecting a track from the playlist" requirements.
**Migration**: None needed for end users; there is no data to migrate since the prior single-file record is superseded by the new playlist store.

### Requirement: Remembering the loaded file across sessions
**Reason**: Replaced by a playlist model — see the ADDED "Playlist persistence across sessions" requirement.
**Migration**: None needed for end users; there is no data to migrate since the prior single-file record is superseded by the new playlist store.

## MODIFIED Requirements

### Requirement: Left/right balance adjustment
The player SHALL provide a slider that adjusts the relative volume of the currently active track's own left and right channels during playback.
At the centered position, both channels play at their original volume.
Moving the slider toward one side SHALL fade down the opposite channel's volume, so that at a full-left or full-right position only that channel's content is audible.
The slider SHALL NOT move or swap which output speaker each channel plays through.
The slider SHALL default to centered whenever a track is selected, including switching between playlist tracks — balance is not remembered per track.
The player SHALL display the current balance as a percentage next to the slider, indicating which side it favors (or that it is centered), updating as the slider moves.
Double-tapping (touch) or double-clicking (mouse) the slider SHALL reset the balance to centered.

#### Scenario: Adjusting balance during playback
- **WHEN** a user moves the balance slider while a track is playing
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

#### Scenario: Switching tracks resets balance to centered
- **WHEN** a user selects a different track in the playlist
- **THEN** the balance slider resets to centered, regardless of what it was set to for the previously active track

### Requirement: Mono output switch
The player SHALL provide a switch that, when enabled, combines the balance-adjusted left and right channels of the currently active track into a single signal and plays that same signal on both output channels.
The switch SHALL apply on top of whatever mix the balance slider currently produces, not the track's raw unweighted channels.
The switch SHALL be a single setting shared across the whole player, independent of which playlist track is currently active: it SHALL NOT reset or change when switching tracks, and SHALL default to off only the first time the player is used.

#### Scenario: Enabling mono during playback
- **WHEN** a user enables the mono switch while a track is playing
- **THEN** both output channels immediately carry the same combined signal

#### Scenario: Mono combines with the current balance setting
- **WHEN** the mono switch is enabled and the balance slider is set toward one side
- **THEN** the combined output reflects that balance-weighted mix, not an equal blend of both channels

#### Scenario: Disabling mono restores stereo output
- **WHEN** a user disables the mono switch
- **THEN** the left and right output channels separate again according to the current balance slider position

#### Scenario: Switching tracks does not change the mono setting
- **WHEN** a user switches from one playlist track to another
- **THEN** the mono switch stays exactly as it was, regardless of which track is now active

### Requirement: Playback speed control
Once a track is loaded, the player SHALL provide a dropdown for selecting the playback speed, offering the fixed values 0.5, 0.75, 0.9, 1, 1.25, 1.5, and 2 (each a multiple of the track's normal speed).
Selecting a value SHALL apply it to playback immediately, whether the track is currently playing or paused, and SHALL NOT change the current playback position.
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

## ADDED Requirements

### Requirement: Adding tracks to the playlist
The player screen SHALL let the user add one or more audio files to a persisted playlist, via a file picker supporting multiple selection and via dragging one or more files onto the screen.
Adding tracks SHALL append them to the existing playlist rather than replacing it.

#### Scenario: Adding multiple files via the picker at once
- **WHEN** a user selects multiple audio files through the file picker in a single action
- **THEN** all selected files are added to the playlist

#### Scenario: Adding files via drag-and-drop
- **WHEN** a user drags one or more audio files onto the player screen and drops them
- **THEN** all dropped files are added to the playlist the same as if chosen via the picker

#### Scenario: Adding tracks does not disturb playback or the existing playlist
- **WHEN** a track is already loaded and playing, and the user adds more files
- **THEN** playback of the currently active track continues uninterrupted, and the new files are appended to the end of the playlist

### Requirement: Playlist persistence across sessions
The system SHALL persist the playlist — each track's audio file and its position in the playlist order — and SHALL restore it the next time the player screen is opened, including after a fresh page load.
The system SHALL also persist a single global mono setting shared across all tracks.
Playback position, balance, and speed SHALL NOT be persisted for any track: every track SHALL begin at position zero, centered balance, and normal (1x) speed whenever it is selected, including when the playlist is restored.
The playlist SHALL NOT be automatically pruned or evicted to free storage space. If storage capacity is exceeded while adding tracks, the system SHALL show a clear message rather than silently discarding an existing or newly added track.
Failure to persist or restore (including lack of storage support) SHALL be handled silently, falling back to an empty playlist with no error shown and no other functionality affected.

#### Scenario: Reopening the player restores the playlist
- **WHEN** a user leaves the player screen with tracks in the playlist, then returns later (including a fresh page load)
- **THEN** the playlist reappears in the same order, and the global mono setting is as it was left

#### Scenario: Adding tracks updates what is persisted
- **WHEN** a user adds new tracks to the playlist
- **THEN** the persisted playlist includes the new tracks going forward

#### Scenario: Storage capacity exceeded while adding tracks
- **WHEN** the device's storage capacity is exceeded while adding one or more tracks
- **THEN** a clear message is shown, and any tracks that already fit remain in the playlist unaffected

#### Scenario: Storage unavailable
- **WHEN** the system cannot persist or restore the playlist (storage unsupported or similar)
- **THEN** the player still functions normally for the current session, showing an empty playlist on the next visit instead of erroring

### Requirement: Selecting a track from the playlist
Tapping a track in the playlist SHALL load it — resetting balance to centered, speed to 1x, and position to zero, and applying the player's current global mono setting — and SHALL immediately begin playback without requiring a separate play action.

#### Scenario: Selecting a track autoplays it
- **WHEN** a user taps a track in the playlist
- **THEN** the track loads at position zero, with centered balance and normal speed, and starts playing immediately

#### Scenario: Selecting a different track stops the previous one
- **WHEN** a track is playing and the user selects a different track
- **THEN** the previous track stops, and the newly selected track loads and begins playing per the above

### Requirement: Reordering the playlist
The playlist SHALL provide a drag handle on each track that lets the user reorder tracks via a pointer-based drag gesture, usable with both touch and mouse input.
The resulting order SHALL be persisted.

#### Scenario: Reordering via drag handle
- **WHEN** a user drags a track's handle to a new position in the list
- **THEN** the track moves to that position, and the list reflects the new order immediately

#### Scenario: Reordering persists across sessions
- **WHEN** a user reopens the player after reordering the playlist
- **THEN** the playlist appears in the last-set order

### Requirement: Removing a track from the playlist
The playlist SHALL let the user remove a track via a swipe gesture (touch) or a hover-revealed delete control (mouse), without requiring a confirmation step.
Removing a track SHALL delete its cached audio data from storage.

#### Scenario: Removing via swipe
- **WHEN** a user swipes a track in the playlist
- **THEN** the track is removed immediately, with no confirmation prompt

#### Scenario: Removing via a hover-revealed delete control
- **WHEN** a user hovers over a track (mouse) to reveal its delete control and activates it
- **THEN** the track is removed immediately, with no confirmation prompt

#### Scenario: Removing the currently active track while others remain
- **WHEN** a user removes the track that is currently loaded and playing, and at least one other track remains in the playlist
- **THEN** playback of the removed track stops, and the first remaining track becomes active (loaded, paused), per the "Always an active track" requirement

#### Scenario: Removing the last remaining track
- **WHEN** a user removes the track that is currently loaded and playing, and no other tracks remain in the playlist
- **THEN** playback stops and the player returns to its empty (no track active) state

### Requirement: Always an active track when the playlist is non-empty
Whenever the playlist contains at least one track, exactly one of them SHALL be the active track — the player SHALL NOT show an empty (no track selected) state while tracks exist.
If no active track is established by an explicit user selection, the player SHALL fall back to the first track in playlist order, loaded but paused (not autoplaying, since no user gesture selected it).
This fallback SHALL apply when the playlist is restored on a fresh page load with no valid persisted active track, when tracks are added to a playlist that had none active, and when the active track is removed while others remain.

#### Scenario: Restoring a playlist with no valid active track
- **WHEN** the player screen opens and the persisted playlist is non-empty but has no active track (or its persisted active track no longer exists)
- **THEN** the first track in playlist order loads as the active track, paused

#### Scenario: Adding the first tracks to an empty playlist
- **WHEN** a user adds one or more tracks while the playlist was previously empty
- **THEN** the first of the newly added tracks becomes the active track, loaded and paused

### Requirement: Jumping between playlist tracks
The player SHALL provide a "next track" control that loads and begins playing the next track in playlist order after the currently active one, if a next track exists.
The player SHALL provide a "previous track" control with two-step behavior: if the current playback position is more than a few seconds past the start, activating it SHALL restart the active track from position zero without switching tracks; if the current position is already at or near the start, activating it SHALL instead load and begin playing the previous track in playlist order, if one exists.
Activating the previous-track control while at or near the start of the first track in the playlist (no earlier track to fall back to) SHALL simply restart the active track from zero.
Activating the next-track control while the active track is the last one in the playlist SHALL jump the active track to its own end, mirroring the previous-track control's fallback of acting on the current track when there is nowhere else to go.

#### Scenario: Jumping to the next track
- **WHEN** a user activates the next-track control while a track other than the last one is active
- **THEN** the next track in playlist order loads and begins playing immediately

#### Scenario: Next-track control at the end of the playlist
- **WHEN** a user activates the next-track control while the last track in the playlist is active
- **THEN** the active track jumps to its own end rather than switching tracks, since there is no next track

#### Scenario: Jumping backward restarts the current track first
- **WHEN** a user activates the previous-track control while more than a few seconds into the active track
- **THEN** the active track's position jumps back to zero, without switching tracks

#### Scenario: Jumping backward again moves to the previous track
- **WHEN** a user activates the previous-track control again while already at or near the start of the active track
- **THEN** the previous track in playlist order loads and begins playing immediately

#### Scenario: Previous-track control at the start of the playlist
- **WHEN** a user activates the previous-track control while at or near the start of the first track in the playlist
- **THEN** the active track simply restarts from zero, since there is no earlier track to move to

### Requirement: Auto-advance to the next track at the end of playback
When the active track reaches the end of its duration while playing (not via a manual skip or scrub), the player SHALL automatically load and begin playing the next track in playlist order, if one exists.
If the active track is the last one in the playlist, reaching its end SHALL simply stop playback there, leaving that track as the active (but no longer playing) track.

#### Scenario: Track ends with a next track available
- **WHEN** the active track reaches the end of its duration while playing, and a next track exists in the playlist
- **THEN** the next track loads and begins playing automatically, without user action

#### Scenario: Last track in the playlist ends
- **WHEN** the active track reaches the end of its duration while playing, and it is the last track in the playlist
- **THEN** playback simply stops at the end of that track, which remains the active track
