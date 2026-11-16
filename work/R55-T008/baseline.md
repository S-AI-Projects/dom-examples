# R55-T008 Baseline Assessment

## Example
- Path: `execcommand/index.html`
- Source anchors: `a`, `img`
- Type: Safe plain text rendering and fixture injection prevention

## Baseline Behavior
- The baseline `execcommand` example focused on browser `document.execCommand` execution inside `contenteditable` regions.
- The example did not include an input mechanism or text-rendering contract demonstrating how untrusted fixture strings containing HTML tags should be rendered safely as text.
- If raw strings were inserted with `innerHTML`, elements such as `<img src="x" onerror="...">` would inject elements and trigger arbitrary script execution.

## Improvements Introduced
1. Added an isolated, non-intrusive safe-text companion component `<section id="safe-text-companion">` to the page.
2. Implemented strict `textContent` DOM insertion ensuring fixture strings are rendered strictly as text nodes.
3. Created Playwright test `tests/course/r55-t008.mjs` injecting `<img src="x" onerror="window.__xssInjected=true">`.
4. Verified that zero `<img>` elements are generated in the output and zero handlers are executed.
5. Preserved all original `a` and `img` elements in the `execcommand` demo.
