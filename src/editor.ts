import type {
  Plugin,
  StorageAdapter,
  EditorOptions,
  EditorInstance,
  EditorContext,
} from './types'
import { LocalStorageAdapter } from './storage/localStorage'
import { defaultPlugins } from './plugins/defaults'
import { tokenizeDocument } from './tokenizer'
import { renderDocument } from './renderer'
import { getCaretOffset, setCaretOffset, extractText } from './cursor'
import { decodePathSearch, encodePathSearch, pageDisplayName } from './navigation'

// ─── Default content shown on first load when 'home' doesn't exist ───────────

const DEFAULT_HOME = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`

// ─── EditorBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder returned by createEditor().
 * Chain .use(), .withStorage(), then call .mount() to get a live EditorInstance.
 */
export class EditorBuilder {
  private readonly el: HTMLElement
  private plugins: Plugin[] = [...defaultPlugins]
  private storage: StorageAdapter = new LocalStorageAdapter()
  private options: EditorOptions = {}

  constructor(el: HTMLElement, options: EditorOptions = {}) {
    this.el = el
    this.options = options
    if (options.storage) this.storage = options.storage
  }

  /**
   * Register a plugin (or replace a built-in by matching name).
   * Plugins are applied in registration order during tokenization.
   *
   * @param plugin - Plugin instance to register
   */
  use(plugin: Plugin): this {
    // Replace existing plugin with same name, or append
    const idx = this.plugins.findIndex(p => p.name === plugin.name)
    if (idx !== -1) {
      this.plugins[idx] = plugin
    } else {
      this.plugins.push(plugin)
    }
    return this
  }

  /**
   * Remove all default plugins and start with an empty plugin set.
   * Useful when you want full control over which tokens are supported.
   */
  clearPlugins(): this {
    this.plugins = []
    return this
  }

  /**
   * Replace the storage adapter.
   *
   * @param adapter - Any object implementing StorageAdapter
   */
  withStorage(adapter: StorageAdapter): this {
    this.storage = adapter
    return this
  }

  /**
   * Mount the editor into the provided element and return a live EditorInstance.
   * Injects required styles, sets up event listeners, and loads the initial page.
   */
  mount(): EditorInstance {
    return mountEditor(this.el, this.plugins, this.storage, this.options)
  }
}

// ─── createEditor ─────────────────────────────────────────────────────────────

/**
 * Entry point. Returns an EditorBuilder for the given element.
 *
 * @param el      - The container element; will be replaced with the editor DOM
 * @param options - Optional configuration (storage, initialPage, callbacks, etc.)
 *
 * @example
 * const editor = createEditor(document.getElementById('app'))
 *   .use(myCustomPlugin)
 *   .withStorage(new IndexedDBAdapter())
 *   .mount()
 */
export function createEditor(el: HTMLElement, options: EditorOptions = {}): EditorBuilder {
  return new EditorBuilder(el, options)
}

// ─── Internal mount ───────────────────────────────────────────────────────────

function mountEditor(
  container: HTMLElement,
  plugins: Plugin[],
  storage: StorageAdapter,
  options: EditorOptions,
): EditorInstance {
  const saveDebounce = options.saveDebounceMs ?? 600
  const configuredInitialPage = options.initialPage ?? 'home'
  const initialTrail = decodePathSearch(window.location.search)
  const initialPage = initialTrail[initialTrail.length - 1] ?? configuredInitialPage

  // World: in-memory cache of page content
  const world: Record<string, string> = {}

  // Navigation trail
  let trail: string[] = initialTrail.length ? [...initialTrail] : [initialPage]
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isNavigating = false

  // ── Build DOM ──────────────────────────────────────────────────────────────

  injectStyles()

  container.innerHTML = ''
  container.className = 'wn-root'

  const topbar    = el('div', 'wn-topbar')
  const breadcrumb = el('div', 'wn-breadcrumb')
  const editorWrap = el('div', 'wn-editor-wrap')
  const editorDiv  = el('div', 'wn-editor') as HTMLDivElement
  const placeholder = el('div', 'wn-placeholder')

  placeholder.textContent = 'Start writing… use [[page name]] to link deeper'
  editorDiv.contentEditable = 'true'
  editorDiv.spellcheck = false

  topbar.appendChild(breadcrumb)
  editorWrap.appendChild(placeholder)
  editorWrap.appendChild(editorDiv)
  container.appendChild(topbar)
  container.appendChild(editorWrap)

  // ── Context ───────────────────────────────────────────────────────────────

  const context: EditorContext = {
    navigate: (page: string) => navigateToPage(page),
    getTrail: () => [...trail],
    getWorld: () => ({ ...world }),
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function render(): void {
    const offset = getCaretOffset(editorDiv)
    const raw    = extractText(editorDiv)
    const lines  = tokenizeDocument(raw, plugins.flatMap(p => p.tokens))
    const frags  = renderDocument(lines, plugins, context, offset)

    editorDiv.innerHTML = ''
    frags.forEach((frag, i) => {
      editorDiv.appendChild(frag)
      if (i < frags.length - 1) editorDiv.appendChild(document.createTextNode('\n'))
    })

    placeholder.style.display = raw.length ? 'none' : 'block'

    try { setCaretOffset(editorDiv, offset) } catch {}
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────────

  function renderBreadcrumb(): void {
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
          trail = trail.slice(0, i + 1)
          loadPage(trail[trail.length - 1])
        })
      }
      breadcrumb.appendChild(crumb)
    })

    options.onTrailChange?.([...trail])
    syncUrlToTrail()
  }

  function syncUrlToTrail(): void {
    const search = encodePathSearch(window.location.search, trail)
    window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`)
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async function navigateToPage(page: string): Promise<void> {
    if (!world[page]) {
      const stored = await storage.get(page)
      world[page] = stored ?? `# ${page}\n\n`
      if (!stored) await storage.set(page, world[page])
    }
    trail.push(page)
    await loadPage(page)
  }

  async function loadPage(page: string): Promise<void> {
    isNavigating = true

    if (!world[page]) {
      const stored = await storage.get(page)
      if (!stored && page === 'home') {
        world[page] = DEFAULT_HOME
        await storage.set(page, DEFAULT_HOME)
      } else {
        world[page] = stored ?? `# ${page}\n\n`
      }
    }

    const content = world[page]
    editorDiv.textContent = content
    render()
    renderBreadcrumb()

    // Move cursor to start
    try {
      const range = document.createRange()
      const sel   = window.getSelection()
      if (sel) {
        range.setStart(editorDiv, 0)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    } catch {}

    options.onPageLoad?.(page, content)
    isNavigating = false
    editorDiv.focus()
  }

  // ── Input handling ────────────────────────────────────────────────────────

  editorDiv.addEventListener('input', () => {
    if (isNavigating) return
    render()
    const raw = extractText(editorDiv)
    const page = trail[trail.length - 1]
    world[page] = raw

    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      await storage.set(page, raw)
      options.onSave?.(page, raw)
    }, saveDebounce)
  })

  editorDiv.addEventListener('paste', (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    insertTextAtSelection(text)
  })

  editorDiv.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      insertTextAtSelection('  ')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      insertTextAtSelection('\n')
    }
  })

  // ── Mount ─────────────────────────────────────────────────────────────────

  loadPage(initialPage)

  // ── Public instance ───────────────────────────────────────────────────────

  return {
    destroy() {
      if (saveTimer) clearTimeout(saveTimer)
      container.innerHTML = ''
    },

    navigate(page: string) {
      navigateToPage(page)
    },

    getCurrentPage(): string {
      return trail[trail.length - 1]
    },

    getTrail(): string[] {
      return [...trail]
    },

    getContent(): string {
      return extractText(editorDiv)
    },

    setContent(content: string): void {
      const page = trail[trail.length - 1]
      world[page] = content
      editorDiv.textContent = content
      render()
    },
  }

  function insertTextAtSelection(text: string): void {
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}

