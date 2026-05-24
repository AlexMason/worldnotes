// @vitest-environment happy-dom

import { describe, it, expect, vi } from 'vitest'
import { PluginRegistry } from '../plugin-registry'
import type { ContentPlugin, UIPlugin, StoragePlugin } from '../types'

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeContentPlugin(overrides: Partial<ContentPlugin> = {}): ContentPlugin {
  return {
    name: 'test-content',
    version: '1.0.0',
    kind: 'content',
    tokens: [{ type: 'test', pattern: /test/ }],
    render: () => document.createElement('span'),
    ...overrides,
  }
}

function makeUIPlugin(overrides: Partial<UIPlugin> = {}): UIPlugin {
  return {
    name: 'test-ui',
    version: '1.0.0',
    kind: 'ui',
    slots: ['wn-toolbar'],
    priority: 0,
    onMount: (_slotEl: HTMLElement) => {
      // noop — default stub, override via overrides
    },
    ...overrides,
  }
}

function makeStoragePlugin(
  overrides: Partial<StoragePlugin> = {},
): StoragePlugin {
  return {
    name: 'test-storage',
    version: '1.0.0',
    kind: 'storage',
    adapter: {
      get: async () => null,
      set: async (_key: string, _value: string) => {
        // noop — default stub, override via overrides
      },
      keys: async () => [],
    },
    ...overrides,
  }
}

// ─── A. Semver Validation (PLUG-06) ────────────────────────────────────────────

describe('Semver Validation', () => {
  it('accepts valid version 1.0.0', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: '1.0.0' })
    expect(() => registry.register(plugin)).not.toThrow()
  })

  it('accepts valid prerelease version 0.1.0-alpha', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: '0.1.0-alpha' })
    expect(() => registry.register(plugin)).not.toThrow()
  })

  it('accepts valid multi-dot prerelease version 2.3.1-beta.2.3', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: '2.3.1-beta.2.3' })
    expect(() => registry.register(plugin)).not.toThrow()
  })

  it('rejects version with only major.minor (1.0)', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: '1.0' })
    expect(() => registry.register(plugin)).toThrow(/Invalid version/)
  })

  it('rejects version with v prefix (v1.0.0)', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: 'v1.0.0' })
    expect(() => registry.register(plugin)).toThrow(/Invalid version/)
  })

  it('rejects version with build metadata (1.0.0+build)', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: '1.0.0+build' })
    expect(() => registry.register(plugin)).toThrow(/Invalid version/)
  })

  it('error message includes the invalid version string', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ version: 'not-version', name: 'my-plugin' })
    expect(() => registry.register(plugin)).toThrow(
      /Invalid version "not-version" for plugin "my-plugin"/,
    )
  })
})

// ─── B. Content Plugin Registration (PLUG-01) ──────────────────────────────────

