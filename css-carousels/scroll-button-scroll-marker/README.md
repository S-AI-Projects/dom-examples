# CSS Carousel Demo: Scroll Button and Scroll Marker

This example demonstrates next-generation CSS Carousel features including CSS Scroll Buttons (`::scroll-button(*)`) and CSS Scroll Markers (`scroll-marker-group: after`, `li::scroll-marker`).

## Features
- CSS Scroll Marker generation and navigation dots.
- CSS Scroll Buttons for stepping horizontally through pages.
- `@supports (scroll-marker-group: after)` fallback notification banner for browsers lacking experimental carousel support.
- Native keyboard scrolling fallback ensuring all links (`<a>`) and buttons (`<button>`) remain accessible.

## Running Locally

To run this demo locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/css-carousels/scroll-button-scroll-marker/index.html`.

## Running Tests

Automated regression tests verify both feature-present and feature-absent fallback paths:

```bash
node tests/course/r55-t006.mjs
```
