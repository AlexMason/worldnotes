// ─── PluginRegistry ───────────────────────────────────────────────────────────
// Centralized, testable state manager for plugin manifests.
//
// Replaces the ad-hoc Plugin[] array scattered across EditorBuilder, tokenizer,
// and renderer with a Map-based registry providing O(1) name lookup and
// conflict detection at registration time.

import type {
  PluginManifest,
  ContentPlugin,
  UIPlugin,
  StoragePlugin,
  TokenDef,
} from './types'

/**
 * Semver validation regex per D-02.
 * Matches: X.Y.Z, X.Y.Z-prerelease
 * Does NOT match: X.Y, vX.Y.Z, X.Y.Z+build
 */
const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/

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
export class PluginRegistry {
  // ── Internal State ──────────────────────────────────────────────────────────

  /** Content plugins keyed by name */
  private contentPlugins = new Map<string, ContentPlugin>()

  /** UI plugins keyed by name */
  private uiPlugins = new Map<string, UIPlugin>()

  /** Storage plugins keyed by name */
  private storagePlugins = new Map<string, StoragePlugin>()

  /** TokenDef.type → owning plugin name (content plugins only) */
  private tokenTypeOwners = new Map<string, string>()

  /** Slot name → Map<priority, plugin name> (UI plugins only) */
  private slotAssignments = new Map<string, Map<number, string>>()

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  private validateVersion(name: string, version: string): void {
    if (!SEMVER_RE.test(version)) {
      throw new Error(
        `Invalid version "${version}" for plugin "${name}": ` +
          `must match semver format X.Y.Z or X.Y.Z-prerelease`,
      )
    }
  }

  // ── Name-Based Replacement ──────────────────────────────────────────────────

  /**
   * Remove a previously registered plugin by name and clean up its ownership.
   * Calls onDestroy on the removed plugin.
   */
  private removeByName(name: string): void {
    // Check content plugins
    const contentPlugin = this.contentPlugins.get(name)
    if (contentPlugin) {
      contentPlugin.onDestroy?.()
      for (const def of contentPlugin.tokens) {
        this.tokenTypeOwners.delete(def.type)
      }
      this.contentPlugins.delete(name)
      return
    }

    // Check UI plugins
    const uiPlugin = this.uiPlugins.get(name)
    if (uiPlugin) {
      uiPlugin.onDestroy?.()
      const priority = uiPlugin.priority ?? 0
      for (const slot of uiPlugin.slots) {
        const priorityMap = this.slotAssignments.get(slot)
        if (priorityMap) {
          priorityMap.delete(priority)
          if (priorityMap.size === 0) {
            this.slotAssignments.delete(slot)
          }
        }
      }
      this.uiPlugins.delete(name)
      return
    }

    // Check storage plugins
    const storagePlugin = this.storagePlugins.get(name)
    if (storagePlugin) {
      storagePlugin.onDestroy?.()
      this.storagePlugins.delete(name)
    }
  }

  // ── Registration ────────────────────────────────────────────────────────────

  /**
   * Register a plugin manifest with conflict detection, semver validation,
   * and lifecycle hook invocation.
   *
   * @throws {Error} If the manifest version is invalid
   * @throws {Error} If a content plugin conflicts on a token type
   * @throws {Error} If a UI plugin conflicts on a slot+priority pair
   */
  register(manifest: PluginManifest): void {
    // 1. Semver validation
    this.validateVersion(manifest.name, manifest.version)

    // 2. Name-based replacement — call onDestroy on old plugin if name matches
    this.removeByName(manifest.name)

    // 3. Category-specific registration
    switch (manifest.kind) {
      case 'content':
        this.registerContent(manifest)
        break
      case 'ui':
        this.registerUI(manifest)
        break
      case 'storage':
        this.registerStorage(manifest)
        break
    }

    // 4. Lifecycle hook — called after successful registration.
    // If onInit throws, roll back the registration so the plugin
    // is not left partially registered.
    try {
      manifest.onInit?.()
    } catch (e) {
      this.removeByName(manifest.name)
      throw e
    }
  }

