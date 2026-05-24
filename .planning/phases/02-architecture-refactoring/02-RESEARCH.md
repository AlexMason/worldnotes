# Phase 2: Architecture Refactoring - Research

**Researched:** 2026-05-24
**Domain:** TypeScript module decomposition of closure-based editor architecture; circular dependency prevention; Vite library mode exclusion; cursor module test coverage
**Confidence:** HIGH

## Summary

The `src/editor.ts` file (496 lines, 10 distinct concerns) needs to be decomposed into 5 focused modules while preserving the closure-based state pattern and zero-dependency architecture. The primary technical challenge is extracting inner functions that capture mutable closure variables (`world`, `trail`, `saveTimer`, `isNavigating`, `editorDiv`) into importable modules — requiring a factory-function pattern where mutable state is explicitly passed between modules.

The Vite library build already excludes demo code from the JS bundle (verified: no `mentionPlugin` or demo symbols in `dist/worldnotes.js`), but `tsc` generates `dist/demo.d.ts` (an empty `export {};` declaration) because `rootDir: ./src` processes all source files. The cursor module has 10 test cases across 3 `describe` blocks covering basic offset mapping, data-raw resolution, and caret positioning — but lacks coverage for empty documents, multi-byte characters, line boundaries, and forced-offset edge cases.

**Primary recommendation:** Extract each module as a set of factory functions that receive explicit mutable state parameters (not globals, not events), arranged in a strict DAG: `editor-state.ts` → `editor-dom.ts` → `editor-render.ts` → `editor-navigation.ts` → `editor-lifecycle.ts`. Move `demo.ts` to a top-level `demo/` directory to eliminate the type declaration leak. Add 12-15 cursor test cases focused on edge conditions before touching the render pipeline.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| State management (world/trail/context) | Browser/Client (in-memory) | Storage adapter (persistence) | State lives in closures within the browser runtime; storage is a plugin-provided persistence layer |
| DOM construction (editor chrome) | Browser/Client | — | Pure DOM API calls, no server-side rendering |
| Render pipeline (tokenize→render→caret) | Browser/Client | — | Tokenizer is pure logic but runs in browser context with DOM output |
| Navigation (page loading, URL sync) | Browser/Client | Storage adapter (reads/writes) | All navigation happens client-side via contentEditable and history API |
| Input handling (keyboard, paste) | Browser/Client | — | DOM event listeners on contentEditable div |
| Plugin system | Browser/Client | — | Plugins run synchronously during render pipeline, receive DOM context |
| Build output (demo exclusion) | Build tool (Vite) | — | Vite library mode controls entry points; tsc controls declaration generation |
| Test infrastructure (cursor coverage) | Test runner (Vitest) | happy-dom | Vitest with happy-dom browser environment provides DOM for cursor tests |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 [VERIFIED: npm registry, `tsc --version`] | Type checking, declaration generation | Already configured with strict mode, ES2020 target |
| Vite | 7.3.3 [VERIFIED: npm registry, `npx vite --version`] | Library bundler, dev server | Already configured; `build.lib.entry` already correctly excludes demo code from JS bundle |
| Vitest | 4.1.7 [VERIFIED: npm registry, `npx vitest --version`] | Test runner | 103 existing tests; happy-dom environment for DOM-based cursor tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-dts | ^5.0.1 [VERIFIED: package.json] | Generates `.d.ts` from `tsc` output | Already configured; will auto-generate declarations for new modules |
| happy-dom | ^20.9.0 [VERIFIED: package.json] | Browser DOM environment for cursor tests | Required for ARCH-03 cursor edge case tests |
| fake-indexeddb | ^6.2.5 [VERIFIED: package.json] | IndexedDB polyfill for storage adapter tests | Used by existing storage tests; may be needed if navigation tests involve storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Factory-function modules (closure pattern) | Class-based modules with `this` state | Classes would break the existing closure pattern and require converting all 10 inner functions; factory functions preserve the closure model and minimize diff |
| Move demo.ts to `demo/` dir | Exclude via `tsconfig.json` "exclude" + "references" | tsconfig exclude would break `npm run typecheck` for demo.ts; separate directory is simpler and follows standard monorepo patterns |
| Demo as separate Vite entry | Demo as HTML-inline script | Separate entry preserves `npm run dev` workflow; inline script reduces discoverability for plugin authors |

**Installation:** No new dependencies required. This phase uses the existing toolchain (TypeScript, Vite, Vitest, happy-dom).

## Architecture Patterns

### System Architecture Diagram

