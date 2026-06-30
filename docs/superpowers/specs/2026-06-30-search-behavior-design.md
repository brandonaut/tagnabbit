---
name: search-behavior
description: Improved local search — numeric ID pass + weighted Fuse text search with correct highlighting
metadata:
  type: project
---

# Search Behavior Design

## Overview

Improve the instant (local-mode) search in Tagnabbit with cleaner numeric ID lookup, better field weighting, and correct per-field highlighting. API mode (no local cache) is unchanged.

## Query Classification

Before running any search, classify the trimmed debounced query:

| Class | Condition | Passes to run |
|---|---|---|
| Empty | `q === ""` | Clear results |
| Pure numeric | `/^\d+$/.test(q)` | ID pass + Text pass |
| Everything else | All other input | Text pass only |

## ID Pass (numeric queries only)

Run directly against `localTags` — no Fuse involved.

**Exact match** — `localTags.find(t => t.id === query)`
- Result pinned at position 0 in the final list.

**Substring matches** — `localTags.filter(t => t.id.includes(query) && t.id !== query)`
- Only contiguous substrings count (`.includes()` guarantees this).
- Sort descending by `downloaded`.
- Cap at 20 results.

Both sub-steps always run for any pure-numeric query regardless of length.

## Text Pass (Fuse, all non-empty queries)

`id` is removed from the Fuse index. New keys:

| Field | Weight |
|---|---|
| `title` | 4 |
| `altTitle` | 3 |
| `arranger` | 2 |
| `version` | 1 |

All other Fuse options unchanged from current: `threshold: 0.3`, `ignoreLocation: true`, `includeMatches: true`, `includeScore: true`, `minMatchCharLength: 2`.

The text pass runs for every non-empty query, including numeric ones (so `"1920"` can still surface a tag titled *"Sweet Adeline of 1920"* via the title field).

## Result Merging and Ordering

Assemble the final list in this order, deduplicating by `tag.id` at each step:

1. **Slot 0** — pinned exact ID match (if found)
2. **Slots 1–20** — ID substring matches, sorted by `downloaded` descending
3. **Remaining slots** — Fuse text results, sorted by Fuse score ascending (lower = better match), ties broken by `downloaded` descending

The existing `FUSE_LIMIT = 100` cap applies to the Fuse text portion only. Theoretical max result count: `1 + 20 + 100 = 121`.

For non-numeric queries, only Fuse text results appear (up to `FUSE_LIMIT`), ordered by score then downloads — same as today except with updated field weights.

## Highlighting

### ID field

- **ID pass results** (pinned + substring): populate `fieldMatches["id"]` manually with the contiguous range where `query` appears in `tag.id` (e.g., query `"148"` in id `"1482"` → `[[0, 2]]`). `TagListItem` renders this highlighted via `highlightWithIndices`.
- **Fuse text results**: render the ID plain — no highlight. Fix `TagListItem` to skip the `highlight()` fallback for the `id` field when no `fieldMatches["id"]` is present.

### Other fields (`title`, `altTitle`, `arranger`, `version`)

Unchanged — Fuse supplies match indices which `TagListItem` renders via `highlightWithIndices`. The `highlight()` substring fallback remains for the non-Fuse case (e.g. favorites list).

## Files Affected

| File | Change |
|---|---|
| `src/SearchPage.tsx` | Query classification; ID pass logic; result merge; build `localMatches` entries for ID results |
| `src/TagListItem.tsx` | Skip `highlight()` fallback for `id` field when no explicit `fieldMatches["id"]` present |
