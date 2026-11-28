
# R55-T026 Environment

- Operating System: macOS 27.2
- Node.js: v26.13.1
- npm: 11.20.0
- Playwright: 1.65.1
- Browser: Chromium
- Test command: node tests/course/r55-t026.mjs
- Local server: Python 3 HTTP server

## Browser test configuration

- Headless Chromium
- Fresh browser context for each test
- Local example served from the repository root
- Streams API disabled using an init script for the unsupported test
