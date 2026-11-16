# Basic IDBIndex Example — Contacts Directory

This example demonstrates how to create, populate, and query an IndexedDB database using `IDBIndex` to sort and inspect structured contact records.

## Features
- Opens an IndexedDB database (`contactsList`).
- Automatically defines indices for fields such as `lName`, `fName`, `company`, `eMail`, `age`.
- Populates sample contacts and renders them dynamically inside a `<table>`.
- Allows clicking table column headers (`<th>`) to dynamically re-index and sort rows.
- Implements idempotent initialization (`initApp()`) and lifecycle cleanup (`cleanupApp()`) to prevent duplicate DOM rows or dangling event handlers upon re-initialization.

## Running Locally

To run this demo locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/indexeddb-examples/idbindex/index.html`.

## Running Tests

Automated regression tests verify idempotent reinitialization, table row counts, sorting interactions, and absence of duplicate listeners:

```bash
node tests/course/r55-t004.mjs
```
