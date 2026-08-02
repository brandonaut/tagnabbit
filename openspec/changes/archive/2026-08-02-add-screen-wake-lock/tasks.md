## 1. Wake lock hook

- [x] 1.1 Create `src/useWakeLock.ts` exporting a hook that accepts an `active: boolean` and manages a `WakeLockSentinel`.
- [x] 1.2 Feature-detect `'wakeLock' in navigator`; no-op entirely when unsupported.
- [x] 1.3 Request the lock when `active` becomes true; wrap `.request('screen')` in try/catch and swallow all errors.
- [x] 1.4 Release the held sentinel (if any) when `active` becomes false or the hook unmounts.
- [x] 1.5 Add a `visibilitychange` listener that re-requests the lock when `document.visibilityState === 'visible'`, `active` is true, and no sentinel is currently held.

## 2. Wire into TagPage

- [x] 2.1 In `src/TagPage.tsx`, call `useWakeLock(contentReady)` so the lock is held only once sheet music is fully rendered and visible (matches the existing loading-gate behavior, not merely `objectUrl` being set).

## 3. Verification

- [ ] 3.1 Manually verify on desktop Chrome: opening a tag with sheet music acquires a wake lock (check via DevTools/`navigator.wakeLock`), navigating back releases it.
- [ ] 3.2 Manually verify switching tabs/apps away and back while a tag is open re-acquires the lock.
- [ ] 3.3 Manually verify opening and closing the tag info popup while sheet music is displayed does not release the wake lock.
- [ ] 3.4 Manually verify on an installed iOS home-screen PWA that the screen stays awake while sheet music is shown (called out in design.md as a known risk area).
- [ ] 3.5 Confirm no console errors or UI change occurs in a browser without Wake Lock support (or by stubbing `navigator.wakeLock` to `undefined`).
- [x] 3.6 Run `bun run lint` and `bun run build`.
