# Media Session demo

The main page demonstrates media metadata and action handlers. The isolated
`text-fixture.html` companion demonstrates the safe text-rendering contract used
when user or fixture strings are displayed.

## Safe text-rendering regression check

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t038.mjs
```

The check loads the real media-session page and then renders a string containing
`<img src=x onerror=...>` in the companion fixture. The expected result is
literal text, no injected element, and no executed handler.