describe('Content Plugin Registration', () => {
  it('registers a valid ContentPlugin and returns it via allContentPlugins', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({
      name: 'bold',
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    registry.register(plugin)

    const plugins = registry.allContentPlugins()
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe('bold')
  })

  it('allTokenDefs returns tokens from registered content plugins', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({
      name: 'bold',
      tokens: [
        { type: 'bold', pattern: /\*\*(.+)\*\*/ },
        { type: 'italic', pattern: /\*(.+)\*/ },
      ],
    })
    registry.register(plugin)

    const defs = registry.allTokenDefs()
    expect(defs).toHaveLength(2)
    expect(defs.map((d) => d.type)).toEqual(['bold', 'italic'])
  })

  it('registers two ContentPlugins with different token types', () => {
    const registry = new PluginRegistry()
    const bold = makeContentPlugin({
      name: 'bold',
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    const italic = makeContentPlugin({
      name: 'italic',
      tokens: [{ type: 'italic', pattern: /\*(.+)\*/ }],
    })
    registry.register(bold)
    registry.register(italic)

    expect(registry.allContentPlugins()).toHaveLength(2)
    expect(registry.allContentPlugins().map((p) => p.name)).toEqual([
      'bold',
      'italic',
    ])
  })

  it('calls onInit when registering a plugin', () => {
    const registry = new PluginRegistry()
    const onInit = vi.fn()
    const plugin = makeContentPlugin({ onInit })
    registry.register(plugin)

    expect(onInit).toHaveBeenCalledTimes(1)
  })
})

// ─── C. Content Plugin Conflict Detection (PLUG-03 / D-04) ─────────────────────

describe('Content Plugin Conflict Detection', () => {
  it('throws when two different plugins declare the same token type', () => {
    const registry = new PluginRegistry()
    const pluginA = makeContentPlugin({
      name: 'plugin-a',
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    const pluginB = makeContentPlugin({
      name: 'plugin-b',
      tokens: [{ type: 'bold', pattern: /__.+__/ }],
    })
    registry.register(pluginA)

    expect(() => registry.register(pluginB)).toThrow(/Plugin conflict/)
  })

  it('error message names both plugins and the conflicting token type', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeContentPlugin({
        name: 'plugin-a',
        tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
      }),
    )

    expect(() =>
      registry.register(
        makeContentPlugin({
          name: 'plugin-b',
          tokens: [{ type: 'bold', pattern: /__.+__/ }],
        }),
      ),
    ).toThrow(/plugin-b.*token type "bold".*plugin-a/)
  })

  it('does not partially register when one token type conflicts', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeContentPlugin({
        name: 'existing',
        tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
      }),
    )

    const conflictingPlugin = makeContentPlugin({
      name: 'conflict',
      tokens: [
        { type: 'italic', pattern: /\*(.+)\*/ },
        { type: 'bold', pattern: /__.+__/ },
      ],
    })

    expect(() => registry.register(conflictingPlugin)).toThrow()

    // Plugin should NOT be partially registered
    expect(registry.getPlugin('conflict')).toBeUndefined()
    // The non-conflicting token type 'italic' should NOT be owned by 'conflict'
    expect(registry.getContentPluginByType('italic')).toBeUndefined()
  })

  it('allows a plugin to re-register its own token types (self-overlap)', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({
      name: 'self',
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    registry.register(plugin)

    // Re-registering the same plugin (by name) should replace, not conflict
    const updated = makeContentPlugin({
      name: 'self',
      tokens: [{ type: 'bold', pattern: /__.+__/ }],
    })
    expect(() => registry.register(updated)).not.toThrow()
    expect(registry.getContentPluginByType('bold')).toBeDefined()
  })
})

// ─── D. UI Plugin Conflict Detection (D-05) ────────────────────────────────────

describe('UI Plugin Conflict Detection', () => {
  it('throws when two UI plugins claim the same slot with the same priority', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeUIPlugin({ name: 'ui-a', slots: ['wn-toolbar'], priority: 10 }),
    )

    expect(() =>
      registry.register(
        makeUIPlugin({ name: 'ui-b', slots: ['wn-toolbar'], priority: 10 }),
      ),
    ).toThrow(/UI plugin conflict/)
  })

  it('error message names both plugins, the slot, and the priority value', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeUIPlugin({ name: 'ui-a', slots: ['wn-toolbar'], priority: 10 }),
    )

    expect(() =>
      registry.register(
        makeUIPlugin({ name: 'ui-b', slots: ['wn-toolbar'], priority: 10 }),
      ),
    ).toThrow(/ui-b.*slot "wn-toolbar".*priority 10.*ui-a/)
  })

  it('allows two UI plugins in the same slot with different priorities', () => {
    const registry = new PluginRegistry()
    const low = makeUIPlugin({ name: 'low', slots: ['wn-toolbar'], priority: 0 })
    const high = makeUIPlugin({
      name: 'high',
      slots: ['wn-toolbar'],
      priority: 100,
    })

    expect(() => registry.register(low)).not.toThrow()
    expect(() => registry.register(high)).not.toThrow()
    expect(registry.allUIPlugins()).toHaveLength(2)
  })

  it('default priority is 0 when not specified', () => {
    const registry = new PluginRegistry()
    const pluginA = makeUIPlugin({
      name: 'plugin-a',
      slots: ['wn-toolbar'],
      priority: undefined,
    })
    registry.register(pluginA)

    // A second plugin with explicit priority 0 should conflict
    const pluginB = makeUIPlugin({
      name: 'plugin-b',
      slots: ['wn-toolbar'],
      priority: 0,
    })

    expect(() => registry.register(pluginB)).toThrow(/UI plugin conflict/)
  })
})

// ─── E. Name-Based Replacement (D-06) ──────────────────────────────────────────

