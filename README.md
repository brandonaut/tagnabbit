# tagnabbit

Search Barbershop Tags Fast — a PWA built with React, TypeScript, and Vite.

## Features

- Instant search as you type, with fuzzy matching
- PWA means no install necessary
- Randomizer to serve up 7 random tags
- Embedded pitch pipe

## Prerequisites

- [Bun](https://bun.sh/) (used as the package manager and runtime)

## Setup

```sh
bun install

# pre-commit hooks
bun run prek install
```

## Development

```sh
bun run dev
```

Opens the app at `http://localhost:5173/tagnabbit` with hot module replacement.

## Build

```sh
bun run build
```

Output goes to `dist/`. Runs TypeScript compilation then Vite build.

## Preview production build

```sh
bun run preview
```

Serves the `dist/` folder locally to verify the production build.

## Lint

```sh
bun run lint
```

## Deploying

Deployments are triggered automatically by pushing a version tag to GitHub.
The workflow fetches a fresh tags snapshot, builds the app, and publishes it to GitHub Pages.

### Releasing a new version

```sh
bun run release          # bump patch (0.0.1 → 0.0.2)
bun run release minor    # bump minor (0.0.1 → 0.1.0)
bun run release major    # bump major (0.0.1 → 1.0.0)
```

This updates the version in `package.json` and `src/SettingsDrawer.tsx`, commits the change, and creates a git tag.
Push the tag to trigger deployment:

```sh
git push origin main v1.0.0
```
