# CSS Carousel Walkthrough: Scroll Button & Scroll Marker

This document provides a tested step-by-step walkthrough of the CSS Carousel demo, detailing entry points, setup commands, interaction flows, and verified layout observations.

## 1. Page Entry Point
- Entry file: `css-carousels/scroll-button-scroll-marker/index.html`
- Stylesheet: `css-carousels/scroll-button-scroll-marker/styles.css`

## 2. Setup Command
Serve the repository root or the example folder with any local static HTTP server:
```bash
# Using Node / npx
npx serve .

# Using Python
python3 -m http.server 8000
```
Open `http://localhost:8000/css-carousels/scroll-button-scroll-marker/index.html`.

## 3. Interactive Walkthrough & Layout Observation

### Step 1: Initial Page Load
- Selector: `ul`
- Observation: The carousel container displays Page 1 (`#carousel-item-1`) centered. The carousel has `overflow-x: scroll` and `scroll-snap-type: x mandatory`.
- Initial `scrollLeft` offset of `ul` is `0`.

### Step 2: Interactive Control Activation
- Selector: `#carousel-item-1 button`
- Action: User clicks or activates the `<button>` on Page 1.
- Expected Result: Button text updates from `"Press me"` to `"Pressed (Page 1)"`, proving interactive activation.

### Step 3: Carousel Navigation to Page 2
- Selector: `ul` and `#carousel-item-2`
- Action: Scroll the carousel horizontally to reveal Page 2.
- Expected Result: Container `scrollLeft` increases past 0 (`scrollLeft > 200px`), bringing `#carousel-item-2` into view with heading `"Page 2"`.
- Screenshot: Captured at `work/R55-T007/walkthrough-page2.png`.

## 4. Running the Automated Walkthrough Test

Run the automated Playwright test that executes and verifies every step of this walkthrough:

```bash
node tests/course/r55-t007.mjs
```
