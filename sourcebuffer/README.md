# SourceBuffer fallback and recovery check

From the repository root, install development dependencies with `npm install`
and run `node tests/course/r55-t043.mjs`. The Playwright check simulates an
unsupported codec, then serves deterministic video bytes through a local
MediaSource fixture to verify the success path without public network access.
