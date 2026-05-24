# Architecture Research

**Domain:** Extensible inline Markdown/WYSIWYG editor library (browser, vanilla TypeScript)
**Researched:** 2026-05-23
**Confidence:** HIGH

## Standard Architecture

### System Overview

Extensible editor libraries converge on a **layered architecture with a plugin manager at the center**. The pattern is:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PUBLIC API LAYER                              │
│  createEditor(config) → EditorBuilder → .use(p) → .mount()           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐     │
│  │ Editor Core  │   │  Plugin Manager  │   │  Theme Manager   │     │
│  │ (lifecycle,  │◄──┤  (registration,  │──►│  (CSS variables, │     │
│  │  state, DOM) │   │   dispatch,      │   │   injection,     │     │
│  │              │   │   manifests)     │   │   overrides)     │     │
│  └──────┬───────┘   └────────┬─────────┘   └──────────────────┘     │
│         │                    │                                        │
│         │           ┌────────┴─────────┐                             │
│         │           │  Plugin Types     │                             │
│         │           ├──────────────────┤                             │
│         │           │ Content (blocks) │──► Tokenizer/Renderer       │
│         │           │ UI (overlays)    │──► DOM mounting slots       │
│         │           │ Storage (backends│──► Persistence adapter      │
│         │           └──────────────────┘                             │
│         │                    │                                        │
├─────────┴────────────────────┴──────────────────────────────────────┤
│                       CORE PIPELINE                                   │
│  contentEditable → extractText → tokenize → renderDOM → setCaret    │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ Text     │   │ Tokenizer│   │ Renderer │   │ Caret    │         │
│  │ Extractor│──►│ (regex,  │──►│ (DOM     │──►│ Manager  │         │
│  │ (DOM→str)│   │  ordered)│   │  builder)│   │ (restore)│         │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘         │
├──────────────────────────────────────────────────────────────────────┤
│                      CROSS-CUTTING                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐     │
│  │ Navigation │ │ Persistence│ │ URL Sync   │ │ Event Bus    │     │
│  │ (trail,    │ │ (debounce, │ │ (path=)    │ │ (hooks,      │     │
│  │  page load)│ │  world)    │ │            │ │  callbacks)  │     │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Editor Core** | Owns editor lifecycle (mount, destroy), root DOM construction, global state (world, trail, active page). Orchestrates the input pipeline. | Class with create/destroy. TipTap: `Editor` class. ProseMirror: `EditorView` + `EditorState`. Obsidian: `Plugin` class with `onload`/`onunload`. |
| **Plugin Manager** | Plugin registration, manifest validation, dispatch to relevant pipelines, lifecycle callbacks. Owns the plugin registry (ordered, keyed by name). | TipTap: `ExtensionManager` (internal). ProseMirror: `EditorState.plugins` array. Plate: `createPlatePlugin` + `extend` chain. Obsidian: imperative `this.register*()` calls in `onload`. |
| **Theme Manager** | CSS custom property injection, theme switch capability, scope isolation. Consumed by renderer and UI plugins. | CSS custom properties on `:root` or scoped container. Obsidian: CSS variables. TipTap: headless (zero styles on core extensions). ProseMirror: `prosemirror.css` stylesheet + `toDOM` specs. |
| **Text Extractor** | Walks contentEditable DOM, extracts plain text from TextNodes with special handling for `data-raw` attributes and `<br>` → `\n` conversion. | ProseMirror: `doc.textContent`. worldnotes: custom `extractText()`. |
| **Tokenizer** | Converts raw text into token arrays. Line-level patterns tested first, then inline patterns left-to-right, earliest match wins. Plugin-provided TokenDefs. | worldnotes: custom regex pipeline. TipTap: input rules + paste rules. ProseMirror: schema-based parsing. |
| **Renderer** | Converts token arrays into DOM fragments. Dispatches each token type to owning plugin's `render()`. Handles caret-in-token raw text fallback. | ProseMirror: `toDOM` on NodeSpec + decorations. TipTap: `renderHTML` on extensions + NodeViews. worldnotes: custom `renderLine()`. |
| **Caret Manager** | Records caret position before re-render, restores after. Handles offset math accounting for `data-raw` length differences. | ProseMirror: selection mapping through transactions. worldnotes: offset-based with fallback. |
| **Navigation Manager** | Trail array management, page loading, URL sync via `?path=` query param. Wiki link resolution. | worldnotes: custom. Obsidian: `app.workspace.activeLeaf.openFile()`. |
| **Persistence Manager** | Debounced async saves, in-memory world cache (read-through), storage adapter dispatch. | TipTap: no built-in. ProseMirror: no built-in (collab module separately). worldnotes: custom. |

## Recommended Project Structure

Based on the existing codebase and patterns from mature editor libraries, the refactored structure should be:

```
src/
├── index.ts              # Public API: createEditor, types, defaults
├── types.ts              # All public TypeScript interfaces (plugin contract)
│
├── core/                 # Editor lifecycle and state
│   ├── editor.ts         # Editor class: mount, destroy, orchestration
│   ├── state.ts          # EditorState: world, trail, activePage
│   └── context.ts        # EditorContext factory (read-only plugin access)
│
├── pipeline/             # Input → render pipeline (current tokenizer/renderer/cursor)
│   ├── extractor.ts      # extractText: contentEditable → raw string
│   ├── tokenizer.ts      # tokenizeDocument, tokenizeLine
│   ├── renderer.ts       # renderDocument, renderLine, buildPluginMap
│   └── caret.ts          # getCaretOffset, setCaretOffset
│
├── plugins/              # Plugin system infrastructure
│   ├── manager.ts        # PluginManager: register, validate, dispatch
│   ├── manifest.ts       # PluginManifest type + validation
│   ├── categories/       # Plugin type interfaces
│   │   ├── content.ts    # ContentPlugin: tokens + render + onNavigate
│   │   ├── ui.ts         # UIPlugin: mount/destroy + DOM container access
│   │   └── storage.ts    # StoragePlugin: implements StorageAdapter
│   ├── builtin/          # Built-in plugins (current plugins/)
│   │   ├── defaults.ts   # defaultPlugins ordering
│   │   ├── headings.ts
│   │   ├── inline.ts     # bold, italic, code, blockquote, hr
│   │   └── wikiLink.ts
│   └── index.ts          # Re-exports
│
├── storage/              # Persistence adapters
│   ├── adapter.ts        # StorageAdapter interface
│   ├── localStorage.ts
│   ├── indexedDB.ts
│   └── index.ts
│
├── navigation/           # Navigation and URL management
│   ├── trail.ts          # trail array management
│   ├── urlSync.ts        # encodePathSearch, decodePathSearch
│   └── wikiLink.ts       # parseWikiLink, pageDisplayName
│
├── theme/                # Theming system
│   ├── tokens.ts         # CSS custom property definitions
│   ├── injector.ts       # injectStyles, updateTheme, removeStyles
│   └── defaults.css.ts   # Default theme as template literal
│
├── dom/                  # DOM utilities
│   ├── builder.ts        # element creation helpers
│   └── events.ts         # Event delegation utilities
│
└── constants.ts          # DEFAULT_HOME, CSS class prefixes, etc.
```

### Structure Rationale

- **`core/`:** Editor lifecycle and state management separated from pipeline. Editor orchestrates but doesn't own tokenization/render logic. Matches ProseMirror's EditorView+EditorState separation.
- **`pipeline/`:** The existing tokenizer/renderer/cursor trio extracted from `editor.ts`. Pure functions with no editor state dependency (only need token defs + plugin map). Enables independent testing.
- **`plugins/manager.ts`:** Central registry handling all three plugin categories with uniform lifecycle. Plugin-by-name replacement preserved. Manifest validation lives here. Matches TipTap's ExtensionManager pattern.
- **`plugins/categories/`:** Each category has a distinct interface (ContentPlugin, UIPlugin, StoragePlugin). The manager dispatches to the appropriate pipeline based on category. Prevents category confusion.
- **`plugins/builtin/`:** Renamed from current `plugins/` to distinguish infrastructure from implementations. Built-in plugins are content plugins using the same interface consumers use.
- **`theme/`:** New module for design tokens. CSS custom properties defined as a typed object, injected into `<head>` with an idempotent check. Full theme replacement swaps the entire `<style>` block. Matches Obsidian's CSS variable approach — covers 80% via tokens, 20% via full replacement.
- **`navigation/`:** Extracted from editor.ts trail/URL logic. Pure functions for wiki link parsing, URL encoding/decoding. Stateful trail management separated.
- **`dom/`:** Trivial DOM helpers (createElement with attrs, class toggling) extracted from editor.ts to avoid duplicating element creation patterns.

## Architectural Patterns

### Pattern 1: Plugin Manager as Central Dispatcher

**What:** A single `PluginManager` class owns all plugin registration, validation, lifecycle, and dispatch. It is the authoritative source for "which plugins are active." The Editor Core delegates all plugin-related work to the manager.

**When to use:** When the system has multiple plugin categories that need different dispatch destinations (tokenizer vs DOM vs storage) but share registration/lifecycle concerns.

**Trade-offs:** A single manager is simpler than per-category registries but can become a god object. Mitigate with category-specific delegation methods (`dispatchTokens()`, `getStorageAdapters()`, etc.).

**Example (worldnotes-adapted):**
```typescript
class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private contentPlugins: ContentPlugin[] = [];
  private uiPlugins: UIPlugin[] = [];
  private storagePlugin: StoragePlugin | null = null;

  register(plugin: Plugin): void {
    // Validate manifest
    validateManifest(plugin.manifest);
    // Replace by name (existing behavior)
    this.plugins.set(plugin.manifest.name, plugin);
    this.categorize(plugin);
    // Fire lifecycle
    plugin.onInit?.();
  }

  private categorize(plugin: Plugin): void {
    if (isContentPlugin(plugin)) this.contentPlugins.push(plugin);
    if (isUIPlugin(plugin)) this.uiPlugins.push(plugin);
    if (isStoragePlugin(plugin)) this.storagePlugin = plugin;
  }

  getTokenDefs(): TokenDef[] {
    return this.contentPlugins.flatMap(p => p.manifest.tokens);
  }

  getPluginMap(): Map<string, Plugin> {
    return buildPluginMap(this.contentPlugins); // type → owning plugin
  }

  getStorageAdapter(): StorageAdapter {
    return this.storagePlugin?.createAdapter() ?? fallbackAdapter;
  }

  mountUI(container: HTMLElement): void {
    for (const ui of this.uiPlugins) {
      const slot = container.querySelector(`[data-plugin="${ui.manifest.name}"]`);
      if (slot) ui.onMount(slot);
    }
  }

  destroy(): void {
    for (const [_, plugin] of this.plugins) {
      plugin.onDestroy?.();
    }
  }
}
```

### Pattern 2: Declarative Plugin Manifests

**What:** Each plugin declares its capabilities in a static manifest object rather than imperatively registering hooks. The Plugin Manager reads manifests and wires up the correct dispatch.

**When to use:** When you want plugins to be inspectable, auditable, and lightweight (no need to extend a class). Matches the project's "LLM-friendly API surface" requirement.

**Trade-offs:** Less flexible than imperative registration (Obsidian's model). Easier to validate, serialize, and document. Suitable for a curated plugin ecosystem.

**Example (worldnotes-adapted):**
```typescript
// Content Plugin manifest
const wikiLinkPlugin: ContentPlugin = {
  manifest: {
    name: 'wiki-link',
    version: '1.0.0',
    category: 'content',
    description: '[[page]] syntax with click-to-navigate',
    capabilities: ['tokens', 'render', 'navigate'],
  },
  tokens: [
    { type: 'wiki-link', pattern: /\[\[([^\]]+)\]\]/ },
  ],
  render(token: Token, ctx: EditorContext): HTMLElement {
    const el = document.createElement('span');
    el.className = 'wn-wiki-link';
    el.dataset.raw = token.raw;
    el.textContent = pageDisplayName(token.groups[1]);
    return el;
  },
  onNavigate(token: Token, ctx: EditorContext): boolean {
    ctx.navigate(token.groups[1]);
    return true;
  },
};

// UI Plugin manifest
const wordCounterPlugin: UIPlugin = {
  manifest: {
    name: 'word-counter',
    version: '1.0.0',
    category: 'ui',
    description: 'Shows word count in a status bar',
    capabilities: ['ui-overlay'],
  },
  onMount(container: HTMLElement, ctx: EditorContext): void {
    const counter = document.createElement('div');
    counter.className = 'wn-word-counter';
    container.appendChild(counter);
    // Update on input
    container.addEventListener('input', () => {
      counter.textContent = `Words: ${countWords(ctx.getContent())}`;
    });
  },
  onDestroy(): void {
    // Cleanup handled by parent container removal
  },
};
```

### Pattern 3: Headless-First Styling (TipTap Model)

**What:** Core rendering produces semantic HTML elements with minimal structural styling. All visual styling (colors, spacing, typography) is injected separately via a theme system. Core classes are for structure; theme variables are for appearance.

**When to use:** When you need consumers to fully control the editor's visual appearance without fighting library defaults. Critical for embeddable libraries.

**Trade-offs:** More work for consumers to get a "good-looking" editor out of the box. Mitigated by providing a sensible default theme.

**Implementation:**
```typescript
// Structural class names (always present):
//   .wn-root, .wn-editor, .wn-wiki-link, .wn-heading-1, .wn-bold
// Theme CSS custom properties:
//   --wn-font-family, --wn-font-size, --wn-line-height
//   --wn-color-text, --wn-color-bg, --wn-color-accent
//   --wn-heading-1-size, --wn-heading-1-weight, --wn-heading-1-color
//   --wn-wiki-link-color, --wn-wiki-link-hover-color
//   --wn-bold-weight

// Default theme injected once:
const DEFAULT_THEME = `
  .wn-root {
    --wn-font-family: system-ui, sans-serif;
    --wn-font-size: 16px;
    --wn-color-text: #1a1a1a;
    --wn-color-bg: #ffffff;
    --wn-color-accent: #3b82f6;
    --wn-heading-1-size: 2em;
    --wn-bold-weight: 700;
    --wn-wiki-link-color: var(--wn-color-accent);
  }
  .wn-editor {
    font-family: var(--wn-font-family);
    font-size: var(--wn-font-size);
    color: var(--wn-color-text);
    background: var(--wn-color-bg);
  }
  .wn-bold { font-weight: var(--wn-bold-weight); }
`;

// Full theme replacement:
// Consumer provides CSS that targets .wn-root with their own variables.
// They can also replace the entire <style> block via `editor.setTheme(css)`.
```

### Pattern 4: Ordered Token Resolution Pipeline

**What:** Token definitions are tested in registration order. Line-level patterns (anchored with `^`) are tested first against each line. If no line-level match, inline patterns are tested left-to-right, earliest match wins. Order is semantic: `**` before `*` prevents partial matches.

**When to use:** When you have a regex-based tokenizer (not a ProseMirror-style schema parser). This is the existing worldnotes pattern — preserve it.

**Trade-offs:** Simple and fast, but order-sensitive and can produce surprising results if plugins register in unexpected order. Mitigated by manifest capability declaration that lets the plugin manager warn about ordering conflicts.

### Pattern 5: Debounced Read-Through Cache for Persistence

**What:** An in-memory `Map<string, string>` (the "world") acts as a read-through cache. On page load, check world first, then storage adapter. On input, update world immediately, debounce the storage write. On navigation, pre-load from storage if not cached.

**When to use:** Browser-based app with async storage and frequent writes. Prevents storage write storms while keeping the editor responsive.

**Trade-offs:** Data loss on tab close before debounce fires. Mitigated by a `beforeunload` listener that flushes pending saves. Already present in worldnotes — formalize it.

## Data Flow

### Primary Input Flow (refactored)

```
User types in contentEditable
        │
        ▼
  ┌─────────────┐
  │ input event  │ fires on Editor's contentEditable div
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Caret.Save   │ getCaretOffset() → record (char position, 0-based)
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Extractor    │ walk DOM → extract raw text (respecting data-raw attrs)
  └──────┬──────┘
         │
         ▼
  ┌─────────────────┐
  │ PluginManager    │ getTokenDefs() → ordered list of all TokenDefs
  │ .getTokenDefs()  │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────┐
  │ Tokenizer    │ split by \n → for each line: test line-level patterns
  │              │ first → if match, consume line. Else: scan inline
  │              │ patterns left-to-right, earliest match wins, gaps = 'text'
  └──────┬──────┘
         │  Token[][]
         ▼
  ┌─────────────────┐
  │ PluginManager    │ getPluginMap() → Map<tokenType, Plugin>
  │ .getPluginMap()  │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────┐
  │ Renderer     │ for each token: lookup plugin, call plugin.render(token, ctx)
  │              │ if caret inside token → render raw text instead
  │              │ else → use plugin's HTMLElement
  └──────┬──────┘
         │  DOM Fragment
         ▼
  ┌─────────────┐
  │ DOM Update   │ replace innerHTML of contentEditable with fragment
  │              │ join lines with \n TextNode
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Caret.Restore│ setCaretOffset(recorded position) → walk DOM to find node
  │              │ fallback to end-of-element if offset exceeds document
  └──────┬──────┘
         │
         ▼
  ┌─────────────────┐
  │ Persistence      │
  │ world[page] = raw│ (immediate, in-memory)
  │ debounce →       │ (async, 600ms default)
  │ storage.set()    │
  └─────────────────┘
```

### Plugin Lifecycle Flow

```
Registration:
  EditorBuilder.use(plugin)
      │
      ▼
  PluginManager.register(plugin)
      │
      ├─► validateManifest(plugin.manifest)
      │     ├─ required fields? (name, version, category)
      │     ├─ category-appropriate capabilities?
      │     └─ name uniqueness? → replace if exists
      │
      ├─► categorize(plugin)
      │     ├─ ContentPlugin → contentPlugins[] (affects tokenizer/renderer)
      │     ├─ UIPlugin       → uiPlugins[] (mounted on editor DOM)
      │     └─ StoragePlugin  → storagePlugin (replaces current adapter)
      │
      └─► plugin.onInit?.(ctx)
            (plugin receives read-only EditorContext)

Mounting:
  Editor.mount(element)
      │
      ▼
  PluginManager.mountAll(container)
      │
      ├─► ContentPlugins: already "active" via tokenizer dispatch
      ├─► UIPlugins: onMount(containerSlot, ctx) for each
      └─► StoragePlugin: storageAdapter = plugin.createAdapter()

Runtime:
  [Input event → pipeline uses ContentPlugins' tokens/render]
  [Navigation → plugins with onNavigate receive events]
  [Save → StoragePlugin's adapter.set() called]

Teardown:
  Editor.destroy()
      │
      ▼
  PluginManager.destroy()
      │
      ├─► UIPlugins: onDestroy() for each
      ├─► All plugins: onDestroy?.() lifecycle hook
      └─► Clear registries
```

### Theme Flow

```
Editor.mount()
      │
      ▼
  ThemeManager.inject(themeName?)
      │
      ├─► Check if <style id="worldnotes-theme"> exists
      │     ├─ Exists → skip (idempotent)
      │     └─ Missing → create <style>, inject CSS custom properties
      │
      └─► Apply theme:
            ├─ No theme specified → inject DEFAULT_THEME (CSS vars)
            ├─ Theme name specified → load theme CSS (if registered)
            └─ Custom CSS string → inject directly, replacing defaults

  ThemeManager.setTheme(css: string)
      │
      └─► Replace entire <style id="worldnotes-theme"> content
            (full replacement escape hatch)

  Plugin rendering:
      render(token) → returns HTMLElement with structural class (wn-bold)
      Theme CSS applies via:
        - .wn-bold { font-weight: var(--wn-bold-weight); }
        - Plugin can also use token vars in returned element styles
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K plugins (library) | All patterns above hold. Plugin registration is synchronous O(n). DOM-based rendering is fine. |
| 1K-10K pages (content scale) | World cache grows unbounded. Add LRU eviction or size cap. IndexedDB adapter scales better than localStorage. |
| 100K+ tokens per document | Tokenize-per-line is already O(lines). No change needed. DOM rendering may need virtual scrolling for very large docs. |

### Scaling Priorities

1. **First bottleneck:** World cache memory for many pages. Fix: LRU eviction with configurable max size (e.g., 50 pages).
2. **Second bottleneck:** DOM re-render on every keystroke for large documents. Fix: diff-based DOM updates instead of full innerHTML replacement (ProseMirror's approach, but adds significant complexity — defer until needed).

## Anti-Patterns

### Anti-Pattern 1: Monolithic Editor Class

**What people do:** One class handling DOM construction, event handling, tokenization, rendering, navigation, persistence, and plugin management (current `editor.ts`).

**Why it's wrong:** 489 lines, hard to test in isolation, impossible to extend without touching core, high cognitive load.

**Do this instead:** Editor Core as thin orchestrator delegating to pipeline, plugin manager, navigation, persistence, and theme modules. Each module testable independently.

### Anti-Pattern 2: Category Confusion in Plugin Registration

**What people do:** Allow any plugin to register as any category, or mix content/UI/storage concerns in one plugin object.

**Why it's wrong:** Content plugins affect tokenization, UI plugins need DOM mounting, storage plugins replace persistence. Dispatching a UI plugin to the tokenizer is meaningless. Dispatch errors are hard to debug.

**Do this instead:** Each plugin has a `category` field in its manifest. PluginManager validates category-specific interface compliance. Content plugins must have `tokens` and `render`. UI plugins must have `onMount`. Storage plugins must implement `StorageAdapter`.

### Anti-Pattern 3: Hard-Coded CSS Instead of Design Tokens

**What people do:** Inline styles, hard-coded hex colors, fixed pixel sizes in render functions (current `injectStyles()` with baked-in values like `#667eea`, `#764ba2`).

**Why it's wrong:** Consumers can't theme without CSS specificity wars. Every visual change requires library code modification.

**Do this instead:** All render functions return semantic classes (`wn-bold`, `wn-wiki-link`). A single injected `<style>` block defines CSS custom properties. Consumers override properties, not classes. Full theme CSS string accepted as escape hatch.

### Anti-Pattern 4: Plugin State Stored on Plugin Object

**What people do:** Plugins hold mutable state internally. Plugin Manager can't introspect or serialize it.

**Why it's wrong:** Hard to debug, can't snapshot/restore, race conditions possible.

**Do this instead:** Plugins receive state snapshots through their render/update hooks via context. If a plugin needs persistent state, it uses the storage adapter (for cross-session) or the context (for session-only). ProseMirror's approach: plugin state lives in EditorState, not on the plugin instance.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Editor Core ↔ Plugin Manager | Direct method calls (`register`, `getTokenDefs`, `getPluginMap`, `mountUI`, `destroy`) | Editor owns PluginManager instance. PluginManager has no reference back to Editor (avoids circular deps). |
| Plugin Manager ↔ Tokenizer | PluginManager provides `getTokenDefs()` and `getPluginMap()`. Tokenizer and Renderer are pure functions that receive these as arguments. | No direct dependency from pipeline modules to PluginManager. Editor Core passes TokenDefs and PluginMap as parameters. |
| Plugin Manager ↔ Storage | PluginManager provides `getStorageAdapter()`. Persistence Manager calls `adapter.get()`/`adapter.set()` through the adapter interface. | StoragePlugin implements adapter. Non-plugin adapters still work (interface compatibility). |
| Plugin Manager ↔ UI Plugins | PluginManager calls `onMount(container, ctx)` and `onDestroy()`. UI plugins receive a DOM container element. | UI plugins own their DOM. Editor only provides the slot. |
| Renderer ↔ Theme | Renderer returns elements with structural class names. Theme CSS targets those classes with custom properties. | No TypeScript dependency between renderer and theme. Only CSS contract. |
| Editor Core ↔ Navigation | Editor calls navigation functions (`loadPage`, `pushTrail`, `syncUrl`) as pure operations. Navigation module has no reference to Editor. | Navigation is state-manipulation functions, not a class. |
| Editor Core ↔ Persistence | Editor calls `worldCache.set()` and `debouncedSave()`. Persistence module handles timer and adapter calls. | Persistence module is a thin wrapper around world Map + storage adapter. |

### External Integration

| Integration | Pattern | Notes |
|-------------|---------|-------|
| Consumer application | `createEditor(element, options)` → Builder → `.mount()` | Fluent API preserved from current architecture. |
| Plugin authoring | Export object implementing `ContentPlugin` / `UIPlugin` / `StoragePlugin` interface | Consumers create plain objects, not class instances. |
| Theme authoring | CSS custom properties on `.wn-root` | No TypeScript API needed. CSS-only contract. |
| Storage backend | `StorageAdapter` interface: `get(key)`, `set(key, value)`, `keys()` | Existing interface preserved. |

## Build Order Implications

The architecture suggests this build order (dependency-first):

```
Phase 1: Infrastructure
  ├── Module decomposition (split editor.ts into core/, pipeline/, navigation/, dom/)
  ├── Theme system (theme/ — CSS vars + injection + default theme)
  └── Plugin Manager skeleton (plugins/manager.ts — registration, validation)

Phase 2: Plugin System
  ├── Plugin manifest types (plugins/manifest.ts)
  ├── Category interfaces (plugins/categories/*.ts)
  ├── Plugin Manager → pipeline dispatch (getTokenDefs, getPluginMap)
  ├── Plugin Manager → storage dispatch (getStorageAdapter)
  ├── Plugin Manager → UI dispatch (mountUI/destroy)
  └── Migrate built-in plugins to ContentPlugin interface

Phase 3: Quality
  ├── Test infrastructure (Vitest/Jest, coverage)
  ├── CI/CD pipeline (typecheck, lint, test, build)
  ├── ESLint configuration
  └── Demo extraction from src/

Phase 4: Polish
  ├── Plugin lifecycle hardening (error boundaries, validation)
  ├── Theme documentation + examples
  └── Plugin authoring guide
```

**Rationale:** Infrastructure (Phase 1) must exist before plugin system can be refactored (Phase 2). Tests and CI (Phase 3) validate the refactored architecture. Polish (Phase 4) is only meaningful when everything else is stable. Theme system goes early because it's purely additive (doesn't depend on plugin refactor) and the renderer should emit theme-aware classes from the start.

## Sources

- **ProseMirror Guide & Reference** (prosemirror.net/docs) — Primary source for plugin architecture, state management, immutable data model, and transaction system. HIGH confidence (official docs).
- **TipTap Documentation** (tiptap.dev/docs) — Primary source for extension system, node/mark/extension types, headless styling, and NodeView patterns. HIGH confidence (official docs, v3.x).
- **Obsidian Developer Documentation** (docs.obsidian.md) + **obsidian-api Context7** — Primary source for plugin manifest, lifecycle hooks, imperative registration model, and settings management. HIGH confidence (official docs + Context7 verified API).
- **Slate Documentation** (github.com/ianstormtaylor/slate) via Context7 — Custom data model, renderElement/renderLeaf props, framework-level architecture. MEDIUM confidence (official but Context7-sourced, not directly fetched from slatejs.org).
- **Plate (udecode/plate)** via Context7 — Chained plugin extension methods, key-based plugin identity, extendApi/extendTransforms pattern. MEDIUM confidence (Context7-sourced from official repo).
- **Existing worldnotes codebase** (.planning/codebase/ARCHITECTURE.md, .planning/codebase/STRUCTURE.md) — Current architecture snapshot for gap analysis. HIGH confidence (analyzed directly).

---

*Architecture research for: worldnotes — extensible inline Markdown/WYSIWYG editor library*
*Researched: 2026-05-23*