```
┌── Public API Surface (src/index.ts) ───────────────────────────────┐
│  export { createEditor, EditorBuilder }                             │
│  export type { Plugin, EditorInstance, EditorContext, ... }         │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ imports
┌──────────────────────────▼─────────────────────────────────────────┐
│  src/editor.ts (THIN ORCHESTRATOR — ~40 lines)                      │
│  - EditorBuilder class (unchanged)                                  │
│  - createEditor() factory (unchanged)                               │
│  - mountEditor() → delegates to sub-modules                         │
└────┬──────────┬──────────┬──────────┬─────────────┬────────────────┘
     │ imports  │ imports  │ imports  │ imports     │ imports
     ▼          ▼          ▼          ▼             ▼
┌─────────┐ ┌───────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│  editor │ │editor │ │ editor │ │  editor   │ │   editor     │
│ -state  │ │ -dom  │ │-render │ │-navigation│ │ -lifecycle   │
│  .ts    │ │ .ts   │ │  .ts   │ │   .ts     │ │    .ts       │
├─────────┤ ├───────┤ ├────────┤ ├──────────┤ ├──────────────┤
│ world   │ │el()   │ │render()│ │navigate  │ │input handler │
│ trail   │ │DOM    │ │breadcr │ │loadPage  │ │paste handler │
│ context │ │build  │ │URLsync │ │storage   │ │key handler   │
│ save    │ │DEFAULT│ │        │ │reads     │ │insertText    │
│ timer   │ │_CSS   │ │        │ │          │ │mount/destroy │
└─────────┘ └──┬────┘ └───┬────┘ └────┬─────┘ └──────┬───────┘
               │           │           │               │
               │           ▼           │               │
               │    ┌──────────┐       │               │
               │    │ renderer │◄──────┘               │
               │    │ tokenizer│                       │
               │    │ cursor   │                       │
               │    └──────────┘                       │
               │                                       │
               ▼                                       ▼
        ┌──────────────────────────────────────────────────┐
        │  Existing Pipeline Modules (UNCHANGED)            │
        │  src/cursor.ts   src/tokenizer.ts                │
        │  src/renderer.ts src/navigation.ts               │
        │  src/types.ts    src/plugins/*   src/storage/*   │
        └──────────────────────────────────────────────────┘
```

**Data flow:** `editor-state.ts` owns all mutable state (world, trail, timers). `editor-dom.ts` is a pure function that builds the DOM tree from a container element — no state dependency. `editor-render.ts` receives editorDiv + plugins + state accessors and coordinates the extract→tokenize→render→caret pipeline. `editor-navigation.ts` receives state mutators + storage + render callbacks and handles page navigation. `editor-lifecycle.ts` wires event listeners, exposes the public API, and calls the assembler. `editor.ts` imports all modules and orchestrates the construction order.

### Recommended Project Structure
```
src/
├── editor.ts              # Thin orchestrator: EditorBuilder + createEditor + mountEditor()
├── editor-state.ts        # World cache, trail array, save timer, readContext()
├── editor-dom.ts          # el() helper, createEditorDOM(), injectStyles(), DEFAULT_CSS
├── editor-render.ts       # renderEditor(), renderBreadcrumb(), syncUrlToTrail()
├── editor-navigation.ts   # navigateToPage(), loadPage()
├── editor-lifecycle.ts    # Input handlers, mount(), destroy(), insertTextAtSelection()
├── index.ts               # Public API barrel (unchanged)
├── types.ts               # All interfaces (unchanged)
├── cursor.ts              # Caret management (unchanged)
├── tokenizer.ts           # Text → tokens (unchanged)
├── renderer.ts            # Tokens → DOM (unchanged)
├── navigation.ts          # Wiki link parsing, URL encoding (unchanged)
├── plugins/               # Built-in plugins (unchanged)
│   ├── index.ts
│   ├── defaults.ts
│   ├── headings.ts
│   ├── inline.ts
│   └── wikiLink.ts
├── storage/               # Persistence adapters (unchanged)
│   ├── index.ts
│   ├── localStorage.ts
│   └── indexedDB.ts
└── __tests__/             # Co-located tests
    ├── cursor.test.ts
    ├── editor.test.ts
    ├── navigation.test.ts
    ├── plugins.test.ts
    ├── renderer.test.ts
    ├── storage.test.ts
    └── tokenizer.test.ts

demo/
└── demo.ts                # Moved from src/demo.ts — dev-only, excluded from build
```

### Pattern 1: Factory-Function Module Extraction (Closure Pattern)

**What:** Extract inner functions from a closure-based orchestrator into importable modules by passing mutable state as explicit parameters. Each sub-module exports a factory function that returns an object of bound functions — the factory closes over the mutable state references passed to it.

**When to use:** When decomposing a large closure function where inner functions capture mutable variables that must remain shared across modules.

