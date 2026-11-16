# R55-T006 Baseline Assessment

## Example
- Path: `css-carousels/scroll-button-scroll-marker/index.html`
- Source anchors: `a`, `button`
- Type: Feature-support fallback for CSS scroll marker / scroll button carousels

## Baseline Behavior
- The baseline demo relied completely on experimental CSS Carousel specifications (`scroll-marker-group: after`, `li::scroll-marker`, `ul::scroll-button(*)`).
- In browsers without CSS carousel support, no feedback or fallback mechanism was provided, leaving users unable to tell why buttons/markers were absent.
- No `@supports` or programmatic capability fallback existed to manage user experience in unsupported environments.

## Improvements Introduced
1. Introduced `<div id="unsupported-notice" class="feature-fallback-notice">` informing users when carousel features are not natively supported and highlighting standard keyboard/scroll fallback.
2. Implemented dual fallback architecture: `@supports (scroll-marker-group: after)` in CSS along with `CSS.supports()` runtime checking.
3. Kept unsupported behavior completely explicit without inventing a mock polyfill or pretending a native API exists.
4. Verified that all card links (`<a>`) and buttons (`<button>`) remain accessible and operable across both supported and unsupported paths.
