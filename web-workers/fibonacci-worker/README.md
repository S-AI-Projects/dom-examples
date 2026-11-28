# fibonacci-worker

A web worker that calculates fibonacci numbers. [See it live](https://mdn.github.io/dom-examples/web-workers/fibonacci-worker/).

## Run locally

From the repository root, start a local server:

    python3 -m http.server 8000

Open http://localhost:8000/web-workers/fibonacci-worker/ in your browser.

Enter a Fibonacci index and submit the form. For example, input 6 returns 8 in the result area, and the input field is cleared.

## Automated test

Install dependencies from the repository root:

    npm install

Run the browser test:

    npm run test:r55-t027

The test starts its own local HTTP server and Chromium browser. It checks the page elements, computed layout, Web Worker results for inputs 0, 1, 6, and 13, and unexpected browser errors.
