import { describe, it, expect } from 'vitest'
import { createMemoryPagesRepository } from '../db/pages-memory'

function page(slug: string, over: Partial<{ title: string; content: string; version: number }> = {}) {
  return {
    slug,
    title: over.title ?? slug,
    content: over.content ?? 'x',
    version: over.version ?? 1,
    updatedAt: Date.now(),
    updatedBy: null,
  }
}

describe('memory PagesRepository', () => {
  it('put inserts then bumps version on update', async () => {
    const repo = createMemoryPagesRepository()
    const first = await repo.put('a', { title: 'A', content: 'one' })
    expect(first.version).toBe(1)
    const second = await repo.put('a', { title: 'A', content: 'two' })
    expect(second.version).toBe(2)
    await expect(repo.get('a')).resolves.toMatchObject({ content: 'two', version: 2 })
  })

  it('get returns unknown slugs as null', async () => {
    const repo = createMemoryPagesRepository()
    await expect(repo.get('ghost')).resolves.toBeNull()
  })

  it('putIfMatch succeeds on version match and conflicts otherwise', async () => {
    const repo = createMemoryPagesRepository()
    await repo.put('a', { title: 'A', content: 'v1' })

    const ok = await repo.putIfMatch('a', { title: 'A', content: 'v2' }, 1)
    expect(ok.ok).toBe(true)

    const stale = await repo.putIfMatch('a', { title: 'A', content: 'v3' }, 1)
    expect(stale).toMatchObject({ ok: false, reason: 'conflict', current: { version: 2 } })
  })

  it('putIfMatch on missing page reports missing', async () => {
    const repo = createMemoryPagesRepository()
    const res = await repo.putIfMatch('nope', { title: 'N', content: '' }, 1)
    expect(res).toEqual({ ok: false, reason: 'missing' })
  })

  it('create conflicts when the slug exists', async () => {
    const repo = createMemoryPagesRepository([page('dup')])
    const res = await repo.create('dup', { title: 'D', content: '' })
    expect(res).toMatchObject({ ok: false, reason: 'exists' })

    const fresh = await repo.create('new', { title: 'New', content: 'hi' })
    expect(fresh.ok).toBe(true)
    if (fresh.ok) expect(fresh.record.version).toBe(1)
  })

  it('list sorts newest first and filters case-insensitively', async () => {
    const repo = createMemoryPagesRepository()
    await repo.put('one', { title: 'First Post', content: 'alpha' })
    await new Promise((r) => setTimeout(r, 2))
    await repo.put('two', { title: 'Second', content: 'Beta text' })

    const all = await repo.list()
    expect(all.map((p) => p.slug)).toEqual(['two', 'one'])

    expect((await repo.list({ query: 'beta' })).map((p) => p.slug)).toEqual(['two'])
    expect((await repo.list({ query: 'first post' })).map((p) => p.slug)).toEqual(['one'])
    expect((await repo.list({ query: 'ONE' })).map((p) => p.slug)).toEqual(['one'])
    expect((await repo.list({ limit: 1 })).map((p) => p.slug)).toEqual(['two'])
  })

  it('delete removes and reports whether a row went away', async () => {
    const repo = createMemoryPagesRepository([page('gone')])
    expect(await repo.delete('gone')).toBe(true)
    expect(await repo.delete('gone')).toBe(false)
  })

  it('deleteIfMatch deletes only the guarded version', async () => {
    const repo = createMemoryPagesRepository([page('v')])
    await repo.put('v', { title: 'V', content: 'newer' }) // version 2

    const stale = await repo.deleteIfMatch('v', 1)
    expect(stale).toMatchObject({ ok: false, reason: 'conflict' })
    if (!stale.ok && stale.reason === 'conflict')
      expect(stale.current.version).toBe(2)
    expect(await repo.get('v')).not.toBeNull()

    expect(await repo.deleteIfMatch('v', 2)).toEqual({ ok: true })
    expect(await repo.get('v')).toBeNull()

    expect(await repo.deleteIfMatch('v', 2)).toMatchObject({ ok: false, reason: 'missing' })
  })

  it('records are defensive copies', async () => {
    const repo = createMemoryPagesRepository()
    const rec = await repo.put('a', { title: 'A', content: 'x' })
    rec.content = 'tampered'
    await expect(repo.get('a')).resolves.toMatchObject({ content: 'x' })
  })

  it('destroy clears the world', async () => {
    const repo = createMemoryPagesRepository([page('a')])
    await repo.destroy()
    expect(await repo.list()).toEqual([])
  })
})
