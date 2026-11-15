# R55-T020 — IndexedDB index sorting regression

## Target
`indexeddb-examples/idbindex/index.html`

## Baseline behavior
- The page loads 10 sample contacts from IndexedDB.
- Contacts initially appear in ID order.
- Clicking the Last name column heading sorts all contacts alphabetically by last name.
- The table uses collapsed borders and clickable pointer styling on its headings.
- No uncaught browser page errors were observed.

## Regression fixture
A temporary Playwright route changes the Last name heading event binding from `click` to `dblclick`. The mutation is applied only to the JavaScript response in the test browser; repository application files are not modified.

## Test input
- Fresh browser context with a new IndexedDB storage area.
- Original page loaded through the local test HTTP server.
- One click on the Last name column heading.
- In the mutated fixture, the same single click is performed.

## Expected versus actual

| Check | Expected | Actual |
|---|---|---|
| Initial contacts | 10 contacts in ID order | PASS |
| Table layout and heading styling | Collapsed borders and pointer cursor | PASS |
| Correct Last name click handler | All 10 contacts sorted alphabetically | PASS |
| Deliberately broken handler | Single click does not sort contacts | PASS |
| Browser page errors | No uncaught page errors | PASS in both contexts |

## Test command
`node tests/course/r55-t020.mjs`

## Result
All R55-T020 regression checks passed.

## Environment
- Node.js: v26.13.0
- npm: 11.20.0
- Playwright: 1.65.0
- Chromium: 158.0.8127.18
