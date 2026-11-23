# Navigation API Demo

This example demonstrates how to intercept client-side navigations using the Navigation API (`window.navigation`), cancel navigation to display a confirmation dialog, and handle asynchronous delays.

## Running the Demo

Serve the repository with a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/navigation-api/` in a modern Chromium-based browser.

## Automated Regression Tests

Run the responsive layout test:

```bash
node tests/course/r55-t022.mjs
```
