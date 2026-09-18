# Status Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom status pages (404 Not Found, 403 Forbidden) with "Create page?" overlay and extensible status code mapping.

**Architecture:** Navigation-layer changes in `editor-navigation.ts` for redirect logic + overlay rendering in `editor-render.ts` (piggybacks on existing render cycle). New `PermissionError` class and `EditorOptions` fields in `types.ts`. New `pendingRequestedPage` field in `editor-state.ts`.

**Tech Stack:** TypeScript, Yjs CRDT, Vitest + happy-dom

---

### Task 1: Add PermissionError class

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add PermissionError class**

In `src/types.ts`, after the StorageAdapter interface (after line 46), add:

```typescript
// ─── Permission Error ──────────────────────────────────────────────────────────

/**
 * Thrown by StorageAdapter.get() when the caller lacks read access.
 * Caught by the editor navigation layer to trigger a 403 redirect.
 */
export class PermissionError extends Error {
  constructor(message?: string) {
    super(message ?? 'Permission denied')
    this.name = 'PermissionError'
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add PermissionError class for storage access control"
```

---

### Task 2: Add statusPages and showCreateOverlay to EditorOptions

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add fields to EditorOptions interface**

In `src/types.ts`, add after `saveDebounceMs` (after line 210; before `historyDepth`):

```typescript
  /**
   * Map of HTTP-style status codes to wiki page names.
   * Defaults to { 404: '404', 403: '403' } when not provided.
   *
   * @example
   * createEditor(el, { statusPages: { 404: 'not-found', 403: 'forbidden', 500: 'error' } })
   */
  statusPages?: Record<number, string>
  /**
   * Show the "Create page?" overlay banner on the 404 page.
   * When false, the 404 page displays without the overlay.
   * Default: true.
   */
  showCreateOverlay?: boolean
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add statusPages and showCreateOverlay to EditorOptions"
```

---

### Task 3: Add pendingRequestedPage to editor-state.ts

**Files:**
- Modify: `src/editor-state.ts`

- [ ] **Step 1: Add to EditorStateAPI interface**

In the `EditorStateAPI` interface (after `setSaveTimer`, around line 32), add:

```typescript
  /** The page name that was requested before redirecting to 404. null otherwise. */
  getPendingRequestedPage(): string | null
  /** Set the pending requested page (for 404 overlay). Set to null to clear. */
  setPendingRequestedPage(page: string | null): void
```

- [ ] **Step 2: Add mutable variable in createEditorState**

After `let isNavigating = false` (around line 52), add:

```typescript
  let pendingRequestedPage: string | null = null
```

- [ ] **Step 3: Add implementation methods in the return object**

After `setSaveTimer` implementation (around line 103), add:

```typescript
    getPendingRequestedPage(): string | null {
      return pendingRequestedPage
    },

    setPendingRequestedPage(page: string | null): void {
      pendingRequestedPage = page
    },
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/editor-state.ts
git commit -m "feat: add pendingRequestedPage to editor state"
```

---

### Task 4: Write failing tests for status page navigation

**Files:**
- Modify: `src/__tests__/editor-navigation.test.ts`

- [ ] **Step 1: Add import for PermissionError**

Add to the imports at line 5:

```typescript
import { PermissionError, type StorageAdapter, type EditorOptions, type EditorContext } from '../types'
```

- [ ] **Step 2: Add pendingRequestedPage methods to mockState**

In the `mockState` function, after the `setSaveTimer` line (around line 133), add:

```typescript
    getPendingRequestedPage: (): string | null => pendingRequestedPage,
    setPendingRequestedPage: (page: string | null): void => {
      pendingRequestedPage = page
    },
```

And add the mutable variable declaration after `let isNavigating = false` (around line 102):

```typescript
  let pendingRequestedPage: string | null = null
```

- [ ] **Step 3: Add new describe block for status pages**

Add after the `setRenderAPI` describe block (before the final closing `});` of the main describe, i.e., after line 436):

