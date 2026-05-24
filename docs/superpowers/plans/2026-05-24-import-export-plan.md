# Import / Export Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standalone `exportWorld()`/`importWorld()` utilities and an optional `createImportExportPlugin()` UIPlugin for toolbar-based import/export.

**Architecture:** Two-layer design — `src/export-import.ts` (pure utilities depending only on `StorageAdapter` + `jszip`) and `src/plugins/importExport.ts` (UIPlugin wrapping those utilities with toolbar buttons). The plugin accepts `storage` + `onImportComplete` to avoid chicken-and-egg with editor mounting.

**Tech Stack:** TypeScript, JSZip (new dependency), Vitest + happy-dom, Vite

---

### Task 1: Install JSZip

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install JSZip as a runtime dependency**

```bash
npm install jszip
```

Expected: JSZip added to `dependencies` in `package.json`. JSZip ships its own types (no `@types/` needed).

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jszip dependency for import/export"
```

---

### Task 2: Create export-import utility tests

**Files:**
- Create: `src/__tests__/export-import.test.ts`

- [ ] **Step 1: Write the full test file**

```ts
// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'
import type { StorageAdapter } from '../types'
import { exportWorld, importWorld } from '../export-import'

function mockAdapter(pages: Record<string, string>): StorageAdapter {
  const data = { ...pages }
  return {
    get: vi.fn(async (key: string) => data[key] ?? null),
    set: vi.fn(async (key: string, value: string) => { data[key] = value }),
    keys: vi.fn(async () => Object.keys(data)),
  }
}

describe('exportWorld', () => {
  it('returns a zip blob containing all pages as .md files in nested folders', async () => {
    const adapter = mockAdapter({
      home: '# Home',
      'projects/acme': '# ACME Project',
      notes: 'Plain notes',
    })

    const blob = await exportWorld(adapter)

    expect(blob).toBeInstanceOf(Blob)

    const zip = await JSZip.loadAsync(blob)
    const entries = Object.keys(zip.files)

    expect(entries).toContain('home.md')
    expect(entries).toContain('projects/acme.md')
    expect(entries).toContain('notes.md')

    expect(await zip.file('home.md')!.async('string')).toBe('# Home')
    expect(await zip.file('projects/acme.md')!.async('string')).toBe('# ACME Project')
    expect(await zip.file('notes.md')!.async('string')).toBe('Plain notes')
  })

  it('returns a valid zip with no entries for empty storage', async () => {
    const adapter = mockAdapter({})
    const blob = await exportWorld(adapter)

    const zip = await JSZip.loadAsync(blob)
    const mdEntries = Object.entries(zip.files).filter(
      ([, f]) => !f.dir && /\.md$/.test(''),
    )

    expect(Object.keys(zip.files).length).toBe(0)
  })

  it('handles empty page content', async () => {
    const adapter = mockAdapter({ empty: '' })

    const blob = await exportWorld(adapter)
    const zip = await JSZip.loadAsync(blob)

    expect(await zip.file('empty.md')!.async('string')).toBe('')
  })

  it('uses custom filename option in zip metadata', async () => {
    const adapter = mockAdapter({ home: '# Home' })

    const blob = await exportWorld(adapter, { filename: 'my-notes.zip' })
    expect(blob).toBeInstanceOf(Blob)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('home.md')).toBeTruthy()
  })
})

