// ─── Core ─────────────────────────────────────────────────────────────────────
export { createEditor, EditorBuilder } from './editor'

// ─── Tokenizer ─────────────────────────────────────────────────────────────────
export { tokenizeLine, scanInline, tokenizeDocument } from './tokenizer'

// ─── Static HTML Renderer ──────────────────────────────────────────────────────
export {
  renderLineToHTML,
  renderInlineHTML,
  renderDocumentToHTML,
} from './renderer'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Token,
  TokenDef,
  PluginManifest,
  ContentPlugin,
  UIPlugin,
  StoragePlugin,
  StorageAdapter,
  EditorContext,
  StaticRenderContext,
  EditorOptions,
  EditorInstance,
} from './types'

// ─── Storage adapters ─────────────────────────────────────────────────────────
export { LocalStorageAdapter } from './storage/localStorage'
export { IndexedDBAdapter } from './storage/indexedDB'

// ─── Undo/Redo ────────────────────────────────────────────────────────────────
export { EditorHistory } from './editor-history'
export type { EditorHistoryOptions } from './editor-history'

// ─── Import / Export ─────────────────────────────────────────────────────────
export { exportWorld, importWorld } from './export-import'
export type { ConflictStrategy, ImportResult } from './export-import'
export { createImportExportPlugin } from './plugins/importExport'
export type { ImportExportPluginOptions } from './plugins/importExport'

// ─── Built-in plugins ─────────────────────────────────────────────────────────
export { defaultPlugins } from './plugins/defaults'
export { wikiLinkPlugin } from './plugins/wikiLink'
export { headingsPlugin } from './plugins/headings'
export {
  boldPlugin,
  italicPlugin,
  inlineCodePlugin,
  blockquotePlugin,
  hrPlugin,
} from './plugins/inline'
export { strikethroughPlugin } from './plugins/strikethrough'
export { linkPlugin } from './plugins/link'
export { remoteCursorsPlugin } from './plugins/remoteCursors'

// ─── CRDT / Sync ──────────────────────────────────────────────────────────────
export { createYDocState } from './y-doc-state'
export type { YDocState } from './y-doc-state'
export { saveYDoc, loadYDoc } from './yjs-storage-bridge'
