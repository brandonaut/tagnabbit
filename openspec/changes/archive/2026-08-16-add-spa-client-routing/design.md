## Context

See proposal.md - Why. Current navigation lives entirely in `App.tsx`: two `useState` values (`searchState`, `selectedTag`) conditionally render `SearchPage` or `TagPage`, and a single `popstate` listener resets `selectedTag` to `null` on back — it doesn't restore forward navigation, doesn't know about favorites, and search query/filters aren't persisted anywhere the URL can see.

Hosting constraint: GitHub Pages, static, `base: "/tagnabbit/"`, no server-side rewrite (`vite.config.ts`, `.github/workflows/deploy.yml`). A path-based router would 404 on a direct hit or refresh of e.g. `/tagnabbit/tag/123` unless a 404.html-redirect trick is added; hash-based URLs (`/tagnabbit/#/tag/123`) always resolve because the server only ever sees the path before `#`.

## Goals / Non-Goals

**Goals:**
- Every screen (search, favorites, tag detail) reachable and shareable via its own URL.
- Search query + filters live in the URL (querystring), survive refresh, are shareable.
- Typing in the search box doesn't spam browser history.
- Deep-linking straight to a tag works even when nothing is loaded in memory yet.
- Browser back/forward works without a custom `popstate` listener.

**Non-Goals:**
- No standalone route for the Tuner ("music player") — stays embedded as-is.
- No change to how the local tag cache is populated/synced (`fetchAllTags`, `tagDatabase.ts`'s existing storage behavior).
- No change to PWA precaching strategy beyond verifying hash routes don't need special Workbox handling (they don't — Workbox only sees the pre-`#` path, which is static).
- Not attempting path-based routing or a 404.html fallback; hash mode is the chosen answer to the hosting constraint, not one option among several to keep implementing.

## Decisions

**Router: wouter, hash mode.** App has zero routing dependencies today and hand-rolls one `pushState` call — wouter (~1.5kb, hook-based) matches that minimalism far better than react-router (~50kb+) for an app with three routes. Hash mode is used instead of the default path-based `useLocation` specifically because of the GitHub Pages constraint above (see Context). Considered path routing + 404.html trick: rejected for now as unnecessary added build/deploy complexity for a static-hosted app this size; can revisit if URL aesthetics become a real complaint.

