// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StorageAdapter, EditorInstance } from '../types'
import { createImportExportPlugin } from '../plugins/importExport'
import * as exportImport from '../export-import'

function mockStorage(): StorageAdapter {
  return {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    keys: vi.fn(async () => []),
  }
}

function mockEditor(): EditorInstance {
  return {
    destroy: vi.fn(),
    navigate: vi.fn(),
    getCurrentPage: vi.fn(() => 'home'),
    getTrail: vi.fn(() => ['home']),
    getContent: vi.fn(() => ''),
    setContent: vi.fn(),
  }
}

describe('createImportExportPlugin', () => {
  let storage: StorageAdapter
  let editor: EditorInstance
  let onImportComplete: ReturnType<typeof vi.fn>
  let slotEl: HTMLElement

  beforeEach(() => {
    storage = mockStorage()
    editor = mockEditor()
    onImportComplete = vi.fn()
    slotEl = document.createElement('div')
  })

  it('returns a valid UIPlugin manifest', () => {
    const plugin = createImportExportPlugin({
      storage,
      onImportComplete,
    })

    expect(plugin.kind).toBe('ui')
    expect(plugin.name).toBe('import-export')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.slots).toEqual(['wn-toolbar'])
    expect(plugin.onMount).toBeDefined()
    expect(plugin.onDestroy).toBeDefined()
  })

  it('onMount adds Export and Import buttons to the slot element', () => {
    const plugin = createImportExportPlugin({ storage, onImportComplete })

    plugin.onMount!(slotEl)

    const buttons = slotEl.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toBe('Export')
    expect(buttons[1].textContent).toBe('Import')
  })

  it('clicking Export calls exportWorld and triggers download', async () => {
    const exportBlob = new Blob(['test'], { type: 'application/zip' })
    const exportSpy = vi
      .spyOn(exportImport, 'exportWorld')
      .mockResolvedValue(exportBlob)

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    const clickSpy = vi.fn()
    const origCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag)
        if (tag === 'a') {
          Object.defineProperty(el, 'click', { value: clickSpy })
        }
        return el
      })

    const plugin = createImportExportPlugin({ storage, onImportComplete })
    plugin.onMount!(slotEl)

    const exportBtn = slotEl.querySelector('button')!
    await exportBtn.click()

    expect(exportSpy).toHaveBeenCalledWith(storage, { filename: undefined })
    expect(createObjectURLSpy).toHaveBeenCalledWith(exportBlob)
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test')

    createElementSpy.mockRestore()
    exportSpy.mockRestore()
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
  })

  it('clicking Export passes filename option when provided', async () => {
    const exportBlob = new Blob(['test'], { type: 'application/zip' })
    const exportSpy = vi
      .spyOn(exportImport, 'exportWorld')
      .mockResolvedValue(exportBlob)

    const plugin = createImportExportPlugin({
      storage,
      onImportComplete,
      exportFilename: 'custom.zip',
    })
    plugin.onMount!(slotEl)

    const exportBtn = slotEl.querySelector('button')!
    await exportBtn.click()

    expect(exportSpy).toHaveBeenCalledWith(storage, {
      filename: 'custom.zip',
    })

    exportSpy.mockRestore()
  })

  it('clicking Import creates a file input and calls importWorld on file selection', async () => {
    const importSpy = vi
      .spyOn(exportImport, 'importWorld')
      .mockResolvedValue({ imported: ['newpage'], skipped: [] })

    let fileInput: HTMLInputElement | null = null
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag)
        if (tag === 'input') {
          fileInput = el as HTMLInputElement
        }
        return el
      },
    )

    const plugin = createImportExportPlugin({ storage, onImportComplete })
    plugin.onMount!(slotEl)

    const buttons = slotEl.querySelectorAll('button')
    buttons[1].click()

    expect(fileInput).toBeTruthy()
    expect(fileInput!.type).toBe('file')
    expect(fileInput!.accept).toBe('.zip')

    const file = new File(['fake'], 'export.zip', {
      type: 'application/zip',
    })
    Object.defineProperty(fileInput!, 'files', { value: [file] })

    fileInput!.dispatchEvent(new Event('change'))

    await vi.waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith(storage, file, {
        strategy: undefined,
      })
    })

    expect(onImportComplete).toHaveBeenCalled()

    importSpy.mockRestore()
  })

  it('passes importStrategy option to importWorld', async () => {
    const importSpy = vi
      .spyOn(exportImport, 'importWorld')
      .mockResolvedValue({ imported: [], skipped: [] })

    let fileInput: HTMLInputElement | null = null
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag)
        if (tag === 'input') {
          fileInput = el as HTMLInputElement
        }
        return el
      },
    )

    const plugin = createImportExportPlugin({
      storage,
      onImportComplete,
      importStrategy: 'skip',
    })
    plugin.onMount!(slotEl)

    const buttons = slotEl.querySelectorAll('button')
    buttons[1].click()

    const file = new File(['fake'], 'export.zip', {
      type: 'application/zip',
    })
    Object.defineProperty(fileInput!, 'files', { value: [file] })
    fileInput!.dispatchEvent(new Event('change'))

    await vi.waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith(storage, file, {
        strategy: 'skip',
      })
    })

    importSpy.mockRestore()
  })

  it('onDestroy cleans up buttons and input from the DOM', () => {
    const plugin = createImportExportPlugin({ storage, onImportComplete })
    plugin.onMount!(slotEl)

    expect(slotEl.children.length).toBeGreaterThan(0)

    plugin.onDestroy!()

    expect(slotEl.children.length).toBe(0)
  })

  it('onDestroy is safe to call when plugin was never mounted', () => {
    const plugin = createImportExportPlugin({ storage, onImportComplete })

    expect(() => plugin.onDestroy!()).not.toThrow()
  })
})
