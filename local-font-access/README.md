# Local Font Access API Demo

This example demonstrates how to use the Local Font Access API (`window.queryLocalFonts()`) to retrieve user-installed system fonts and apply them to sample text.

## Running the Demo

Serve the repository with a local web server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/local-font-access/` in a supporting browser (e.g. Chrome / Chromium).

## Automated Regression Tests

Run the course regression test suite:

```bash
node tests/course/r55-t021.mjs
```
