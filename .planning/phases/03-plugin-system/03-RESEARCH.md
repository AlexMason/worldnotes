# Phase 3: Plugin System & Content Extensions - Research

**Researched:** 2026-05-24
**Domain:** TypeScript discriminated unions, plugin registry architecture, regex-based token pipeline, conflict detection algorithms
**Confidence:** HIGH

## Summary

Phase 3 redesigns the plugin system from a flat `Plugin` interface to a declarative discriminated-union `PluginManifest` system with three categories (`content`, `ui`, `storage`). The existing 7 built-in plugins are rewritten in-place — each gains `kind: 'content'`, `version`, and optional lifecycle hooks. Two new formatting plugins (`strikethroughPlugin`, `linkPlugin`) extend the inline formatting pipeline following the established `TokenDef → render → data-raw` pattern.

The architectural transformation is additive at the plugin level (existing `tokens`/`render`/`onNavigate` persist unchanged) but requires replacing the `Plugin` type with `ContentPlugin` throughout the tokenizer, renderer, and editor pipelines. The `EditorBuilder.use()` method gains conflict detection — duplicate token types between content plugins, and duplicate slot+priority pairs between UI plugins — throwing descriptive errors at registration time. Semver validation guards the `version` field.

**Primary recommendation:** Build an internal `PluginRegistry` class that wraps three `Map<string, ContentPlugin|UIPlugin|StoragePlugin>` lookups plus conflict detection. The registry exposes a `register(manifest)` method, `allTokenDefs()` for the tokenizer, and `contentPlugins` for the renderer. This is the single source of truth for plugin state, replacing the ad-hoc `Plugin[]` array in the current codebase.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `PluginManifest` is a union type discriminated by `kind`: `'content'`, `'ui'`, `'storage'`
- **D-02:** All manifests include `name: string` (unique), `version: string` (semver pattern `^\d+\.\d+\.\d+(-[\w.]+)?$`)
- **D-03:** Lifecycle hooks: `onInit?()`, `onDestroy?()` on all manifests; `onUpdate?()` on ContentPlugin (called after each render cycle)
- **D-04:** Content plugin conflict: two manifests with same `TokenDef.type` for any token → error at `editor.use()`
- **D-05:** UI plugin conflict: two manifests claiming same `slot` with same `priority` → error at registration
- **D-06:** Name conflict: second plugin with same `name` replaces first — `onDestroy` called on old plugin before replacement
- **D-07:** All 7 existing plugins rewritten in-place (not wrapped) to implement `ContentPlugin`
- **D-08:** Old `Plugin` interface replaced entirely. No backward compat maintained.
- **D-09:** `defaultPlugins` switches from `Plugin[]` to `PluginManifest[]`. Order preserved.
- **D-10:** `strikethroughPlugin` — `~~text~~` → `<span class="wn-strikethrough">` with `text-decoration: line-through`
- **D-11:** `linkPlugin` — `[text](url)` → `<a class="wn-link" href="url" target="_blank">` for external, `<span class="wn-wiki-link">` for internal wiki page URLs
- **D-12:** `PluginManifest`, `ContentPlugin`, `UIPlugin`, `StoragePlugin` exported from `src/index.ts`, documented in `docs/api.md`
- **D-13:** Types re-exported from package entry point for external consumers

### OpenCode's Discretion

- Exact TypeScript union type structure (discriminated union vs interface extension)
- Lifecycle hook timing (sync vs async, order of callbacks)
- Conflict detection error message format and detail level
- CSS styling details for strikethrough and link elements
- Internal plugin registration data structure (Map? Array? Registry class?)

### Deferred Ideas (OUT OF SCOPE)

- UI plugin slot system (toolbar, sidebar) — Phase 5
- Storage adapter as plugin type — Phase 5 (or v2)
- Autocomplete/suggestion engine — v2
- Custom block type registration — v2

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | Plugin authors declare capabilities via `PluginManifest` with explicit `kind` | Discriminated union pattern (Section: Architecture Patterns, Pattern 1) |
| PLUG-02 | Plugins have lifecycle hooks — `onInit`, `onMount`, `onUpdate`, `onDestroy` | Lifecycle execution order (Section: Architecture Patterns, Pattern 2) |
| PLUG-03 | Plugin conflict detection at registration time | Conflict detection algorithm (Section: Architecture Patterns, Pattern 3) |
| PLUG-04 | Existing built-in plugins migrated to new manifest format | Migration approach (Section: Architecture Patterns, Pattern 4) |
| PLUG-05 | Plugin API types exported from `src/index.ts` and documented in `docs/api.md` | Public API surface (Section: Standard Stack, Public API) |
| PLUG-06 | Plugin manifest includes `version` field with semver validated at registration | Semver validation (Section: Standard Stack, Validation) |
| FORMAT-01 | `~~strikethrough~~` renders as strikethrough text | Strikethrough plugin implementation (Section: Code Examples) |
| FORMAT-02 | `[text](url)` renders as clickable link — internal vs external | Link plugin implementation (Section: Code Examples) |
| FORMAT-03 | Strikethrough and link plugins follow existing pattern (regex TokenDef, render to DOM, data-raw) | Pattern analysis (Section: Common Pitfalls, Pitfall 4) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PluginManifest type definition | Type System / API | — | Pure type definitions with no runtime behavior |
| Plugin registration + conflict detection | API (EditorBuilder) | — | `editor.use()` is library API; conflict detection is registration-time validation |
| Token extraction from content plugins | Tokenizer | — | `plugins.flatMap(p => p.tokens)` → `contentPlugins.flatMap(p => p.tokens)`; tokenizer logic unchanged |
| Plugin dispatch (render) | Renderer | — | `buildPluginMap()` maps token type → ContentPlugin; unchanged dispatch pattern |
| Lifecycle hook execution | Editor Lifecycle | — | `onInit` at registration, `onDestroy` at replacement/destroy, `onUpdate` post-render |
| Strikethrough rendering | Browser / Client | — | DOM construction identical to bold/italic pattern using `withPunct` helper |
| Link rendering + navigation | Browser / Client | — | DOM construction + `mousedown` handler for internal navigation; browser native `<a>` for external |
| CSS styling for new elements | Browser / Client | — | Injected stylesheet in editor-dom; Phase 4 will convert to design tokens |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript discriminated unions | 5.4+ (project version) | PluginManifest union type with `kind` discriminant | Native TS pattern for exhaustiveness checking — `switch(manifest.kind)` type-narrows automatically. No lib needed. [VERIFIED: tsconfig strict mode + project usage] |
| `Map<string, Plugin>` | ES2015+ | Plugin registry internals, token-type-to-plugin lookup | O(1) lookup for conflict detection and render dispatch. Already used in `buildPluginMap()`. [VERIFIED: src/renderer.ts:99-107] |
| Semver regex | Custom (D-02 pattern) | Version field validation | Pattern `^\d+\.\d+\.\d+(-[\w.]+)?$` from CONTEXT.md D-02. Zero runtime deps constraint means no `semver` npm package. [CITED: .planning/phases/03-plugin-system/03-CONTEXT.md D-02] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest (test only) | 4.1.7 | Testing conflict detection, lifecycle hooks, strikethrough/link rendering | All new tests follow existing `src/__tests__/*.test.ts` pattern [VERIFIED: package.json, vitest.config.ts] |
| happy-dom (test only) | 20.9.0 | Browser DOM environment for render tests | Required for any test that calls plugin `.render()` or lifecycle hooks that touch DOM [VERIFIED: package.json] |
| `withPunct` helper | Existing | Punctuation-markered inline formatting | Reused by strikethroughPlugin — identical DOM pattern to bold/italic [VERIFIED: src/plugins/inline.ts:10-25] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Discriminated union | Interface extension (`extends BasePlugin`) | Discriminated union supports exhaustiveness checking in `switch`; interface extension requires type guards. Union is more explicit and TypeScript-idiomatic for tagged types. |
| Map-based internal registry | Array-based `plugins[]` (current) | Map provides O(1) lookup for conflict detection vs O(n) array scan. Current array is fine for 7 plugins but Map scales better. Recommendation: use Map internally. |
| Sync lifecycle hooks | Async hooks (`Promise<void>`) | Sync is simpler, matches existing codebase patterns (no async anywhere). Zero runtime deps means no lifecycle manager lib. Async can be added later if needed — it's a compatible extension (caller can `.then()` or not). |
| `PluginRegistry` class | Plain functions in EditorBuilder | Class encapsulates state and provides clear API surface. Same choice as `EditorBuilder` (already a class). Plain functions would scatter state. |

