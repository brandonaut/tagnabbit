## Context

`TagPage.tsx` fetches sheet music into an object URL and renders it as an image, PDF, or generic iframe fallback.
Sheet music is read for singing, often with the phone propped up, so the OS screen-lock timeout interrupts the performance.
The Screen Wake Lock API (`navigator.wakeLock.request('screen')`) can prevent this, but the browser automatically releases the lock whenever the tab is backgrounded (app switch, screen lock, etc.), and does not restore it automatically when the tab returns to the foreground.

## Goals / Non-Goals

**Goals:**
- Keep the screen awake for exactly as long as sheet music content is rendered on the tag detail page.
- Recover the lock automatically when the tab regains visibility while sheet music is still showing.
- Degrade silently on browsers/environments where the API is missing or the request is refused.

**Non-Goals:**
- No settings/toggle UI for this behavior.
- No user-visible indicator of wake lock state (active, unsupported, or denied).
- No polyfill or fallback mechanism (e.g. a hidden video hack) for browsers without the native API.

## Decisions

- **Encapsulate in a `useWakeLock` hook** (`src/useWakeLock.ts`) that takes a boolean `active` flag and manages a `WakeLockSentinel` internally, rather than inlining `navigator.wakeLock` calls in `TagPage`.
  Alternative considered: inline the logic directly in `TagPage`'s existing effects. Rejected because the visibilitychange re-acquisition logic is independent of sheet-music-specific state and is easier to reason about (and reuse) in isolation.
- **Drive `active` from the existing `contentReady` readiness gate**, not from `objectUrl` alone. `objectUrl` is set while content is still loading/hidden behind the spinner (per the `sheet-music-viewer` "Content reveals only when fully ready" requirement); the proposal's intent ("displayed") is best matched by the moment content is actually visible on screen, i.e. `contentReady`.
  This also means the tag info popup (`infoOpen` state) has no effect on the wake lock: it's an overlay rendered independently of `contentReady`, so the sheet music stays mounted underneath it and the lock is never released just because the popup is open.
- **Feature-detect via `'wakeLock' in navigator`** and wrap `.request('screen')` in a try/catch. Any failure (unsupported, `NotAllowedError` from battery saver, etc.) is swallowed with no state change and no UI effect — matches the "silent failure" decision.
- **Re-acquire on `visibilitychange`**: when `document.visibilityState === 'visible'` and `active` is still true, re-request the lock. The hook does not attempt to detect or react to OS-level release for other reasons (e.g. user manually toggling a system setting) beyond the visibility signal, since that's the only reliably observable release trigger.
- **Release deterministically on cleanup**: the effect's cleanup function calls `sentinel.release()` whenever `active` becomes false or the component unmounts, rather than relying on the sentinel's own `release` event.

## Risks / Trade-offs

- [Risk] iOS Safari/PWA standalone mode has had inconsistent Wake Lock behavior historically → Mitigation: silent failure means worst case is identical to today's behavior (screen can lock); manual verification on an installed iOS home-screen PWA is called out as a task.
- [Risk] Driving `active` off `contentReady` means the lock isn't held during the loading spinner, only once content is visible → Accepted: matches "while sheet music is displayed" literally, and loading is typically brief.
- [Risk] Rapid mount/unmount or visibility flapping could fire redundant `request`/`release` calls → Mitigation: guard re-acquisition so a request is only issued when no sentinel is currently held.

## Open Questions

None outstanding — scope was confirmed with the user (sheet-music-visible-only trigger, silent failure, no settings toggle).
