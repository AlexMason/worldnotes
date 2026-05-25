// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
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
import { getLineOffset, setLineOffset } from './awareness-cursor'
import { saveYDoc, loadYDoc } from './yjs-storage-bridge'
import { renderRemoteCursors } from './plugins/remoteCursors'

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
  storage: StorageAdapter,
  options: EditorOptions,
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
    const yDocState = state.getYDocState()

    // Load persisted state
    await loadYDoc(yDocState.doc, storage)

    // Connect sync provider if configured
    let syncProvider: WebsocketProvider | null = null
    if (options.syncServer) {
      const trail = state.getTrail()
      const roomName = `worldnotes-${trail[trail.length - 1]}`
      syncProvider = new WebsocketProvider(
        options.syncServer,
        roomName,
        yDocState.doc,
      )
      yDocState.setAwareness(syncProvider.awareness)

      // Wire remote cursor rendering
      const awareness = syncProvider.awareness
      awareness.on('change', () => {
        renderRemoteCursors(
          dom.overlay,
          awareness as Parameters<typeof renderRemoteCursors>[1],
          dom.editorDiv,
          yDocState.doc.clientID,
        )
      })

      syncProvider.on('status', (event: { status: string }) => {
        if (event.status === 'connected') {
          // Full re-render on reconnect to pick up remote changes
          render.render(true)
        }
      })
    }

    const saveImmediate = async (): Promise<void> => {
      await saveYDoc(yDocState.doc, storage)
    }

    const saveDebounced = (): void => {
      state.clearSaveTimer()
      const timer = setTimeout(async () => {
        await saveImmediate()
        const trail = state.getTrail()
        const page = trail[trail.length - 1]
        const ytext = yDocState.getPage(page)
        options.onSave?.(page, ytext.toString())
      }, saveDebounce)
      state.setSaveTimer(timer)
    }

    // ── Input handler ──────────────────────────────────────────────────────

    dom.editorDiv.addEventListener('input', () => {
      if (state.isNavigating()) return

      const trail = state.getTrail()
      const page = trail[trail.length - 1]
      const ytext = yDocState.getPage(page)

      // Sync DOM content → Y.Text
      // Walk [data-line] containers and join with \n — textContent alone
      // would concatenate lines without newline separators.
      // Fall back to raw textContent if no line containers exist yet.
      const lineEls = Array.from(
        dom.editorDiv.querySelectorAll('[data-line]'),
      ) as HTMLElement[]
      let raw: string
      if (lineEls.length > 0) {
        lineEls.sort(
          (a, b) =>
            parseInt(a.dataset.line ?? '0', 10) -
            parseInt(b.dataset.line ?? '0', 10),
        )
        raw = lineEls.map((el) => el.textContent ?? '').join('\n')
      } else {
        raw = dom.editorDiv.textContent ?? ''
      }
      const current = ytext.toString()
      if (raw !== current) {
        yDocState.doc.transact(() => {
          ytext.delete(0, current.length)
          ytext.insert(0, raw)
        })
      }

      // Update awareness cursor position
      const offset = getLineOffset(dom.editorDiv)
      const aw = yDocState.awareness as {
        setLocalStateField: (field: string, value: unknown) => void
      } | null
      aw?.setLocalStateField?.('cursor', { offset, page })

      render.render()

      for (const plugin of contentPlugins) {
        plugin.onUpdate?.()
      }

      saveDebounced()
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
        const um = yDocState.undoManager
        if (um?.canUndo()) {
          um.undo()
          render.render(true)
        }
        return
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const um = yDocState.undoManager
        if (um?.canRedo()) {
          um.redo()
          render.render(true)
        }
        return
      }

      // Ctrl+Y — redo (Windows alternative)
      if (e.ctrlKey && !e.shiftKey && e.key === 'y') {
        e.preventDefault()
        const um = yDocState.undoManager
        if (um?.canRedo()) {
          um.redo()
          render.render(true)
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
    const ytext = yDocState.getPage(initialPage)
    const undoManager = new Y.UndoManager(ytext, { captureTimeout: 0 })
    yDocState.setUndoManager(undoManager)

    await navigation.loadPage(initialPage)

    // ── Mount UI plugins ──────────────────────────────────────────────────

    const slotElements: Record<string, HTMLElement> = {
      'wn-toolbar': dom.toolbar,
      'wn-overlay': dom.overlay,
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
        syncProvider?.destroy()
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
        yDocState.destroy()
        dom.container.innerHTML = ''
      },

      navigate(page: string) {
        navigation.navigateToPage(page)
      },

      getCurrentPage(): string {
        const t = state.getTrail()
        return t[t.length - 1]
      },

      getTrail(): string[] {
        return state.getTrail()
      },

      getContent(): string {
        const t = state.getTrail()
        const page = t[t.length - 1]
        return yDocState.getPage(page).toString()
      },

      setContent(content: string): void {
        const t = state.getTrail()
        const page = t[t.length - 1]
        const yt = yDocState.getPage(page)
        yDocState.doc.transact(() => {
          yt.delete(0, yt.length)
          yt.insert(0, content)
        })
        render.render(true)
      },

      undo(): boolean {
        const um = yDocState.undoManager
        if (!um?.canUndo()) return false
        um.undo()
        render.render(true)
        return true
      },

      redo(): boolean {
        const um = yDocState.undoManager
        if (!um?.canRedo()) return false
        um.redo()
        render.render(true)
        return true
      },

      canUndo(): boolean {
        return yDocState.undoManager?.canUndo() ?? false
      },

      canRedo(): boolean {
        return yDocState.undoManager?.canRedo() ?? false
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
            const raw = yDocState.getPage(
              state.getTrail()[state.getTrail().length - 1],
            ).toString()
            const offset = getLineOffset(dom.editorDiv)
            if (offset >= raw.length) return
            const next = raw.slice(0, offset) + raw.slice(offset + 1)
            yDocState
              .getPage(state.getTrail()[state.getTrail().length - 1])
              .delete(0, raw.length)
            yDocState
              .getPage(state.getTrail()[state.getTrail().length - 1])
              .insert(0, next)
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
            const raw = yDocState.getPage(
              state.getTrail()[state.getTrail().length - 1],
            ).toString()
            const offset = getLineOffset(dom.editorDiv)
            if (offset <= 0) return
            const next = raw.slice(0, offset - 1) + raw.slice(offset)
            yDocState
              .getPage(state.getTrail()[state.getTrail().length - 1])
              .delete(0, raw.length)
            yDocState
              .getPage(state.getTrail()[state.getTrail().length - 1])
              .insert(0, next)
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
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return null

        const text = sel.toString()

        const start = getLineOffset(dom.editorDiv)
        const end = start + text.length

        return { text, start, end: Math.max(start, end) }
      },
    }
  }

  return { mount }
}