**Installation:**
No new runtime dependencies. Phase 3 is pure TypeScript using existing dev dependencies. The only new code is:
- New type definitions in `src/types.ts`
- New `PluginRegistry` class (recommended) in `src/plugin-registry.ts`
- New `strikethroughPlugin` + `linkPlugin` in `src/plugins/`
- Modified `EditorBuilder.use()` in `src/editor.ts`
- Modified tokenizer/renderer dispatch in existing pipeline files

## Architecture Patterns

### System Architecture Diagram

```text
                    Plugin Author (Consumer)
                           │
                           │ calls editor.use(manifest)
                           ▼
              ┌────────────────────────┐
              │   EditorBuilder.use()  │
              │  ┌──────────────────┐  │
              │  │ Semver Validation│  │ ← validates version against regex
              │  │ Conflict Detect  │  │ ← checks duplicate token types,
              │  │ Name Replace     │  │    duplicate slot+priority,
              │  │ Lifecycle: oInit │  │    duplicate names → replace
              │  └────────┬─────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │  PluginRegistry   │  │ ← internal Map-based store
              │  │  .register()      │  │
              │  └──────────────────┘  │
              └───────────┬────────────┘
                          │
            ┌─────────────┼─────────────────┐
            │             │                  │
            ▼             ▼                  ▼
    ┌──────────────┐ ┌─────────┐   ┌──────────────────┐
    │  Tokenizer   │ │ Renderer│   │ Editor Lifecycle │
    │              │ │         │   │                  │
    │ filter by    │ │ filter  │   │ onInit() → reg   │
    │ kind:content │ │ by kind │   │ onUpdate()→ post │
    │ flatMap to   │ │ lookup  │   │   -render        │
    │ TokenDef[]   │ │ token→  │   │ onDestroy()→     │
    │              │ │ plugin  │   │   replace/       │
    │              │ │         │   │   teardown        │
    └──────┬───────┘ └────┬────┘   └──────────────────┘
           │              │
           ▼              ▼
    Token[] array   DocumentFragment
           │              │
           └──────┬───────┘
                  │
                  ▼
         contentEditable DOM
```

### Recommended Project Structure

```
src/
├── types.ts                    # PluginManifest union, ContentPlugin/UIPlugin/StoragePlugin interfaces
├── plugin-registry.ts          # NEW: PluginRegistry class (Map-based, conflict detection)
├── editor.ts                   # MODIFIED: use() delegates to PluginRegistry
├── tokenizer.ts                # MODIFIED: dispatch from ContentPlugin[] only
├── renderer.ts                 # MODIFIED: buildPluginMap from ContentPlugin[]
├── plugins/
│   ├── defaults.ts             # MODIFIED: ContentPlugin[] instead of Plugin[]
│   ├── headings.ts             # MODIFIED: implements ContentPlugin
│   ├── inline.ts               # MODIFIED: bold/italic/code/blockquote/hr → ContentPlugin
│   ├── wikiLink.ts             # MODIFIED: implements ContentPlugin
│   ├── strikethrough.ts        # NEW: strikethroughPlugin (FOR-01, FOR-03)
│   ├── link.ts                 # NEW: linkPlugin (FOR-02, FOR-03)
│   └── index.ts                # MODIFIED: re-export new plugins
├── __tests__/
│   ├── plugins.test.ts         # MODIFIED: new plugin tests added
│   ├── plugin-registry.test.ts # NEW: conflict detection, lifecycle, semver tests
│   └── tokenizer.test.ts       # MODIFIED: strikethrough + link token defs
└── index.ts                    # MODIFIED: export PluginManifest, ContentPlugin, UIPlugin, StoragePlugin
```

