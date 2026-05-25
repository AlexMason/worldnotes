import JSZip from 'jszip'
import type { StorageAdapter } from './types'

export type ConflictStrategy = 'overwrite' | 'skip' | 'merge'

export interface ImportResult {
  imported: string[]
  skipped: string[]
}

const YJS_KEY = '__ync_update__'
const YJS_EXPORT_NAME = '_worldnotes.yjs'

/**
 * Export all pages from storage into a zip Blob.
 *
 * Includes both individual .md files AND a _worldnotes.yjs binary
 * for lossless Y.Doc round-tripping (preserves undo history, CRDT metadata).
 *
 * Page name `a/b/c` maps to zip entry `a/b/c.md`.
 */
export async function exportWorld(
  storage: StorageAdapter,
  _options?: { filename?: string },
): Promise<Blob> {
  const zip = new JSZip()

  // Include Y.Doc binary snapshot if available
  const yjsData = await storage.get(YJS_KEY)
  if (yjsData) {
    zip.file(YJS_EXPORT_NAME, yjsData)
  }

  const pageNames = await storage.keys()
  for (const name of pageNames) {
    if (name === YJS_KEY) continue
    const content = await storage.get(name)
    zip.file(`${name}.md`, content ?? '')
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Import pages from a zip File or Blob into storage.
 *
 * If `_worldnotes.yjs` is present, it is saved as the Y.Doc persistence key.
 * Individual `.md` files are imported as pages (the `.md` suffix is stripped).
 * Both formats can coexist in the same zip — .yjs is loaded first for lossless
 * state, then .md overlays any additional pages.
 *
 * @param storage  StorageAdapter to write pages into
 * @param file     Zip file or blob to import
 * @param options  Optional conflict strategy (default: 'overwrite')
 * @returns        Report of which pages were imported vs skipped
 */
export async function importWorld(
  storage: StorageAdapter,
  file: File | Blob,
  options?: { strategy?: ConflictStrategy },
): Promise<ImportResult> {
  const strategy = options?.strategy ?? 'overwrite'
  const imported: string[] = []
  const skipped: string[] = []

  const zip = await JSZip.loadAsync(file)

  // Handle Y.Doc binary snapshot first (lossless restore)
  const yjsEntry = zip.file(YJS_EXPORT_NAME)
  if (yjsEntry) {
    const yjsContent = await yjsEntry.async('string')
    await storage.set(YJS_KEY, yjsContent)
    imported.push(YJS_EXPORT_NAME)
  }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    if (!path.endsWith('.md')) continue

    const pageName = path.slice(0, -3) // strip '.md'
    if (pageName === '') continue

    if (strategy === 'skip') {
      const existing = await storage.get(pageName)
      if (existing !== null) {
        skipped.push(pageName)
        continue
      }
    }

    const content = await entry.async('string')
    await storage.set(pageName, content)
    imported.push(pageName)
  }

  return { imported, skipped }
}
