# R55-T049 evidence

- Baseline source review: the video starts only after user playback, but the page had no reduced-motion treatment, focus style, or mobile viewport metadata; its floated panels could exceed narrow layouts.
- Change under review: the page documents user-started motion, applies reduced-motion CSS, adds a visible focus outline, and wraps panels at small widths. The test checks 360px and 1280px contexts with reduced motion enabled.
- Test command: `node tests/course/r55-t049.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t049.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- Focus, reduced-motion, and layout assertions were not observed in a browser in this environment.
