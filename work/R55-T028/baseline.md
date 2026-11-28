# R55-T028 Baseline

## Existing WebXR page
- File: `webxr/index.html`
- Main control: `#enter-xr`
- Matrix sections: `#projection-matrix`, `#model-view-matrix`, `#camera-matrix`
- No user text input exists on the page.

## Existing rendering
- `webxr/script.js` generates MathML for matrix values.
- Matrix output uses `innerHTML` for generated numeric markup.
- This existing matrix rendering is unrelated to user-provided fixture text and will remain unchanged.

## CSS baseline
- File: `webxr/style.css`
- Styles the WebXR canvas, button area, and matrix boxes.

## Planned isolated example
- Add a separate text-rendering companion page.
- Render user-provided fixture text using `textContent`.
- Keep the existing WebXR page and matrix rendering unchanged.
