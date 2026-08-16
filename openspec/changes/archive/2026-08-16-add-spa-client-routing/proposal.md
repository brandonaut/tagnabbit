## Why

Tagnabbit currently has no router — `App.tsx` holds two ad-hoc state values (`searchState`, `selectedTag`) and a hand-rolled `popstate` listener that only knows how to undo tag selection. Search query/filters and the search-vs-favorites tab live only in memory, so they're lost on refresh and can't be shared or bookmarked. There's no way to link directly to a specific tag, a filtered search, or the favorites list.

## What Changes

- Add `wouter` (hash-mode router) as a dependency and introduce real routes for the app's existing screens.
- **BREAKING**: Favorites becomes its own route/page (`/#/favorites`) instead of a tab inside `SearchPage`.
- `SearchPage` reads/writes `q`, `type`, `parts` from the URL querystring instead of owning them as local/prop-drilled state; URL is written via `replaceState` on the existing 150ms debounce (no history-entry spam while typing).
- `TagPage` becomes reachable at `/#/tag/:id` and gains an id → `Tag` lookup for the case where the page loads directly (deep link, bookmark, refresh) with no `Tag` object already in memory.
  Lookup checks the local IndexedDB cache first, then falls back to fetching the tag live from barbershoptags.com and caching it, so a shared link works even for someone who has never opened the app before and has no local tag database yet.
- Remove `App.tsx`'s manual `popstate` listener and the `searchState`/`selectedTag` state machine — the router owns navigation and back/forward.
- Favorites data (get/toggle) stays lifted at the root so both `/favorites` and the heart icon on `/tag/:id` can use it.
- Out of scope: no standalone route for the Tuner ("music player") — it stays embedded as it is today.

## Capabilities

### New Capabilities
- `client-routing`: URL-addressable navigation for the app's screens — route table, hash-routing rationale, search-state-in-URL behavior, and deep-link tag lookup.

### Modified Capabilities
(none — no existing capability specs cover search/favorites/tag-page behavior today)

## Impact

- New dependency: `wouter`.
- `src/App.tsx`: state machine and `popstate` listener removed, replaced by router setup.
- `src/SearchPage.tsx`: query/filter state sourced from URL; favorites tab removed (split into its own page).
- `src/TagPage.tsx`: gains id-based lookup path for direct navigation, with a live-fetch-and-cache fallback for tags not yet in the local database.
- `src/cache/tagDatabase.ts`: needs a lookup-by-id accessor and a way to persist an individually-fetched tag, without disturbing the full-catalog cache's freshness bookkeeping used by `SearchPage`'s bootstrap logic.
- `src/api/tags.ts`: needs a way to fetch a single tag by id for the deep-link fallback (reusing the existing `searchTags()` query, filtered to an exact id match — the app doesn't currently rely on the API supporting an id-specific parameter).
- Hosting: GitHub Pages, static, no server rewrite (`vite.config.ts` `base: "/tagnabbit/"`, `actions/deploy-pages`) — this is why hash routing was chosen over path-based routing with a 404.html fallback trick.
- No changes to `vite-plugin-pwa`/Workbox config anticipated (hash routes don't affect navigation-request precaching), but should be verified during implementation.
