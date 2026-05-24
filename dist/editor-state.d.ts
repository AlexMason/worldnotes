import { EditorContext, StorageAdapter, EditorOptions } from './types';
/**
 * Full API surface for editor mutable state.
 *
 * Properties and methods exposed by the createEditorState factory.
 * The `world` property is the raw mutable cache — modules mutate it directly
 * via setWorldPage. All getter methods return defensive copies to prevent
 * accidental external mutation.
 */
export interface EditorStateAPI {
    /** Raw mutable page-content cache. Use setWorldPage to write. */
    readonly world: Record<string, string>;
    /** Return a defensive copy of the breadcrumb trail. */
    getTrail(): string[];
    /** Return a defensive copy of the world cache. */
    getWorld(): Record<string, string>;
    /** Store page content in the world cache. */
    setWorldPage(page: string, content: string): void;
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
     *
     * @param navigate - Callback that plugins invoke to trigger page navigation
     */
    toContext(navigate: (page: string) => void): EditorContext;
}
/**
 * Create the editor's mutable state container.
 *
 * Owns the world cache, breadcrumb trail, save-timer reference, and
 * navigation-flag.  Returns an API object whose methods are the only
 * way to read or mutate that state — no global or module-level variables.
 *
 * @param storage - Storage adapter (used for save-debounce configuration only
 *                  in this module; actual reads/writes happen elsewhere)
 * @param options - EditorOptions that influence initial trail, initial page,
 *                  and save debounce duration
 *
 * @example
 * const state = createEditorState(mockStorage(), { initialPage: "home" })
 * state.pushTrail("about")
 * console.log(state.getTrail()) // ["home", "about"]
 */
export declare function createEditorState(storage: StorageAdapter, options?: EditorOptions): EditorStateAPI;
