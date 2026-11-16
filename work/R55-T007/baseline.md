# R55-T007 Baseline Assessment

## Example
- Path: `css-carousels/scroll-button-scroll-marker/index.html`
- Source anchors: `a`, `button`
- Type: Executable demo walkthrough and documentation

## Baseline Behavior
- The baseline directory contained no README or documentation on how to serve, interact with, or test the CSS Carousel demo.
- No interaction handlers existed on buttons; clicking the button produced no visual state change or feedback.
- No automated verification existed to check that documented selectors, scroll offsets, and layout states matched the live application.

## Improvements Introduced
1. Authored comprehensive, verified walkthrough in `css-carousels/scroll-button-scroll-marker/README.md`.
2. Added click interaction handling and explicit IDs to carousel items (`#carousel-item-1` through `#carousel-item-4`).
3. Created Playwright automated walkthrough test `tests/course/r55-t007.mjs` executing all documented steps.
4. Captured verified walkthrough screenshot at `work/R55-T007/walkthrough-page2.png`.
5. Proved exact agreement between documented selectors, DOM states, scroll offsets, and runtime behavior.
