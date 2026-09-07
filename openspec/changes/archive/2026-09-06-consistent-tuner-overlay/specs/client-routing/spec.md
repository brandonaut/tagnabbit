## MODIFIED Requirements

### Requirement: Navigable screens have distinct URLs
The system SHALL expose the search screen, the favorites screen, the player screen, and an individual tag's screen at distinct, directly-loadable URLs.
The tuner is an overlay rather than a screen (see `tuner-overlay`) and SHALL NOT have its own URL.

#### Scenario: Loading the app with no path
- **WHEN** a user opens the app's base URL with no route segment
- **THEN** the system displays the search screen

#### Scenario: Loading the favorites URL directly
- **WHEN** a user opens the favorites URL directly (fresh load, not via in-app navigation)
- **THEN** the system displays the favorites screen with the user's currently saved favorites

#### Scenario: Loading the player URL directly
- **WHEN** a user opens the player URL directly (fresh load, not via in-app navigation)
- **THEN** the system displays the player screen in its empty, no-file-loaded state

#### Scenario: Loading a tag URL directly
- **WHEN** a user opens a specific tag's URL directly (fresh load, not via in-app navigation)
- **THEN** the system displays that tag's detail screen
