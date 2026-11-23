# WebXR Example & Safe Text Companion

This directory contains a WebXR scene demo demonstrating rotating objects and user camera movement, alongside a safe text-rendering companion example.

## Entry Points

* **Main 3D Scene**: `webxr/index.html` (contains `#enter-xr`, `#projection-matrix`, `#model-view-matrix`, `#camera-matrix`)
* **Safe Text Companion**: `webxr/safe-text.html` (demonstrates safe text fixture insertion preventing markup injection)

## Running Locally

Serve the repository using a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/webxr/` in a browser.

## Automated Regression Check

Run the automated test verifying matrix anchors and safe text fixture rendering:

```bash
node tests/course/r55-t028.mjs
```
