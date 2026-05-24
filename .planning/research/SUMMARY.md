# Project Research Summary

**Project:** worldnotes — inline WYSIWYG Markdown editor library
**Domain:** Browser-based Markdown editor library with plugin extensibility
**Researched:** 2026-05-23
**Confidence:** HIGH

## Executive Summary

worldnotes is a zero-dependency browser library for an extensible inline Markdown editor with wiki-style page navigation. Most editor libraries in this space (TipTap, ProseMirror, Milkdown) carry 10+ runtime dependencies and require schema-based parsing. worldnotes differentiates with a lightweight regex-based tokenizer/renderer pipeline, zero runtime dependencies, and a declarative plugin manifest system where plugins declare capabilities (blocks, UI panels, storage backends) through a static manifest rather than extending base classes. The plugin surface *is* the product.

The recommended approach is a phased build-out that starts with **production infrastructure** (Vitest, ESLint, CI) to establish a regression safety net, then **refactors the monolithic 489-line editor** into modular components, then **builds the declarative plugin manifest system** (the lynchpin on which all extensibility depends), and finally layers on **table-stakes editor features** and **advanced differentiators**. This order is non-negotiable: you cannot safely refactor without tests, you cannot build the plugin system on a monolith, and you cannot ship differentiators without the plugin system. The research across all four domains — Stack, Features, Architecture, and Pitfalls — converges on this dependency-driven sequence.

The three key risks identified are: (1) the full DOM rebuild on every keystroke will become a performance bottleneck beyond ~300 lines, mitigated by extracting the rendering module and implementing line-level dirty tracking; (2) browser-specific `contentEditable` behavior will produce divergent text across Chrome/Firefox/Safari, mitigated by adopting `beforeinput` interception in the input handler; and (3) breaking plugin API contracts will fragment the ecosystem, mitigated by manifest versioning, semver discipline, and a documented deprecation window. All three risks are addressed in the architecture refactoring phase (Phase 2).

## Key Findings

### Recommended Stack

The stack is intentionally minimal. TypeScript ~5.9.3 is pinned to avoid TS 6.0 breakage. Vite 7.3 is chosen over Vite 8 (which uses unproven rolldown for library output). Testing moves from the current hand-rolled `ts.transpileModule()` + `node:assert` setup to **Vitest 4** with **happy-dom** for DOM testing and **@vitest/coverage-v8** for coverage. Linting gets **ESLint 10** with flat config + **typescript-eslint 8** for type-aware rules, formatted by **Prettier 3**. CI is **GitHub Actions** with a single workflow: typecheck → lint → test → build. Theming uses **CSS Custom Properties** (zero dependencies) with a documented `--wn-*` token namespace, plus a full theme replacement escape hatch. Zero runtime dependencies remains the iron rule — every tool added above is dev-only.

**Core technologies:**
- **TypeScript ~5.9.3**: Pinned language. Avoids TS 6.0 breaking changes in a library consumed by diverse projects.
- **Vite ^7.3.0**: Battle-tested library mode (ESM + UMD). Vite 8 skipped — rolldown library output not yet proven.
- **Vitest ^4.1.0 + happy-dom ^20.9.0**: Modern test framework with native TS/ESM support. happy-dom is faster and more spec-compliant than jsdom for contentEditable testing.
- **ESLint 10 + typescript-eslint 8 + Prettier 3**: Standard TypeScript library stack. Flat config only. 100+ type-aware lint rules.
- **CSS Custom Properties** (native): Zero-dependency theming. 80% use case covered via `--wn-*` variables, 20% via full CSS replacement.

### Expected Features

The feature landscape divides cleanly into table stakes (what users assume exists), differentiators (what sets worldnotes apart), and anti-features (things that should never enter core). The **declarative plugin manifest system** is the central differentiator — everything else that makes worldnotes unique (UI overlays, custom blocks, storage-as-plugins) depends on it. The feature dependency graph reveals that the manifest system blocks UI overlays, custom blocks, and storage-as-plugins; lists block custom block types; UI overlays enable the suggestion engine; and design tokens precede full theme replacement.

