# R55-T044 evidence

- Baseline source review: one resize listener populated the two existing output spans, but their values stayed blank until a resize event occurred.
- Change under review: the page initializes the displayed dimensions immediately; the Playwright test instruments listener registration and repeats viewport updates while checking that nodes are not duplicated.
- Test command: `node tests/course/r55-t044.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t044.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- Listener counts and resize output were not observed in a browser in this environment.
