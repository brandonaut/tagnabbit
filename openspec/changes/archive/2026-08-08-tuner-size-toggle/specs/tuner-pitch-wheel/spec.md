## MODIFIED Requirements

### Requirement: Wheel size follows the panel's size state
The pitch wheel SHALL render at a size determined by the enclosing panel's size state (small or large, per `tuner-panel-size`), rather than at one fixed size everywhere the `Tuner` component appears.

#### Scenario: Wheel is larger when the panel is in the large state
- **WHEN** the tuner panel's size state is large
- **THEN** the pitch wheel renders visibly larger than it does when the panel's size state is small

#### Scenario: Wheel size can differ between search and tag pages
- **WHEN** the tuner is opened on the search page (defaulting to large) and, separately, on a tag page (defaulting to small)
- **THEN** the pitch wheel renders at different sizes in each place, reflecting each page's default panel size
