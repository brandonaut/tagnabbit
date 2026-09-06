## Context

See proposal.md - Why for the bug. `loadTrack(track, opts: { autoplay: boolean })` already unconditionally pauses and resets `isPlaying` before checking `opts.autoplay` (`PlayerPage.tsx` ~290-296) — the `autoplay: false` path already lands correctly paused. Nothing there needs to change; only what the two call sites pass in.

## Goals / Non-Goals

**Goals:**
- Next/previous-track controls preserve the play/pause state in effect at the moment they're activated.

**Non-Goals:**
- No change to `handleSelectTrack` (playlist-tap-to-select stays always-autoplay, a separate confirmed requirement).
- No change to `loadTrack` itself — its `autoplay: false` path already behaves correctly.

## Decisions

**Read `isPlaying` at the moment the button fires, pass it straight through as `autoplay`.** `handleNextTrack` and `handlePreviousTrack` change `loadTrack(next, { autoplay: true })` / `loadTrack(prev, { autoplay: true })` to `loadTrack(next, { autoplay: isPlaying })` / `loadTrack(prev, { autoplay: isPlaying })`. `isPlaying` is React state already kept in sync with the `<audio>` element via its `onPlay`/`onPause` handlers, so it accurately reflects the state at the time of the click — no new state or ref needed. Alternative considered: read `audioRef.current.paused` directly instead of the `isPlaying` state — rejected as an unnecessary deviation from the existing pattern (`isPlaying` is already the established source of truth used everywhere else in this file, e.g. the play/pause button icon itself).

**Correction found during verification: `onEnded` needed splitting off into its own handler, not reused from `handleNextTrack`.** This design originally asserted (see the now-struck-through Non-Goal above) that the `onEnded` auto-advance path needed no change. That was wrong: per the HTML media spec, reaching a track's natural end fires a `pause` event *before* the `ended` event, so `isPlaying` is already `false` by the time an `onEnded={handleNextTrack}` handler would run — meaning `handleNextTrack`'s new `autoplay: isPlaying` logic would land the next track paused even though it had genuinely been playing. Fix: a separate `handleTrackEnded` function, wired to `onEnded` instead of `handleNextTrack`, that always autoplays the next track (correct by construction — reaching "ended" means it was playing) and does nothing if there's no next track (no jump-to-end fallback, unlike the manual button — the spec's "Last track in the playlist ends" scenario just wants playback to stop, not seek anywhere). This retires the "one function serves the manual and automatic triggers alike" decision from the original `add-audio-playlist` change's design.md, which held only as long as the manual button's autoplay was unconditional too.

## Risks / Trade-offs

- **[Risk] None significant remaining** — the `onEnded` interaction above was the one real risk this design underestimated, and it's now fixed with a dedicated handler rather than a conditional inside the shared one, avoiding another instance of the same state-timing trap.
