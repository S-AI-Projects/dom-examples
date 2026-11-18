# Screen Wake Lock API demo

This example demonstrates requesting and releasing a screen wake lock, with an
optional checkbox that re-acquires the lock when the page becomes visible again.

## Keyboard regression check

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t031.mjs
```

The check uses a deterministic Wake Lock sentinel because real wake-lock
requests depend on the device and permission state. It verifies that Tab reaches
both controls, focus remains visible, positive `tabindex` values are absent, and
Space/Enter activate the real controls and update the status text.
