## MODIFIED Requirements

### Requirement: Playback transport controls
Once a file is loaded, the player SHALL provide play/pause, skip back 10 seconds, skip forward 10 seconds, and a scrubbable position control showing playback position and total duration.
The scrubbable position control SHALL be the full-track minimap scrubber (see the "Full-track minimap scrubber" requirement); the player SHALL NOT also present a separate plain range-slider timeline for the same purpose.
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

#### Scenario: Scrubbing to a new position
- **WHEN** a user scrubs the minimap scrubber to a new position
- **THEN** playback position updates to that point, and playback continues from there if it was already playing

### Requirement: Playback speed control
Once a track is loaded, the player SHALL provide "decrease speed" and "increase speed" buttons that step between the fixed values 0.5, 0.75, 0.9, 1, 1.25, 1.5, and 2 (each a multiple of the track's normal speed), moving to the adjacent value in that list.
The player SHALL display the current speed value next to those buttons.
The player SHALL NOT provide a dropdown or other picker for selecting the speed; the stepper buttons are the only speed control.
The decrease-speed button SHALL have no effect when the speed is already at the lowest offered value (0.5), and the increase-speed button SHALL have no effect when the speed is already at the highest offered value (2) — neither button SHALL wrap around to the opposite end of the list.
Stepping to a value SHALL apply it to playback immediately, whether the track is currently playing or paused, and SHALL NOT change the current playback position.
The system SHALL preserve the pitch of the audio at every speed, so slowing down or speeding up does not raise or lower the pitch of the recording.
The speed control SHALL default to 1 (normal speed) whenever a track is selected, including switching between playlist tracks — speed is not remembered per track.

#### Scenario: Changing speed during playback
- **WHEN** a user steps the speed to a different value while a track is playing
- **THEN** playback continues from the same position at the newly selected speed

#### Scenario: Changing speed while paused
- **WHEN** a user steps the speed to a different value while a track is paused
- **THEN** the paused position is unchanged, and playback uses the newly selected speed once resumed

#### Scenario: Pitch stays constant across speeds
- **WHEN** a user sets a speed other than 1
- **THEN** the audio plays faster or slower without shifting the pitch of the recording

#### Scenario: Speed persists across pause and resume
- **WHEN** a user sets a non-default speed, pauses, then resumes playback
- **THEN** playback resumes at the previously selected speed

#### Scenario: Switching tracks resets speed to normal
- **WHEN** a user selects a different track in the playlist
- **THEN** the speed control resets to 1x, regardless of what it was set to for the previously active track

#### Scenario: Stepping speed down
- **WHEN** a user activates the decrease-speed button while the current speed is not already the lowest offered value
- **THEN** the speed moves to the next lower value in the fixed list and applies immediately, and the displayed speed value updates

#### Scenario: Stepping speed up
- **WHEN** a user activates the increase-speed button while the current speed is not already the highest offered value
- **THEN** the speed moves to the next higher value in the fixed list and applies immediately, and the displayed speed value updates

#### Scenario: Decrease button at the lowest speed
- **WHEN** a user activates the decrease-speed button while the speed is already at the lowest offered value
- **THEN** the speed is unchanged

#### Scenario: Increase button at the highest speed
- **WHEN** a user activates the increase-speed button while the speed is already at the highest offered value
- **THEN** the speed is unchanged

### Requirement: Waveform drag-to-scrub
The waveform SHALL support its own drag gesture, independent of the minimap scrubber, that scrubs playback position as the user drags.
A press-and-release on the waveform SHALL only be treated as a drag once the pointer has moved beyond a small movement threshold; a press-and-release that never crosses that threshold is a tap, governed by the waveform tap-to-toggle requirement instead, and SHALL NOT scrub position.
Dragging the waveform SHALL update playback position live as the drag moves, and SHALL leave the waveform reflecting the dragged position until the drag ends.
Dragging SHALL NOT itself start or stop playback: if playback was paused when the drag starts, it SHALL remain paused (silently) throughout and after the drag; if it was already playing, it SHALL continue playing at the newly dragged position.
Scrubbing via the waveform SHALL update the same playback position used by the minimap scrubber, so the two controls never disagree about the current position.

#### Scenario: Dragging the waveform scrubs playback
- **WHEN** a user drags on the waveform
- **THEN** playback position updates live to follow the drag, and the minimap scrubber reflects the same position

#### Scenario: Dragging while paused stays silent
- **WHEN** a user drags on the waveform while playback is paused
- **THEN** the position updates to follow the drag, but no sound is produced, and the file remains paused after the drag ends

#### Scenario: Dragging while playing continues playing at the new position
- **WHEN** a user drags on the waveform while playback is playing
- **THEN** playback continues, audibly following the dragged position, and is still playing once the drag ends

#### Scenario: Waveform scrubbing is independent of the minimap scrubber
- **WHEN** a user drags the waveform
- **THEN** the minimap scrubber's own tap/drag behavior is unaffected and remains available for jumping to any point in the track

### Requirement: In-page tuner access
The player screen SHALL offer the tuner via the same floating, collapsible popup used on the tag detail screen, so a user can check pitch without leaving the player.
The floating tuner's position and the player's transport controls SHALL NOT overlap, in both its collapsed and expanded states.

#### Scenario: Opening the floating tuner on the player screen
- **WHEN** a user taps the floating tuner's toggle on the player screen
- **THEN** the tuner expands, the same way it does on the tag detail screen

#### Scenario: Floating tuner does not cover transport controls
- **WHEN** the floating tuner is expanded on the player screen
- **THEN** the play/pause, skip, minimap scrubber, balance, and mono controls remain fully visible and reachable

## ADDED Requirements

### Requirement: Full-track minimap scrubber
Once a file is loaded, the player SHALL display a minimap scrubber: a compact, full-width visualization of the entire track's audio, positioned below the panning waveform display.
The minimap SHALL represent the whole track's duration across its full width, so any point in the track is directly reachable, and SHALL derive its visualization from the same waveform data already computed for the panning waveform display, without any additional audio decoding.
Tapping or dragging anywhere on the minimap SHALL seek playback to the absolute position corresponding to that horizontal location (left edge = start of track, right edge = end of track), unlike the waveform's relative drag gesture.
Seeking via the minimap SHALL update the same playback position used by the waveform, SHALL apply live while dragging, and SHALL NOT itself start or stop playback: a paused track stays paused (silently), a playing track keeps playing from the new position.
The minimap SHALL show a playhead marker at the current playback position and a window indicator marking the portion of the track currently visible in the panning waveform display, both updating as playback advances.
While the track's waveform data is still being computed, the minimap MAY show a lightweight placeholder, and the rest of the player SHALL remain usable; if waveform computation fails, the minimap MAY be omitted with no error shown, and seeking SHALL remain possible via the keyboard/assistive-technology control below.
The player SHALL provide a keyboard- and assistive-technology-accessible position control (a visually hidden range input covering the minimap area, labelled as the playback position) that seeks to an absolute position, kept in sync with the minimap and the waveform.

#### Scenario: Tapping the minimap jumps to that position
- **WHEN** a user taps the minimap near its right end while playback is early in a long track
- **THEN** playback position jumps to the corresponding point near the end of the track, and the waveform and playhead update to match

#### Scenario: Dragging across the minimap scrubs the whole track
- **WHEN** a user presses on the minimap and drags from one side to the other
- **THEN** playback position follows the drag across the entire track duration, live, ending at the position under the release point

#### Scenario: Minimap seek does not change play/pause state
- **WHEN** a user taps or drags the minimap while playback is paused
- **THEN** the position updates but no sound is produced and the track stays paused; and when done while playing, playback continues from the new position

#### Scenario: Window indicator tracks the visible waveform slice
- **WHEN** a track is playing and the panning waveform display scrolls
- **THEN** the minimap's window indicator moves and/or resizes to mark the portion of the track currently shown in the waveform display

#### Scenario: Playhead reflects current position
- **WHEN** playback advances
- **THEN** the minimap playhead marker moves to stay at the current playback position along the track

#### Scenario: Keyboard seek via the hidden position control
- **WHEN** a user focuses the visually hidden playback-position control and changes its value with the keyboard
- **THEN** playback seeks to the corresponding absolute position, and the minimap playhead and the waveform update to match

#### Scenario: Minimap unavailable when waveform computation fails
- **WHEN** waveform data cannot be computed for the loaded track
- **THEN** the player continues to function, the minimap may be absent with no error shown, and the user can still seek using the keyboard/assistive-technology position control
