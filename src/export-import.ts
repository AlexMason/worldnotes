import JSZip from 'jszip'
import type { StorageAdapter } from './types'

export type ConflictStrategy = 'overwrite' | 'skip' | 'merge'

export interface ImportResult {
  imported: string[]
  skipped: string[]
}

/**
 * Export all pages from storage into a zip Blob of nested markdown files.
 *
 * Page name `a/b/c` maps to zip entry `a/b/c.md`.
 * Returns a Blob suitable for download via URL.createObjectURL().
 */
export async function exportWorld(
  storage: StorageAdapter,
  _options?: { filename?: string },
): Promise<Blob> {
  const zip = new JSZip()
  const pageNames = await storage.keys()

  for (const name of pageNames) {
    const content = await storage.get(name)
    zip.file(`${name}.md`, content ?? '')
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Import pages from a zip File or Blob into storage.
 *
 * Zip entries ending in `.md` are treated as pages — the `.md` suffix is
 * stripped to derive the page name. Non-.md files are silently skipped.
 * Empty page names (from a root `.md` file) are also skipped.
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

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    if (!path.endsWith('.md')) continue

    const pageName = path.slice(0, -3) // strip '.md'
    if (pageName === '') continue // skip invalid empty page name

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
