## Purpose

Defines the single app-owned tuner overlay: one instance available on every screen, how it is opened and closed from the tab bar, its non-persistent open state, its microphone lifecycle, the fixed small bottom-right corner it opens at every time, its semi-transparent rendering, its viewport clamping that keeps it clear of the tab bar, and how it is repositioned by dragging without disturbing the pitch wheel's own gestures.

## Requirements

### Requirement: One tuner overlay, available on every screen

The app SHALL render exactly one tuner instance, as an overlay that floats above the current screen's content.
The overlay SHALL be openable from the search, favorites, player, and tag detail screens.
There SHALL NOT be more than one tuner mounted at a time, and the tuner SHALL NOT occupy a screen or route of its own.

#### Scenario: Opening the overlay from any screen

- **WHEN** a user opens the tuner while on the search, favorites, player, or tag detail screen
- **THEN** the tuner overlay appears above that screen's content, and the underlying screen stays where it was

#### Scenario: Only one tuner exists

- **WHEN** the tuner overlay is open
- **THEN** exactly one tuner is present anywhere in the app

### Requirement: Overlay is opened and closed only from the tab bar

The overlay SHALL be opened and closed by a single control in the bottom tab bar's fourth slot (see `primary-navigation`), which toggles it: open when closed, closed when open, without navigating away from the current screen.
The overlay SHALL NOT carry any close, minimize, or dismiss control of its own.

#### Scenario: Tab bar toggle opens and closes the overlay

- **WHEN** a user activates the tab bar's tuner control while the overlay is closed
- **THEN** the overlay opens, and activating the control again closes it

#### Scenario: Overlay has no close control

- **WHEN** the tuner overlay is open
- **THEN** its chrome offers only the drag handle and the size toggle — no button that closes it

### Requirement: Open state does not persist

On a fresh page load the overlay SHALL start closed, regardless of whether it was open when the app was last used.
Any navigation between screens SHALL close the overlay; it does not carry over from one screen to the next.

#### Scenario: Overlay starts closed on load

- **WHEN** a user loads or reloads the app
- **THEN** the tuner overlay is closed and the microphone is not in use until the user opens it

#### Scenario: Navigating closes the overlay

- **WHEN** the overlay is open on one screen and the user navigates to a different screen (including opening a tag from a list)
- **THEN** the overlay is closed on arrival at the new screen

### Requirement: Overlay opens small in the bottom-right corner every time

Each time the overlay opens it SHALL start at the small size and positioned in the bottom-right corner of the viewport, clear of the bottom tab bar.
Any size change or drag the user makes SHALL last only until the overlay is next closed; it SHALL NOT be remembered between opens or across reloads, and nothing about the overlay's placement is written to storage.

#### Scenario: Reopening resets placement

- **WHEN** a user drags the overlay elsewhere and/or toggles it to the large size, then closes it and opens it again
- **THEN** the overlay reappears small, in the bottom-right corner

#### Scenario: Placement is not written to storage

- **WHEN** a user moves or resizes the overlay
- **THEN** no size or position value is saved to local storage or any other persistent store

### Requirement: Microphone runs only while the overlay is open

The tuner SHALL begin microphone capture when the overlay opens and SHALL stop capture, releasing the microphone, when the overlay closes — whether it is closed by the tab bar toggle or by a navigation.

#### Scenario: Closing the overlay releases the microphone

- **WHEN** a user closes the tuner overlay while it is actively detecting pitch
- **THEN** microphone capture stops and the microphone is released

#### Scenario: Navigating away releases the microphone

- **WHEN** the overlay is open and detecting, and the user navigates to another screen
- **THEN** the overlay closes and microphone capture stops

### Requirement: Overlay is repositioned by dragging a handle

The overlay SHALL provide a dedicated drag handle strip, visually distinct from the pitch wheel, and dragging that strip SHALL move the overlay (for the current open session only — see the placement-reset requirement).
Pointer gestures on the pitch wheel SHALL continue to play notes (see `tuner-glide-play`) and SHALL NOT move the overlay.

#### Scenario: Dragging the handle moves the overlay

- **WHEN** a user presses on the overlay's drag handle and moves the pointer
- **THEN** the overlay follows the pointer to a new position

#### Scenario: Dragging on the wheel plays notes, not the overlay

- **WHEN** a user presses on a pitch-wheel wedge and drags across the wheel
- **THEN** notes sound as the pointer crosses wedges and the overlay does not move

### Requirement: Overlay stays within the viewport and clear of the visible tab bar

The overlay's position SHALL be clamped so it remains fully within the viewport, both during a drag and after a viewport change (resize, orientation change, on-screen keyboard) or a size change.
The bottom of its allowed range SHALL track how much of the bottom tab bar is actually on screen: while the tab bar is visible the overlay SHALL NOT overlap it, and when the tab bar is not on screen (the tag detail immersive chrome is hidden) the overlay MAY be moved all the way to the bottom edge of the viewport.
If the tab bar slides back into view while the overlay sits at the bottom, the overlay SHALL be nudged up so the returning bar does not cover it.

#### Scenario: Drag stops before a visible tab bar

- **WHEN** a user drags the overlay toward the bottom of the screen while the tab bar is visible
- **THEN** the overlay stops with its bottom edge above the tab bar rather than overlapping it

#### Scenario: Drag reaches the bottom edge when the tab bar is hidden

- **WHEN** a user is on the tag detail screen with the immersive chrome (and tab bar) hidden and drags the overlay toward the bottom
- **THEN** the overlay can be moved down to the bottom edge of the viewport

#### Scenario: Restoring the chrome lifts a bottom-parked overlay

- **WHEN** the overlay sits at the very bottom on the tag detail screen and the user restores the chrome so the tab bar slides back in
- **THEN** the overlay is nudged up so it is not covered by the tab bar

#### Scenario: Drag stops at the other viewport edges

- **WHEN** a user drags the overlay toward the top, left, or right edge of the screen
- **THEN** the overlay stops at that edge rather than moving partly off-screen

#### Scenario: Viewport or size change pulls the overlay back into bounds

- **WHEN** the viewport shrinks or rotates, or the panel is enlarged, such that the overlay would be off-screen or over a visible tab bar
- **THEN** the overlay is repositioned so it is fully visible and clear of the visible tab bar

### Requirement: Overlay is semi-transparent

The overlay SHALL be rendered semi-transparent so that content directly beneath it — sheet music in particular — remains partly visible through the panel.

#### Scenario: Sheet music shows through the overlay

- **WHEN** the overlay is open over a tag's sheet music
- **THEN** the sheet music beneath the panel is still partly visible rather than fully occluded

### Requirement: Overlay is independent of the tag detail immersive chrome

On the tag detail screen, hiding the immersive chrome (which hides the header and tab bar, and therefore the tab bar's tuner toggle) SHALL NOT hide or close the tuner overlay.
An open overlay SHALL remain visible and interactive while the chrome is hidden, and while it is hidden the overlay's drag range SHALL extend to the bottom edge of the viewport (see the viewport-clamp requirement).
To close the overlay on that screen while the chrome is hidden, the user first restores the chrome (by tapping the sheet music) and then uses the tab-bar toggle.

#### Scenario: Overlay stays put when the chrome is hidden

- **WHEN** the tuner overlay is open on the tag detail screen and the user taps the sheet music to hide the chrome
- **THEN** the header and tab bar slide away but the tuner overlay stays visible and usable
