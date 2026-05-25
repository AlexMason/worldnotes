# CRDT Renderer & Real-Time Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synchronous DOM-wipe renderer with Yjs CRDT document model + line-granular re-renderer + WebSocket sync + multi-cursor support.

**Architecture:** Y.Doc with Y.Map<Y.Text> for pages becomes the single source of truth. Renderer uses stable `div[data-line=N]` containers, only re-rendering changed lines. Cursor tracked as Y.Text offset in Yjs Awareness (decoupled from DOM). Y.WebsocketProvider for real-time sync. StorageAdapter bridge for offline persistence.

**Tech Stack:** yjs, y-websocket, y-protocols, y-leveldb (server), JSZip (existing)

---

## Phase 1: Y.Doc Foundation + Renderer Refactor

### Task 1: Install dependencies & scaffold server dir

**Files:**
- Modify: `package.json`
- Create: `src/server/tsconfig.json`

- [ ] **Step 1: Install yjs + y-websocket**

```bash
npm install yjs y-websocket
```

- [ ] **Step 2: Install y-protocols + y-leveldb for server**

```bash
npm install y-protocols y-leveldb
```

- [ ] **Step 3: Create server tsconfig**

Create `src/server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "../../dist/server",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 4: Verify installs**

```bash
npm ls yjs y-websocket y-protocols y-leveldb
```

---

### Task 2: Create Y.Doc state module (replaces editor-state.ts internals)

**Files:**
- Create: `src/y-doc-state.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Extend EditorContext in types.ts**

In `src/types.ts`, after the existing `EditorContext` interface, add:

```typescript
import type * as Y from 'yjs'

export interface EditorContext {
  navigate(page: string): void
  getTrail(): string[]
  getWorld(): Record<string, string>
  getDoc(): Y.Doc  // new
}
```

- [ ] **Step 2: Add YDocState module**

Create `src/y-doc-state.ts`:
```typescript
import * as Y from 'yjs'
import type { EditorContext, StorageAdapter } from './types'

export interface YDocState {
  readonly doc: Y.Doc
  readonly pages: Y.Map<Y.Text>
  readonly awareness: awarenessProtocolModule.Awareness | null
  readonly undoManager: Y.UndoManager | null
  getDoc(): Y.Doc
  getPage(page: string): Y.Text
  hasPage(page: string): boolean
  getWorld(): Record<string, string>
  setAwareness(awareness: awarenessProtocolModule.Awareness): void
  setUndoManager(um: Y.UndoManager): void
  toContext(navigate: (page: string) => void): EditorContext
  encodeStateAsUpdate(): Uint8Array
  applyUpdate(update: Uint8Array): void
  destroy(): void
}

export function createYDocState(): YDocState {
  const doc = new Y.Doc()
  const pages = doc.getMap<Y.Text>('pages')
  let _awareness: awarenessProtocolModule.Awareness | null = null
  let _undoManager: Y.UndoManager | null = null

  function getPage(page: string): Y.Text {
    let ytext = pages.get(page)
    if (!ytext) {
      ytext = new Y.Text()
      pages.set(page, ytext)
    }
    return ytext
  }

  return {
    doc,
    pages,
    get awareness() { return _awareness },
    get undoManager() { return _undoManager },

    getDoc(): Y.Doc { return doc },
    
    getPage(page: string): Y.Text { return getPage(page) },

    hasPage(page: string): boolean { return pages.has(page) },

    getWorld(): Record<string, string> {
      const world: Record<string, string> = {}
      for (const [key, ytext] of pages.entries()) {
        world[key] = ytext.toString()
      }
      return world
    },

    setAwareness(awareness: awarenessProtocolModule.Awareness): void {
      _awareness = awareness
    },

    setUndoManager(um: Y.UndoManager): void {
      _undoManager = um
    },

    toContext(navigate: (page: string) => void): EditorContext {
      return {
        navigate,
        getTrail: () => [], // placeholder, overwritten by caller
        getWorld: () => this.getWorld(),
        getDoc: () => doc,
      }
    },

    encodeStateAsUpdate(): Uint8Array {
      return Y.encodeStateAsUpdate(doc)
    },

    applyUpdate(update: Uint8Array): void {
      Y.applyUpdate(doc, update)
    },

    destroy(): void {
      _awareness?.destroy()
      _undoManager?.destroy()
      doc.destroy()
    },
  }
}
```

