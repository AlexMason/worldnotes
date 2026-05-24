---
phase: 01-production-infrastructure
plan: 02
subsystem: testing
tags: [cursor, test-migration, vitest, happy-dom]
requires:
  - plan: 01-01
    reason: "Vitest + happy-dom infrastructure must be installed and configured"
  - decision: D-02
    reason: "Tests co-located in src/__tests__/"
  - decision: D-04
    reason: "Cursor module tested first as safety net for Phase 2 refactoring"
provides:
  - "src/__tests__/cursor.test.ts: Vitest test suite for cursor module (5 assertions)"
  - "Deletes test/cursor.test.mjs: old hand-rolled test removed"
affects: []
tech-stack:
  added: []
  patterns:
    - "happy-dom DOM tree builders (document.createElement, document.createTextNode) replace hand-stubbed FakeElement/FakeText"
    - "Direct ES import from source module — no transpilation boilerplate"
    - "describe/it/expect Vitest syntax replaces flat node:assert"
key-files:
  created:
    - src/__tests__/cursor.test.ts
  modified: []
  deleted:
    - test/cursor.test.mjs
decisions:
  - "Used @vitest-environment happy-dom file directive for per-file environment control"
  - "Preserved all 5 assertions with exact expected values from original test"
  - "Used runtime-computed string lengths ('.length') for caret offset assertions to match original test's intent"
metrics:
  duration: "2m 46s"
  completed_date: "2026-05-24"
  task_count: 2
  file_count: 2
---

# Phase 1 Plan 2: Cursor Test Migration to Vitest Summary

Converted the hand-rolled `test/cursor.test.mjs` (Node assert + manual `ts.transpileModule`) to a Vitest `.test.ts` suite in `src/__tests__/cursor.test.ts`, preserving all 5 existing assertions with identical expected values.

## Tasks Executed

### Task 1: create cursor.test.ts with all 5 existing assertions preserved
**Commit:** `bb1dd3c`

Created `src/__tests__/cursor.test.ts` — a Vitest test suite importing `getTextOffset` directly from `../cursor` and using happy-dom's real DOM implementation for tree construction. Key transformations:

- **Framework:** `node:assert/strict` → `vitest` (`describe`, `it`, `expect`)
- **DOM helpers:** Hand-stubbed `{ nodeType, textContent, parentNode }` objects → `document.createTextNode()` / `document.createElement()`
- **Module import:** `ts.transpileModule()` + `require(tempFile)` → direct `import { getTextOffset } from '../cursor'`
- **Node constants:** `globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 }` → removed (happy-dom provides real `Node` class)
- **Test structure:** Flat assertions → `describe('getTextOffset')` with 5 `it()` blocks

**5 Preserved Assertions:**

| # | Description | Expected |
|---|-------------|----------|
| 1 | BR elements → newline chars | `'first\nsecond'` |
| 2 | Block elements → newline | `'first\nsecond'` |
| 3 | data-raw substitution | `'[[projects/acme]]'` |
| 4 | Caret offset after preview link | `'open [[projects/acme]]'.length` (22) |
| 5 | Caret offset inside preview text | `'open [['.length` (7) |

### Task 2: remove old cursor test file and verify
**Commit:** `d442112`

Deleted `test/cursor.test.mjs` (81 lines). Verified `npm test` runs through Vitest and discovers `src/__tests__/cursor.test.ts` — all 5 tests pass with zero failures.

## Verification Results

```
$ npm test
Test Files  1 passed (1)
     Tests  5 passed (5)

$ npm run typecheck
TypeScript compilation completed (no errors)
```

## Deviations from Plan

None — plan executed exactly as written. All 12 acceptance criteria passed. All 5 assertions preserved with identical expected values.

## Commits

| Hash | Type | Message |
|------|------|---------|
| `bb1dd3c` | test | convert cursor test to Vitest with happy-dom |
| `d442112` | chore | remove obsolete cursor test file |
