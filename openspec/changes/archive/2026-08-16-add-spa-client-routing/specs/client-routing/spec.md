## Purpose

Gives every screen in Tagnabbit (search, favorites, an individual tag) its own URL, so results and views can be bookmarked, shared, refreshed, and navigated with the browser's back/forward buttons.

## ADDED Requirements

### Requirement: Navigable screens have distinct URLs
The system SHALL expose the search screen, the favorites screen, and an individual tag's screen at distinct, directly-loadable URLs.

#### Scenario: Loading the app with no path
- **WHEN** a user opens the app's base URL with no route segment
- **THEN** the system displays the search screen

#### Scenario: Loading the favorites URL directly
- **WHEN** a user opens the favorites URL directly (fresh load, not via in-app navigation)
- **THEN** the system displays the favorites screen with the user's currently saved favorites

#### Scenario: Loading a tag URL directly
- **WHEN** a user opens a specific tag's URL directly (fresh load, not via in-app navigation)
- **THEN** the system displays that tag's detail screen

### Requirement: Deep-linked tag resolves from local data or a live fetch
When a tag's detail screen is opened without the tag's data already available in memory, the system SHALL resolve the tag by its id from the locally cached tag data, and SHALL fall back to fetching the tag live if it is not found locally.

#### Scenario: Direct load resolves a known tag
- **WHEN** a tag URL is opened directly and the referenced id exists in the local tag cache
- **THEN** the system displays that tag's full detail (title, sheet music, etc.) exactly as if it had been reached by selecting it from search results

#### Scenario: Direct load with no local cache fetches the tag live
- **WHEN** a tag URL is opened directly, no local tag data exists yet (e.g. a first-time visitor who has never used the app), and the referenced id is a valid tag
- **THEN** the system fetches that tag from the barbershoptags.com API, displays its full detail, and stores it locally so it does not need to be re-fetched on a later visit

#### Scenario: Direct load with a stale local cache fetches the tag live
- **WHEN** a tag URL is opened directly, a local tag cache exists, and the referenced id is not present in it (e.g. a tag added to the catalog after the local cache was last downloaded)
- **THEN** the system fetches that tag live and displays it, the same as the no-cache case

#### Scenario: Direct load with an unresolvable id
- **WHEN** a tag URL is opened directly and the referenced id cannot be resolved either locally or via a live fetch (invalid id, or the fetch fails)
- **THEN** the system displays a not-found state instead of a blank or broken screen

### Requirement: Search query and filters are reflected in the URL
The search screen's query text and active filters SHALL be represented in its URL, and SHALL be restored from the URL when that URL is opened.

#### Scenario: Search URL is shareable
- **WHEN** a user performs a search with a query and/or filters, copies the current URL, and opens it in a new session
- **THEN** the search screen shows the same query text, the same active filters, and the same results as the original search

#### Scenario: Refreshing preserves search state
- **WHEN** a user refreshes the page while on a search with a query and/or filters active
- **THEN** the query text and filters are restored from the URL after reload

### Requirement: Typing a search query does not spam browser history
The system SHALL update the URL to reflect search query changes without creating a new browser-history entry for every keystroke.

#### Scenario: Back button after typing a query
- **WHEN** a user types a multi-character search query and then presses the browser's back button once
- **THEN** the browser navigates away from the search screen entirely, rather than stepping back through intermediate keystrokes of the query

### Requirement: Browser back/forward navigates between screens
The system SHALL support the browser's native back and forward navigation across the screens a user has visited (search, favorites, tag detail), without requiring the user to use in-app controls.

#### Scenario: Back button returns from tag detail to prior search
- **WHEN** a user is viewing search results, opens a tag's detail screen, then presses the browser's back button
- **THEN** the system returns to the search screen showing the same query, filters, and results the user had before opening the tag

#### Scenario: Forward button re-enters a screen after going back
- **WHEN** a user has navigated back from a screen using the browser's back button
- **THEN** pressing the browser's forward button returns to that screen
