# R55-T041 evidence

- Baseline source review: the index page contained example links but no skip link, no focus helper, and no `tabindex` values.
- Change under review: a keyboard-visible skip link targets the example list; the Playwright test checks Tab order, focus styling, Enter activation, and positive `tabindex` absence.
- Test command: `node tests/course/r55-t041.mjs`.
- Result: blocked before assertions. Playwright Chromium exits with `SIGTRAP`; Chromium reports `bootstrap_check_in ... Permission denied (1100)` for its Mach-port rendezvous service.
- Static check: `node --check tests/course/r55-t041.mjs` and `node --check tests/course/browser-harness.mjs` pass.
- Environment: Node.js 26.13.1, npm 11.20.0, Playwright 1.65.1, Chromium build 1255.
- No browser screenshot was produced. The before/after interaction still needs a browser run on a host that permits Chromium to launch.
