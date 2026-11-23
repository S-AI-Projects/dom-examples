# insertAdjacentText() Demo

This example demonstrates how to use `element.insertAdjacentText()` to dynamically insert text nodes into the DOM (`afterbegin` and `beforeend`).

## Running the Demo

Serve the repository with a local HTTP server:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/insert-adjacent/insertAdjacentText.html` in your browser.

## Automated Regression Tests

Run the empty and error display check:

```bash
node tests/course/r55-t023.mjs
```
