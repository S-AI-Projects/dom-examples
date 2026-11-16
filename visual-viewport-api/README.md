# Visual Viewport API Example

This example demonstrates how to use the `visualViewport` API (`window.visualViewport`) to query and respond to changes in the visual viewport's position and scale as the user scrolls and pinches.

## Features
- Dynamic tracking of `visualViewport.offsetLeft` and `offsetTop`.
- Real-time display inside `#visual-info` and `#window-info`.
- Respects `prefers-reduced-motion: reduce` preference media queries.
- Visible, high-contrast keyboard focus indicators on `#output` and `#instructions` across both mobile and desktop viewports.

## Running Locally

To run this demo locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/visual-viewport-api/index.html`.

## Running Tests

Automated regression tests verify keyboard focus visibility and reduced motion compliance across 360px and 1280px widths:

```bash
node tests/course/r55-t009.mjs
```
