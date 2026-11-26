// ─── Editor toolbar — formatting buttons over the shared keymap actions ─────
//
// Mounted into the `wn-toolbar` row by the lifecycle (not a UIPlugin: buttons
// need the model-commit path, which a plugin never receives). Every button
// runs the SAME action as its keyboard chord (`EditingKeymap.format()`, or the
// link controller for Link/Ctrl+K), so toggle semantics, one-undo-step,
// autosave and the inert-inside-blocks rule can never differ between the two
// entry points.
//
// Focus: a button press must not blur the editor or collapse its selection —
// `mousedown` is cancelled (clicks and touch taps still fire), and keyboard
// activation refocuses the editor before running the action.
//
// State is derived from the markdown SOURCE (`activeFormats`), recomputed on
// `selectionchange` (rAF-coalesced; skipped while hidden or when nothing it
// reads changed). Buttons disable when the selection is unmappable (outside
// the editor, no page loaded) or inside a block region.

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
  /** Line indices of `text` inside block regions (the list button's pressed
   *  state must agree with what the list action would do). */
  blockLines(text: string): ReadonlySet<number>
  format(action: FormatAction): boolean
  /** Open the link field (the Link button; same as Ctrl+K). */
  openLink(): boolean
}

export interface EditorToolbar {
  /** Recompute enabled/pressed state now (otherwise: next selectionchange frame). */
  refresh(): void
  /** Hide the buttons while the link field occupies the row. */
  setHidden(hidden: boolean): void
  destroy(): void
}

/** `action` doubles as the ActiveFormats key: a button is pressed when the
 *  selection sits in the format it applies. */
interface ButtonSpec {
  action: FormatAction | 'link'
  label: string
  name: string
  chord?: string
}

const BUTTONS: ButtonSpec[] = [
  { action: 'bold', label: 'B', name: 'Bold', chord: 'Ctrl+B' },
  { action: 'italic', label: 'I', name: 'Italic', chord: 'Ctrl+I' },
  { action: 'underline', label: 'U', name: 'Underline', chord: 'Ctrl+U' },
  { action: 'list', label: '\u2022', name: 'Bullet list' },
  { action: 'link', label: 'Link', name: 'Link', chord: 'Ctrl+K' },
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
    button.className = `wn-toolbar-btn wn-toolbar-btn--${spec.action}`
    button.dataset.action = spec.action
    button.textContent = spec.label
    button.title = spec.chord ? `${spec.name} (${spec.chord})` : spec.name
    button.setAttribute('aria-label', spec.name)
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
    const action = button?.dataset.action as ButtonSpec['action'] | undefined
    if (!button || button.disabled || !action) return
    if (document.activeElement !== deps.editorEl) deps.editorEl.focus({ preventScroll: true })
    if (action === 'link') deps.openLink()
    else deps.format(action)
    refresh()
  })

  // What the last refresh read; an identical read cannot change the buttons.
  let seen: { page: string; start: number; end: number; text: string } | null = null

  function refresh(): void {
    const page = deps.getCurrentPage()
    const sel = deps.pageExists(page) ? getSelectionOffsets(deps.editorEl) : null
    const usable = sel !== null && !selectionInBlock(deps.editorEl)
    const text = usable ? deps.getPageText(page) : ''
    const now = usable && sel ? { page, start: sel.start, end: sel.end, text } : null
    const unchanged =
      now === seen ||
      (now !== null &&
        seen !== null &&
        now.page === seen.page &&
        now.start === seen.start &&
        now.end === seen.end &&
        now.text === seen.text)
    if (unchanged) return
    seen = now

    const active: ActiveFormats | null = now
      ? activeFormats(text, now.start, now.end, deps.defs, deps.blockLines(text))
      : null
    for (const [spec, button] of buttons) {
      button.disabled = !usable
      button.setAttribute('aria-pressed', active?.[spec.action] ? 'true' : 'false')
    }
  }

  let frame = 0
  const schedule = (): void => {
    if (frame || group.hidden) return
    frame = requestAnimationFrame(() => {
      frame = 0
      refresh()
    })
  }
  document.addEventListener('selectionchange', schedule)

  return {
    refresh,
    setHidden(hidden) {
      group.hidden = hidden
      seen = null // whatever happened while hidden is unseen
      if (!hidden) refresh()
    },
    destroy() {
      document.removeEventListener('selectionchange', schedule)
      if (frame) cancelAnimationFrame(frame)
      group.remove()
    },
  }
}