describe('importWorld', () => {
  it('imports all .md entries from a zip into storage (overwrite strategy)', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    zip.file('home.md', '# Home')
    zip.file('projects/acme.md', '# ACME')
    zip.file('readme.txt', 'should be skipped')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob, { strategy: 'overwrite' })

    expect(result.imported).toHaveLength(2)
    expect(result.imported).toContain('home')
    expect(result.imported).toContain('projects/acme')
    expect(result.skipped).toHaveLength(0)

    expect(adapter.set).toHaveBeenCalledWith('home', '# Home')
    expect(adapter.set).toHaveBeenCalledWith('projects/acme', '# ACME')
    // Non-.md file should not be set
    expect(adapter.set).not.toHaveBeenCalledWith('readme', expect.anything())
  })

  it('skip strategy: skips pages that already exist', async () => {
    const adapter = mockAdapter({ home: 'existing content' })

    const zip = new JSZip()
    zip.file('home.md', 'new content')
    zip.file('newpage.md', 'fresh')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob, { strategy: 'skip' })

    expect(result.imported).toHaveLength(1)
    expect(result.imported).toContain('newpage')
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped).toContain('home')

    expect(adapter.set).toHaveBeenCalledTimes(1)
    expect(adapter.set).toHaveBeenCalledWith('newpage', 'fresh')
    expect(adapter.set).not.toHaveBeenCalledWith('home', expect.anything())
  })

  it('merge strategy: overwrites existing pages', async () => {
    const adapter = mockAdapter({ home: 'old' })

    const zip = new JSZip()
    zip.file('home.md', 'new')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob, { strategy: 'merge' })

    expect(result.imported).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)
    expect(adapter.set).toHaveBeenCalledWith('home', 'new')
  })

  it('returns empty result for empty zip', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob)

    expect(result.imported).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('skips entries that would produce invalid empty page names', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    zip.file('.md', '# root dot md')
    zip.file('valid.md', '# valid')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob)

    expect(result.imported).toHaveLength(1)
    expect(result.imported).toContain('valid')
    expect(adapter.set).not.toHaveBeenCalledWith('', expect.anything())
  })

  it('default strategy is overwrite when options omitted', async () => {
    const adapter = mockAdapter({ home: 'existing' })

    const zip = new JSZip()
    zip.file('home.md', 'replaced')
    zip.file('new.md', 'added')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob)

    expect(result.imported).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)
    expect(adapter.set).toHaveBeenCalledWith('home', 'replaced')
    expect(adapter.set).toHaveBeenCalledWith('new', 'added')
  })

  it('accepts a File as well as a Blob', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    zip.file('test.md', 'file content')
    const blob = await zip.generateAsync({ type: 'blob' })
    const file = new File([blob], 'export.zip', { type: 'application/zip' })

    const result = await importWorld(adapter, file)

    expect(result.imported).toContain('test')
    expect(adapter.set).toHaveBeenCalledWith('test', 'file content')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/__tests__/export-import.test.ts
```

Expected: All tests fail with "Cannot find module '../export-import'" or similar — module doesn't exist yet.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/export-import.test.ts
git commit -m "test: add failing export/import utility tests"
```

---

### Task 3: Implement export-import utilities

**Files:**
- Create: `src/export-import.ts`

- [ ] **Step 1: Write the implementation**

```ts
import JSZip from 'jszip'
import type { StorageAdapter } from './types'

export type ConflictStrategy = 'overwrite' | 'skip' | 'merge'

export interface ImportResult {
  imported: string[]
  skipped: string[]
}

/**
 * Export all pages from storage into a zip Blob of nested markdown files.
 *
 * Page name `a/b/c` maps to zip entry `a/b/c.md`.
 * Returns a Blob suitable for download via URL.createObjectURL().
 */
export async function exportWorld(
  storage: StorageAdapter,
  options?: { filename?: string },
): Promise<Blob> {
  const zip = new JSZip()
  const pageNames = await storage.keys()

  for (const name of pageNames) {
    const content = await storage.get(name)
    zip.file(`${name}.md`, content ?? '')
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Import pages from a zip File or Blob into storage.
 *
 * Zip entries ending in `.md` are treated as pages — the `.md` suffix is
 * stripped to derive the page name. Non-.md files are silently skipped.
 * Empty page names (from a root `.md` file) are also skipped.
 *
 * @param storage  StorageAdapter to write pages into
 * @param file     Zip file or blob to import
 * @param options  Optional conflict strategy (default: 'overwrite')
 * @returns        Report of which pages were imported vs skipped
 */
export async function importWorld(
  storage: StorageAdapter,
  file: File | Blob,
  options?: { strategy?: ConflictStrategy },
): Promise<ImportResult> {
  const strategy = options?.strategy ?? 'overwrite'
  const imported: string[] = []
  const skipped: string[] = []

  const zip = await JSZip.loadAsync(file)

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    if (!path.endsWith('.md')) continue

    const pageName = path.slice(0, -3) // strip '.md'
    if (pageName === '') continue // skip invalid empty page name

    if (strategy === 'skip') {
      const existing = await storage.get(pageName)
      if (existing !== null) {
        skipped.push(pageName)
        continue
      }
    }

    const content = await entry.async('string')
    await storage.set(pageName, content)
    imported.push(pageName)
  }

  return { imported, skipped }
}
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
npx vitest run src/__tests__/export-import.test.ts
```

Expected: All 11 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/export-import.ts
git commit -m "feat: add exportWorld and importWorld utilities"
```

---

### Task 4: Create import/export plugin tests

**Files:**
- Create: `src/__tests__/importExport-plugin.test.ts`

- [ ] **Step 1: Write the full test file**

```ts
// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StorageAdapter, EditorInstance } from '../types'
import { createImportExportPlugin } from '../plugins/importExport'
import * as exportImport from '../export-import'

function mockStorage(): StorageAdapter {
  return {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    keys: vi.fn(async () => []),
  }
}

function mockEditor(): EditorInstance {
  return {
    destroy: vi.fn(),
    navigate: vi.fn(),
    getCurrentPage: vi.fn(() => 'home'),
    getTrail: vi.fn(() => ['home']),
    getContent: vi.fn(() => ''),
    setContent: vi.fn(),
  }
}

describe('createImportExportPlugin', () => {
  let storage: StorageAdapter
  let editor: EditorInstance
  let onImportComplete: ReturnType<typeof vi.fn>
  let slotEl: HTMLElement

  beforeEach(() => {
    storage = mockStorage()
    editor = mockEditor()
    onImportComplete = vi.fn()
    slotEl = document.createElement('div')
  })

  it('returns a valid UIPlugin manifest', () => {
    const plugin = createImportExportPlugin({
      storage,
      onImportComplete,
    })

    expect(plugin.kind).toBe('ui')
    expect(plugin.name).toBe('import-export')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.slots).toEqual(['wn-toolbar'])
    expect(plugin.onMount).toBeDefined()
    expect(plugin.onDestroy).toBeDefined()
  })

  it('onMount adds Export and Import buttons to the slot element', () => {
    const plugin = createImportExportPlugin({ storage, onImportComplete })

    plugin.onMount!(slotEl)

    const buttons = slotEl.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toBe('Export')
    expect(buttons[1].textContent).toBe('Import')
  })

  it('clicking Export calls exportWorld and triggers download', async () => {
    const exportBlob = new Blob(['test'], { type: 'application/zip' })
    const exportSpy = vi
      .spyOn(exportImport, 'exportWorld')
      .mockResolvedValue(exportBlob)

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    const clickSpy = vi.fn()
    // Simulate anchor click by capturing the created <a> element
    const origCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag)
        if (tag === 'a') {
          Object.defineProperty(el, 'click', { value: clickSpy })
        }
        return el
      })

    const plugin = createImportExportPlugin({ storage, onImportComplete })
    plugin.onMount!(slotEl)

    const exportBtn = slotEl.querySelector('button')!
    await exportBtn.click()

    expect(exportSpy).toHaveBeenCalledWith(storage, { filename: undefined })
    expect(createObjectURLSpy).toHaveBeenCalledWith(exportBlob)
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test')

    createElementSpy.mockRestore()
    exportSpy.mockRestore()
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
  })

  it('clicking Export passes filename option when provided', async () => {
    const exportBlob = new Blob(['test'], { type: 'application/zip' })
    const exportSpy = vi
      .spyOn(exportImport, 'exportWorld')
      .mockResolvedValue(exportBlob)

    const plugin = createImportExportPlugin({
      storage,
      onImportComplete,
      exportFilename: 'custom.zip',
    })
    plugin.onMount!(slotEl)

    const exportBtn = slotEl.querySelector('button')!
    await exportBtn.click()

    expect(exportSpy).toHaveBeenCalledWith(storage, {
      filename: 'custom.zip',
    })

    exportSpy.mockRestore()
  })

  it('clicking Import creates a file input and calls importWorld on file selection', async () => {
    const importSpy = vi
      .spyOn(exportImport, 'importWorld')
      .mockResolvedValue({ imported: ['newpage'], skipped: [] })

    // Capture file input creation
    let fileInput: HTMLInputElement | null = null
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag)
        if (tag === 'input') {
          fileInput = el as HTMLInputElement
        }
        return el
      },
    )

    const plugin = createImportExportPlugin({ storage, onImportComplete })
    plugin.onMount!(slotEl)

    // Click the second button (Import)
    const buttons = slotEl.querySelectorAll('button')
    buttons[1].click()

    expect(fileInput).toBeTruthy()
    expect(fileInput!.type).toBe('file')
    expect(fileInput!.accept).toBe('.zip')

    // Simulate file selection
    const file = new File(['fake'], 'export.zip', {
      type: 'application/zip',
    })
    Object.defineProperty(fileInput!, 'files', { value: [file] })

    fileInput!.dispatchEvent(new Event('change'))

    // Wait for the async import to complete
    await vi.waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith(storage, file, {
        strategy: undefined,
      })
    })

    expect(onImportComplete).toHaveBeenCalled()

    importSpy.mockRestore()
  })

  it('passes importStrategy option to importWorld', async () => {
    const importSpy = vi
      .spyOn(exportImport, 'importWorld')
      .mockResolvedValue({ imported: [], skipped: [] })

    let fileInput: HTMLInputElement | null = null
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag)
        if (tag === 'input') {
          fileInput = el as HTMLInputElement
        }
        return el
      },
    )

    const plugin = createImportExportPlugin({
      storage,
      onImportComplete,
      importStrategy: 'skip',
    })
    plugin.onMount!(slotEl)

    const buttons = slotEl.querySelectorAll('button')
    buttons[1].click()

    const file = new File(['fake'], 'export.zip', {
      type: 'application/zip',
    })
    Object.defineProperty(fileInput!, 'files', { value: [file] })
    fileInput!.dispatchEvent(new Event('change'))

    await vi.waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith(storage, file, {
        strategy: 'skip',
      })
    })

    importSpy.mockRestore()
  })

  it('onDestroy cleans up buttons and input from the DOM', () => {
    const plugin = createImportExportPlugin({ storage, onImportComplete })
    plugin.onMount!(slotEl)

    expect(slotEl.children.length).toBeGreaterThan(0)

    plugin.onDestroy!()

    expect(slotEl.children.length).toBe(0)
  })

  it('onDestroy is safe to call when plugin was never mounted', () => {
    const plugin = createImportExportPlugin({ storage, onImportComplete })

    expect(() => plugin.onDestroy!()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/__tests__/importExport-plugin.test.ts
```

Expected: All tests fail — `createImportExportPlugin` not found in `../plugins/importExport`.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/importExport-plugin.test.ts
git commit -m "test: add failing import/export plugin tests"
```

---

### Task 5: Implement import/export plugin

**Files:**
- Create: `src/plugins/importExport.ts`

- [ ] **Step 1: Write the implementation**

```ts
import type { UIPlugin, StorageAdapter } from '../types'
import type { ConflictStrategy } from '../export-import'
import { exportWorld, importWorld } from '../export-import'

export interface ImportExportPluginOptions {
  storage: StorageAdapter
  onImportComplete: () => void
  exportFilename?: string
  importStrategy?: ConflictStrategy
}

/**
 * Create a UIPlugin that adds Export and Import buttons to the editor toolbar.
 *
 * Export: downloads all pages as a .zip of nested .md files.
 * Import: reads a .zip, imports .md files as pages, then calls onImportComplete.
 *
 * @example
 * const editor = createEditor(el, { storage: adapter })
 *   .use(createImportExportPlugin({
 *     storage: adapter,
 *     onImportComplete: () => editor.navigate(editor.getCurrentPage()),
 *   }))
 *   .mount()
 */
export function createImportExportPlugin(
  options: ImportExportPluginOptions,
): UIPlugin {
  const { storage, onImportComplete, exportFilename, importStrategy } = options

  let exportBtn: HTMLButtonElement | null = null
  let importBtn: HTMLButtonElement | null = null
  let fileInput: HTMLInputElement | null = null

  async function handleExport(): Promise<void> {
    const blob = await exportWorld(storage, { filename: exportFilename })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename ?? 'worldnotes-export.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileSelected(): Promise<void> {
    const file = fileInput?.files?.[0]
    if (!file) return

    await importWorld(storage, file, { strategy: importStrategy })
    onImportComplete()
  }

  return {
    name: 'import-export',
    version: '1.0.0',
    kind: 'ui',
    slots: ['wn-toolbar'],

    onMount(slotEl: HTMLElement): void {
      exportBtn = document.createElement('button')
      exportBtn.textContent = 'Export'
      exportBtn.addEventListener('click', handleExport)
      slotEl.appendChild(exportBtn)

      importBtn = document.createElement('button')
      importBtn.textContent = 'Import'
      importBtn.addEventListener('click', () => {
        fileInput?.click()
      })
      slotEl.appendChild(importBtn)

      fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.zip'
      fileInput.style.display = 'none'
      fileInput.addEventListener('change', handleFileSelected)
      slotEl.appendChild(fileInput)
    },

    onDestroy(): void {
      if (exportBtn) {
        exportBtn.removeEventListener('click', handleExport)
        exportBtn.remove()
        exportBtn = null
      }
      if (importBtn) {
        importBtn.removeEventListener('click', () => { /* removed */ })
        importBtn.remove()
        importBtn = null
      }
      if (fileInput) {
        fileInput.removeEventListener('change', handleFileSelected)
        fileInput.remove()
        fileInput = null
      }
    },
  }
}
```

- [ ] **Step 2: Run the plugin tests to verify they pass**

```bash
npx vitest run src/__tests__/importExport-plugin.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/plugins/importExport.ts
git commit -m "feat: add createImportExportPlugin UIPlugin"
```

---

### Task 6: Wire up demo and update exports

**Files:**
- Modify: `src/index.ts`
- Modify: `demo/demo.ts`
- Modify: `demo/demo.js`

- [ ] **Step 1: Add new exports to src/index.ts**

Add the following lines to `src/index.ts` after the existing storage adapter exports (after line 21):

```ts
// ─── Import / Export ─────────────────────────────────────────────────────────
export { exportWorld, importWorld } from './export-import'
export type { ConflictStrategy, ImportResult } from './export-import'
export { createImportExportPlugin } from './plugins/importExport'
export type { ImportExportPluginOptions } from './plugins/importExport'
```

- [ ] **Step 2: Update demo/demo.ts to use the import/export plugin**

```ts
import { createEditor, createImportExportPlugin, LocalStorageAdapter } from '../src/index'
import type { Token, EditorContext, ContentPlugin } from '../src/types'

// ─── Example custom plugin: @mentions ─────────────────────────────────────────
//
// Demonstrates how to add a new token type without touching the library.
// @username renders as a styled highlight; clicking fires a custom handler.

const mentionPlugin: ContentPlugin = {
  name: 'mention',
  version: "0.0.1",
  kind: "content",
  tokens: [
    {
      type: 'mention',
      // Matches @word — word chars only, stops at whitespace/punctuation
      pattern: /@(\w+)/,
    },
  ],

  render(token: Token, _context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.className = 'wn-mention'
    el.textContent = `@${token.groups[0] ?? ''}`
    return el
  },

  onNavigate(token: Token, _context: EditorContext): true {
    console.log(`Mention clicked: @${token.groups[0]}`)
    // Could open a user profile, filter by tag, etc.
    return true
  },
}

// ─── Additional CSS for the mention plugin ────────────────────────────────────

const style = document.createElement('style')
style.textContent = `
  .wn-mention {
    color: #5aa6e8;
    background: #0e1e30;
    border: 0.5px solid #1e3a56;
    padding: 0 4px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.12s;
  }
  .wn-mention:hover { background: #162a40; }
`
document.head.appendChild(style)

// ─── Shared storage adapter (so the import/export plugin can access the same data) ──

const storage = new LocalStorageAdapter()

// ─── Mount ────────────────────────────────────────────────────────────────────

const app = document.getElementById('app')!

const editor = createEditor(app, {
  storage,
  initialPage: 'home',
  saveDebounceMs: 600,
  onTrailChange: (trail) => {
    document.title = trail[trail.length - 1] + ' — WorldNotes'
  },
  onSave: (page, _content) => {
    console.log(`[worldnotes] saved: ${page}`)
  },
})
  .use(mentionPlugin) // add @mention on top of defaults
  .use(createImportExportPlugin({
    storage,
    onImportComplete: () => editor.navigate(editor.getCurrentPage()),
  }))
  .mount()

// Expose on window for console experimentation
;(window as unknown as Record<string, unknown>).editor = editor
```

- [ ] **Step 3: Update demo/demo.js to match**

Replace the entire file with the JS equivalent of the TypeScript demo above, importing `createImportExportPlugin` and `LocalStorageAdapter`:

```js
import { createEditor, createImportExportPlugin, LocalStorageAdapter } from '../src/index'

// ─── Example custom plugin: @mentions ─────────────────────────────────────────

const mentionPlugin = {
  name: 'mention',
  version: "0.0.1",
  kind: "content",
  tokens: [
    {
      type: 'mention',
      pattern: /@(\w+)/,
    },
  ],

  render(token, _context) {
    const el = document.createElement('span')
    el.className = 'wn-mention'
    el.textContent = `@${token.groups[0] ?? ''}`
    return el
  },

  onNavigate(token, _context) {
    console.log(`Mention clicked: @${token.groups[0]}`)
    return true
  },
}

// ─── Additional CSS for the mention plugin ────────────────────────────────────

const style = document.createElement('style')
style.textContent = `
  .wn-mention {
    color: #5aa6e8;
    background: #0e1e30;
    border: 0.5px solid #1e3a56;
    padding: 0 4px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.12s;
  }
  .wn-mention:hover { background: #162a40; }
`
document.head.appendChild(style)

// ─── Shared storage adapter ───────────────────────────────────────────────────

const storage = new LocalStorageAdapter()

// ─── Mount ────────────────────────────────────────────────────────────────────

const app = document.getElementById('app')

const editor = createEditor(app, {
  storage,
  initialPage: 'home',
  saveDebounceMs: 600,
  onTrailChange: (trail) => {
    document.title = trail[trail.length - 1] + ' — WorldNotes'
  },
  onSave: (page, _content) => {
    console.log(`[worldnotes] saved: ${page}`)
  },
})
  .use(mentionPlugin)
  .use(createImportExportPlugin({
    storage,
    onImportComplete: () => editor.navigate(editor.getCurrentPage()),
  }))
  .mount()

;(window).editor = editor
```

- [ ] **Step 4: Verify full test suite passes**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 7: Build**

```bash
npm run build
```

Expected: Build succeeds, dist/ contains the new exports.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts demo/demo.ts demo/demo.js
git commit -m "feat: wire up import/export exports and demo"
```

---

### Task 7: Update documentation

**Files:**
- Modify: `docs/api.md`

- [ ] **Step 1: Add import/export section to docs/api.md**

Insert after the "Storage Adapters" section (after line 141) and before "Exported Types":

```markdown
## Import / Export

Standalone utilities for exporting and importing all pages as a `.zip` of nested
markdown files.

```ts
import { exportWorld, importWorld } from 'worldnotes'

// Export all pages to a downloadable Blob
const blob = await exportWorld(storage, { filename: 'my-world.zip' })

// Import pages from a zip file
const result = await importWorld(storage, file, { strategy: 'overwrite' })
console.log(result.imported) // ['home', 'projects/acme']
console.log(result.skipped)  // []
```

### `exportWorld(storage, options?)`

| Param | Type | Description |
|---|---|---|
| `storage` | `StorageAdapter` | Storage backend to read pages from |
| `options.filename` | `string` | Suggested download filename (default: `'worldnotes-export.zip'`) |

Returns `Promise<Blob>` — a zip Blob containing all pages as `.md` files in nested folders.
Page name `a/b/c` maps to zip entry `a/b/c.md`. Use `URL.createObjectURL(blob)` with
an `<a download>` element to trigger a browser download.

### `importWorld(storage, file, options?)`

| Param | Type | Description |
|---|---|---|
| `storage` | `StorageAdapter` | Storage backend to write pages into |
| `file` | `File \| Blob` | Zip file or blob to import |
| `options.strategy` | `ConflictStrategy` | Conflict resolution: `'overwrite'` (default), `'skip'`, or `'merge'` |

Returns `Promise<ImportResult>` with `{ imported: string[], skipped: string[] }` arrays
of page names. Non-`.md` files and empty page names are silently skipped.

### `ConflictStrategy`

```ts
type ConflictStrategy = 'overwrite' | 'skip' | 'merge'
```

| Value | Behavior |
|---|---|
| `'overwrite'` | Always write, replace existing pages |
| `'skip'` | Only import pages that don't already exist in storage |
| `'merge'` | Overwrites existing pages (same as overwrite for now) |

### `ImportResult`

```ts
interface ImportResult {
  imported: string[]  // Pages successfully written to storage
  skipped: string[]   // Pages skipped (strategy='skip' and already existed)
}
```

### `createImportExportPlugin(options)`

Returns a `UIPlugin` that adds Export and Import buttons to the `wn-toolbar` slot.

```ts
import { createImportExportPlugin } from 'worldnotes'

const storage = new LocalStorageAdapter()

const editor = createEditor(el, { storage })
  .use(createImportExportPlugin({
    storage,
    onImportComplete: () => editor.navigate(editor.getCurrentPage()),
  }))
  .mount()
```

| Option | Type | Required | Description |
|---|---|---|---|
| `storage` | `StorageAdapter` | Yes | Same adapter the editor uses |
| `onImportComplete` | `() => void` | Yes | Called after import finishes; typically refreshes the editor |
| `exportFilename` | `string` | No | Custom download filename (default: `'worldnotes-export.zip'`) |
| `importStrategy` | `ConflictStrategy` | No | Conflict resolution for imports (default: `'overwrite'`) |

The Export button downloads all pages as a `.zip`. The Import button opens a file picker
for `.zip` files, imports `.md` entries as pages, then calls `onImportComplete`.
```

- [ ] **Step 2: Update the dependency section or add a note about JSZip**

After the overview paragraph at the top of `docs/api.md`, add:

```markdown
> **Dependencies:** The import/export utilities require `jszip`. Install it alongside
> worldnotes: `npm install jszip`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/api.md
git commit -m "docs: add import/export API documentation"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run all checks**

```bash
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

Expected: All pass. TypeScript type-checks cleanly, ESLint has no errors, all tests pass with coverage above 80% thresholds, build produces correct output.

- [ ] **Step 2: Smoke test the demo**

```bash
npm run dev
```

Open the browser at the dev server URL. Verify:
- Export and Import buttons appear in the toolbar
- Clicking Export downloads a `.zip` file with page content
- Clicking Import opens a file picker
- Importing a `.zip` with `.md` files adds those pages to storage

- [ ] **Step 3: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "chore: final verification fixes"
```
