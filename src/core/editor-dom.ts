// ─── Design tokens ───────────────────────────────────────────────────────────
//
// The editor palette mirrors the viewer (src/server/render/layout.ts) so the
// edit surface and the reading surface share one look: warm paper background,
// ink foreground, serif body text, blue accent — with an automatic dark palette
// via `prefers-color-scheme`.

// ─── Default styles ───────────────────────────────────────────────────────────

import { EDITOR_TOKENS_CSS, EDITOR_CONTENT_CSS } from './styles'

// Editor chrome: root layout, header, toolbar, panels, breadcrumbs, editor
// column, overlay, toasts, keyframes, mobile rules. Reader pages must NOT
// embed this group (`.wn-root` here is `display:flex; height:100%;
// overflow:hidden` — it would clip long reader pages). Content + token rules
// live in `styles.ts` and are shared with the reader.
const EDITOR_CHROME_CSS = `
* { box-sizing: border-box; }

.wn-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wn-color-bg, #fbfaf7);
  color: var(--wn-color-fg, #23211d);
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  overflow: hidden;
}

/* Header bar — mirrors the viewer header.wn-view-bar */
.wn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: .6rem 1.2rem;
  border-bottom: 1px solid var(--wn-color-border, #e3ded4);
  font: var(--wn-font-size-small, 14px)/1.4 system-ui, sans-serif;
  flex-shrink: 0;
}

.wn-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: .4rem 1.2rem;
  border-bottom: 1px solid var(--wn-color-border, #e3ded4);
}
.wn-toolbar:empty { display: none; }

.wn-body { display: flex; flex: 1; min-height: 0; }

.wn-footer { flex-shrink: 0; }

.wn-left-sidepanel {
  display: none;
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--wn-color-border, #e3ded4);
}
.wn-left-sidepanel:not(:empty) { display: block; }

.wn-right-sidepanel {
  display: none;
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1px solid var(--wn-color-border, #e3ded4);
}
.wn-right-sidepanel:not(:empty) { display: block; }

/* Breadcrumb — mirrors the viewer nav.wn-crumbs */
.wn-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--wn-gap-breadcrumb, 0);
  font-size: var(--wn-font-size-small, 14px);
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.wn-crumb {
  color: var(--wn-color-fg-muted, #6f6a61);
  cursor: pointer;
  white-space: nowrap;
  padding: 3px 6px;
  border-radius: 4px;
  transition: var(--wn-transition-color, color 0.15s);
}
.wn-crumb:hover { color: var(--wn-color-accent, #1a5fb4); }
.wn-crumb--active { color: var(--wn-color-fg, #23211d); cursor: default; }

.wn-crumb-sep {
  color: var(--wn-color-fg-muted, #6f6a61);
  font-size: 13px;
  padding: 0 1px;
  user-select: none;
}

/* Header actions — mirrors the viewer .wn-view-actions */
.wn-actions {
  display: flex;
  gap: .8rem;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}
.wn-actions a { color: var(--wn-color-fg-muted, #6f6a61); text-decoration: none; }
.wn-actions a:hover { color: var(--wn-color-accent, #1a5fb4); }
.wn-actions span { color: var(--wn-color-fg-muted, #6f6a61); }

/* Editor area — mirrors the viewer main (centered ~46rem column) */
.wn-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: var(--wn-padding-editor-y, 2rem) var(--wn-padding-editor-x, 1.2rem) 5rem;
  position: relative;
}

.wn-editor-col {
  max-width: 46rem;
  margin: 0 auto;
  position: relative;
}

.wn-editor {
  outline: none;
  min-height: 100%;
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  color: var(--wn-color-fg, #23211d);
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: var(--wn-caret-color, #1a5fb4);
}

.wn-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  color: var(--wn-color-fg-muted, #6f6a61);
  pointer-events: none;
  user-select: none;
}

/* Remote cursor overlay */
.wn-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}
.wn-remote-cursor { position: absolute; pointer-events: none; white-space: nowrap; }
.wn-remote-cursor-caret {
  width: 2px;
  height: 1.2em;
  display: inline-block;
  vertical-align: text-bottom;
  margin-right: 2px;
}
.wn-remote-cursor-label {
  font-size: 10px;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  position: absolute;
  top: -14px;
  left: 0;
  white-space: nowrap;
}

/* Toast notifications */
.wn-toast-container {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 380px;
}
.wn-toast-container--top-right    { top: 12px; right: 12px; align-items: flex-end; }
.wn-toast-container--top-left     { top: 12px; left: 12px; align-items: flex-start; }
.wn-toast-container--bottom-right { bottom: 12px; right: 12px; align-items: flex-end; }
.wn-toast-container--bottom-left  { bottom: 12px; left: 12px; align-items: flex-start; }

.wn-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--wn-toast-border, #e3ded4);
  border-radius: var(--wn-toast-radius, 6px);
  font: var(--wn-font-size-small, 14px)/1.4 system-ui, sans-serif;
  color: var(--wn-toast-color, #23211d);
  background: var(--wn-toast-bg, #fbfaf7);
  min-width: 260px;
  box-shadow: var(--wn-toast-shadow, 0 4px 12px rgba(0,0,0,0.12));
  animation: wn-toast-enter 0.2s ease-out;
}
.wn-toast--success { background: var(--wn-toast-bg-success, #eef6ee); }
.wn-toast--warning { background: var(--wn-toast-bg-warning, #f7f2e4); }
.wn-toast--error   { background: var(--wn-toast-bg-error, #f7e9e9); }
.wn-toast--exiting { animation: wn-toast-exit 0.15s ease-in forwards; pointer-events: none; }

.wn-toast__icon { flex-shrink: 0; width: 14px; height: 14px; line-height: 14px; font-size: var(--wn-font-size-small, 14px); }
.wn-toast__message { flex: 1; word-break: break-word; line-height: 1.4; }
.wn-toast__actions { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }
.wn-toast__action-btn {
  padding: 2px 8px;
  background: transparent;
  color: var(--wn-color-accent, #1a5fb4);
  border: 1px solid var(--wn-color-accent, #1a5fb4);
  border-radius: 6px;
  cursor: pointer;
  font: var(--wn-font-size-small, 14px)/1.4 system-ui, sans-serif;
  white-space: nowrap;
}
.wn-toast__action-btn:hover { background: var(--wn-color-accent, #1a5fb4); color: var(--wn-color-bg, #fbfaf7); }
.wn-toast__close-btn {
  padding: 1px 4px;
  background: none;
  color: var(--wn-color-fg-muted, #6f6a61);
  border: none;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  font-size: 15px;
  line-height: 1;
}
.wn-toast__close-btn:hover { color: var(--wn-color-fg, #23211d); }

@keyframes wn-toast-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wn-toast-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}

/* Mobile — mirrors the viewer breakpoint */
@media (max-width: 640px) {
  .wn-header { flex-wrap: wrap; row-gap: .4rem; padding: .5rem .9rem; }
  .wn-breadcrumb { flex: 1 1 100%; order: 2; overflow-x: auto; scrollbar-width: none; }
  .wn-breadcrumb::-webkit-scrollbar { display: none; }
  .wn-crumb { padding: 8px 8px; }
  .wn-actions { margin-left: auto; }
  .wn-actions a { padding: .45em .35em; }
  .wn-toolbar { flex-wrap: wrap; row-gap: 4px; padding: .4rem .9rem; }
  .wn-editor-wrap { padding: 1.2rem .9rem 4rem; }
  .wn-body { flex-direction: column; }
  .wn-left-sidepanel:not(:empty),
  .wn-right-sidepanel:not(:empty) {
    width: 100%; max-height: 38%;
    border-left: none; border-right: none;
    border-top: 1px solid var(--wn-color-border, #e3ded4);
  }
  .wn-toast-container { max-width: calc(100vw - 16px); }
  .wn-toast { min-width: 0; max-width: 100%; }
}
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
 *
 * @param theme - Optional CSS string that replaces the default stylesheet entirely.
 */
const DEFAULT_CSS = EDITOR_TOKENS_CSS + EDITOR_CHROME_CSS + EDITOR_CONTENT_CSS

function injectStyles(theme?: string): void {
  const STYLE_ID = 'worldnotes-styles'
  const existing = document.getElementById(STYLE_ID)
  if (existing) {
    if (theme !== undefined) existing.textContent = theme
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = theme ?? DEFAULT_CSS
  document.head.appendChild(style)
}

// ─── Editor DOM ──────────────────────────────────────────────────────────────

/**
 * Public handle for the editor DOM elements returned by {@link createEditorDOM}.
 */
export interface EditorDOM {
  container: HTMLElement
  header: HTMLElement
  breadcrumb: HTMLElement
  actions: HTMLElement
  toolbar: HTMLElement
  editorWrap: HTMLElement
  editorDiv: HTMLDivElement
  placeholder: HTMLElement
  overlay: HTMLElement
  body: HTMLElement
  footer: HTMLElement
  leftSidepanel: HTMLElement
  rightSidepanel: HTMLElement
}

/**
 * Build the complete editor DOM inside `container`, inject default CSS into the
 * document head, and return typed references to each element.
 */
export function createEditorDOM(container: HTMLElement, theme?: string): EditorDOM {
  injectStyles(theme)

  container.innerHTML = ''
  container.className = 'wn-root'

  const header = el('div', 'wn-header')
  const breadcrumb = el('div', 'wn-breadcrumb')
  const actions = el('div', 'wn-actions')
  const toolbar = el('div', 'wn-toolbar')
  const body = el('div', 'wn-body')
  const leftSidepanel = el('div', 'wn-left-sidepanel')
  const editorWrap = el('div', 'wn-editor-wrap')
  const editorCol = el('div', 'wn-editor-col')
  const editorDiv = el('div', 'wn-editor') as HTMLDivElement
  const placeholder = el('div', 'wn-placeholder')
  const overlay = el('div', 'wn-overlay')
  const rightSidepanel = el('div', 'wn-right-sidepanel')
  const footer = el('div', 'wn-footer')

  placeholder.textContent = 'Start writing… use [[page name]] to link deeper'
  editorDiv.contentEditable = 'true'
  editorDiv.spellcheck = false

  header.appendChild(breadcrumb)
  header.appendChild(actions)

  editorCol.appendChild(placeholder)
  editorCol.appendChild(editorDiv)
  editorCol.appendChild(overlay)
  editorWrap.appendChild(editorCol)

  body.appendChild(leftSidepanel)
  body.appendChild(editorWrap)
  body.appendChild(rightSidepanel)

  container.appendChild(header)
  container.appendChild(toolbar)
  container.appendChild(body)
  container.appendChild(footer)

  return {
    container,
    header,
    breadcrumb,
    actions,
    toolbar,
    editorWrap,
    editorDiv,
    placeholder,
    overlay,
    body,
    footer,
    leftSidepanel,
    rightSidepanel,
  }
}
