# Requirements: WorldNotes

**Defined:** 2026-05-23
**Core Value:** Developers and users can extend the editor with custom blocks, UI panels, and storage backends without touching core code — the plugin surface is the product.

## v1 Requirements

Requirements for first production milestone. Each maps to roadmap phases.

### Infrastructure (INFRA)

- [x] **INFRA-01**: Test suite runs with a real test framework (Vitest) and happy-dom browser environment, not raw Node assert with manual transpilation
- [ ] **INFRA-02**: Every existing source module (cursor, tokenizer, renderer, navigation, editor, plugins, storage) has test coverage for its public API surface
- [x] **INFRA-03**: ESLint flat config in place with TypeScript rules, error on commit or CI failure
- [x] **INFRA-04**: CI pipeline (GitHub Actions) runs typecheck, lint, and tests on every push and PR
- [ ] **INFRA-05**: Coverage thresholds enforced in CI (80%+ branch coverage)
- [x] **INFRA-06**: Test and typecheck commands documented in AGENTS.md and package.json scripts

### Architecture (ARCH)

- [ ] **ARCH-01**: Editor monolith (`src/editor.ts`) split into cohesive modules — state management, DOM construction, input handling, navigation, persistence, and lifecycle
- [ ] **ARCH-02**: Render pipeline (tokenizer → renderer) remains intact but is modularized with clear boundaries
- [ ] **ARCH-03**: Cursor module tested comprehensively for caret edge cases before renderer changes
- [ ] **ARCH-04**: `src/demo.ts` extracted to a separate entry point (not compiled into library build output)
- [ ] **ARCH-05**: Module responsibilities documented in `docs/architecture.md`

### Plugin System (PLUG)

- [ ] **PLUG-01**: Plugin authors declare capabilities via a `PluginManifest` interface with explicit `kind` (block, ui, storage)
- [ ] **PLUG-02**: Plugins have lifecycle hooks — `onInit`, `onMount`, `onUpdate`, `onDestroy`
- [ ] **PLUG-03**: Plugin conflict detection at registration time — two plugins claiming the same slot/pattern error at registration, not at runtime
- [ ] **PLUG-04**: Existing built-in plugins (headings, bold, italic, code, wiki links, hr, blockquote, strikethrough, url-links) migrated to the new manifest format
- [ ] **PLUG-05**: Plugin API types exported from `src/index.ts` and documented in `docs/api.md`
- [ ] **PLUG-06**: Plugin manifest includes a `version` field with semver, validated at registration

### Theming (THEME)

- [ ] **THEME-01**: Design tokens defined as CSS custom properties under `--wn-*` namespace (colors, typography, spacing, radii, shadows)
- [ ] **THEME-02**: Injected default stylesheet moved from inline template string in editor.ts to a token-driven stylesheet
- [ ] **THEME-03**: All CSS class selectors remain `wn-*` prefixed; no inline styles in DOM
- [ ] **THEME-04**: `EditorOptions.theme` accepts a CSS string to replace the injected stylesheet entirely (full theme replacement)
- [ ] **THEME-05**: Design token reference documented in `docs/theming.md`

### Formatting (FORMAT)

- [ ] **FORMAT-01**: `~~strikethrough~~` renders as strikethrough text — new plugin in the tokenizer/renderer pipeline
- [ ] **FORMAT-02**: `[text](url)` renders as a clickable link — new plugin, internal links navigate wiki pages, external links open in new tab
- [ ] **FORMAT-03**: Strikethrough and URL link plugins follow existing pattern (regex TokenDef, render to DOM, data-raw for cursor fidelity)

### UI Extension (UI)

- [ ] **UI-01**: Editor DOM provides a minimal toolbar slot (`wn-toolbar`) where UI plugins can mount content
- [ ] **UI-02**: `PluginManifest.slots` array declares which DOM slots a UI plugin populates
- [ ] **UI-03**: Plugin lifecycle `onMount` receives the slot container element for DOM rendering
- [ ] **UI-04**: UI plugin conflict detection — two plugins claiming the same slot with same priority errors at registration

## v2 Requirements

Deferred to subsequent milestone. Tracked but not in current roadmap.

### Editor UX

- **EDIT-01**: Undo/redo via Ctrl+Z/Ctrl+Y (or Cmd) with custom history tracking
- **EDIT-02**: Keyboard shortcuts for formatting (Cmd+B for bold, Cmd+I for italic)
- **EDIT-03**: Placeholder text when editor is empty ("Start writing...")
- **EDIT-04**: Page listing API (`listPages()`) via storage adapter keys
- **EDIT-05**: Storage adapter `delete()` method for page deletion

### Accessibility

- **ACCS-01**: ARIA roles on editor elements (`role="textbox"`, `aria-multiline="true"`)
- **ACCS-02**: Focus ring styling with keyboard navigation indicator

### Plugin Ecosystem

- **PLUG-07**: Autocomplete/suggestion engine — `[[` triggers page completion, `@` triggers mentions, `/` triggers commands
- **PLUG-08**: Custom block type registration — plugin-defined block content (callouts, todo checkboxes, code blocks with syntax highlighting)
- **PLUG-09**: Storage adapter as plugin type — plugins can provide persistence backends
- **PLUG-10**: Content serialization (plugin-aware export/import) with `serialize()`/`deserialize()` on plugin manifest
- **PLUG-11**: Additional UI slots (sidebar-left, sidebar-right, status-bar)

### Advanced Formatting

- **FORM-04**: Bulleted and numbered lists with multi-line tokenization and nesting
- **FORM-05**: Code blocks with syntax highlighting hints

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | Deferred to product phase per PROJECT.md |
| Plugin registry/marketplace | Premature — needs stable plugin API and 3+ community plugins first |
| Framework wrappers (React, Vue, Svelte) | Vanilla-first, community or future milestone |
| Rich text toolbar (built-in) | UI opinion, belongs in plugins not core |
| Image/media embedding | Library shouldn't own upload/storage strategy |
| Mobile-optimized interactions | Browser library, defer to product phase |
| AI features (text generation, summarization) | Product-level concern, rapidly changing |
| Markdown export (SSG integration) | Consumers can loop `storage.keys()` + `storage.get()` |
| WYSIWYG toggle (edit/preview) | Inline WYSIWYG is the preview; toggle goes against design |
| Spell check | Browser-native `spellcheck` attribute handles this |
| Backlinks / graph view | Obsidian-level knowledge management, future consideration |
| Incremental rendering (partial DOM) | Address after refactor; full rebuild acceptable for current scale |

## Traceability

*Populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 1 | Complete |
| ARCH-01 | Phase 2 | Pending |
| ARCH-02 | Phase 2 | Pending |
| ARCH-03 | Phase 2 | Pending |
| ARCH-04 | Phase 2 | Pending |
| ARCH-05 | Phase 2 | Pending |
| PLUG-01 | Phase 3 | Pending |
| PLUG-02 | Phase 3 | Pending |
| PLUG-03 | Phase 3 | Pending |
| PLUG-04 | Phase 3 | Pending |
| PLUG-05 | Phase 3 | Pending |
| PLUG-06 | Phase 3 | Pending |
| THEME-01 | Phase 4 | Pending |
| THEME-02 | Phase 4 | Pending |
| THEME-03 | Phase 4 | Pending |
| THEME-04 | Phase 4 | Pending |
| THEME-05 | Phase 4 | Pending |
| FORMAT-01 | Phase 3 | Pending |
| FORMAT-02 | Phase 3 | Pending |
| FORMAT-03 | Phase 3 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-24 after Plan 01-01 completion*
