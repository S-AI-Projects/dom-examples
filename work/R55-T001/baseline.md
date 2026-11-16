# R55-T001 Baseline Assessment

## Example
- Path: `resize-event/index.html`
- Source anchors: `#height`, `#width`
- Type: Static window resize demonstration

## Baseline Behavior
- Prior to modifications, `resize-event/index.html` displayed two empty `<span>` tags (`#height` and `#width`).
- Handlers were attached only to `window.addEventListener('resize', ...)`, meaning no initial dimensions were rendered until an explicit resize took place.
- The document contained no focusable or interactive elements (`<a>`, `<button>`, `<input>`).
- Pressing `Tab` did not highlight any content on the page, bypassing the demo entirely.
- No keyboard skip mechanism existed to allow keyboard-only or screen-reader users to directly locate the primary content region.

## Improvements Introduced
1. Added accessible skip-to-content link `<a href="#main" class="skip-link">Skip to main content</a>`.
2. Maintained zero positive `tabindex` attributes (using `tabindex="-1"` on `<main>` for programmatic navigation target without altering default focus sequence).
3. Provided clear `:focus` styling with high contrast outline (`3px solid #005fcc`) and translated positioning into the viewport when focused.
4. Invoked `resizeListener()` upon initial script execution so dimensions are populated immediately.
5. Retained exact demonstration purpose and layout fidelity.
