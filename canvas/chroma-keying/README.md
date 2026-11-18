# Canvas chroma-keying demo

This example draws video frames into one canvas and removes the green pixels
before painting the result into the second canvas.

## Deterministic regression check

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t035.mjs
```

The check uses two fresh browser contexts with a fixed viewport, fixed clock and
random source, and local-only routing. It verifies that the video and both
canvas fixtures produce the same rendered DOM state in each context without
depending on a public API.
