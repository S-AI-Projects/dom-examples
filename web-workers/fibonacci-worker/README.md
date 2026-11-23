# Fibonacci Number Generator (Dedicated Web Worker Walkthrough)

This example demonstrates how to offload intensive mathematical computations to a background Web Worker (`fibonacci.js`) so that the main UI thread remains responsive.

## Page Entry Point & Structure

* **Entry Point**: `web-workers/fibonacci-worker/index.html`
* **Worker Script**: `web-workers/fibonacci-worker/fibonacci.js`
* **Interactive Elements**:
  * `#number`: Numeric input field for specifying the zero-based sequence index.
  * `input[type="submit"]`: Submits the index to the background worker.
  * `#result`: Displays the calculated Fibonacci value emitted by the worker.

## Setup & Running Locally

Because Web Workers are subject to cross-origin and security restrictions on `file://` URLs, this demo must be served over HTTP:

```bash
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/web-workers/fibonacci-worker/index.html` in your browser.

## Step-by-Step Walkthrough

1. Locate the input field `#number`.
2. Enter the index value `6`.
3. Click **Submit** (or press <kbd>Enter</kbd>).
4. Observe that the form clears and the `#result` paragraph displays `8`.
5. Enter a larger index, such as `10`, and submit. The `#result` updates to `55`.

## Automated Regression Check

To execute the automated Playwright verification of this walkthrough:

```bash
node tests/course/r55-t027.mjs
```
