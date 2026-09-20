// ─── Shortcuts help overlay — a discoverability UIPlugin ────────────────────
//
// Mounted into the (otherwise idle) wn-overlay slot. Self-contained: it
// owns Ctrl+/ + Escape via a document-level capture listener so the toggle
// works regardless of editor focus, and the keymap never binds those keys
// (single owner — no double-toggle). The table renders from the keymap's
// SHORTCUT_BINDINGS so overlay and bindings can never drift apart.

import type { UIPlugin } from '../types'
import { SHORTCUT_BINDINGS } from '../editor-keymap'

const GROUP_ORDER = ['Lines', 'Words', 'Formatting', 'Document'] as const

export function createShortcutsHelpPlugin(): UIPlugin {
  let panel: HTMLElement | null = null
  let onKeyDown: ((e: KeyboardEvent) => void) | null = null

  function buildPanel(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'wn-shortcuts'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-label', 'Keyboard shortcuts')
    el.style.display = 'none' // the codebase's hide idiom (no utility class)

    const title = document.createElement('div')
    title.className = 'wn-shortcuts-title'
    title.textContent = 'Keyboard shortcuts'
    el.appendChild(title)

    for (const group of GROUP_ORDER) {
      const rows = SHORTCUT_BINDINGS.filter((b) => b.group === group)
      if (!rows.length) continue
      const g = document.createElement('div')
      g.className = 'wn-shortcuts-group'
      const name = document.createElement('div')
      name.className = 'wn-shortcuts-group-name'
      name.textContent = group
      g.appendChild(name)
      for (const row of rows) {
        const line = document.createElement('div')
        line.className = 'wn-shortcuts-row'
        const keys = document.createElement('kbd')
        keys.className = 'wn-shortcuts-keys'
        keys.textContent = row.keys
        const action = document.createElement('span')
        action.className = 'wn-shortcuts-action'
        action.textContent = row.action
        line.appendChild(action)
        line.appendChild(keys)
        g.appendChild(line)
      }
      el.appendChild(g)
    }

    const hint = document.createElement('div')
    hint.className = 'wn-shortcuts-group-name'
    hint.textContent = 'Ctrl+/ or Esc to close'
    el.appendChild(hint)
    return el
  }

  return {
    name: 'shortcuts-help',
    version: '1.0.0',
    kind: 'ui',
    slots: ['wn-overlay'],

    onMount(slotEl: HTMLElement): void {
      panel = buildPanel()
      slotEl.appendChild(panel)

      onKeyDown = (e: KeyboardEvent): void => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '/') {
          e.preventDefault()
          e.stopPropagation()
          toggle()
        } else if (e.key === 'Escape' && isOpen()) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
      }
      // Capture phase on the document: toggles even when focus sits outside
      // the editor, and runs before any other handler can consume the chord.
      document.addEventListener('keydown', onKeyDown, true)
    },

    onDestroy(): void {
      if (onKeyDown) document.removeEventListener('keydown', onKeyDown, true)
      onKeyDown = null
      panel?.remove()
      panel = null
    },
  }

  function isOpen(): boolean {
    return !!panel && panel.style.display !== 'none'
  }

  function setOpen(open: boolean): void {
    if (panel) panel.style.display = open ? 'block' : 'none'
  }

  function toggle(): void {
    setOpen(!isOpen())
  }
}
