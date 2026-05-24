# Roadmap: WorldNotes

## Overview

WorldNotes transforms from a working v0.1.0 prototype (~1,500 LOC with a monolithic editor, hand-rolled tests, and no CI) into a production-grade extensible editor library. The journey proceeds through five phases driven by a strict dependency chain: test infrastructure enables safe refactoring, clean module boundaries enable the plugin system, the plugin manifest enables UI extensibility, and theming layers on independently. Each phase produces a shippable increment — infrastructure, clean architecture, plugin surface, visual customization, and toolbar extensibility.

## Dependency Graph

```
Phase 1 (Infrastructure)
    │
    ▼
Phase 2 (Architecture Refactoring)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (Plugin +     Phase 4 (Theming)
  Content Extensions)    │
    │
    ▼
Phase 5 (UI Slots)
```

Phase 4 is parallel-ready (depends only on Phase 2) but sequenced after Phase 3 since the plugin system is the higher-priority lynchpin.

## Phases

- [x] **Phase 1: Production Infrastructure & Test Foundation** - Vitest, ESLint, CI/CD, and baseline test coverage for all existing modules
- [x] **Phase 2: Architecture Refactoring** - Decompose editor monolith into focused, independently testable modules
- [ ] **Phase 3: Plugin System & Content Extensions** - Declarative plugin manifests, lifecycle hooks, strikethrough, and URL links
- [ ] **Phase 4: Theming System** - CSS custom property design tokens with full theme replacement escape hatch
- [ ] **Phase 5: UI Extension Slots** - Toolbar slot for UI plugin mounting with conflict detection

## Phase Details

### Phase 1: Production Infrastructure & Test Foundation
**Goal**: Every push to the repository is automatically validated, and all existing modules have baseline test coverage in a real test framework.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. Developer runs `npm test` and sees Vitest execute all test suites in a happy-dom browser environment
  2. Developer runs `npm run lint` and ESLint validates all TypeScript source files with zero errors
  3. Every push triggers a GitHub Actions workflow (typecheck → lint → test → build) with visible status on commits and PRs
  4. Test coverage report shows 80%+ branch coverage and fails CI if below threshold
  5. AGENTS.md and package.json scripts document the test, lint, and typecheck commands for all contributors
**Plans**: 6 plans in 4 waves

Plans:
- [x] 01-01-PLAN.md — Dependencies, Config & CI (install tooling, create vitest/eslint/prettier/CI config)
- [x] 01-02-PLAN.md — Cursor Test Migration (convert cursor.test.mjs → Vitest .test.ts)
- [x] 01-03-PLAN.md — Renderer & Navigation Test Migration (convert remaining .mjs tests + remove test/)
- [x] 01-04-PLAN.md — Tokenizer Tests (15-20 test cases, pure logic, no DOM)
- [x] 01-05-PLAN.md — Plugin, Storage & Editor Tests (headings, inline, wikiLink, localStorage, IndexedDB, editor lifecycle)
- [x] 01-06-PLAN.md — Coverage Thresholds & Documentation (80% thresholds, AGENTS.md update)

### Phase 2: Architecture Refactoring
**Goal**: The editor codebase is composed of focused, independently testable modules with clear responsibilities and no circular dependencies.
**Depends on**: Phase 1
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05
**Success Criteria** (what must be TRUE):
  1. Developer opens `src/editor.ts` and finds a thin orchestrator delegating to specialized modules, not a 489-line monolith
  2. Pipeline modules (tokenizer, renderer, cursor) are independently importable and testable with no circular imports
  3. Running `npm run build` produces a library bundle free of demo code — no `demo.ts` symbols in `dist/` output
  4. `docs/architecture.md` describes each module's responsibility, public API surface, and connection points to other modules
  5. Cursor module has comprehensive test coverage for caret edge cases: line boundaries, empty documents, forced offsets, and multi-byte characters
**Plans**: 6 plans in 4 waves

