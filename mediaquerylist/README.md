# MediaQueryList feature support check

From the repository root, install development dependencies with `npm install`
and run `node tests/course/r55-t046.mjs`. It tests narrow and wide viewports,
then removes `window.matchMedia` in an isolated browser context to verify the
page explains the unsupported path without a JavaScript error.
