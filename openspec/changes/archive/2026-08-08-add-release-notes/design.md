## Context

`scripts/release.sh` bumps the version, commits, and tags locally; `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on `v*` tag push but never creates a GitHub Release. `gh` is not installed locally, so release creation belongs in CI (GitHub Actions runners ship `gh` preinstalled with a `GITHUB_TOKEN` already scoped for release writes). The app is an offline-first PWA — any link surfaced in the UI must not depend on a runtime network call.

## Goals / Non-Goals

**Goals:**
- Every tag push produces a GitHub Release whose notes are the commit subjects since the previous tag, with zero manual authoring.
- The running app can link to its own GitHub Release from two places (Settings drawer, PWA update toast) using a statically-constructed URL.

**Non-Goals:**
- No in-app rendering of release note content (no fetch of the GitHub API at runtime).
- No change to how `release.sh` is invoked or to the local tag/commit flow, beyond the sed target.
- No CHANGELOG.md or other hand-maintained notes file.

## Decisions

**Notes source: `git log <prevTag>..<tag> --oneline`, CI-side, not `--generate-notes`.**
GitHub's built-in `--generate-notes` groups by merged PRs; this repo is mostly direct commits to `main`, so it would produce a near-empty or misleading body. Commit subjects are already changelog-quality (e.g. "Keep the screen awake while sheet music is displayed on a tag page"), so a plain log is the more accurate source. The command must:
- use `fetch-depth: 0` on `actions/checkout` (currently shallow) so the previous tag is reachable,
- exclude the current tag's own "Release vX" commit — it's the newest line in the range, so drop it (`tail -n +2` or equivalent),
- fall back to the full log (no lower bound) when there is no previous tag, i.e. the first release.

**Release creation: extend `deploy.yml`, don't add a new workflow.**
Tag push already triggers this workflow; creating the release alongside the existing build/deploy job keeps the tag → artifacts relationship in one place instead of two workflows racing on the same trigger. Needs `permissions: contents: write` added (currently `contents: read`) and `gh release create vX --notes "..."` (or `softprops/action-gh-release`) as a step.

**Version constant: hoist to `src/version.ts`, don't fetch it from `package.json` at build time.**
`SettingsDrawer.tsx` currently hardcodes `APP_VERSION`/`RELEASE_DATE`, sed-patched by `release.sh`. `PWABadge.tsx` needs the same value. Options considered:
- Import `package.json` version via Vite — works for `APP_VERSION` but `RELEASE_DATE` has no equivalent source, and it changes the sed-patch mechanism `release.sh` already relies on.
- New `src/version.ts` module holding both constants — minimal diff, `release.sh`'s sed just retargets to a new file, both components import from one place.
Going with the new module.

**Release link: build from `APP_VERSION`, no runtime fetch.**
`https://github.com/brandonaut/tagnabbit/releases/tag/v${APP_VERSION}` is fully predictable once a release exists for that tag. Fetching the GitHub API at runtime would add an unauthenticated, rate-limited (60/hr/IP) network dependency to a toast that should work offline — rejected.

**PWA toast: link only in `needRefresh`, not `offlineReady`.**
First install has no prior version to diff against, so "what's new" is meaningless there. Copy shortens from "New content available, click on reload button to update." to "Update available." since the Reload button already states the action.

## Risks / Trade-offs

- [First tag (v0.0.1) has no previous tag to diff] → full `git log` up to that tag as the notes body; acceptable since it's a one-time case.
- [A release with no commits between tags (e.g. re-tag) produces an empty notes body] → acceptable, matches reality; not worth special-casing.
- [`src/version.ts` sed-patch is still string-matching, same fragility as today] → no worse than the current mechanism; out of scope to make more robust here.

## Migration Plan

Single-branch change, no data migration. Deploy order doesn't matter within the change since it's all shipped together; the next `bun run release` + tag push after merge exercises the new CI path end-to-end.
