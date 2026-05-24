# WorldNotes

## What This Is

A production-grade TypeScript browser library for an extensible inline Markdown editor with
wiki-style page navigation. It ships as a standalone npm package AND serves as the editor
foundation for a future hosted collaborative product. The core is closed and curated; the
ecosystem is open through a vetted plugin system — Obsidian's model applied to the web.

## Core Value

**Developers and users can extend the editor with custom blocks, UI panels, and storage
backends without touching core code** — the plugin surface is the product.

## Requirements

### Validated

*Shipped and confirmed valuable in the existing codebase.*

- ✓ Wiki-style [[page]] syntax with click-to-navigate — existing
- ✓ Inline formatting pipeline (bold, italic, code, headings, blockquote, hr) — existing
- ✓ Plugin token pattern matching with render dispatch — existing
- ✓ Storage adapter abstraction (localStorage, IndexedDB) — existing
- ✓ URL-synced breadcrumb trail via query params — existing
- ✓ Fluent builder API (createEditor → .use() → .mount()) — existing
- ✓ Zero runtime dependencies, self-contained ESM/UMD bundle — existing
- ✓ LLM-friendly public API surface — existing

### Active

*Current scope. Building toward these.*

- [ ] Robust test suite with a real test framework and reasonable coverage
- [ ] CI/CD pipeline (typecheck, lint, test, build on every push)
- [ ] Editor architecture refactored from monolithic class into cohesive modules
- [ ] Declarative plugin manifest system (capabilities declared, not imperative hook hunting)
- [ ] Plugin type categories: custom blocks/renderers, UI overlays/panels, storage backends
- [ ] Design token system (CSS custom properties) for theming
- [ ] Full theme replacement escape hatch
- [ ] ESLint configuration and linting enforced in CI
- [ ] Demo module extracted from src/ into a separate entry point (no leaks into build)

### Out of Scope

- Plugin registry/marketplace infrastructure — deferred until plugin system is stable
- Plugin review process and tooling — deferred until plugin registry
- Collaborative/real-time editing — deferred to product phase
- Hosted web application — deferred to product phase
- Mobile app — not planned
- Server-side rendering — library is browser-only by design
- Framework wrappers (React, Vue, Svelte) — deferred; vanilla-first

## Context

**Existing codebase:** worldnotes is a working v0.1.0 library (~1,500 LOC TypeScript) with a
plugin-based tokenizer/renderer pipeline, wiki link navigation, and storage abstraction. It
uses vanilla TypeScript with DOM APIs, zero runtime dependencies, and a Vite build toolchain.

**Current state:** The editor module (`src/editor.ts`) is a 489-line monolith handling DOM
construction, input events, navigation, persistence, and lifecycle in one file. No ESLint
config exists despite the package being installed. Tests use raw `node:assert` with manual
`ts.transpileModule()` — no framework, no coverage tooling. No CI/CD pipeline. The demo
(`src/demo.ts`) lives in the source tree and leaks into the build output. Nine source modules
have zero test coverage.

**What needs to happen:** Refactor the editor into cohesive modules, establish a proper
test infrastructure, wire up CI/CD, and redesign the plugin system to support the three
plugin categories (blocks, UI panels, storage). Build the design token system and theme
escape hatch. Extract the demo from src/. Configure ESLint.

**Pace:** Taking time to do it right. Quality over speed. Each phase should produce a
shippable increment.

## Constraints

- **Browser only:** No Node.js server, no SSR. Everything runs in the browser.
- **Zero runtime deps:** The library must remain self-contained with no runtime dependencies.
- **TypeScript strict:** Strict mode enabled. No `any` without explicit justification.
- **ES2020 target:** Must support ES2020 browsers. No polyfills required.
- **Plugin naming:** Plugins must use the `worldnotes-plugin-` npm prefix (convention, not enforced technically) for discoverability.
- **Core closed:** What ships in the library core is curated. Extensions happen through plugins.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Closed core, vetted plugins | Obsidian model — stable core API, community builds on top | — Pending |
| Declarative plugin manifests | Lower barrier to entry than imperative classes; easier to audit/validate | — Pending |
| Design tokens + full theme replacement | Covers 80% use case via variables, 20% via complete CSS swap | — Pending |
| Ship standalone library + build product on top | Library must be clean enough for external consumers; product is a separate layer | — Pending |
| Vanilla TypeScript (no framework) | Maximizes portability; no React/Vue/Svelte dependency for consumers | ✓ Good — existing |
| contentEditable with custom render pipeline | Inline formatting without a separate preview pane; tradeoff: caret complexity | ✓ Good — existing, but needs attention |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-23 after initialization*
