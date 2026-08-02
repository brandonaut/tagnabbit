## Why

On `TagPage`, sheet music renders flush against the top of the page (no top padding) while the header overlays on top of it (`position: absolute`, not reserved space). For tall pages this is barely noticeable — the header scrolls out of view once you scroll past it, or the user taps to dismiss it. But for short sheet music (a single small page, common for barbershop tags), there's nothing to scroll past: the header sits on top of the music indefinitely, and even after the user taps to dismiss it, the content is left stranded flush at the top of an otherwise empty screen. Vertically centering the content fixes both cases at once — short content gets framed in the middle of the screen instead of pinned to the top, and for content short enough, the resulting top margin clears the header entirely without requiring a dismiss tap at all.

## What Changes

- Sheet music content (image, PDF, and the generic iframe fallback) is vertically centered within the full viewport height (`100dvh`) when it's shorter than the screen, and falls back to today's top-aligned behavior when it's taller (pure CSS, no measurement needed).
- Centering is applied once at the shared wrapper level in `TagPage`, so all three render paths (`img`, `PdfViewer`, iframe) get it uniformly.
- The PDF and image render paths are only revealed once fully ready (all PDF pages rendered / image `onLoad` fired), replacing today's "reveal as soon as the network fetch completes, then grow into place as canvases append" behavior. This avoids a layout jump where centered content would otherwise pop into its final position after appearing.
- `PdfViewer` gains a readiness signal (e.g. an `onReady` callback) so `TagPage` can distinguish "blob fetched" from "actually rendered and sized," since only the latter is safe to reveal without a jump.
- The "Loading sheet music…" text state is replaced with a centered spinning loading indicator (`lucide-react`'s `Loader2`/`LoaderCircle` + Tailwind's built-in `animate-spin`), shown for the (slightly longer) duration until content is ready. No progress percentage — investigated and rejected, see design.md for why.

## Capabilities

### New Capabilities
- `sheet-music-viewer`: Governs how sheet music (image/PDF/fallback) is laid out and revealed on `TagPage` — vertical centering behavior, and the ready-before-reveal loading sequence that replaces the current fetch-then-immediately-render approach.

### Modified Capabilities
(none — no existing spec covers sheet music display; this is a new capability, not a change to an existing one)

## Impact

- `src/TagPage.tsx`: the sheet-music wrapper (currently just holding the tap-to-toggle `onClick`) gains full-viewport-height centering and a "ready" gate that controls when it swaps from the loading indicator to the actual content.
- `src/PdfViewer.tsx`: needs to report render completion to its parent instead of rendering silently in isolation.
- No changes to `src/cache/sheetMusic.ts` (fetch/cache behavior is unchanged; only how the caller reacts to completion changes) or to any API/data layer.
- No new dependencies — `lucide-react` and Tailwind are already in use.