```typescript
  // ── Status Pages ──────────────────────────────────────────────────────────

  describe('status pages', () => {
    it('redirects to 404 page when page does not exist in Y.Doc or storage', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, { statusPages: { 404: '404-page' } })
      nav.setRenderAPI(render)

      await nav.navigateToPage('missing')

      expect(s.getPendingRequestedPage()).toBe('missing')
      expect(s.getTrail()).toContain('404-page')
      expect(s.getWorld()).toHaveProperty('404-page')
    })

    it('uses default "404" page name when statusPages is not configured', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('missing')

      expect(s.getTrail()).toContain('404')
      expect(s.getPendingRequestedPage()).toBe('missing')
    })

    it('does not redirect when page is found in storage', async () => {
      const s = mockState(['home'])
      const st = mockStorage({ 'exists': '# Exists\n\ncontent' })
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('exists')

      expect(s.getPendingRequestedPage()).toBeNull()
      expect(s.getTrail()).toContain('exists')
    })

    it('does not redirect when page is already in Y.Doc', async () => {
      const s = mockState(['home'])
      s.getYDocState().getPage('cached').insert(0, '# Cached')
      const nav = createEditorNavigation(s, storage, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('cached')

      expect(s.getPendingRequestedPage()).toBeNull()
      expect(s.getTrail()).toContain('cached')
    })

    it('redirects to 403 page when storage.get throws PermissionError', async () => {
      const forbidStorage: StorageAdapter = {
        get: async () => { throw new PermissionError('no access') },
        set: async () => {},
        keys: async () => [],
      }
      const s = mockState(['home'])
      const nav = createEditorNavigation(s, forbidStorage, dom, { statusPages: { 403: 'forbidden' } })
      nav.setRenderAPI(render)

      await nav.navigateToPage('restricted')

      expect(s.getTrail()).toContain('forbidden')
      expect(s.getWorld()).toHaveProperty('forbidden')
      expect(s.getPendingRequestedPage()).toBeNull()
    })

    it('uses default "403" page name for PermissionError when not configured', async () => {
      const forbidStorage: StorageAdapter = {
        get: async () => { throw new PermissionError() },
        set: async () => {},
        keys: async () => [],
      }
      const s = mockState(['home'])
      const nav = createEditorNavigation(s, forbidStorage, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('restricted')

      expect(s.getTrail()).toContain('403')
    })

    it('clears pendingRequestedPage when navigating from 404 to an existing page', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      // Navigate to trigger 404 redirect
      await nav.navigateToPage('missing')
      expect(s.getPendingRequestedPage()).toBe('missing')

      // Create the page in Y.Doc, then navigate to it
      s.getYDocState().getPage('missing').insert(0, '# content')
      s.setPendingRequestedPage('missing')
      // navigateToPage will clear it since target is not a status page
      await nav.navigateToPage('missing')
      expect(s.getPendingRequestedPage()).toBeNull()
    })

    it('auto-creates 404 page with default content when it does not exist', async () => {
      const s = mockState(['home'])
      const st = mockStorage({})
      const nav = createEditorNavigation(s, st, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('nonexistent')

      expect(s.getWorld()['404']).toContain('Page Not Found')
    })

    it('auto-creates 403 page with default content when it does not exist', async () => {
      const forbidStorage: StorageAdapter = {
        get: async () => { throw new PermissionError() },
        set: async () => {},
        keys: async () => [],
      }
      const s = mockState(['home'])
      const nav = createEditorNavigation(s, forbidStorage, dom, {})
      nav.setRenderAPI(render)

      await nav.navigateToPage('restricted')

      expect(s.getWorld()['403']).toContain('Access Denied')
    })

    it('allows re-throwing non-PermissionError exceptions from storage.get', async () => {
      const errorStorage: StorageAdapter = {
        get: async () => { throw new Error('network down') },
        set: async () => {},
        keys: async () => [],
      }
      const s = mockState(['home'])
      const nav = createEditorNavigation(s, errorStorage, dom, {})

      await expect(nav.navigateToPage('any')).rejects.toThrow('network down')
    })
  })
```

- [ ] **Step 4: Run tests and verify they fail**

```bash
npx vitest run src/__tests__/editor-navigation.test.ts 2>&1 | tail -40
```
Expected: New tests (in "status pages" block) FAIL with errors about missing redirect behavior

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/editor-navigation.test.ts
git commit -m "test: add status page navigation tests (red)"
```

---

### Task 5: Implement status page redirect logic in editor-navigation.ts

**Files:**
- Modify: `src/editor-navigation.ts`

- [ ] **Step 1: Update imports**

Change line 3 from:

```typescript
import type { StorageAdapter, EditorOptions } from './types'
```

to:

```typescript
import { PermissionError, type StorageAdapter, type EditorOptions } from './types'
```

- [ ] **Step 2: Add default status content and resolve helper**

After the `DEFAULT_HOME` constant (after line 16), add:

```typescript
const DEFAULT_STATUS_CONTENT: Record<number, string> = {
  404: '# Page Not Found\n\n',
  403: '# Access Denied\n\n',
}

