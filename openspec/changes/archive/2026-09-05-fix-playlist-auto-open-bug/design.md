## Context

See proposal.md - Why for the root cause (route-driven remount via `wouter`'s `<Switch>` resetting a `useState` default). No new architecture, dependency, or ambiguity here — this doc is intentionally short.

## Goals / Non-Goals

**Goals:**
- Stop the playlist modal from reopening on every remount of `PlayerPage`.

**Non-Goals:**
- No attempt to persist "the user's last open/closed preference" across remounts, or to make the auto-open conditional on playlist emptiness — per the explore-session decision, auto-open is removed outright, not made smarter.
- No change to `PlayerPage`'s remount-on-navigation behavior itself (the `wouter` `<Switch>` structure in `App.tsx`) — that's an existing, unrelated architectural pattern the whole app relies on, out of scope for a one-line bug fix.

## Decisions

**Revert `isPlaylistOpen`'s initializer from `useState(true)` to `useState(false)`, with no replacement logic.** The original `true` default (from the now-archived `add-audio-playlist` change) was meant to avoid a dead-end on a genuinely empty, first-ever visit. Two things built since then already cover that case without forcing the modal open: the main screen's empty state clearly reads "Playlist is empty," and the header's "Playlist" trigger is always visible regardless of playlist state. Alternative considered: only auto-open when the restored playlist is empty (checked in the existing mount-restore effect) — rejected per explicit direction in favor of the simpler no-auto-open-at-all behavior.

## Risks / Trade-offs

- **[Risk] A first-time user with a completely empty playlist now has to notice and tap the header's "Playlist" button themselves, rather than landing straight in the add-tracks flow.** → Accepted: explicit trade-off from the explore session, in exchange for eliminating the reopening bug entirely rather than adding conditional logic that could have its own edge cases.
