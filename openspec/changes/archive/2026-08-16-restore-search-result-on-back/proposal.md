## Why

`client-routing`'s "Browser back/forward navigates between screens" requirement already promises that returning from a tag shows "the same query, filters, and results" — but the shipped implementation can't keep that promise for "Surprise Me," since `SearchPage` fully unmounts on route change and its random sample was never recoverable from the URL. Typed searches happen to recompute to the same result deterministically, so the gap has only been visible for Surprise Me, but the underlying mechanism (component state lost on unmount) affects both.

## What Changes

- `src/hashLocation.ts`'s `navigate()` gains real support for a `state` option (currently silently dropped on push, accidentally passed through on replace) so callers can attach data to a browser history entry.
- `SearchPage` snapshots its current result (`{q, type, parts, tagIds}`) onto the `/search` history entry via `replaceState` whenever the result changes, and clears that snapshot when the result is cleared.
- On mount, if the snapshot's `q`/`type`/`parts` exactly match the current URL, `SearchPage` restores the result from the snapshot's `tagIds` once the local tag data has loaded — this is the only way to bring back Surprise Me's exact random sample, and also skips a redundant `Fuse.search()` call for a typed query.
- Out of scope: the `localTags`/Fuse-index rebuild that already happens on every `SearchPage` remount (IndexedDB read + index construction) is unaffected by this change — it still happens on every back-navigation, same as before. This change only fixes what gets shown once that reload finishes.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `client-routing`: tightens "Browser back/forward navigates between screens" so returning to search after opening a tag shows the exact same results even when they aren't derivable from the URL alone (Surprise Me's random sample), not just equivalent/recomputed ones.

## Impact

- `src/hashLocation.ts`: `navigate()` signature and both its push/replace branches gain proper `state` handling.
- `src/SearchPage.tsx`: new effect to write/clear the history-state snapshot; mount-time logic to consume a matching snapshot once `localTags` is available.
- No new dependencies. No change to the route table, URL shape, or any other screen.
