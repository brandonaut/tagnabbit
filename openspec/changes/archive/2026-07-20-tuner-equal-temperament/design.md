## Context

`src/Tuner.tsx` already has a working drag gesture: `pointerDown` on a wedge starts a tap-to-play tone, moving past `DEAD_ZONE_R` turns it into a drag, and releasing inside `DROP_ZONE_R` of center commits that note as the reference key via `onGestureEnd(committedNoteIdx)`. Releasing outside the drop zone already produces `committed === null`, which today is a silent no-op — the gesture-detection plumbing for "drag and release away from center" already exists, it just doesn't mean anything yet.

Cents are currently always computed relative to `selectedKey` using `JI_OFFSETS`, a fixed 12-entry table of 5-limit just-intonation deviations from equal temperament per scale degree. There is no equal-temperament mode today.

This change reuses the existing gesture-detection outcome rather than adding new pointer-event branches, and adds a `temperament` axis alongside `selectedKey` rather than replacing it.

## Goals / Non-Goals

**Goals:**
- Give the existing "drag released outside drop zone" outcome real meaning: switch to equal-temperament mode.
- Keep `pointerCancel` a true no-op for both outcomes, matching today's cancel behavior for key-commit.
- Make both the tap-to-play and drag-to-set-key gestures discoverable via on-wheel hint text, since both now have (or already had) real consequences worth surfacing.
- Give `SearchPage` a sensible default (equal temperament) since it has no real tag-key context, without touching `TagPage`.

**Non-Goals:**
- No changes to wedge color tiers, hues, or the `noteColors.ts` module — the reference marker simply stops rendering in equal-temperament mode, using logic already in `PitchWheel`.
- No changes to wheel sizing, enharmonic note display, or touch-target hit-area geometry.
- No persistence of temperament or key choice across mounts (matches existing `selectedKey` behavior — resets to props on every mount, no `localStorage`).
- No change to which note wedge triggers the equal-temperament outcome — any wedge dragged outside the drop zone produces the same result, the dragged note's identity is irrelevant to that outcome.

## Decisions

1. **`temperament` is independent state, not derived from `selectedKey`.** Add `const [temperament, setTemperament] = useState<"ji" | "et">(defaultTemperament ?? "ji")` to the `Tuner` wrapper. Switching to `"et"` does not clear `selectedKey` — `handleGestureEnd` already only calls `setSelectedKey` when `committedNoteIdx !== null`; it now also sets `temperament` in both branches (`"ji"` when a key is committed, `"et"` when the drag was released outside the drop zone but still `dragging`). This means `PitchWheel`'s `onGestureEnd` callback needs to report drag outcome more precisely than a single nullable note index — see decision 2.