Wait -- `this` usage in arrow context is wrong. Fix `toContext`:

```typescript
    toContext(navigate: (page: string) => void): EditorContext {
      const self = this
      return {
        navigate,
        getTrail: () => [],
        getWorld: () => self.getWorld(),
        getDoc: () => doc,
      }
    },
```

Also `import type * as Y from 'yjs'` won't work for `new Y.Doc()` -- need value import:

```typescript
import * as Y from 'yjs'
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

### Task 3: Integrate YDocState into EditorBuilder

**Files:**
- Modify: `src/editor.ts`
- Modify: `src/editor-state.ts`

- [ ] **Step 1: Create wrapper state module**

Modify `src/editor-state.ts` to wrap YDocState. Add new factory:

```typescript
import { createYDocState, type YDocState } from './y-doc-state'

export interface EditorStateAPI {
  // Keep existing public API for backward compat internally
  getYDocState(): YDocState
  getTrail(): string[]
  getWorld(): Record<string, string>
  pushTrail(page: string): void
  setTrail(trail: string[]): void
  truncateTrail(index: number): void
  setNavigating(v: boolean): boolean
  isNavigating(): boolean
  clearSaveTimer(): void
  setSaveTimer(timer: ReturnType<typeof setTimeout> | null): void
  toContext(navigate: (page: string) => void): EditorContext
}

export function createEditorState(
  storage: StorageAdapter,
  options: EditorOptions = {},
): EditorStateAPI {
  const yDocState = createYDocState()
  const configuredInitialPage = options.initialPage ?? 'home'
  const initialTrail = decodePathSearch(window.location.search)
  const initialPage = initialTrail[initialTrail.length - 1] ?? configuredInitialPage

  let trail: string[] = initialTrail.length ? [...initialTrail] : [initialPage]
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false

  return {
    getYDocState(): YDocState { return yDocState },
    getTrail(): string[] { return [...trail] },
    getWorld(): Record<string, string> { return yDocState.getWorld() },
    pushTrail(page: string): void { trail.push(page) },
    setTrail(t: string[]): void { trail = t },
    truncateTrail(index: number): void { trail = trail.slice(0, index + 1) },
    setNavigating(v: boolean): boolean { isNavigating = v; return v },
    isNavigating(): boolean { return isNavigating },
    clearSaveTimer(): void { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null } },
    setSaveTimer(timer: ReturnType<typeof setTimeout> | null): void { saveTimer = timer },
    toContext(navigate: (page: string) => void): EditorContext {
      const ctx = yDocState.toContext(navigate)
      return {
        ...ctx,
        getTrail: () => [...trail],
      }
    },
  }
}
```

Also remove `world` property and `setWorldPage`, `history` from EditorStateAPI -- they'll be replaced.

- [ ] **Step 2: Update EditorHistory references**

Remove `import { EditorHistory } from './editor-history'` from editor-state.ts.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

### Task 4: Rewrite editor-render.ts for line-granular updates

**Files:**
- Modify: `src/editor-render.ts`
- Create: `src/line-renderer.ts`

- [ ] **Step 1: Create line-renderer.ts**

Create `src/line-renderer.ts`:
```typescript
import type { ContentPlugin, EditorContext, Token } from './types'
import { tokenizeDocument } from './tokenizer'
import { renderLine } from './renderer'

export interface LineCache {
  get(key: number): string | undefined
  set(key: number, value: string): void
  delete(key: number): void
  clear(): void
}

function createLineCache(): LineCache {
  const cache = new Map<number, string>()
  return {
    get(key) { return cache.get(key) },
    set(key, value) { cache.set(key, value) },
    delete(key) { cache.delete(key) },
    clear() { cache.clear() },
  }
}

