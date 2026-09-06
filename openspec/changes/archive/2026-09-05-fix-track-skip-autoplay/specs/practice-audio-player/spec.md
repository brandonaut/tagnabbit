## MODIFIED Requirements

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
