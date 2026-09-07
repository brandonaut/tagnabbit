## MODIFIED Requirements

### Requirement: Bottom tab bar destinations
The system SHALL show a bottom tab bar with three navigation destinations — Search, Favorites, and Player — each represented by an icon and a text label, plus a fourth slot that toggles the tuner overlay (see `tuner-overlay`) rather than navigating.
The tab bar SHALL appear on the search, favorites, player, and tag detail screens.

#### Scenario: Three destinations and a tuner toggle are present
- **WHEN** a user is on any screen that shows the tab bar
- **THEN** the bar shows Search, Favorites, and Player as navigation destinations, each with its icon and label, and a fourth Tuner control marked with a chevron to set it apart from the destinations

#### Scenario: Tapping a navigation destination navigates to it
- **WHEN** a user taps Search, Favorites, or Player in the tab bar while on a different screen
- **THEN** the system navigates to that destination's screen

#### Scenario: Tapping the tuner slot toggles the overlay
- **WHEN** a user taps the fourth tab-bar slot
- **THEN** the tuner overlay opens if it was closed, or closes if it was open, and the current screen does not change

### Requirement: Active destination is indicated
The tab bar SHALL visually indicate which navigation destination corresponds to the currently displayed screen, when that screen is one of the three destinations.
On the tag detail screen — which is not a tab-bar destination — no destination SHALL be shown as active.
The tuner slot SHALL indicate whether the overlay is currently open, as a pressed state, and SHALL NOT use an active-page indication.

#### Scenario: Current screen is highlighted
- **WHEN** a user is on the search, favorites, or player screen
- **THEN** that screen's entry in the tab bar is visually distinguished from the others

#### Scenario: Tag detail shows no active destination
- **WHEN** a user is on the tag detail screen
- **THEN** none of the three navigation destinations is shown as active

#### Scenario: Tuner slot reflects overlay state
- **WHEN** the tuner overlay is open
- **THEN** the tab bar's tuner slot shows a pressed state, returning to its default state when the overlay closes

### Requirement: Tab bar is not shown outside its four screens
The tab bar SHALL be shown on the search, favorites, player, and tag detail screens, and SHALL NOT be shown on any other screen.
On the tag detail screen the tab bar SHALL slide out of view together with the rest of the immersive chrome when the user hides it (for example by tapping the sheet music), and slide back when the chrome is restored.
An open tuner overlay's visibility SHALL NOT be affected by that chrome toggle (see `tuner-overlay`).

#### Scenario: Tag detail screen shows the tab bar
- **WHEN** a user opens a tag's detail screen
- **THEN** the bottom tab bar is shown, with no navigation destination marked active

#### Scenario: Hiding the tag detail chrome hides the tab bar
- **WHEN** a user hides the tag detail chrome by tapping the sheet music
- **THEN** the tab bar slides out of view along with the header, while an open tuner overlay stays visible

#### Scenario: No tab bar on other screens
- **WHEN** a user is on a screen that is not search, favorites, player, or tag detail
- **THEN** no bottom tab bar is shown