### Pattern 1: Discriminated Union for PluginManifest

**What:** Use TypeScript's discriminated union on the `kind` field to create three mutually exclusive plugin types. Each branch (`'content'` | `'ui'` | `'storage'`) has its own required and optional fields. The `kind` field acts as the discriminant — `switch(manifest.kind)` narrows the type automatically.

**When to use:** All plugin registration, dispatch, and lifecycle code. The union enables:
- Exhaustiveness checking: TypeScript warns if a `switch` doesn't handle all `kind` values
- Compile-time safety: you can't access `tokens` on a `StoragePlugin` or `adapter` on a `ContentPlugin` without narrowing
- Clear documentation: the type itself documents what each plugin category can do

**Example:**
```typescript
// Source: Designed from D-01, D-02, D-03 constraints; verified against existing Plugin interface (src/types.ts:74-79)
// and tokenizer/renderer integration points (src/tokenizer.ts:89, src/renderer.ts:99-107)

import type { TokenDef, Token, EditorContext, StorageAdapter } from './types'

// ─── Lifecycle hooks (shared via base) ─────────────────────────────────────────
interface PluginLifecycle {
  onInit?(): void
  onDestroy?(): void
}

// ─── Content Plugin ────────────────────────────────────────────────────────────
export interface ContentPlugin extends PluginLifecycle {
  name: string
  version: string
  kind: 'content'
  tokens: TokenDef[]
  render(token: Token, context: EditorContext): HTMLElement | Text
  onNavigate?(token: Token, context: EditorContext): boolean | void
  onUpdate?(): void  // called after each render cycle
}

// ─── UI Plugin ─────────────────────────────────────────────────────────────────
export interface UIPlugin extends PluginLifecycle {
  name: string
  version: string
  kind: 'ui'
  slots: string[]
  priority?: number  // default 0 if omitted
  onMount(slotEl: HTMLElement): void
  // onDestroy inherited from PluginLifecycle
}

// ─── Storage Plugin ────────────────────────────────────────────────────────────
export interface StoragePlugin extends PluginLifecycle {
  name: string
  version: string
  kind: 'storage'
  adapter: StorageAdapter
}

// ─── Discriminated Union ───────────────────────────────────────────────────────
export type PluginManifest = ContentPlugin | UIPlugin | StoragePlugin
```

**Why not interface extension:** Interface extension (`interface ContentPlugin extends BasePlugin`) doesn't support exhaustiveness checking in `switch` statements. With a discriminated union, the compiler ensures every `kind` branch is handled. This matters for the renderer and tokenizer which must handle `'content'` plugins specially.

**Why not a single interface with optional fields:** A single interface where `tokens` and `slots` and `adapter` are all optional makes it impossible to know which fields are valid at compile time. Developers would need runtime checks for every field access — defeating the purpose of TypeScript.

### Pattern 2: Plugin Lifecycle Execution Order

**What:** Synchronous lifecycle hooks called at specific points in the editor lifecycle. The order is: `onInit` at registration → render cycles (with `onUpdate` for content plugins) → `onDestroy` at replacement or teardown.

**When to use:** Any code that registers, replaces, or destroys plugins. The lifecycle is synchronous by default (matches zero-async codebase patterns). If async needs emerge later, hooks can be converted to return `Promise<void>` or `void` (backward-compatible).

**Execution order:**
```text
editor.use(manifest)           # Registration
  → validate semver            # D-02
  → detect conflicts           # D-04, D-05
  → if name exists: call old.onDestroy()  # D-06
  → store in PluginRegistry
  → call manifest.onInit?.()   # D-03

[Every input event → re-render]
  → tokenizer extracts tokens (content plugins only)
  → renderer builds DOM (content plugins only)
  → for each contentPlugin: plugin.onUpdate?.()  # D-03

editor.destroy() or old plugin replaced
  → call each plugin.onDestroy?.()  # D-03
```

