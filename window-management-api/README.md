# Window Management API demo

The example detects Window Management API support and either opens a learning
environment or presents links that work in browsers without the API.

## Repeat-initialization regression check

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t034.mjs
```

The check covers both the unsupported link fallback and a stubbed supported
path. Repeated activation must not open duplicate windows or register duplicate
cleanup handlers; after the test windows close, activation can start one fresh
set again.
