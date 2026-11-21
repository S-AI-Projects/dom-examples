# R55-T050 evidence

- Baseline source review: the index links to the responsive opacity demo, whose CSS uses typed arithmetic to derive a white overlay from viewport width.
- Change under review: the browser test checks the computed opacity at 1000px, then alters a temporary CSS response and confirms the same assertion rejects the broken value. The app files contain no deliberate mutation.
- Test command: `node tests/course/r55-t050.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t050.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- The correct and mutated computed styles were not observed in a browser in this environment.
