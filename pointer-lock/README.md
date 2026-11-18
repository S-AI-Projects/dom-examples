# Pointer lock demo

This demo keeps the pointer-lock teaching behavior while making its drawing
area keyboard-focusable and responsive at narrow widths.

## Motion and focus regression check

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t039.mjs
```

The check emulates both reduced-motion and normal-motion preferences at 360px
and 640px widths. It documents that the demo has no CSS/Web Animations motion,
and asserts that the canvas remains usable with a visible keyboard focus ring.
