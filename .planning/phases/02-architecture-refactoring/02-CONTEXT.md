# Phase 2: Architecture Refactoring - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

## Phase Boundary

Decompose the 489-line editor.ts monolith into focused, independently testable modules with clear responsibilities and no circular dependencies. The render pipeline (tokenizer → renderer) remains intact but is modularized. demo.ts is extracted from build output. Module responsibilities are documented. No new editor features — this is pure structural improvement.

## Implementation Decisions

### Module Decomposition
- **D-01:** Split editor.ts into 5 sub-modules using `editor-*` prefix naming:
  - `editor-state.ts` — `world` cache, `trail` array, `EditorContext` closure, save timer
  - `editor-dom.ts` — DOM construction (`el()` helper, create editor chrome), `injectStyles()`, `DEFAULT_CSS` template
  - `editor-render.ts` — render pipeline coordination (extract → tokenize → render → caret), breadcrumb rendering, URL sync
  - `editor-navigation.ts` — `navigateToPage()`, `loadPage()`, storage reads/writes during page transitions
  - `editor-lifecycle.ts` — input/paste/keydown event handlers, `insertTextAtSelection()`, `mount()` assembly, `destroy()`, public `EditorInstance` API
- **D-02:** `src/editor.ts` retains `createEditor()`, `EditorBuilder` class, and imports/assembles sub-modules. It is the public API entry point and thin orchestrator.
- **D-03:** State (world, trail) stays in mutable closures within the editor core, passed as readonly context (`EditorContext`) to sub-modules. No event emitter, no global state object.
- **D-04:** No circular imports between sub-modules. Dependency direction: state → (dom, render, navigation, lifecycle). Render depends on tokenizer/renderer/cursor (existing). Navigation depends on state + storage. Lifecycle depends on all others as the assembler.

### Demo Extraction
- **D-05:** `src/demo.ts` moved to a standalone entry point excluded from the Vite library build. Vite library mode `build.lib.entry` already points to `src/index.ts` — verify no demo symbols leak into `dist/`.
- **D-06:** `demo.ts` stays in the repo as a dev-only file for `npm run dev` (`index.html` loads it). Not included in `package.json` `"files"`.

### Cursor Test Coverage
- **D-07:** Cursor module (`src/cursor.ts`) gets comprehensive test coverage for caret edge cases: line boundaries, empty documents, forced offsets, multi-byte characters. This is the safety net before renderer changes in Phase 3.

### Architecture Documentation
- **D-08:** `docs/architecture.md` updated with module responsibilities, public API surfaces, connection points, and dependency diagram. Function-level detail, not inline JSDoc references.

### OpenCode's Discretion
- Exact function-level assignment within each of the 5 modules
- Internal helper naming within each module
- Import/export structure and barrel file decisions
- Specific cursor edge case test scenarios beyond what's listed in D-07
- Whether `demo.ts` moves to a top-level `demo/` directory or stays in `src/` with a vite config exclusion

## Specific Ideas

No specific requirements — open to standard approaches.

## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — ARCH-01 through ARCH-05 with full descriptions
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependency on Phase 1

### Project Context
- `.planning/PROJECT.md` — Core value, constraints (zero runtime deps, TypeScript strict, ES2020)

### Phase 1 Artifacts
- `.planning/phases/01-production-infrastructure/01-CONTEXT.md` — Prior test infrastructure decisions (co-located tests, v8 coverage, ESLint+Prettier)

### Codebase
- `.planning/codebase/ARCHITECTURE.md` — Current architecture, plugin pipeline, data flow
- `.planning/codebase/STRUCTURE.md` — Source module map, naming conventions
- `.planning/codebase/CONCERNS.md` — Editor monolith, full DOM rebuild, demo.ts leak

## Existing Code Insights

### Reusable Assets
- **Existing pipeline modules** (`src/tokenizer.ts`, `src/renderer.ts`, `src/cursor.ts`, `src/navigation.ts`): Already extracted as standalone modules. The refactor extracts the editor-level coordination around them.
- **Existing test infrastructure** (103 tests, 7 suites, 83% branch coverage): Phase 1 safety net for refactoring. Tests for cursor, tokenizer, renderer, navigation already passing.

### Established Patterns
- **Closure-based state**: Current `mountEditor()` uses closures (`world`, `trail`) with `EditorContext` as readonly pass-through. Same pattern should be preserved.
- **Zero circular imports**: Current codebase has no circular dependencies. New modules must maintain this.
- **Fluent builder**: `EditorBuilder` class with chainable methods. Should remain the public API entry point.

### Integration Points
- **EditorBuilder** (`src/editor.ts`): Must continue to work identically — `createEditor(el).use(p).withStorage(s).mount()` → `EditorInstance`
- **Plugin system** (`src/types.ts` Plugin interface): Phase 3 depends on clean module boundaries in the render pipeline for the new declarative manifest system.
- **Public API** (`src/index.ts`): Must continue exporting `createEditor`, `EditorBuilder`, all existing types.
- **Build output** (`dist/`): Must produce identical ESM + UMD bundles with zero demo code.

## Deferred Ideas

None — discussion stayed within phase scope.

---
*Phase: 02-architecture-refactoring*
*Context gathered: 2026-05-23*