export function renderLines(
  text: string,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  cache: LineCache,
  editorDiv: HTMLElement,
): { lineCount: number; lineLengths: number[] } {
  const lines = tokenizeDocument(text, contentPlugins.flatMap((p) => p.tokens))
  const lineLengths: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].map((t) => t.raw).join('')
    lineLengths.push(lineText.length)

    if (cache.get(i) === lineText) continue // unchanged

    cache.set(i, lineText)

    const fragment = renderLine(lines[i], contentPlugins, context)

    let container = editorDiv.querySelector(`[data-line="${i}"]`) as HTMLElement | null
    if (container) {
      container.innerHTML = ''
      container.appendChild(fragment.childNodes.length ? fragment : document.createElement('br'))
    } else {
      container = document.createElement('div')
      container.dataset.line = String(i)
      container.appendChild(fragment.childNodes.length ? fragment : document.createElement('br'))
      editorDiv.appendChild(container)
    }
  }

  // Remove excess line containers
  while (editorDiv.querySelector(`[data-line="${lines.length}"]`)) {
    const el = editorDiv.querySelector(`[data-line="${lines.length}"]`) as HTMLElement
    el.remove()
  }

  for (let i = lines.length; i < 1000; i++) {
    if (!editorDiv.querySelector(`[data-line="${i}"]`)) break
  }

  // Clean stale cache entries beyond current line count
  for (const key of Array.from((cache as any)._map?.keys?.() ?? [])) {
    if (key >= lines.length) cache.delete(key)
  }

  return { lineCount: lines.length, lineLengths }
}
```

Wait -- the cache is Map<string, string> in memory. Let me make the cache object expose the keys for cleanup. Better to just iterate and delete.

Actually let me simplify: use a plain `Map<number, string>` and expose it directly. No need for the class wrapper.

Let me rewrite:

```typescript
import type { ContentPlugin, EditorContext, Token } from './types'
import { tokenizeDocument } from './tokenizer'
import { renderLine } from './renderer'

export function renderLines(
  text: string,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  cache: Map<number, string>,
  editorDiv: HTMLElement,
): { lineCount: number; lineLengths: number[] } {
  const lines = tokenizeDocument(text, contentPlugins.flatMap((p) => p.tokens))
  const lineLengths: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].map((t) => t.raw).join('')
    lineLengths.push(lineText.length)

    if (cache.get(i) === lineText) continue

    cache.set(i, lineText)

    const fragment = renderLine(lines[i], contentPlugins, context)

    let container = editorDiv.querySelector(`[data-line="${i}"]`) as HTMLElement | null
    if (container) {
      container.innerHTML = ''
      const count = fragment.childNodes.length
      if (count) {
        container.appendChild(fragment)
      } else {
        container.appendChild(document.createElement('br'))
      }
    } else {
      container = document.createElement('div')
      container.dataset.line = String(i)
      const count = fragment.childNodes.length
      if (count) {
        container.appendChild(fragment)
      } else {
        container.appendChild(document.createElement('br'))
      }
      editorDiv.appendChild(container)
    }
  }

  // Remove excess line containers
  const nextEl = editorDiv.querySelector(`[data-line="${lines.length}"]`)
  while (nextEl) {
    let el = editorDiv.querySelector(`[data-line="${lines.length}"]`) as HTMLElement | null
    while (el) {
      el.remove()
      el = editorDiv.querySelector(`[data-line="${lines.length}"]`) as HTMLElement | null
    }
  }

  // Clean stale cache
  for (const key of cache.keys()) {
    if (key >= lines.length) cache.delete(key)
  }

  return { lineCount: lines.length, lineLengths }
}
```

The `nextEl` loop is wrong. Let me fix. After the for loop, there's a `while` that checks for `[data-line="${lines.length}"]` -- but the querySelector will only return one element. Better to just use querySelectorAll or a simple approach.

Actually the simplest approach: after rendering all needed lines, remove any containers beyond the count.

```typescript
  // Remove excess line containers (beyond current line count)
  const allContainers = editorDiv.querySelectorAll('[data-line]')
  for (const el of allContainers) {
    const idx = parseInt((el as HTMLElement).dataset.line ?? '-1', 10)
    if (idx >= lines.length || idx < 0) {
      el.remove()
    }
  }
