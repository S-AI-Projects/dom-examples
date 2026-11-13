# ScreenLeft and ScreenTop Canvas Example

This example demonstrates how Window.screenLeft and Window.screenTop can be used to keep a circle at the same physical position on the screen when the browser window moves.

The canvas is 640 × 480 pixels. A blue circle is drawn on a black background, and the current screen coordinates are displayed above it.

## Run the example

From the repository root:

    python3 -m http.server 8000

Open http://127.0.0.1:8000/screenleft-screentop/ in your browser.

Move the browser window to observe how the circle responds to changes in screen coordinates.

## Run the regression test

Requirements: Node.js, Playwright, Playwright Chromium, and Python 3.

From the repository root:

    node tests/course/r55-t017.mjs

The test starts and stops its own local HTTP server and browser. It checks canvas dimensions, computed layout, circle rendering, coordinate compensation, and unexpected JavaScript errors.

Baseline and changed-state screenshots and JSON results are saved in work/R55-T017/.
