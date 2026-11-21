# Resize lifecycle regression check

From the repository root, install development dependencies with `npm install`
and run `node tests/course/r55-t044.mjs`. It verifies the page initializes one
resize listener and keeps the two output nodes stable while the viewport is
resized repeatedly.
