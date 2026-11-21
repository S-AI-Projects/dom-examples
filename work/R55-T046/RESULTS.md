# R55-T046 evidence

- Baseline source review: the page called `window.matchMedia` without checking support, so a missing API would throw before any status was shown.
- Change under review: the supported path reports narrow/wide states and listens for changes; the unsupported path provides readable fallback text. The test stubs the absent API.
- Test command: `node tests/course/r55-t046.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t046.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- The narrow, wide, and fallback states were not observed in a browser in this environment.