```

- [ ] **Step 2: Update editor-render.ts for line-granular rendering**

Modify `src/editor-render.ts` -- replace the `render()` function with Y.Text-based line-granular render:

```typescript
import type { ContentPlugin } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import { renderLines } from './line-renderer'
import { pageDisplayName, encodePathSearch } from './navigation'

export interface EditorRenderAPI {
  render(force?: boolean): void
  renderBreadcrumb(): void
  syncUrlToTrail(): void
}

export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
}

export function createEditorRender(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  state: EditorStateAPI,
  options: EditorRenderOptions = {},
): EditorRenderAPI {
  const { editorDiv, placeholder, breadcrumb } = dom
  const lineCache = new Map<number, string>()

  function render(force = false): void {
    if (force) lineCache.clear()

    const yDocState = state.getYDocState()
    const trail = state.getTrail()
    const page = trail[trail.length - 1]
    const ytext = yDocState.getPage(page)
    const raw = ytext.toString()

    const context = state.toContext(
      options.navigateFn ??
        ((_p: string): void => { /* noop */ }),
    )

    const { lineCount } = renderLines(raw, contentPlugins, context, lineCache, editorDiv)

    // Update placeholder visibility
    placeholder.style.display = raw.length ? 'none' : 'block'

    // Re-order containers to ensure sequential [data-line] order
    const containers = Array.from(editorDiv.querySelectorAll('[data-line]'))
    containers.sort((a, b) => {
      const ai = parseInt((a as HTMLElement).dataset.line ?? '0', 10)
      const bi = parseInt((b as HTMLElement).dataset.line ?? '0', 10)
      return ai - bi
    })
    containers.forEach((c) => editorDiv.appendChild(c))
  }

  // ── Breadcrumb rendering ──────────────────────────────────────────────────
  function renderBreadcrumb(): void {
    breadcrumb.innerHTML = ''
    const trail = state.getTrail()

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
          const newTrail = state.getTrail()
          const targetPage = newTrail[newTrail.length - 1]
          options.onBreadcrumbNavigate?.(targetPage)
        })
      }
      breadcrumb.appendChild(crumb)
    })

    options.onTrailChange?.(state.getTrail())
    syncUrlToTrail()
  }

  // ── URL sync ──────────────────────────────────────────────────────────────
  function syncUrlToTrail(): void {
    const trail = state.getTrail()
    const search = encodePathSearch(window.location.search, trail)
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search}${window.location.hash}`,
    )
  }

  return { render, renderBreadcrumb, syncUrlToTrail }
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

### Task 5: Cursor handling via Yjs Awareness offset

**Files:**
- Create: `src/awareness-cursor.ts`
- Modify: `src/editor-lifecycle.ts`
- Modify: `src/editor-render.ts`

- [ ] **Step 1: Create awareness-cursor module**

Create `src/awareness-cursor.ts`:
```typescript
export function getAwarenessOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return 0

  const range = sel.getRangeAt(0)
  const container = range.startContainer

  // Walk up to find the [data-line] parent of this text node
  let lineEl = container as Node | null
  while (lineEl && !(lineEl instanceof HTMLElement && lineEl.dataset.line !== undefined)) {
    lineEl = lineEl.parentNode
  }

  if (!lineEl || !(lineEl instanceof HTMLElement)) return 0

  const lineIndex = parseInt(lineEl.dataset.line ?? '0', 10)

  // Count characters in all lines before this one
  let offset = 0
  const allLines = Array.from(
    el.querySelectorAll('[data-line]'),
  ) as HTMLElement[]
  allLines.sort((a, b) => {
    return parseInt(a.dataset.line ?? '0', 10) - parseInt(b.dataset.line ?? '0', 10)
  })

  for (const line of allLines) {
    const idx = parseInt(line.dataset.line ?? '0', 10)
    if (idx >= lineIndex) break
    offset += (line.textContent ?? '').length + 1 // +1 for newline
  }

  // Now find the offset within the current line's text nodes
  let lineOffset = 0
  let found = false

  function walkLineNodes(node: Node): void {
    if (found) return
    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node as Text).length
      if (node === container || (node.contains(container) && container.nodeType === Node.TEXT_NODE)) {
        lineOffset += container === node ? range.startOffset : 0
        found = true
        return
      }
      lineOffset += length
      return
    }
    node.childNodes.forEach(walkLineNodes)
  }

  walkLineNodes(lineEl)

  return offset + lineOffset
}