**Example:**
```typescript
// editor-state.ts — owns mutable state, exports accessors and mutators
// Source: Derived from existing src/editor.ts:104-149 (mountEditor closure pattern)

import type { EditorContext, StorageAdapter, EditorOptions } from './types'

export interface EditorMutableState {
  world: Record<string, string>
  trail: string[]
  saveTimer: ReturnType<typeof setTimeout> | null
  isNavigating: boolean
}

export interface EditorStateAPI {
  readonly world: Record<string, string>
  getTrail(): string[]
  getWorld(): Record<string, string>
  
  // Mutable operations (for internal modules only)
  setWorldPage(page: string, content: string): void
  pushTrail(page: string): void
  setTrail(trail: string[]): void
  truncateTrail(index: number): void
  setNavigating(v: boolean): boolean
  isNavigating(): boolean
  clearSaveTimer(): void
  setSaveTimer(timer: ReturnType<typeof setTimeout> | null): void
  
  // Readonly context for plugins
  toContext(navigate: (page: string) => void): EditorContext
}

export function createEditorState(
  storage: StorageAdapter,
  options: EditorOptions,
): EditorStateAPI {
  const world: Record<string, string> = {}
  const saveDebounce = options.saveDebounceMs ?? 600
  const initialPage = options.initialPage ?? 'home'
  
  // Initial trail from URL or defaults
  let trail: string[] = /* ... decode from URL or default to [initialPage] */
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false

  return {
    world,
    getTrail: () => [...trail],
    getWorld: () => ({ ...world }),
    setWorldPage(page, content) { world[page] = content },
    pushTrail(page) { trail.push(page) },
    setTrail(t) { trail = t },
    truncateTrail(index) { trail = trail.slice(0, index + 1) },
    setNavigating(v) { isNavigating = v; return v },
    isNavigating: () => isNavigating,
    clearSaveTimer() { if (saveTimer) clearTimeout(saveTimer); saveTimer = null },
    setSaveTimer(t) { saveTimer = t },
    toContext(navigate) {
      return {
        navigate,
        getTrail: () => [...trail],
        getWorld: () => ({ ...world }),
      }
    },
  }
}
```

```typescript
// editor-dom.ts — pure DOM construction, no state dependency
// Source: Derived from src/editor.ts:130-144 (DOM construction) + 354-496 (helpers)

export interface EditorDOM {
  container: HTMLElement
  topbar: HTMLElement
  breadcrumb: HTMLElement
  editorWrap: HTMLElement
  editorDiv: HTMLDivElement
  placeholder: HTMLElement
}

export function createEditorDOM(container: HTMLElement): EditorDOM {
  injectStyles()
  container.innerHTML = ''
  container.className = 'wn-root'
  
  const topbar = el('div', 'wn-topbar')
  const breadcrumb = el('div', 'wn-breadcrumb')
  const editorWrap = el('div', 'wn-editor-wrap')
  const editorDiv = el('div', 'wn-editor') as HTMLDivElement
  const placeholder = el('div', 'wn-placeholder')
  
  placeholder.textContent = 'Start writing… use [[page name]] to link deeper'
  editorDiv.contentEditable = 'true'
  editorDiv.spellcheck = false
  
  topbar.appendChild(breadcrumb)
  editorWrap.appendChild(placeholder)
  editorWrap.appendChild(editorDiv)
  container.appendChild(topbar)
  container.appendChild(editorWrap)
  
  return { container, topbar, breadcrumb, editorWrap, editorDiv, placeholder }
}

// Private helper (not exported)
function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}
```

```typescript
// editor-render.ts — receives editorDiv ref + state + plugins
// Source: Derived from src/editor.ts:156-214 (render + breadcrumb + URL sync)

import type { Plugin } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import { getCaretOffset, setCaretOffset, extractText } from './cursor'
import { tokenizeDocument } from './tokenizer'
import { renderDocument } from './renderer'
import { pageDisplayName, encodePathSearch } from './navigation'

export interface EditorRenderAPI {
  render(): void
  renderBreadcrumb(): void
  syncUrlToTrail(): void
}

export function createEditorRender(
  dom: EditorDOM,
  plugins: Plugin[],
  state: EditorStateAPI,
  options: { onTrailChange?: (trail: string[]) => void }
): EditorRenderAPI {
  const { editorDiv, placeholder, breadcrumb } = dom
  
  function render(): void {
    const offset = getCaretOffset(editorDiv)
    const raw = extractText(editorDiv)
    const tokens = plugins.flatMap((p) => p.tokens)
    const lines = tokenizeDocument(raw, tokens)
    const context = state.toContext(/* navigate function from lifecycle */)
    const frags = renderDocument(lines, plugins, context, offset)
    
    editorDiv.innerHTML = ''
    frags.forEach((frag, i) => {
      editorDiv.appendChild(frag)
      if (i < frags.length - 1) editorDiv.appendChild(document.createTextNode('\n'))
    })
    
    placeholder.style.display = raw.length ? 'none' : 'block'
    
    try { setCaretOffset(editorDiv, offset) } catch { /* noop */ }
  }
  
  function renderBreadcrumb(): void {
    const trail = state.getTrail()
    breadcrumb.innerHTML = ''
    trail.forEach((page, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'wn-crumb-sep'
        sep.textContent = '/'
        breadcrumb.appendChild(sep)
      }
      const crumb = document.createElement('span')
      crumb.className = 'wn-crumb' + (i === trail.length - 1 ? ' wn-crumb--active' : '')
      crumb.textContent = pageDisplayName(page)
      if (i < trail.length - 1) {
        crumb.addEventListener('click', () => {
          state.truncateTrail(i)
          /* navigation callback passed in */
        })
      }
      breadcrumb.appendChild(crumb)
    })
    options.onTrailChange?.(trail)
    syncUrlToTrail()
  }
  
  function syncUrlToTrail(): void {
    const search = encodePathSearch(window.location.search, state.getTrail())
    window.history.replaceState(null, '', 
      `${window.location.pathname}${search}${window.location.hash}`)
  }
  
  return { render, renderBreadcrumb, syncUrlToTrail }
}
```

