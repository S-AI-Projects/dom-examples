# R55-T004 Baseline Assessment

## Example
- Path: `indexeddb-examples/idbindex/index.html`
- Source anchors: `table`
- Type: IndexedDB DOM lifecycle & reinitialization check

## Baseline Behavior
- The baseline script initialized IndexedDB directly inside `window.onload` with anonymous inline closures.
- Repeated calls or re-runs lacked an explicit lifecycle API, risking multiple event listeners attached directly to `th` elements and duplicate IndexedDB open requests.
- No structured teardown or abort mechanism (`AbortController`, `db.close()`) was available for cleanup between test runs or dynamic SPA route transitions.

## Improvements Introduced
1. Restructured script to expose idempotent `window.initApp()` and `window.cleanupApp()`.
2. Implemented `AbortController` signal delegation for table header click events to prevent memory leaks and stacked listeners.
3. Ensured `tbody` DOM rows are cleared before inserting rows, guaranteeing exactly 10 rows after repeated initializations or sorts.
4. Added lifecycle event dispatch (`idb-data-rendered`) to facilitate deterministic test synchronization.
5. Upgraded font stylesheet reference to secure HTTPS.
