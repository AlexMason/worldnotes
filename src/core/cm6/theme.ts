// ─── CM6 theme — overrides on top of the shared reader/editor CSS ────────────
// SPIKE (GH-4 / issue #5). The live-preview layer deliberately emits the SAME
// class vocabulary as the reader (`wn-h1`, `wn-bold`, `wn-wiki-link`, …), so
// EDITOR_TOKENS_CSS + EDITOR_CONTENT_CSS style it unchanged. What does NOT
// carry over is every rule that assumes the old tree SHAPE — a wrapper element
// per block region, flex table rows, line-level `display:flex` list items —
// because a CM6 document is a flat list of `.cm-line` siblings. Those are the
// overrides below; each one is a known-issues entry (findings doc §Theming).

export const CM6_CSS = `
/* Layout (column width, padding, scroll) comes from the shared .wn-editor-wrap / .wn-editor-col chrome. */
.wn-cm-host { min-height: 100%; }
.wn-cm-host .cm-editor { background: transparent; color: var(--wn-color-fg, #23211d); font-size: var(--wn-font-size-body, 16px); line-height: var(--wn-line-height, 1.65); }
.wn-cm-host .cm-editor.cm-focused { outline: none; }
.wn-cm-host .cm-scroller { font-family: var(--wn-font-family, serif); line-height: inherit; }
.wn-cm-host .cm-content { padding: 0; caret-color: var(--wn-caret-color, #1a5fb4); }
.wn-cm-host .cm-line { padding: 0; }
.wn-cm-host .cm-cursor { border-left-color: var(--wn-caret-color, #1a5fb4); }
.wn-cm-host .cm-selectionBackground { background: color-mix(in srgb, var(--wn-color-accent, #1a5fb4) 22%, transparent) !important; }

/* Region wrappers are per-line here: first/last classes rebuild the box. */
.wn-cm-host .cm-line.wn-code-block { margin: 0; padding: 0 .9em; border-radius: 0; }
.wn-cm-host .cm-line.wn-code-block.wn-region-first { margin-top: .5em; padding-top: .6em; border-radius: var(--wn-radius-code, 4px) var(--wn-radius-code, 4px) 0 0; }
.wn-cm-host .cm-line.wn-code-block.wn-region-last { margin-bottom: .5em; padding-bottom: .6em; border-radius: 0 0 var(--wn-radius-code, 4px) var(--wn-radius-code, 4px); }
.wn-cm-host .cm-line.wn-table { margin: 0; }
.wn-cm-host .cm-line.wn-table-row { display: block; }
.wn-cm-host .cm-line.wn-table-row .wn-punct { display: inline; }
/* Separator collapses unless the caret is anywhere in the table. */
.wn-cm-host .cm-line.wn-table-sep.wn-line-active { font-size: var(--wn-font-size-small, 14px); line-height: 1.5; border-bottom: none; color: var(--wn-color-punct, #a39b8d); }
`
