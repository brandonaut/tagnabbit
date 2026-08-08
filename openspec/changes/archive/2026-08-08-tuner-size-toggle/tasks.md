## 1. Tuner size state

- [x] 1.1 Add `defaultSize?: "small" | "large"` prop to `Tuner`'s `Props` interface in `src/Tuner.tsx`, defaulting to `"small"`.
- [x] 1.2 Add internal `size` state (`useState<"small" | "large">(defaultSize)`) to the `Tuner` component.

## 2. Corner size toggle button

- [x] 2.1 Import `Maximize2`/`Minimize2` from `lucide-react` alongside the existing `ChevronDown`/`CircleGauge` import.
- [x] 2.2 Add a corner button to the panel `<div>` (inside the existing `(!collapsible || active)` block, alongside `PitchWheel`/`KeyPicker`) that toggles `size` between `"small"` and `"large"`, showing `Maximize2` when small and `Minimize2` when large.
- [x] 2.3 Position the button absolutely in the panel's corner with an `aria-label` reflecting the action (e.g. "Enlarge tuner" / "Shrink tuner").

## 3. Whole-panel scaling

- [x] 3.1 Apply a `transform: scale(...)` to the panel `<div>` based on the `size` state (e.g. `scale(1)` for small, `scale(1.4)` or similar for large — tune visually).
- [x] 3.2 Set `transform-origin: bottom right` on the panel so it scales anchored to the floating wrapper's existing bottom-right position.
- [x] 3.3 Add a CSS transition on the transform for a smooth resize, consistent with the existing `translate-y` transition on the floating wrapper.

## 4. Page defaults

- [x] 4.1 Pass `defaultSize="large"` to `Tuner` in `src/SearchPage.tsx`.
- [x] 4.2 Pass `defaultSize="small"` to `Tuner` in `src/TagPage.tsx`.

## 5. Verification

- [x] 5.1 Run `bun run lint` and `bun run build`.
- [ ] 5.2 Manually verify in the browser: search page tuner opens large, tag page tuner opens small, corner button toggles both ways on each page, panel stays anchored to the bottom-right corner at both sizes, and large size is allowed to overlap sheet music on a tag page.
