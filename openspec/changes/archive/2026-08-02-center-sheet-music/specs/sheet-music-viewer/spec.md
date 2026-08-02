## ADDED Requirements

### Requirement: Vertical centering of sheet music content
Sheet music content (image, PDF, or generic file fallback) on the tag detail page SHALL be vertically centered within the full viewport height when its rendered height is less than the viewport height. When its rendered height meets or exceeds the viewport height, the content SHALL render top-aligned as it does today (no cropping, no forced shrinking).

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
While sheet music is being fetched and prepared for display, the tag detail page SHALL show a centered, indeterminate spinning loading indicator in place of the previous static loading text. No numeric or percentage progress SHALL be shown.

#### Scenario: Spinner shown during fetch and render
- **WHEN** sheet music is being fetched or rendered and is not yet ready to display
- **THEN** a centered spinning indicator is shown instead of sheet music content or static loading text

#### Scenario: No progress percentage
- **WHEN** sheet music is loading
- **THEN** the loading indicator does not display a numeric percentage or progress bar
