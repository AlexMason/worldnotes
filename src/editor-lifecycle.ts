// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type {
  ContentPlugin,
  UIPlugin,
  StorageAdapter,
  EditorOptions,
  EditorInstance,
  EditorContext,
} from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { EditorNavigationAPI } from './editor-navigation'
import { getLineOffset, setLineOffset } from './awareness-cursor'
import { saveYDoc, loadYDoc } from './yjs-storage-bridge'
import { renderRemoteCursors } from './plugins/remoteCursors'
import { renderInlineContent } from './renderer'

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
          render.render(true)
        }
      })

      yDocState.doc.on('update', (_update: Uint8Array, origin: unknown) => {
        if (origin === syncProvider) {
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

    let handlingInput = false

    // Walk DOM to extract raw Markdown text, respecting data-raw attributes
    // set by plugins (e.g. wiki links render as display text but store raw
    // markup in data-raw). This replaces simple textContent which loses
    // token boundaries.
    function extractContentText(el: HTMLElement): string {
      let text = ''
      let hadDataLine = false
      function walk(node: Node): void {
        if (node.nodeType === Node.TEXT_NODE) {
          text += (node as Text).textContent ?? ''
        } else if (node instanceof HTMLElement) {
          if (node.dataset.raw !== undefined) {
            text += node.dataset.raw
          } else {
            if (node.dataset.line !== undefined) {
              if (hadDataLine) text += '\n'
              hadDataLine = true
            }
            node.childNodes.forEach(walk)
          }
        }
      }
      walk(el)
      return text
    }

    dom.editorDiv.addEventListener('input', () => {
      if (state.isNavigating()) return
      if (handlingInput) return
      handlingInput = true

      const trail = state.getTrail()
      const page = trail[trail.length - 1]
      const ytext = yDocState.getPage(page)

      // Use extractContentText to preserve data-raw token boundaries
      // (e.g. [[wiki links]]) instead of plain textContent which loses them.
      const raw = extractContentText(dom.editorDiv)
      const current = ytext.toString()
      if (raw !== current) {
        yDocState.doc.transact(() => {
          ytext.delete(0, current.length)
          ytext.insert(0, raw)
        })
      }

      const offset = getLineOffset(dom.editorDiv)

      let activeLine = 0
      for (let i = 0; i < Math.min(offset, raw.length); i++) {
        if (raw[i] === '\n') activeLine++
      }

      const aw = yDocState.awareness as {
        setLocalStateField: (field: string, value: unknown) => void
      } | null
      aw?.setLocalStateField?.('cursor', { offset, page, activeLine })

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

      // ── Plugin keydown dispatch ─────────────────────────────────────
      // Give content plugins first crack at keyboard events so they can
      // implement custom behaviors (list indentation, etc.).
      // First plugin to return { cursorOffset } wins.
      {
        const trail = state.getTrail()
        const page = trail[trail.length - 1]

        const context: EditorContext = {
          navigate: (p: string) => { void navigation.navigateToPage(p) },
          getTrail: () => state.getTrail(),
          getWorld: () => yDocState.getWorld(),
          getDoc: () => yDocState.doc,
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

            const raw = yDocState.getPage(page).toString()
            let activeLine = 0
            for (let i = 0; i < Math.min(result.cursorOffset, raw.length); i++) {
              if (raw[i] === '\n') activeLine++
            }
            const aw = yDocState.awareness as {
              setLocalStateField: (field: string, value: unknown) => void
            } | null
            aw?.setLocalStateField?.('cursor', { offset: result.cursorOffset, page, activeLine })

            saveDebounced()
            return
          }
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        insertTextAtSelection('  ')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        insertTextAtSelection('\n')
      } else if (e.key === 'Backspace') {
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
          const trail = state.getTrail()
          const page = trail[trail.length - 1]
          const ytext = yDocState.getPage(page)
          const raw = ytext.toString()
          const updated = raw.slice(0, offset - 1) + raw.slice(offset)
          yDocState.doc.transact(() => {
            ytext.delete(0, raw.length)
            ytext.insert(0, updated)
          })
          render.render()
          setLineOffset(dom.editorDiv, offset - 1)
          saveDebounced()
        }
      }
    })

    // ── Selection change — re-render when cursor moves to a different line ──

    let selectChangePending = false
    document.addEventListener('selectionchange', () => {
      if (handlingInput || selectChangePending || state.isNavigating())
        return
      selectChangePending = true
      requestAnimationFrame(() => {
        selectChangePending = false
        render.checkSelectChange()
      })
    })

    // ── Load initial page ──────────────────────────────────────────────────

    const trail = state.getTrail()
    const initialPage = trail[trail.length - 1]

    await navigation.loadPage(initialPage)

    // Set up undo manager AFTER loadPage so hasPage() correctly
    // reflects whether the page existed before loading
    const ytext = yDocState.getPage(initialPage)
    const undoManager = new Y.UndoManager(ytext, { captureTimeout: 0 })
    yDocState.setUndoManager(undoManager)

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
