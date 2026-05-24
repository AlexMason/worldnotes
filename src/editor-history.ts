export interface EditorHistoryOptions {
  maxDepth: number
}

export class EditorHistory {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private maxDepth: number

  constructor(options: Partial<EditorHistoryOptions> = {}) {
    this.maxDepth = options.maxDepth ?? 50
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
    if (this.undoStack.length === 1) {
      return this.undoStack.pop()!
    }
    this.undoStack.pop()
    const previous = this.undoStack.pop()!
    return previous
  }

  redo(currentContent: string): string | null {
    if (this.redoStack.length === 0) return null
    this.undoStack.push(currentContent)
    return this.redoStack.pop()!
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
