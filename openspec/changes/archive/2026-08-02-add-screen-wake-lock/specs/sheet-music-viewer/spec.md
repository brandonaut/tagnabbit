## ADDED Requirements

### Requirement: Screen wake lock while sheet music is displayed
While sheet music content is fully rendered and visible on the tag detail page, the system SHALL request a screen wake lock to prevent the device display from dimming or locking.
The wake lock SHALL be released as soon as sheet music content is no longer displayed, including when the tag detail page is closed, when the displayed sheet music changes, or when it is still loading (not yet fully rendered).
If the wake lock is released by the platform because the page is backgrounded, the system SHALL re-request it once the page becomes visible again, provided sheet music is still displayed.
Failure to acquire or maintain the wake lock (including lack of platform support) SHALL be handled silently, with no error message or indicator shown to the user and no other functionality affected.
There SHALL be no user-facing setting to disable this behavior.

#### Scenario: Wake lock acquired once sheet music is visible
- **WHEN** sheet music content finishes loading and becomes visible on the tag detail page
- **THEN** the system requests a screen wake lock

#### Scenario: Wake lock not held while sheet music is still loading
- **WHEN** sheet music content is being fetched or rendered and is not yet visible (the loading indicator is shown)
- **THEN** no wake lock is held

#### Scenario: Wake lock released when leaving the tag detail page
- **WHEN** the user navigates back from the tag detail page while sheet music was displayed
- **THEN** the held wake lock is released

#### Scenario: Wake lock released when sheet music is no longer available
- **WHEN** the displayed sheet music is cleared or replaced (e.g. the underlying tag changes)
- **THEN** any held wake lock is released

#### Scenario: Wake lock re-acquired after returning to the page
- **WHEN** the browser tab is backgrounded (releasing the wake lock automatically) and then returns to the foreground while sheet music is still displayed
- **THEN** the system re-requests the screen wake lock

#### Scenario: Unsupported browser is unaffected
- **WHEN** the Screen Wake Lock API is not available in the current browser
- **THEN** sheet music displays normally with no error, indicator, or change in behavior other than the screen following its normal timeout

#### Scenario: Denied wake lock request is unaffected
- **WHEN** a wake lock request is rejected by the platform (e.g. low battery mode)
- **THEN** sheet music displays normally with no error or indicator shown

#### Scenario: Wake lock unaffected by the tag info popup
- **WHEN** the user opens the tag info popup (title, arranger, key, etc.) while sheet music is displayed
- **THEN** the wake lock remains held, since the sheet music remains rendered underneath the popup rather than being hidden or unmounted