export function setAwarenessOffset(el: HTMLElement, targetOffset: number): void {
  let remaining = targetOffset

  const allLines = Array.from(
    el.querySelectorAll('[data-line]'),
  ) as HTMLElement[]
  allLines.sort((a, b) => {
    return parseInt(a.dataset.line ?? '0', 10) - parseInt(b.dataset.line ?? '0', 10)
  })

  for (const lineEl of allLines) {
    const lineLen = (lineEl.textContent ?? '').length

    if (remaining <= lineLen) {
      // Found the line -- place cursor within it
      const result = findTextInLine(lineEl, remaining)
      if (result) {
        const sel = window.getSelection()
        if (!sel) return
        const range = document.createRange()
        range.setStart(result.node, result.offset)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
      return
    }

    remaining -= lineLen + 1 // +1 for newline
  }

  // Fallback: end of last line
  const lastLine = allLines[allLines.length - 1]
  if (lastLine) {
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    const lastText = lastLine.lastChild
    if (lastText && lastText.nodeType === Node.TEXT_NODE) {
      range.setStart(lastText, (lastText as Text).length)
    } else {
      range.selectNodeContents(lastLine)
    }
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

function findTextInLine(
  lineEl: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
  let remaining = offset

  function walk(node: Node): { node: Text; offset: number } | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node as Text).length
      if (remaining <= len) {
        return { node: node as Text, offset: remaining }
      }
      remaining -= len
      return null
    }
    for (const child of node.childNodes) {
      const result = walk(child)
      if (result) return result
    }
    return null
  }

  return walk(lineEl)
}
```

- [ ] **Step 2: Replace extractText/getCaretOffset/setCaretOffset usage in lifecycle**

In `src/editor-lifecycle.ts`, update input handler to use Y.Text and awareness cursor:

```typescript
import { getAwarenessOffset, setAwarenessOffset } from './awareness-cursor'

// In mount(), the input handler becomes:
dom.editorDiv.addEventListener('input', () => {
  if (state.isNavigating()) return

  const yDocState = state.getYDocState()
  const trail = state.getTrail()
  const page = trail[trail.length - 1]
  const ytext = yDocState.getPage(page)

  // Read DOM text and update Y.Text
  const raw = dom.editorDiv.textContent ?? ''
  const current = ytext.toString()
  if (raw !== current) {
    ytext.delete(0, current.length)
    ytext.insert(0, raw)
  }

  // Update awareness cursor
  const aw = yDocState.awareness
  if (aw) {
    const offset = getAwarenessOffset(dom.editorDiv)
    aw.setLocalStateField('cursor', { offset, page })
  }

  render.render()

  for (const plugin of contentPlugins) {
    plugin.onUpdate?.()
  }

  // Debounced save
  state.clearSaveTimer()
  const timer = setTimeout(async () => {
    const update = yDocState.encodeStateAsUpdate()
    const blob = new Blob([update])
    const base64 = await blobToBase64(blob)
    await storage.set('__ync_update__', base64)
    options.onSave?.(page, raw)
  }, saveDebounce)
  state.setSaveTimer(timer)
})
```

Need `blobToBase64` helper:
```typescript
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
```

Actually, better to store as base64 string directly:
```typescript
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

