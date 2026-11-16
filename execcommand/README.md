# execCommand Supported Commands Demo

This example demonstrates which `document.execCommand` operations are supported by the browser, how to trigger commands on `contenteditable` content, and includes an isolated companion example for safe plain text fixture rendering.

## Features
- Dynamic detection and toolbar rendering of supported `execCommand` capabilities.
- Live `contenteditable` sandbox for editing formatted text and images.
- Isolated Safe Text Rendering Companion demonstrating strict `textContent` fixture insertion to prevent unintended element injection (e.g. `<img src="x">`).

## Running Locally

To run this demo locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/execcommand/index.html`.

## Running Tests

Automated regression tests verify that untrusted HTML fixture strings containing `<img src="x">` render strictly as text, create no DOM elements, and execute no injected handlers:

```bash
node tests/course/r55-t008.mjs
```