2. **`onGestureEnd` reports a three-way outcome, not just a nullable note index.** Today: `onGestureEnd: (committedNoteIdx: number | null) => void`, where `null` covers both "not a drag" and "drag released outside drop zone" — those two cases must now be distinguished. Change the callback to `onGestureEnd: (result: { type: "key"; noteIdx: number } | { type: "et" } | { type: "none" }) => void`. In `endGesture`: if `!g.dragging`, always `type: "none"` (tap, not a drag — already handled by the existing `onPlayStop()` tap path). If `g.dragging`, check drop-zone distance: inside → `{ type: "key", noteIdx: g.noteIdx }`, outside → `{ type: "et" }`. `pointerCancel` is wired to the same `endGesture` handler today; this stays true to preserve "cancel discards" for the key-commit path — but since `endGesture` computes outcome from pointer position, a cancelled gesture would currently still commit whatever the last known `armedNoteIdx`/position was. To make cancel a true no-op for *both* outcomes, `onPointerCancel` gets its own handler that clears gesture state without calling `onGestureEnd` at all (distinct from `onPointerUp`'s `endGesture`).

3. **Cents calculation branches on `temperament`, read via a ref (same pattern as `selectedKeyRef`).** Add `temperamentRef`, mirroring the existing `selectedKeyRef` mirroring pattern, so the `tick()` closure (created once per `toggle()` call) reads current temperament without stale closures. In `tick()`: if `temperamentRef.current === "et"`, use `result.cents` directly; if `"ji"`, keep the existing `degreeIdx`/`JI_OFFSETS` branch unchanged.

4. **Reference marker visibility gated in the render loop, not via a prop change to `wedgeColor`.** `PitchWheel` already computes `isReference = i === referenceNoteIdx` per wedge. Add a `temperament` prop to `PitchWheel` and change the marker's render condition to `isReference && temperament === "ji"`. No change to `noteColors.ts`.

5. **Center-face precedence becomes a single ordered `if`/ternary chain, replacing the current two-branch (`armedNoteIdx !== null` / `hasNote && noteName` / else) structure.** New order, highest first: armed-key (unchanged visual) → armed-ET (new, plain-text "Equal Temp") → held-pre-drag (new, "Drag to center" hint) → detected pitch+cents (unchanged) → idle hint (new constant two-line text, replacing the `idleLabel` prop entirely). "Held-pre-drag" is detected via a new `heldNoteIdx` piece of state (set on `pointerDown`, cleared when dragging starts or the gesture ends) — distinct from `playingNoteIdx`, which already exists for the wedge-tint purpose and is cleared the moment a drag begins; the center-face hint needs to know "a gesture started but hasn't resolved into a drag yet," which is exactly `playingNoteIdx !== null` before `dragging` flips true. Reusing `playingNoteIdx` directly (rather than adding new state) is possible since it's already `null`led at the same transition points — no new state needed here.

6. **`idleLabel` prop is removed, not repurposed.** Since the idle hint becomes a constant string independent of `active`, the `Tuner` wrapper no longer needs to compute or pass `idleLabel`; `PitchWheel` hardcodes the two-line hint text directly. This also means the `active` prop threading into `PitchWheel` for that purpose goes away if unused elsewhere (it's still needed for `hasNote`/`noteName`, so `PitchWheel` keeps receiving pitch-related props — only `idleLabel` specifically is deleted).

7. **`defaultTemperament` prop, mechanical addition.** `Tuner` gets `defaultTemperament?: "ji" | "et" = "ji"`, used only to seed `useState`. `SearchPage.tsx` passes `defaultTemperament="et"` alongside its existing placeholder `defaultKey="C"`. `TagPage.tsx` is untouched.

## Risks / Trade-offs

- **Changing the `onGestureEnd` callback shape is a breaking change to `PitchWheel`'s internal contract.** → Low risk: `PitchWheel` is a private component only used by `Tuner` in the same file, not exported, so this is a same-file refactor with no external callers to update.
- **Reusing `playingNoteIdx` for the held-pre-drag hint couples two concerns (wedge tint timing and center-hint timing) that happen to share the same state transitions today.** → If a future change decouples them (e.g. wedge tint should persist slightly longer than the hint), this will need splitting into separate state. Acceptable for now since introducing that coupling is what keeps this change from adding new state solely for a text hint.
- **Distinguishing `pointerCancel` from `pointerUp` at the handler level (decision 2) changes existing behavior subtly**: today, a cancelled gesture still runs `endGesture` and could theoretically commit a key if the cancel event fires with the pointer still positioned in the drop zone. → This was arguably already a latent inconsistency (cancel should mean "gesture aborted"); making cancel unconditionally a no-op is a strict improvement, not a regression, but worth calling out since it changes an edge case's behavior even for the existing key-commit path.

## Migration Plan

No data migration — this is UI/state-only. Ship as a single change; no feature flag needed given the small blast radius (one component, two call sites).

## Open Questions

- Exact two-line wrap point for "Drag to center" (single hint, likely fits one line at the existing hint font size — confirm during implementation against the 240×240 wheel's actual rendered text width).
- Whether "Equal Temp" (armed-preview abbreviation) needs a `title`/tooltip or relies entirely on the spelled-out "Key: Equal temperament" label to teach the abbreviation over time.
