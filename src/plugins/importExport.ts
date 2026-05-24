import type { UIPlugin, StorageAdapter } from '../types'
import type { ConflictStrategy } from '../export-import'
import { exportWorld, importWorld } from '../export-import'

export interface ImportExportPluginOptions {
  storage: StorageAdapter
  onImportComplete: () => void
  exportFilename?: string
  importStrategy?: ConflictStrategy
}

/**
 * Create a UIPlugin that adds Export and Import buttons to the editor toolbar.
 *
 * Export: downloads all pages as a .zip of nested .md files.
 * Import: reads a .zip, imports .md files as pages, then calls onImportComplete.
 *
 * @example
 * const editor = createEditor(el, { storage: adapter })
 *   .use(createImportExportPlugin({
 *     storage: adapter,
 *     onImportComplete: () => editor.navigate(editor.getCurrentPage()),
 *   }))
 *   .mount()
 */
export function createImportExportPlugin(options: ImportExportPluginOptions): UIPlugin {
  const { storage, onImportComplete, exportFilename, importStrategy } = options

  let exportBtn: HTMLButtonElement | null = null
  let importBtn: HTMLButtonElement | null = null
  let fileInput: HTMLInputElement | null = null

  async function handleExport(): Promise<void> {
    const blob = await exportWorld(storage, { filename: exportFilename })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename ?? 'worldnotes-export.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileSelected(): Promise<void> {
    const file = fileInput?.files?.[0]
    if (!file) return

    await importWorld(storage, file, { strategy: importStrategy })
    onImportComplete()
  }

  return {
    name: 'import-export',
    version: '1.0.0',
    kind: 'ui',
    slots: ['wn-toolbar'],

    onMount(slotEl: HTMLElement): void {
      exportBtn = document.createElement('button')
      exportBtn.textContent = 'Export'
      exportBtn.addEventListener('click', handleExport)
      slotEl.appendChild(exportBtn)

      importBtn = document.createElement('button')
      importBtn.textContent = 'Import'
      importBtn.addEventListener('click', () => {
        fileInput?.click()
      })
      slotEl.appendChild(importBtn)

      fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.zip'
      fileInput.style.display = 'none'
      fileInput.addEventListener('change', handleFileSelected)
      slotEl.appendChild(fileInput)
    },

    onDestroy(): void {
      if (exportBtn) {
        exportBtn.removeEventListener('click', handleExport)
        exportBtn.remove()
        exportBtn = null
      }
      if (importBtn) {
        importBtn.removeEventListener('click', () => {
          fileInput?.click()
        })
        importBtn.remove()
        importBtn = null
      }
      if (fileInput) {
        fileInput.removeEventListener('change', handleFileSelected)
        fileInput.remove()
        fileInput = null
      }
    },
  }
}
