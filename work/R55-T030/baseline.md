# R55-T030 Baseline

## Page
`pointerevents/Pinch_zoom_gestures.html`

## Main elements
- `#target`: receives pointer events and demonstrates two-pointer pinch/zoom gestures.
- `#log`: toggles event logging.
- `#clearlog`: clears the output log.
- `<output>`: displays pointer event details when logging is enabled.

## Existing behavior
- `pointerdown` adds a pointer to the event cache.
- `pointermove` updates the pointer cache and changes the target border to dashed.
- Two-pointer movement changes the target background to pink or light blue according to pinch direction.
- `pointerup`, `pointercancel`, `pointerout`, and `pointerleave` share the cleanup handler.
- Pointer cleanup resets the target background and border.

## Planned regression
Temporarily remove the `pointermove` event binding in a test fixture. Verify that the correct page responds to pointer movement and that the mutated fixture does not. The original application file must remain unchanged.