**Key insight:** The factory-function pattern preserves the existing closure-based state model (D-03) while enabling modular imports. Each sub-module receives explicit parameters (not hidden globals), making them independently testable. The dependency direction is enforced by the parameter types — `editor-render.ts` imports types from `editor-state.ts` but not vice versa.

### Pattern 2: Circular Dependency Prevention (DAG Enforcement)

**What:** The 5 modules form a strict Directed Acyclic Graph (DAG). Module A may import types from module B only if B is "upstream" (closer to the state root). No two modules at the same tier import from each other.

**Dependency DAG:**
```
editor-state.ts          ← source of truth, no imports from other editor-* modules
    ↓
editor-dom.ts            ← pure DOM functions, imports nothing editor-specific
    ↓
editor-render.ts         ← imports: editor-state (types), editor-dom (types), cursor, tokenizer, renderer, navigation
    ↓
editor-navigation.ts     ← imports: editor-state (types), storage adapters
    ↓
editor-lifecycle.ts      ← imports: all of the above (assembler role)
    ↓
editor.ts                ← imports: all editor-* modules + existing pipeline modules
```

**Enforcement rules:**
1. `editor-state.ts` imports ONLY from `./types` — never from other `editor-*` modules
2. `editor-dom.ts` imports ONLY from `./types` (for CSS template constants) — never from other `editor-*` modules
3. `editor-render.ts` imports from `editor-state.ts` (types only), `editor-dom.ts` (types only), and existing pipeline modules — never from `editor-navigation.ts` or `editor-lifecycle.ts`
4. `editor-navigation.ts` imports from `editor-state.ts` (types only) and storage adapters — never from `editor-render.ts` or `editor-lifecycle.ts`
5. `editor-lifecycle.ts` imports from all other `editor-*` modules (assembler role) — it sits at the bottom of the DAG
6. `editor.ts` imports from all `editor-*` modules — it is the public-facing orchestrator

**Anti-circular-dependency technique:** Use interface types for cross-module communication. Each module exports an interface describing the API surface it provides. Consumers import the type, not the implementation. Example:
```typescript
// editor-render.ts
import type { EditorStateAPI } from './editor-state'  // ← type-only import
import type { EditorDOM } from './editor-dom'          // ← type-only import
// Never: import { createEditorState } from './editor-state'  ← AVOID (runtime import)
```

### Pattern 3: `insertTextAtSelection` as a Testable Module Export

**What:** The current `insertTextAtSelection` (lines 333-349) is an inner function of `mountEditor()` that dispatches an `input` event after inserting text. It must be extracted as a standalone function that receives the `editorDiv` element reference — no state dependency.

**Example:**
```typescript
// editor-lifecycle.ts (excerpt)
export function insertTextAtSelection(editorDiv: HTMLElement, text: string): void {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  
  const range = sel.getRangeAt(0)
  range.deleteContents()
  
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStart(node, text.length)
  range.collapse(true)
  
  sel.removeAllRanges()
  sel.addRange(range)
  
  editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
}
```

### Anti-Patterns to Avoid
- **Event emitter for cross-module communication:** The user decided "no event emitter" (D-03). Do not introduce `EventTarget`, `CustomEvent`, or pub/sub patterns. Use direct function calls with explicit parameters instead.
- **Global/static state module:** Do not create a `let world = {}; export { world }` pattern. State must remain in closures, not module-level variables.
- **Circular imports via barrel files:** Do not re-export all `editor-*` modules from a single `editor/index.ts` barrel. This creates an import cycle risk where module A imports from the barrel, and the barrel imports module B which imports module A.
- **Relying on import order for side effects:** Do not use top-level side effects (e.g., `injectStyles()` at import time) for DOM manipulation. Side effects should be explicit function calls during mount.
- **Moving `DEFAULT_CSS` inline in editor-lifecycle:** The CSS template string belongs in `editor-dom.ts` where DOM concerns live. Moving it to the lifecycle module would scatter DOM concerns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module dependency graph visualization | Custom graph walker | Draw manually or use `madge` for verification | One-time refactor; tooling not worth the setup cost |
| Circular import detection | Custom ESLint rule | `import/no-cycle` ESLint rule (already available via eslint-plugin-import) OR rely on TypeScript `--noEmit` | TypeScript catches circular imports naturally; ESLint plugin is optional extra safety |
| Demo file exclusion from build | Custom Vite plugin | Move `demo.ts` out of `src/` (tsc `rootDir` exclusion) | Vite library mode already excludes non-entry files from JS bundle; only tsc declaration leak needs fixing |
| Closure extraction testing | Mock-heavy integration tests | Test each extracted module independently with factory-created state | The factory-function pattern makes modules testable in isolation without mocks |

**Key insight:** The existing toolchain (TypeScript, Vite, Vitest) already provides everything needed. No new tooling required — this is a pure code reorganization with no new runtime dependencies.

## Runtime State Inventory

> **Phase type:** Refactoring (module decomposition, file moves). Runtime state is code-level only — no persisted data, services, or OS registrations to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — worldnotes has no server-side database or persisted user data in this phase | None |
| Live service config | None — no external services configured with editor module paths | None |
| OS-registered state | None — no systemd units, cron jobs, or task scheduler entries | None |
| Secrets/env vars | None — no API keys, tokens, or environment variables reference module paths | None |
| Build artifacts | `dist/demo.d.ts` (generated from `src/demo.ts` by tsc) — stale after file move | Delete manually; `tsc && vite build` regenerates clean `dist/` |

