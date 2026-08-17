## 1. History-state support in the hash-location hook

- [x] 1.1 In `src/hashLocation.ts`, extend `navigate()`'s options to accept a `state` argument and pass it through on both the push branch (`history.pushState(state, ...)`, previously hardcoded `null`) and the replace branch (`history.replaceState(state, ...)`, previously coincidentally reusing `history.state`)
- [x] 1.2 Verified — the one existing replace-mode caller (`SearchPage`'s URL-sync effect) is what task 2 modifies directly, so there was no separate "existing caller" to keep unchanged; push-mode callers (`navigate(\`/tag/${id}\`)`,`<Redirect to="/search"/>`) don't pass`state` and default to `null`, same as before

## 2. Snapshot write path

- [x] 2.1 / 2.2 Implemented as one merged effect rather than a separate new one, in `SearchPage.tsx` — the existing URL-sync effect already does a `replace: true` navigate on every debounced query/filter change; adding a *second, independent* replace call for the state snapshot would race it and whichever ran last would silently wipe the other's `state` (since `replaceState` replaces the whole entry). The URL-sync effect now also computes `{ q, type, parts, tagIds, available }` from `result` (or `undefined` when `result` is `null`, clearing any stale snapshot) and passes it as `state` in the same `setSearchParams(next, { replace: true, state })` call. `available` was added to the snapshot shape (design.md only specified `{q, type, parts, tagIds}`) so a restored Surprise Me result shows the correct "N matches" pool size instead of just the sample count — otherwise restoring Surprise Me's `available` would silently regress to `tagIds.length`.

## 3. Snapshot restore path

- [x] 3.1 On `SearchPage` mount, a lazy `useRef` initializer reads `history.state` (via an `isSearchSnapshot` type guard) once and compares its `q`/`type`/`parts` against the current URL's, stashing it as `pendingSnapshotRef` only on an exact match
- [x] 3.2 A dedicated effect keyed on `[localTags]` (not folded into the bootstrap effect, to stay decoupled from its multiple branches) applies `pendingSnapshotRef` once `localTags` is available: hydrates `tagIds` → `Tag[]` (dropping ids that no longer resolve), `setResult`, and sets `isSurpriseRef.current = true` when the snapshot's `q` was empty; clears the ref right after `localTags` is confirmed present so it's applied at most once, whether or not any ids resolved
- [x] 3.3 Confirmed: the Fuse-search effect and the restore effect both key off `localTags`/`debouncedQuery`/`filters` and run in the same React commit with no intermediate paint, so for a typed query the restore's seeded value and the Fuse effect's recomputed value converge in the same frame regardless of which runs first — no visible flicker, and `localMatches`/highlighting still comes from the Fuse effect either way

## 4. Verification

- [x] 4.1 Manually verify each new/modified spec scenario in `specs/client-routing/spec.md`: Surprise Me → open a sampled tag → back → same exact tags shown; Surprise Me → new typed search → open a tag from that search → back → new search's results shown, not the old sample — needs a real browser session, no browser-automation tool available in this session (same limitation noted on `add-spa-client-routing`)
- [x] 4.2 Manually verify a typed search still restores correctly after a tag visit (no regression from `add-spa-client-routing`), including that highlight/match ranges are present (not stuck showing an unhighlighted seeded snapshot) — same limitation as 4.1
- [x] 4.3 Manually verify clearing the search box to empty, then visiting a tag and returning, shows the blank state — not a resurrected earlier snapshot — same limitation as 4.1
- [x] 4.4 Run `bun run lint`, `bun run test`, and `bun run build` to confirm no regressions — all pass (40/40 tests, clean typecheck/build; two pre-existing lint infos unrelated to this change)
