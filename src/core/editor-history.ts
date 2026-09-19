export interface EditorHistoryOptions {
  maxDepth: number
}

export class EditorHistory {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private maxDepth: number

  constructor(options: Partial<EditorHistoryOptions> = {}) {
    this.maxDepth = Math.max(1, options.maxDepth ?? 50)
  }

  push(content: string): void {
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === content) {
      return
    }
    this.undoStack.push(content)
    this.redoStack = []
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift()
    }
  }

  undo(currentContent: string): string | null {
    if (this.undoStack.length === 0) return null
    this.redoStack.push(currentContent)
    const popped = this.undoStack.pop()!
    if (this.undoStack.length === 0) return popped
    return this.undoStack[this.undoStack.length - 1]
  }

  redo(currentContent: string): string | null {
    if (this.redoStack.length === 0) return null
    this.undoStack.push(currentContent)
    const result = this.redoStack.pop()!
    if (this.redoStack.length > this.maxDepth) {
      this.redoStack.shift()
    }
    return result
  }

  canUndo(): boolean {
    return this.undoStack.length > 1
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