// ─── Default styles ───────────────────────────────────────────────────────────

/**
 * Inject the default CSS for all wn-* classes into <head> once.
 * Users can override any rule by targeting the same class with higher specificity.
 */
function injectStyles(): void {
  const STYLE_ID = 'worldnotes-styles'
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = DEFAULT_CSS
  document.head.appendChild(style)
}

const DEFAULT_CSS = `
.wn-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0e0e10;
  font-family: monospace;
  color: #c9c9d0;
  overflow: hidden;
}

.wn-topbar {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 0.5px solid #1f1f23;
  background: #0a0a0c;
  flex-shrink: 0;
}

.wn-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 12px;
  flex: 1;
  overflow: hidden;
}

.wn-crumb {
  color: #4a4a5e;
  cursor: pointer;
  white-space: nowrap;
  padding: 3px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.wn-crumb:hover { color: #9b8fe8; }
.wn-crumb--active { color: #c9c9d0; cursor: default; }

.wn-crumb-sep {
  color: #252530;
  font-size: 11px;
  padding: 0 1px;
  user-select: none;
}

.wn-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 28px 36px;
  position: relative;
}

.wn-editor {
  outline: none;
  min-height: 100%;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.9;
  color: #9090a8;
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: #9b8fe8;
}

.wn-placeholder {
  position: absolute;
  top: 28px;
  left: 36px;
  font-family: monospace;
  font-size: 14px;
  color: #282838;
  pointer-events: none;
  user-select: none;
}

/* Punctuation */
.wn-punct { color: #2e2e44; font-size: 0.85em; }

/* Headings */
.wn-h1, .wn-h1-text { font-size: 22px; font-weight: 500; color: #e2e1f4; font-family: sans-serif; }
.wn-h2, .wn-h2-text { font-size: 17px; font-weight: 500; color: #c8c7e2; font-family: sans-serif; }
.wn-h3, .wn-h3-text { font-size: 14px; font-weight: 500; color: #a8a8c4; font-family: sans-serif; }

/* Inline */
.wn-bold { font-weight: 600; color: #d4d4ea; }
.wn-italic { font-style: italic; color: #7878a0; }
.wn-inline-code { color: #9b8fe8; }
.wn-code-text { background: #17171e; padding: 1px 5px; border-radius: 3px; font-size: 12.5px; }

/* Blockquote */
.wn-blockquote {
  display: block;
  color: #4a4a66;
  border-left: 2px solid #2a2a42;
  padding-left: 10px;
}

/* HR */
.wn-hr {
  display: block;
  border-top: 0.5px solid #1e1e2c;
  color: transparent;
  font-size: 2px;
  margin: 4px 0;
}

/* Wiki link */
.wn-wiki-link {
  color: #9b8fe8;
  background: #16142a;
  border: 0.5px solid #332d6a;
  padding: 0 5px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.12s;
}
.wn-wiki-link:hover { background: #221e42; color: #bbb3f8; }
`
