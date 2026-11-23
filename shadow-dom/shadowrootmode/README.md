# Declarative Shadow DOM Demo

This example demonstrates native Declarative Shadow DOM via `<template shadowrootmode="open">` on `#host`.

## Running the Demo

Serve the repository with a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/shadow-dom/shadowrootmode/simple.html` in your browser.

## Automated Regression Tests

Run the deterministic fixture test:

```bash
node tests/course/r55-t025.mjs
```
