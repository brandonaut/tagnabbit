## 1. PdfViewer readiness signal

- [x] 1.1 Add an `onReady` callback prop to `PdfViewer` (`src/PdfViewer.tsx`)
- [x] 1.2 Invoke `onReady` once the render loop has appended every page's canvas, guarded by the existing `cancelled` flag so it never fires after unmount or a superseded `url` change

## 2. TagPage readiness + loading state

- [x] 2.1 Add a `contentReady` state to `TagPage.tsx`, reset to `false` whenever `sheetUrl`/`objectUrl` changes
- [x] 2.2 Wire `PdfViewer`'s `onReady` to set `contentReady`
- [x] 2.3 Wire the `img` element's native `onLoad` to set `contentReady`
- [x] 2.4 Treat the generic iframe fallback as ready immediately (no gate needed — fixed height, no pop-in risk)
- [x] 2.5 Keep the loading indicator visible whenever fetching (existing `loading` state) OR content is not yet `contentReady`

## 3. Loading indicator

- [x] 3.1 Replace the "Loading sheet music…" text (`TagPage.tsx:215`) with a centered `Loader2`/`LoaderCircle` icon from `lucide-react`, spun via Tailwind's `animate-spin`
- [x] 3.2 Center the loading indicator within the full viewport height, matching where the eventual content will appear

## 4. Vertical centering layout

- [x] 4.1 Apply `min-h-dvh flex flex-col items-center justify-center` (or equivalent) to the shared sheet-music wrapper in `TagPage.tsx` (the div currently only holding the tap-to-toggle `onClick`, around line 234)
- [x] 4.2 Verify the `img`, `PdfViewer` container, and iframe fallback all keep explicit full-width styling (e.g. `w-full`) so they don't shrink to fit as flex children
- [x] 4.3 Confirm tall content (taller than the viewport) still renders top-aligned and scrolls normally — no regression from the centering wrapper

## 5. Manual verification

- [x] 5.1 Verify a short single-page PDF tag centers vertically with no visible pop-in/jump after loading
- [x] 5.2 Verify a tall/multi-page PDF tag still renders top-aligned and scrolls as before
- [x] 5.3 Verify a short image-based tag centers the same way
- [x] 5.4 Verify the header overlay/tap-to-dismiss behavior still works correctly on both short and tall content
- [x] 5.5 Verify on a mobile viewport (or mobile emulation) that `dvh` centering doesn't jump when browser chrome shows/hides
