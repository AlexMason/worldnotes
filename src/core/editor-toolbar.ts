// ─── Editor toolbar — formatting buttons over the shared keymap actions ─────
//
// Mounted into the `wn-toolbar` row by the lifecycle (not a UIPlugin: buttons
// need the model-commit path, which a plugin never receives). Every button
// runs the SAME `EditingKeymap.format()` action as its keyboard chord, so
// toggle semantics, one-undo-step, autosave and the inert-inside-blocks rule
// can never differ between the two entry points.
//
// Focus: a button press must not blur the editor or collapse its selection —
// `mousedown` is cancelled (clicks and touch taps still fire), and keyboard
// activation refocuses the editor before running the action.
//
// State is derived from the markdown SOURCE (`activeFormats`), recomputed on
// `selectionchange` (rAF-coalesced). Buttons disable when the selection is
// unmappable (outside the editor, no page loaded) or inside a block region.

import type { TokenDef } from './types'
import { activeFormats, type ActiveFormats } from './editor-format'
import type { FormatAction } from './editor-keymap'
import { getSelectionOffsets, selectionInBlock } from './caret-offset'

export interface EditorToolbarDeps {
  /** The `.wn-toolbar` row. */
  host: HTMLElement
  editorEl: HTMLElement
  defs: readonly TokenDef[]
  getCurrentPage(): string
  pageExists(page: string): boolean
  getPageText(page: string): string
  format(action: FormatAction): boolean
}

export interface EditorToolbar {
  /** Recompute enabled/pressed state now (otherwise: next selectionchange frame). */
  refresh(): void
  destroy(): void
}

interface ButtonSpec {
  action: FormatAction
  flag: keyof ActiveFormats
  label: string
  title: string
  cls: string
}

const BUTTONS: ButtonSpec[] = [
  { action: 'bold', flag: 'bold', label: 'B', title: 'Bold (Ctrl+B)', cls: 'bold' },
  { action: 'italic', flag: 'italic', label: 'I', title: 'Italic (Ctrl+I)', cls: 'italic' },
  {
    action: 'underline',
    flag: 'underline',
    label: 'U',
    title: 'Underline (Ctrl+U)',
    cls: 'underline',
  },
  { action: 'list', flag: 'list', label: '\u2022', title: 'Bullet list', cls: 'list' },
]

export function createEditorToolbar(deps: EditorToolbarDeps): EditorToolbar {
  const group = document.createElement('div')
  group.className = 'wn-toolbar-group'
  group.setAttribute('role', 'toolbar')
  group.setAttribute('aria-label', 'Formatting')

  const buttons = new Map<ButtonSpec, HTMLButtonElement>()
  for (const spec of BUTTONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `wn-toolbar-btn wn-toolbar-btn--${spec.cls}`
    button.dataset.action = spec.action
    button.textContent = spec.label
    button.title = spec.title
    button.setAttribute('aria-label', spec.title.replace(/ \(.*\)$/, ''))
    button.setAttribute('aria-pressed', 'false')
    button.disabled = true
    buttons.set(spec, button)
    group.appendChild(button)
  }
  // First in the row: UI plugins that mount into the slot follow it.
  deps.host.prepend(group)

  group.addEventListener('mousedown', (e) => {
    if (e.target instanceof Element && e.target.closest('button')) e.preventDefault()
  })

  group.addEventListener('click', (e) => {
    const button = e.target instanceof Element ? e.target.closest('button') : null
    const action = button?.dataset.action as FormatAction | undefined
    if (!button || button.disabled || !action) return
    if (document.activeElement !== deps.editorEl) deps.editorEl.focus({ preventScroll: true })
    deps.format(action)
    refresh()
  })

  function refresh(): void {
    const page = deps.getCurrentPage()
    const sel = deps.pageExists(page) ? getSelectionOffsets(deps.editorEl) : null
    const usable = sel !== null && !selectionInBlock(deps.editorEl)
    const active =
      usable && sel ? activeFormats(deps.getPageText(page), sel.start, sel.end, deps.defs) : null
    for (const [spec, button] of buttons) {
      button.disabled = !usable
      button.setAttribute('aria-pressed', active?.[spec.flag] ? 'true' : 'false')
    }
  }

  let frame = 0
  const schedule = (): void => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      refresh()
    })
  }
  document.addEventListener('selectionchange', schedule)

  return {
    refresh,
    destroy() {
      document.removeEventListener('selectionchange', schedule)
      if (frame) cancelAnimationFrame(frame)
      group.remove()
    },
  }
}
