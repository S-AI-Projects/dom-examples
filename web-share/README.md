# Web Share API Example

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open: http://localhost:8000/web-share/

## Run automated tests

```bash
node tests/course/r55-t029.mjs
```

The test starts and stops its own local server, uses Playwright Chromium, and stubs the native Web Share API.
