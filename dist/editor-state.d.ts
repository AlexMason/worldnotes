import { EditorContext, StorageAdapter, EditorOptions } from './types';
import { YDocState } from './y-doc-state';
/**
 * Full API surface for editor mutable state.
 */
export interface EditorStateAPI {
    /** Return the Yjs-backed document state. */
    getYDocState(): YDocState;
    /** Return a defensive copy of the breadcrumb trail (flat path segments). */
    getTrail(): string[];
    /** Reconstruct the full current page name from trail segments. */
    getCurrentPage(): string;
    /** Return a defensive copy of the world cache (delegates to YDocState). */
    getWorld(): Record<string, string>;
    /** Append a page name to the trail. */
    pushTrail(page: string): void;
    /** Replace the entire trail in place. */
    setTrail(trail: string[]): void;
    /** Chop the trail down to (and including) the given index. */
    truncateTrail(index: number): void;
    /** Set the is-navigating flag; returns the new value. */
    setNavigating(v: boolean): boolean;
    /** Read the is-navigating flag. */
    isNavigating(): boolean;
    /** Clear any pending save timer. */
    clearSaveTimer(): void;
    /** Store a reference to the save timer. */
    setSaveTimer(timer: ReturnType<typeof setTimeout> | null): void;
    /**
     * Produce a readonly EditorContext for plugins.
     */
    toContext(navigate: (page: string) => void): EditorContext;
}
export declare function createEditorState(_storage: StorageAdapter, options?: EditorOptions): EditorStateAPI;
