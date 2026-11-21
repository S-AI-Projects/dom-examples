# R55-T047 evidence

- Baseline source review: the page had no walkthrough heading or setup instructions, and the report button was installed only after an observer callback. It also invoked a legacy camera API without feature detection.
- Change under review: the button displays observed deprecation reports or an empty state; camera API use is feature-detected; docs describe the entry page and interaction. Playwright supplies a local report fixture.
- Test command: `node tests/course/r55-t047.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t047.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- No report screenshot was produced; the walkthrough still needs a browser run.
