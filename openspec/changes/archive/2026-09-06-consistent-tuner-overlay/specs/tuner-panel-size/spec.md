## MODIFIED Requirements

### Requirement: Page-level default panel size
The tuner overlay SHALL have a single size default, small, applied every time the overlay opens, independent of which screen it is opened from.
A size change SHALL last only for the current open session; it SHALL NOT be remembered between opens or across reloads, and SHALL NOT be written to storage.

#### Scenario: Overlay opens small every time
- **WHEN** a user opens the tuner overlay
- **THEN** the panel renders at the small size

#### Scenario: Size change does not carry to the next open
- **WHEN** a user toggles the panel to large, then closes the overlay and opens it again
- **THEN** the panel renders small

#### Scenario: Size is not restored after a reload
- **WHEN** a user toggles the panel to large, then reloads the app and opens the overlay
- **THEN** the panel renders small

## ADDED Requirements

### Requirement: Panel keeps its screen position when resized
When the panel's size state changes, its on-screen position SHALL remain stable rather than snapping to a screen edge.
If the new size would extend past the viewport or over the bottom tab bar, the panel SHALL be nudged back so it stays fully visible and clear of the tab bar (consistent with the clamping in `tuner-overlay`).

#### Scenario: Enlarging in place
- **WHEN** the user enlarges the panel while it sits away from the screen edges
- **THEN** the panel grows roughly around its current position without jumping to a corner

#### Scenario: Enlarging near an edge
- **WHEN** the user enlarges the panel while it sits near a screen edge such that the larger size would extend past the viewport
- **THEN** the panel is nudged back so it remains fully within the viewport and clear of the tab bar

## REMOVED Requirements

### Requirement: Panel scales anchored to its bottom-right corner
**Reason**: The overlay's position is now controlled by the user dragging it, and it scales in place, so it no longer stays pinned to a fixed screen corner as it resizes. (Each open still *starts* in the bottom-right corner — see `tuner-overlay` — but that is a starting position, not a scaling anchor.)
**Migration**: Replaced by "Panel keeps its screen position when resized".

### Requirement: Size toggle only available while the panel is showing
**Reason**: The collapsible floating tuner and its round tune-toggle button are removed. The overlay is either open — panel and its corner size button both shown — or closed, with nothing shown; there is no collapsed state in which to conditionally hide the size button.
**Migration**: None. The corner size button is present whenever the overlay is open.