**Must have (table stakes):**
- **Bold/Italic/Inline Code/Headings/Blockquotes/HR** — already exist (✅)
- **Wiki [[page]] links + breadcrumb trail** — already exists (✅), unique among editor libraries
- **Storage adapters (localStorage, IndexedDB)** — already exist (✅)
- **URL links** `[text](url)` — users expect this; missing (❌)
- **Strikethrough** `~~...~~` — universal formatting; ~10 lines to add (❌)
- **Undo/Redo** — every editor has this; conflicts with full DOM rebuild (❌)
- **Keyboard shortcuts** (Cmd+B/I/K) — users reach for these instinctively (⚠️ partial)
- **Placeholder text** — empty editor must show guidance (❌)
- **StorageAdapter.delete()** — table-stakes CRUD gap (❌)
- **Accessibility basics** (ARIA roles, focus ring) — must be accessible (⚠️ partial)
- **Error resilience** — editor must not crash on malformed input (⚠️ partial)

**Should have (competitive/differentiators):**
- **Declarative plugin manifest system** — THE lynchpin. Three categories: blocks, UI, storage
- **Design token system** (CSS custom properties) — Obsidian-level theming on the web
- **UI overlay / panel slot system** — plugins inject UI into editor chrome
- **Full theme replacement escape hatch** — 20% case where tokens aren't enough
- **Autocomplete / suggestion engine** — `[[`, `/`, `@` triggers
- **Custom block type registration** — callouts, code blocks, todo checkboxes
- **Storage adapters as plugin type** — SQLite, REST API, filesystem backends
- **Content serialization (plugin-aware)** — export/import structured data
- **Programmatic API** — page CRUD, navigation control

**Defer (v2+/anti-features):**
- **Bulleted / numbered lists** — HIGH complexity (multi-line tokenizer changes needed). May need v1.1 deferral.
- **Built-in rich text toolbar** — UI opinion, not library concern. Plugin territory.
- **Real-time collaboration (CRDT/Yjs)** — deferred to product phase per PROJECT.md
- **Framework wrappers (React/Vue/Svelte)** — community-first, deferred per PROJECT.md
- **Plugin registry / marketplace** — premature; no plugins to list yet
- **WYSIWYG mode toggle** — goes against inline WYSIWYG design
- **Image / media embedding** — plugin territory; opens storage Pandora's box
- **AI features** — product-level, rapidly changing, deferred

### Architecture Approach

The recommended architecture is a **layered system with a Plugin Manager at the center**. The Editor Core is a thin orchestrator that delegates to specialized modules: Pipeline (text extraction, tokenization, rendering, caret management), Plugin Manager (registration, validation, category dispatch, lifecycle), Theme Manager (CSS custom property injection, theme switching), Navigation (trail management, URL sync), and Persistence (debounced read-through cache). This replaces the current 489-line monolithic `editor.ts` with ~12 focused modules, each independently testable.

**Major components:**
1. **Editor Core** — Lifecycle orchestration (mount, destroy), root DOM construction, global state. Thin delegator, not a god object.
2. **Plugin Manager** — Central registry for all three plugin categories. Handles registration, manifest validation, conflict detection, lifecycle dispatch (init/activate/deactivate). Replaces-by-name for same-key plugins.
3. **Plugin Manifest System** — Declarative manifests where plugins declare `category: 'content' | 'ui' | 'storage'`, capabilities, priority, and tokens. Category-specific interfaces enforce correct dispatch.
4. **Theme Manager** — Injects CSS custom properties into `<style id="worldnotes-theme">`. Supports token override (80% use case) and full CSS string replacement (20% escape hatch). Headless-first: renderer emits structural classes, theme provides visual styling.
5. **Pipeline** — Extracted text extractor, tokenizer, renderer, and caret manager. Pure functions receiving TokenDefs and PluginMap as parameters — no circular dependency on Plugin Manager.
6. **Navigation Manager** — Trail array management, page loading, wiki link resolution, URL sync via `?path=`. Pure navigation functions with no back-reference to Editor.
7. **Persistence Manager** — In-memory read-through cache with debounced async writes. `beforeunload` flush. Adapter-agnostic (StorageAdapter interface).

