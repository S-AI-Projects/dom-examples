# Simple Stream Pump Demo

This example demonstrates how to consume a binary stream using `ReadableStream`, read chunks via `reader.read()`, pipe chunks through a new `ReadableStream` controller, and reconstruct an image blob using `Response` and `URL.createObjectURL()`.

## Running the Demo

Serve the repository with a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/streams/simple-pump/index.html` in your browser.

## Automated Regression Tests

Run the feature-present and feature-absent test suite:

```bash
node tests/course/r55-t026.mjs
```
