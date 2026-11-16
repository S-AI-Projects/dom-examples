# Safe Text Rendering Companion

This companion example demonstrates how to display user-provided or fixture text without interpreting it as HTML.

## Purpose

The original `index.html` and `script.js` demonstrate rendering a triangle using WebGPU. They do not contain a text input or an HTML-rendering workflow.

The separate `text-rendering.html` page provides a small, isolated example of safe text rendering.

## Rendering Contract

- User-provided text is displayed using the DOM `textContent` property.
- HTML-like strings are treated as literal text.
- Input must not create DOM elements or execute event handlers.
- Rich HTML rendering is not part of this example. Any future rich-content feature must have its own explicit, separately reviewed contract.

## Run Locally

From the repository root:

```bash
python3 -m http.server 4175
