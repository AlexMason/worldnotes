// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { createPageBuffers } from '../page-buffers'

describe('createPageBuffers', () => {
  it('getPageText returns empty string for unknown pages', () => {
    const buffers = createPageBuffers()
    expect(buffers.getPageText('nope')).toBe('')
    expect(buffers.hasPage('nope')).toBe(false)
  })

  it('setPageText creates a page and stores whole content', () => {
    const buffers = createPageBuffers()
    buffers.setPageText('home', '# Hello')
    expect(buffers.hasPage('home')).toBe(true)
    expect(buffers.getPageText('home')).toBe('# Hello')
  })

  it('setPageText with identical content adds no history step', () => {
    const buffers = createPageBuffers()
    buffers.setPageText('home', 'a')
    buffers.setPageText('home', 'a')
    // Only the creation itself is undoable — not two steps
    expect(buffers.undo('home')).toBe('')
    expect(buffers.undo('home')).toBeNull()
  })

  it('getWorld snapshots all pages', () => {
    const buffers = createPageBuffers()
    buffers.setPageText('a', '1')
    buffers.setPageText('b', '2')
    expect(buffers.getWorld()).toEqual({ a: '1', b: '2' })
  })

  it('accepts a seed map at construction', () => {
    const buffers = createPageBuffers({}, { home: 'seeded' })
    expect(buffers.hasPage('home')).toBe(true)
    expect(buffers.getPageText('home')).toBe('seeded')
  })

  describe('undo/redo', () => {
    it('undo returns to the pre-change content and records redo', () => {
      const buffers = createPageBuffers()
      buffers.setPageText('home', 'v1')
      buffers.setPageText('home', 'v2')

      expect(buffers.canUndo('home')).toBe(true)
      expect(buffers.undo('home')).toBe('v1')
      expect(buffers.canRedo('home')).toBe(true)
      expect(buffers.redo('home')).toBe('v2')
      expect(buffers.getPageText('home')).toBe('v2')
    })

    it('undo of a freshly created page returns to empty, then stops', () => {
      const buffers = createPageBuffers()
      buffers.setPageText('home', 'only')
      expect(buffers.undo('home')).toBe('')
      expect(buffers.undo('home')).toBeNull()
      expect(buffers.undo('missing')).toBeNull()
    })

    it('redo on an untouched page returns null', () => {
      const buffers = createPageBuffers()
      expect(buffers.redo('home')).toBeNull()
    })

    it('a new change clears the redo branch', () => {
      const buffers = createPageBuffers()
      buffers.setPageText('home', 'a')
      buffers.setPageText('home', 'b')
      buffers.undo('home')
      buffers.setPageText('home', 'c')
      expect(buffers.canRedo('home')).toBe(false)
    })

    it('histories are per-page', () => {
      const buffers = createPageBuffers()
      buffers.setPageText('a', '1')
      buffers.setPageText('a', '2')
      buffers.setPageText('b', 'x')
      buffers.setPageText('b', 'y')

      buffers.undo('a')
      expect(buffers.getPageText('a')).toBe('1')
      expect(buffers.getPageText('b')).toBe('y')
    })

    it('respects historyDepth via FIFO eviction', () => {
      const buffers = createPageBuffers({ historyDepth: 3 })
      buffers.setPageText('home', '1')
      buffers.setPageText('home', '2')
      buffers.setPageText('home', '3')
      buffers.setPageText('home', '4')

      // Oldest base snapshot evicted; can still undo back to '2'
      expect(buffers.undo('home')).toBe('3')
      expect(buffers.undo('home')).toBe('2')
      expect(buffers.undo('home')).toBeNull()
    })

    it('clearHistory discards undo state but keeps content', () => {
      const buffers = createPageBuffers()
      buffers.setPageText('home', 'a')
      buffers.setPageText('home', 'b')
      buffers.clearHistory('home')
      expect(buffers.canUndo('home')).toBe(false)
      expect(buffers.getPageText('home')).toBe('b')
    })
  })
})
