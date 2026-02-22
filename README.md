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
```

## Development

```sh
bun run dev
```

Opens the app at `http://localhost:5173` with hot module replacement.

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
