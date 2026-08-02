## Purpose

The key picker is the chip and dropdown control that lets a user set the tuner's reference key (just-intonation mode) or switch to equal temperament, replacing the pitch wheel's former drag gesture.
It reuses the wheel's own `wedgeColor` hue/tier system so its color language agrees with the wheel rather than introducing a separate one.

## Requirements

### Requirement: Key/temperament chip reflects current state
The tuner SHALL display a tappable chip, in the location previously occupied by the static "Key: …" text, showing the current reference key or equal temperament.

#### Scenario: Chip shows the reference key in just-intonation mode
- **WHEN** the tuner is in just-intonation mode
- **THEN** the chip displays the selected reference key's note name, tinted using that note's own hue via `wedgeColor`

#### Scenario: Chip shows equal temperament
- **WHEN** the tuner is in equal-temperament mode
- **THEN** the chip displays "Equal Temperament" without any note-hue tint

### Requirement: Tapping the chip opens the dropdown
Tapping the chip SHALL open the key-picker dropdown; tapping it again while open SHALL close it.

#### Scenario: Opening the dropdown
- **WHEN** the user taps the chip while the dropdown is closed
- **THEN** the dropdown opens, displaying the key grid and the Equal Temperament button

#### Scenario: Closing the dropdown via the chip
- **WHEN** the user taps the chip while the dropdown is open
- **THEN** the dropdown closes without changing the current key or temperament

### Requirement: Dropdown displays a 4x3 grid of the 12 keys
The dropdown SHALL display all 12 chromatic keys as a 4-column by 3-row grid, in the same index order used by the wheel's wedges (`NOTE_NAMES` order), each cell tinted via `wedgeColor` using that note's index.

#### Scenario: Grid cell colors match wedge colors
- **WHEN** the dropdown is open
- **THEN** each of the 12 grid cells is tinted using `wedgeColor` with the same note index and idle tier as that note's wheel wedge, unless it is the selected reference key

#### Scenario: Selected key cell is visually distinguished
- **WHEN** the dropdown is open and the tuner is in just-intonation mode
- **THEN** the grid cell for the current reference key is tinted using the "reference" tier, distinguishing it from the other 11 cells

#### Scenario: No cell marked as reference in equal-temperament mode
- **WHEN** the dropdown is open and the tuner is in equal-temperament mode
- **THEN** no grid cell is tinted using the "reference" tier, regardless of which note was last selected as the key

### Requirement: Dropdown includes an Equal Temperament control
The dropdown SHALL include a full-width "Equal Temperament" button below the 12-key grid, distinct from the grid cells.

#### Scenario: Equal Temperament button is shown
- **WHEN** the dropdown is open
- **THEN** a full-width "Equal Temperament" button is displayed below the grid

#### Scenario: Equal Temperament button reflects current mode
- **WHEN** the dropdown is open and the tuner is already in equal-temperament mode
- **THEN** the Equal Temperament button is visually marked as the current selection

### Requirement: Selecting an option applies it and closes the dropdown
Selecting a key or Equal Temperament SHALL immediately apply that selection and close the dropdown, with no separate confirmation step.

#### Scenario: Selecting a key
- **WHEN** the user taps a key cell in the grid
- **THEN** that note becomes the reference key, the tuner switches to (or remains in) just-intonation mode, and the dropdown closes

#### Scenario: Selecting Equal Temperament
- **WHEN** the user taps the Equal Temperament button
- **THEN** the tuner switches to equal-temperament mode, the last-selected reference key is preserved but not applied, and the dropdown closes

### Requirement: Dropdown dismisses without changing selection
The dropdown SHALL close without applying any change when dismissed other than by selecting an option.

#### Scenario: Tapping outside the dropdown
- **WHEN** the dropdown is open and the user taps or clicks outside it
- **THEN** the dropdown closes and the current key/temperament remain unchanged

#### Scenario: Pressing Escape
- **WHEN** the dropdown is open and the user presses the Escape key
- **THEN** the dropdown closes and the current key/temperament remain unchanged

### Requirement: Chip and dropdown are accessible
The chip and dropdown SHALL expose accessible names/roles reflecting their current state and contents.

#### Scenario: Chip accessible name reflects current state
- **WHEN** an assistive technology reads the chip
- **THEN** its accessible name includes the current reference key or "Equal Temperament", and indicates that activating it opens a key picker

#### Scenario: Grid cells and Equal Temperament button are individually labeled
- **WHEN** an assistive technology reads the open dropdown
- **THEN** each of the 12 key cells and the Equal Temperament button expose distinct accessible names identifying their note or "Equal Temperament"