  /** Register a content plugin with token type conflict detection. */
  private registerContent(plugin: ContentPlugin): void {
    // Check for token type conflicts before registering
    for (const def of plugin.tokens) {
      const owner = this.tokenTypeOwners.get(def.type)
      if (owner !== undefined && owner !== plugin.name) {
        throw new Error(
          `Plugin conflict: "${plugin.name}" declares token type "${def.type}", ` +
            `but "${owner}" already owns it. ` +
            `Each token type may only be registered by one content plugin.`,
        )
      }
    }

    // Store ownership
    for (const def of plugin.tokens) {
      this.tokenTypeOwners.set(def.type, plugin.name)
    }
    this.contentPlugins.set(plugin.name, plugin)
  }

  /** Register a UI plugin with slot+priority conflict detection. */
  private registerUI(plugin: UIPlugin): void {
    const priority = plugin.priority ?? 0

    // Check for slot+priority conflicts before registering
    for (const slot of plugin.slots) {
      const priorityMap = this.slotAssignments.get(slot)
      if (priorityMap) {
        const existing = priorityMap.get(priority)
        if (existing !== undefined && existing !== plugin.name) {
          throw new Error(
            `UI plugin conflict: "${plugin.name}" claims slot "${slot}" ` +
              `with priority ${priority}, but "${existing}" already claims it ` +
              `with the same priority. Change one plugin's priority to resolve.`,
          )
        }
      }
    }

    // Store assignments
    for (const slot of plugin.slots) {
      let priorityMap = this.slotAssignments.get(slot)
      if (!priorityMap) {
        priorityMap = new Map()
        this.slotAssignments.set(slot, priorityMap)
      }
      priorityMap.set(priority, plugin.name)
    }

    this.uiPlugins.set(plugin.name, plugin)
  }

  /** Register a storage plugin (no conflict detection needed). */
  private registerStorage(plugin: StoragePlugin): void {
    this.storagePlugins.set(plugin.name, plugin)
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  /** Return all registered content plugins (no UI/storage plugins). */
  allContentPlugins(): ContentPlugin[] {
    return Array.from(this.contentPlugins.values())
  }

  /** Return all TokenDefs from all registered content plugins. */
  allTokenDefs(): TokenDef[] {
    return this.allContentPlugins().flatMap((p) => p.tokens)
  }

  /**
   * Look up the content plugin that owns a given token type.
   * Returns undefined if no plugin claims the type.
   */
  getContentPluginByType(type: string): ContentPlugin | undefined {
    const ownerName = this.tokenTypeOwners.get(type)
    if (!ownerName) return undefined
    return this.contentPlugins.get(ownerName)
  }

  /**
   * Get a plugin by name across all categories.
   * Returns undefined if no plugin with that name is registered.
   */
  getPlugin(name: string): PluginManifest | undefined {
    return (
      this.contentPlugins.get(name) ??
      this.uiPlugins.get(name) ??
      this.storagePlugins.get(name)
    )
  }

  /** Return all registered plugins from all categories combined. */
  getAllPlugins(): PluginManifest[] {
    return [
      ...this.contentPlugins.values(),
      ...this.uiPlugins.values(),
      ...this.storagePlugins.values(),
    ]
  }

  /** Return all registered UI plugins. */
  allUIPlugins(): UIPlugin[] {
    return Array.from(this.uiPlugins.values())
  }

  /** Return all registered storage plugins. */
  allStoragePlugins(): StoragePlugin[] {
    return Array.from(this.storagePlugins.values())
  }

  // ── Teardown ────────────────────────────────────────────────────────────────

  /**
   * Clear all plugin registrations.
   *
   * Does NOT call onDestroy on any plugin — the caller is responsible for
   * lifecycle teardown before calling clear(). This prevents a plugin's
   * onDestroy from throwing and blocking cleanup of other state.
   */
  clear(): void {
    this.contentPlugins.clear()
    this.uiPlugins.clear()
    this.storagePlugins.clear()
    this.tokenTypeOwners.clear()
    this.slotAssignments.clear()
  }
}
