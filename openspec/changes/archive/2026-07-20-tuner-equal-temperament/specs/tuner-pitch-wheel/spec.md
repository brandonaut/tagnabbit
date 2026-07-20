## MODIFIED Requirements

### Requirement: State-driven wedge color intensity
Each wedge's saturation and lightness SHALL vary across three tiers — idle, reference key, and active — while its hue stays fixed.
This lets the current state of a wedge be distinguishable primarily through a lightness/chroma contrast rather than through hue alone.

#### Scenario: Idle wedge shows a low-saturation tint of its hue
- **WHEN** a wedge is not the detected pitch, not being played, and not the current reference key
- **THEN** it renders with a low-chroma tint of its own hue, rather than a flat muted-gray fill

#### Scenario: Reference-key wedge shows a distinct marker
- **WHEN** a wedge's note is the currently selected reference key, it is not otherwise active, and the tuner is in just-intonation mode
- **THEN** it renders a marker (at the label ring) colored with that note's own hue, at a chroma level between the idle and active tiers

#### Scenario: No reference marker in equal-temperament mode
- **WHEN** the tuner is in equal-temperament mode
- **THEN** no wedge renders the reference-key marker, regardless of which note was last selected as the key

#### Scenario: Active wedge shows a full-saturation fill
- **WHEN** a wedge's note is either the currently detected pitch or is being played via the tap-to-hear gesture
- **THEN** it renders a high-chroma, high-contrast fill in that note's own hue

## ADDED Requirements

### Requirement: Equal temperament as a second tuning mode
The tuner SHALL support two temperament modes — just-intonation (relative to a selected reference key) and equal-temperament — as an independent axis from the selected reference key. Switching modes SHALL NOT discard the last-selected reference key.

#### Scenario: Dragging outside the drop zone switches to equal temperament
- **WHEN** the user drags a wedge past the drag dead-zone and releases outside the center drop zone
- **THEN** the tuner switches to equal-temperament mode

#### Scenario: Committing a key returns to just-intonation mode
- **WHEN** the user drags a wedge into the center drop zone and releases, committing that note as the reference key
- **THEN** the tuner switches to (or remains in) just-intonation mode, using the newly committed key

#### Scenario: Cents readout reflects equal-tempered pitch in equal-temperament mode
- **WHEN** a pitch is detected while the tuner is in equal-temperament mode
- **THEN** the displayed cents offset is the raw equal-tempered deviation, without any just-intonation offset applied relative to a key

#### Scenario: Cancelled gestures do not change temperament
- **WHEN** a drag gesture is interrupted (pointer cancel) rather than cleanly released, regardless of whether it was armed to commit a key or armed to switch to equal temperament
- **THEN** neither the reference key nor the temperament mode changes

### Requirement: Key label reflects current temperament mode
The "Key: …" label below the wheel SHALL reflect which temperament mode is active.

#### Scenario: Key label shows the note name in just-intonation mode
- **WHEN** the tuner is in just-intonation mode
- **THEN** the label reads "Key: " followed by the selected reference key's note name

#### Scenario: Key label shows equal temperament
- **WHEN** the tuner is in equal-temperament mode
- **THEN** the label reads "Key: Equal temperament"

### Requirement: Armed equal-temperament preview
While a drag gesture is armed to switch to equal temperament (past the dead-zone, outside the drop zone), the wheel's center face SHALL preview that outcome, distinct from the armed reference-key preview.

#### Scenario: Dragging a wedge away from center previews equal temperament
- **WHEN** the user drags a wedge past the drag dead-zone and it sits outside the center drop zone
- **THEN** the center face displays a plain-text "Equal Temp" preview, not colored with any note's hue

### Requirement: Hold-to-play hint indicates the drag gesture
While a wedge is being held (tap-to-play, before the drag dead-zone is exceeded), the wheel's center face SHALL hint that dragging is also possible.

#### Scenario: Holding a wedge shows a drag hint
- **WHEN** the user presses and holds a wedge without yet exceeding the drag dead-zone
- **THEN** the center face displays a hint indicating the note can be dragged to the center

### Requirement: Idle hint indicates both tap and drag gestures
When no gesture is in progress and no pitch is currently detected, the wheel's center face SHALL display a single, constant hint covering both the tap-to-play and drag-to-set-key gestures, regardless of whether the microphone is active.

#### Scenario: Idle center shows a combined gesture hint
- **WHEN** no gesture is in progress and no pitch is currently detected
- **THEN** the center face displays a hint indicating a wedge can be tapped to play or dragged to set the key, whether or not the microphone is currently listening

### Requirement: Drag gesture accessible label mentions both outcomes
Each wedge's accessible label SHALL describe both possible drag outcomes, not only the drag-to-center outcome.

#### Scenario: Wedge accessible label mentions equal temperament
- **WHEN** an assistive technology reads a wedge's hit-target label
- **THEN** the label mentions playing the note, dragging to the center to set it as the reference key, and dragging away to switch to equal temperament

### Requirement: Page-level default temperament
The `Tuner` component SHALL accept an optional default temperament, used when there is no meaningful reference key to default to.

#### Scenario: Search page starts in equal-temperament mode
- **WHEN** the tuner is opened on the search page, which has no specific tag or key context
- **THEN** it starts in equal-temperament mode

#### Scenario: Tag page starts in just-intonation mode
- **WHEN** the tuner is opened on a tag page
- **THEN** it starts in just-intonation mode using that tag's key, as before
