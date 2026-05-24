// @vitest-environment happy-dom

// Register indexedDB global — happy-dom does not provide it
import 'fake-indexeddb/auto'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LocalStorageAdapter } from '../storage/localStorage'
import { IndexedDBAdapter } from '../storage/indexedDB'

// ─── Cleanup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

// ─── LocalStorageAdapter ──────────────────────────────────────────────────────

describe('LocalStorageAdapter', () => {
  it('set then get round-trip returns stored content', async () => {
    const adapter = new LocalStorageAdapter()
    await adapter.set('page1', 'Hello World')
    const result = await adapter.get('page1')
    expect(result).toBe('Hello World')
  })

  it('get non-existent key returns null', async () => {
    const adapter = new LocalStorageAdapter()
    const result = await adapter.get('nonexistent')
    expect(result).toBeNull()
  })

  it('keys returns only namespaced keys', async () => {
    const adapter = new LocalStorageAdapter()
    await adapter.set('page1', 'content1')
    await adapter.set('page2', 'content2')

    // Add a non-namespaced key directly to localStorage
    localStorage.setItem('other', 'val')

    const keys = await adapter.keys()
    expect(keys).toHaveLength(2)
    expect(keys).toContain('page1')
    expect(keys).toContain('page2')
    expect(keys).not.toContain('other')
  })

  it('overwrites existing key on second set', async () => {
    const adapter = new LocalStorageAdapter()
    await adapter.set('page1', 'old content')
    await adapter.set('page1', 'new content')
    const result = await adapter.get('page1')
    expect(result).toBe('new content')
  })

  it('uses custom namespace prefix', async () => {
    const adapter = new LocalStorageAdapter('custom-ns')
    await adapter.set('page1', 'Custom NS Content')

    // Verify the key is stored with the custom namespace prefix
    const storedKeys = Object.keys(localStorage)
    expect(storedKeys).toContain('custom-ns::page1')
    expect(storedKeys).not.toContain('worldnotes::page1')

    // get should still work
    const result = await adapter.get('page1')
    expect(result).toBe('Custom NS Content')
  })
})

// ─── IndexedDBAdapter ─────────────────────────────────────────────────────────

describe('IndexedDBAdapter', () => {
  function uniqueDbName(): string {
    return `test-worldnotes-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  it('open() initializes the database without error', async () => {
    const adapter = new IndexedDBAdapter(uniqueDbName())
    await expect(adapter.open()).resolves.toBeUndefined()
  })

  it('lazy initialization — get() auto-calls open()', async () => {
    const adapter = new IndexedDBAdapter(uniqueDbName())
    // get() before open() — ensureOpen triggers lazy open
    const result = await adapter.get('page1')
    expect(result).toBeNull()
  })

  it('set then get round-trip after open', async () => {
    const adapter = new IndexedDBAdapter(uniqueDbName())
    await adapter.open()
    await adapter.set('page1', 'IndexedDB Content')
    const result = await adapter.get('page1')
    expect(result).toBe('IndexedDB Content')
  })

  it('get non-existent key returns null', async () => {
    const adapter = new IndexedDBAdapter(uniqueDbName())
    await adapter.open()
    const result = await adapter.get('nonexistent')
    expect(result).toBeNull()
  })

  it('keys returns all stored keys', async () => {
    const adapter = new IndexedDBAdapter(uniqueDbName())
    await adapter.open()
    await adapter.set('page1', 'content1')
    await adapter.set('page2', 'content2')

    const keys = await adapter.keys()
    expect(keys).toHaveLength(2)
    expect(keys).toContain('page1')
    expect(keys).toContain('page2')
  })

  it('open() is idempotent — calling twice does not error', async () => {
    const adapter = new IndexedDBAdapter(uniqueDbName())
    await adapter.open()
    await expect(adapter.open()).resolves.toBeUndefined()
  })
})
