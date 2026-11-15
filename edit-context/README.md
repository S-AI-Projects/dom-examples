# EditContext API demos

This folder contains demos for the [EditContext API](https://developer.mozilla.org/docs/Web/API/EditContext_API).

## Demos

* **HTML Editor**: [Source code](https://github.com/mdn/dom-examples/tree/main/edit-context/html-editor) | [Live demo](https://mdn.github.io/dom-examples/edit-context/html-editor)

  This demo shows how to use the EditContext API to create a simple HTML editor. It's used in [Using the EditContext API](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API/Guide) tutorial.
## Responsive Layout Regression Test

The HTML Editor demo includes a Playwright regression test for two viewport sizes:

- Mobile: 360 × 800
- Desktop: 1280 × 800

The test verifies:

- No page-level horizontal overflow.
- The editor remains within the viewport.
- Internal editor scrolling remains enabled.
- The `EditContext` API is available.
- Enter and Tab keyboard interactions work.
- No unexpected JavaScript errors occur.

Run the test from the repository root:

```bash
node tests/course/r55-t012.mjs

```

Test screenshots and measurement results are saved in `work/R55-T012/`.

Note: Horizontal scrolling inside the editor is intentional and is not treated as page-level overflow.
