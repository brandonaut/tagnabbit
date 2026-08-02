# sheet-music-viewer Specification

## Purpose
Defines how sheet music content (image, PDF, or generic file fallback) is displayed on the tag detail page, including layout, loading behavior, and the loading indicator.

## Requirements

### Requirement: Vertical centering of sheet music content
Sheet music content (image, PDF, or generic file fallback) on the tag detail page SHALL be vertically centered within the full viewport height when its rendered height is less than the viewport height.
When its rendered height meets or exceeds the viewport height, the content SHALL render top-aligned as it does today (no cropping, no forced shrinking).

#### Scenario: Short PDF is centered
- **WHEN** a tag's sheet music is a single-page PDF whose rendered height is less than the viewport height
- **THEN** the rendered page is vertically centered in the viewport, with roughly equal empty space above and below it

#### Scenario: Tall PDF remains top-aligned
- **WHEN** a tag's sheet music is a multi-page PDF whose combined rendered height exceeds the viewport height
- **THEN** the content renders starting at the top of the content area and scrolls normally, matching current behavior

#### Scenario: Short image is centered
- **WHEN** a tag's sheet music is an image shorter than the viewport height
- **THEN** the image is vertically centered in the viewport

#### Scenario: Centering applies consistently across content types
- **WHEN** sheet music renders as an image, a PDF, or the generic iframe fallback
- **THEN** all three use the same centering behavior, rather than each implementing its own layout

### Requirement: Content reveals only when fully ready
Sheet music content SHALL remain hidden behind a loading indicator until it is fully ready to display at its final size, so that no layout shift or re-centering jump occurs after the content becomes visible.

#### Scenario: PDF reveals after all pages render
- **WHEN** a PDF sheet music file is loading
- **THEN** the loading indicator remains visible until every page has finished rendering, after which the fully-rendered, centered content appears all at once

#### Scenario: Image reveals after load completes
- **WHEN** an image sheet music file is loading
- **THEN** the loading indicator remains visible until the image has finished loading (its `load` event has fired), after which the centered image appears

#### Scenario: Generic fallback has no readiness gate
- **WHEN** sheet music is a file type other than image or PDF (rendered via the generic fallback viewer)
- **THEN** the fallback renders at its fixed height as soon as the file is fetched, since its dimensions are already fixed and it carries no risk of a layout jump

### Requirement: Loading indicator
While sheet music is being fetched and prepared for display, the tag detail page SHALL show a centered, indeterminate spinning loading indicator in place of the previous static loading text.
No numeric or percentage progress SHALL be shown.

#### Scenario: Spinner shown during fetch and render
- **WHEN** sheet music is being fetched or rendered and is not yet ready to display
- **THEN** a centered spinning indicator is shown instead of sheet music content or static loading text

#### Scenario: No progress percentage
- **WHEN** sheet music is loading
- **THEN** the loading indicator does not display a numeric percentage or progress bar

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
