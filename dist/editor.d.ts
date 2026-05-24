import { PluginManifest, StorageAdapter, EditorOptions, EditorInstance } from './types';
/**
 * Fluent builder returned by createEditor().
 * Chain .use(), .withStorage(), then call .mount() to get a live EditorInstance.
 */
export declare class EditorBuilder {
    private readonly el;
    private registry;
    private storage;
    private options;
    private _mounted;
    private _slotElements;
    constructor(el: HTMLElement, options?: EditorOptions);
    /**
     * Register a plugin manifest (or replace a built-in by matching name).
     * Validates semver, detects conflicts, and fires lifecycle hooks.
     *
     * @param manifest - PluginManifest to register
     * @throws Error if version is invalid or a token/slot conflict is detected
     */
    use(manifest: PluginManifest): this;
    /**
     * Remove all registered plugins and start fresh.
     * Note: does NOT call onDestroy on removed plugins.
     * Call mount() afterward to re-initialize the editor.
     */
    clearPlugins(): this;
    /**
     * Replace the storage adapter.
     *
     * @param adapter - Any object implementing StorageAdapter
     */
    withStorage(adapter: StorageAdapter): this;
    /**
     * Mount the editor into the provided element and return a live EditorInstance.
     * Injects required styles, sets up event listeners, and loads the initial page.
     */
    mount(): EditorInstance;
}
/**
 * Entry point. Returns an EditorBuilder for the given element.
 *
 * @param el      - The container element; will be replaced with the editor DOM
 * @param options - Optional configuration (storage, initialPage, callbacks, etc.)
 *
 * @example
 * const editor = createEditor(document.getElementById('app'))
 *   .use(myCustomPlugin)
 *   .withStorage(new IndexedDBAdapter())
 *   .mount()
 */
export declare function createEditor(el: HTMLElement, options?: EditorOptions): EditorBuilder;
