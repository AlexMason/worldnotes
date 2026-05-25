import { EditorContext } from './types';
import * as Y from 'yjs';
export interface YDocState {
    readonly doc: Y.Doc;
    readonly pages: Y.Map<Y.Text>;
    awareness: unknown;
    undoManager: Y.UndoManager | null;
    getDoc(): Y.Doc;
    getPage(page: string): Y.Text;
    hasPage(page: string): boolean;
    getWorld(): Record<string, string>;
    setAwareness(awareness: unknown): void;
    setUndoManager(um: Y.UndoManager): void;
    toContext(navigate: (page: string) => void): EditorContext;
    encodeStateAsUpdate(): Uint8Array;
    applyUpdate(update: Uint8Array): void;
    destroy(): void;
}
export declare function createYDocState(): YDocState;
