import { Plugin, StorageAdapter, EditorOptions, EditorInstance } from './types';

/**
 * Fluent builder returned by createEditor().
 * Chain .use(), .withStorage(), then call .mount() to get a live EditorInstance.
 */
export declare class EditorBuilder {
    private readonly el;
    private plugins;
    private storage;
    private options;
    constructor(el: HTMLElement, options?: EditorOptions);
    /**
     * Register a plugin (or replace a built-in by matching name).
     * Plugins are applied in registration order during tokenization.
     *
     * @param plugin - Plugin instance to register
     */
    use(plugin: Plugin): this;
    /**
     * Remove all default plugins and start with an empty plugin set.
     * Useful when you want full control over which tokens are supported.
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
