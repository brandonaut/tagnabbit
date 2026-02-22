# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install        # install dependencies
bun run dev        # start dev server at http://localhost:5173
bun run build      # tsc -b && vite build (output to dist/)
bun run preview    # serve dist/ locally to verify production build
bun run lint       # eslint
```

There are no tests in this project.

## Architecture

Tagnabbit is a PWA (React + TypeScript + Vite) for searching barbershop tags from [barbershoptags.com](https://www.barbershoptags.com).

### Data flow

The app has two search modes that switch automatically based on whether a local cache exists:

- **API mode** (no local cache): submits a form → calls `searchTags()` → fetches `barbershoptags.com/api.php?q=...` → parses XML response
- **Local mode** (cache present): as the user types → queries a `Fuse.js` index built from the cached tags → instant fuzzy search with highlighted match indices

The local database is populated via "Download all tags" which calls `fetchAllTags()`, paginating through the API in batches of 500 and persisting to IndexedDB via `src/cache/tagDatabase.ts`.

### Navigation

There is no router. `App.tsx` holds two state values (`searchState` and `selectedTag`) and conditionally renders either `SearchPage` or `TagPage`. When a tag is selected, search state (query + results) is preserved so the back button restores it.

### Key files

| File | Purpose |
|---|---|
| `src/api/tags.ts` | Fetch and parse XML from the barbershoptags.com API; defines the `Tag` and `SearchResult` types |
| `src/cache/tagDatabase.ts` | IndexedDB wrapper — store and retrieve the full tag list + metadata |
| `src/cache/sheetMusic.ts` | Cache API wrapper for sheet music files (LRU, max 15 entries, tracked in `localStorage`) |
| `src/proxyUrl.ts` | In dev, rewrites `barbershoptags.com` URLs to `/bst-proxy` to avoid CORS; passthrough in production |
| `src/formatKey.ts` | Strips the mode prefix from `WritKey` values like `"Major:G"` → `"G"` |

### CORS proxy

The Vite dev server proxies `/bst-proxy/*` → `https://www.barbershoptags.com/*` (configured in `vite.config.ts`). In production, the app relies on the server/CDN to handle CORS, so `proxyUrl()` returns the original URL unchanged.

### PWA

`vite-plugin-pwa` with Workbox precaches all built assets. Service worker registration is `'prompt'` (the user must approve updates). The `PWABadge` component handles showing the update prompt. PWA dev options are disabled (`devOptions.enabled: false`).

### API response format

The barbershoptags.com API returns XML. See `TODO.md` for a full example response. Relevant fields mapped to `Tag`: `id`, `Title`, `AltTitle`, `Version`, `WritKey` (→ `key`), `Parts`, `Type`, `Arranger`, `Downloaded`, `Rating`, `RatingCount`, `SheetMusic`, `SheetMusicAlt`.
