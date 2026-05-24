import type {
  ContentPlugin,
  UIPlugin,
  PluginManifest,
  StorageAdapter,
  EditorOptions,
  EditorInstance,
} from './types'
import { LocalStorageAdapter } from './storage/localStorage'
import { defaultPlugins } from './plugins/defaults'
import { PluginRegistry } from './plugin-registry'
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
  private registry = new PluginRegistry()
  private storage: StorageAdapter = new LocalStorageAdapter()
  private options: EditorOptions = {}
  private _mounted = false
  private _slotElements: Record<string, HTMLElement> | null = null

  constructor(el: HTMLElement, options: EditorOptions = {}) {
    this.el = el
    this.options = options
    if (options.storage) this.storage = options.storage
    // Register default plugins via registry (D-09: order preserved, conflict-free)
    for (const plugin of defaultPlugins) {
      this.registry.register(plugin)
    }
  }

  /**
   * Register a plugin manifest (or replace a built-in by matching name).
   * Validates semver, detects conflicts, and fires lifecycle hooks.
   *
   * @param manifest - PluginManifest to register
   * @throws Error if version is invalid or a token/slot conflict is detected
   */
  use(manifest: PluginManifest): this {
    this.registry.register(manifest)

    // Post-mount: call onMount for UI plugins immediately (D-08)
    if (this._mounted && manifest.kind === 'ui' && this._slotElements) {
      for (const slot of manifest.slots) {
        const el = this._slotElements[slot]
        if (el) {
          manifest.onMount(el)
        }
      }
    }

    return this
  }

  /**
   * Remove all registered plugins and start fresh.
   * Note: does NOT call onDestroy on removed plugins.
   * Call mount() afterward to re-initialize the editor.
   */
  clearPlugins(): this {
    this.registry.clear()
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
    const uiPlugins = this.registry
      .allUIPlugins()
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

    const instance = mountEditor(
      this.el,
      this.registry.allContentPlugins(),
      uiPlugins,
      this.storage,
      this.options,
    )

    // Store slot element references for post-mount plugin registration
    this._mounted = true
    this._slotElements = {
      'wn-toolbar': this.el.querySelector('.wn-toolbar') as HTMLElement,
    }

    return instance
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
  contentPlugins: ContentPlugin[],
  allUIPlugins: UIPlugin[],
  storage: StorageAdapter,
  options: EditorOptions,
): EditorInstance {
  const state = createEditorState(storage, options)
  const dom = createEditorDOM(container, options.theme)
  const navigation = createEditorNavigation(state, storage, dom, options)
  const renderOpts: EditorRenderOptions = {
    navigateFn: (page: string) => {
      navigation.navigateToPage(page)
    },
    onBreadcrumbNavigate: (page: string) => {
      navigation.loadPage(page)
    },
    onTrailChange: options.onTrailChange,
  }
  const render = createEditorRender(dom, contentPlugins, state, renderOpts)
  navigation.setRenderAPI(render)

  const lifecycle = createEditorLifecycle(
    dom,
    contentPlugins,
    allUIPlugins,
    state,
    render,
    navigation,
    storage,
    options,
  )
  return lifecycle.mount()
}
