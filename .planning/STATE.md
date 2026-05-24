# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Developers and users can extend the editor with custom blocks, UI panels, and storage backends without touching core code — the plugin surface is the product.
**Current focus:** Phase 2 — Architecture Refactoring

## Current Position

Phase: 3 of 5 (Plugin System & Content Extensions) — IN PROGRESS
Plan: 01 of 04 (PluginManifest Types + PluginRegistry) — COMPLETED
Status: In Progress (1 of 4 plans complete)
Last activity: 2026-05-24 — Plan 03-01 completed: defined PluginManifest discriminated union types (ContentPlugin, UIPlugin, StoragePlugin), built PluginRegistry class with Map-based O(1) conflict detection, semver validation, and lifecycle hooks — 36 unit tests passing, 209 total tests, zero existing-code changes

Progress: [█████░░░░░░░░░░░░░░░░░] 25% (1 of 4 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 5m 41s
- Total execution time: 1h 17m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Production Infra & Test | 6 | 41m 26s | 6m 55s |
| 2. Architecture Refactoring | 6 | 35m 16s | 5m 53s |
| 3. Plugin System & Content Extensions | 1 | ~7m | ~7m |

**Recent Trend:**
- 01-01: 5m 55s — Toolchain installation, Vite upgrade, config creation
- 01-02: 2m 46s — Cursor test migration to Vitest + happy-dom
- 01-03: 3m 42s — Renderer & Navigation test migration, test/ directory cleanup
- 01-04: 12m 22s — Tokenizer unit tests: 20 cases covering line-level, inline, edge cases, and document-level
- 01-05: 4m 41s — Plugin, storage, and editor tests: 35 cases reaching INFRA-02 coverage for 9 source modules
- 01-06: 12m 00s — Coverage thresholds (80% branches), AGENTS.md documentation, 36 new test cases, 103 total passing
- 02-01: 4m 34s — Extracted editor-state.ts from editor.ts: createEditorState factory, EditorStateAPI interface, 14 unit tests, DAG root with zero editor-* imports
- 02-02: 3m 53s — Extracted editor-dom.ts from editor.ts: createEditorDOM factory, EditorDOM interface, private el() helper, DEFAULT_CSS + injectStyles, zero imports
- 02-04: 5m 4s — Added 15 cursor edge case tests: empty docs, multi-byte Unicode, line boundaries, data-raw boundaries, forced offsets — 28 total passing tests
- 02-03: 9m 46s — Extracted editor-render.ts: createEditorRender factory, EditorRenderAPI interface, 15 tests, render pipeline + breadcrumb + URL sync, type-only imports for editor-* modules
- 02-05: 9m 14s — Extracted editor-navigation.ts (12 tests) + editor-lifecycle.ts (14 tests), rewrote editor.ts as thin orchestrator delegating to 5 sub-modules — all 173 tests pass, public API unchanged
- 02-06: 2m 45s — Moved demo.ts to demo/ directory (excluded from build, no demo.d.ts leak), updated docs/architecture.md with 5-module DAG, construction order, circular dependency prevention, and API surfaces — Phase 2 complete
- 03-01: ~7m — Defined PluginManifest discriminated union types (ContentPlugin, UIPlugin, StoragePlugin), built PluginRegistry class with Map-based O(1) conflict detection, semver validation, lifecycle hooks — 36 new unit tests, 209 total tests passing, zero existing-code changes

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [01-01]: Vitest 4 requires Vite ≥6 — upgraded vite@5.2 → vite@7.3.3 to satisfy peer dependency
- [01-01]: v8 coverage engine chosen over istanbul per D-03; branch coverage is primary metric
- [01-01]: Coverage thresholds start at 0% (not 80%) to avoid blocking CI before tests exist
- [01-01]: passWithNoTests: true added to vitest config so CI passes before test files are created
- [01-01]: no-console set to warn (not error) to allow console.warn/console.error while flagging console.log
- [01-02]: Happy-dom DOM builders (document.createElement/createTextNode) confirmed working with getTextOffset tree-walking — no Selection API needed for cursor text extraction
- [01-02]: Runtime-computed string lengths (.length) used for caret offset assertions to preserve original test's intent
- [01-03]: Renderer test uses happy-dom real DOM (document.createElement/createTextNode) — FakeElement/FakeText stubs fully replaced
- [01-03]: Navigation test uses default Node environment (no @vitest-environment directive needed) — pure logic, zero DOM dependency
- [01-03]: Old test/ directory fully removed — all 3 migrated suites co-located in src/__tests__/ following Vitest convention
- [01-04]: Tokenizer tests use inline TokenDef definitions matching built-in plugin patterns rather than importing plugin modules — keeps tests decoupled from plugin implementation details
- [01-04]: scanInline tested indirectly through tokenizeLine with inline-only defs since the function is not exported
- [01-04]: Tokenizer needs no DOM — tests run in default happy-dom environment without @vitest-environment override (no document.* or DOM API calls)
- [01-05]: Used fake-indexeddb polyfill for IndexedDB testing — happy-dom does not provide the indexedDB global
- [01-05]: Added renderPlugin() helper to safely cast Plugin.render() return from HTMLElement | Text to HTMLElement for test assertions
- [01-06]: Coverage thresholds set to 80% for all metrics (branches 83.02%, statements 92.57%, functions 90.82%, lines 94.55%) — exceeding all requirements
- [01-06]: src/plugins/defaults.ts excluded from coverage (20-line constant array with no executable logic)
- [01-06]: 36 new test cases added for nullish coalescing (??) branches, editor keyboard/paste handlers, renderer fallbacks, and navigation edge cases — total now 103 tests
- [01-06]: AGENTS.md updated with comprehensive Development Commands table, CI Pipeline description, Test Infrastructure docs, and CI Setup Note
- [Init]: Theming (Phase 4) is parallel-ready with Plugin System (Phase 3) but sequenced after — plugin manifest is the higher-priority lynchpin.
- [Init]: FORMAT requirements (strikethrough, URL links) grouped with Plugin System (Phase 3) so they use the new PluginManifest format from day one rather than requiring a separate migration step.
- [Init]: Cursor module testing (ARCH-03) placed in Phase 2 alongside the refactoring, since comprehensive cursor tests are a prerequisite to touching the renderer internals.
- [02-01]: Editor mutable state extracted as createEditorState() factory — zero editor-* imports (DAG root), all getters return defensive copies. Unused `saveDebounce` variable removed (belongs in lifecycle module's input handler).
- [02-02]: DOM construction extracted as createEditorDOM() pure factory — zero imports, zero state dependency, el() kept private. Prettier singleQuote config (Phase 1) overrides pre-refactor CONVENTIONS.md double-quote analysis.
- [02-04]: 15 new cursor edge case tests added across 6 new describe blocks — all passing against existing cursor.ts with zero production code changes. 13 existing tests discovered (plan assumed 12). Pre-existing editor-render test failure from uncommitted Plan 02-03 logged to deferred-items.
- [02-03]: navigateFn passed through EditorRenderOptions (not hardcoded) so orchestrator wires it after navigation module creation. toContext() called inside each render() for fresh trail/world snapshot. Type-only imports for editor-state and editor-dom enforce zero runtime cycles.
- [02-05]: Two-phase construction pattern (setRenderAPI) avoids circular dependency between navigation and render. insertTextAtSelection dispatches 'input' on same editorDiv used for addEventListener — preserving direct feedback loop. DAG-ordered construction in mountEditor (state → dom → navigation → render → lifecycle → mount). DEFAULT_HOME kept in editor.ts per plan spec despite now being unused (nav has its own copy). EditorBuilder line-count constraint (max_lines: 100) not achievable due to 56-line class body required to remain unchanged; achieved 121 lines (76% reduction).
- [02-06]: demo.ts moved to top-level demo/ directory (outside src/) to leverage existing tsconfig include: ["src"] exclusion — simpler than Vite config exclusion. Vite dev server resolves relative imports (../src/index → /src/index.ts) automatically. Architecture docs structured with DAG diagram showing strict 6-tier dependency flow from state root to orchestrator, with import type and setRenderAPI() documented as circular dependency prevention strategies.
- [03-01]: PluginRegistry uses 5 internal Maps (contentPlugins, uiPlugins, storagePlugins, tokenTypeOwners, slotAssignments) for O(1) conflict detection. onInit rollback: if a plugin's onInit throws, the plugin is fully removed from all Maps (atomic registration). clear() does NOT call onDestroy — caller manages lifecycle teardown separately. Content plugin self-overlap (same name, same token types) is allowed — only cross-plugin conflicts throw. Legacy Plugin interface retained with @deprecated notice for migration compatibility.

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-24
Stopped at: Completed 03-01-PLAN.md — PluginManifest types + PluginRegistry class complete. Phase 3 in progress (1/4 plans).
Resume file: .planning/phases/03-plugin-system/03-02-PLAN.md
Next: Plan 03-02 — Migrate Existing 7 Plugins to ContentPlugin
