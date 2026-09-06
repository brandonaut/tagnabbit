## MODIFIED Requirements

### Requirement: Adding tracks to the playlist
The player screen SHALL let the user add one or more audio files to a persisted playlist, via a file picker supporting multiple selection and via dragging one or more files onto the playlist track-list region of the player screen.
Adding tracks SHALL append them to the existing playlist rather than replacing it.

#### Scenario: Adding multiple files via the picker at once
- **WHEN** a user selects multiple audio files through the file picker in a single action
- **THEN** all selected files are added to the playlist

#### Scenario: Adding files via drag-and-drop onto the list
- **WHEN** a user drags one or more audio files onto the playlist track-list region and drops them
- **THEN** all dropped files are added to the playlist the same as if chosen via the picker

#### Scenario: Adding tracks does not disturb playback or the existing playlist
- **WHEN** a track is already loaded and playing, and the user adds more files
- **THEN** playback of the currently active track continues uninterrupted, and the new files are appended to the end of the playlist

### Requirement: In-page tuner access
The player screen SHALL offer the tuner via the same floating, collapsible popup used on the tag detail screen, so a user can check pitch without leaving the player.
The floating tuner MAY visually overlap the player's transport controls in the current layout; keeping them clear of each other is deferred to a later change and is not guaranteed here.

#### Scenario: Opening the floating tuner on the player screen
- **WHEN** a user taps the floating tuner's toggle on the player screen
- **THEN** the tuner expands, the same way it does on the tag detail screen

## ADDED Requirements

### Requirement: Player screen layout
The player screen SHALL present the playlist inline, always visible, without requiring the user to open a separate view, dialog, or panel to see or manage it.
The screen SHALL be laid out as a fixed vertical stack sized to the visible viewport (minus the app's bottom tab bar), with three regions top to bottom: a playlist header showing the track count and an add-files control; the scrollable list of tracks; and the player block containing the track name, waveform, minimap scrubber, transport controls, and playback adjustments.
Only the track list SHALL scroll. The playlist header and the player block SHALL keep their positions as the list scrolls, and the screen as a whole SHALL NOT scroll.
The player block SHALL sit at the bottom of the screen, directly above the tab bar, so the transport controls fall within comfortable thumb reach.
When the playlist is empty, the list region SHALL show the "playlist is empty" prompt and the player block SHALL be hidden.

#### Scenario: Playlist is visible without opening anything
- **WHEN** the user opens the player screen with a non-empty playlist
- **THEN** the list of tracks is shown inline with the player controls, with no button to press or panel to open first

#### Scenario: Only the track list scrolls
- **WHEN** the playlist has more tracks than fit in the list region
- **THEN** the list region scrolls to reveal them while the playlist header stays at the top and the player block stays pinned at the bottom, and the screen itself does not scroll

#### Scenario: Transport controls are at the bottom
- **WHEN** a track is active on the player screen
- **THEN** the transport controls are rendered in the player block at the bottom of the screen, directly above the tab bar

#### Scenario: Empty playlist hides the player block
- **WHEN** the playlist has no tracks
- **THEN** the list region shows the "playlist is empty" prompt and the player block (track name, waveform, transport, adjustments) is not shown

#### Scenario: Adding the first track shows the player block
- **WHEN** the user adds one or more files to a previously empty playlist
- **THEN** the empty prompt is replaced by the track list and the player block appears with the first added track active and paused
