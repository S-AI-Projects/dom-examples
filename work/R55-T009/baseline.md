# R55-T009 Baseline Assessment

## Example
- Path: `visual-viewport-api/index.html`
- Source anchors: `#instructions`, `#output`, `#visual-info`, `#window-info`
- Type: Motion and focus preference verification

## Baseline Behavior
- The baseline demo contained no focusable interactive elements (`tabindex` was absent), making it unreachable for keyboard-only users.
- No visible `:focus` styling or indicators existed.
- No CSS media query rules existed for `prefers-reduced-motion: reduce`.
- The layout was static without CSS animations, but lacked explicit motion-suppression guarantees for assistive technologies.

## Improvements Introduced
1. Added accessible `tabindex="0"` and semantic `role="region"` with `aria-label="Viewport information"` to `#output` and `#instructions`.
2. Implemented high-contrast, visible focus indicator styles (`3px solid #005fcc`, `outline-offset: 2px`).
3. Added `@media (prefers-reduced-motion: reduce)` rules explicitly suppressing transition and animation durations.
4. Created automated Playwright test `tests/course/r55-t009.mjs` verifying visible focus indicators and information visibility under reduced motion at both 360px and 1280px widths.
5. Preserved all source anchors and original visual viewport tracking mathematics.
