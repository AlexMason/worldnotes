# Phase 1: Production Infrastructure & Test Foundation - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

## Phase Boundary

Set up the testing, linting, and CI/CD tooling that validates every push and gives all existing modules baseline test coverage. This is the safety net that enables safe refactoring in Phase 2. New features and editor behavior changes belong in later phases.

## Implementation Decisions

### Existing Test Migration
- **D-01:** Convert the 3 existing raw-assert `.mjs` tests (`cursor.test.mjs`, `renderer.test.mjs`, `navigation.test.mjs`) to Vitest `.test.ts` suites, preserving their current assertions.
- **D-02:** Co-locate test files alongside source modules in `src/__tests__/` (Vitest convention).
- **D-03:** Use v8 coverage engine with branch coverage as the primary metric (lines secondary).
- **D-04:** Test cursor module first (it's the safety net for Phase 2 refactoring), then tokenizer/renderer. Ordering after that is at OpenCode's discretion.

### ESLint Configuration
- **D-05:** Base preset: `typescript-eslint` recommended + stylistic rules, flat config format (`eslint.config.mjs`).
- **D-06:** Pair with Prettier for formatting (not ESLint stylistic alone). Use `eslint-config-prettier` to avoid rule conflicts.
- **D-07:** Lint errors fail CI. Warnings are allowed through (informational).

### OpenCode's Discretion
- Exact test file ordering after cursor/tokenizer/renderer modules
- Specific ESLint rule customizations beyond the recommended + stylistic presets
- Coverage threshold enforcement details within the 80% requirement
- CI trigger policy (push vs PR gating, branch protection)
- Vitest configuration details (timeouts, parallelization, file matching)
- happy-dom configuration and any additional browser API mocks needed

## Specific Ideas

No specific requirements — open to standard approaches.

## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — INFRA-01 through INFRA-06 with full descriptions
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependency graph

### Project Context
- `.planning/PROJECT.md` — Core value, constraints (zero runtime deps, TypeScript strict, ES2020, browser-only)
- `.planning/research/STACK.md` — Tooling recommendations: Vitest 4, ESLint 10 flat config, Prettier, GitHub Actions
- `.planning/research/PITFALLS.md` — Testing infrastructure is the critical path dependency; must come before any refactoring

### Codebase
- `.planning/codebase/STACK.md` — Current stack: TypeScript 5.9, Vite 5.4, no test framework
- `.planning/codebase/TESTING.md` — Current test structure: 3 .mjs files with raw assert + manual transpilation
- `.planning/codebase/CONCERNS.md` — Missing ESLint config (installed but not configured), zero test coverage on 9 modules

## Existing Code Insights

### Reusable Assets
- **3 existing test files** (`test/cursor.test.mjs`, `test/renderer.test.mjs`, `test/navigation.test.mjs`): Contain edge-case coverage and DOM simulation patterns that should be preserved during conversion.
- **TypeScript transpilation pattern** in existing tests: `ts.transpileModule()` for on-the-fly compilation. Vitest replaces this entirely.

### Established Patterns
- **Zero runtime dependencies**: Test tooling must be devDependencies only. Vitest, happy-dom, ESLint, Prettier are all dev-only.
- **ESM by default** (`"type": "module"` in package.json): Vitest config and test files must use ESM syntax.
- **TypeScript strict mode**: Tests must be typed; no `any` escapes.

### Integration Points
- **package.json scripts**: Current `"test"` script runs 3 individual `node test/*.mjs` commands. Must be replaced with a single `vitest run` command. Add `"test:watch"`, `"lint"`, `"lint:fix"`, `"format"` scripts.
- **CI workflow**: New `.github/workflows/ci.yml` file. Must run on push to main and PR events. Steps: checkout → setup-node → install → typecheck → lint → test → build.
- **Editor config**: Prettier needs a `.prettierrc` or equivalent config. ESLint needs `eslint.config.mjs` flat config.

## Deferred Ideas

None — discussion stayed within phase scope.

---
*Phase: 01-production-infrastructure*
*Context gathered: 2026-05-23*