### Task 6: Replace EditorHistory with Y.UndoManager

**Files:**
- Modify: `src/editor-lifecycle.ts`
- Modify: `src/editor.ts`

- [ ] **Step 1: Create UndoManager wiring in lifecycle**

In `mount()`, after the initial page load, set up Y.UndoManager:

```typescript
import * as Y from 'yjs'

// After loading initial page in mount():
const trail = state.getTrail()
const initialPage = trail[trail.length - 1]
const yDocState = state.getYDocState()
const ytext = yDocState.getPage(initialPage)
const undoManager = new Y.UndoManager(ytext)
yDocState.setUndoManager(undoManager)

// Undo/Redo in keydown handler becomes:
// Ctrl+Z
if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
  e.preventDefault()
  yDocState.undoManager?.undo()
  render.render(true) // force re-render
  // Restore cursor from awareness
  const aw = yDocState.awareness
  if (aw) {
    const cursorData = aw.getLocalState()?.cursor
    if (cursorData) {
      setAwarenessOffset(dom.editorDiv, cursorData.offset)
    }
  }
  return
}
```

- [ ] **Step 2: Update public API undo/redo methods**

```typescript
undo(): boolean {
  const um = state.getYDocState().undoManager
  if (!um || !um.canUndo()) return false
  um.undo()
  render.render(true)
  return true
},

redo(): boolean {
  const um = state.getYDocState().undoManager
  if (!um || !um.canRedo()) return false
  um.redo()
  render.render(true)
  return true
},
```

- [ ] **Step 3: Update canUndo/canRedo**

```typescript
canUndo(): boolean {
  return state.getYDocState().undoManager?.canUndo() ?? false
},
canRedo(): boolean {
  return state.getYDocState().undoManager?.canRedo() ?? false
},
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

---

### Task 7: Update editor-navigation for Y.Doc

**Files:**
- Modify: `src/editor-navigation.ts`

- [ ] **Step 1: Rewrite navigateToPage/loadPage for Y.Doc**

```typescript
async function navigateToPage(page: string): Promise<void> {
  const yDocState = state.getYDocState()
  if (!yDocState.hasPage(page)) {
    const stored = await storage.get(page)
    if (stored) {
      const ytext = yDocState.getPage(page)
      ytext.insert(0, stored)
    } else {
      const ytext = yDocState.getPage(page)
      ytext.insert(0, `# ${page}\n\n`)
    }
  }
  state.pushTrail(page)
  await loadPage(page)
}

