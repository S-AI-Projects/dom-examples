# R55-T042 evidence

- Baseline source review: the demo used a fixed 480px iframe inside a 90%-width body, so the frame could extend beyond a 360px viewport.
- Change under review: the iframe is constrained to its container, form controls fit narrow screens, and the test checks content order, boundaries, and a real local channel message at 360px and 1280px.
- Test command: `node tests/course/r55-t042.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t042.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- No browser screenshots were produced. The responsive measurements and visual evidence still need a browser run on a host that permits Chromium to launch.