function defaultStatusContent(code: number): string {
  return DEFAULT_STATUS_CONTENT[code] ?? `# Error ${code}\n\n`
}
```

- [ ] **Step 3: Add navigateToStatusPage and resolveStatusPage helpers**

After `setRenderAPI` function (after line 34), add:

```typescript
  function resolveStatusPage(code: number): string {
    return options.statusPages?.[code] ?? String(code)
  }

  async function navigateToStatusPage(code: number): Promise<void> {
    const statusPage = resolveStatusPage(code)
    const yDocState = state.getYDocState()

    if (!yDocState.hasPage(statusPage)) {
      const ytext = yDocState.getPage(statusPage)
      ytext.insert(0, defaultStatusContent(code))
    }

    await navigateToPage(statusPage)
  }
```

- [ ] **Step 4: Modify navigateToPage to handle missing/forbidden pages**

Replace current auto-creation block (lines 38-50):

```typescript
    if (!yDocState.hasPage(page)) {
      const stored = await storage.get(page)
      if (stored) {
        const ytext = yDocState.getPage(page)
        if (ytext.toString() === '') {
          ytext.insert(0, stored)
        }
      } else {
        const ytext = yDocState.getPage(page)
        ytext.insert(0, `# ${page}\n\n`)
      }
    }
```

with:

```typescript
    if (!yDocState.hasPage(page)) {
      let stored: string | null = null
      try {
        stored = await storage.get(page)
      } catch (e) {
        if (e instanceof PermissionError) {
          await navigateToStatusPage(403)
          return
        }
        throw e
      }

      if (stored) {
        const ytext = yDocState.getPage(page)
        if (ytext.toString() === '') {
          ytext.insert(0, stored)
        }
      } else {
        state.setPendingRequestedPage(page)
        await navigateToStatusPage(404)
        return
      }
    }
```

- [ ] **Step 5: Clear pendingRequestedPage on non-status-page navigation**

In `navigateToPage`, at the very top (after `const yDocState = state.getYDocState()`, around line 37), add clearing logic right after the page-existence check begins. But we need to be careful: we only clear when the target is NOT a status page, to preserve the value during redirect chains.

Add after `const yDocState = state.getYDocState()` (after line 37):

```typescript
    // Clear pending requested page unless navigating to a status page
    const statusPageNames = new Set(
      Object.values(options.statusPages ?? {}),
    )
    if (!statusPageNames.has(page)) {
      state.setPendingRequestedPage(null)
    }
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/__tests__/editor-navigation.test.ts 2>&1 | tail -30
```
Expected: All tests PASS

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add src/editor-navigation.ts
git commit -m "feat: redirect missing pages to 404, forbidden pages to 403"
```

---

### Task 6: Add create overlay to editor-render.ts

**Files:**
- Modify: `src/editor-render.ts`
- Modify: `src/editor.ts`

- [ ] **Step 1: Add statusPages and showCreateOverlay to EditorRenderOptions**

In `src/editor-render.ts`, add to `EditorRenderOptions` interface (after line 22):

```typescript
  statusPages?: Record<number, string>
  showCreateOverlay?: boolean
```

- [ ] **Step 2: Pass options through in editor.ts**

In `src/editor.ts`, modify the `renderOpts` object (around line 160):

```typescript
  const renderOpts: EditorRenderOptions = {
    navigateFn: (page: string) => {
      navigation.navigateToPage(page)
    },
    onBreadcrumbNavigate: (page: string) => {
      navigation.loadPage(page)
    },
    onTrailChange: options.onTrailChange,
    statusPages: options.statusPages,
    showCreateOverlay: options.showCreateOverlay,
  }
```

- [ ] **Step 3: Add renderCreateOverlay function in createEditorRender**

In `src/editor-render.ts`, add the overlay function inside `createEditorRender`, after `function render()` and before `function checkSelectChange()` (before line 92):

