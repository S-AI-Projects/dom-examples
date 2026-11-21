# R55-T043 evidence

- Baseline source review: unsupported codecs only wrote to the console; failed requests and decode errors had no visible recovery state.
- Change under review: a live status reports unsupported formats, failed local media requests, and successful fixture recovery. The test stubs MediaSource and uses controlled 503 and 200 responses.
- Test command: `node tests/course/r55-t043.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t043.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- The controlled request outcomes and rendered status were not observed in a browser in this environment.
