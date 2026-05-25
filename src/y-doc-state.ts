import * as Y from 'yjs'
import type { EditorContext } from './types'

export interface YDocState {
  readonly doc: Y.Doc
  readonly pages: Y.Map<Y.Text>
  awareness: unknown
  undoManager: Y.UndoManager | null
  getDoc(): Y.Doc
  getPage(page: string): Y.Text
  hasPage(page: string): boolean
  getWorld(): Record<string, string>
  setAwareness(awareness: unknown): void
  setUndoManager(um: Y.UndoManager): void
  toContext(navigate: (page: string) => void): EditorContext
  encodeStateAsUpdate(): Uint8Array
  applyUpdate(update: Uint8Array): void
  destroy(): void
}

export function createYDocState(): YDocState {
  const doc = new Y.Doc()
  const pages = doc.getMap<Y.Text>('pages')
  let _awareness: unknown = null
  let _undoManager: Y.UndoManager | null = null

  function getPage(page: string): Y.Text {
    let ytext = pages.get(page)
    if (!ytext) {
      ytext = new Y.Text()
      pages.set(page, ytext)
    }
    return ytext
  }

  return {
    doc,
    pages,

    get awareness(): unknown {
      return _awareness
    },
    set awareness(val: unknown) {
      _awareness = val
    },

    get undoManager(): Y.UndoManager | null {
      return _undoManager
    },
    set undoManager(val: Y.UndoManager | null) {
      _undoManager = val
    },

    getDoc(): Y.Doc {
      return doc
    },

    getPage(page: string): Y.Text {
      return getPage(page)
    },

    hasPage(page: string): boolean {
      return pages.has(page)
    },

    getWorld(): Record<string, string> {
      const world: Record<string, string> = {}
      for (const [key, ytext] of pages.entries()) {
        world[key] = ytext.toString()
      }
      return world
    },

    setAwareness(awareness: unknown): void {
      _awareness = awareness
    },

    setUndoManager(um: Y.UndoManager): void {
      _undoManager = um
    },

    toContext(navigate: (page: string) => void): EditorContext {
      return {
        navigate,
        getTrail: () => [],
        getWorld: () => {
          const world: Record<string, string> = {}
          for (const [key, ytext] of pages.entries()) {
            world[key] = ytext.toString()
          }
          return world
        },
        getDoc: () => doc,
      }
    },

    encodeStateAsUpdate(): Uint8Array {
      return Y.encodeStateAsUpdate(doc)
    },

    applyUpdate(update: Uint8Array): void {
      Y.applyUpdate(doc, update)
    },

    destroy(): void {
      ;(_awareness as { destroy?: () => void } | null)?.destroy?.()
      _undoManager?.destroy()
      doc.destroy()
    },
  }
}