**Git-tracked state to update:**
- `.gitignore` — no change needed (already gitignores build caches, node_modules)
- `index.html` — update `<script type="module" src="/src/demo.ts">` → `/demo/demo.ts` after file move
- `tsconfig.json` — no change needed (already `include: ["src"]` which excludes `demo/`)

## Common Pitfalls

### Pitfall 1: Breaking the `EditorInstance` Shape by Accidentally Capturing Stale References

**What goes wrong:** After splitting modules, the public `EditorInstance` returned from `mount()` contains methods like `getContent()`, `setContent()`, `destroy()` that close over `editorDiv`. If the extraction passes a snapshot of `editorDiv` rather than a live reference, these methods work at mount time but fail after DOM operations.

**Why it happens:** JavaScript closures capture references by value for `const` primitive bindings but by reference for objects. If a module copies `editorDiv` into a local variable and then the DOM is rebuilt (e.g., by `render()`), the local variable still points to the original element.

**How to avoid:** All sub-module factories receive the live `EditorDOM.editorDiv` reference (an object reference), not a snapshot. Since `editorDiv` is itself a DOM element reference that survives `innerHTML = ''` operations, the reference remains valid throughout the editor lifecycle. The `container` reference is similarly stable — `innerHTML = ''` empties children but doesn't invalidate the container reference.

**Warning signs:** Tests that pass individually but fail in sequence (stale DOM references persist between test cases); `getContent()` returning empty strings after `setContent()`.

### Pitfall 2: Import Cycles from Re-exporting Sub-Modules via the Public API Barrel

**What goes wrong:** Adding `export * from './editor-state'` or similar to `src/index.ts` creates a cycle if `editor-state.ts` imports from `./types` which is re-exported from `./index`.

**Why it happens:** `index.ts` is a barrel file that currently re-exports everything. Adding new editor sub-module exports to the barrel creates potential cycles.

**How to avoid:** Do NOT add the 5 new `editor-*` modules to `src/index.ts`. They are internal implementation details exposed only through `editor.ts`. The public API surface (`createEditor`, `EditorBuilder`, `EditorInstance`, and types) remains unchanged. Only `editor.ts` imports the sub-modules.

**Warning signs:** TypeScript error "Circular definition of import alias" or "Module '".../index"' has no exported member".

### Pitfall 3: Losing `insertTextAtSelection`'s Event Dispatch Chain

**What goes wrong:** `insertTextAtSelection` calls `editorDiv.dispatchEvent(new Event('input', { bubbles: true }))` to trigger the render pipeline. If extracted to a separate module and the `editorDiv` reference is wrong, or if the event listener is also moved and no longer listens on the same element, typing/pasting silently breaks.

**Why it happens:** The `input` event listener is attached to `editorDiv` in `editor-lifecycle.ts` (line 267). If `insertTextAtSelection` is moved but the event listener doesn't receive the dispatch, or vice versa, the feedback loop between user action and re-render is severed.

**How to avoid:** Both the event listener registration AND the `insertTextAtSelection` function must reference the SAME `editorDiv` element. Since both live in `editor-lifecycle.ts` after the refactor, they share the same closure scope over the `dom.editorDiv` reference passed to the lifecycle factory.

**Warning signs:** Tab/Enter key tests in `editor.test.ts` pass but actual typing in the demo doesn't trigger re-renders.

### Pitfall 4: TypeScript Declaration Leak from `demo.d.ts`

**What goes wrong:** After the refactor, `dist/demo.d.ts` continues to appear because `tsc` was never reconfigured. Or conversely, the new `demo/` directory gets accidentally included in `package.json` `"files"`.

**Why it happens:** The `tsconfig.json` `"include": ["src"]` directive was correct when demo was in `src/`. After moving to `demo/`, `tsc` naturally excludes it. However, if `demo.ts` is moved but `tsconfig.json` is updated to `"include": ["src", "demo"]` (to type-check the demo), the leak returns.

**How to avoid:** Keep `tsconfig.json` `"include": ["src"]` unchanged. Add a separate `demo/tsconfig.json` for type-checking the demo if desired, or accept that the demo will not be type-checked by `npm run typecheck`. The `vite build` and `vite dev` commands handle the demo file through Vite's internal TypeScript compilation, which is separate from `tsc --noEmit`.

**Warning signs:** `dist/demo.d.ts` appears after `npm run build` despite demo code being in a different directory.

## Code Examples

### Module Decomposition: Complete editor.ts Orchestrator After Refactor

