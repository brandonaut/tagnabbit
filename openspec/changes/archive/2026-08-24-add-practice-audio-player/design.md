## Context

See proposal.md for motivation. Relevant current state:

- `App.tsx` is a flat `wouter` `Switch`: `/tag/:id`, `/favorites`, `/search`, default redirect to `/search`. No shared layout wraps any of them.
- `NavTabs.tsx` is a hardcoded two-way pill (`search` | `favorites`), rendered inline by `SearchPage.tsx` and `FavoritesPage.tsx` in each page's own header row — duplicated, not shared.
- `Tuner.tsx` already supports both a `floating` variant (fixed-position, collapsible toggle button — used today by `SearchPage` and `TagPage`) and an `inline` variant (bare wheel + key picker, no positioning chrome). Both variants stay in use after this change: `TagPage` and the new player screen keep `floating`; the new tuner screen uses `inline`.
- No audio playback exists anywhere in the app today. `useWakeLock` (used by `TagPage` while sheet music is displayed) is the one precedent for a screen-wake-lock lifecycle tied to "is this content actively in use."
- `src/cache/tagDatabase.ts` (IndexedDB) and `src/cache/sheetMusic.ts` (Cache API, LRU-bounded) are the existing precedents for persisting binary/structured data locally; the player's persisted file follows the same shape as `sheetMusic.ts` — a single stored blob, not a full re-buildable dataset like `tagDatabase.ts`.
- The app runs `display: "standalone"` (`vite.config.ts`) — no browser chrome, so the app owns the full viewport including the area a home indicator/gesture bar occupies. Nothing in the codebase touches `env(safe-area-inset-*)` yet; the new bottom tab bar is the first element that needs it.

## Goals / Non-Goals

**Goals:**
- Give the four top-level screens (search, favorites, player, tuner) one shared, persistent bottom tab bar instead of each screen managing its own nav UI.
- Keep the tag detail screen's own header/back-button pattern untouched — it is not one of the four tab-bar screens.
- Land a single-file audio player whose playback approach can be extended later (multi-track, tag-sourced URLs) without a rewrite.
- Remember the loaded file and its playback state (position, balance, mono) across reloads and sessions, so the player resumes where the user left off.

**Non-Goals:**
- Multi-track / synced playback. Only one file loads at a time.
- Wiring barbershoptags.com's per-part learning-track URLs into the player. `src/api/tags.ts` keeps discarding them for now (later change).

## Decisions

**Nested layout, not per-page bar.** The four tab-bar screens are nested under one layout route so the bar component mounts once and survives navigation between them; only the page content inside the layout swaps per route. `/tag/:id` stays a sibling route outside the layout — its own header, its own floating tuner, unaffected. Alternative considered: keep `NavTabs`'s current per-page pattern and just add a third/fourth call site. Rejected — duplicating the bar across four files is the exact problem being fixed, and a shared instance is required for the bar not to visually reset (re-render from scratch, lose any transition-in-progress) on every tab switch.

**`<audio>` element + a channel-splitter/gain/merger graph for balance, not `StereoPannerNode` and not raw `AudioBufferSourceNode` scheduling.** A single file has no multi-track sync problem, so the native `<audio>` element's built-in timeline (`currentTime`, `duration`, seeking) can be used directly — no manual playback-clock bookkeeping. `StereoPannerNode` was considered and rejected: it applies an equal-power pan law to the combined stereo signal (repositioning the mix in the stereo field), not independent per-channel gain, so it can't isolate one of the file's actual channels — which is the point here, since learning tracks put one part on the left channel and another on the right. Balance instead uses `MediaElementAudioSourceNode` → `ChannelSplitterNode` → two `GainNode`s (one per channel, driven by the balance slider) → `ChannelMergerNode` → `audioContext.destination`. The mono switch sums the two post-balance gain outputs into both merger inputs instead of keeping them separate, so it composes with whatever balance is currently set rather than an unweighted L+R sum. Alternative considered for the whole engine: decode to an `AudioBuffer` and schedule manually (as would be needed for multiple synced tracks). Rejected for v1 — unnecessary complexity for one file, and the native element gives scrubbing/seeking for free.

**Tuner screen reuses `Tuner` as-is (`variant="inline"`, `defaultSize="large"`), no new tuner logic.** The full-page tuner is just a new host for the existing component; none of the existing `tuner-*` specs change.

**Bottom tab bar built as a new component, not a `NavTabs` extension.** `NavTabs`'s highlight math is hardcoded for exactly two entries (`left: 2px/50%, right: 50%/2px`). Generalizing that to four is effectively a rewrite of the component, so the replacement is written fresh (list-driven over the four destinations) rather than patched. `NavTabs.tsx` is deleted once its two call sites are migrated.

**Floating tuner stays a per-screen mount, not part of the persistent layout.** `TagPage` and the player screen each mount their own `<Tuner variant="floating" />`, same pattern as today. It is not lifted into the shared layout, since the tag detail screen isn't part of that layout and the two floating instances have no state to share. Unlike `TagPage`, the player screen also sits inside the persistent layout with the bottom tab bar, so its transport controls, the floating tuner, and the tab bar are all competing for room near the bottom of the viewport — the transport controls are laid out above the tab bar in normal flow (not fixed-position), and the floating tuner's fixed corner position is chosen to clear both, checked in whichever screen state (collapsed/expanded) makes it most cramped: small viewport heights with the tuner expanded.

**Persist the loaded file as a stored blob in IndexedDB, one slot, not the File System Access API.** A new `src/cache/playerFile.ts` module (same shape as `sheetMusic.ts`) stores the loaded file's bytes plus its name/type and the current position/balance/mono as a single record, overwritten wholesale on each new file load; `PlayerPage` reads it once on mount to restore state, and writes back on file load, and on debounced position/balance/mono changes. Alternative considered: the File System Access API's `showOpenFilePicker` with persisted permissions, which would avoid duplicating the file's bytes into IndexedDB. Rejected — it's not available in all target browsers (notably Safari), and the app already has an established IndexedDB pattern to follow instead of introducing a second, less-portable storage mechanism.

## Risks / Trade-offs

- **Nesting the router changes the shape of `App.tsx`'s route table.** Mitigation: keep `/tag/:id` as a sibling `Route` outside the new layout `Route`, so its behavior (own header, own floating tuner, resolving a tag by id) is untouched — verified by the existing `client-routing` scenarios for tag URLs, which are unmodified by this change's delta spec.
- **Safe-area padding is new territory for this codebase.** Mitigation: scope it to the tab bar's own bottom padding (`env(safe-area-inset-bottom)`), not a global layout change, so a mistake here can't affect the rest of the app.
- **Balance control depends on the Web Audio API being able to wrap a live `<audio>` element without breaking native playback.** This is a well-established pattern (no known browser gaps for `MediaElementAudioSourceNode`/`ChannelSplitterNode`/`GainNode`/`ChannelMergerNode` in evergreen browsers) but should be checked against the actual target-browser list during implementation.
- **Persisting the file's raw bytes in IndexedDB risks hitting storage quota for large recordings**, unlike the small PDFs `sheetMusic.ts` caches today. Mitigation: treat persistence as best-effort per the spec's silent-failure requirement — a write or read failure falls back to the empty state rather than blocking playback or surfacing an error.
