## Why

Releases are currently silent: tagging a version deploys to GitHub Pages but never creates a GitHub Release, and users have no way to see what changed between updates. The commit history already reads like changelog entries, so this can be automated with no extra authoring effort per release.

## What Changes

- CI creates a GitHub Release (with auto-generated notes from commit history) whenever a `v*` tag is pushed, alongside the existing Pages deploy.
- The app's version constant moves out of `SettingsDrawer.tsx` into a shared `src/version.ts` module so it can be referenced from multiple components; `scripts/release.sh` is updated to patch that file instead.
- The Settings drawer's "About" section gains a "What's new" link to the GitHub Release for the running version.
- The PWA update toast (`PWABadge.tsx`) gains a "What's new" link (shown only when an update is pending, not on first offline-ready install), and its copy is shortened to "Update available."

## Capabilities

### New Capabilities
- `release-notes`: generating and publishing GitHub Release notes from commit history on tag push, and linking to the release for the current version from within the app (Settings drawer and PWA update toast).

### Modified Capabilities
_None — no existing spec covers release process or the PWA update toast; this is net-new behavior._

## Impact

- `.github/workflows/deploy.yml`: add a release-creation step (needs `fetch-depth: 0` checkout and `contents: write` permission).
- `scripts/release.sh`: sed target changes from `src/SettingsDrawer.tsx` to `src/version.ts`.
- New file `src/version.ts`: holds `APP_VERSION` / `RELEASE_DATE`.
- `src/SettingsDrawer.tsx`: import version from shared module, add "What's new" link.
- `src/PWABadge.tsx`: import version from shared module, add conditional "What's new" link, updated toast copy.