describe('Name-Based Replacement', () => {
  it('replaces plugin when name matches', () => {
    const registry = new PluginRegistry()
    const first = makeContentPlugin({
      name: 'bold',
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    registry.register(first)

    const second = makeContentPlugin({
      name: 'bold',
      tokens: [{ type: 'bold', pattern: /__.+__/ }],
      version: '2.0.0',
    })
    registry.register(second)

    // Should only have one plugin named 'bold'
    const plugins = registry.allContentPlugins()
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe('bold')
    expect(plugins[0].version).toBe('2.0.0')
  })

  it('calls onDestroy on old plugin before replacement', () => {
    const registry = new PluginRegistry()
    const onDestroy = vi.fn()
    const first = makeContentPlugin({
      name: 'bold',
      onDestroy,
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    registry.register(first)

    const second = makeContentPlugin({
      name: 'bold',
      tokens: [{ type: 'bold', pattern: /__.+__/ }],
    })
    registry.register(second)

    expect(onDestroy).toHaveBeenCalledTimes(1)
    // onDestroy should be called BEFORE the new plugin's onInit
  })

  it('removes old plugin token types after replacement', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeContentPlugin({
        name: 'bold',
        tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
      }),
    )

    // Replace with a plugin that has different token types
    registry.register(
      makeContentPlugin({
        name: 'bold',
        tokens: [{ type: 'strong', pattern: /__.+__/ }],
      }),
    )

    // Old token type 'bold' should no longer be owned
    expect(registry.getContentPluginByType('bold')).toBeUndefined()
    // New token type 'strong' should be owned
    expect(registry.getContentPluginByType('strong')).toBeDefined()
  })
})

// ─── F. Lifecycle Hooks (PLUG-02 / D-03) ───────────────────────────────────────

describe('Lifecycle Hooks', () => {
  it('onInit is called during register after conflict checks pass', () => {
    const registry = new PluginRegistry()
    const onInit = vi.fn()
    const plugin = makeContentPlugin({ onInit })

    registry.register(plugin)
    expect(onInit).toHaveBeenCalledTimes(1)
  })

  it('onInit that throws propagates the error', () => {
    const registry = new PluginRegistry()
    const error = new Error('init failed')
    const plugin = makeContentPlugin({
      name: 'failing',
      tokens: [{ type: 'fail', pattern: /fail/ }],
      onInit: () => {
        throw error
      },
    })

    expect(() => registry.register(plugin)).toThrow('init failed')
  })

  it('onInit that throws does not leave plugin registered (rollback)', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({
      name: 'failing',
      tokens: [{ type: 'fail', pattern: /fail/ }],
      onInit: () => {
        throw new Error('init failed')
      },
    })

    expect(() => registry.register(plugin)).toThrow()

    // Plugin should NOT be registered
    expect(registry.getPlugin('failing')).toBeUndefined()
    // Token type should NOT be owned
    expect(registry.getContentPluginByType('fail')).toBeUndefined()
  })

  it('clear() does not call onDestroy on any plugin', () => {
    const registry = new PluginRegistry()
    const onDestroy = vi.fn()
    registry.register(
      makeContentPlugin({
        name: 'a',
        tokens: [{ type: 'type-a', pattern: /a/ }],
        onDestroy,
      }),
    )
    registry.register(
      makeContentPlugin({
        name: 'b',
        tokens: [{ type: 'type-b', pattern: /b/ }],
        onDestroy,
      }),
    )

    registry.clear()
    expect(onDestroy).not.toHaveBeenCalled()
  })
})

// ─── G. Accessors ─────────────────────────────────────────────────────────────

describe('Accessors', () => {
  it('getContentPluginByType returns the correct plugin', () => {
    const registry = new PluginRegistry()
    const bold = makeContentPlugin({
      name: 'bold',
      tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
    })
    registry.register(bold)

    const found = registry.getContentPluginByType('bold')
    expect(found).toBeDefined()
    expect(found!.name).toBe('bold')
  })

  it('getContentPluginByType returns undefined for unknown type', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeContentPlugin({
        name: 'bold',
        tokens: [{ type: 'bold', pattern: /\*\*(.+)\*\*/ }],
      }),
    )

    expect(registry.getContentPluginByType('nonexistent')).toBeUndefined()
  })

  it('getPlugin returns plugin by name across all categories', () => {
    const registry = new PluginRegistry()
    registry.register(makeContentPlugin({ name: 'content' }))
    registry.register(makeUIPlugin({ name: 'ui' }))
    registry.register(makeStoragePlugin({ name: 'storage' }))

    expect(registry.getPlugin('content')!.kind).toBe('content')
    expect(registry.getPlugin('ui')!.kind).toBe('ui')
    expect(registry.getPlugin('storage')!.kind).toBe('storage')
    expect(registry.getPlugin('unknown')).toBeUndefined()
  })

  it('getAllPlugins returns all plugins from all categories combined', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeContentPlugin({
        name: 'c1',
        tokens: [{ type: 'type-a', pattern: /a/ }],
      }),
    )
    registry.register(
      makeContentPlugin({
        name: 'c2',
        tokens: [{ type: 'type-b', pattern: /b/ }],
      }),
    )
    registry.register(makeUIPlugin({ name: 'u1' }))
    registry.register(makeStoragePlugin({ name: 's1' }))

    const all = registry.getAllPlugins()
    expect(all).toHaveLength(4)
    const names = all.map((p) => p.name)
    expect(names).toEqual(['c1', 'c2', 'u1', 's1'])
  })
})

