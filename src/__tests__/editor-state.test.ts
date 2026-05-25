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
  it('returns an object with all 11 API members', () => {
    const storage = mockStorage()
    const options: EditorOptions = {}
    const state = createEditorState(storage, options)

    expect(typeof state.getYDocState).toBe('function')
    expect(typeof state.getTrail).toBe('function')
    expect(typeof state.getWorld).toBe('function')
    expect(typeof state.pushTrail).toBe('function')
    expect(typeof state.setTrail).toBe('function')
    expect(typeof state.truncateTrail).toBe('function')
    expect(typeof state.setNavigating).toBe('function')
    expect(typeof state.isNavigating).toBe('function')
    expect(typeof state.clearSaveTimer).toBe('function')
    expect(typeof state.setSaveTimer).toBe('function')
    expect(typeof state.toContext).toBe('function')
  })

  it('getTrail returns a defensive copy (mutation does not affect internal state)', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'test' })

    const trail1 = state.getTrail()
    trail1.push('tampered')
    const trail2 = state.getTrail()

    expect(trail2).not.toContain('tampered')
    expect(trail1).toContain('tampered')
  })

  it('getWorld returns a defensive copy (mutation does not affect internal state)', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    state.getYDocState().getPage('test').insert(0, 'content')
    const world1 = state.getWorld()
    world1['tampered'] = 'bad'
    const world2 = state.getWorld()

    expect(world2).not.toHaveProperty('tampered')
    expect(world1).toHaveProperty('tampered')
  })

  it('pushTrail appends a page and reflects in subsequent getTrail', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'home' })

    state.pushTrail('about')
    const trail = state.getTrail()

    expect(trail).toEqual(['home', 'about'])
  })

  it('truncateTrail at index 1 on [a,b,c] produces [a,b]', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, { initialPage: 'a' })

    state.pushTrail('b')
    state.pushTrail('c')
    state.truncateTrail(1)

    expect(state.getTrail()).toEqual(['a', 'b'])
  })

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

  it('clearSaveTimer clears an existing timer', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    const timer = setTimeout(() => {
      /* empty */
    }, 100000)
    state.setSaveTimer(timer)
    expect(state.isNavigating()).toBeDefined()

    state.clearSaveTimer()
    state.setSaveTimer(null)
  })

  it('clearSaveTimer is a no-op when no timer exists', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    expect(() => state.clearSaveTimer()).not.toThrow()
  })

  it('toContext returns EditorContext with navigate, getTrail, getWorld, and getDoc', () => {
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
    expect(typeof ctx.getDoc).toBe('function')

    ctx.navigate('test-page')
    expect(navigateCalled).toBe('test-page')

    const trail = ctx.getTrail()
    expect(Array.isArray(trail)).toBe(true)

    const world = ctx.getWorld()
    expect(typeof world).toBe('object')

    const doc = ctx.getDoc()
    expect(doc).toBeDefined()
  })

  it('getYDocState returns object with getDoc, getPage, hasPage, and getWorld methods', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    const yDocState = state.getYDocState()
    expect(typeof yDocState.getDoc).toBe('function')
    expect(typeof yDocState.getPage).toBe('function')
    expect(typeof yDocState.hasPage).toBe('function')
    expect(typeof yDocState.getWorld).toBe('function')
  })

  it('getYDocState getPage creates and returns content', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    const yDocState = state.getYDocState()
    expect(yDocState.hasPage('my-page')).toBe(false)

    const ytext = yDocState.getPage('my-page')
    ytext.insert(0, '# Hello')
    expect(yDocState.hasPage('my-page')).toBe(true)
    expect(ytext.toString()).toBe('# Hello')
  })

  it('getWorld delegates to getYDocState and reflects ytext content', () => {
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    const yDocState = state.getYDocState()
    yDocState.getPage('my-page').insert(0, '# Hello')

    const world = state.getWorld()
    expect(world['my-page']).toBe('# Hello')
  })

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

  it('initial page defaults to home when URL has no path and options.initialPage is undefined', () => {
    setupLocation('')
    const storage = mockStorage()
    const state = createEditorState(storage, {})

    expect(state.getTrail()).toEqual(['home'])
  })
})
