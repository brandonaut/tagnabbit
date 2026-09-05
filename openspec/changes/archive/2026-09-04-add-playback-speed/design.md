## Context

`PlayerPage.tsx` already routes audio through a Web Audio graph for balance and mono (`createMediaElementSource` → `ChannelSplitter` → gain nodes → `ChannelMerger` → destination).
Playback rate is a separate concern: `HTMLMediaElement.playbackRate` and `HTMLMediaElement.preservesPitch` operate on the element's own decode/output pipeline, upstream of that graph, so they don't need any new nodes or graph rewiring.
See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Let the user pick a fixed playback speed from a dropdown, applied immediately without restarting playback.
- Preserve pitch at all speeds using the browser's built-in support.
- Persist the selected speed the same way `balance` and `mono` are already persisted.

**Non-Goals:**
- Arbitrary/continuous speed selection (a slider) — the user asked for a fixed dropdown list instead.
- A pitch-shift-without-rate-change ("key change") feature — out of scope, this is playback rate only.
- Per-track remembered speed (i.e. different speeds for different files) — like balance/mono today, only the single currently-loaded file's setting is persisted.

## Decisions

- **Set `playbackRate` and `preservesPitch` directly on the `<audio>` element**, not via a Web Audio `AudioBufferSourceNode.playbackRate` param. Alternative considered: doing the rate change in the Web Audio graph — rejected because it would require switching from `MediaElementAudioSourceNode` to a buffer-based source, a much bigger rework of the existing streaming-friendly setup, for no added benefit.
- **`preservesPitch` always `true`, no user toggle.** Alternative considered: exposing a toggle to let pitch shift naturally (tape-speed effect) — rejected per explicit user preference; pitch-preserved is the useful mode for practice and keeps the control surface simpler.
- **Fixed dropdown of 7 values** (0.5, 0.75, 0.9, 1, 1.25, 1.5, 2) rather than a slider. Alternative considered: a slider matching the existing balance control's visual style — rejected per explicit user preference for discrete, predictable values over fine-grained continuous control.
- **Persist `speed` on `PlayerFileRecord`** following the exact pattern of `balance`/`mono`: new field on the interface, included in `storePlayerFile` on fresh load (default `1`), read back in the mount-restore effect, and written via the same `persistDebounced`/`persistNow` paths as the other transient settings. Records written before this change simply lack the field; reading it undefined is treated as `1` (normal speed).

## Risks / Trade-offs

- [Some browsers historically had bugs with `preservesPitch` correctness/quality at extreme rates, particularly older WebKit/Safari builds] → Low risk: the range here (0.5–2) is modest, and the app already targets modern evergreen browsers as a PWA; no fallback is planned since a poor time-stretch algorithm is still strictly better than the current "no speed control at all."
- [`playbackRate` above 1 combined with `preservesPitch` can very occasionally cause brief audio glitches on some hardware/codec combinations] → Accepted; no mitigation planned, matches standard browser behavior users already encounter in other media players.
