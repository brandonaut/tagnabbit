## ADDED Requirements

### Requirement: Accidental wedges show a secondary enharmonic name
Each of the 5 accidental note wedges (`C#/Db`, `D#/Eb`, `F#/Gb`, `Ab/G#`, `Bb/A#`) SHALL render both names as a stacked two-line label, with the first-listed name as primary (top line) and the second-listed name as secondary (bottom line).
The 7 natural-note wedges (`C D E F G A B`) SHALL continue to render a single-line label, unchanged.
This labeling SHALL be static: it does not depend on the currently selected reference key or temperament mode.

#### Scenario: Accidental wedge renders two stacked names
- **WHEN** the pitch wheel renders the wedge at note index 1 (sharp name `C#`)
- **THEN** the wedge displays `C#` as the top line and `Db` as the bottom line

#### Scenario: Flat-first accidental wedge renders flat name on top
- **WHEN** the pitch wheel renders the wedge at note index 8 (sharp name `G#`)
- **THEN** the wedge displays `Ab` as the top line and `G#` as the bottom line

#### Scenario: Natural note wedge is unaffected
- **WHEN** the pitch wheel renders a natural-note wedge (e.g. note index 0, `C`)
- **THEN** the wedge displays a single-line label reading `C`, with no secondary line

#### Scenario: Label does not change with selected key or temperament
- **WHEN** the user changes the reference key or switches temperament mode
- **THEN** every wedge's primary/secondary label content stays the same as before the change

### Requirement: Secondary enharmonic name is visually subordinate
The secondary (bottom) line of an accidental wedge's label SHALL render at a smaller font size and reduced opacity relative to the primary (top) line, while both lines SHALL use the same fill color rule as the wheel's existing active/inactive text color (`var(--note-text-on-active)` vs. `var(--text)`).

#### Scenario: Secondary line is smaller and fainter than primary
- **WHEN** an accidental wedge renders its two-line label
- **THEN** the bottom line's font size is smaller than the top line's, and the bottom line's opacity is lower than the top line's

#### Scenario: Secondary line follows active-state color like primary
- **WHEN** an accidental wedge becomes active (detected or played)
- **THEN** both the primary and secondary lines switch to the active-state text color, with the secondary line retaining its reduced opacity relative to the primary
