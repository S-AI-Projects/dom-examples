# Deterministic visual viewport check

From the repository root, install development dependencies with `npm install`
and run `node tests/course/r55-t045.mjs`. The test fixes the browser viewport,
scroll position, and local page assets, then compares the rendered output from
two fresh browser runs.
