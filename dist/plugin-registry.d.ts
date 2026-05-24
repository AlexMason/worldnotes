import { PluginManifest, ContentPlugin, UIPlugin, StoragePlugin, TokenDef } from './types';
/**
 * Centralized registry for plugin manifests.
 *
 * Stores plugins by category (content, ui, storage) in internal Maps
 * and provides conflict detection, semver validation, and lifecycle
 * hook orchestration at registration time.
 *
 * @example
 * ```ts
 * const registry = new PluginRegistry()
 * registry.register(myContentPlugin)
 * const defs = registry.allTokenDefs()
 * ```
 */
export declare class PluginRegistry {
    /** Content plugins keyed by name */
    private contentPlugins;
    /** UI plugins keyed by name */
    private uiPlugins;
    /** Storage plugins keyed by name */
    private storagePlugins;
    /** TokenDef.type → owning plugin name (content plugins only) */
    private tokenTypeOwners;
    /** Slot name → Map<priority, plugin name> (UI plugins only) */
    private slotAssignments;
    /**
     * Validate a version string against the semver regex.
     * Throws if the version does not match the expected format.
     */
    private validateVersion;
    /**
     * Remove a previously registered plugin by name and clean up its ownership.
     * Calls onDestroy on the removed plugin.
     */
    private removeByName;
    /**
     * Register a plugin manifest with conflict detection, semver validation,
     * and lifecycle hook invocation.
     *
     * @throws {Error} If the manifest version is invalid
     * @throws {Error} If a content plugin conflicts on a token type
     * @throws {Error} If a UI plugin conflicts on a slot+priority pair
     */
    register(manifest: PluginManifest): void;
    /** Register a content plugin with token type conflict detection. */
    private registerContent;
    /** Register a UI plugin with slot+priority conflict detection. */
    private registerUI;
    /** Register a storage plugin (no conflict detection needed). */
    private registerStorage;
    /** Return all registered content plugins (no UI/storage plugins). */
    allContentPlugins(): ContentPlugin[];
    /** Return all TokenDefs from all registered content plugins. */
    allTokenDefs(): TokenDef[];
    /**
     * Look up the content plugin that owns a given token type.
     * Returns undefined if no plugin claims the type.
     */
    getContentPluginByType(type: string): ContentPlugin | undefined;
    /**
     * Get a plugin by name across all categories.
     * Returns undefined if no plugin with that name is registered.
     */
    getPlugin(name: string): PluginManifest | undefined;
    /** Return all registered plugins from all categories combined. */
    getAllPlugins(): PluginManifest[];
    /** Return all registered UI plugins. */
    allUIPlugins(): UIPlugin[];
    /** Return all registered storage plugins. */
    allStoragePlugins(): StoragePlugin[];
    /**
     * Clear all plugin registrations.
     *
     * Does NOT call onDestroy on any plugin — the caller is responsible for
     * lifecycle teardown before calling clear(). This prevents a plugin's
     * onDestroy from throwing and blocking cleanup of other state.
     */
    clear(): void;
}