```typescript
// Source: Derived from current src/editor.ts, refactored per D-01/D-02
// This is what editor.ts looks like after decomposition (~40 lines vs current 496)

import type { Plugin, StorageAdapter, EditorOptions, EditorInstance, EditorContext } from './types'
import { LocalStorageAdapter } from './storage/localStorage'
import { defaultPlugins } from './plugins/defaults'
import { decodePathSearch } from './navigation'
import { createEditorState } from './editor-state'
import { createEditorDOM } from './editor-dom'
import { createEditorRender } from './editor-render'
import { createEditorNavigation } from './editor-navigation'
import { createEditorLifecycle } from './editor-lifecycle'

export class EditorBuilder {
  // ... unchanged (lines 27-82 of current editor.ts)
  mount(): EditorInstance {
    return mountEditor(this.el, this.plugins, this.storage, this.options)
  }
}

export function createEditor(el: HTMLElement, options: EditorOptions = {}): EditorBuilder {
  return new EditorBuilder(el, options)
}

function mountEditor(
  container: HTMLElement,
  plugins: Plugin[],
  storage: StorageAdapter,
  options: EditorOptions,
): EditorInstance {
  // 1. Initialize state
  const initialTrail = decodePathSearch(window.location.search)
  const state = createEditorState(storage, options)
  
  // 2. Build DOM
  const dom = createEditorDOM(container)
  
  // 3. Create render pipeline (needs state + plugins + DOM refs)
  const render = createEditorRender(dom, plugins, state, options)
  
  // 4. Create navigation (needs state + storage + render callbacks)
  const navigation = createEditorNavigation(state, storage, dom, render)
  
  // 5. Wire lifecycle (needs everything + returns EditorInstance)
  const instance = createEditorLifecycle(dom, plugins, state, render, navigation, storage, options)
  
  // 6. Load initial page
  navigation.loadPage(state.getTrail()[state.getTrail().length - 1])
  
  return instance
}
```

### Cursor Edge Case Test: Empty Document

```typescript
// Source: Derived from existing src/__tests__/cursor.test.ts patterns
// New test for ARCH-03: empty contenteditable

it('handles empty contenteditable with offset 0', () => {
  const div = element('DIV', [])
  document.body.appendChild(div)
  
  // setCaretOffset on empty element should fall back gracefully
  setCaretOffset(div, 0) // should not throw
  
  const sel = window.getSelection()
  expect(sel).toBeTruthy()
  
  document.body.removeChild(div)
})

it('extractText returns empty string for contenteditable with only BR', () => {
  const div = element('DIV', [element('BR')])
  const result = extractText(div)
  expect(result).toBe('\n')
})
```

### Cursor Edge Case Test: Multi-byte Characters

```typescript
// Source: Derived from existing cursor test patterns
// New test for ARCH-03: multi-byte character offset correctness

it('correctly counts multi-byte characters in text extraction', () => {
  const div = element('DIV', [text('hello 👋 world 🚀')])
  const result = getTextOffset(div, null, 0)
  expect(result.text).toBe('hello 👋 world 🚀')
  // The offset should count characters, not bytes
})

it('setCaretOffset handles position within multi-byte text', () => {
  const div = element('DIV', [text('abc👋def')])
  document.body.appendChild(div)
  
  // Position 4 should land after the emoji (👋 is 1 character, 2 code units in JS)
  setCaretOffset(div, 5) // after 'abc👋'
  
  const sel = window.getSelection()
  expect(sel).toBeTruthy()
  expect(sel!.rangeCount).toBe(1)
  
  document.body.removeChild(div)
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic `mountEditor()` closure (496 lines, 10 concerns) | 5 focused modules + thin orchestrator (~40 lines) | This phase | Enables Phase 3 plugin manifest changes by making render pipeline boundaries explicit |
| `demo.ts` in `src/` with `demo.d.ts` leak | `demo/` directory, zero declaration leak | This phase | Cleaner library output; demo stays available for `npm run dev` |
| 10 cursor test cases (basic offset/paste/br) | 22-25 cursor test cases (adds empty doc, multi-byte, line boundaries, forced offsets) | This phase | Safety net before renderer modifications in Phase 3 |

**Deprecated/outdated:**
- `dist/demo.d.ts` (empty `export {};`) — will be eliminated after file move
- Implicit module boundaries within `editor.ts` (comments like `// ── Render ──`) — replaced by explicit file/module boundaries

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The factory-function pattern (passing mutable state as parameters) is the correct extraction approach for closure-based code | Architecture Patterns | Low — this is the standard pattern for decomposing closures; alternatives (classes, global state) are explicitly ruled out by D-03 |
| A2 | `tsc` with `include: ["src"]` and `rootDir: "./src"` will automatically exclude `demo/` directory from compilation | demo.ts Extraction | Very low — this is standard TypeScript behavior and can be verified by running `tsc` after the file move |
| A3 | Vite's dev server (`npm run dev`) will serve files from `demo/` directory if `index.html` references `/demo/demo.ts` | demo.ts Extraction | Low — Vite serves from project root by default; if server.fs.strict restrictions apply, may need `server.fs.allow` config |
| A4 | `insertTextAtSelection` can be extracted as a standalone function with no editor-state dependencies (only needs `editorDiv` and `window.getSelection()`) | Architecture Patterns | Very low — verified by reading the function body (lines 333-349); it only uses DOM APIs |
| A5 | Moving demo.ts will not break `npm run typecheck` because tsc includes only `src/` | demo.ts Extraction | Very low — verified by tsconfig.json include directive |
| A6 | The `DEFAULT_CSS` constant belongs in `editor-dom.ts` alongside `injectStyles()` and the `el()` helper | Architecture Patterns | Low — all three are DOM construction concerns; separating them across modules would add unnecessary imports |