**Key patterns to follow:**
- **Pattern 1: Plugin Manager as Central Dispatcher** — single manager owns registration and dispatches to the appropriate pipeline by category
- **Pattern 2: Declarative Plugin Manifests** — plugins declare capabilities in a static object, not imperative hook hunting
- **Pattern 3: Headless-First Styling** — renderer emits semantic classes; theme provides visual styling via CSS custom properties
- **Pattern 4: Ordered Token Resolution** — line-level patterns first, inline patterns left-to-right, earliest match wins (existing pattern, preserved)
- **Pattern 5: Debounced Read-Through Cache** — immediate in-memory update, debounced async persistence (existing pattern, formalized)

### Critical Pitfalls

The research identified 8 critical pitfalls, all drawn from real-world histories of ProseMirror, Slate, TipTap, and the current worldnotes codebase analysis. The top 5 with prevention strategies:

1. **Full DOM Rebuild on Every Keystroke** — The current `innerHTML = ''` approach degrades at ~300 lines. Prevention: Extract rendering module with per-line dirty tracking. Cache `buildPluginMap()`. Target <8ms render for 100-line documents.

2. **Browser-Specific contentEditable DOM** — Chrome/Firefox/Safari produce different DOM for the same keystroke (Enter, Backspace, IME). Prevention: Adopt `beforeinput` interception with `preventDefault()`. Handle Enter/Backspace/Delete paths explicitly. Cross-browser test suite.

