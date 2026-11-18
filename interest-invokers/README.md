# MDN interest invoker examples

This set of examples demonstrates usage of [Interest invokers](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using_interest_invokers).

- [Popover examples](popover-examples/): Demonstrates a couple of examples of displaying popovers via interest invokers, including a typical link preview popover.
- [Style preview](style-preview/): Demonstrates non-popover usage of interest invokers. In this example, several buttons can be pressed to apply different style themes to a style preview pane. Interest invokers have been used to progressively enhance the demo, making it so that hovering/focusing the buttons previews the styles on the pane without having to click to apply each one.
- [Stock tracking example](stock-moving/): A more complex example that shows a greengrocer's stock represented by buttons in different columns. You can hover/focus a stock button to start incrementing a number of items to move, and then click the butotn to move them over to the other column.

## Interaction regression check

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t040.mjs
```

The check records the stock tooltip behavior on the real page, then serves a
temporary fixture with the `interest` binding deliberately removed. The correct
page must update stock; the mutated fixture must remain unchanged, proving that
the assertion detects the intended regression.
