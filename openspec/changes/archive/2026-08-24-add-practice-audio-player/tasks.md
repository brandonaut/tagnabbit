## 1. Routing restructure

- [x] 1.1 Add a `Layout` component that renders its children plus the new bottom tab bar
- [x] 1.2 In `App.tsx`, nest `/search`, `/favorites`, `/player`, `/tuner` (and the default redirect to `/search`) inside `Layout`; keep `/tag/:id` as a sibling route outside it, unchanged
- [x] 1.3 Verify deep-linking each of the four nested URLs directly (fresh load) renders the right screen inside `Layout`

## 2. Bottom tab bar

- [x] 2.1 Build the new tab bar component (list-driven over Search/Favorites/Player/Tuner — icon, label, route), replacing `NavTabs.tsx`
- [x] 2.2 Highlight the active destination based on current location
- [x] 2.3 Fix the bar to the bottom of the viewport, padded with `env(safe-area-inset-bottom)`
- [x] 2.4 Remove `NavTabs.tsx` and its two call sites (`SearchPage.tsx`, `FavoritesPage.tsx`); drop the inline nav-pill markup from both pages' header rows

## 3. Tuner screen

- [x] 3.1 Add `TunerPage.tsx` rendering `<Tuner variant="inline" defaultSize="large" defaultKey="C" defaultTemperament="et" />`
- [x] 3.2 Wire the `/tuner` route to it

## 4. Player screen — file loading and audio engine

- [x] 4.1 Add `PlayerPage.tsx` with a file picker and drag-and-drop zone for loading a single local audio file
- [x] 4.2 Loading a new file tears down/resets any previous file's state (playback position, balance, mono) per the spec
- [x] 4.3 Wire a native `<audio>` element to the loaded file via an object URL, revoking the previous object URL on replace/unmount
- [x] 4.4 Build the Web Audio balance chain: `MediaElementAudioSourceNode` → `ChannelSplitterNode` → two `GainNode`s (left, right) → `ChannelMergerNode` → `audioContext.destination`, created once on first load and reused for later files (`MediaElementAudioSourceNode` can only be created once per `<audio>` element)
- [x] 4.5 Wire the mono switch to re-route the two gain outputs into both merger inputs (summed) instead of separate inputs, so it composes with the current balance setting
- [x] 4.6 Reuse `useWakeLock` (`src/useWakeLock.ts`), active while playback is in progress, released on pause/stop/navigate-away

## 5. Player screen — transport UI

- [x] 5.1 Play/pause control bound to the `<audio>` element
- [x] 5.2 Skip back 10s / skip forward 10s, clamped to track bounds
- [x] 5.3 Scrubbable timeline bound to `currentTime`/`duration`
- [x] 5.4 Balance slider bound to the left/right `GainNode`s, defaulting to centered on each new file
- [x] 5.5 Mono switch bound to the merger routing, defaulting to off on each new file
- [x] 5.6 Empty state shown when no file is loaded (including on direct load of `/player`, before any restore attempt resolves)
- [x] 5.7 Mount `<Tuner variant="floating" />` on the page, same pattern as `TagPage.tsx`
- [x] 5.8 Position transport controls and the floating tuner so neither overlaps the other or the bottom tab bar, in both the tuner's collapsed and expanded states

## 6. Player screen — persisting the loaded file

- [x] 6.1 Add `src/cache/playerFile.ts`, an IndexedDB-backed single-slot store (same pattern as `sheetMusic.ts`) holding the file's bytes, name, type, and last position/balance/mono
- [x] 6.2 On `PlayerPage` mount, read the stored record and restore the file, position, balance, and mono setting; show the empty state if nothing is stored or the read fails
- [x] 6.3 On loading a new file, overwrite the stored record with the new file at its default position/balance/mono
- [x] 6.4 Persist position/balance/mono changes back to the store, debounced so scrubbing/dragging doesn't write on every event
- [x] 6.5 Wrap all store reads/writes so failures (unsupported storage, quota exceeded) fall back silently to the empty/in-memory-only state, per the spec

## 7. Verification

- [x] 7.1 Confirm `TagPage` is unaffected: own header, own floating tuner, no bottom tab bar, tag URL scenarios still pass
- [x] 7.2 Confirm `SearchPage` no longer mounts a floating tuner (superseded by `/tuner`)
- [x] 7.3 Run through every scenario in `specs/practice-audio-player`, `specs/primary-navigation`, and the modified `specs/client-routing` requirement by hand
