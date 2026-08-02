## Why

Barbershop tags are typically sung while looking at the phone screen, often propped up hands-free.
The OS screen-lock timeout interrupts this mid-tag, forcing the singer to unlock and re-open the tag to keep reading.
Keeping the screen awake while sheet music is on screen removes that interruption.

## What Changes

- Request a Screen Wake Lock (`navigator.wakeLock`) while sheet music content is actually rendered on the tag detail page.
- Release the wake lock when the sheet music is no longer rendered (tag page unmounted, or sheet music cleared/changed).
- Re-acquire the wake lock when the tab returns to the foreground, since the OS releases it automatically when the tab is backgrounded.
- Fail silently when the Wake Lock API is unsupported or a request is rejected (e.g. low battery mode) — no error UI, no user-facing indicator.
- No settings toggle: this is always on whenever sheet music is showing.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `sheet-music-viewer`: adds a requirement that the screen SHALL be kept awake while sheet music content is rendered on the tag detail page, released otherwise.

## Impact

- `src/TagPage.tsx`: acquire/release the wake lock tied to the existing `objectUrl` readiness state, plus a `visibilitychange` listener to reacquire on foreground.
- New small hook/utility (e.g. `src/useWakeLock.ts`) wrapping `navigator.wakeLock` feature-detection and sentinel lifecycle.
- No new dependencies — uses the native Screen Wake Lock API.
