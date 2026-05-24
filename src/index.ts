// ─── Core ─────────────────────────────────────────────────────────────────────
export { createEditor, EditorBuilder } from './editor'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Token,
  TokenDef,
  Plugin,
  StorageAdapter,
  EditorContext,
  EditorOptions,
  EditorInstance,
} from './types'

// ─── Storage adapters ─────────────────────────────────────────────────────────
export { LocalStorageAdapter } from './storage/localStorage'
export { IndexedDBAdapter }    from './storage/indexedDB'

// ─── Built-in plugins ─────────────────────────────────────────────────────────
export { defaultPlugins }    from './plugins/defaults'
export { wikiLinkPlugin }    from './plugins/wikiLink'
export { headingsPlugin }    from './plugins/headings'
export {
  boldPlugin,
  italicPlugin,
  inlineCodePlugin,
  blockquotePlugin,
  hrPlugin,
} from './plugins/inline'
