// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import type { EditorOptions } from '../types'

import { createEditorState } from '../editor-state'
import { createPageBuffers } from '../page-buffers'

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  it('returns an object with all API members', () => {
    const options: EditorOptions = {}
    const state = createEditorState(options)

    expect(typeof state.getPageBuffers).toBe('function')
    expect(typeof state.getTrail).toBe('function')
    expect(typeof state.getCurrentPage).toBe('function')
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

  it('uses provided page buffers when given', () => {
    const buffers = createPageBuffers()
    const state = createEditorState({}, buffers)
    expect(state.getPageBuffers()).toBe(buffers)
  })

  it('getCurrentPage returns the only trail entry for a flat page', () => {
    const state = createEditorState({ initialPage: 'test' })
    expect(state.getCurrentPage()).toBe('test')
  })

  it('getCurrentPage joins nested segments after the root', () => {
    const state = createEditorState({ initialPage: 'home' })
    state.pushTrail('projects')
    state.pushTrail('worldnotes')
    expect(state.getCurrentPage()).toBe('projects/worldnotes')
  })

  it('pushTrail appends segments', () => {
    const state = createEditorState({ initialPage: 'a' })
    state.pushTrail('b')
    expect(state.getTrail()).toEqual(['a', 'b'])
  })

  it('setTrail replaces the trail', () => {
    const state = createEditorState({})
    state.setTrail(['x', 'y'])
    expect(state.getTrail()).toEqual(['x', 'y'])
  })

  it('getTrail returns a defensive copy', () => {
    const state = createEditorState({})
    state.getTrail().push('injected')
    expect(state.getTrail()).not.toContain('injected')
  })

  it('truncateTrail chops at index inclusive', () => {
    const state = createEditorState({})
    state.setTrail(['a', 'b', 'c'])
    state.truncateTrail(1)
    expect(state.getTrail()).toEqual(['a', 'b'])
  })

  it('setNavigating toggles the flag and returns the new value', () => {
    const state = createEditorState({})
    expect(state.isNavigating()).toBe(false)
    expect(state.setNavigating(true)).toBe(true)
    expect(state.isNavigating()).toBe(true)
  })

  it('pendingRequestedPage can be set and cleared', () => {
    const state = createEditorState({})
    expect(state.getPendingRequestedPage()).toBeNull()
    state.setPendingRequestedPage('missing')
    expect(state.getPendingRequestedPage()).toBe('missing')
    state.setPendingRequestedPage(null)
    expect(state.getPendingRequestedPage()).toBeNull()
  })

  it('toContext returns EditorContext with navigate, trail, world, and page text accessors', () => {
    const state = createEditorState({ initialPage: 'start' })
    const ctx = state.toContext((_page: string) => { /* noop */ })

    expect(typeof ctx.navigate).toBe('function')
    expect(typeof ctx.getTrail).toBe('function')
    expect(typeof ctx.getCurrentPage).toBe('function')
    expect(typeof ctx.getWorld).toBe('function')
    expect(typeof ctx.getPageText).toBe('function')
    expect(typeof ctx.setPageText).toBe('function')
  })

  it('context getPageText/setPageText round-trip through buffers', () => {
    const state = createEditorState({})
    const ctx = state.toContext(() => { /* noop */ })
    ctx.setPageText('p', '# P')
    expect(ctx.getPageText('p')).toBe('# P')
    expect(state.getPageBuffers().getPageText('p')).toBe('# P')
  })

  it('context reflects current trail state', () => {
    const state = createEditorState({ initialPage: 'home' })
    state.pushTrail('sub')
    const ctx = state.toContext(() => { /* noop */ })
    expect(ctx.getTrail()).toEqual(['home', 'sub'])
    expect(ctx.getCurrentPage()).toBe('sub')
  })

  it('getWorld delegates to page buffers', () => {
    const state = createEditorState({})
    state.getPageBuffers().setPageText('my-page', '# Hello')
    expect(state.getWorld()).toEqual({ 'my-page': '# Hello' })
  })

  it('getWorld aggregates multiple pages', () => {
    const state = createEditorState({ initialPage: 'start' })
    const buffers = state.getPageBuffers()
    buffers.setPageText('page-one', '# One')
    buffers.setPageText('page-two', '# Two')
    expect(state.getWorld()).toEqual({ 'page-one': '# One', 'page-two': '# Two' })
  })

  it('ignores legacy ?path= query strings (real URLs own navigation)', () => {
    setupLocation('?path=foo/bar%2Fbaz')
    const state = createEditorState({ initialPage: 'blog/real-url' })

    expect(state.getTrail()).toEqual(['blog/real-url'])
    expect(state.getCurrentPage()).toBe('blog/real-url')
  })

  it('initial trail comes from options.initialPage', () => {
    setupLocation('')
    const state = createEditorState({ initialPage: 'custom-start' })

    expect(state.getTrail()).toEqual(['custom-start'])
  })

  it('initial page defaults to home when options.initialPage is undefined', () => {
    setupLocation('')
    const state = createEditorState({})

    expect(state.getTrail()).toEqual(['home'])
  })

  it('seeds the buffer from options.initialContent with a clean undo baseline', () => {
    setupLocation('')
    const buffers = createPageBuffers()
    createEditorState({ initialPage: 'blog/post', initialContent: '# Hi' }, buffers)

    // SSR-embedded content is present without any store fetch…
    expect(buffers.hasPage('blog/post')).toBe(true)
    expect(buffers.getPageText('blog/post')).toBe('# Hi')
    // …and is the undo baseline: the first edit undoes back to it, not to ''.
    buffers.setPageText('blog/post', '# Hi!')
    expect(buffers.undo('blog/post')).toBe('# Hi')
  })
})
