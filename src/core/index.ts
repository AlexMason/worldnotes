// ─── Core ─────────────────────────────────────────────────────────────────────
export { createEditor, EditorBuilder } from './editor'

// ─── Tokenizer ────────────────────────────────────────────────────────────────
export { tokenizeLine, scanInline, tokenizeDocument } from './tokenizer'

// ─── Static HTML Renderer (reader engine — DOM-free) ─────────────────────────
export {
  renderLineToHTML,
  renderInlineHTML,
  renderDocumentToHTML,
  renderDocumentHtml,
} from './static-renderer'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Token,
  TokenDef,
  PluginManifest,
  ContentPlugin,
  UIPlugin,
  PageStore,
  EditorContext,
  StaticRenderContext,
  EditorOptions,
  EditorInstance,
  ToastType,
  ToastPosition,
  ToastAction,
  ToastOptions,
} from './types'

// ─── Content model ────────────────────────────────────────────────────────────
export { createPageBuffers } from './page-buffers'
export type { PageBuffers, PageBuffersOptions } from './page-buffers'
export { createMemoryPageStore } from './memory-page-store'
export type { MemoryPageStore } from './memory-page-store'

// ─── Undo/Redo ────────────────────────────────────────────────────────────────
export { EditorHistory } from './editor-history'
export type { EditorHistoryOptions } from './editor-history'

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

// ─── Notifications ────────────────────────────────────────────────────────────
export { createNotificationSystem } from './notifications'
