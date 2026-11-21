# Chroma key motion and focus check

Open `canvas/chroma-keying/index.html` from a local server. Video and canvas
updates start only after a user selects Play; the page does not autoplay.
Reduced-motion preferences remove smooth scrolling and any animated
transitions. Keyboard focus is marked with a high-contrast outline.

Install development dependencies with `npm install` and run
`node tests/course/r55-t049.mjs` from the repository root. The test uses a
paused local video fixture at 360px and 1280px viewports.
