# Phase 2: Architecture Refactoring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 2-architecture-refactoring
**Areas discussed:** Module boundaries

---

## Module Decomposition

| Option | Description | Selected |
|--------|-------------|----------|
| 5 modules | state, dom, render, navigation, lifecycle — each 50-80 lines | ✓ |
| 7 modules | state, dom, render, breadcrumb, navigation, input, lifecycle — finer separation | |
| You decide | OpenCode picks based on coupling | |

**User's choice:** 5 modules (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep closures | State via mutable closures, readonly context to sub-modules | ✓ |
| Event emitter | Modules communicate via typed events | |

**User's choice:** Keep closures (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| editor-* prefix | editor-state.ts, editor-dom.ts, etc. | ✓ |
| Short names | state.ts, dom.ts, etc. | |
| You decide | OpenCode picks | |

**User's choice:** editor-* prefix (Recommended)

## OpenCode's Discretion

- Exact function-level assignment within each of the 5 modules
- Internal helper naming within each module
- Import/export structure and barrel file decisions
- Specific cursor edge case test scenarios
- demo.ts relocation approach

## Deferred Ideas

None — discussion stayed within phase scope.