```typescript
  // ── Create overlay (404 page banner) ──────────────────────────────────────

  const OVERLAY_CLASS = 'wn-create-overlay'

  function renderCreateOverlay(): void {
    const existing = dom.body.querySelector(`.${OVERLAY_CLASS}`)
    if (existing) existing.remove()

    const statusPages = options.statusPages ?? {}
    const notFoundPage = statusPages[404] ?? '404'
    const currentPage = state.getCurrentPage()
    const requestedPage = state.getPendingRequestedPage()
    const showOverlay = options.showCreateOverlay !== false

    if (currentPage !== notFoundPage || !requestedPage || !showOverlay) return

    const banner = document.createElement('div')
    banner.className = OVERLAY_CLASS
    banner.style.cssText =
      'padding:8px 14px;background:var(--wn-color-surface,#0a0a0c);border-bottom:0.5px solid var(--wn-color-border,#1f1f23);font-family:var(--wn-font-mono,monospace);font-size:var(--wn-font-size-small,12px);display:flex;align-items:center;gap:8px;flex-shrink:0'

    const text = document.createElement('span')
    text.textContent = `Page "${requestedPage}" not found.`
    text.style.color = 'var(--wn-color-fg-muted,#4a4a5e)'

    const button = document.createElement('button')
    button.textContent = 'Create'
    button.style.cssText =
      'padding:2px 8px;background:var(--wn-color-wiki-link-bg,#16142a);color:var(--wn-color-wiki-link,#9b8fe8);border:0.5px solid var(--wn-color-wiki-link-border,#332d6a);border-radius:var(--wn-radius-wiki-link,4px);cursor:pointer;font-family:var(--wn-font-mono,monospace);font-size:var(--wn-font-size-small,12px)'

    button.addEventListener('click', () => {
      const page = requestedPage
      const yDocState = state.getYDocState()
      const ytext = yDocState.getPage(page)
      if (ytext.toString() === '') {
        ytext.insert(0, `# ${page}\n\n`)
      }
      state.setPendingRequestedPage(null)
      const navFn = options.navigateFn
      if (navFn) {
        navFn(page)
      }
    })

    banner.appendChild(text)
    banner.appendChild(button)

    const editorWrap = dom.body.querySelector('.wn-editor-wrap')
    if (editorWrap) {
      dom.body.insertBefore(banner, editorWrap)
    } else {
      dom.body.prepend(banner)
    }
  }
```

- [ ] **Step 4: Call renderCreateOverlay at end of render()**

In the `render` function, add a call to `renderCreateOverlay()` at the end (before the closing brace, after the `setLineOffset` try/catch block, around line 89):

```typescript
    renderCreateOverlay()
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 6: Run all tests**

```bash
npm test
```
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/editor-render.ts src/editor.ts
git commit -m "feat: add create page overlay on 404 status page"
```

---

### Task 7: Export PermissionError from index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add PermissionError export**

Add to the Types exports block (after line 27):

```typescript
export { PermissionError } from './types'
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export PermissionError from public API"
```

---

### Task 8: Update docs/api.md with new options

**Files:**
- Modify: `docs/api.md`

- [ ] **Step 1: Add PermissionError documentation**

In the Types section, add:

```markdown
### PermissionError

`class PermissionError extends Error`

Thrown by `StorageAdapter.get()` when the caller lacks read access. The editor
catches this and redirects to the configured 403 status page.

```ts
import { PermissionError } from 'worldnotes'

class RestrictedAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    if (key.startsWith('admin/')) {
      throw new PermissionError('Access denied')
    }
    return localStorage.getItem(`wn:${key}`)
  }
}
```
```

- [ ] **Step 2: Add statusPages and showCreateOverlay to EditorOptions docs**

In the `EditorOptions` section, add:

```markdown
#### `statusPages?: Record<number, string>`

Map of HTTP-style status codes to wiki page names. When a navigation error
occurs, the editor redirects to the corresponding wiki page.

Default: `{ 404: '404', 403: '403' }`

```ts
createEditor(el, {
  statusPages: {
    404: 'not-found',
    403: 'forbidden',
    500: 'error',
  },
})
```

#### `showCreateOverlay?: boolean`

When `true` (default), the editor shows a "Create page?" banner overlay on
the 404 status page when it was reached via a missing wikilink. Set to `false`
to suppress the banner and style the 404 page yourself.
```

- [ ] **Step 3: Commit**

```bash
git add docs/api.md
git commit -m "docs: document status pages feature in api.md"
```

---

### Task 9: Run full CI checks

- [ ] **Step 1: Run typecheck, lint, and full test suite**

```bash
npm run typecheck && npm run lint && npm run test:coverage
```
Expected: All pass, coverage >= 80%

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: PASS (no errors)

- [ ] **Step 3: If all passes, final commit**

```bash
git add dist/
git commit -m "build: update dist for status pages feature"
```
