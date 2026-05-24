# Phase 1: Production Infrastructure & Test Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 1-production-infrastructure
**Areas discussed:** Existing test migration, ESLint rule philosophy

---

## Existing Test Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Convert to Vitest | Rewrite the 3 existing tests as Vitest suites (.test.ts), keeping their current assertions but with describe/it and happy-dom | ✓ |
| Delete and rewrite | Scrap the existing tests entirely, write fresh Vitest suites from scratch | |
| Run alongside | Keep the existing .mjs tests in the test script alongside new Vitest suites | |

**User's choice:** Convert to Vitest (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| src/__tests__/ | Co-locate tests with source modules | ✓ |
| Keep test/ dir | Keep all tests in the existing test/ directory | |
| You decide | OpenCode picks location | |

**User's choice:** src/__tests__/ (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| v8 + branch | v8 native coverage, branch coverage as primary metric | ✓ |
| istanbul + all | Istanbul engine, all four metrics | |

**User's choice:** v8 + branch (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cursor first | Test cursor module first (safety net for Phase 2) | ✓ |
| Breadth-first | Add a few tests to each module first | |
| You decide | OpenCode prioritizes | |

**User's choice:** You decide

**Notes:** Cursor-first priority captured as a decision; ordering after cursor/tokenizer/renderer is at OpenCode's discretion.

---

## ESLint Rule Philosophy

| Option | Description | Selected |
|--------|-------------|----------|
| Recommended + Stylistic | Full rule stack: type-checked enforcement + consistent code style | ✓ |
| Recommended only | Type safety and bug-catching rules only | |
| You decide | OpenCode picks the right balance | |

**User's choice:** Recommended + Stylistic (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| ESLint + Prettier | ESLint for code quality, Prettier for formatting consistency | ✓ |
| ESLint only | Let eslint stylistic rules handle everything | |

**User's choice:** ESLint + Prettier (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Errors block | Any lint error fails CI, warnings allowed through | ✓ |
| Warnings block too | Both errors and warnings fail CI | |
| Errors only | Only lint errors fail CI | |

**User's choice:** Errors block (Recommended)

## OpenCode's Discretion

- Exact test file ordering after cursor/tokenizer/renderer modules
- Specific ESLint rule customizations beyond the recommended + stylistic presets
- Coverage threshold enforcement details within the 80% requirement
- CI trigger policy (push vs PR gating, branch protection)
- Vitest configuration details (timeouts, parallelization, file matching)
- happy-dom configuration and any additional browser API mocks needed

## Deferred Ideas

None — discussion stayed within phase scope.
