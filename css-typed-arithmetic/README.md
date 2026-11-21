# Typed arithmetic interaction regression check

From the repository root, install development dependencies with `npm install`
and run `node tests/course/r55-t050.mjs`. The check opens the responsive
background-opacity example from the index, verifies its computed overlay at a
fixed viewport, then confirms the same assertion rejects a temporary broken
CSS fixture.
