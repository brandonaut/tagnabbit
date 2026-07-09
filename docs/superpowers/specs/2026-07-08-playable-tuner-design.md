---
name: playable-tuner
description: Merge the pitch pipe into the tuner wheel (press-and-hold notes to play, drag-to-center to set key) and surface it standalone on the empty home screen
metadata:
  type: project
---

# Playable Tuner Design

## Overview

Today `TagPage` renders two separate floating widgets while viewing sheet music: `PitchPipe` (a single note button with a picker, bottom-left) and `Tuner` (a mic-based pitch-detection wheel, bottom-right).
This merges them into one widget: the `Tuner`'s wheel becomes press-and-hold playable, and dragging a note to the wheel's center sets the reference key (needed for just-intonation cent offsets).
The merged widget also appears inline on the home screen (`SearchPage`) whenever the search query is empty, so the app is usable as a standalone pitch pipe/tuner with no tag selected.

## File Changes

- **Delete** `src/PitchPipe.tsx`.
- **Remove** its import and render from `TagPage.tsx`.
- **Move** `NOTE_FREQUENCIES` (currently defined in `PitchPipe.tsx`) into `src/notes.ts`, alongside `NOTE_NAMES` and `ENHARMONIC`, since it's now used by `Tuner`.
- **Extend** `src/Tuner.tsx`:
  - `PitchWheel` gains pointer-event handling per note segment (it already owns the SVG geometry — center point, radii — needed to detect drag distance).
  - `Tuner` gains oscillator playback, mic pause/resume around playback, and reference-key state (previously a plain prop, now internal state seeded from a `defaultKey` prop).
  - `Tuner` gains a `variant: "floating" | "inline"` prop controlling container layout.

## Reference Key State

- `Tuner` takes a `defaultKey` prop (replaces today's `tagKey` prop), used only to seed initial state.
- The active reference key is `useState`, updated when a drag-to-center gesture commits.
- A ref mirrors the key state for the mic analysis loop (`tick`) to read, so changing the key while listening takes effect immediately without restarting the animation frame loop.
- No persistence across mounts — each `Tuner` instance starts from its `defaultKey` (tag's key on `TagPage`, `"C"` on the home screen).

## Gesture Model (per wheel note segment)

**Press-and-hold to play:**
1. Pointer down on a note segment → start playing that note's tone immediately; pause mic listening if it was active.
2. If the pointer stays within an ~8px dead-zone until release → this was a hold: tone stops on release, mic listening resumes.

**Drag-to-center to set key:**
1. If the pointer moves past the dead-zone at any point during the gesture, it becomes a drag: the tone stops immediately and does not resume for the rest of the gesture, regardless of where the pointer goes afterward.
2. If release happens with the pointer inside the wheel's center "drop zone" → commit that note as the new reference key.
3. If release happens outside the drop zone → silent cancel: no key change, no tone.
4. Mic listening (if it was active before pointer down) resumes at the end of the gesture in every case — hold, commit, or cancel.

Pointer-cancel / pointer-leave are treated the same as a release at the last known position (stop tone, resume mic, commit only if inside the drop zone).

Only one pointer/gesture is tracked at a time; multi-touch is out of scope, matching today's `PitchPipe` behavior.

## Visual Affordances

- **Playing:** the held note segment highlights (existing active-segment fill, distinct from the tuning-detection highlight color).
- **Armed for key change:** while the pointer is inside the drop zone during a drag, the center circle highlights and shows the candidate note name in place of the normal center content.
- **Current reference key:** always shown passively, even when idle — a small ring/dot marker on that note's wheel segment, plus a "Key: G" caption below the wheel.

## Home Screen Integration

- In `SearchPage.tsx`, when the "search" tab is active and `query.trim()` is empty, render `<Tuner defaultKey="C" variant="inline" />` in place of the results/empty-state area.
- It disappears as soon as the query becomes non-empty or the user switches to the Favorites tab.
- No `visible`/tap-to-hide behavior here — that toggle is specific to `TagPage`'s tap-to-hide-controls interaction over sheet music. The inline tuner is just always shown while the query is empty.

## TagPage Integration

Replaces the current paired render:

```tsx
<Tuner defaultKey={tag.key ? formatKey(tag.key) : "C"} variant="floating" visible={uiVisible} />
```

Same fixed-corner floating behavior as today's `Tuner`, same `visible` tap-to-hide wiring.

## Out of Scope

- No persistence of the last-used reference key across sessions or page navigations (home screen always starts at C).
- No change to wheel size or the mic pitch-detection/JI-offset logic itself.
- No multi-touch support.
