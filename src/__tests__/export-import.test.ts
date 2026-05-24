// @vitest-environment happy-dom

import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import type { StorageAdapter } from '../types'
import { exportWorld, importWorld } from '../export-import'

function mockAdapter(pages: Record<string, string>): StorageAdapter {
  const data = { ...pages }
  return {
    get: vi.fn(async (key: string) => data[key] ?? null),
    set: vi.fn(async (key: string, value: string) => {
      data[key] = value
    }),
    keys: vi.fn(async () => Object.keys(data)),
  }
}

describe('exportWorld', () => {
  it('returns a zip blob containing all pages as .md files in nested folders', async () => {
    const adapter = mockAdapter({
      home: '# Home',
      'projects/acme': '# ACME Project',
      notes: 'Plain notes',
    })

    const blob = await exportWorld(adapter)

    expect(blob).toBeInstanceOf(Blob)

    const zip = await JSZip.loadAsync(blob)
    const entries = Object.keys(zip.files)

    expect(entries).toContain('home.md')
    expect(entries).toContain('projects/acme.md')
    expect(entries).toContain('notes.md')

    expect(await zip.file('home.md')!.async('string')).toBe('# Home')
    expect(await zip.file('projects/acme.md')!.async('string')).toBe('# ACME Project')
    expect(await zip.file('notes.md')!.async('string')).toBe('Plain notes')
  })

  it('returns a valid zip with no entries for empty storage', async () => {
    const adapter = mockAdapter({})
    const blob = await exportWorld(adapter)

    const zip = await JSZip.loadAsync(blob)

    expect(Object.keys(zip.files).length).toBe(0)
  })

  it('handles empty page content', async () => {
    const adapter = mockAdapter({ empty: '' })

    const blob = await exportWorld(adapter)
    const zip = await JSZip.loadAsync(blob)

    expect(await zip.file('empty.md')!.async('string')).toBe('')
  })

  it('uses custom filename option in zip metadata', async () => {
    const adapter = mockAdapter({ home: '# Home' })

    const blob = await exportWorld(adapter, { filename: 'my-notes.zip' })
    expect(blob).toBeInstanceOf(Blob)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('home.md')).toBeTruthy()
  })
})

describe('importWorld', () => {
  it('imports all .md entries from a zip into storage (overwrite strategy)', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    zip.file('home.md', '# Home')
    zip.file('projects/acme.md', '# ACME')
    zip.file('readme.txt', 'should be skipped')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob, { strategy: 'overwrite' })

    expect(result.imported).toHaveLength(2)
    expect(result.imported).toContain('home')
    expect(result.imported).toContain('projects/acme')
    expect(result.skipped).toHaveLength(0)

    expect(adapter.set).toHaveBeenCalledWith('home', '# Home')
    expect(adapter.set).toHaveBeenCalledWith('projects/acme', '# ACME')
    expect(adapter.set).not.toHaveBeenCalledWith('readme', expect.anything())
  })

  it('skip strategy: skips pages that already exist', async () => {
    const adapter = mockAdapter({ home: 'existing content' })

    const zip = new JSZip()
    zip.file('home.md', 'new content')
    zip.file('newpage.md', 'fresh')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob, { strategy: 'skip' })

    expect(result.imported).toHaveLength(1)
    expect(result.imported).toContain('newpage')
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped).toContain('home')

    expect(adapter.set).toHaveBeenCalledTimes(1)
    expect(adapter.set).toHaveBeenCalledWith('newpage', 'fresh')
    expect(adapter.set).not.toHaveBeenCalledWith('home', expect.anything())
  })

  it('merge strategy: overwrites existing pages', async () => {
    const adapter = mockAdapter({ home: 'old' })

    const zip = new JSZip()
    zip.file('home.md', 'new')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob, { strategy: 'merge' })

    expect(result.imported).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)
    expect(adapter.set).toHaveBeenCalledWith('home', 'new')
  })

  it('returns empty result for empty zip', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob)

    expect(result.imported).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('skips entries that would produce invalid empty page names', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    zip.file('.md', '# root dot md')
    zip.file('valid.md', '# valid')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob)

    expect(result.imported).toHaveLength(1)
    expect(result.imported).toContain('valid')
    expect(adapter.set).not.toHaveBeenCalledWith('', expect.anything())
  })

  it('default strategy is overwrite when options omitted', async () => {
    const adapter = mockAdapter({ home: 'existing' })

    const zip = new JSZip()
    zip.file('home.md', 'replaced')
    zip.file('new.md', 'added')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importWorld(adapter, blob)

    expect(result.imported).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)
    expect(adapter.set).toHaveBeenCalledWith('home', 'replaced')
    expect(adapter.set).toHaveBeenCalledWith('new', 'added')
  })

  it('accepts a File as well as a Blob', async () => {
    const adapter = mockAdapter({})

    const zip = new JSZip()
    zip.file('test.md', 'file content')
    const blob = await zip.generateAsync({ type: 'blob' })
    const file = new File([blob], 'export.zip', { type: 'application/zip' })

    const result = await importWorld(adapter, file)

    expect(result.imported).toContain('test')
    expect(adapter.set).toHaveBeenCalledWith('test', 'file content')
  })
})