## Open Questions

1. **Breadcrumb click handler circular reference:**
   - What we know: In the current code (line 196), clicking a breadcrumb calls `trail = trail.slice(0, i + 1)` then `loadPage(trail[trail.length - 1])`. This breadcrumb click handler is part of `renderBreadcrumb()` in `editor-render.ts` but needs to call `loadPage()` from `editor-navigation.ts`.
   - What's unclear: Does the breadcrumb handler get the navigation callback via parameter injection (passed to `createEditorRender`), or does the breadcrumb click set up an indirect call through `state.truncateTrail()` followed by the lifecycle module detecting the change?
   - Recommendation: Pass a `loadPage` callback as a parameter to `createEditorRender()`. This maintains the DAG (navigation is created before render, so the callback exists) while keeping modules decoupled.

2. **`syncUrlToTrail` dependency on `trail` state:**
   - What we know: `syncUrlToTrail()` reads `trail` (line 208-214) via `encodePathSearch(window.location.search, trail)`. It needs the current trail array.
   - What's unclear: Should `syncUrlToTrail` be a standalone function in `editor-render.ts` that takes `trail: string[]` as a parameter, or should it be a method that reads from `state.getTrail()` internally?
   - Recommendation: Make it a standalone function `syncUrlToTrail(trail: string[])` — pure, testable, and the caller (`renderBreadcrumb`) already has access to the trail.

3. **`editorDiv.focus()` call placement after refactor:**
   - What we know: In the current code, `editorDiv.focus()` is called at the end of `loadPage()` (line 262). After extraction, `loadPage()` lives in `editor-navigation.ts`.
   - What's unclear: Does `editor-navigation.ts` receive the `editorDiv` reference (creating a dependency on the DOM module), or does the lifecycle module call `focus()` after `loadPage` completes?
   - Recommendation: Pass `dom.editorDiv` to `createEditorNavigation()`. Navigation already deals with `editorDiv.textContent = content` (line 242), so it already has DOM coupling. This is a practical dependency, not an architectural violation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tooling (Vitest, Vite, tsc, ESLint) | ✓ | 22.21.1 | — |
| npm | Package management, scripts | ✓ | bundled | — |
| TypeScript (`tsc`) | Type checking, declaration generation | ✓ | 5.9.3 | — |
| Vite | Build, dev server | ✓ | 7.3.3 | — |
| Vitest | Test runner | ✓ | 4.1.7 | — |
| ESLint | Linting | ✓ | (via npx) | — |
| Prettier | Formatting | ✓ | (via npx) | — |
| happy-dom | Cursor DOM tests | ✓ | ^20.9.0 (npm) | — |
| fake-indexeddb | Storage adapter tests | ✓ | ^6.2.5 (npm) | — |

**Missing dependencies with no fallback:** None — all required tooling is installed and verified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vite.config.ts` (inline test config) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm test` (vitest run) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Editor monolith split into 5 modules | Smoke | `npm run build && npm run typecheck` | ❌ Wave 0 (manual verification — build succeeds, types pass) |
| ARCH-01 | Public API (createEditor, EditorBuilder, EditorInstance) unchanged | Integration | `npx vitest run src/__tests__/editor.test.ts` | ✅ (12 tests, will still pass if API unchanged) |
| ARCH-01 | All 103 existing tests pass after refactor | Regression | `npm test` | ✅ (existing suites) |
| ARCH-02 | Render pipeline intact (extract→tokenize→render→caret) | Integration | `npx vitest run src/__tests__/renderer.test.ts src/__tests__/tokenizer.test.ts` | ✅ (existing suites) |
| ARCH-03 | Cursor edge cases: empty documents | Unit | `npx vitest run src/__tests__/cursor.test.ts -t "empty"` | ❌ Wave 0 |
| ARCH-03 | Cursor edge cases: multi-byte characters | Unit | `npx vitest run src/__tests__/cursor.test.ts -t "multi-byte"` | ❌ Wave 0 |
| ARCH-03 | Cursor edge cases: line boundaries | Unit | `npx vitest run src/__tests__/cursor.test.ts -t "line boundary\|newline\|between lines"` | ❌ Wave 0 |
| ARCH-03 | Cursor edge cases: forced offsets (exceeds text, negative-like positions) | Unit | `npx vitest run src/__tests__/cursor.test.ts -t "forced\|exceeds\|boundary"` | ✅ (1 test: offset 999 falls back) |
| ARCH-04 | demo.ts not in library build output | Smoke | `npm run build && ! grep -q mentionPlugin dist/worldnotes.js` | ❌ Wave 0 (manual check) |
| ARCH-04 | No demo.d.ts in dist/ | Smoke | `npm run build && test ! -f dist/demo.d.ts` | ❌ Wave 0 (manual check) |
| ARCH-04 | npm run dev still works with demo | Manual | `npx vite` (visual check in browser) | ❌ Wave 0 (manual) |
| ARCH-05 | docs/architecture.md updated with new module structure | Documentation | `cat docs/architecture.md \| grep -c "editor-"` | ❌ Wave 0 (content check) |

