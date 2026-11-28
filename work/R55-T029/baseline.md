# R55-T029 Baseline

## Existing page
- File: `web-share/index.html`
- Heading: `Sharing MDN`
- Main control: `Share MDN!` button
- Result area: `.result` paragraph
- Share link: MDN browser compatibility documentation

## Existing styles
- The inline `<style>` element is empty.
- No CSS animations or transitions are defined.
- The page uses the browser's default static layout.

## Existing JavaScript
- Uses `navigator.canShare()` to check share support.
- Uses `navigator.share()` to invoke native sharing.
- Displays success, unsupported, or error messages in `.result`.

## Planned regression
- Verify reduced-motion emulation keeps content and controls usable.
- Verify keyboard focus is visible at two viewport widths.
- Stub native sharing APIs so tests do not require device permissions.
