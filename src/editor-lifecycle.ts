// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import type {
  ContentPlugin,
  UIPlugin,
  StorageAdapter,
  EditorOptions,
  EditorInstance,
} from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { EditorNavigationAPI } from './editor-navigation'
import { extractText, setCaretOffset } from './cursor'

/**
 * Public API returned by {@link createEditorLifecycle}.
 *
 * @method mount - Wire event listeners, load initial page, and return a
 *                live {@link EditorInstance} with the public API methods.
 */
export interface EditorLifecycleAPI {
  mount(): EditorInstance
}

/**
 * Create the editor lifecycle manager.
 *
 * This is the assembly point: registers input/paste/keydown event
 * handlers on the editor div, wraps `insertTextAtSelection`, calls the
 * render pipeline on input, manages save debouncing, and returns the
 * public {@link EditorInstance} object.
 *
 * @param dom             - Editor DOM references (editorDiv for event listeners)
 * @param contentPlugins  - Registered ContentPlugin instances (used for lifecycle hooks)
 * @param uiPlugins       - Registered UIPlugin instances (mounted into DOM slots)
 * @param state           - Editor state (world, trail, save timer, nav flag)
 * @param render          - Render pipeline (render, renderBreadcrumb)
 * @param navigation      - Page navigation (navigateToPage, loadPage)
 * @param storage         - Storage adapter for persisting saves
 * @param options         - Editor options (saveDebounceMs, onSave, onPageLoad)
 *
 * @returns Lifecycle API with a single mount() method that returns EditorInstance
 *
 * @example
 * const lifecycle = createEditorLifecycle(dom, contentPlugins, uiPlugins, state, render, nav, storage, opts)
 * const editor = lifecycle.mount()
 * editor.setContent('# new page')
 */
export function createEditorLifecycle(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  uiPlugins: UIPlugin[],
  state: EditorStateAPI,
  render: EditorRenderAPI,
  navigation: EditorNavigationAPI,
  storage: StorageAdapter,
  options: EditorOptions,
): EditorLifecycleAPI {
  /**
   * Insert plain text at the current selection, replacing any selected
   * content. After insertion, dispatches an 'input' event on editorDiv
   * so the input handler picks up the change and re-renders.
   *
   * @param text - Plain text to insert at the caret position
   */
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

  /**
   * Wire all event listeners, load the initial page, and return the
   * public {@link EditorInstance} with all 6 methods.
   */
  function mount(): EditorInstance {
    const saveDebounce = options.saveDebounceMs ?? 600

    const saveContent = (content: string): void => {
      const trail = state.getTrail()
      const page = trail[trail.length - 1]
      state.setWorldPage(page, content)
      state.clearSaveTimer()
      const timer = setTimeout(async () => {
        await storage.set(page, content)
        options.onSave?.(page, content)
      }, saveDebounce)
      state.setSaveTimer(timer)
    }

    // ── Input handler ──────────────────────────────────────────────────────

    dom.editorDiv.addEventListener('input', () => {
      if (state.isNavigating()) return
      state.history.push(extractText(dom.editorDiv))
      render.render()

      // Call onUpdate on each content plugin after render (D-03)
      for (const plugin of contentPlugins) {
        plugin.onUpdate?.()
      }

      const raw = extractText(dom.editorDiv)
      const trail = state.getTrail()
      const page = trail[trail.length - 1]
      state.setWorldPage(page, raw)

      state.clearSaveTimer()
      const timer = setTimeout(async () => {
        await storage.set(page, raw)
        options.onSave?.(page, raw)
      }, saveDebounce)
      state.setSaveTimer(timer)
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
        const content = state.history.undo(extractText(dom.editorDiv))
        if (content !== null) {
          dom.editorDiv.blur()
          dom.editorDiv.textContent = content
          render.render()
          try {
            setCaretOffset(dom.editorDiv, content.length)
          } catch {
            /* best-effort */
          }
          saveContent(content)
          dom.editorDiv.focus()
        }
        return
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const content = state.history.redo(extractText(dom.editorDiv))
        if (content !== null) {
          dom.editorDiv.blur()
          dom.editorDiv.textContent = content
          render.render()
          try {
            setCaretOffset(dom.editorDiv, content.length)
          } catch {
            /* best-effort */
          }
          saveContent(content)
          dom.editorDiv.focus()
        }
        return
      }

      // Ctrl+Y — redo (Windows alternative)
      if (e.ctrlKey && !e.shiftKey && e.key === 'y') {
        e.preventDefault()
        const content = state.history.redo(extractText(dom.editorDiv))
        if (content !== null) {
          dom.editorDiv.blur()
          dom.editorDiv.textContent = content
          render.render()
          try {
            setCaretOffset(dom.editorDiv, content.length)
          } catch {
            /* best-effort */
          }
          saveContent(content)
          dom.editorDiv.focus()
        }
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        insertTextAtSelection('  ')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        insertTextAtSelection('\n')
      }
    })

    // ── Load initial page ──────────────────────────────────────────────────

    const trail = state.getTrail()
    const initialPage = trail[trail.length - 1]
    navigation.loadPage(initialPage)

    // ── Mount UI plugins ──────────────────────────────────────────────────
    const slotElements: Record<string, HTMLElement> = {
      'wn-toolbar': dom.toolbar,
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
        // Call onDestroy on each plugin, wrapped in try/catch (Pitfall 3)
        for (const plugin of contentPlugins) {
          try {
            plugin.onDestroy?.()
          } catch (e) {
            console.error(`Plugin "${plugin.name}" onDestroy failed:`, e)
          }
        }
        // UI plugin teardown
        for (const plugin of uiPlugins) {
          try {
            plugin.onDestroy?.()
          } catch (e) {
            console.error(`UI plugin "${plugin.name}" onDestroy failed:`, e)
          }
        }
        dom.container.innerHTML = ''
      },

      navigate(page: string) {
        navigation.navigateToPage(page)
      },

      getCurrentPage(): string {
        const trail = state.getTrail()
        return trail[trail.length - 1]
      },

      getTrail(): string[] {
        return state.getTrail()
      },

      getContent(): string {
        return extractText(dom.editorDiv)
      },

      setContent(content: string): void {
        const raw = extractText(dom.editorDiv)
        state.history.push(raw)
        const trail = state.getTrail()
        const page = trail[trail.length - 1]
        state.setWorldPage(page, content)
        dom.editorDiv.textContent = content
        render.render()
      },

      undo(): boolean {
        const content = state.history.undo(extractText(dom.editorDiv))
        if (content !== null) {
          dom.editorDiv.textContent = content
          render.render()
          saveContent(content)
          return true
        }
        return false
      },

      redo(): boolean {
        const content = state.history.redo(extractText(dom.editorDiv))
        if (content !== null) {
          dom.editorDiv.textContent = content
          render.render()
          saveContent(content)
          return true
        }
        return false
      },

      canUndo(): boolean {
        return state.history.canUndo()
      },

      canRedo(): boolean {
        return state.history.canRedo()
      },
    }
  }

  return { mount }
}
