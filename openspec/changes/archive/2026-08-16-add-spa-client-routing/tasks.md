## 1. Dependency & Router Setup

- [x] 1.1 Add `wouter` to `package.json` dependencies
- [x] 1.2 In `main.tsx` or `App.tsx`, wrap the app in wouter's `Router` configured with a hash-mode location hook — using a custom `src/hashLocation.ts` hook rather than `wouter/use-hash-location`, since the built-in one puts the query string in the real `location.search` outside the `#` (see design.md)
- [x] 1.3 Define the route table: `/search`, `/favorites`, `/tag/:id`, and a redirect from `/` to `/search`

## 2. Tag Cache Lookup & Live Fetch Fallback

- [x] 2.1 Add a `getCachedTagById(id: string): Promise<Tag | null>` helper to `src/cache/tagDatabase.ts` (reads the existing full tag list via `getCachedAllTags()` and finds by id — no new IndexedDB store needed for this part)
- [x] 2.2 Add a separate `adhocTags` key/store to `src/cache/tagDatabase.ts` (e.g. `Record<id, Tag>`) plus `getAdhocTag(id)` / `storeAdhocTag(tag)` helpers — kept distinct from the `tags`/`meta` keys so `SearchPage`'s full-catalog bootstrap/staleness logic (`SearchPage.tsx:120-145`) is unaffected
- [x] 2.3 Add a `fetchTagById(id: string): Promise<Tag | null>` helper to `src/api/tags.ts` that calls the existing `searchTags(id)` and filters the results for an exact `id` match
- [x] 2.4 Add a combined `resolveTag(id: string): Promise<Tag | null>` (or equivalent) that tries: full-catalog cache → ad-hoc cache → live fetch (storing the result via `storeAdhocTag` on success)

## 3. Search Screen — URL-backed state

- [x] 3.1 In `SearchPage.tsx`, read initial `q`, `type`, `parts` from wouter's `useSearchParams()` instead of receiving `initialQuery`/`initialResult` as props
- [x] 3.2 Add an effect keyed on the debounced query and filters that writes the current `q`/`type`/`parts` to the URL via `setSearchParams(..., { replace: true })`
- [x] 3.3 Remove the favorites tab (`activeTab` state, tab toggle UI) from `SearchPage.tsx` — favorites becomes its own route (see Section 5); toggle UI extracted to a shared `NavTabs` component reused by `/search` and `/favorites`
- [ ] 3.4 Verify: typing a query updates the URL without adding a new browser-history entry per keystroke (back button should leave the search screen entirely, not step through keystrokes) — needs a real browser session, see Section 7

## 4. Tag Detail Screen — routed with deep-link support

- [x] 4.1 Wire `/tag/:id` to render `TagPage`, passing the route's `id` param
- [x] 4.2 In `TagPage.tsx`, if no `Tag` object is available for the current `:id` (fresh/direct load), resolve it via `resolveTag()` from Section 2.4, showing a loading state while the (possibly network) lookup is in flight
- [x] 4.3 Add a not-found state in `TagPage.tsx` for when `resolveTag()` returns null (unknown id, or the live fetch failed/offline)
- [x] 4.4 Update navigation from a search/favorites row (`onSelectTag` equivalent) to `setLocation`-navigate to `/tag/:id` instead of setting `selectedTag` state directly
- [x] 4.5 Back button in `TagPage.tsx` kept as `history.back()`, not changed to a wouter-specific call — wouter has no separate "go back" API; its `navigate()` itself works via `pushState`/`replaceState`, so the browser history stack *is* the router-level mechanism, and `history.back()` is the correct way to traverse it

## 5. Favorites Screen

- [x] 5.1 Extract favorites list rendering out of `SearchPage.tsx` into its own component/screen mounted at `/favorites`
- [x] 5.2 Keep favorites state (`getFavorites`/`toggleFavorite`) lifted at the root (`App.tsx`) so both `/favorites` and the heart icon on `/tag/:id` share it

## 6. Remove Legacy Navigation State

- [x] 6.1 Remove `App.tsx`'s `searchState`/`selectedTag` `useState` values and the conditional `SearchPage`/`TagPage` render, replacing with the route table from Section 1.3
- [x] 6.2 Remove `App.tsx`'s manual `popstate` listener (`App.tsx:18-22`) — wouter's hash-history integration supersedes it

## 7. Verification

- [ ] 7.1 Manually verify each spec scenario in `specs/client-routing/spec.md`: default route, direct load of favorites URL, direct load of a tag URL (cached id, uncached-but-valid id triggering a live fetch, and an unresolvable id), shareable/refreshable search URL, no history-spam while typing, back/forward across search → tag → back — **needs a real browser session; no browser-automation tool was available to drive this from the coding session**
- [ ] 7.4 Manually verify the "share with a first-time user" scenario end to end: clear the local IndexedDB cache entirely, open a `/tag/:id` link directly, confirm the tag loads via live fetch and reopening the same link afterward no longer needs the network (served from the ad-hoc cache) — same limitation as 7.1
- [x] 7.2 Run `bun run lint`, `bun run test`, and `bun run build` to confirm no regressions — all pass (40/40 tests, clean build; two pre-existing lint infos unrelated to this change)
- [ ] 7.3 Run `bun run preview` and manually click through search, favorites, and a tag detail page in a built (non-dev) build, including a hard refresh on each route — same limitation as 7.1; `bun run preview` was confirmed to serve the built app (HTTPS via mkcert, port 4173) but the click-through itself needs a human
