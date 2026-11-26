import { describe, it, expect } from 'vitest'
import { createMemoryPageStore } from '../memory-page-store'

describe('createMemoryPageStore', () => {
  it('returns null for unknown pages', async () => {
    const store = createMemoryPageStore()
    await expect(store.load('missing')).resolves.toBeNull()
  })

  it('stores and retrieves content via save', async () => {
    const store = createMemoryPageStore()
    await store.save('a', 'content')
    await expect(store.load('a')).resolves.toBe('content')
  })

  it('empty-string pages load as empty string, not null', async () => {
    const store = createMemoryPageStore()
    await store.save('blank', '')
    await expect(store.load('blank')).resolves.toBe('')
  })

  it('seeds initial pages via constructor and seed()', async () => {
    const store = createMemoryPageStore({ home: '# Seed' })
    store.seed({ other: 'x' })
    await expect(store.load('home')).resolves.toBe('# Seed')
    await expect(store.load('other')).resolves.toBe('x')
  })

  it('dump snapshots persisted content', async () => {
    const store = createMemoryPageStore()
    await store.save('a', '1')
    await store.save('b', '2')
    expect(store.dump()).toEqual({ a: '1', b: '2' })
  })

  it('suggest matches slug or title (never content), respects the limit', async () => {
    const store = createMemoryPageStore({
      'lore/old-gods': '# The Old Gods\ntext',
      diary: 'about the old gods',
      'notes/b': '# Beta',
    })
    await expect(store.suggest!('OLD GODS', 8)).resolves.toEqual([
      { slug: 'lore/old-gods', title: 'The Old Gods' },
    ])
    await expect(store.suggest!('beta', 8)).resolves.toEqual([{ slug: 'notes/b', title: 'Beta' }])
    await expect(store.suggest!('o', 1)).resolves.toHaveLength(1)
  })
})