**Custom hash-location hook, not wouter's built-in one.** wouter ships `wouter/use-hash-location`, but its `navigate()` splits the target into a hash-only path and a *real* `location.search` — i.e. `navigate("/search?q=foo")` produces `https://host/app/?q=foo#/search`, not `https://host/app/#/search?q=foo`. That's a library-level design choice (search state lives outside the hash even in hash mode), discovered when the intended `#/search?q=...` URL shape (proposal.md, this file's Route table above) didn't hold up in practice. `src/hashLocation.ts` implements a small equivalent hook (same `[path, navigate]` shape, `useSyncExternalStore`-based, hashchange-driven) that keeps the entire path+search pair inside the fragment, and attaches a paired `searchHook` (mirroring wouter's own `memory-location.js` pattern) so `useSearch()`/`useSearchParams()` read/write the in-hash search instead of the real one. `App.tsx` uses this local hook in place of `wouter/use-hash-location`; everything else (`Router`, `Route`, `Switch`, `Redirect`, `useLocation`, `useSearchParams`) is still wouter's own.

**Route table:**
```
/#/search?q=...&type=...&parts=...   (default — also what "/" redirects to)
/#/favorites
/#/tag/:id
```
Favorites moves from a `SearchPage` tab to its own route/component. This is the one **BREAKING** UI change called out in the proposal.

**Search state ownership: URL is source of truth.** `SearchPage` reads initial `q`/`type`/`parts` from wouter's `useSearch()` (parsed via `URLSearchParams`) instead of receiving them as props from `App`. On the existing 150ms debounce (`SearchPage.tsx:158-161`), the same effect that currently triggers a Fuse re-search also calls `setLocation(..., { replace: true })` to sync the URL — reusing the debounce means no separate throttling logic is needed, and `replace: true` is what keeps keystrokes from spamming history (per-requirement in specs).

Fuse `result` itself is **not** encoded in the URL (too large, fully derivable). On any fresh load with a `q`/filters present, it's recomputed locally from `localTags` via the existing search effect — same code path as typing, just seeded from URL params instead of an empty string. This does mean `App`'s current `searchState.result` back-navigation shortcut (skip recompute, reuse in-memory results) goes away in favor of one Fuse-index re-run against local (in-memory, already-loaded) data — negligible cost since it's synchronous local search, not a network round trip.

**Deep-linked tag lookup, with a live-fetch fallback.** `TagPage` currently only ever receives a full `Tag` object via props (`App.tsx:43`, set from a row the user clicked in `SearchPage`). For `/#/tag/:id` reached directly (bookmark, share, refresh, or forward-navigation after a reload), no such object exists yet. Lookup order on mount, if no `Tag` is available for the current `:id`:
1. Local IndexedDB full-catalog cache (`tagDatabase.ts`), if one has been downloaded.
2. A live fetch of that single tag from barbershoptags.com, if step 1 misses.
3. Not-found state, if step 2 also fails (bad id, or the request errors — e.g. offline).

The live-fetch step is what makes sharing a tag link work for someone who has never opened the app before: they have no full-catalog cache yet, but the single tag still resolves and renders. Reuses the existing `searchTags()` call against `api.php?q=<id>`, filtered client-side to an exact `id` match — chosen over inventing a new API call because the barbershoptags.com API's support for an id-specific query parameter isn't confirmed, and `SearchPage`'s existing numeric-id handling (`SearchPage.tsx:200-208`) already treats a numeric query as something to filter for an exact id match rather than assuming the server does it.

**Where the live-fetched tag gets stored.** Persisting it matters (task says "add it to the db") so a repeat visit to the same shared link doesn't re-fetch, and so the tag becomes locally searchable if the user later downloads the full catalog. But writing it into the same `tags` key that `storeAllTags()` uses is risky: `SearchPage`'s bootstrap logic (`SearchPage.tsx:120-145`) treats a non-empty local cache as "the user has a full catalog" and skips seeding from the bundled snapshot / prompting a full download — a cache that's actually just one ad-hoc tag would falsely look like a real local database. Decision: store live-fetched tags in a separate small key/store (e.g. `adhocTags`, a `Record<id, Tag>`) in `tagDatabase.ts`, distinct from the full-catalog `tags` key and its `meta`. `TagPage`'s lookup checks both the full-catalog cache and this ad-hoc store; `SearchPage`'s bootstrap/staleness logic is untouched since it only ever looks at the full-catalog key. If the user later downloads the full catalog, the ad-hoc store can simply be left as a redundant subset (or cleared) — not required for this change to function correctly.

**Favorites stay lifted at the root.** Both the `/favorites` route and the heart icon on `/tag/:id` need read/toggle access; keeping this in the root component (as `App.tsx` does today) avoids threading it through the router in a special way.

**`App.tsx`'s `popstate` listener is deleted**, not migrated — wouter's hash-history integration replaces it entirely; the manual listener only ever handled one case (`selectedTag` reset) and that case no longer exists once route changes are what render `TagPage`.

## Risks / Trade-offs

- **Hash URLs are less clean than path URLs** (`/#/tag/123` vs `/tag/123`) → Accepted trade-off for zero deploy/server complexity on GitHub Pages; revisit only if this becomes a real user complaint.
- **Losing the in-memory Fuse-result shortcut on back-navigation** means a brief recompute instead of an instant restore → Mitigation: recompute is a synchronous local Fuse search over already-loaded data (not a fetch), so the cost is small; can be revisited if it's perceptibly slow in practice.
- **Existing bookmarks/links to the app's bare URL** (no hash) still work since `/#/search` is the default redirect target → no migration needed for existing users, nothing was previously linkable to break.
- **Live tag fetch requires a network connection** — a shared link opened offline with no matching local/ad-hoc cache entry can't resolve → falls through to the not-found state (per spec); acceptable since the app has no offline-first guarantee for content it has never seen before.
- **Ad-hoc-fetched tags can drift from the full catalog** if the tag's details change on barbershoptags.com between the ad-hoc fetch and a later full-catalog download → Mitigation: none needed — a subsequent full download's `tags` array is authoritative and simply supersedes the ad-hoc entry for search purposes; the ad-hoc store is only ever a fallback lookup, never merged into or trusted over the full catalog.

## Open Questions

None — the deferred scope (Tuner/"music player" route) is an explicit non-goal, not an open question; it can be added as a later change without affecting this design.
