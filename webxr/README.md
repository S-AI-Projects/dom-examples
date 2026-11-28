# WebXR Example

## Run locally

From the repository root, run:

    python3 -m http.server 8000

Open http://localhost:8000/webxr/ for the WebXR example and http://localhost:8000/webxr/text-rendering.html for the safe text-rendering companion.

## Safe text rendering

The companion page uses textContent to display user-provided fixture text as plain text, not HTML.

## Automated test

From the repository root, run:

    node tests/course/r55-t028.mjs

The test starts its own local server, uses Playwright Chromium, stubs WebXR support, and cleans up the browser and server.
