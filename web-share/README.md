# Web Share API Demo

This example demonstrates how to invoke system-native share dialogs via the Web Share API (`navigator.share()` and `navigator.canShare()`), featuring accessible visible focus states and respect for user reduced motion preferences.

## Running the Demo

Serve the repository with a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/web-share/index.html` in your browser.

## Automated Regression Tests

Run the reduced motion and focus preference checks:

```bash
node tests/course/r55-t029.mjs
```
