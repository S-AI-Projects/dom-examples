# Pointer Events Examples

Interactive code examples demonstrating the W3C Pointer Events API for single and multi-touch interactions.

## Demos

* **[Drawing program](https://mdn.github.io/dom-examples/pointerevents/Using_Pointer_Events.html)**: Pointer Events drawing program.
* **[Multi-touch interaction](http://mdn.github.io/dom-examples/pointerevents/Multi-touch_interaction.html)**: Multi-touch interaction demo.
* **[Two-pointer Pinch/Zoom Demo](http://mdn.github.io/dom-examples/pointerevents/Pinch_zoom_gestures.html)**: Two-pointer pinch-to-zoom gesture recognition.
  * Entry Point: `pointerevents/Pinch_zoom_gestures.html`
  * Source Anchors: `#target`, `#log`, `#clearlog`

## Running Locally

Serve using a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/pointerevents/Pinch_zoom_gestures.html` in your browser.

## Automated Regression Check

Run the regression test that distinguishes correct pinch gesture handling from broken bindings:

```bash
node tests/course/r55-t030.mjs
```
