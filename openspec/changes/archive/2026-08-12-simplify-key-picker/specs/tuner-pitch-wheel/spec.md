## ADDED Requirements

### Requirement: Key-select mode changes wedge tap behavior
When key-select mode is active, tapping a wedge SHALL set the reference key to that wedge's note and switch to just-intonation mode, instead of playing that note's pitch-pipe tone.
While key-select mode is active, the wheel SHALL NOT start any tap-to-play or drag-to-glide gesture.

#### Scenario: Wedge tap sets the key instead of playing a tone
- **WHEN** the user taps a wedge while key-select mode is active
- **THEN** that note becomes the reference key, the tuner switches to just-intonation mode, and no oscillator tone is played

#### Scenario: Drag-to-glide is suspended during key-select mode
- **WHEN** the user presses and drags across the wheel while key-select mode is active
- **THEN** no notes are played as the pointer crosses wedges

### Requirement: Key-select mode makes the center face a visible "Equal Temp." button
When key-select mode is active, the wheel's center face SHALL render a visible button, bordered/shadowed to look distinctly tappable and labeled `Equal Temp.`, that switches the tuner to equal-temperament mode when tapped.
When key-select mode is inactive, the center face SHALL NOT intercept pointer input and SHALL NOT display the `Equal Temp.` button, preserving its existing idle/detected-pitch display.

#### Scenario: Center button selects equal temperament
- **WHEN** the user taps the center face's `Equal Temp.` button while key-select mode is active
- **THEN** the tuner switches to equal-temperament mode and key-select mode exits

#### Scenario: Center face is inert outside key-select mode
- **WHEN** key-select mode is inactive
- **THEN** the center face does not respond to pointer input, does not show the `Equal Temp.` button, and continues to display the detected note/octave/cents or nothing, as before this change

### Requirement: Wedges render a distinct visual tier during key-select mode
While key-select mode is active, every wedge SHALL render in a visual tier distinct from its normal idle, reference, and active tiers, so the wheel as a whole is visually distinguishable as being in a different mode without using any text.

#### Scenario: Wedges look different in key-select mode
- **WHEN** key-select mode is active
- **THEN** every wedge renders with a color treatment distinct from the idle tier it would otherwise show, communicating the mode change through color alone

#### Scenario: Wedges return to normal tiers on exit
- **WHEN** key-select mode exits, whether by selection, tapping outside, the button, or Escape
- **THEN** every wedge returns to rendering its normal idle/reference/active tier as determined by detected pitch and reference key

## REMOVED Requirements

### Requirement: No hint text on the wheel's center face
**Reason**: Key-select mode now shows a labeled `Equal Temp.` button in the center face for discoverability, which requires displaying text there. The blanket "no hint text in any state" rule is incompatible with that button.
**Migration**: The center face still shows no text outside key-select mode (idle/detected-pitch display unchanged, per the new "Key-select mode makes the center face a visible 'Equal Temp.' button" requirement's second sentence). Text is now permitted only for the `Equal Temp.` button label while key-select mode is active.

## MODIFIED Requirements

### Requirement: Equal temperament as a second tuning mode
The tuner SHALL support two temperament modes — just-intonation (relative to a selected reference key) and equal-temperament — as an independent axis from the selected reference key.
Switching modes SHALL NOT discard the last-selected reference key.
The reference key and temperament mode are set by tapping the pitch wheel's wedges or center face while key-select mode is active (toggled via the `tuner-key-picker` button), not by the wheel's normal tap-to-play/glide gesture.

#### Scenario: Cents readout reflects equal-tempered pitch in equal-temperament mode
- **WHEN** a pitch is detected while the tuner is in equal-temperament mode
- **THEN** the displayed cents offset is the raw equal-tempered deviation, without any just-intonation offset applied relative to a key

### Requirement: Wedge accessible label describes tap-to-play and glide
Each wedge's accessible label SHALL describe both that tapping it plays its tone and that dragging across the ring plays other notes as they're crossed, when key-select mode is inactive.
When key-select mode is active, each wedge's accessible label SHALL instead describe that tapping it sets the reference key to that note.

#### Scenario: Wedge accessible label mentions playing and gliding outside key-select mode
- **WHEN** an assistive technology reads a wedge's hit-target label while key-select mode is inactive
- **THEN** the label mentions both that tapping the wedge plays that note's tone and that dragging across the ring plays other notes as the pointer crosses them

#### Scenario: Wedge accessible label describes key selection during key-select mode
- **WHEN** an assistive technology reads a wedge's hit-target label while key-select mode is active
- **THEN** the label states that tapping the wedge sets the reference key to that note
