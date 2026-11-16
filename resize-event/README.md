# Window Size Logger (resize-event)

This example demonstrates how to listen for the window `resize` event in JavaScript and dynamically display the viewport's height and width.

## Features
- Listens to `window.addEventListener('resize', ...)`
- Displays real-time `window.innerHeight` and `window.innerWidth` in `#height` and `#width` spans.
- Accessible skip-to-content navigation link for keyboard users with visible focus styles and zero positive `tabindex` values.

## Running Locally

To run this demo locally, serve this directory with any local static HTTP server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/resize-event/index.html` in your browser.

## Running Tests

Automated regression tests verify keyboard navigation, visible focus styling, lack of positive tabindex, and correct DOM updates upon window resizing:

```bash
node tests/course/r55-t001.mjs
```
