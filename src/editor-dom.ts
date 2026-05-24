// ─── Default styles ───────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}

// ─── Style injection ───────────────────────────────────────────────────────────

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

// ─── Editor DOM ──────────────────────────────────────────────────────────────

/**
 * Public handle for the editor DOM elements returned by {@link createEditorDOM}.
 *
 * @property container   - The root wn-root element (the original container)
 * @property topbar      - Top bar wrapper containing breadcrumbs
 * @property breadcrumb   - Breadcrumb navigation element
 * @property editorWrap  - Wrapper around editor and placeholder
 * @property editorDiv   - The contentEditable editor div
 * @property placeholder - Initial placeholder text element
 */
export interface EditorDOM {
  container: HTMLElement
  topbar: HTMLElement
  breadcrumb: HTMLElement
  editorWrap: HTMLElement
  editorDiv: HTMLDivElement
  placeholder: HTMLElement
}

/**
 * Build the complete editor DOM inside `container`, inject default CSS
 * into the document head, and return typed references to each element.
 *
 * This is a pure DOM-construction factory — it has no dependency on
 * editor state, storage, or rendering.  Callers receive the element
 * references they need to wire up event handlers, the render loop, and
 * keyboard navigation.
 *
 * @param container - The host element that will receive the editor DOM
 * @returns Typed references to every major editor element
 */
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
