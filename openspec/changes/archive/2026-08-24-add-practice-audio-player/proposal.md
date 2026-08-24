## Why

Tagnabbit helps singers find a tag and its sheet music, but offers no way to play a practice recording while singing along, and its two-tab nav (Search/Favorites) has no room to grow without a redesign.
Adding a practice player now, alongside a nav shape that scales past two screens, unblocks a later phase where the player can load a tag's own official learning tracks.

## What Changes

- Add a `/player` screen: load a single local audio file (file picker or drag-drop), native transport (play/pause, ±10s skip, scrub timeline), an L/R balance slider, a mono switch, and its own floating tuner, same as the tag detail screen.
- The loaded file, its playback position, balance, and mono setting persist across reloads and sessions, so reopening the player resumes where the user left off.
- Add a `/tuner` screen: the existing tuner component shown full-size as its own destination, for tuning without a tag or a practice track open.
- Replace the current two-tab pill nav (duplicated inline on the search and favorites screens) with a persistent bottom icon+label tab bar covering Search, Favorites, Player, and Tuner, shared across those four screens so it does not remount on navigation between them.
- Remove the search screen's floating tuner (superseded by the dedicated `/tuner` screen). The tag detail screen and the new player screen keep their own floating tuner instances, unaffected.

## Capabilities

### New Capabilities
- `practice-audio-player`: load a local audio file and play it back with transport controls and an L/R balance adjustment, for practicing along with a recording.
- `primary-navigation`: a persistent bottom tab bar giving access to the search, favorites, player, and tuner screens without losing nav state between them.

### Modified Capabilities
- `client-routing`: adds the player and tuner screens as distinct, directly-loadable URLs alongside the existing search, favorites, and tag detail screens.

## Impact

- New files: a player screen, a standalone tuner screen, a persistent layout component hosting the new tab bar, and an IndexedDB store for the player's persisted file and state (mirroring the existing `tagDatabase.ts`/`sheetMusic.ts` pattern).
- Changed: the app's route table (adds `/player` and `/tuner`, nests search/favorites/player/tuner under the persistent layout; tag detail stays a sibling route with its own header, unchanged); the search and favorites screens drop their inline nav pill in favor of the shared bar; the search screen drops its floating tuner mount.
- No new dependencies — playback uses the native `<audio>` element and the Web Audio API (`MediaElementAudioSourceNode` → `ChannelSplitterNode`/`GainNode`/`ChannelMergerNode`) already available in the browser; persistence uses IndexedDB, already used elsewhere in the app; icons come from the `lucide-react` package already in use.
- Out of scope: wiring a tag's official learning-track URLs (currently parsed then discarded by the API client) into this player. Left for a later change.
