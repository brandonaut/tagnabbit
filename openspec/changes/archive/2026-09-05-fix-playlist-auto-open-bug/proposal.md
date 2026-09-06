## Why

The playlist modal keeps popping open unexpectedly. Root cause: `App.tsx` mounts `PlayerPage` inside a `wouter` `<Switch>`, which fully unmounts/remounts `PlayerPage` every time the user navigates away to another tab (Search/Tuner/Favorites) and back to Player — it isn't a persistent/hidden component, it's destroyed and recreated. `PlayerPage.tsx`'s `isPlaylistOpen` state initializes as `useState(true)`, so every remount reopens the modal regardless of whether the user had closed it or whether the playlist already has tracks. This reads as "keeps popping open when the page is in focus" since switching tabs (or the OS backgrounding/foregrounding the PWA) is exactly when the remount happens.

## What Changes

- Remove the auto-open-on-mount default entirely: `isPlaylistOpen` goes back to initializing as `false`.
- No attempt to make the auto-open "smarter" (e.g. open only when the playlist is empty) — the main screen's "Playlist is empty" empty state and the always-visible header "Playlist" trigger already make the first-add path discoverable without forcing the modal open.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this reverts a UI-layout default the prior change's design.md explicitly documented as "not a new behavioral contract"; nothing here was ever captured in `specs/practice-audio-player/spec.md`)

## Impact

- `src/PlayerPage.tsx`: the `isPlaylistOpen` `useState` initializer only.
- No other files change.
