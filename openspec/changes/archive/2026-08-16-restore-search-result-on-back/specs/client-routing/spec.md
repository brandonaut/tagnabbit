## MODIFIED Requirements

### Requirement: Browser back/forward navigates between screens
The system SHALL support the browser's native back and forward navigation across the screens a user has visited (search, favorites, tag detail), without requiring the user to use in-app controls. This includes results that are not derivable from the URL alone, such as a randomly sampled result set — returning to search SHALL show the exact same results, not a freshly recomputed or re-sampled equivalent.

#### Scenario: Back button returns from tag detail to prior search
- **WHEN** a user is viewing search results, opens a tag's detail screen, then presses the browser's back button
- **THEN** the system returns to the search screen showing the same query, filters, and results the user had before opening the tag

#### Scenario: Forward button re-enters a screen after going back
- **WHEN** a user has navigated back from a screen using the browser's back button
- **THEN** pressing the browser's forward button returns to that screen

#### Scenario: Back button after a random sample preserves the exact sample
- **WHEN** a user generates a random sample of tags (e.g. via "Surprise Me"), opens one of the sampled tags' detail screen, then presses the browser's back button
- **THEN** the system returns to the search screen showing the exact same sampled tags, not a newly generated random sample

#### Scenario: An intervening search replaces the restorable state
- **WHEN** a user generates a random sample, then performs a new typed search before opening any tag
- **THEN** navigating back after later opening a tag from that new search shows the new search's results, not the earlier random sample
