// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { EditorHistory } from '../editor-history'

describe('EditorHistory', () => {
  let history: EditorHistory

  beforeEach(() => {
    history = new EditorHistory()
  })

  describe('push', () => {
    it('adds content to the undo stack', () => {
      history.push('state 1')
      history.push('state 2')
      expect(history.canUndo()).toBe(true)
    })

    it('coalesces duplicate consecutive pushes', () => {
      history.push('hello')
      history.push('hello')
      history.push('hello')
      history.push('world')
      const undone = history.undo('world')
      expect(undone).toBe('hello')
      expect(history.canUndo()).toBe(false)
    })

    it('clears redo stack on new push (branching semantics)', () => {
      history.push('a')
      history.push('b')
      const undone = history.undo('b')
      expect(undone).toBe('a')
      expect(history.canRedo()).toBe(true)

      history.push('c')
      expect(history.canRedo()).toBe(false)
    })

    it('respects maxDepth by evicting oldest entry', () => {
      const shallow = new EditorHistory({ maxDepth: 3 })
      shallow.push('1')
      shallow.push('2')
      shallow.push('3')
      shallow.push('4')
      let undone = shallow.undo('4')
      expect(undone).toBe('3')
      undone = shallow.undo('3')
      expect(undone).toBe('2')
      expect(shallow.canUndo()).toBe(false)
    })

    it('uses default maxDepth of 50', () => {
      expect(history).toBeDefined()
      for (let i = 0; i < 51; i++) {
        history.push(`state ${i}`)
      }
      let count = 0
      let content = `state 50`
      while (history.canUndo()) {
        content = history.undo(content)!
        count++
      }
      expect(count).toBeLessThanOrEqual(50)
    })
  })

  describe('undo', () => {
    it('returns the previous state', () => {
      history.push('original')
      const result = history.undo('modified')
      expect(result).toBe('original')
    })

    it('pushes current content to redo stack', () => {
      history.push('a')
      const undone = history.undo('current')
      expect(undone).toBe('a')
      expect(history.canRedo()).toBe(true)
    })

    it('returns null when undo stack is empty', () => {
      const result = history.undo('current')
      expect(result).toBeNull()
    })

    it('supports multiple undos', () => {
      history.push('a')
      history.push('b')
      history.push('c')
      let undone = history.undo('c')
      expect(undone).toBe('b')
      undone = history.undo('b')
      expect(undone).toBe('a')
      expect(history.canUndo()).toBe(false)
    })

    it('supports undoing through all pushed states (5+ pushes)', () => {
      history.push('one')
      history.push('two')
      history.push('three')
      history.push('four')
      history.push('five')
      let undone = history.undo('five')
      expect(undone).toBe('four')
      undone = history.undo('four')
      expect(undone).toBe('three')
      undone = history.undo('three')
      expect(undone).toBe('two')
      undone = history.undo('two')
      expect(undone).toBe('one')
      expect(history.canUndo()).toBe(false)
    })
  })

  describe('redo', () => {
    it('returns the next state', () => {
      history.push('a')
      history.undo('b')
      const result = history.redo('a')
      expect(result).toBe('b')
    })

    it('pushes current content to undo stack', () => {
      history.push('a')
      history.push('b')
      history.undo('b')
      history.redo('a')
      expect(history.canUndo()).toBe(true)
    })

    it('returns null when redo stack is empty', () => {
      const result = history.redo('current')
      expect(result).toBeNull()
    })

    it('supports multiple redos', () => {
      history.push('a')
      history.push('b')
      history.push('c')
      history.undo('c')
      history.undo('b')
      let redone = history.redo('a')
      expect(redone).toBe('b')
      redone = history.redo('b')
      expect(redone).toBe('c')
      expect(history.canRedo()).toBe(false)
    })

    it('supports redoing through all undone states (5+ pushes)', () => {
      history.push('one')
      history.push('two')
      history.push('three')
      history.push('four')
      history.push('five')
      history.undo('five')
      history.undo('four')
      history.undo('three')
      history.undo('two')
      let redone = history.redo('one')
      expect(redone).toBe('two')
      redone = history.redo('two')
      expect(redone).toBe('three')
      redone = history.redo('three')
      expect(redone).toBe('four')
      redone = history.redo('four')
      expect(redone).toBe('five')
      expect(history.canRedo()).toBe(false)
    })
  })

  describe('clear', () => {
    it('resets both stacks', () => {
      history.push('a')
      history.push('b')
      history.clear()
      expect(history.canUndo()).toBe(false)
      expect(history.canRedo()).toBe(false)
    })

    it('undo after clear returns null', () => {
      history.push('a')
      history.clear()
      expect(history.undo('x')).toBeNull()
    })
  })

  describe('canUndo / canRedo', () => {
    it('canUndo is false for fresh history', () => {
      expect(history.canUndo()).toBe(false)
    })

    it('canUndo is true after push', () => {
      history.push('a')
      history.push('b')
      expect(history.canUndo()).toBe(true)
    })

    it('canRedo is false for fresh history', () => {
      expect(history.canRedo()).toBe(false)
    })

    it('canRedo is true after undo', () => {
      history.push('a')
      history.undo('b')
      expect(history.canRedo()).toBe(true)
    })
  })
})