### Sampling Rate
- **Per task commit:** `npm run typecheck && npx vitest run src/__tests__/cursor.test.ts` (cursor tests most likely to break)
- **Per wave merge:** `npm test` (full 103-test suite)
- **Phase gate:** Full suite green + `npm run build` produces clean dist/ + `npm run typecheck` passes before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/cursor.test.ts` — add 12-15 new test cases: empty document (2), multi-byte characters (3), line boundaries (4), mixed data-raw+text edge cases (3), findTextPosition at data-raw boundaries (2)
- [ ] `src/__tests__/editor.test.ts` — verify no regressions after refactor (existing 12 tests serve as contract tests)
- [ ] No new test file for `editor-state.ts` needed — state is tested indirectly through editor integration tests
- [ ] Test file for `insertTextAtSelection` as a standalone function — can be added if extracted as exportable utility

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — browser library, no auth server |
| V3 Session Management | No | Not applicable — no user sessions |
| V4 Access Control | No | Not applicable — no server-side authorization |
| V5 Input Validation | Yes (limited) | Text content from `contentEditable` is already processed by `insertTextAtSelection` (plain text only via `e.clipboardData.getData('text/plain')`); Tab/Enter insert controlled characters via `insertTextAtSelection` |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for browser contentEditable library

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via pasted HTML content | Tampering | Already mitigated — paste handler strips formatting: `e.clipboardData.getData('text/plain')` (line 283). Only plain text is ever inserted. |
| XSS via innerHTML assignment | Tampering | Already mitigated — `render()` uses `editorDiv.innerHTML = ''` to clear, then appends `DocumentFragment`s and `TextNode`s created by plugin `render()` calls. No user content is ever set via `innerHTML`. |
| XSS via URL parameters (path=) | Spoofing | Low risk — URL query params are decoded and used as page names. If a malicious URL sets `?path=<script>`, it becomes a page name like `<script>`, stored as string, never executed. `decodePathSearch` decodes but doesn't execute. |
| Content injection via storage adapter | Tampering | Storage adapters are trusted code (in-process). If a consumer implements a malicious adapter, they have full access to the editor anyway. Not a library concern. |
| DOM clobbering via `dataset.raw` | Tampering | Low risk — `dataset.raw` is set by library renderer code, never from user input directly. The regex group captures from `TokenDef.pattern` match strings, which are used as-is. |

**No new security risks are introduced by module decomposition** — this is a structural refactor that doesn't add new data flow paths, new user input surfaces, or new external dependencies.

## Sources

### Primary (HIGH confidence)
- `src/editor.ts` (full 496-line source) — verified by reading the complete file; all function boundaries, closure variables, and dependency relationships confirmed
- `src/types.ts` (121 lines) — verified all public interfaces: `Plugin`, `StorageAdapter`, `EditorContext`, `EditorOptions`, `EditorInstance`
- `src/cursor.ts` (221 lines) — verified `getCaretOffset`, `setCaretOffset`, `extractText`, `getTextOffset`, `findTextPosition` signatures
- `src/tokenizer.ts` (97 lines) — verified `tokenizeDocument`, `tokenizeLine` signatures
- `src/renderer.ts` (107 lines) — verified `renderDocument`, `renderLine`, `buildPluginMap` signatures
- `src/navigation.ts` (45 lines) — verified `decodePathSearch`, `encodePathSearch`, `pageDisplayName` signatures
- `src/index.ts` (29 lines) — verified public API surface
- `src/demo.ts` (70 lines) — verified demo code doesn't leak into JS bundle
- `vite.config.ts` (23 lines) — verified `build.lib.entry` is `src/index.ts`
- `tsconfig.json` (18 lines) — verified `include: ["src"]`, `rootDir: "./src"`
- `package.json` — verified all dependency versions, `"files": ["dist"]`
- `.planning/phases/02-architecture-refactoring/02-CONTEXT.md` — all locked decisions (D-01 through D-08)
- `.planning/REQUIREMENTS.md` — ARCH-01 through ARCH-05
- `dist/` directory listing — verified `demo.d.ts` exists and is empty
- npm registry version checks: TypeScript 5.9.3, Vite 7.3.3, Vitest 4.1.7
- 103 tests passing at 528ms total runtime (verified by running `vitest run`)

### Secondary (MEDIUM confidence)
- Context7 Vite library mode docs (`/vitejs/vite`) — multi-entry build configuration pattern
- `src/__tests__/cursor.test.ts` (167 lines) — verified existing 10 test cases, identified gap areas
- `src/__tests__/editor.test.ts` (292 lines) — verified 12 editor integration tests serve as API contract tests

### Tertiary (LOW confidence)
- N/A — all findings in this research are backed by direct codebase reading and tool verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry and tool invocations; no new dependencies needed
- Architecture: HIGH — every function, closure variable, and import relationship verified by reading complete source files
- Pitfalls: MEDIUM — pitfall identification is based on code analysis and experience with closure extraction refactors; some pitfalls only manifest at integration time
- Cursor test gaps: HIGH — gaps identified by comparing existing test assertions against the full `cursor.ts` API surface and data flow paths

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (30 days — stable TypeScript/Vite toolchain, unlikely to change materially)
