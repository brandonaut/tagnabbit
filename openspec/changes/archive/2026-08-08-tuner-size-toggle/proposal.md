## Why

The tuner panel currently renders at one fixed, "consistent" size on every page.
On the search page there's nothing else on screen, so a bigger panel would be easier to read and tap.
On a tag page the panel floats over the sheet music, so a bigger default there gets in the way.
Users should also be able to override the default in the moment — e.g. temporarily enlarge the panel on a tag page to see the wheel more clearly, even though it covers part of the music.

## What Changes

- Add a corner button on the tuner panel that toggles its overall size between two states: small and large.
- The whole panel (pitch wheel, key picker, size button) scales together via a single CSS transform, anchored at the bottom-right corner so the fixed-position widget stays pinned to the screen edge as it grows.
- The search page's tuner defaults to large; a tag page's tuner defaults to small.
- The enlarged size is allowed to visually cover sheet music content on a tag page — no layout reflow or avoidance logic.
- **BREAKING**: Removes the existing "same size everywhere" guarantee for the pitch wheel — size now varies by page default and by user toggle.

## Capabilities

### New Capabilities
- `tuner-panel-size`: Defines the two-state (small/large) panel sizing, the corner toggle button, the bottom-right-anchored scale behavior, and the per-page default size.

### Modified Capabilities
- `tuner-pitch-wheel`: The "Consistent enlarged wheel size across all usages" requirement is replaced — the wheel's rendered size now depends on the panel's size state (`tuner-panel-size`) instead of being fixed and identical everywhere.

## Impact

- `src/Tuner.tsx`: add size state, corner toggle button, wrap the panel in a scaling container, accept a `defaultSize` prop.
- `src/SearchPage.tsx`: pass `defaultSize="large"` to `Tuner`.
- `src/TagPage.tsx`: pass `defaultSize="small"` to `Tuner`.
- No new dependencies; reuses the existing `lucide-react` icon set.
