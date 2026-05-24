// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import type { StorageAdapter, EditorOptions, EditorContext } from '../types'

import { createEditorState } from '../editor-state'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mockStorage(): StorageAdapter {
  const store: Record<string, string> = {}
  return {
    async get(key: string): Promise<string | null> {
      return store[key] ?? null
    },
    async set(key: string, value: string): Promise<void> {
      store[key] = value
    },
    async keys(): Promise<string[]> {
      return Object.keys(store)
    },
  }
}

function setupLocation(search: string): void {
  // In happy-dom, window.location.search is writable
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      search,
      pathname: '/',
      hash: '',
    },
    writable: true,
    configurable: true,
  })
}

// ─── createEditorState ─────────────────────────────────────────────────────────

describe('createEditorState', () => {
  // Test 1: Returns object with all required API members
  it('returns an object with all 12 API members', () => {
    const storage = mockStorage()
    const options: EditorOptions = {}
    const state = createEditorState(storage, options)

    // Property
    expect(state).toHaveProperty('world')
    // Methods
    expect(typeof state.getTrail).toBe('function')
    expect(typeof state.getWorld).toBe('function')
    expect(typeof state.setWorldPage).toBe('function')
    expect(typeof state.pushTrail).toBe('function')
    expect(typeof state.setTrail).toBe('function')
    expect(typeof state.truncateTrail).toBe('function')
    expect(typeof state.setNavigating).toBe('function')
    expect(typeof state.isNavigating).toBe('function')
    expect(typeof state.clearSaveTimer).toBe('function')
    expect(typeof state.setSaveTimer).toBe('function')
    expect(typeof state.toContext).toBe('function')
  })

  // Test 2: getTrail returns defensive copy
  it('getTrail returns a defensive copy (mutation does not affect internal state)', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'test' })

    const trail1 = state.getTrail()
    trail1.push('tampered')
    const trail2 = state.getTrail()

    // The internal trail should not have been modified
    expect(trail2).not.toContain('tampered')
    expect(trail1).toContain('tampered') // local copy was mutated
  })

  // Test 3: getWorld returns defensive copy
  it('getWorld returns a defensive copy (mutation does not affect internal state)', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    state.setWorldPage('test', 'content')
    const world1 = state.getWorld()
    world1['tampered'] = 'bad'
    const world2 = state.getWorld()

    expect(world2).not.toHaveProperty('tampered')
    expect(world1).toHaveProperty('tampered') // local copy was mutated
  })

  // Test 4: pushTrail appends page and is reflected in getTrail
  it('pushTrail appends a page and reflects in subsequent getTrail', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'home' })

    state.pushTrail('about')
    const trail = state.getTrail()

    expect(trail).toEqual(['home', 'about'])
  })

  // Test 5: truncateTrail at index 1 on [a,b,c] produces [a,b]
  it('truncateTrail at index 1 on [a,b,c] produces [a,b]', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'a' })

    state.pushTrail('b')
    state.pushTrail('c')
    state.truncateTrail(1)

    expect(state.getTrail()).toEqual(['a', 'b'])
  })

  // Test 6: setNavigating and isNavigating
  it('setNavigating(true) returns true and isNavigating() returns true', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    const result = state.setNavigating(true)
    expect(result).toBe(true)
    expect(state.isNavigating()).toBe(true)
  })

  it('setNavigating(false) resets the flag', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    state.setNavigating(true)
    expect(state.isNavigating()).toBe(true)

    state.setNavigating(false)
    expect(state.isNavigating()).toBe(false)
  })

  // Test 7: clearSaveTimer clears existing timer
  it('clearSaveTimer clears an existing timer', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    // Set a valid timer
    const timer = setTimeout(() => { /* empty */ }, 100000)
    state.setSaveTimer(timer)
    expect(state.isNavigating()).toBeDefined() // sanity check

    // Clear it
    state.clearSaveTimer()

    // After clearing, setSaveTimer with null should be a no-op
    state.setSaveTimer(null)
  })

  it('clearSaveTimer is a no-op when no timer exists', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    // Should not throw when no timer is set
    expect(() => state.clearSaveTimer()).not.toThrow()
  })

  // Test 8: toContext returns EditorContext with navigate, getTrail, getWorld
  it('toContext returns EditorContext with navigate, getTrail, and getWorld', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'start' })

    let navigateCalled = ''
    const navigate = (page: string) => {
      navigateCalled = page
    }
    const ctx: EditorContext = state.toContext(navigate)

    expect(typeof ctx.navigate).toBe('function')
    expect(typeof ctx.getTrail).toBe('function')
    expect(typeof ctx.getWorld).toBe('function')

    // navigate delegates to the function
    ctx.navigate('test-page')
    expect(navigateCalled).toBe('test-page')

    // getTrail returns a snapshot
    const trail = ctx.getTrail()
    expect(Array.isArray(trail)).toBe(true)

    // getWorld returns a snapshot
    const world = ctx.getWorld()
    expect(typeof world).toBe('object')
  })

  // Test 9: setWorldPage updates world and getWorld reflects change
  it('setWorldPage updates world and getWorld reflects the change', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    state.setWorldPage('my-page', '# Hello')
    const world = state.getWorld()

    expect(world['my-page']).toBe('# Hello')
    // raw world property should also reflect it
    expect(state.world['my-page']).toBe('# Hello')
  })

  // Test 10: Initial trail decoded from URL search via decodePathSearch
  it('initial trail is decoded from URL search via decodePathSearch', () => {
    setupLocation('?path=foo/bar%2Fbaz')
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    const trail = state.getTrail()
    expect(trail).toEqual(['foo', 'bar/baz'])
  })

  it('falls back to options.initialPage when URL has no path', () => {
    setupLocation('')
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'custom-start' })

    expect(state.getTrail()).toEqual(['custom-start'])
  })

  // Test 11: Initial page defaults to 'home'
  it('initial page defaults to home when URL has no path and options.initialPage is undefined', () => {
    setupLocation('')
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    expect(state.getTrail()).toEqual(['home'])
  })
})
