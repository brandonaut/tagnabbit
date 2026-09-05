## MODIFIED Requirements

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
