import type {
  ContentPlugin,
  UIPlugin,
  PluginManifest,
  PageStore,
  EditorOptions,
  EditorInstance,
} from './types'
import { createMemoryPageStore } from './memory-page-store'
import { createPageBuffers } from './page-buffers'
import { defaultPlugins, defaultUiPlugins } from './plugins/defaults'
import { PluginRegistry } from './plugin-registry'
import { createEditorState } from './editor-state'
import { createEditorDOM } from './editor-dom'
import { createEditorRender } from './editor-render'
import type { EditorRenderOptions } from './editor-render'
import { createEditorNavigation } from './editor-navigation'
import { createEditorLifecycle } from './editor-lifecycle'
import { createNotificationSystem, type NotificationSystem } from './notifications'

// ─── EditorBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder returned by createEditor().
 * Chain .use(), .withStorage(), then call .mount() to get a live EditorInstance.
 */
export class EditorBuilder {
  private readonly el: HTMLElement
  private registry = new PluginRegistry()
  private pageStore: PageStore | null = null
  private options: EditorOptions = {}
  private _mounted = false
  private _slotElements: Record<string, HTMLElement> | null = null

  constructor(el: HTMLElement, options: EditorOptions = {}) {
    this.el = el
    this.options = options
    if (options.pageStore) this.pageStore = options.pageStore
    // Register default plugins via registry (D-09: order preserved, conflict-free)
    for (const plugin of defaultPlugins) {
      this.registry.register(plugin)
    }
    // Built-in UI plugins (shortcuts help overlay)
    for (const uiPlugin of defaultUiPlugins()) {
      this.registry.register(uiPlugin)
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
   * Replace the page store backend.
   *
   * @param store - Any object implementing PageStore
   */
  withPageStore(store: PageStore): this {
    this.pageStore = store
    return this
  }

  /**
   * Mount the editor into the provided element and return a live EditorInstance.
   * Injects required styles, sets up event listeners, and loads the initial page.
   */
  async mount(): Promise<EditorInstance> {
    const uiPlugins = this.registry
      .allUIPlugins()
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

    const instance = await mountEditor(
      this.el,
      this.registry.allContentPlugins(),
      uiPlugins,
      this.pageStore ?? createMemoryPageStore(),
      this.options,
    )

    // Store slot element references for post-mount plugin registration
    this._mounted = true
    this._slotElements = {
      'wn-header': this.el.querySelector('.wn-header') as HTMLElement,
      'wn-toolbar': this.el.querySelector('.wn-toolbar') as HTMLElement,
      'wn-overlay': this.el.querySelector('.wn-overlay') as HTMLElement,
      'wn-left-sidepanel': this.el.querySelector('.wn-left-sidepanel') as HTMLElement,
      'wn-right-sidepanel': this.el.querySelector('.wn-right-sidepanel') as HTMLElement,
      'wn-footer': this.el.querySelector('.wn-footer') as HTMLElement,
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
 *   .withPageStore(myStore)
 *   .mount()
 */
export function createEditor(el: HTMLElement, options: EditorOptions = {}): EditorBuilder {
  return new EditorBuilder(el, options)
}

async function mountEditor(
  container: HTMLElement,
  contentPlugins: ContentPlugin[],
  allUIPlugins: UIPlugin[],
  pageStore: PageStore,
  options: EditorOptions,
): Promise<EditorInstance> {
  const buffers = createPageBuffers({ historyDepth: options.historyDepth })
  const state = createEditorState(options, buffers)
  const dom = createEditorDOM(container, options.theme)
  const notifications: NotificationSystem = createNotificationSystem(dom.container)
  const navigation = createEditorNavigation(state, pageStore, dom, options)
  const renderOpts: EditorRenderOptions = {
    navigateFn: (page: string) => {
      navigation.navigateToPage(page)
    },
    onBreadcrumbNavigate: (page: string) => {
      navigation.loadPage(page)
    },
    onTrailChange: options.onTrailChange,
    statusPages: options.statusPages,
    showCreateOverlay: options.showCreateOverlay,
    homeLabel: options.homeLabel,
    notifications,
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
    pageStore,
    options,
    notifications,
  )
  return lifecycle.mount()
}
