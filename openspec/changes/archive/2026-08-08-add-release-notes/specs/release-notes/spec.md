## ADDED Requirements

### Requirement: GitHub Release published on tag push
When a `v*` tag is pushed, CI SHALL create a GitHub Release for that tag whose notes are the commit subjects added since the previous tag.

#### Scenario: Tag pushed with prior release history
- **WHEN** a tag `vX.Y.Z` is pushed and a previous `v*` tag exists in history
- **THEN** CI creates a GitHub Release for `vX.Y.Z` whose notes list the `--oneline` commit subjects between the previous tag and `vX.Y.Z`, excluding the tag's own "Release vX.Y.Z" commit

#### Scenario: First tag with no prior release
- **WHEN** a tag is pushed and no earlier `v*` tag exists
- **THEN** CI creates a GitHub Release whose notes are the full commit log up to that tag

### Requirement: In-app link to the current release
The app SHALL be able to link to the GitHub Release matching its own running version without making a network request to determine the URL.

#### Scenario: Settings drawer links to current release
- **WHEN** the Settings drawer is open
- **THEN** it shows a "What's new" link pointing to `https://github.com/brandonaut/tagnabbit/releases/tag/v{APP_VERSION}` for the app's current `APP_VERSION`

### Requirement: PWA update toast links to the pending release
The PWA update toast SHALL offer a link to the release notes only when an update is actually pending, and SHALL NOT make this claim when there is nothing new to report.

#### Scenario: Update available
- **WHEN** the service worker reports `needRefresh`
- **THEN** the toast reads "Update available." and shows a "What's new" link alongside the Reload and Close actions

#### Scenario: First offline-ready install
- **WHEN** the service worker reports `offlineReady` (first install, not an update)
- **THEN** the toast does not show a "What's new" link
