## Context

`TagPage` (`src/TagPage.tsx`) renders sheet music (image, PDF via `PdfViewer`, or a generic `iframe` fallback) directly beneath an overlay header. The header (`TagPage.tsx:157-209`) is `position: absolute` inside the page's normal document flow — not `fixed`/`sticky` — so it scrolls away with tall content but has nothing to scroll past on short content, where it stays overlaid on the music until the user taps to dismiss it (`uiVisible` toggle). Sheet music itself renders flush at the top of the page (`objectUrl && (...)` block, `TagPage.tsx:230-249`) with zero top padding.

`PdfViewer.tsx` renders each PDF page as a full-width `<canvas>` via `pdfjs-dist`, appended to a container div one at a time as each page finishes rendering (`PdfViewer.tsx:21-48`). The container has no explicit height — it's `0px` until canvases are appended, and its final height isn't known until every page has rendered. `TagPage` currently treats `objectUrl` becoming non-null (`sheetMusic.ts`'s fetch resolving) as the signal to mount `PdfViewer`/`img`/`iframe` — that's "network fetch done," not "pixels ready."

## Goals / Non-Goals

**Goals:**
- Center sheet music vertically within the full viewport (`100dvh`) when it's shorter than the screen; degrade to today's top-aligned behavior when it's taller.
- Apply this uniformly across all three render paths (image, PDF, iframe fallback) via one shared wrapper, not per-component logic.
- Never show a layout jump — content should appear already in its final centered position, not grow/re-center after appearing.
- Replace the "Loading sheet music…" text with a centered spinner for the (slightly longer) wait this implies.

**Non-Goals:**
- Not attempting byte-level or page-level load progress / percentage (see Decisions — investigated and rejected).
- Not reserving space for the header specifically (e.g. measuring header height and centering only the remainder) — centering is against the full viewport, matching the app's existing overlay/immersive interaction model.
- Not changing `sheetMusic.ts`'s fetch/cache behavior, persisting PDF page dimensions, or adding progressive/incremental reveal for multi-page PDFs. Barbershop tags are typically short, single-page documents, so the "wait for full render, then reveal all at once" approach is deliberately simple rather than optimized for large multi-page documents.

## Decisions

**1. Center against `100dvh`, not a header-reserved height.**
Using `dvh` (dynamic viewport height) rather than `vh` avoids the standard mobile issue where `vh` includes space the browser's collapsing address bar will cover, which would cause centered content to shift as chrome shows/hides. Centering against the full screen (via a `min-h-dvh flex items-center justify-center` wrapper) rather than `100dvh - headerHeight` was chosen because: (a) it requires no measurement of the header's actual rendered height, which varies depending on whether the optional arranger line is present; (b) for content short enough, the resulting margin already clears the header entirely, since the header only occupies a small fixed band at the top; (c) it's consistent with the existing design's overlay/tap-to-dismiss philosophy — the header is meant to recede, not permanently reserve chrome space. Alternative considered: measure header height via `ResizeObserver` and center only the remaining band, guaranteeing zero overlap even before any interaction — rejected as unnecessary complexity for a case the simpler approach already mostly resolves, with the tap-to-dismiss gesture as an existing escape hatch for the remaining edge cases.

**2. Centering lives at the shared wrapper in `TagPage`, not inside `PdfViewer`.**
The `img`/`PdfViewer`/`iframe` branches all sit under one wrapper div (`TagPage.tsx:234`, currently only used for the tap-to-toggle `onClick`). Applying `min-h-dvh flex items-center justify-center` there covers all three render paths with one change, rather than duplicating layout logic into `PdfViewer` and the image/iframe branches separately.

**3. Reveal only when fully ready — the simple version.**
To avoid a jump, content must be in its final size before it's shown. The simplest way to guarantee that: keep showing the loading state until the content is completely rendered, then reveal it all at once, already centered. Concretely:
- `PdfViewer` gains an `onReady` (or similarly named) callback prop, invoked once its render loop (`PdfViewer.tsx:28-48`) has appended every page's canvas.
- The `img` path uses the native `onLoad` event, which already fires once the browser has decoded the image.
- The iframe fallback needs no readiness signal — it already renders at a fixed height (`h-[80vh]`), so it has no async sizing step and no pop-in risk to begin with.
- `TagPage` tracks a `contentReady` state (or equivalent), separate from `loading` (which only tracks the network fetch in `getSheetMusic`). The loading indicator remains visible until both the fetch has completed *and* `contentReady` is true.

Alternative considered: measure all pages' dimensions up front (cheap, since `pdfjs-dist` can report `getViewport({scale:1})` per page without rendering) to reveal a correctly-sized container immediately, then paint canvases progressively into it — avoiding the jump without waiting for full render. Rejected for now: it's meaningfully more implementation surface (a two-phase measure-then-render pipeline in `PdfViewer`) for a difference that's only perceptible on multi-page documents, which aren't the common case for this content. If tags turn out to commonly be multi-page and slow to render, this is the natural next iteration.

**4. Infinite spinner, not a progress bar.**
`getSheetMusic` (`src/cache/sheetMusic.ts:38-98`) awaits the entire response body via a single `response.blob()` call (line 70) — there's no intermediate byte count available without switching to a streaming `response.body.getReader()` read loop checked against `Content-Length`, which (a) is a real change to the fetch/cache layer and (b) isn't guaranteed to be reliable, since `Content-Length` may not survive the dev CORS proxy or a production CDN. Separately, once the blob is local, `pdfjs-dist`'s parse/render step is CPU-bound, not network-bound, and its only natural progress granularity is "page N of M" — meaningless for the common single-page tag. Given both potential progress signals are either unreliable or not meaningful for this content, an infinite spinner (`lucide-react`'s `Loader2`/`LoaderCircle` + Tailwind's built-in `animate-spin`) is used instead of a fabricated or misleading percentage.

## Risks / Trade-offs

- **[Risk]** Waiting for full PDF render before reveal increases perceived load time for any tag that turns out to be multi-page, since today's progressive per-page reveal gives a sense of partial progress. → **Mitigation**: acceptable given barbershop tags are typically short and single-page; the progressive measure-then-render alternative (Decision 3) is documented as the natural next step if this assumption turns out wrong.
- **[Risk]** Full-viewport centering (rather than header-aware centering) means content shorter than the screen but not short enough to clear the header will still show partial overlap until the user taps to dismiss the header. → **Mitigation**: this is strictly better than today's behavior (which always overlaps short content), and the existing tap-to-dismiss gesture already handles the remaining case.
- **[Risk]** `PdfViewer`'s readiness callback needs to correctly handle the existing cancellation logic (`cancelled` flag, `PdfViewer.tsx:19,29,52`) so it doesn't fire `onReady` after unmount or after the effect has been superseded by a new `url`. → **Mitigation**: gate the callback behind the same `cancelled` check already used before appending canvases.

## Migration Plan

No data migration or rollout sequencing needed — this is a self-contained UI change to `TagPage.tsx` and `PdfViewer.tsx` with no API, schema, or cache format changes. Ships as a normal release.

## Open Questions

- None outstanding — all major decisions (viewport-relative centering, reveal-when-ready, infinite spinner) were resolved during exploration.
