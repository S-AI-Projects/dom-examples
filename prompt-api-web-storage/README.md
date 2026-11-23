# Prompt API with Web Storage Demo

This demo demonstrates integration of the experimental Prompt API (`window.LanguageModel`) with local storage session persistence and query cancellation.

## Running the Demo

Serve the repository with a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/prompt-api-web-storage/` in your browser.

## Automated Regression Tests

Run the repeat initialization and lifecycle test:

```bash
node tests/course/r55-t024.mjs
```
