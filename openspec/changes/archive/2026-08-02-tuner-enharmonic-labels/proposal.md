## Why

The pitch wheel and key picker currently label all 12 chromatic notes using sharps only (`C#`, `D#`, `F#`, `G#`, `A#`), even though flats are equally valid and, for several notes, more commonly used in everyday speech and notation (`Ab`, `Bb`).
The tuner's `NOTE_FREQUENCIES` table already maps every flat spelling to the identical frequency as its sharp twin, since pure 12-TET has no acoustic distinction between enharmonic equivalents.
So there's no tuning reason to prefer one spelling over the other — only a labeling one.
Showing both names makes the wheel easier to read for singers who think in flats for some notes and sharps for others.

## What Changes

- Add a static, hybrid display-label table for the 5 accidental notes, decoupled from the existing sharps-only `NOTE_NAMES` index/frequency array:
  - Sharp-first: `C#/Db`, `D#/Eb`, `F#/Gb`
  - Flat-first: `Ab/G#`, `Bb/A#`
  - The 7 natural notes (`C D E F G A B`) are unaffected.
- Render accidental labels as a stacked two-line label (primary name on top, secondary name below) on both:
  - The pitch wheel's 12 wedges
  - The key picker dropdown's note grid
- Style the secondary (bottom) name as visually subordinate to the primary: smaller font size and reduced opacity.
- Labels are static — they do not change based on the currently selected key or temperament mode.
- No change to `NOTE_NAMES`, `NOTE_FREQUENCIES`, `ENHARMONIC`, or any audio/frequency/index-math logic.
  This is a display-only change.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `tuner-pitch-wheel`: wedge labels for the 5 accidental notes gain a secondary enharmonic name, stacked below the primary name in a visually subordinate style.
- `tuner-key-picker`: the dropdown's note grid labels gain the same secondary enharmonic name treatment as the wheel.

## Impact

- `src/Tuner.tsx`: wedge label rendering (~line 185/194, `isSharp` sizing branch) and key picker dropdown grid rendering (~line 366).
- `src/notes.ts`: add a new display-label lookup (e.g. `NOTE_DISPLAY_LABELS` or similar), additive only — existing exports (`NOTE_NAMES`, `NOTE_FREQUENCIES`, `ENHARMONIC`) stay unchanged.
- No changes to `src/formatKey.ts`, tag list/detail display, or any API/cache code — this is scoped entirely to the tuner's own wheel and key picker widgets.
