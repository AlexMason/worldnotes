// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import type { ContentPlugin, StorageAdapter, EditorOptions, EditorInstance } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { EditorNavigationAPI } from './editor-navigation'
import { extractText } from './cursor'

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
 * @param state           - Editor state (world, trail, save timer, nav flag)
 * @param render          - Render pipeline (render, renderBreadcrumb)
 * @param navigation      - Page navigation (navigateToPage, loadPage)
 * @param storage         - Storage adapter for persisting saves
 * @param options         - Editor options (saveDebounceMs, onSave, onPageLoad)
 *
 * @returns Lifecycle API with a single mount() method that returns EditorInstance
 *
 * @example
 * const lifecycle = createEditorLifecycle(dom, contentPlugins, state, render, nav, storage, opts)
 * const editor = lifecycle.mount()
 * editor.setContent('# new page')
 */
export function createEditorLifecycle(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
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

    // ── Input handler ──────────────────────────────────────────────────────

    dom.editorDiv.addEventListener('input', () => {
      if (state.isNavigating()) return
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
        const trail = state.getTrail()
        const page = trail[trail.length - 1]
        state.setWorldPage(page, content)
        dom.editorDiv.textContent = content
        render.render()
      },
    }
  }

  return { mount }
}
