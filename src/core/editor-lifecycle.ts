// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import type {
  ContentPlugin,
  UIPlugin,
  PageStore,
  EditorOptions,
  EditorInstance,
  EditorContext,
} from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { EditorNavigationAPI } from './editor-navigation'
import { getLineOffset, setLineOffset, getSelectionOffsets } from './caret-offset'
import { createEditingKeymap } from './editor-keymap'
import { extractContentText } from './content-text'
import { renderInlineContent } from './renderer'
import type { NotificationSystem } from './notifications'
import type { ToastOptions } from './types'

export interface EditorLifecycleAPI {
  mount(): Promise<EditorInstance>
}

export function createEditorLifecycle(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  uiPlugins: UIPlugin[],
  state: EditorStateAPI,
  render: EditorRenderAPI,
  navigation: EditorNavigationAPI,
  pageStore: PageStore,
  options: EditorOptions,
  notifications: NotificationSystem,
): EditorLifecycleAPI {
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

    dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
  }

  async function mount(): Promise<EditorInstance> {
    const saveDebounce = options.saveDebounceMs ?? 600
    const buffers = state.getPageBuffers()

    /**
     * Immediate save (Ctrl+S path) + the debounced timer's body. `page` is
     * passed by the debounce scheduler (captured at SCHEDULE time); omitting
     * it saves the page under the cursor.
     */
    async function saveNow(page?: string): Promise<void> {
      state.clearSaveTimer()
      const target = page ?? state.getCurrentPage()
      const content = buffers.getPageText(target)
      try {
        await pageStore.save(target, content)
        options.onSave?.(target, content)
      } catch (e) {
        console.error('worldnotes: page save failed', e)
        notifications.notify({ message: 'Failed to save page', type: 'error' })
      }
    }

    const saveDebounced = (): void => {
      state.clearSaveTimer()
      // Capture the page at SCHEDULE time: the timer may fire after the user
      // has navigated (a link click ~500ms after typing). Reading
      // getCurrentPage() at FIRE time would persist the destination page's
      // seeded buffer — creating a page the user never typed into — and the
      // originating page's edits would never be saved.
      const page = state.getCurrentPage()
      const timer = setTimeout(() => void saveNow(page), saveDebounce)
      state.setSaveTimer(timer)
    }

    // ── Editing keymap (line ops, word ops, formatting, Ctrl+S) ────────

    const keymap = createEditingKeymap({
      editorEl: dom.editorDiv,
      getCurrentPage: () => state.getCurrentPage(),
      pageExists: (page) => page in buffers.getWorld(),
      getPageText: (page) => buffers.getPageText(page),
      setPageText: (page, text) => buffers.setPageText(page, text),
      render: (offset) => render.render(true, offset),
      scheduleSave: saveDebounced,
      saveNow: () => void saveNow(),
    })

    // ── Input handler ──────────────────────────────────────────────────────

    let handlingInput = false

    // extractContentText lives in content-text.ts — the SINGLE raw-text model
    // shared with caret-offset.ts (both directions of the DOM ↔ source
    // mapping must agree node-for-node, forever; two implementations drifting
    // apart is a silent data-loss bug).

    dom.editorDiv.addEventListener('input', () => {
      if (state.isNavigating()) return
      if (handlingInput) return
      handlingInput = true

      const page = state.getCurrentPage()

      // Use extractContentText to preserve data-raw token boundaries
      // (e.g. [[wiki links]]) instead of plain textContent which loses them.
      const raw = extractContentText(dom.editorDiv)
      if (raw !== buffers.getPageText(page)) {
        buffers.setPageText(page, raw)
      }

      render.render()

      for (const plugin of contentPlugins) {
        plugin.onUpdate?.()
      }

      saveDebounced()

      handlingInput = false
    })

    // ── Paste handler ──────────────────────────────────────────────────────

    dom.editorDiv.addEventListener('paste', (e: ClipboardEvent) => {
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain') ?? ''
      insertTextAtSelection(text)
    })

    // ── Keydown handler ────────────────────────────────────────────────────

    dom.editorDiv.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const page = state.getCurrentPage()
        if (buffers.undo(page) !== null) {
          render.render(true)
          saveDebounced()
        }
        return
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const page = state.getCurrentPage()
        if (buffers.redo(page) !== null) {
          render.render(true)
          saveDebounced()
        }
        return
      }

      // Ctrl+Y — redo (Windows alternative)
      if (e.ctrlKey && !e.shiftKey && e.key === 'y') {
        e.preventDefault()
        const page = state.getCurrentPage()
        if (buffers.redo(page) !== null) {
          render.render(true)
          saveDebounced()
        }
        return
      }

      // ── Editing keymap ──────────────────────────────────────────────
      // Line/word/format ops and Ctrl+S. Consumed events never reach plugin
      // dispatch or the plain-key fallbacks below.
      if (keymap.handle(e)) return

      // ── Plugin keydown dispatch ─────────────────────────────────────
      // Give content plugins first crack at keyboard events so they can
      // implement custom behaviors (list indentation, etc.).
      // First plugin to return { cursorOffset } wins.
      {
        const context: EditorContext = {
          navigate: (p: string) => {
            void navigation.navigateToPage(p)
          },
          getTrail: () => state.getTrail(),
          getCurrentPage: () => state.getCurrentPage(),
          getWorld: () => buffers.getWorld(),
          getPageText: (p: string) => buffers.getPageText(p),
          setPageText: (p: string, content: string) => buffers.setPageText(p, content),
        }
        context.renderInline = (text: string): DocumentFragment => {
          return renderInlineContent(text, contentPlugins, context)
        }

        for (const plugin of contentPlugins) {
          if (!plugin.onKeydown) continue
          const result = plugin.onKeydown(e, context)
          if (result !== undefined && result !== false && 'cursorOffset' in result) {
            e.preventDefault()
            render.render(true, result.cursorOffset)

            saveDebounced()
            return
          }
        }
      }

      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        insertTextAtSelection('  ')
      } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        insertTextAtSelection('\n')
      } else if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return

        const range = sel.getRangeAt(0)

        if (!range.collapsed) {
          range.deleteContents()
          sel.removeAllRanges()
          sel.addRange(range)
          dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
          return
        }

        const offset = getLineOffset(dom.editorDiv)
        if (offset > 0) {
          const page = state.getCurrentPage()
          const raw = buffers.getPageText(page)
          const updated = raw.slice(0, offset - 1) + raw.slice(offset)
          buffers.setPageText(page, updated)
          render.render()
          setLineOffset(dom.editorDiv, offset - 1)
          saveDebounced()
        }
      }
    })

    // ── Selection change — re-render when cursor moves to a different line ──

    let selectChangePending = false
    document.addEventListener('selectionchange', () => {
      if (handlingInput || selectChangePending || state.isNavigating()) return
      selectChangePending = true
      requestAnimationFrame(() => {
        selectChangePending = false
        render.checkSelectChange()
      })
    })

    // ── Load initial page ──────────────────────────────────────────────────

    const initialPage = state.getCurrentPage()

    await navigation.loadPage(initialPage)

    // ── Mount UI plugins ───────────────────────────────────────────────────

    const slotElements: Record<string, HTMLElement> = {
      'wn-header': dom.header,
      'wn-toolbar': dom.toolbar,
      'wn-overlay': dom.overlay,
      'wn-left-sidepanel': dom.leftSidepanel,
      'wn-right-sidepanel': dom.rightSidepanel,
      'wn-footer': dom.footer,
    }
    for (const plugin of uiPlugins) {
      for (const slot of plugin.slots) {
        const el = slotElements[slot]
        if (el) {
          plugin.onMount(el)
        }
      }
    }

    // ── Public instance ────────────────────────────────────────────────────

    return {
      destroy() {
        state.clearSaveTimer()
        notifications.destroy()
        for (const plugin of contentPlugins) {
          try {
            plugin.onDestroy?.()
          } catch (e) {
            console.error(`Plugin "${plugin.name}" onDestroy failed:`, e)
          }
        }
        for (const plugin of uiPlugins) {
          try {
            plugin.onDestroy?.()
          } catch (e) {
            console.error(`UI plugin "${plugin.name}" onDestroy failed:`, e)
          }
        }
        dom.container.innerHTML = ''
      },

      navigate(page: string): void {
        void navigation.navigateToPage(page)
      },

      getCurrentPage(): string {
        return state.getCurrentPage()
      },

      getTrail(): string[] {
        return state.getTrail()
      },

      getContent(): string {
        const page = state.getCurrentPage()
        return buffers.getPageText(page)
      },

      setContent(content: string): void {
        const page = state.getCurrentPage()
        buffers.setPageText(page, content)
        render.render(true)
      },

      undo(): boolean {
        const page = state.getCurrentPage()
        if (buffers.undo(page) === null) return false
        render.render(true)
        saveDebounced()
        return true
      },

      redo(): boolean {
        const page = state.getCurrentPage()
        if (buffers.redo(page) === null) return false
        render.render(true)
        saveDebounced()
        return true
      },

      canUndo(): boolean {
        return buffers.canUndo(state.getCurrentPage())
      },

      canRedo(): boolean {
        return buffers.canRedo(state.getCurrentPage())
      },

      insertText(text: string): void {
        insertTextAtSelection(text)
      },

      deleteForward(): void {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return

        if (sel.isCollapsed) {
          try {
            sel.modify('extend', 'forward', 'character')
          } catch {
            const page = state.getCurrentPage()
            const raw = buffers.getPageText(page)
            const offset = getLineOffset(dom.editorDiv)
            if (offset >= raw.length) return
            const next = raw.slice(0, offset) + raw.slice(offset + 1)
            buffers.setPageText(page, next)
            render.render(true)
            setLineOffset(dom.editorDiv, offset)
            return
          }
        }

        const range = sel.getRangeAt(0)
        range.deleteContents()
        sel.removeAllRanges()
        sel.addRange(range)
        dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      },

      deleteBackward(): void {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return

        if (sel.isCollapsed) {
          try {
            sel.modify('extend', 'backward', 'character')
          } catch {
            const page = state.getCurrentPage()
            const raw = buffers.getPageText(page)
            const offset = getLineOffset(dom.editorDiv)
            if (offset <= 0) return
            const next = raw.slice(0, offset - 1) + raw.slice(offset)
            buffers.setPageText(page, next)
            render.render(true)
            setLineOffset(dom.editorDiv, offset - 1)
            return
          }
        }

        const range = sel.getRangeAt(0)
        range.deleteContents()
        sel.removeAllRanges()
        sel.addRange(range)
        dom.editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
      },

      getSelection(): { text: string; start: number; end: number } | null {
        // Raw-offset selection via the two-ended map (replaces the old
        // start + DOM-string-length math, which was wrong for multi-line and
        // data-raw token spans); null when unmappable, like tryGetLineOffset.
        const off = getSelectionOffsets(dom.editorDiv)
        if (!off) return null
        const page = state.getCurrentPage()
        const raw = buffers.getPageText(page)
        return { text: raw.slice(off.start, off.end), start: off.start, end: off.end }
      },

      notify(opts: ToastOptions): string {
        return notifications.notify(opts)
      },

      dismiss(toastId: string): void {
        notifications.dismiss(toastId)
      },
    }
  }

  return { mount }
}
