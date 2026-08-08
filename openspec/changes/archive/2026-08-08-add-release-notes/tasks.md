## 1. Shared version module

- [x] 1.1 Create `src/version.ts` exporting `APP_VERSION` and `RELEASE_DATE`, seeded with current values from `SettingsDrawer.tsx`
- [x] 1.2 Update `src/SettingsDrawer.tsx` to import from `src/version.ts` instead of declaring the constants
- [x] 1.3 Update `scripts/release.sh` sed step to target `src/version.ts` instead of `src/SettingsDrawer.tsx`

## 2. In-app release links

- [x] 2.1 Add a "What's new" link to the Settings drawer "About" section, pointing to `https://github.com/brandonaut/tagnabbit/releases/tag/v{APP_VERSION}`
- [x] 2.2 In `src/PWABadge.tsx`, change the `needRefresh` toast copy to "Update available."
- [x] 2.3 In `src/PWABadge.tsx`, add a "What's new" link (same URL pattern) shown only when `needRefresh` is true, in the button row alongside Reload and Close
- [x] 2.4 Verify `offlineReady` toast state shows no "What's new" link

## 3. CI release publishing

- [x] 3.1 In `.github/workflows/deploy.yml`, change `actions/checkout` to `fetch-depth: 0` (on the new `release` job's checkout)
- [x] 3.2 Add `permissions: contents: write` to the workflow (or the release job)
- [x] 3.3 Add a step that resolves the previous `v*` tag (if any) and generates release notes via `git log <prevTag>..<tag> --oneline`, dropping the tag's own "Release vX" commit line
- [x] 3.4 Handle the no-previous-tag case (first release) by using the full log instead
- [x] 3.5 Add a step that creates the GitHub Release for the pushed tag with the generated notes (`gh release create` or equivalent)

## 4. Verification

- [x] 4.1 Run `bun run lint` and `bun run build`
- [x] 4.2 Confirmed toast copy and conditional link via code inspection (no browser automation tool available in this environment to trigger a live `needRefresh` state)
- [x] 4.3 Confirm Settings drawer "What's new" link resolves to a valid release URL pattern for the current version
