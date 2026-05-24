import type { Plugin, StorageAdapter, EditorOptions, EditorInstance } from './types'
import { LocalStorageAdapter } from './storage/localStorage'
import { defaultPlugins } from './plugins/defaults'
import { createEditorState } from './editor-state'
import { createEditorDOM } from './editor-dom'
import { createEditorRender } from './editor-render'
import type { EditorRenderOptions } from './editor-render'
import { createEditorNavigation } from './editor-navigation'
import { createEditorLifecycle } from './editor-lifecycle'

// ─── Default content shown on first load when 'home' doesn't exist ───────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_HOME = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`

// ─── EditorBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder returned by createEditor().
 * Chain .use(), .withStorage(), then call .mount() to get a live EditorInstance.
 */
export class EditorBuilder {
  private readonly el: HTMLElement
  private plugins: Plugin[] = [...defaultPlugins]
  private storage: StorageAdapter = new LocalStorageAdapter()
  private options: EditorOptions = {}

  constructor(el: HTMLElement, options: EditorOptions = {}) {
    this.el = el
    this.options = options
    if (options.storage) this.storage = options.storage
  }

  /**
   * Register a plugin (or replace a built-in by matching name).
   * Plugins are applied in registration order during tokenization.
   *
   * @param plugin - Plugin instance to register
   */
  use(plugin: Plugin): this {
    // Replace existing plugin with same name, or append
    const idx = this.plugins.findIndex((p) => p.name === plugin.name)
    if (idx !== -1) {
      this.plugins[idx] = plugin
    } else {
      this.plugins.push(plugin)
    }
    return this
  }

  /**
   * Remove all default plugins and start with an empty plugin set.
   * Useful when you want full control over which tokens are supported.
   */
  clearPlugins(): this {
    this.plugins = []
    return this
  }

  /**
   * Replace the storage adapter.
   *
   * @param adapter - Any object implementing StorageAdapter
   */
  withStorage(adapter: StorageAdapter): this {
    this.storage = adapter
    return this
  }

  /**
   * Mount the editor into the provided element and return a live EditorInstance.
   * Injects required styles, sets up event listeners, and loads the initial page.
   */
  mount(): EditorInstance {
    return mountEditor(this.el, this.plugins, this.storage, this.options)
  }
}

// ─── createEditor ─────────────────────────────────────────────────────────────

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
export function createEditor(el: HTMLElement, options: EditorOptions = {}): EditorBuilder {
  return new EditorBuilder(el, options)
}

function mountEditor(
  container: HTMLElement,
  plugins: Plugin[],
  storage: StorageAdapter,
  options: EditorOptions,
): EditorInstance {
  const state = createEditorState(storage, options)
  const dom = createEditorDOM(container)
  const navigation = createEditorNavigation(state, storage, dom, options)
  const renderOpts: EditorRenderOptions = {
    navigateFn: (page: string) => { navigation.navigateToPage(page) },
    onBreadcrumbNavigate: (page: string) => { navigation.loadPage(page) },
    onTrailChange: options.onTrailChange,
  }
  const render = createEditorRender(dom, plugins, state, renderOpts)
  navigation.setRenderAPI(render)
  return createEditorLifecycle(dom, plugins, state, render, navigation, storage, options).mount()
}
