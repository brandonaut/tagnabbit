## MODIFIED Requirements

### Requirement: State-driven wedge color intensity
Each wedge's saturation and lightness SHALL vary across three tiers — idle, reference key, and active — while its hue stays fixed.
This lets the current state of a wedge be distinguishable primarily through a lightness/chroma contrast rather than through hue alone.

#### Scenario: Idle wedge shows a low-saturation tint of its hue
- **WHEN** a wedge is not the detected pitch, not being played, and not the current reference key
- **THEN** it renders with a low-chroma tint of its own hue, rather than a flat muted-gray fill

#### Scenario: Reference-key wedge shows a border outlining the whole wedge
- **WHEN** a wedge's note is the currently selected reference key, it is not otherwise active, and the tuner is in just-intonation mode
- **THEN** the wedge's full outline (both radial edges, the inner arc, and the outer arc) is stroked in that note's own hue, at the same chroma level between the idle and active tiers used previously, rather than showing a separate point marker

#### Scenario: No reference marker in equal-temperament mode
- **WHEN** the tuner is in equal-temperament mode
- **THEN** no wedge renders the reference-key border, regardless of which note was last selected as the key

#### Scenario: Active wedge shows a full-saturation fill
- **WHEN** a wedge's note is either the currently detected pitch or is being played via the tap-to-hear gesture
- **THEN** it renders a high-chroma, high-contrast fill in that note's own hue
