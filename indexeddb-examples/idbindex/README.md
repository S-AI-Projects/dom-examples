# Basic IDBIndex example — contacts directory

This example demonstrates how to use an IndexedDB object store and its indexes to display and sort a contacts directory.

## Behavior

- The page loads 10 sample contacts from IndexedDB.
- The contacts are initially displayed in ID order.
- Click a table column heading to sort the contacts by that column.
- The Last name heading sorts contacts alphabetically by last name.

## Regression test

From the repository root, run `node tests/course/r55-t020.mjs`.

The Playwright test checks the initial contact list, table styling, and Last name sorting. It also applies a deliberate event-binding mutation in a temporary browser fixture and verifies that clicking the heading no longer sorts the contacts.

The mutation is applied only during the test; the example source files remain unchanged.
