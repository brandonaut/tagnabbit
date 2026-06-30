# Search Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single Fuse.js search pass with a two-pass system: a custom ID pass (exact pin + contiguous substring) for numeric queries, and a reweighted Fuse text pass for all queries, merged into one deduplicated result list with correct per-field highlighting.

**Architecture:** Query classification routes pure-numeric input through an ID pass (exact-match pin + `.includes()` substring filter, capped at 20) before the Fuse text pass. Results are merged in priority order — pinned → ID substring → Fuse text — using a `Set<string>` for deduplication. `TagListItem` renders the ID field plain unless explicit match indices are provided.

**Tech Stack:** React, TypeScript, Fuse.js (already installed), Tailwind CSS

## Global Constraints

- No test framework exists — verification is manual via the dev server (`bun run dev` at http://localhost:5173)
- All IDs in the dataset are pure numeric strings (no letters)
- `FUSE_LIMIT = 100` cap applies only to the Fuse text portion of results
- `ID_SUBSTRING_LIMIT = 20` cap on contiguous ID substring matches
- Filters (`type`, `parts`, `learningTracks`) apply to all result sets — ID pass included
- Do not change any Fuse options other than `keys`

---

### Task 1: Fix TagListItem — skip highlight fallback for ID field

**Files:**
- Modify: `src/TagListItem.tsx:85-87`

**Interfaces:**
- Consumes: `fieldMatches?: FieldMatches` (already a prop), `highlightWithIndices` (already defined at line 29)
- Produces: ID field renders plain when no `fieldMatches["id"]` present; highlighted when indices are explicitly provided

- [ ] **Step 1: Edit the ID rendering in TagListItem**

In `src/TagListItem.tsx`, replace line 86:

```tsx
            #{hlField(tag.id, "id")}
```

with:

```tsx
            #{fieldMatches?.["id"] ? highlightWithIndices(tag.id, fieldMatches["id"]) : tag.id}
```

The full surrounding context (lines 83–88) should look like:

```tsx
        <div className="flex items-center gap-1.5 shrink-0">
          {isFavorited && <Heart size={12} fill="var(--accent)" color="var(--accent)" />}
          <span className="text-[0.8rem] text-[var(--text-muted)] whitespace-nowrap">
            #{fieldMatches?.["id"] ? highlightWithIndices(tag.id, fieldMatches["id"]) : tag.id}
          </span>
        </div>
```

- [ ] **Step 2: Verify in browser**

Run `bun run dev` and open http://localhost:5173. Download tags if not already cached. Search for `"sweet"` — confirm tag IDs in the result list are NOT highlighted (plain `#NNNN`). This was previously highlighted if the query appeared in the ID by coincidence.

- [ ] **Step 3: Commit**

```bash
git add src/TagListItem.tsx
git commit -m "fix: skip highlight fallback for ID field in search results"
```

---

### Task 2: Update Fuse config + implement ID pass and result merging

**Files:**
- Modify: `src/SearchPage.tsx:15-16` (add new constants)
- Modify: `src/SearchPage.tsx:25-38` (update FUSE_OPTIONS)
- Modify: `src/SearchPage.tsx:172-216` (replace search useEffect)

**Interfaces:**
- Consumes: `localTags: Tag[] | null`, `debouncedQuery`, `filters`, `fuseRef`, `FieldMatches`, `MatchRanges` (all already in scope)
- Produces: updated `result` (SearchResult) and `localMatches` (Map<string, FieldMatches>) — same state shape as today, no downstream changes needed

- [ ] **Step 1: Add new constants**

In `src/SearchPage.tsx`, after line 15 (`const FUSE_LIMIT = 100`), add:

```tsx
const ID_SUBSTRING_LIMIT = 20
const PURE_NUMERIC = /^\d+$/
```

- [ ] **Step 2: Update FUSE_OPTIONS**

Replace the `FUSE_OPTIONS` block (lines 25–38) with:

```tsx
const FUSE_OPTIONS: IFuseOptions<Tag> = {
  keys: [
    { name: "title", weight: 4 },
    { name: "altTitle", weight: 3 },
    { name: "arranger", weight: 2 },
    { name: "version", weight: 1 },
  ],
  includeMatches: true,
  includeScore: true,
  findAllMatches: false,
  threshold: 0.3,
  minMatchCharLength: 2,
  ignoreLocation: true,
}
```

- [ ] **Step 3: Replace the search useEffect**

Replace the entire `// Run fuzzy search...` useEffect (lines 172–216) with:

```tsx
  // Run search on every query change (or when the index is first built)
  useEffect(() => {
    const fuse = fuseRef.current
    if (!fuse || !localTags) return

    const q = debouncedQuery.trim()
    if (!q) {
      if (isSurpriseRef.current) return
      setResult(null)
      setLocalMatches(new Map())
      return
    }
    isSurpriseRef.current = false

    function passesFilters(tag: Tag): boolean {
      if (filters.type && tag.type !== filters.type) return false
      if (filters.parts && tag.parts !== filters.parts) return false
      if (filters.learningTracks && !tag.hasLearningTracks) return false
      return true
    }

    // ID pass (pure numeric queries only)
    let pinnedTag: Tag | undefined
    let allIdSubstring: Tag[] = []
    let idSubstringMatches: Tag[] = []

    if (PURE_NUMERIC.test(q)) {
      pinnedTag = localTags.find((t) => t.id === q && passesFilters(t))
      allIdSubstring = localTags.filter((t) => t.id.includes(q) && t.id !== q && passesFilters(t))
      idSubstringMatches = [...allIdSubstring]
        .sort((a, b) => (b.downloaded ?? 0) - (a.downloaded ?? 0))
        .slice(0, ID_SUBSTRING_LIMIT)
    }

    // Text pass
    const fuseAll = fuse.search(q).sort((a, b) => {
      const scoreDiff = (a.score ?? 0) - (b.score ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return (b.item.downloaded ?? 0) - (a.item.downloaded ?? 0)
    })

    // Merge: pinned → ID substring → Fuse text (deduplicated by id)
    const seen = new Set<string>()
    const mergedTags: Tag[] = []
    const newMatches = new Map<string, FieldMatches>()

    if (pinnedTag) {
      seen.add(pinnedTag.id)
      mergedTags.push(pinnedTag)
      newMatches.set(pinnedTag.id, { id: [[0, q.length - 1]] as MatchRanges })
    }

    for (const tag of idSubstringMatches) {
      if (seen.has(tag.id)) continue
      seen.add(tag.id)
      mergedTags.push(tag)
      const start = tag.id.indexOf(q)
      newMatches.set(tag.id, { id: [[start, start + q.length - 1]] as MatchRanges })
    }

    const fuseFiltered = fuseAll.filter((r) => !seen.has(r.item.id) && passesFilters(r.item))
    const fuseSliced = fuseFiltered.slice(0, FUSE_LIMIT)

    for (const r of fuseSliced) {
      seen.add(r.item.id)
      mergedTags.push(r.item)
      newMatches.set(
        r.item.id,
        Object.fromEntries(
          // biome-ignore lint/style/noNonNullAssertion: m.key is checked truthy by filter above
          (r.matches ?? []).filter((m) => m.key).map((m) => [m.key!, m.indices as MatchRanges]),
        ),
      )
    }

    setResult({
      available: (pinnedTag ? 1 : 0) + allIdSubstring.length + fuseFiltered.length,
      count: mergedTags.length,
      tags: mergedTags,
    })
    setLocalMatches(newMatches)
  }, [debouncedQuery, filters, localTags])
```

- [ ] **Step 4: Run the linter**

```bash
bun run lint
```

Expected: no errors. If `biome` warns about the `// biome-ignore` line, confirm it's present verbatim as shown above.

- [ ] **Step 5: Verify in browser — text search**

Open http://localhost:5173. Search for `"sweet"`:
- Results should appear with title/altTitle/arranger highlighted where the word matches
- Tag IDs should appear plain (no highlight) — confirmed already by Task 1
- Results should be ordered by match quality (title matches first), with download count breaking ties

Search for `"paul paddock"`:
- Arranger field should highlight "Paul Paddock" in matching results

Search for `"resolving version"`:
- Version field should highlight in matching results (this is new — version wasn't searchable before)

- [ ] **Step 6: Verify in browser — numeric search**

Search for `"1482"`:
- Tag #1482 should appear pinned at position 0 with `#1482` highlighted
- Other tags whose ID contains "1482" (e.g. #14820, #14821 if any exist) appear below, also with ID highlighted
- Fuse text results follow after (e.g. any tag with "1482" in the title)

Search for `"148"`:
- No exact pin (unless tag #148 exists — it should, check it appears first)
- Tags #1482, #1483, #1484, etc. appear as ID substring matches sorted by downloads
- Fuse text results follow

Search for `"182"`:
- Tag #182 pinned if it exists
- Tags containing "182" contiguously (e.g. #1820, #1821, #18200) shown — but NOT #1482 (since "182" is not contiguous in "1482")

- [ ] **Step 7: Commit**

```bash
git add src/SearchPage.tsx
git commit -m "feat: improve local search with ID pass and reweighted Fuse fields"
```