Plans:
- [x] 02-01-PLAN.md — Extract editor-state.ts (world cache, trail, save timer, context)
- [x] 02-02-PLAN.md — Extract editor-dom.ts (DOM construction, injectStyles, DEFAULT_CSS)
- [x] 02-03-PLAN.md — Extract editor-render.ts (render pipeline, breadcrumb, URL sync)
- [x] 02-04-PLAN.md — Cursor Edge Case Tests (15 new tests: empty docs, multi-byte, line boundaries, data-raw)
- [x] 02-05-PLAN.md — Extract editor-navigation.ts + editor-lifecycle.ts + Wire editor.ts (thin orchestrator)
- [x] 02-06-PLAN.md — demo.ts Extraction + docs/architecture.md Update

### Phase 3: Plugin System & Content Extensions
**Goal**: Plugin authors can register plugins via declarative manifests with lifecycle hooks and category-based dispatch, and `~~strikethrough~~` and `[text](url)` render correctly in the editor.
**Depends on**: Phase 2
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06, FORMAT-01, FORMAT-02, FORMAT-03
**Success Criteria** (what must be TRUE):
  1. Plugin author creates a `PluginManifest` with `kind`, `version`, and category-specific capabilities, and registers it via `editor.use(manifest)` without errors
  2. Two plugins claiming the same inline token pattern (e.g., both matching `**text**`) produce an immediate, descriptive error at registration time — not silently at runtime
  3. Typing `~~strikethrough~~` in the editor renders crossed-out text following the existing TokenDef → render pipeline pattern
  4. Typing `[text](url)` renders a clickable link — external URLs open in a new tab, internal `[[Page]]` links navigate within the editor
  5. Plugin author imports `PluginManifest`, `ContentPlugin`, `UIPlugin`, and `StoragePlugin` types from the library's public API, all documented in `docs/api.md`
**Plans**: TBD

### Phase 4: Theming System
**Goal**: Consumers can customize the editor's appearance by overriding CSS custom properties or replacing the entire stylesheet, and the editor DOM uses only prefixed, token-driven classes.
**Depends on**: Phase 2
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05
**Success Criteria** (what must be TRUE):
  1. Consumer opens browser DevTools and sees `--wn-color-primary`, `--wn-font-size-body`, and other `--wn-*` custom properties on the editor root element
  2. Consumer sets `--wn-color-primary: red` on a parent element and sees the editor's primary color change with no other CSS modifications
  3. Consumer passes a complete CSS string to `EditorOptions.theme` and sees the editor render with entirely custom styling, replacing the default stylesheet
  4. Inspecting the editor DOM shows zero inline `style` attributes — all styling comes from `wn-*` prefixed CSS classes driven by design tokens
  5. Consumer reads `docs/theming.md` and finds a reference table of every design token with its default value, CSS property mapping, and visual impact
**Plans**: TBD
**UI hint**: yes

### Phase 5: UI Extension Slots
**Goal**: Plugin authors can populate the editor toolbar with custom UI, and conflicting slot registrations are caught at registration time.
**Depends on**: Phase 3
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Plugin author declares `slots: ['wn-toolbar']` in a `PluginManifest` with `kind: 'ui'` and the plugin's `onMount` hook receives the toolbar container DOM element
  2. Developer inspects the editor DOM and finds a `<div class="wn-toolbar">` element in the editor chrome where UI plugins render
  3. Two UI plugins both claiming the `wn-toolbar` slot with the same priority value produce an immediate, descriptive registration error
  4. Plugin author calls `editor.removePlugin(id)` and the UI plugin's mounted DOM content is cleanly removed from the toolbar slot
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Production Infrastructure & Test Foundation | 6/6 | Complete | 2026-05-24 — All 6 plans completed |
| 2. Architecture Refactoring | 6/6 | Complete | 2026-05-24 — All 6 plans completed |
| 3. Plugin System & Content Extensions | 0/TBD | Not started | - |
| 4. Theming System | 0/TBD | Not started | - |
| 5. UI Extension Slots | 0/TBD | Not started | - |