3. **Breaking Plugin API Contracts** — Changing the Plugin interface silently breaks all third-party plugins (Slate's history: 0.47→0.50 rewrite broke everything). Prevention: Version the plugin manifest (`manifestVersion`), strict semver for plugin API types, deprecation window with side-by-side old/new interfaces for one minor version.

4. **Selection/Caret Loss During Re-render** — The #1 bug in every contentEditable editor. Prevention: Move from bare-number offset to structured position type (`{ line, offset }`). Establish 50+ cursor test cases BEFORE touching renderer internals. Treat cursor module as a regression safety net.

5. **Plugin Ordering Implicit and Fragile** — Tokenizer matches first pattern that applies, but ordering is undocumented. `**text**` could be partially matched by `*text*` first. Prevention: Explicit `category` and `priority` fields in plugin manifest. Two-pass tokenizer (blocks first, then inline). Conflict detection at registration time.

Additional pitfalls include: CSS specificity wars with consumer stylesheets (prevented by design tokens + scoped classes), no automated regression tests (prevented by Vitest infrastructure BEFORE refactoring), incomplete plugin lifecycle hooks (prevented by category-specific mount/update/destroy from day one), and XSS via plugin renderer using innerHTML (prevented by dev-mode runtime detection + documented security guidance).

## Implications for Roadmap

Based on research, the dependency graph demands this phase structure:

### Phase 1: Production Infrastructure
**Rationale:** Test infrastructure MUST come before refactoring — tests are the safety net that makes safe decomposition of the 489-line editor monolith possible. The current codebase has zero test coverage and a hand-rolled `ts.transpileModule()` test harness. Vitest + happy-dom is ~10 lines of config and unblocks all future work. ESLint + Prettier enforce consistent code quality during the refactoring phase. CI ensures nothing ships broken.

**Delivers:**
- Vitest 4 + happy-dom 20 test framework (replaces hand-rolled harness)
- ESLint 10 flat config + typescript-eslint 8 + Prettier 3
- GitHub Actions CI: typecheck → lint → test → build
- Initial pipeline unit tests: tokenizer (pure logic), caret offsets, navigation helpers
- @vitest/coverage-v8 with coverage thresholds

**Addresses:** Production infra (P1 from prioritization matrix); test coverage for existing pipeline.

**Avoids:** Pitfall 7 (no automated regression tests — fixes this before refactoring); Pitfall 4 (selection/caret loss — cursor tests establish regression safety net).

**Research flags:** Standard patterns — skip research-phase. Vitest + ESLint + CI are well-documented with mature templates.

### Phase 2: Architecture Refactoring
**Rationale:** The 489-line editor monolith must be decomposed before the plugin system can be built. Clean module boundaries (core/, pipeline/, plugins/, navigation/, theme/, storage/, dom/) enable independent testing and future extensibility. The theme system is purely additive and can go early — the renderer should emit theme-aware classes from the start. Quick-win table-stakes features (strikethrough, placeholder) can be added during this phase since they touch the pipeline.

**Delivers:**
- Editor Core as thin orchestrator (core/editor.ts, core/state.ts)
- Pipeline extraction: extractor, tokenizer, renderer, caret (pipeline/*.ts)
- Navigation extraction: trail, URL sync, wiki link parsing (navigation/*.ts)
- DOM utility extraction (dom/*.ts)
- Theme system: design tokens (~50 `--wn-*` variables), CSS injection, default theme (theme/*.ts)
- CSS extraction from editor.ts → theme/tokens.ts and theme/defaults.css.ts
- Plugin Manager skeleton: registration, name-based replacement, basic validation (plugins/manager.ts)
- Strikethrough plugin (`~~...~~`)
- Placeholder text
- StorageAdapter.delete() API

**Addresses:** Editor architecture refactoring (P1), design token system (P1), strikethrough (P1), placeholder (P2), StorageAdapter.delete() (P2).

**Avoids:** Pitfall 1 (full DOM rebuild — module boundaries enable incremental rendering later); Pitfall 2 (browser-specific DOM — input handler extraction enables beforeinput interception); Pitfall 6 (CSS specificity wars — design tokens established from the start); structural anti-pattern: monolithic editor class.

**Research flags:** Moderate — needs research on exact design token coverage and beforeinput event handling patterns. Consider `/gsd-research-phase` for input handler design.

### Phase 3: Plugin System Core
**Rationale:** The declarative plugin manifest system is the lynchpin — UI overlays, custom blocks, and storage-as-plugins all depend on it. This phase must ship the manifest types, category interfaces, Plugin Manager full implementation, and migrate existing built-in plugins to the new ContentPlugin interface. Plugin lifecycle hooks (mount/update/destroy by category) must be designed in from day one — bolting them on later creates Pitfall 8. Plugin ordering must be made explicit with category and priority fields (Pitfall 5).

**Delivers:**
- Declarative Plugin Manifest interface with `category`, `priority`, `capabilities`, `manifestVersion`
- Category-specific interfaces: ContentPlugin (tokens + render + onNavigate), UIPlugin (onMount + onDestroy), StoragePlugin (createAdapter + onInit + onDestroy)
- Plugin Manager full implementation: validate, categorize, dispatch to pipeline
- Plugin lifecycle: init/activate/deactivate with guaranteed mount/destroy pairing
- Conflict detection: duplicate names, overlapping regex patterns (dev-mode warning)
- Migrate built-in plugins (headings, inline, wikiLink) to ContentPlugin interface
- Plugin validation at `.use()` time — fail fast with descriptive errors
- API stability policy documented (semver for plugin types, deprecation window)

**Addresses:** Declarative plugin manifest system (P1), plugin lifecycle hooks, plugin ordering/category enforcement.

**Avoids:** Pitfall 3 (breaking plugin API contracts — manifestVersion from day one); Pitfall 5 (implicit ordering — categories + priority explicit); Pitfall 8 (incomplete lifecycle — category-specific hooks from day one).

**Research flags:** Needs deep research — plugin manifest design patterns, category dispatch architecture, conflict detection algorithms. Strong candidate for `/gsd-research-phase` during planning. Study TipTap ExtensionManager internals and Obsidian plugin registration model.

### Phase 4: Editor Completeness
**Rationale:** With the architecture modularized and the plugin system operational, this phase fills the remaining table-stakes gaps and ships high-value differentiators. Undo/Redo, URL links, keyboard shortcuts, and accessibility make the editor production-ready. UI overlay slots enable the suggestion engine (Phase 5). Full theme replacement builds on Phase 2's design tokens. This phase makes the library shippable as v1.0.

**Delivers:**
- Undo/Redo (custom history tracking — no ProseMirror dep)
- URL links (`[text](url)` — navigation-aware, internal vs external)
- Keyboard shortcuts (Cmd+B/I/K for formatting toggles)
- Accessibility basics (ARIA roles, focus ring, `role="textbox"`)
- UI overlay / panel slot system (DOM slots: toolbar, sidebar, status-bar)
- Full theme replacement escape hatch (`editor.setTheme(css)`)
- Page listing API (`listPages()`)
- Error boundary (restore last known good state on crash)

**Addresses:** Undo/Redo (P1), URL links (P1), keyboard shortcuts (P2), accessibility basics (P2), UI overlay/panel slots (P1), full theme replacement (P1), page listing API (P2), error resilience.

**Avoids:** Pitfall 4 (caret loss during re-render — cursor test suite from Phase 1 validates undo operations); Pitfall 6 (CSS wars — full theme replacement builds on token system from Phase 2).

**Research flags:** Standard patterns for most features. Undo/Redo may need research — decide between custom history tracking vs. adopting ProseMirror-history pattern. Keyboard shortcut design may need research on cross-platform consistency (Cmd vs Ctrl).

### Phase 5: Advanced Features & Differentiators
**Rationale:** These features fully deliver on the differentiator promise but depend on earlier phases. The suggestion engine needs UI overlay slots (Phase 4). Custom block types need the plugin manifest system (Phase 3) and ideally list support. Content serialization needs the plugin-aware architecture. Storage-as-plugins needs the manifest system. Bulleted/numbered lists are table stakes but require multi-line tokenizer changes — if too invasive for this milestone, defer to v1.1.

**Delivers:**
- Autocomplete / suggestion engine (`[[` pages, `/` commands, `@` mentions)
- Custom block type registration (callouts, code blocks, todo checkboxes)
- Bulleted / numbered lists (if tokenizer changes are feasible)
- Content serialization (plugin-aware export/import)
- Storage adapter as plugin type
- Example plugins (toolbar plugin, callout plugin)

**Addresses:** Autocomplete/suggestion engine (P2), custom block types (P2), bulleted/numbered lists (P2), content serialization (P3), storage adapter as plugin (P3).

**Avoids:** Pitfall 3 (plugin API stability — manifest system from Phase 3 ensures new plugin types are additive); performance trap: ReDoS in plugin token patterns (automated ReDoS check from Phase 3).

**Research flags:** Needs research — list parsing algorithms, suggestion engine positioning/layering, custom block nesting rules. Candidate for `/gsd-research-phase` during planning. Study Notion's block model and Obsidian's autocomplete implementation.

### Phase Ordering Rationale

The phase ordering is driven by a strict dependency chain discovered across all four research domains:

1. **Tests before refactoring** (Pitfalls 4, 7) — You cannot safely decompose the editor monolith without a regression safety net. Tests establish the baseline behavior that refactoring must preserve.

2. **Architecture before plugins** (Architecture, Pitfall 1) — The plugin system dispatches into pipeline modules (tokenizer, renderer, storage). Those modules must exist as clean boundaries first.

3. **Plugin manifest before extensibility** (Features dependency graph) — UI overlays, custom blocks, and storage-as-plugins are all gated on `DECLARATIVE PLUGIN MANIFEST`. Without it, they're just ad-hoc features bolted onto a monolith.

4. **Design tokens before full theme replacement** (Features, Pitfall 6) — Tokens define the CSS variable contract. Full theme replacement is just swapping the values behind that contract.

5. **UI overlay slots before suggestion engine** (Features dependency graph) — Autocomplete dropdowns need DOM slots to render into. Suggestion positioning depends on the UI slot system.

6. **List support before custom blocks** (Features dependency graph) — Custom block types need the nesting model that multi-line lists establish.

The grouping into 5 phases balances dependency constraints with delivering value incrementally. Phase 1 is pure infrastructure (no user-facing changes). Phase 2 produces visible theme improvements and module boundaries. Phase 3 establishes the extensibility foundation. Phase 4 makes the library production-ready. Phase 5 adds the "wow" differentiators.

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 3 (Plugin System Core):** Plugin manifest design patterns are novel — no library does declarative manifests with category dispatch exactly this way. Needs research on TipTap's ExtensionManager internals, Obsidian's plugin registration model, and Plate's chained extension methods. Conflict detection algorithms for overlapping regex patterns may need dedicated research.

- **Phase 5 (Advanced Features):** Three sub-domains need research: (a) list parsing algorithms for multi-line tokenization with nesting, (b) suggestion engine overlay positioning relative to cursor with viewport awareness, and (c) custom block nesting rules and keyboard navigation. Study Notion's block model and Obsidian's autocomplete.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Production Infrastructure):** Vitest, ESLint, Prettier, GitHub Actions are all well-documented with mature templates and community consensus. Stack choices are verified against Context7 docs and competitor analysis (HIGH confidence).

- **Phase 2 (Architecture Refactoring):** Module decomposition follows standard layered architecture patterns (ProseMirror, Slate, TipTap). Design token system follows Obsidian's CSS variable model. Quick-win features are low-complexity additions to existing pipeline.

- **Phase 4 (Editor Completeness):** Undo/Redo patterns are well-documented (ProseMirror-history, custom stack). URL links and keyboard shortcuts follow established patterns. Accessibility is WCAG-standard. UI overlay slots follow Obsidian's `addRibbonIcon`/`addStatusBarItem` model.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against Context7 official docs (Vitest, ESLint, typescript-eslint, happy-dom, Vite), npm registry version checks, and competitor stack analysis (TipTap 36.9k★, Milkdown 11.5k★). Version compatibility matrix validated across all package pairings. |
| Features | HIGH | Competitor feature analysis verified against TipTap official docs, ProseMirror guide, Milkdown README, Notion help center, and Obsidian developer docs (all fetched directly). Current codebase features verified against .planning/codebase/ analysis. Feature dependency graph validated against architectural constraints. |
| Architecture | HIGH | Patterns cross-referenced against ProseMirror guide (official, fetched), TipTap extension docs (official, fetched), Slate docs (Context7), and Plate docs (Context7). Current architecture analyzed via .planning/codebase/ analysis. Anti-patterns validated against ProseMirror creator's published critiques. |
| Pitfalls | HIGH | Top pitfalls cross-referenced against ProseMirror design philosophy (Marijn Haverbeke's blog), Slate changelog (v0.47–v0.61+ breaking changes), Quill's "Why Quill" rationale, and direct codebase analysis of worldnotes v0.1.0. Performance traps and security mistakes validated against OWASP and common contentEditable vulnerability patterns. |

**Overall confidence:** HIGH — All four research domains have strong source quality with multiple independent verifications. Stack choices verified against authoritative documentation and competitor usage. Feature landscape validated against leading editor libraries. Architecture patterns derived from the three most influential editor frameworks. Pitfalls grounded in real-world histories.

### Gaps to Address

The following areas could not be fully resolved during research and need attention during planning:

- **beforeinput interception scope:** Research confirms this is the correct approach (ProseMirror, TipTap, Slate all use it), but the exact scope of what to intercept in Phase 2 vs defer to later phases needs planning judgment. Minimum: Enter, Backspace, Delete. Possibly: Tab, formatting shortcuts.

- **Exact design token count:** Research recommends ~50 tokens based on Obsidian's model, but the exact set (which colors, which spacing values, which typography properties) needs to be defined during Phase 2 planning. Over-engineering tokens is as bad as under-engineering.

- **Undo/Redo implementation approach:** Two viable paths exist: (a) custom history stack mirroring ProseMirror-history pattern with snapshots before each mutation, or (b) command pattern where each operation provides inverse. Path (a) is simpler but memory-intensive for long documents. Path (b) is more elegant but requires all mutations to go through a command system. Research did not definitively settle this — needs planning decision.

- **List support feasibility for v1.0:** Bulleted/numbered lists are table stakes (every competitor has them) but require multi-line tokenizer changes that may be too invasive for this milestone. The tokenizer currently processes line-by-line; lists need cross-line awareness with nesting. Research flags this as HIGH complexity — consider deferring to v1.1 if tokenizer changes threaten Phase 2-3 schedule.

- **Mobile testing strategy:** Research identifies mobile pitfalls (iOS Safari quirks, virtual keyboard, visualViewport) but cannot prescribe a testing strategy without knowing available devices/emulators. Planning needs to decide: manual QA, Playwright device emulation, or real device testing.

- **CSP (Content Security Policy) compatibility:** The theme system uses injected `<style>` elements. Under strict CSP (`style-src 'self'`), these require a nonce or hash. Research did not determine whether the library or the consumer is responsible for CSP configuration. Planning must decide who owns this concern.

## Sources

### Primary (HIGH confidence)
- **Context7 — `/vitest-dev/vitest` (v4.1.7):** Configuration, environment providers (happy-dom, browser), coverage integration
- **Context7 — `/capricorn86/happy-dom` (v20.9.0):** Vitest integration, GlobalRegistrator, DOM API compliance
- **Context7 — `/eslint/eslint` (v10.4.0):** Flat config migration, TypeScript config files, recommended rules
- **Context7 — `/typescript-eslint/typescript-eslint` (v8.59.4):** Flat config setup, type-aware rules, tseslint.config() helper
- **Context7 — `/vitejs/vite` (v7.3.3, v8.0.14):** Library mode, build configuration, rollupOptions compatibility
- **Context7 — ProseMirror docs (`/prosemirror/prosemirror`, `/prosemirror/prosemirror-view`):** Plugin architecture, state management, transaction system
- **Context7 — TipTap docs (`/websites/tiptap_dev`):** Extension system, node/mark/extension types, headless styling
- **Context7 — Slate docs (`/ianstormtaylor/slate`):** Node-based editor patterns, transform API, plugin model
- **ProseMirror Guide** (prosemirror.net/docs): Plugin architecture, contentEditable avoidance, immutable document model
- **ProseMirror creator blog** (marijnhaverbeke.nl/blog/prosemirror.html): Design philosophy, why contentEditable alone fails
- **TipTap Extension docs** (tiptap.dev/docs): Extension API, custom extensions, styling guide
- **Notion Help Center** (notion.so/help): Block types, formatting, keyboard shortcuts, slash commands
- **Slate Changelog** (github.com/ianstormtaylor/slate): Documented history of API breakage, architectural pivots
- **Quill "Why Quill"** (quilljs.com/docs): API-driven vs DOM-driven editor design
- **npm registry:** Version verification for all recommended packages (vitest, happy-dom, eslint, typescript-eslint, prettier, vite, vite-plugin-dts)
- **Vite 7 official docs** (v7.vite.dev/guide/build): Library mode confirmation (uses Rollup, not rolldown)
- **Worldnotes codebase:** .planning/codebase/ARCHITECTURE.md, .planning/codebase/CONCERNS.md, .planning/codebase/STRUCTURE.md — current architecture for gap analysis
- **Worldnotes source:** src/types.ts, src/editor.ts, src/cursor.ts — direct code analysis for pitfalls identification

### Secondary (MEDIUM confidence)
- **GitHub — TipTap** (ueberdosis/tiptap, 36.9k★): Stack reference — Vitest, ESLint, Prettier, Changesets, pnpm, Playwright
- **GitHub — Milkdown** (Saul-Mirone/milkdown, 11.5k★): Stack reference — Vitest, Prettier, oxlint, oxfmt, Cypress
- **Obsidian Developer Docs** (docs.obsidian.md): Plugin model, lifecycle hooks, CSS theming (JS-heavy — couldn't render all sub-pages via webfetch)
- **Obsidian API** (Context7): Plugin registration, settings management, imperative model
- **Plate** (udecode/plate via Context7): Chained plugin extension methods, key-based identity
- **Context7 — Obsidian API:** Plugin manifest, lifecycle hooks, imperative registration model

### Tertiary (LOW confidence)
- **Obsidian plugin model specifics:** Some details inferred from community observation rather than official documentation. The imperative registration pattern (`this.register*()` in `onload`) is well-documented, but specific lifecycle ordering and error handling are community-sourced.
- **contentEditable browser quirks:** Specific claims about IME event ordering, spellcheck behavior, and browser-specific Enter key handling are based on widely-documented patterns (cross-referenced with ProseMirror, Slate, Quill) but not independently tested. Needs validation during Phase 2 input handler implementation.

---

*Research completed: 2026-05-23*
*Ready for roadmap: yes*
