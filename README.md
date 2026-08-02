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

### Testing on your phone

The tuner needs microphone access, which browsers only grant in a secure context (`https://` or `localhost`).
To test on a phone over your LAN, generate a locally-trusted certificate with [mkcert](https://github.com/FiloSottile/mkcert):

```sh
sudo apt-get install -y mkcert libnss3-tools   # or your OS's equivalent
mkcert -install

mkdir -p .certs
cd .certs
mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 <your-lan-ip> ::1
cp "$(mkcert -CAROOT)/rootCA.pem" .
```

`vite.config.ts` picks up `.certs/cert.pem` and `.certs/key.pem` automatically when they exist, so `bun run dev -- --host` will serve over HTTPS on your LAN IP once they're present.
The `.certs/` directory is gitignored.

Your phone also needs to trust the mkcert root CA, since it's a locally-generated CA it doesn't know about yet.
Get `.certs/rootCA.pem` onto the phone (AirDrop, or a quick `python3 -m http.server` from `.certs/`), then trust it:

- **iOS**: opening the file installs a profile (Settings → prompt to install), then go to Settings → General → About → Certificate Trust Settings and toggle it on.
- **Android**: Settings → Security → Encryption & credentials → Install a certificate → CA certificate.

Once trusted, `https://<your-lan-ip>:5173/tagnabbit/` should load with a valid padlock and the microphone should work.

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