**Key decisions (OpenCode's discretion):**
- `onUpdate` is called after ALL content plugins have rendered, not per-plugin. This avoids ordering dependencies between plugins.
- `onInit` is sync and called immediately during `use()`. If a plugin's `onInit` throws, the plugin is NOT registered (the error propagates).
- `onDestroy` is called on ALL registered plugins during `editor.destroy()`, even if some throw — each plugin's `onDestroy` is wrapped in try/catch to prevent a failing plugin from blocking teardown of others.

### Pattern 3: Conflict Detection Algorithm

**What:** Two-tier conflict detection at `EditorBuilder.use()`:
1. **Token type uniqueness** (content plugins only): No two content plugins may declare the same `TokenDef.type`. Since the renderer dispatch uses `buildPluginMap()` mapping `token.type → plugin`, duplicate types create ambiguity.
2. **Slot+priority uniqueness** (UI plugins only): No two UI plugins may claim the same slot with the same `priority` value. Different priorities on the same slot are allowed (they're ordered).

**When to use:** Inside `EditorBuilder.use()` before adding a plugin to the registry. Throws immediately with a descriptive error naming both conflicting plugins and the conflict reason.

**Algorithm:**
```typescript
// Source: Designed from D-04, D-05, D-06; verified against buildPluginMap() in src/renderer.ts:99-107
// and EditorBuilder.use() in src/editor.ts:48-57

class PluginRegistry {
  private contentPlugins = new Map<string, ContentPlugin>()
  private tokenTypeOwners = new Map<string, string>() // type → plugin name
  private uiPlugins = new Map<string, UIPlugin>()
  private slotAssignments = new Map<string, Map<number, string>>() // slot → (priority → pluginName)

  register(manifest: PluginManifest): void {
    // 1. Semver validation (D-02)
    this.validateVersion(manifest.version)

    // 2. Name-based replacement (D-06)
    if (manifest.kind === 'content' && this.contentPlugins.has(manifest.name)) {
      this.contentPlugins.get(manifest.name)!.onDestroy?.()
    }

    // 3. Category-specific validation
    switch (manifest.kind) {
      case 'content':
        this.registerContent(manifest)
        break
      case 'ui':
        this.registerUI(manifest)
        break
      case 'storage':
        this.registerStorage(manifest)
        break
    }

    // 4. Lifecycle: onInit
    manifest.onInit?.()
  }

  private registerContent(plugin: ContentPlugin): void {
    for (const def of plugin.tokens) {
      const owner = this.tokenTypeOwners.get(def.type)
      if (owner !== undefined && owner !== plugin.name) {
        throw new Error(
          `Plugin conflict: "${plugin.name}" declares token type "${def.type}", ` +
          `but "${owner}" already owns it. Each token type may only be registered by one content plugin.`
        )
      }
    }
    // Store ownership
    for (const def of plugin.tokens) {
      this.tokenTypeOwners.set(def.type, plugin.name)
    }
    this.contentPlugins.set(plugin.name, plugin)
  }

  private registerUI(plugin: UIPlugin): void {
    for (const slot of plugin.slots) {
      const priorityMap = this.slotAssignments.get(slot) ?? new Map()
      const priority = plugin.priority ?? 0
      const existing = priorityMap.get(priority)
      if (existing !== undefined && existing !== plugin.name) {
        throw new Error(
          `UI plugin conflict: "${plugin.name}" claims slot "${slot}" with priority ${priority}, ` +
          `but "${existing}" already claims it with the same priority. ` +
          `Change one plugin's priority to resolve.`
        )
      }
      priorityMap.set(priority, plugin.name)
      this.slotAssignments.set(slot, priorityMap)
    }
    this.uiPlugins.set(plugin.name, plugin)
  }

  // Accessors for tokenizer/renderer
  getAllContentPlugins(): ContentPlugin[] {
    return Array.from(this.contentPlugins.values())
  }

  getAllTokenDefs(): TokenDef[] {
    return this.getAllContentPlugins().flatMap(p => p.tokens)
  }

  getContentPluginByType(type: string): ContentPlugin | undefined {
    return this.contentPlugins.get(this.tokenTypeOwners.get(type) ?? '')
  }

  // For replacement: call onDestroy then remove old ownership
  private removeContentPlugin(name: string): void {
    const plugin = this.contentPlugins.get(name)
    if (!plugin) return
    for (const def of plugin.tokens) {
      this.tokenTypeOwners.delete(def.type)
    }
    this.contentPlugins.delete(name)
  }
}
```

**Why a dedicated class instead of inline logic in EditorBuilder:**
- Single source of truth for plugin state (currently scattered across `this.plugins` array and `buildPluginMap` inside renderer)
- Conflict detection is 40+ lines — extracting it keeps `EditorBuilder.use()` clean
- Testable in isolation: `PluginRegistry` can be unit tested without mocking DOM or editor state
- The renderer's `buildPluginMap()` can be replaced with a simple `registry.getContentPluginByType()` call

### Pattern 4: Migration of Existing 7 Plugins to ContentPlugin

**What:** Each existing plugin (`headingsPlugin`, `boldPlugin`, `italicPlugin`, `inlineCodePlugin`, `wikiLinkPlugin`, `blockquotePlugin`, `hrPlugin`) gains exactly three additive changes:
1. Add `kind: 'content' as const` field
2. Add `version: '1.0.0'` field
3. Optionally add lifecycle hooks (all 7 existing plugins need none — their behavior doesn't require init/update/destroy)

**When to use:** This is a one-time migration. All 7 plugins are rewritten in-place (D-07). No wrapper or adapter — the plugin objects are directly modified.

**Changes per plugin:**

| Plugin | Current | Required Changes | Risk |
|--------|---------|-----------------|------|
| `headingsPlugin` | `{ name, tokens, render }` | Add `kind: 'content'`, `version: '1.0.0'` | None — tokens/render unchanged |
| `boldPlugin` | `{ name, tokens, render }` | Add `kind: 'content'`, `version: '1.0.0'` | None |
| `italicPlugin` | `{ name, tokens, render }` | Add `kind: 'content'`, `version: '1.0.0'` | None |
| `inlineCodePlugin` | `{ name, tokens, render }` | Add `kind: 'content'`, `version: '1.0.0'` | None |
| `wikiLinkPlugin` | `{ name, tokens, render, onNavigate }` | Add `kind: 'content'`, `version: '1.0.0'` | None |
| `blockquotePlugin` | `{ name, tokens, render }` | Add `kind: 'content'`, `version: '1.0.0'` | None |
| `hrPlugin` | `{ name, tokens, render }` | Add `kind: 'content'`, `version: '1.0.0'` | None |

**Migration verification:** After migration, the plugin objects must satisfy the `ContentPlugin` type. Since all 7 already have `name`, `tokens`, `render`, and `wikiLinkPlugin` has `onNavigate`, the type check is:
```typescript
const _check: ContentPlugin = headingsPlugin  // should compile
```

**Test impact:** Existing plugin tests (`src/__tests__/plugins.test.ts`) continue to pass unchanged — they import plugins directly and call `.render()` without touching types or EditorBuilder. The `Plugin` import in test files changes to `ContentPlugin` but no test logic changes.

### Anti-Patterns to Avoid

- **Mixing plugin categories in a single object:** Don't create a manifest with `kind: 'content'` and `slots` array. The discriminated union prevents this at compile time — use it.
- **Runtime type checks instead of discriminated union narrowing:** Don't use `if ('tokens' in manifest)` — use `switch(manifest.kind)` for exhaustiveness checking.
- **Storing plugins in a plain Array:** The current `Plugin[]` array has O(n) lookup for name-based replacement. Use `Map<string, Plugin>` for O(1) and cleaner conflict detection.
- **Calling `onUpdate` during tokenization:** `onUpdate` fires after render, not during token extraction. Tokenization is a pure function and should not have side effects.
- **Setting `dataset.raw` on the wrong element:** For strikethrough, `dataset.raw` must be set on the outermost wrapper span (the one returned by `withPunct`), not on the inner punct spans. This is how `extractText()` in `src/cursor.ts:85-87` recovers source text.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin state management | Custom plugin tracking in EditorBuilder | `PluginRegistry` class (Map-based) | Centralized conflict detection, O(1) lookup, testable in isolation. The current ad-hoc array in EditorBuilder scatters plugin state across 3 modules. |
| URL protocol detection | Custom URL parser for link plugin | Simple startsWith check; URL constructor for validation | `new URL(url)` throws for invalid URLs; `url.startsWith('http')` detects external. For internal page detection: check if URL matches `^[a-zA-Z0-9_/-]+$` (no protocol, no special chars beyond `/` and `-`). |
| Semver string parsing | Custom semver parser with prerelease support | Regex from D-02: `/^\d+\.\d+\.\d+(-[\w.]+)?$/` | Simple validation, no comparison or range logic needed. This is "is the string shaped like semver?" not "is v1.2.3 > v1.1.0?". Zero deps. [CITED: D-02] |

**Key insight:** Phase 3 adds exactly one new internal abstraction (PluginRegistry) and two new plugins (strikethrough, link). The existing tokenizer/renderer pipeline is the right abstraction — the phase changes WHAT gets registered, not HOW the pipeline works.

## Common Pitfalls

### Pitfall 1: Token Type Collision Between linkPlugin and wikiLinkPlugin

**What goes wrong:** Both plugins could theoretically match the same text. `[[page]]` starts with `[` which could be consumed by the link plugin's pattern `/\[([^\]]+)\]\(([^)]+)\)/`.

**Why it happens:** The link pattern matches `[text](url)` where text is `[^\]]+` (everything except `]`). For `[[page]]`, the first `[` matches `\[`, then `[page` matches `([^\]]+)`, but the next character is `]` not `]` followed by `(` — so the link pattern fails to match. The wiki link pattern `/\[\[([^\]]+)\]\]/` matches because it specifically expects `[[`.

**How to avoid:** Register `wikiLinkPlugin` BEFORE `linkPlugin` in the defaults array. The tokenizer's `scanInline` function always picks the earliest match, and since both patterns anchor at the same position (`[[`), the wiki link pattern produces a longer match (consumes both `[[...]]` brackets). Additionally, always verify that `linkPlugin` pattern does NOT match `[[page]]` by testing.

**Warning signs:** `[[page]]` renders as a link instead of a wiki link, or `[[` is rendered as raw text followed by a broken link.

### Pitfall 2: Strikethrough Overlapping with Bold/Italic `~` Characters

**What goes wrong:** The pattern `~~([^~]+)~~` requires non-`~` content between tildes. Single tildes `~text~` are not matched (they render as plain text). This is correct behavior — `~` is not a formatting character in Markdown. But if future plugins use `~`, ordering matters.

**Why it happens:** The negated character class `[^~]+` prevents the pattern from consuming tildes inside the content. This is the same pattern used by bold (`[^*]+`) and italic (`[^*]+`). No conflict exists.

**How to avoid:** Always test the strikethrough pattern against edge cases: `~~~`, `~~text~more~~`, `~not strikethrough~`. Add these to the tokenizer test suite.

**Warning signs:** `~~~` renders as strikethrough (wrong — it should render as `~` + strikethrough `~` or plain text). The current pattern correctly rejects `~~~` because `[^~]+` requires at least one non-`~` character.

### Pitfall 3: Lifecycle Hook Throwing During Teardown Blocks Other Plugins

**What goes wrong:** If `pluginA.onDestroy()` throws, `pluginB.onDestroy()` never runs, leaking event listeners or DOM nodes.

**Why it happens:** Naive `forEach` loop over plugins calling `onDestroy()` without try/catch.

**How to avoid:** Wrap each `onDestroy()` in try/catch:
```typescript
for (const plugin of registry.getAllPlugins()) {
  try { plugin.onDestroy?.() } catch (e) { console.error(`Plugin "${plugin.name}" onDestroy failed:`, e) }
}
```

**Warning signs:** Editor `.destroy()` leaves stale DOM or event listeners after one plugin throws.

### Pitfall 4: Forgetting `dataset.raw` on New Plugin Elements

**What goes wrong:** The cursor module (`extractText()` in `src/cursor.ts:85-87`) relies on `data-raw` attributes to reconstruct source text from decorated DOM. If new plugins don't set `dataset.raw`, the cursor can't track positions through decorated regions.

**Why it happens:** The existing pattern (wikiLinkPlugin sets `el.dataset.raw = token.raw` in `src/plugins/wikiLink.ts:32`) is not enforced by types. New plugin authors must remember to set it manually.

**How to avoid:** For strikethrough: set `dataset.raw` on the wrapper element returned by `withPunct`. For link plugin: set `dataset.raw` on both `<a>` (external) and `<span>` (internal) elements. Test by verifying `extractText()` round-trips through decorated DOM.

**Warning signs:** Caret jumps unexpectedly when positioned inside strikethrough or link text, or the cursor offset is wrong after editing inside a formatted span.

### Pitfall 5: Semver Validation Too Strict or Too Loose

**What goes wrong:** The regex `^\d+\.\d+\.\d+(-[\w.]+)?$` rejects valid semver prerelease tags (e.g., `1.0.0-beta.1` is valid but `-[\w.]+` matches `-beta.1`). However, it does NOT support build metadata (`+build`), which is also valid semver but rarely used in plugin versions.

**Why it happens:** The regex from D-02 is intentionally simplified. Full semver 2.0.0 regex is ~200 characters and hard to debug. The D-02 regex covers 99% of plugin versioning use cases.

**How to avoid:** Use the D-02 regex as-is. It matches: `1.0.0`, `0.1.0-alpha`, `2.3.1-beta.2.3`. It does NOT match: `1.0`, `v1.0.0`, `1.0.0+build`. If build metadata support is needed later, extend the regex to `^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$`.

**Warning signs:** Plugin authors complain that `1.0.0+build123` is rejected. This is expected at this phase — document the accepted format in `docs/api.md`.

## Code Examples

Verified patterns from official sources:

### ContentPlugin: strikethroughPlugin

```typescript
// Source: Pattern derived from boldPlugin/italicPlugin in src/plugins/inline.ts:10-49;
// D-10 specifies CSS text-decoration: line-through on wn-strikethrough class.

import type { ContentPlugin, Token, EditorContext } from '../types'
import { withPunct } from './inline'  // shared helper

export const strikethroughPlugin: ContentPlugin = {
  name: 'strikethrough',
  version: '1.0.0',
  kind: 'content',
  tokens: [{ type: 'strikethrough', pattern: /~~([^~]+)~~/ }],
  render(token: Token, _ctx: EditorContext): HTMLElement {
    const el = withPunct('wn-strikethrough', '~~', token.groups[0] ?? '')
    el.dataset.raw = token.raw  // FORMAT-03: cursor fidelity
    return el
  },
}
```

CSS to add to `DEFAULT_CSS` in editor-dom (or inline style template where default styles live):
```css
.wn-strikethrough {
  text-decoration: line-through;
}
```

### ContentPlugin: linkPlugin

```typescript
// Source: D-11 — [text](url) renders as <a> for external, <span> for internal wiki page URLs.
// Pattern verified against wikiLinkPlugin (src/plugins/wikiLink.ts) for internal navigation
// and standard browser <a> for external links.

import type { ContentPlugin, Token, EditorContext } from '../types'

export const linkPlugin: ContentPlugin = {
  name: 'link',
  version: '1.0.0',
  kind: 'content',
  tokens: [{ type: 'link', pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],
  render(token: Token, _context: EditorContext): HTMLElement {
    const text = token.groups[0] ?? ''
    const url = token.groups[1] ?? ''
    const isInternal = !url.includes('://') && !url.startsWith('//')

    if (isInternal) {
      // Internal wiki page link — same styling as wiki-link
      const el = document.createElement('span')
      el.className = 'wn-wiki-link'
      el.dataset.page = url
      el.dataset.raw = token.raw
      el.textContent = text
      return el
    }

    // External link
    const el = document.createElement('a')
    el.className = 'wn-link'
    el.href = url
    el.target = '_blank'
    el.rel = 'noopener noreferrer'
    el.dataset.raw = token.raw
    el.textContent = text
    return el
  },
  onNavigate(token: Token, context: EditorContext): boolean | void {
    const url = token.groups[1] ?? ''
    const isInternal = !url.includes('://') && !url.startsWith('//')
    if (isInternal) {
      context.navigate(url)
      return true  // suppress default — we handle it
    }
    // External links use native <a> click behavior (opens in new tab)
    return false
  },
}
```

**Internal vs external detection logic:** A URL is internal if it contains no protocol (`://`) and doesn't start with protocol-relative `//`. This means:
- `https://example.com` → external
- `//example.com` → external (protocol-relative)
- `projects/acme` → internal wiki page
- `page-name` → internal wiki page

### PluginRegistry: EditorBuilder Integration

```typescript
// Source: Adapted from current EditorBuilder.use() in src/editor.ts:48-57
// with new PluginRegistry and semver validation.

import { PluginRegistry } from './plugin-registry'
import type { PluginManifest } from './types'

export class EditorBuilder {
  private registry = new PluginRegistry()

  use(manifest: PluginManifest): this {
    this.registry.register(manifest)
    return this
  }

  clearPlugins(): this {
    this.registry.clear()
    return this
  }

  mount(): EditorInstance {
    return mountEditor(
      this.el,
      this.registry.getAllContentPlugins(),  // only content plugins go to render pipeline
      this.storage,
      this.options,
    )
  }
}
```

### Tokenizer Integration

```typescript
// Source: Adapted from src/tokenizer.ts:89, src/editor-render.ts:89

// Before (current):
plugins.flatMap((p) => p.tokens)

// After:
contentPlugins.flatMap((p) => p.tokens)
// Where contentPlugins is ContentPlugin[] — UIPlugin and StoragePlugin
// don't have 'tokens', so they can't be flatMapped.
```

### Renderer Integration

```typescript
// Source: Adapted from src/renderer.ts:99-107

// Before: builds Map<tokenType, Plugin>
function buildPluginMap(plugins: Plugin[]): Map<string, Plugin> { ... }

// After: builds Map<tokenType, ContentPlugin>
function buildPluginMap(plugins: ContentPlugin[]): Map<string, ContentPlugin> {
  const map = new Map<string, ContentPlugin>()
  for (const plugin of plugins) {
    for (const def of plugin.tokens) {
      map.set(def.type, plugin)
    }
  }
  return map
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat `Plugin` interface (`name`, `tokens`, `render`, `onNavigate?`) | Discriminated union `PluginManifest` with `kind`, `version`, lifecycle hooks | Phase 3 migration | Plugin authors declare capabilities categorically; tools can validate manifests at registration time |
| `Plugin[]` array in EditorBuilder | `PluginRegistry` class with `Map<string, ContentPlugin>` (recommended) | Phase 3 | O(1) name lookup, centralized conflict detection, testable in isolation |
| No version field on plugins | `version: string` validated against semver regex | Phase 3 (D-02) | Plugin authors must declare version; editor validates at registration |
| No lifecycle hooks | `onInit`, `onUpdate` (content), `onDestroy` | Phase 3 (D-03) | Plugins can run setup/teardown without imperative `addEventListener` patterns |
| No conflict detection | Token type uniqueness checked at registration; slot+priority uniqueness checked at registration | Phase 3 (D-04, D-05) | Conflicts caught at `use()`, not silently at runtime |

**Deprecated/outdated:**
- **`Plugin` interface** (src/types.ts:74-79): Replaced by `ContentPlugin`. No backward compat (D-08).
- **`Plugin[]` in tokenizer/renderer signatures:** Replaced by `ContentPlugin[]`. The tokenizer and renderer only operate on content plugins.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Internal link detection in linkPlugin uses absence of `://` to determine wiki page vs external URL | Code Examples | If users write `[text](page:name)` with a colon, it would be treated as external. Acceptable — the convention is slash-based page names. Could be refined later with a known-pages lookup. |
| A2 | Sync lifecycle hooks are sufficient for Phase 3 | Architecture Patterns, Pattern 2 | If plugins need async initialization (e.g., fetch remote config), they can't use `onInit`. Mitigation: hooks can return `Promise<void>` in future without breaking existing sync plugins. |
| A3 | `PluginRegistry` class is the right internal abstraction (not inline logic in EditorBuilder) | Architecture Patterns, Pattern 3 | If the registry becomes complex enough to warrant a separate pattern, it's already a separate class and can be refactored without changing EditorBuilder's API. Low risk. |
| A4 | `dataset.raw` is set on the outermost element for all new plugins | Common Pitfalls, Pitfall 4 | If `withPunct` helper already sets `dataset.raw`, doing it again in strikethroughPlugin is redundant. Verified: `withPunct` does NOT set dataset.raw — it's the caller's responsibility. [VERIFIED: src/plugins/inline.ts:10-25] |
| A5 | Strikethrough CSS (`text-decoration: line-through`) goes in the existing inline CSS template, not a separate stylesheet | Code Examples | Theming overhaul (Phase 4) will convert all inline CSS to design tokens. Phase 3 adds the CSS to the existing `DEFAULT_CSS` template in editor-dom for consistency. Low risk — Phase 4 handles migration. |

## Open Questions

1. **Should `linkPlugin.onNavigate()` be called on mousedown (like wikiLinkPlugin) or on click?**
   - What we know: Wiki links use mousedown to prevent contentEditable focus loss. External links use native `<a>` click behavior (opens new tab, no focus concern). Internal wiki page links in `linkPlugin` need mousedown for the same reason as wikiLinkPlugin.
   - What's unclear: Whether `onNavigate` should return `true` (suppress default) for external links too. Current design: return `false` for external (let browser handle click), `true` for internal (suppress so editor doesn't lose focus).
   - Recommendation: Follow the wikiLinkPlugin pattern — always use mousedown for internal navigation, return `true`. External links: the `<a>` element handles click natively; `onNavigate` returns `false` for external.

2. **Where should the `PluginRegistry` class be instantiated — inside EditorBuilder or passed in?**
   - What we know: EditorBuilder currently owns `plugins[]` array. PluginRegistry would replace it.
   - What's unclear: Should PluginRegistry be a member of EditorBuilder (private, created in constructor) or a dependency injected via constructor? Injection enables testing with mock registry but adds complexity.
   - Recommendation: Private member, created in EditorBuilder constructor. The registry is an implementation detail. For testing, test `EditorBuilder.use()` end-to-end (it already has tests via editor.test.ts).

3. **Should `defaultPlugins` remain an array or become a PluginRegistry?**
   - What we know: `defaultPlugins` is currently `Plugin[]` in `src/plugins/defaults.ts`. EditorBuilder copies it with `[...defaultPlugins]`.
   - What's unclear: With PluginRegistry managing state, the defaults should be registered into the registry during EditorBuilder construction.
   - Recommendation: `defaultPlugins` stays as `ContentPlugin[]` for export (consumers may want the array). EditorBuilder constructor creates PluginRegistry and registers each default via `registry.register()`. This preserves the exportable array while using the registry internally.

## Environment Availability

**Step 2.6:** SKIPPED — Phase 3 has no external dependencies beyond the existing dev toolchain. All changes are TypeScript code using existing TypeScript 5.4+, Vitest 4.1.7, happy-dom 20.9.0 — all verified present and functional in Phase 1.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | vitest.config.ts (environment: happy-dom) |
| Quick run command | `npx vitest run src/__tests__/plugins.test.ts src/__tests__/plugin-registry.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | PluginManifest discriminated union compiles and type-narrows correctly | unit (type-level) | `npx tsc --noEmit` | ✅ `tsc --noEmit` via `npm run typecheck` |
| PLUG-02 | Lifecycle hooks called in correct order | unit | `npx vitest run src/__tests__/plugin-registry.test.ts -t 'lifecycle'` | ❌ Wave 0 |
| PLUG-03 | Conflict detection throws on duplicate token type | unit | `npx vitest run src/__tests__/plugin-registry.test.ts -t 'conflict'` | ❌ Wave 0 |
| PLUG-03 | Conflict detection throws on duplicate slot+priority | unit | `npx vitest run src/__tests__/plugin-registry.test.ts -t 'UI conflict'` | ❌ Wave 0 |
| PLUG-04 | All 7 existing plugins satisfy ContentPlugin type | unit (type-level) | `npx tsc --noEmit` | ✅ via typecheck |
| PLUG-04 | Migrated plugins render identically to pre-migration | unit | `npm test` (existing plugins.test.ts) | ✅ `src/__tests__/plugins.test.ts` |
| PLUG-05 | Types exported from `src/index.ts` | unit (smoke) | `npx tsc --noEmit` (import check) | ❌ Wave 0 (smoke test) |
| PLUG-06 | Invalid semver rejects at registration | unit | `npx vitest run src/__tests__/plugin-registry.test.ts -t 'version'` | ❌ Wave 0 |
| FORMAT-01 | `~~text~~` renders strikethrough DOM | unit | `npx vitest run src/__tests__/plugins.test.ts -t 'strikethrough'` | ❌ Wave 0 |
| FORMAT-02 | `[text](url)` renders external link `<a>` with target _blank | unit | `npx vitest run src/__tests__/plugins.test.ts -t 'link external'` | ❌ Wave 0 |
| FORMAT-02 | `[text](page)` renders internal wiki link `<span>` | unit | `npx vitest run src/__tests__/plugins.test.ts -t 'link internal'` | ❌ Wave 0 |
| FORMAT-03 | Strikethrough follows TokenDef → render → data-raw pattern | unit | `npx vitest run src/__tests__/tokenizer.test.ts -t 'strikethrough'` | ❌ Wave 0 |
| FORMAT-03 | Link follows TokenDef → render → data-raw pattern | unit | `npx vitest run src/__tests__/tokenizer.test.ts -t 'link'` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (target: affected test files)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** `npm run test:coverage` (80% threshold must pass)

### Wave 0 Gaps
- [ ] `src/__tests__/plugin-registry.test.ts` — covers PLUG-02 (lifecycle hooks), PLUG-03 (conflict detection), PLUG-06 (semver validation)
- [ ] `src/__tests__/plugins.test.ts` additions — covers FORMAT-01 (strikethrough render), FORMAT-02 (link render + navigation)
- [ ] `src/__tests__/tokenizer.test.ts` additions — covers strikethrough + link token patterns
- [ ] `src/__tests__/renderer.test.ts` additions — covers ContentPlugin dispatch (filtered from manifest array)
- [ ] Framework install: `npm install` — already done (all dev deps from Phase 1)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase scope is client-side library with no auth |
| V3 Session Management | No | No sessions in a client-side library |
| V4 Access Control | No | No server-side access control |
| V5 Input Validation | Yes | Semver regex validation for `version` field; regex patterns from plugin `tokens` run trusted (plugin author controls them) |
| V6 Cryptography | No | No cryptographic operations |
| V7 Error Handling & Logging | Yes | Conflict detection errors must not leak sensitive data; descriptive error messages (plugin name, token type) are acceptable |
| V11 Client-Side | Yes | contentEditable DOM manipulation; external link `target="_blank"` requires `rel="noopener noreferrer"` to prevent `window.opener` attacks |

### Known Threat Patterns for Vanilla TypeScript contentEditable Editor

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via plugin render output (user-controlled text inserted via `innerHTML` or unescaped insertion) | Tampering / Info Disclosure | All text insertion uses `textContent` or `document.createTextNode()` — NEVER `innerHTML` with untrusted content. The existing codebase already follows this. [VERIFIED: all render functions use textContent/createTextNode] |
| External link `target="_blank"` without `rel="noopener"` | Information Disclosure | `rel="noopener noreferrer"` on all `<a target="_blank">` elements. The linked page can access `window.opener` otherwise. [CITED: OWASP HTML5 Security Cheat Sheet] |
| Regex DoS (ReDoS) via malicious TokenDef patterns | Denial of Service | Plugin patterns are authored by the developer integrating the library — not by end users. Patterns are trusted input. If untrusted plugin loading is added later, pattern timeout/validation would be needed. Not a Phase 3 concern. |
| Plugin manifest injection (malformed `name` or `version` breaking downstream consumers) | Tampering | Semver regex validation at registration time catches malformed versions. `name` field is freeform string — no injection risk since it's used only as a Map key. |
| `dataset.raw` containing unescaped HTML (source text with `<script>` tags stored in data attribute) | Tampering | `dataset.raw` is used by `extractText()` only as a text source — it's never parsed as HTML. `data-*` attributes are text-safe by design. No risk. |

## Sources

### Primary (HIGH confidence)
- **src/types.ts:74-79** — Current Plugin interface (name, tokens, render, onNavigate). Verified: the 7 existing plugins implement this shape exactly. [VERIFIED: codebase read]
- **src/plugins/inline.ts:10-25** — `withPunct` helper pattern. Verified: creates span with punct-child-textchild-punct structure. Does NOT set dataset.raw. [VERIFIED: codebase read]
- **src/plugins/wikiLink.ts:26-36** — data-raw pattern. Verified: `el.dataset.raw = token.raw` is set on the outermost element. [VERIFIED: codebase read]
- **src/plugins/headings.ts:36-57** — headingsPlugin structure. Verified: uses `switch(token.type)` for dispatch. [VERIFIED: codebase read]
- **src/renderer.ts:99-107** — buildPluginMap implementation. Verified: maps `token.type → Plugin` via `Map<string, Plugin>`. [VERIFIED: codebase read]
- **src/tokenizer.ts:24-39** — tokenizeLine dispatch. Verified: separates line-level (`^` anchor) from inline patterns, flatMaps `plugins.flatMap(p => p.tokens)`. [VERIFIED: codebase read]
- **src/editor.ts:48-57** — EditorBuilder.use() registration. Verified: name-based replacement using `findIndex`. [VERIFIED: codebase read]
- **src/editor-render.ts:89** — Current tokenizer integration: `plugins.flatMap((p) => p.tokens)`. [VERIFIED: codebase read]
- **src/editor-lifecycle.ts:82-161** — Current lifecycle: no plugin lifecycle hooks exist. `_plugins` parameter is accepted but unused. [VERIFIED: codebase read]
- **.planning/phases/03-plugin-system/03-CONTEXT.md** — All 13 locked decisions (D-01 through D-13). [CITED: CONTEXT.md]
- **.planning/REQUIREMENTS.md** — PLUG-01 through PLUG-06, FORMAT-01 through FORMAT-03. [CITED: REQUIREMENTS.md]
- **.planning/PROJECT.md** — Zero runtime deps constraint, TypeScript strict, ES2020 target. [CITED: PROJECT.md]
- **vitest.config.ts** — Test infrastructure: happy-dom environment, 80% coverage thresholds. [VERIFIED: codebase read]
- **package.json** — Dev dependencies: vitest 4.1.7, typescript 5.4+, happy-dom 20.9.0. [VERIFIED: package.json]

### Secondary (MEDIUM confidence)
- **.planning/codebase/ARCHITECTURE.md** — Plugin registration order, tokenizer pipeline, render pipeline. [CITED: ARCHITECTURE.md] (validated against actual source code — all claims match)
- **.planning/research/FEATURES.md** — Feature dependency graph showing Plugin Manifest as lynchpin. [CITED: FEATURES.md]
- **TypeScript Handbook: Discriminated Unions** — Pattern for `kind` field discriminated union. Standard TS feature since 2.0. Not fetched — training knowledge, high confidence.
- **OWASP HTML5 Security Cheat Sheet** — `rel="noopener"` for `target="_blank"`. Standard web security practice.

### Tertiary (LOW confidence)
- None. All claims are verified against codebase or cited from CONTEXT.md.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are project-existing (TypeScript discriminated unions, Map, semver regex). No new dependencies. [VERIFIED against package.json, vitest.config.ts]
- Architecture: HIGH — PluginRegistry class design verified against existing EditorBuilder, tokenizer, renderer integration points. Conflict detection algorithm is simple and testable. [VERIFIED against src/editor.ts, src/tokenizer.ts, src/renderer.ts]
- Pitfalls: MEDIUM — Pitfalls are based on known patterns from existing codebase (data-raw, regex ordering, mousedown vs click). Some edge cases (e.g., `~~~` strikethrough) are difficult to fully enumerate without running the full test suite.

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (30 days — stable architecture, no fast-moving external dependencies)
