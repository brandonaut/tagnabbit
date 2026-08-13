## MODIFIED Requirements

### Requirement: Key/temperament chip reflects current state
The tuner SHALL display a tappable button below the pitch wheel, showing a concise label for the current reference key or equal temperament.

#### Scenario: Button shows the reference key in just-intonation mode
- **WHEN** the tuner is in just-intonation mode
- **THEN** the button displays `Key: ` followed by the selected reference key's note name (e.g. `Key: G`), tinted using that note's own hue via `wedgeColor`

#### Scenario: Button shows equal temperament
- **WHEN** the tuner is in equal-temperament mode
- **THEN** the button displays the abbreviation `Equal Temp.` without any note-hue tint

### Requirement: Tapping the chip opens the dropdown
Tapping the button SHALL toggle key-select mode on the pitch wheel; tapping it again while key-select mode is active SHALL exit that mode without changing the current key or temperament.

#### Scenario: Entering key-select mode
- **WHEN** the user taps the button while key-select mode is inactive
- **THEN** key-select mode becomes active, the pitch wheel's wedges and center face become key-selection targets instead of tap-to-play targets, and the button itself renders a distinct pressed/active visual state

#### Scenario: Exiting key-select mode via the button
- **WHEN** the user taps the button while key-select mode is active
- **THEN** key-select mode becomes inactive, the wheel returns to its normal tap-to-play/glide behavior, and the current key/temperament remain unchanged

### Requirement: Selecting an option applies it and closes the dropdown
Selecting a key or equal temperament, via the pitch wheel's key-select-mode targets, SHALL immediately apply that selection and exit key-select mode, with no separate confirmation step.

#### Scenario: Selecting a key
- **WHEN** the user taps a wedge while key-select mode is active
- **THEN** that note becomes the reference key, the tuner switches to (or remains in) just-intonation mode, and key-select mode exits

#### Scenario: Selecting Equal Temperament
- **WHEN** the user taps the wheel's center face while key-select mode is active
- **THEN** the tuner switches to equal-temperament mode, the last-selected reference key is preserved but not applied, and key-select mode exits

### Requirement: Dropdown dismisses without changing selection
Key-select mode SHALL exit without applying any change when dismissed other than by selecting a key or equal temperament.

#### Scenario: Tapping outside the wheel
- **WHEN** key-select mode is active and the user taps or clicks outside the pitch wheel and its button
- **THEN** key-select mode exits and the current key/temperament remain unchanged

#### Scenario: Pressing Escape
- **WHEN** key-select mode is active and the user presses the Escape key
- **THEN** key-select mode exits and the current key/temperament remain unchanged

### Requirement: Chip and dropdown are accessible
The button SHALL expose an accessible name/role reflecting its current state, and SHALL indicate that activating it toggles key-select mode on the pitch wheel.

#### Scenario: Button accessible name reflects current state
- **WHEN** an assistive technology reads the button
- **THEN** its accessible name includes the current reference key or "Equal Temperament", and indicates that activating it toggles key selection on the pitch wheel

## REMOVED Requirements

### Requirement: Dropdown displays a 4x3 grid of the 12 keys
**Reason**: The dropdown grid duplicated the pitch wheel's own 12-note layout. Key selection now happens directly on the wheel's existing wedges.
**Migration**: See `tuner-pitch-wheel`'s key-select-mode requirements for how wedges now serve as selection targets.

### Requirement: Dropdown includes an Equal Temperament control
**Reason**: Replaced by tapping the wheel's center face while key-select mode is active, removing the need for a separate button inside a popup.
**Migration**: See `tuner-pitch-wheel`'s key-select-mode requirements for the center-face equal-temperament target.

### Requirement: Accidental grid cells show a secondary enharmonic name
**Reason**: The grid is removed. The pitch wheel's wedges already render this two-line primary/secondary labeling unconditionally, independent of any mode.
**Migration**: No action needed; see `tuner-pitch-wheel`'s existing "Accidental wedges show a secondary enharmonic name" requirement.

### Requirement: All 12 grid cells stay a consistent size
**Reason**: The grid is removed; there are no grid cells to size-match.
**Migration**: Not applicable.

### Requirement: Accessible label includes both names for accidental cells
**Reason**: The grid is removed. The pitch wheel's wedge accessible labels already convey both note names.
**Migration**: No action needed; see `tuner-pitch-wheel`'s existing wedge accessibility requirements.