// ─── H. Edge Cases ────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('registers a ContentPlugin with zero tokens', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ name: 'empty', tokens: [] })
    registry.register(plugin)

    expect(registry.getPlugin('empty')).toBeDefined()
    expect(registry.allTokenDefs()).toEqual([])
  })

  it('registers a plugin with no onInit without error', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ onInit: undefined })
    expect(() => registry.register(plugin)).not.toThrow()
    expect(registry.getPlugin('test-content')).toBeDefined()
  })

  it('registers a plugin with no onDestroy without error', () => {
    const registry = new PluginRegistry()
    const plugin = makeContentPlugin({ onDestroy: undefined })
    expect(() => registry.register(plugin)).not.toThrow()
    expect(registry.getPlugin('test-content')).toBeDefined()
  })

  it('registering a storage plugin succeeds without conflict detection', () => {
    const registry = new PluginRegistry()
    const s1 = makeStoragePlugin({ name: 'storage-a' })
    const s2 = makeStoragePlugin({ name: 'storage-b' })

    expect(() => registry.register(s1)).not.toThrow()
    expect(() => registry.register(s2)).not.toThrow()
    expect(registry.getAllPlugins()).toHaveLength(2)
  })

  it('allContentPlugins filters out UI and storage plugins', () => {
    const registry = new PluginRegistry()
    registry.register(makeContentPlugin({ name: 'c1' }))
    registry.register(makeUIPlugin({ name: 'u1' }))
    registry.register(makeStoragePlugin({ name: 's1' }))

    const content = registry.allContentPlugins()
    expect(content).toHaveLength(1)
    expect(content[0].name).toBe('c1')
  })

  it('allTokenDefs flatMaps tokens from all content plugins', () => {
    const registry = new PluginRegistry()
    registry.register(
      makeContentPlugin({
        name: 'p1',
        tokens: [{ type: 'a', pattern: /a/ }],
      }),
    )
    registry.register(
      makeContentPlugin({
        name: 'p2',
        tokens: [
          { type: 'b', pattern: /b/ },
          { type: 'c', pattern: /c/ },
        ],
      }),
    )

    const defs = registry.allTokenDefs()
    expect(defs).toHaveLength(3)
    expect(defs.map((d) => d.type)).toEqual(['a', 'b', 'c'])
  })
})

// ─── I. getUIPluginsForSlot (Plan 05-01 Task 2) ────────────────────────────────

describe('getUIPluginsForSlot', () => {
  it('returns plugins sorted by priority ascending', () => {
    const registry = new PluginRegistry()
    registry.register(makeUIPlugin({ name: 'high', slots: ['wn-toolbar'], priority: 100 }))
    registry.register(makeUIPlugin({ name: 'low', slots: ['wn-toolbar'], priority: 0 }))
    registry.register(makeUIPlugin({ name: 'mid', slots: ['wn-toolbar'], priority: 50 }))

    const result = registry.getUIPluginsForSlot('wn-toolbar')
    expect(result).toHaveLength(3)
    expect(result[0].name).toBe('low')    // priority 0
    expect(result[1].name).toBe('mid')    // priority 50
    expect(result[2].name).toBe('high')   // priority 100
  })

  it('returns only plugins for the requested slot', () => {
    const registry = new PluginRegistry()
    registry.register(makeUIPlugin({ name: 'toolbar-a', slots: ['wn-toolbar'], priority: 0 }))
    registry.register(makeUIPlugin({ name: 'sidebar', slots: ['wn-sidebar'], priority: 0 }))

    const result = registry.getUIPluginsForSlot('wn-toolbar')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('toolbar-a')
  })

  it('returns empty array for slot with no plugins', () => {
    const registry = new PluginRegistry()
    registry.register(makeUIPlugin({ name: 'a', slots: ['wn-toolbar'], priority: 0 }))

    expect(registry.getUIPluginsForSlot('nonexistent')).toEqual([])
  })

  it('returns empty array when no UI plugins registered', () => {
    const registry = new PluginRegistry()
    expect(registry.getUIPluginsForSlot('wn-toolbar')).toEqual([])
  })

  it('default priority 0 sorts before explicit non-zero priorities', () => {
    const registry = new PluginRegistry()
    registry.register(makeUIPlugin({ name: 'explicit', slots: ['wn-toolbar'], priority: 5 }))
    registry.register(makeUIPlugin({ name: 'default', slots: ['wn-toolbar'], priority: undefined }))

    const result = registry.getUIPluginsForSlot('wn-toolbar')
    expect(result[0].name).toBe('default')  // priority undefined → 0
    expect(result[1].name).toBe('explicit') // priority 5
  })
})
