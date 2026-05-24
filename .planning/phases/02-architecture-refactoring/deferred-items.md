# Deferred Items — Phase 2: Architecture Refactoring

| Category | Item | Status | Discovered At |
|----------|------|--------|---------------|
| Pre-existing | `npm run typecheck` fails due to `src/__tests__/editor-state.test.ts` importing from `../editor-state` (module not yet created by parallel Plan 02-01) | Awaiting Plan 02-01 completion | Plan 02-02 |
| Pre-existing | `npm run lint` has 3 errors in `editor-state.test.ts` and `editor-state.ts` — unused vars, empty function (parallel Plan 02-01 files) | Awaiting Plan 02-01 completion | Plan 02-02 |
| Pre-existing | `createEditorRender: render() passes navigateFn to state.toContext during render` test fails (1/147) — uncommitted Plan 02-03 changes in working tree | Awaiting Plan 02-03 completion | Plan 02-04 |

