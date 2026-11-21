# Deprecation report walkthrough

Serve the repository root with `python3 -m http.server` and open
`/reporting-api/deprecation_report.html`. The page observes deprecation
reports and displays collected records when **Show reports** is selected. It
may call the legacy camera API when present to demonstrate a deprecation; the
call is feature-detected and permission denial does not block the report view.

Install development dependencies with `npm install` and run
`node tests/course/r55-t047.mjs` from the repository root. The browser test
supplies a deterministic local `ReportingObserver` fixture and verifies the
button output without requesting camera permission.
