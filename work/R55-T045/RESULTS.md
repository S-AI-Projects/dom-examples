# R55-T045 evidence

- Baseline source review: the static page reads VisualViewport and window offsets and updates its output on scroll and resize; it has no external data request or clock.
- Change under review: the Playwright check fixes viewport size and scroll position, uses two fresh contexts, compares their DOM and layout, and saves a screenshot when the browser runs.
- Test command: `node tests/course/r55-t045.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t045.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- No browser screenshot or repeated DOM observation was produced.
