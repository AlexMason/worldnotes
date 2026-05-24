# Phase 3: Plugin System & Content Extensions - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

## Phase Boundary

Redesign the plugin system with declarative manifests, lifecycle hooks, and category-based dispatch. Add strikethrough and URL link formatting as new built-in plugins. Migrate all 7 existing plugins to the new manifest format. This is the lynchpin phase — everything downstream (UI slots in Phase 5, storage-as-plugins in v2) depends on the manifest contract.

## Implementation Decisions

### PluginManifest Shape
- **D-01:** `PluginManifest` is a union type discriminated by `kind`:
  - `kind: 'content'` — token-based render plugins (headings, bold, wiki links, etc.). Fields: `name`, `version`, `kind`, `tokens`, `render`, `onNavigate?`.
  - `kind: 'ui'` — UI injection plugins (toolbars, sidebars, overlays). Fields: `name`, `version`, `kind`, `slots` (array of slot names), `onMount`, `onDestroy`.
  - `kind: 'storage'` — storage adapter plugins. Fields: `name`, `version`, `kind`, `adapter` (implements StorageAdapter).
- **D-02:** All manifests include `name: string` (unique), `version: string` (semver, validated at registration). Version must match `^\d+\.\d+\.\d+(-[\w.]+)?$`.
- **D-03:** All manifests include optional lifecycle hooks: `onInit?()`, `onDestroy?()`. Content plugins additionally get `onUpdate?()` called after each render cycle.

### Conflict Detection
- **D-04:** Content plugin conflict: two manifests with `kind: 'content'` whose token patterns produce identical regex matches (same `TokenDef.type` for same input string). Detected at `editor.use()` — throws descriptive error naming both plugins.
- **D-05:** UI plugin conflict: two manifests with `kind: 'ui'` claiming the same slot with the same `priority` value. Detected at registration, throws immediately.
- **D-06:** Name conflict: two manifests with same `name` — the second replaces the first (same behavior as current `EditorBuilder.use()`). Not an error, just a replace. The previous lifecycle's `onDestroy` is called before replacement.

### Migration Strategy
- **D-07:** All 7 existing built-in plugins (`headingsPlugin`, `boldPlugin`, `italicPlugin`, `inlineCodePlugin`, `wikiLinkPlugin`, `blockquotePlugin`, `hrPlugin`) are rewritten in-place to implement the new `ContentPlugin` manifest interface. Not wrapped — rewritten.
- **D-08:** The existing `Plugin` interface is replaced by the new `PluginManifest` union type. `EditorBuilder.use()` accepts `PluginManifest`. Backward compat with old `Plugin` interface is NOT maintained — Phase 3 is the migration point.
- **D-09:** `defaultPlugins` array in `src/plugins/defaults.ts` switches from `Plugin[]` to `PluginManifest[]`. Plugin ordering rules are preserved (headings first, then hr, blockquote, wiki-link, bold, italic, inline-code).

### Formatting New Plugins
- **D-10:** `strikethroughPlugin` — `~~text~~` → renders `<span class="wn-strikethrough">` with CSS text-decoration: line-through. Follows existing `boldPlugin`/`italicPlugin` pattern with `withPunct` helper.
- **D-11:** `linkPlugin` — `[text](url)` → renders `<a class="wn-link" href="url" target="_blank">` for external URLs, or `<span class="wn-wiki-link">` if the URL matches `[[page]]` syntax (internal wiki link, navigates within editor). External detection: URL doesn't start with `[[` or match a known page pattern.

### Public API
- **D-12:** `PluginManifest`, `ContentPlugin`, `UIPlugin`, `StoragePlugin` types exported from `src/index.ts` and documented in `docs/api.md`.
- **D-13:** `PluginManifest` types re-exported from the package entry point so consumers can `import type { ContentPlugin } from 'worldnotes'`.

### OpenCode's Discretion
- Exact TypeScript union type structure (discriminated union vs interface extension)
- Lifecycle hook timing (sync vs async, order of callbacks)
- Conflict detection error message format and detail level
- CSS styling details for strikethrough and link elements
- Internal plugin registration data structure (Map? Array? Registry class?)

## Specific Ideas

No specific requirements — open to standard approaches.

## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — PLUG-01 through PLUG-06, FORMAT-01 through FORMAT-03
- `.planning/ROADMAP.md` — Phase 3 goal, 5 success criteria

### Project Context
- `.planning/PROJECT.md` — Core value: plugin surface is the product. Constraints: zero runtime deps, TypeScript strict.

### Phase 1 & 2 Artifacts
- `.planning/phases/01-production-infrastructure/01-CONTEXT.md` — Test infrastructure decisions
- `.planning/phases/02-architecture-refactoring/02-CONTEXT.md` — Module architecture decisions

### Codebase
- `.planning/codebase/ARCHITECTURE.md` — Plugin registration order, tokenizer/renderer pipeline, EditorContext
- `.planning/research/FEATURES.md` — Feature landscape, dependency graph showing Plugin Manifest as lynchpin

## Existing Code Insights

### Reusable Assets
- **Existing Plugin interface** (`src/types.ts:74-79`): Current plugin contract with `name`, `tokens`, `render`, `onNavigate`. This becomes `ContentPlugin` in the new system.
- **EditorBuilder.use()** (`src/editor.ts`): Fluent registration with name-based replacement. Same API surface, new manifest type.
- **buildPluginMap()** (`src/renderer.ts`): Builds `Map<string, Plugin>` from plugin list. Must be updated for `PluginManifest[]` dispatch.
- **withPunct helper** (`src/plugins/inline.ts`): Shared regex helper for bold/italic. Strikethrough reuses this pattern.

### Established Patterns
- **Tokenizer order matters**: Line-level plugins tested first, then inline plugins left-to-right. `headingsPlugin` must register before `boldPlugin`.
- **data-raw for cursor fidelity**: Rendered elements store source text in `dataset.raw`. New plugins (strikethrough, link) must follow this.
- **mousedown for navigation**: `onNavigate` handlers use mousedown, not click. Link plugin's external URL handler can use standard click behavior.

### Integration Points
- **EditorBuilder.use()** accepts `PluginManifest` instead of `Plugin`. Backward compat is dropped — this is intentional.
- **Tokenizer** (`src/tokenizer.ts`): TokenDef extraction changes from `plugins.flatMap(p => p.tokens)` to `contentPlugins.flatMap(p => p.tokens)`.
- **Renderer** (`src/renderer.ts`): Plugin dispatch map changes from `Plugin` to `ContentPlugin`.
- **Public API** (`src/index.ts`): Exports change — old `boldPlugin` etc. still exported but as `ContentPlugin` type.

## Deferred Ideas

- UI plugin slot system (toolbar, sidebar) — Phase 5
- Storage adapter as plugin type — Phase 5 (or v2)
- Autocomplete/suggestion engine — v2
- Custom block type registration — v2

---
*Phase: 03-plugin-system*
*Context gathered: 2026-05-23*