async function loadPage(page: string): Promise<void> {
  state.setNavigating(true)

  const yDocState = state.getYDocState()
  const ytext = yDocState.getPage(page)
  const content = ytext.toString()

  // If page is empty and it's 'home', use default
  if (!content && page === 'home') {
    ytext.insert(0, DEFAULT_HOME)
  } else if (!content) {
    ytext.insert(0, `# ${page}\n\n`)
  }

  // Set up undo manager for this page
  const undoManager = new Y.UndoManager(ytext)
  yDocState.setUndoManager(undoManager)

  // Clear render cache for full re-render
  dom.editorDiv.innerHTML = ''

  if (_render) {
    _render.render(true) // force full render
    _render.renderBreadcrumb()
  }

  // Cursor to start
  try {
    const range = document.createRange()
    const sel = window.getSelection()
    if (sel) {
      const firstLine = dom.editorDiv.querySelector('[data-line="0"]')
      if (firstLine) {
        range.setStart(firstLine, 0)
      } else {
        range.setStart(dom.editorDiv, 0)
      }
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  } catch { /* best-effort */ }

  options.onPageLoad?.(page, ytext.toString())
  state.setNavigating(false)
  dom.editorDiv.focus()
}
```

- [ ] **Step 2: Remove storage.set() during navigation**

Remove the `await storage.set(page, ...)` calls from navigateToPage -- Y.Doc persistence handles it.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

### Task 8: StorageAdapter persistence bridge

**Files:**
- Create: `src/yjs-storage-bridge.ts`
- Modify: `src/editor-lifecycle.ts`

- [ ] **Step 1: Create persistence bridge**

Create `src/yjs-storage-bridge.ts`:
```typescript
import * as Y from 'yjs'
import type { StorageAdapter } from './types'

const UPDATE_KEY = '__ync_update__'

export async function saveYDoc(doc: Y.Doc, storage: StorageAdapter): Promise<void> {
  const update = Y.encodeStateAsUpdate(doc)
  const base64 = uint8ArrayToBase64(update)
  await storage.set(UPDATE_KEY, base64)
}

export async function loadYDoc(doc: Y.Doc, storage: StorageAdapter): Promise<void> {
  const base64 = await storage.get(UPDATE_KEY)
  if (base64) {
    const update = base64ToUint8Array(base64)
    Y.applyUpdate(doc, update)
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
```

- [ ] **Step 2: Wire loadYDoc on mount, saveYDoc on debounced save**

Don't modify editor-lifecycle.ts saveContent yet -- it's already saving `__ync_update__` in the input handler. Instead, add `loadYDoc` call at startup in editor.ts or navigation.

In `src/editor.ts` mountEditor, before everything else:

```typescript
// Load persisted Y.Doc state
const yDocState = state.getYDocState()
await loadYDoc(yDocState.doc, storage)
```

But mountEditor is sync. Need to handle async loading. Move it to lifecycle mount() which is also sync currently and turns async.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

### Task 9: Complete editor-lifecycle.ts rewrite

**Files:**
- Modify: `src/editor-lifecycle.ts` (full rewrite)

Rewrite `editor-lifecycle.ts` to:
1. Remove `extractText`, `getCaretOffset`, `setCaretOffset` imports
2. Import `getAwarenessOffset`, `setAwarenessOffset` from awareness-cursor
3. Import `saveYDoc`, `loadYDoc` from yjs-storage-bridge
4. Make `mount()` async, calling `loadYDoc` before loading initial page
5. Input handler updates Y.Text directly from DOM textcontent
6. Undo/Redo uses Y.UndoManager
7. Save uses `saveYDoc` with base64 encoding
8. `getContent()` returns `ytext.toString()` instead of `extractText()`
9. `setContent()` writes to Y.Text, then re-renders

- [ ] **Step 1: Write the full file**

See the complete rewritten file below (too long to inline all at once -- implement step by step).

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

---

## Phase 2: Sync Transport

### Task 10: Create sync server

**Files:**
- Create: `src/server/index.ts`
- Create: `src/server/config.ts`

- [ ] Step 1: Write server entry point

- [ ] Step 2: Add dev:server script to package.json

- [ ] Step 3: Test server starts

---

### Task 11: Wire client WebsocketProvider

**Files:**
- Modify: `src/editor-lifecycle.ts`
- Add: `EditorOptions.syncServer`

- [ ] Step 1: Import and connect WebsocketProvider on mount

- [ ] Step 2: Handle offline fallback

- [ ] Step 3: Run typecheck + test

---

## Phase 3: Import/Export + Multi-Cursor

### Task 12: Update import/export for _worldnotes.yjs

**Files:**
- Modify: `src/export-import.ts`

- [ ] Step 1: Add _worldnotes.yjs to export

- [ ] Step 2: Handle _worldnotes.yjs on import

- [ ] Step 3: Add HTML export function

- [ ] Step 4: Run typecheck + test

---

### Task 13: Build RemoteCursorsUIPlugin

**Files:**
- Create: `src/plugins/remoteCursors.ts`

- [ ] Step 1: Create plugin that reads Awareness state

- [ ] Step 2: Render colored carets + name labels

- [ ] Step 3: Register in defaults

- [ ] Step 4: Run typecheck + test

---

## Phase 4: Integration & Polish

### Task 14: Update docs

**Files:**
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`

---

### Task 15: Update tests

**Files:**
- Modify: `src/__tests__/*.test.ts`

---

### Task 16: Full verification

```bash
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```
