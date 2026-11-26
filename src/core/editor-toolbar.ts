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
// Touch: the compatibility `mousedown` arrives AFTER the tap, so it can be too
// late — the browser may already have collapsed the selection, and a
// `selectionchange` in between would disable the button under the finger (a
// disabled button swallows its click). So `pointerdown` snapshots the editor
// selection and freezes the state refresh; `click` restores the snapshot
// when the live selection no longer matches it (text unchanged meanwhile).
//
// State is derived from the markdown SOURCE (`activeFormats`), recomputed on
// `selectionchange` (rAF-coalesced; skipped while hidden or when nothing it
// reads changed). Buttons disable when the selection is unmappable (outside
// the editor, no page loaded) or inside a block region.

import type { TokenDef } from './types'
import { activeFormats, type ActiveFormats } from './editor-format'
import type { FormatAction } from './editor-keymap'
import { getSelectionOffsets, selectionInBlock, setSelectionOffsets } from './caret-offset'

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
  /** Upload + insert picked image files (the Image button). Omitted when the
   *  editor has no image uploader: the button is then not rendered at all. */
  insertImages?(files: readonly File[]): Promise<void>
}

export interface EditorToolbar {
  /** Recompute enabled/pressed state now (otherwise: next selectionchange frame). */
  refresh(): void
  /** Hide the buttons while the link field occupies the row. */
  setHidden(hidden: boolean): void
  destroy(): void
}

/** The editor selection a button press started on. */
interface SelectionSnapshot {
  page: string
  start: number
  end: number
  text: string
}

/** A press with no click or cancel is abandoned after this long (finger slid off, a very long press). */
const PRESS_MAX_MS = 5000
/** After pointerup the click follows within a frame or two; if it doesn't, stop waiting. */
const RELEASE_GRACE_MS = 300

/** `action` doubles as the ActiveFormats key: a button is pressed when the
 *  selection sits in the format it applies. */
interface ButtonSpec {
  action: FormatAction | 'link' | 'image'
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

/** Opens the file picker; not a toggle, so it never carries a pressed state. */
const IMAGE_BUTTON: ButtonSpec = { action: 'image', label: 'Image', name: 'Insert image' }

export function createEditorToolbar(deps: EditorToolbarDeps): EditorToolbar {
  const group = document.createElement('div')
  group.className = 'wn-toolbar-group'
  group.setAttribute('role', 'toolbar')
  group.setAttribute('aria-label', 'Formatting')

  const buttons = new Map<ButtonSpec, HTMLButtonElement>()
  for (const spec of deps.insertImages ? [...BUTTONS, IMAGE_BUTTON] : BUTTONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `wn-toolbar-btn wn-toolbar-btn--${spec.action}`
    button.dataset.action = spec.action
    button.textContent = spec.label
    button.title = spec.chord ? `${spec.name} (${spec.chord})` : spec.name
    button.setAttribute('aria-label', spec.name)
    if (spec.action !== 'image') button.setAttribute('aria-pressed', 'false')
    button.disabled = true
    buttons.set(spec, button)
    group.appendChild(button)
  }

  // The picker lives inside the group (hidden with it while the link field is
  // open). `value` is cleared after every pick so choosing the same file
  // again still fires `change`.
  let fileInput: HTMLInputElement | null = null
  if (deps.insertImages) {
    const insertImages = deps.insertImages
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.multiple = true
    fileInput.hidden = true
    fileInput.tabIndex = -1
    fileInput.className = 'wn-toolbar-file'
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput?.files ?? [])
      if (fileInput) fileInput.value = ''
      if (files.length > 0) void insertImages(files)
    })
    group.appendChild(fileInput)
  }
  // First in the row: UI plugins that mount into the slot follow it.
  deps.host.prepend(group)

  group.addEventListener('mousedown', (e) => {
    if (e.target instanceof Element && e.target.closest('button')) e.preventDefault()
  })

  /** The press in progress, or null. `snapshot` is null when the press began
   *  without a usable editor selection (nothing to restore). */
  let press: { snapshot: SelectionSnapshot | null } | null = null
  let pressTimer: ReturnType<typeof setTimeout> | undefined

  const endPress = (): void => {
    press = null
    clearTimeout(pressTimer)
  }
  const abandonPress = (): void => {
    endPress()
    refresh()
  }

  group.addEventListener(
    'pointerdown',
    (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('button')) return
      const page = deps.getCurrentPage()
      const sel = deps.pageExists(page) ? getSelectionOffsets(deps.editorEl) : null
      press = { snapshot: sel ? { page, ...sel, text: deps.getPageText(page) } : null }
      clearTimeout(pressTimer)
      pressTimer = setTimeout(abandonPress, PRESS_MAX_MS)
    },
    true,
  )
  // The click follows the release at once; do not wait for it forever (a release off the button).
  group.addEventListener('pointerup', () => {
    if (!press) return
    clearTimeout(pressTimer)
    pressTimer = setTimeout(abandonPress, RELEASE_GRACE_MS)
  })
  // A scroll/drag took over the gesture: no click will follow.
  group.addEventListener('pointercancel', abandonPress)
  // Keyboard activation never involved a pointer: the editor kept its selection.
  group.addEventListener('keydown', endPress)

  group.addEventListener('click', (e) => {
    const button = e.target instanceof Element ? e.target.closest('button') : null
    const action = button?.dataset.action as ButtonSpec['action'] | undefined
    const snapshot = press?.snapshot ?? null
    endPress()
    if (!button || button.disabled || !action) return
    if (document.activeElement !== deps.editorEl) deps.editorEl.focus({ preventScroll: true })
    if (snapshot) restoreSelection(snapshot)
    if (action === 'link') deps.openLink()
    else if (action === 'image') fileInput?.click()
    else deps.format(action)
    refresh()
  })

  /** Put the pointerdown selection back if the touch browser dropped it. */
  function restoreSelection(snapshot: SelectionSnapshot): void {
    const live = getSelectionOffsets(deps.editorEl)
    if (live && live.start === snapshot.start && live.end === snapshot.end) return
    if (deps.getCurrentPage() !== snapshot.page) return
    if (deps.getPageText(snapshot.page) !== snapshot.text) return
    setSelectionOffsets(deps.editorEl, snapshot.start, snapshot.end)
  }

  // What the last refresh read; an identical read cannot change the buttons.
  let seen: SelectionSnapshot | null = null

  function refresh(): void {
    if (press) return // frozen: a finger is on a button
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
      if (spec.action !== 'image') {
        button.setAttribute('aria-pressed', active?.[spec.action] ? 'true' : 'false')
      }
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
      clearTimeout(pressTimer)
      group.remove()
    },
  }
}
