## Purpose

The `Tuner` panel supports two overall sizes, small and large, toggled via a corner button.
This spec defines the size states, how the panel scales and stays anchored on screen, per-page defaults, and when the size toggle itself is available.

## Requirements

### Requirement: Two-state panel size toggle
The `Tuner` panel SHALL support exactly two size states, small and large, toggled by a button positioned in the panel's corner.
The whole panel — pitch wheel, key picker, and the corner button itself — SHALL scale together as a single unit between the two states.

#### Scenario: Corner button toggles panel size
- **WHEN** the user activates the panel's corner size button while the panel is in the small state
- **THEN** the panel, including the pitch wheel and key picker, renders in the large state

#### Scenario: Toggling back to small
- **WHEN** the user activates the panel's corner size button while the panel is in the large state
- **THEN** the panel returns to the small state

### Requirement: Panel scales anchored to its bottom-right corner
When the panel's size state changes, it SHALL scale from its bottom-right corner, so the panel stays pinned to the screen's bottom-right edge at both sizes.

#### Scenario: Enlarging keeps the bottom-right corner fixed
- **WHEN** the panel toggles from small to large
- **THEN** the panel grows upward and to the left, with its bottom-right corner remaining at the same screen position

### Requirement: Page-level default panel size
The `Tuner` component SHALL accept an optional default size, used to set the panel's size state when it first mounts.

#### Scenario: Search page tuner defaults to large
- **WHEN** the tuner is opened on the search page
- **THEN** the panel's initial size state is large

#### Scenario: Tag page tuner defaults to small
- **WHEN** the tuner is opened on a tag page
- **THEN** the panel's initial size state is small

### Requirement: Enlarged panel may overlap page content
The panel's large size state SHALL NOT be constrained to avoid overlapping other on-screen content, including sheet music on a tag page.

#### Scenario: Large panel covers sheet music
- **WHEN** the panel is toggled to large on a tag page
- **THEN** it renders at full large size even if it visually overlaps the sheet music beneath it

### Requirement: Size toggle only available while the panel is showing
For a collapsible tuner, the corner size button SHALL only be present while the panel itself is visible (i.e. while the tuner is active), consistent with the rest of the panel's contents.

#### Scenario: No size button while collapsed
- **WHEN** a collapsible tuner is inactive and only its round tune-toggle button is shown
- **THEN** no corner size button is rendered
