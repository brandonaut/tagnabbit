## Purpose

Lets a user load a local audio recording and play it back with transport controls and an adjustable left/right balance, so they can practice singing along with a track.

## Requirements

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
The player SHALL provide a "next track" control that loads the next track in playlist order after the currently active one, if a next track exists, preserving whatever play/pause state was already in effect (continuing to play if playback was already playing, remaining paused if it was paused).
The player SHALL provide a "previous track" control with two-step behavior: if the current playback position is more than a few seconds past the start, activating it SHALL restart the active track from position zero without switching tracks; if the current position is already at or near the start, activating it SHALL instead load the previous track in playlist order, if one exists, likewise preserving whatever play/pause state was already in effect.
Activating the previous-track control while at or near the start of the first track in the playlist (no earlier track to fall back to) SHALL simply restart the active track from zero.
Activating the next-track control while the active track is the last one in the playlist SHALL jump the active track to its own end, mirroring the previous-track control's fallback of acting on the current track when there is nowhere else to go.

#### Scenario: Jumping to the next track while playing
- **WHEN** a user activates the next-track control while a track other than the last one is active and playback is currently playing
- **THEN** the next track in playlist order loads and continues playing immediately

#### Scenario: Jumping to the next track while paused
- **WHEN** a user activates the next-track control while a track other than the last one is active and playback is currently paused
- **THEN** the next track in playlist order loads at its start, remaining paused

#### Scenario: Next-track control at the end of the playlist
- **WHEN** a user activates the next-track control while the last track in the playlist is active
- **THEN** the active track jumps to its own end rather than switching tracks, since there is no next track

#### Scenario: Jumping backward restarts the current track first
- **WHEN** a user activates the previous-track control while more than a few seconds into the active track
- **THEN** the active track's position jumps back to zero, without switching tracks

#### Scenario: Jumping backward again moves to the previous track while playing
- **WHEN** a user activates the previous-track control again while already at or near the start of the active track, and playback is currently playing
- **THEN** the previous track in playlist order loads and continues playing immediately

#### Scenario: Jumping backward again moves to the previous track while paused
- **WHEN** a user activates the previous-track control again while already at or near the start of the active track, and playback is currently paused
- **THEN** the previous track in playlist order loads at its start, remaining paused

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
