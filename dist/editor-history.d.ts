export interface EditorHistoryOptions {
    maxDepth: number;
}
export declare class EditorHistory {
    private undoStack;
    private redoStack;
    private maxDepth;
    constructor(options?: Partial<EditorHistoryOptions>);
    push(content: string): void;
    undo(currentContent: string): string | null;
    redo(currentContent: string): string | null;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
}
