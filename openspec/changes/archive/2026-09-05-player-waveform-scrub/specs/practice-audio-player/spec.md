## ADDED Requirements

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
