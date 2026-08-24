## Purpose

Gives the user a persistent, always-reachable way to move between the app's main screens (search, favorites, player, tuner), replacing the two-screen nav pill with one that scales to more destinations.

## Requirements

### Requirement: Bottom tab bar destinations
The system SHALL show a bottom tab bar with four destinations — Search, Favorites, Player, and Tuner — each represented by an icon and a text label, on the search, favorites, player, and tuner screens.

#### Scenario: All four destinations are present
- **WHEN** a user is on any of the search, favorites, player, or tuner screens
- **THEN** the bottom tab bar shows all four destinations, each with its icon and label

#### Scenario: Tapping a destination navigates to it
- **WHEN** a user taps a destination in the tab bar other than the one they're currently on
- **THEN** the system navigates to that destination's screen

### Requirement: Active destination is indicated
The tab bar SHALL visually indicate which of the four destinations corresponds to the currently displayed screen.

#### Scenario: Current screen is highlighted
- **WHEN** a user is on one of the four screens
- **THEN** that screen's entry in the tab bar is visually distinguished from the other three

### Requirement: Tab bar stays reachable while scrolling
The tab bar SHALL remain fixed at the bottom of the viewport, staying visible as the screen content above it scrolls.

#### Scenario: Scrolling a long list leaves the tab bar in place
- **WHEN** a user scrolls a screen whose content is taller than the viewport (e.g. a long list of search results)
- **THEN** the tab bar remains visible at the bottom of the viewport throughout the scroll

### Requirement: Tab bar avoids system UI overlap
On a device with a system gesture area or home indicator at the bottom of the screen, the tab bar SHALL be padded so its content is not obscured by or overlapping that system UI.

#### Scenario: Device with a bottom home indicator
- **WHEN** the app runs on a device that reserves a bottom inset for a home indicator or gesture area
- **THEN** the tab bar's content renders fully above that reserved area

### Requirement: Tab bar is not shown outside its four screens
The tab bar SHALL NOT be shown on the tag detail screen or any screen other than search, favorites, player, and tuner.

#### Scenario: Tag detail screen has no tab bar
- **WHEN** a user opens a tag's detail screen
- **THEN** no bottom tab bar is shown
