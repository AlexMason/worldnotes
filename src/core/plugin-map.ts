import type { ContentPlugin } from './types'

/**
 * Build a Map from token type name → ContentPlugin for O(1) lookup during
 * rendering. Each TokenDef type is mapped to its owning plugin.
 *
 * @param plugins - Registered ContentPlugin instances
 * @returns       - Map<tokenType, ContentPlugin>
 */
export function buildPluginMap(plugins: ContentPlugin[]): Map<string, ContentPlugin> {
  const map = new Map<string, ContentPlugin>()
  for (const plugin of plugins) {
    for (const def of plugin.tokens) {
      map.set(def.type, plugin)
    }
  }
  return map
}
