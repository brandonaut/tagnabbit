## ADDED Requirements

### Requirement: Accidental grid cells show a secondary enharmonic name
Each of the 5 accidental note cells in the key picker's grid (`C#/Db`, `D#/Eb`, `F#/Gb`, `Ab/G#`, `Bb/A#`) SHALL render both names as a stacked two-line label, matching the primary/secondary ordering and visual hierarchy used by the pitch wheel's wedges.
The 7 natural-note cells SHALL continue to render a single-line label, unchanged.

#### Scenario: Accidental grid cell renders two stacked names
- **WHEN** the dropdown grid renders the cell at note index 1 (sharp name `C#`)
- **THEN** the cell displays `C#` as the top line and `Db` as the bottom line, styled as visually subordinate to the top line

#### Scenario: Flat-first accidental grid cell renders flat name on top
- **WHEN** the dropdown grid renders the cell at note index 8 (sharp name `G#`)
- **THEN** the cell displays `Ab` as the top line and `G#` as the bottom line, styled as visually subordinate to the top line

#### Scenario: Natural note grid cell is unaffected
- **WHEN** the dropdown grid renders a natural-note cell (e.g. note index 0, `C`)
- **THEN** the cell displays a single-line label reading `C`, with no secondary line

### Requirement: All 12 grid cells stay a consistent size
All 12 note cells in the key picker's grid SHALL render at the same size as each other, regardless of whether a given cell shows a one-line or two-line label.
The separate, full-width Equal Temperament button below the grid is exempt from this and MAY differ in size from the grid cells.

#### Scenario: Two-line cell matches one-line cell size
- **WHEN** the dropdown grid renders a two-line accidental cell next to a one-line natural-note cell
- **THEN** both cells render at the same size, with the two-line cell's content fit within that shared size rather than growing the cell

#### Scenario: Equal Temperament button size is unaffected by this constraint
- **WHEN** the dropdown renders the Equal Temperament button
- **THEN** its size is governed by its own existing full-width layout, not by the grid cells' shared size

### Requirement: Accessible label includes both names for accidental cells
An accidental grid cell's accessible name SHALL identify both the primary and secondary note names, so assistive technology conveys the same information the two-line visual label conveys.

#### Scenario: Screen reader announces both names for an accidental cell
- **WHEN** an assistive technology reads the grid cell at note index 1
- **THEN** its accessible name identifies both `C#` and `Db`
