import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRenderCache } from '../cache'

afterEach(() => vi.useRealTimers())

describe('createRenderCache', () => {
  it('stores and retrieves entries', () => {
    const cache = createRenderCache({ maxEntries: 2, ttlMs: 1000 })
    cache.set('a', { value: 'A', etag: '"1"', storedAt: Date.now() })
    expect(cache.get('a')?.value).toBe('A')
  })

  it('expires entries beyond TTL', () => {
    vi.useFakeTimers()
    const cache = createRenderCache({ maxEntries: 5, ttlMs: 100 })
    cache.set('a', { value: 'A', etag: '"1"', storedAt: Date.now() })
    vi.advanceTimersByTime(150)
    expect(cache.get('a')).toBeUndefined()
  })

  it('evicts least-recently-used beyond maxEntries', () => {
    const cache = createRenderCache({ maxEntries: 2, ttlMs: 10_000 })
    cache.set('a', { value: 1, etag: '', storedAt: Date.now() })
    cache.set('b', { value: 2, etag: '', storedAt: Date.now() })
    cache.get('a') // refresh a → b becomes LRU
    cache.set('c', { value: 3, etag: '', storedAt: Date.now() })
    expect(cache.get('a')).toBeDefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBeDefined()
    expect(cache.size).toBe(2)
  })

  it('invalidate and clear', () => {
    const cache = createRenderCache({ maxEntries: 5, ttlMs: 10_000 })
    cache.set('x', { value: 'x', etag: '', storedAt: Date.now() })
    cache.set('y', { value: 'y', etag: '', storedAt: Date.now() })
    cache.invalidate('x')
    expect(cache.get('x')).toBeUndefined()
    cache.clear()
    expect(cache.size).toBe(0)
  })
})
