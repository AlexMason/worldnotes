// ─── Server-side access to the shared viewer renderer ────────────────────────
// The implementation lives in `src/shared/viewer-renderer.ts` (env-agnostic,
// bundleable into the client) so any surface that needs reader-identical HTML
// shares one engine. This module remains the server-side import point.
// NOTE: deliberately separate from the editor's edit-preview renderToHTML.

export { createViewerRenderer } from '../../shared/viewer-renderer'
