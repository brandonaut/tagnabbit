## Context

See proposal.md - Why. `SearchPage` is unmounted whenever the route switches to `/tag/:id` or `/favorites` (wouter's `Switch` renders exactly one matched route), so all of its component state — `query`, `result`, `filters`, `localTags`, the Fuse index, `isSurpriseRef` — is discarded. On remount, `filters`/`query` are re-seeded from the URL (`add-spa-client-routing`'s change), and a typed search's `result` is recomputed deterministically from those same URL params via the existing Fuse-search effect. "Surprise Me" has no query at all — its result is a random sample with nothing in the URL to recompute from — so today it's simply lost.

`src/hashLocation.ts` (the app's custom hash-mode location hook, written for `add-spa-client-routing`) currently drops any `state` argument passed to `navigate()`: the push branch hardcodes `null`, and the replace branch happens to preserve whatever `history.state` already held only because it wasn't written to explicitly, not by design.

## Goals / Non-Goals

**Goals:**
- Surprise Me's exact sampled tags survive a visit to one of them and back.
- The same mechanism covers typed search results too, skipping a redundant `Fuse.search()` call on restore (though see Non-Goals — this does not make back-navigation instant end-to-end).
- A snapshot from an earlier, now-superseded search state is never wrongly restored after the user has since performed a new search.

**Non-Goals:**
- Not eliminating the `localTags`/Fuse-index rebuild that happens on every `SearchPage` remount (IndexedDB read + index construction). That's a separate, larger question (whether to lift the tag database above the route) explicitly deferred; this change only fixes what's shown once that reload finishes.
- Not making Surprise Me's result shareable or refresh-safe via the URL. The restore mechanism is browser-history-only (`history.state`), matching how the pre-router app's in-memory `searchState` behaved — same session, same tab, back/forward only.
- Not changing the route table, URL shape, or any screen other than `/search`'s internal restore behavior.

## Decisions

**Persist via `history.state` on the `/search` entry, not the URL or a lifted App-level state.** Three options were considered:
1. Encode the sampled tag IDs in the URL (e.g. `?surprise=1,2,3`) — would make Surprise Me shareable/refresh-safe as a side effect, but that's scope beyond what was asked, and turns an intentionally ephemeral "surprise me now" action into a permanent link.
2. Lift `result` back to `App.tsx`, alongside `favorites` — closest to the pre-router design, but reintroduces prop drilling for search-specific state that the router migration was meant to get rid of.
3. **`history.state` on the `/search` history entry (chosen)** — this is exactly the browser-native mechanism for "remember something about a scroll position or list state so back navigation can restore it." It requires no new props, no URL changes, and naturally scopes itself to browser-history lifetime (gone on refresh, same as the old in-memory behavior).

**What gets stored: `{ q, type, parts, tagIds, available }`, not the full `Tag` objects or Fuse match indices.** Storing only IDs plus the params they were computed under keeps the snapshot small and lets `SearchPage` validate applicability trivially (exact match against current URL params) before using it. `available` (the total match/pool count shown as "N matches, showing M") is included too — without it, a restored Surprise Me result would show `tagIds.length` as the total, silently losing the "N matches" context the original draw had (`SearchPage`'s `handleSurpriseMe` sets `available` to the full filtered pool size, not the sample size). `Tag` objects are rehydrated from `localTags` by ID once it's loaded. Fuse match-highlight ranges are intentionally *not* snapshotted — for a typed query, the existing Fuse-search effect still runs and recomputes them (and will overwrite the seeded `result` with an equivalent one, since the search is deterministic); the snapshot's only job there is to avoid an initial blank flash, not to bypass computation entirely. For Surprise Me, there's no Fuse effect to overwrite it, so the seeded value is authoritative and `isSurpriseRef` protects it from being cleared by the empty-query branch, exactly as it already does within a single mount today (`SearchPage.tsx:195,200`).

**Snapshot is written via the same effect that already syncs the URL, not a separate one.** `SearchPage` already has an effect that does a `replace: true` navigate on every debounced-query/filter change to keep the URL in sync. A second, independent `replace: true` call for the state snapshot would race it — since `replaceState` replaces the whole history entry, whichever call ran last would silently wipe out whatever `state` the other had just set. So the snapshot is computed and passed as `state` in that same existing navigate call, not a new one.

**Snapshot is written on every `result` change, and explicitly cleared (not just left unwritten) when `result` becomes `null`.** Writing only on non-null results would leave a stale snapshot sitting in `history.state` after the user manually clears the search box — a later remount with `q` empty would then wrongly resurrect the old snapshot instead of showing the blank state the user actually left the page in. Clearing on `result → null` closes this.

**`hashLocation.ts`'s `navigate()` needs proper `state` support before any of this works.** Both the push and replace branches must accept and pass through an explicit `state` argument (the replace branch's current behavior — silently preserving whatever was already in `history.state` — happens to be harmless for this change's purposes, but is coincidental, not intentional, and push currently discards `state` outright).

**Restoration only applies on an exact `q`/`type`/`parts` match against the current URL.** No partial or fuzzy matching — if any of the three differ from what the snapshot was computed under, it's ignored and the page falls through to its normal load path (Fuse recompute for a typed query, blank for an empty one with no snapshot). This is what makes the "intervening search replaces the restorable state" spec scenario hold: a new search's own snapshot-write (or the natural absence of a match) is what invalidates the old one — no separate invalidation step is needed beyond the exact-match check itself.

## Risks / Trade-offs

- **`localTags` may not be loaded yet when a matching snapshot is found on mount** → Mitigation: stash the pending snapshot in a ref at mount time; apply it (hydrate `tagIds` → `Tag[]`, `setResult`, set `isSurpriseRef` if `q` was empty) once the existing bootstrap effect finishes loading `localTags`, same timing the normal search effect already depends on.
- **A snapshot could reference tag IDs no longer in `localTags`** (e.g. catalog changed between the snapshot being written and being restored) → Mitigation: filter to IDs that still resolve when hydrating; a shrunk result is an acceptable degrade for this edge case, not worth blocking on.
- **This does not fix the perceived latency of back-navigation** (see Non-Goals) → users will still see "Loading tag database…" before the restored result appears; documented explicitly so it isn't mistaken for a regression or an incomplete fix later.
