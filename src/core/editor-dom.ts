// ─── Design tokens ───────────────────────────────────────────────────────────
//
// The editor palette mirrors the viewer (src/server/render/layout.ts) so the
// edit surface and the reading surface share one look: warm paper background,
// ink foreground, serif body text, blue accent — with an automatic dark palette
// via `prefers-color-scheme`. Tokens are declared once on `:root`
// (src/core/styles.ts: palette primitives → semantic tokens); the chrome
// below only CONSUMES them, each `var()` with a literal fallback.

// ─── Default styles ───────────────────────────────────────────────────────────

import { EDITOR_TOKENS_CSS, EDITOR_CONTENT_CSS, SITE_BANDS_CSS } from './styles'

// Editor chrome: root layout, header, toolbar, panels, breadcrumbs, editor
// column, overlay, toasts, keyframes, mobile rules. Reader pages must NOT
// embed this group (`.wn-root` here is `display:flex; height:100%;
// overflow:hidden` — it would clip long reader pages). Content + token rules
// live in `styles.ts` and are shared with the reader.
const EDITOR_CHROME_CSS = `
* { box-sizing: border-box; }

.wn-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wn-color-bg, #fbfaf7);
  color: var(--wn-color-fg, #23211d);
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  overflow: hidden;
}

/* Header bar — mirrors the viewer header.wn-view-bar */
.wn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--wn-gap-header, 1rem);
  padding: var(--wn-padding-header, .6rem 1.2rem);
  background: var(--wn-color-header-bg, transparent);
  border-bottom: 1px solid var(--wn-color-header-border, var(--wn-color-border, #e3ded4));
  font: var(--wn-font-size-small, 14px)/1.4 var(--wn-font-ui, system-ui, sans-serif);
  flex-shrink: 0;
}

.wn-toolbar {
  position: relative; /* anchors the link field's suggestion list */
  display: flex;
  align-items: center;
  gap: var(--wn-gap-toolbar, 6px);
  flex-shrink: 0;
  padding: var(--wn-padding-toolbar, .4rem 1.2rem);
  background: var(--wn-color-toolbar-bg, transparent);
  border-bottom: 1px solid var(--wn-color-toolbar-border, var(--wn-color-border, #e3ded4));
}
.wn-toolbar:empty { display: none; }
.wn-toolbar-group { display: flex; align-items: center; gap: var(--wn-gap-toolbar, 6px); }
.wn-toolbar-btn {
  min-width: 2rem;
  height: 2rem;
  padding: 0 .55rem;
  font: inherit;
  line-height: 1;
  color: var(--wn-color-fg-muted, #6f6a61);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--wn-radius-control, 6px);
  cursor: pointer;
}
.wn-toolbar-btn:hover:not(:disabled) {
  color: var(--wn-color-fg, #23211d);
  background: var(--wn-color-toolbar-button-hover-bg, var(--wn-color-code-bg, #f0ede6));
}
.wn-toolbar-btn[aria-pressed='true'] {
  color: var(--wn-color-accent, #1a5fb4);
  background: var(--wn-color-toolbar-button-active-bg, var(--wn-color-code-bg, #f0ede6));
  border-color: var(--wn-color-toolbar-border, var(--wn-color-border, #e3ded4));
}
.wn-toolbar-btn:disabled { opacity: .4; cursor: default; }
.wn-toolbar-btn:focus-visible { outline: 2px solid var(--wn-color-focus-ring, #1a5fb4); outline-offset: 1px; }
.wn-toolbar-btn--bold { font-weight: 700; }
.wn-toolbar-btn--italic { font-style: italic; }
.wn-toolbar-btn--underline { text-decoration: underline; }
.wn-toolbar-group[hidden] { display: none; }

/* Inline link field (replaces the toolbar buttons while open) */
.wn-link-field { display: flex; align-items: center; gap: .5rem; flex: 1 1 auto; min-width: 0; }
.wn-link-field-input {
  flex: 1 1 20ch; min-width: 8ch; max-width: 48ch;
  font: inherit;
  color: var(--wn-color-input-fg, var(--wn-color-fg, #23211d));
  background: var(--wn-color-input-bg, var(--wn-color-bg, #fff));
  border: 1px solid var(--wn-color-input-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-control, 6px);
  padding: var(--wn-padding-input, .35em .6em);
}
.wn-link-field-input[aria-invalid="true"] { border-color: var(--wn-move-error-color, #b3261e); }
.wn-link-field-msg {
  flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--wn-color-fg-muted, #6f6a61);
}
.wn-link-field-msg--error { color: var(--wn-move-error-color, #b3261e); }
.wn-link-field-btn {
  min-width: 2rem;
  height: 2rem;
  padding: 0 .7rem;
  font: inherit;
  line-height: 1;
  color: var(--wn-color-fg-muted, #6f6a61);
  background: transparent;
  border: 1px solid var(--wn-color-toolbar-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-control, 6px);
  cursor: pointer;
}
.wn-link-field-submit { color: var(--wn-color-accent, #1a5fb4); }
.wn-link-field-btn:hover { background: var(--wn-color-toolbar-button-hover-bg, var(--wn-color-code-bg, #f0ede6)); }
.wn-link-field-btn:focus-visible { outline: 2px solid var(--wn-color-focus-ring, #1a5fb4); outline-offset: 1px; }
.wn-link-field-list {
  position: absolute; top: 100%; left: 1.2rem; z-index: 30;
  width: min(32rem, calc(100% - 2.4rem)); max-height: 50vh; overflow-y: auto;
  margin: 0; padding: .25rem; list-style: none;
  background: var(--wn-color-dropdown-bg, var(--wn-color-bg, #fbfaf7));
  border: 1px solid var(--wn-color-dropdown-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-dropdown, 6px);
  box-shadow: var(--wn-shadow-menu, 0 6px 16px rgb(0 0 0 / 15%));
}
.wn-link-field-option {
  display: flex; justify-content: space-between; gap: 1rem;
  padding: .4rem .6rem; border-radius: var(--wn-radius-crumb, 4px); cursor: pointer;
}
.wn-link-field-option:hover,
.wn-link-field-option[aria-selected='true'] {
  background: var(--wn-color-toolbar-button-hover-bg, var(--wn-color-code-bg, #f0ede6));
}
.wn-link-field-option-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wn-link-field-option-slug { color: var(--wn-color-fg-muted, #6f6a61); white-space: nowrap; }

.wn-body { display: flex; flex: 1; min-height: 0; }

.wn-footer { flex-shrink: 0; }

.wn-left-sidepanel {
  display: none;
  width: var(--wn-sidepanel-width, 240px);
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--wn-color-sidepanel-bg, transparent);
  border-right: 1px solid var(--wn-color-sidepanel-border, var(--wn-color-border, #e3ded4));
}
.wn-left-sidepanel:not(:empty) { display: block; }

.wn-right-sidepanel {
  display: none;
  width: var(--wn-sidepanel-width, 240px);
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--wn-color-sidepanel-bg, transparent);
  border-left: 1px solid var(--wn-color-sidepanel-border, var(--wn-color-border, #e3ded4));
}
.wn-right-sidepanel:not(:empty) { display: block; }

/* Breadcrumb — mirrors the viewer nav.wn-crumbs */
.wn-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--wn-gap-breadcrumb, 0);
  font-size: var(--wn-font-size-small, 14px);
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  position: relative; /* anchor for the crumb-more dropdown */
}

.wn-crumb {
  color: var(--wn-color-crumb, var(--wn-color-fg-muted, #6f6a61));
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: var(--wn-crumb-max-width, 18ch); /* per-crumb width backstop (viewer parity) */
  padding: 3px 6px;
  border-radius: var(--wn-radius-crumb, 4px);
  transition: var(--wn-transition-color, color 0.15s);
}
.wn-crumb:hover { color: var(--wn-color-crumb-hover, var(--wn-color-accent, #1a5fb4)); }
.wn-crumb--active { color: var(--wn-color-crumb-current, var(--wn-color-fg, #23211d)); cursor: default; }
/* The current page's crumb opens the inline move field when moves are supported. */
.wn-crumb--active.wn-crumb--editable { cursor: text; }
.wn-crumb--active.wn-crumb--editable:hover { text-decoration: underline dotted; text-underline-offset: 3px; }

/* Inline page-move field (replaces the breadcrumb while editing the address) */
.wn-move { display: flex; align-items: center; gap: .35rem; flex: 1 1 auto; min-width: 0; }
.wn-move-prefix { color: var(--wn-color-crumb, var(--wn-color-fg-muted, #6f6a61)); flex: 0 0 auto; }
.wn-move-input {
  flex: 1 1 16ch; min-width: 8ch; max-width: 48ch;
  font: inherit;
  color: var(--wn-color-input-fg, var(--wn-color-fg, #23211d));
  background: var(--wn-move-input-bg, var(--wn-color-input-bg, var(--wn-color-bg, #fff)));
  border: 1px solid var(--wn-move-input-border, var(--wn-color-input-border, var(--wn-color-border, #e3ded4)));
  border-radius: var(--wn-radius-control, 6px);
  padding: var(--wn-padding-input, .35em .6em);
}
.wn-move-input[aria-invalid="true"] { border-color: var(--wn-move-error-color, #b3261e); }
.wn-move-msg {
  flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--wn-color-fg-muted, #6f6a61);
  font-size: var(--wn-font-size-small, 14px);
}
.wn-move-msg--error { color: var(--wn-move-error-color, #b3261e); }

.wn-crumb-sep {
  color: var(--wn-color-crumb, var(--wn-color-fg-muted, #6f6a61));
  font-size: 13px;
  padding: 0 1px;
  user-select: none;
  flex: 0 0 auto;
}

/* Deep-trail middle collapse — mirrors the viewer .wn-crumb-more */
.wn-crumb-more { position: relative; display: inline-flex; flex: 0 0 auto; }
.wn-crumb-more > summary {
  list-style: none;
  cursor: pointer;
  color: var(--wn-color-crumb, var(--wn-color-fg-muted, #6f6a61));
  padding: 0 .2em; line-height: 1;
}
.wn-crumb-more > summary::-webkit-details-marker { display: none; }
.wn-crumb-more[open] > summary { color: var(--wn-color-crumb-hover, var(--wn-color-accent, #1a5fb4)); }
.wn-crumb-drop {
  position: absolute; top: calc(100% + .35rem); left: 0; z-index: 40;
  display: flex; flex-direction: column; gap: .2rem; min-width: 10rem;
  background: var(--wn-color-dropdown-bg, var(--wn-color-bg, #fbfaf7));
  border: 1px solid var(--wn-color-dropdown-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-dropdown, 6px);
  padding: var(--wn-padding-dropdown, .4rem .7rem);
  box-shadow: var(--wn-shadow-dropdown, 0 4px 12px rgb(0 0 0 / 12%));
}
.wn-crumb-drop .wn-crumb { cursor: pointer; white-space: nowrap; max-width: none; }

/* Header actions — mirrors the viewer .wn-view-actions. The hamburger
   (<details> wrapping ONLY its summary) shows under the shared 640px
   breakpoint; :has() hides the SIBLING actions until it opens — the UA
   never hides the actions div, so non-:has() browsers keep them visible. */
.wn-nav {
  display: flex;
  align-items: center;
  gap: var(--wn-gap-nav, .8rem);
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
  position: relative;
}
.wn-nav .wn-menu { display: none; }
.wn-nav .wn-menu summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: .4em .5em;
  border: 1px solid var(--wn-color-menu-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-control, 6px);
  color: var(--wn-color-fg, #23211d);
}
.wn-nav .wn-menu summary::-webkit-details-marker { display: none; }
.wn-nav .wn-menu[open] summary { color: var(--wn-color-accent, #1a5fb4); }
.wn-nav-link {
  display: block;
  max-width: var(--wn-nav-link-max-width, 16ch);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wn-actions {
  display: flex;
  gap: var(--wn-gap-nav, .8rem);
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}
.wn-actions a { color: var(--wn-color-nav-link, var(--wn-color-fg-muted, #6f6a61)); text-decoration: none; }
.wn-actions a:hover { color: var(--wn-color-nav-link-hover, var(--wn-color-accent, #1a5fb4)); }
.wn-actions span { color: var(--wn-color-nav-link, var(--wn-color-fg-muted, #6f6a61)); }

/* Editor area — mirrors the viewer main (centered --wn-measure column) */
.wn-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: var(--wn-padding-editor-y, 2rem) var(--wn-padding-editor-x, 1.2rem) var(--wn-padding-page-bottom, 5rem);
  position: relative;
}

.wn-editor-col {
  max-width: var(--wn-measure, 46rem);
  margin: 0 auto;
  position: relative;
}

.wn-editor {
  outline: none;
  min-height: 100%;
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  color: var(--wn-color-fg, #23211d);
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: var(--wn-caret-color, #1a5fb4);
}

.wn-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  font: var(--wn-font-size-body, 16px)/var(--wn-line-height, 1.65) var(--wn-font-family, serif);
  color: var(--wn-color-placeholder, var(--wn-color-fg-muted, #6f6a61));
  pointer-events: none;
  user-select: none;
}

/* Remote cursor overlay */
.wn-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}
/* Shortcuts help overlay (editor chrome — never shipped to the reader).
   Fixed + centered so it escapes the zero-size overlay slot's geometry;
   re-enables pointer events the slot parent disables. */
.wn-shortcuts {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 25;
  pointer-events: auto;
  max-width: var(--wn-shortcuts-max-width, min(560px, 92vw));
  max-height: 80vh;
  overflow-y: auto;
  background: var(--wn-color-shortcuts-bg, var(--wn-color-surface, #fbfaf7));
  color: var(--wn-color-shortcuts-fg, var(--wn-color-fg, #23211d));
  border: 1px solid var(--wn-color-shortcuts-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-overlay, var(--wn-toast-radius, 6px));
  box-shadow: var(--wn-shadow-overlay, var(--wn-toast-shadow, 0 4px 12px rgb(0 0 0 / 12%)));
  padding: var(--wn-shortcuts-padding, 1.2rem 1.4rem);
  font: var(--wn-font-size-small, 14px)/1.5 var(--wn-font-family, serif);
}
.wn-shortcuts-title {
  font-size: var(--wn-font-size-h3, 1.1rem);
  font-weight: var(--wn-font-weight-heading, 700);
  margin-bottom: 0.8rem;
}
.wn-shortcuts-group { margin-bottom: 0.9rem; }
.wn-shortcuts-group-name {
  color: var(--wn-color-shortcuts-group, var(--wn-color-fg-muted, #6f6a61));
  font-size: var(--wn-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.3rem;
}
.wn-shortcuts-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 2px 0;
}
.wn-shortcuts-keys {
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-keys, 12px);
  white-space: nowrap;
  background: var(--wn-color-shortcuts-keys-bg, var(--wn-color-code-bg, #f0ede6));
  color: var(--wn-color-shortcuts-keys-fg, var(--wn-color-code, #23211d));
  border: 1px solid var(--wn-color-shortcuts-border, var(--wn-color-border, #e3ded4));
  border-radius: var(--wn-radius-code, 4px);
  padding: 1px 6px;
}
.wn-shortcuts-action { color: var(--wn-color-shortcuts-fg, var(--wn-color-fg, #23211d)); }
.wn-remote-cursor { position: absolute; pointer-events: none; white-space: nowrap; }
.wn-remote-cursor-caret {
  width: 2px;
  height: 1.2em;
  display: inline-block;
  vertical-align: text-bottom;
  margin-right: 2px;
}
.wn-remote-cursor-label {
  font-size: 10px;
  color: var(--wn-color-cursor-label-fg, #fff);
  padding: 1px 4px;
  border-radius: 3px;
  position: absolute;
  top: -14px;
  left: 0;
  white-space: nowrap;
}

/* Toast notifications */
.wn-toast-container {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: var(--wn-toast-gap, 8px);
  max-width: var(--wn-toast-max-width, 380px);
}
.wn-toast-container--top-right    { top: var(--wn-toast-offset, 12px); right: var(--wn-toast-offset, 12px); align-items: flex-end; }
.wn-toast-container--top-left     { top: var(--wn-toast-offset, 12px); left: var(--wn-toast-offset, 12px); align-items: flex-start; }
.wn-toast-container--bottom-right { bottom: var(--wn-toast-offset, 12px); right: var(--wn-toast-offset, 12px); align-items: flex-end; }
.wn-toast-container--bottom-left  { bottom: var(--wn-toast-offset, 12px); left: var(--wn-toast-offset, 12px); align-items: flex-start; }

.wn-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: var(--wn-toast-padding, 8px 12px);
  border: 1px solid var(--wn-toast-border, #e3ded4);
  border-radius: var(--wn-toast-radius, 6px);
  font: var(--wn-font-size-small, 14px)/1.4 var(--wn-font-ui, system-ui, sans-serif);
  color: var(--wn-toast-color, #23211d);
  background: var(--wn-toast-bg, #fbfaf7);
  min-width: var(--wn-toast-min-width, 260px);
  box-shadow: var(--wn-toast-shadow, 0 4px 12px rgb(0 0 0 / 12%));
  animation: wn-toast-enter 0.2s ease-out;
}
.wn-toast--success { background: var(--wn-toast-bg-success, #eef6ee); }
.wn-toast--warning { background: var(--wn-toast-bg-warning, #f7f2e4); }
.wn-toast--error   { background: var(--wn-toast-bg-error, #f7e9e9); }
.wn-toast--exiting { animation: wn-toast-exit 0.15s ease-in forwards; pointer-events: none; }

.wn-toast__icon { flex-shrink: 0; width: 14px; height: 14px; line-height: 14px; font-size: var(--wn-font-size-small, 14px); }
.wn-toast__message { flex: 1; word-break: break-word; line-height: 1.4; }
.wn-toast__actions { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }
.wn-toast__action-btn {
  padding: 2px 8px;
  background: var(--wn-color-button-bg, transparent);
  color: var(--wn-color-button-fg, var(--wn-color-accent, #1a5fb4));
  border: 1px solid var(--wn-color-button-border, var(--wn-color-accent, #1a5fb4));
  border-radius: var(--wn-radius-control, 6px);
  cursor: pointer;
  font: var(--wn-font-size-small, 14px)/1.4 var(--wn-font-ui, system-ui, sans-serif);
  white-space: nowrap;
}
.wn-toast__action-btn:hover { background: var(--wn-color-accent, #1a5fb4); color: var(--wn-color-on-accent, var(--wn-color-bg, #fbfaf7)); }
.wn-toast__close-btn {
  padding: 1px 4px;
  background: none;
  color: var(--wn-color-fg-muted, #6f6a61);
  border: none;
  cursor: pointer;
  font-family: var(--wn-font-ui, system-ui, sans-serif);
  font-size: 15px;
  line-height: 1;
}
.wn-toast__close-btn:hover { color: var(--wn-color-fg, #23211d); }

@keyframes wn-toast-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wn-toast-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}

/* Mobile — mirrors the viewer breakpoint. 640px is a literal: media
   conditions cannot read custom properties (see docs/theming.md). Values
   inside the query still read tokens where they exist. */
@media (max-width: 640px) {
  .wn-header { flex-wrap: wrap; row-gap: .4rem; padding: .5rem .9rem; }
  /* crumbs + menu share ONE row: the trail shrinks (per-crumb ellipsis,
     then horizontal scroll as the final fallback), the button never does */
  .wn-breadcrumb { flex: 1 1 auto; min-width: 0; order: 1; overflow-x: auto; scrollbar-width: none; }
  .wn-breadcrumb::-webkit-scrollbar { display: none; }
  .wn-breadcrumb:has(.wn-crumb-more[open]) { overflow: visible; }
  .wn-crumb { padding: 8px 8px; }
  .wn-nav { order: 2; flex: 0 0 auto; margin-left: auto; flex-wrap: nowrap; }
  .wn-nav .wn-menu { display: block; }
  .wn-nav .wn-menu summary { min-height: var(--wn-touch-target, 44px); /* comfortable touch targets */ }
  .wn-nav:has(.wn-menu:not([open])) .wn-actions { display: none; }
  .wn-nav .wn-actions {
    position: absolute; top: calc(100% + .35rem); right: .9rem; z-index: 60;
    flex-direction: column; align-items: stretch; gap: .1rem;
    min-width: 13rem; max-height: 70vh; overflow-y: auto;
    background: var(--wn-color-dropdown-bg, var(--wn-color-bg, #fbfaf7));
    border: 1px solid var(--wn-color-dropdown-border, var(--wn-color-border, #e3ded4));
    border-radius: var(--wn-radius-menu, 8px);
    padding: .5rem .9rem; box-shadow: var(--wn-shadow-menu, 0 6px 16px rgb(0 0 0 / 15%));
  }
  .wn-actions a { display: block; padding: .45em .35em; min-height: var(--wn-touch-target, 44px); }
  .wn-toolbar { flex-wrap: wrap; row-gap: 4px; padding: .4rem .9rem; }
  .wn-toolbar-btn { min-width: var(--wn-touch-target, 44px); height: var(--wn-touch-target, 44px); }
  /* the link field wraps so its buttons and (unclipped) message stay on screen */
  .wn-link-field { flex-wrap: wrap; row-gap: 4px; }
  .wn-link-field-input { flex: 1 1 10ch; }
  .wn-link-field-msg { flex: 1 1 100%; white-space: normal; overflow: visible; }
  .wn-link-field-btn { min-width: var(--wn-touch-target, 44px); height: var(--wn-touch-target, 44px); }
  .wn-editor-wrap { padding: 1.2rem .9rem 4rem; }
  .wn-body { flex-direction: column; }
  .wn-left-sidepanel:not(:empty),
  .wn-right-sidepanel:not(:empty) {
    width: 100%; max-height: 38%;
    border-left: none; border-right: none;
    border-top: 1px solid var(--wn-color-sidepanel-border, var(--wn-color-border, #e3ded4));
  }
  .wn-toast-container { max-width: calc(100vw - 16px); }
  .wn-toast { min-width: 0; max-width: 100%; }
}
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}

// ─── Style injection ───────────────────────────────────────────────────────────

/**
 * Inject the default CSS for all wn-* classes into <head> once.
 * Users can override any rule by targeting the same class with higher specificity.
 *
 * @param theme - Optional CSS string that replaces the default stylesheet entirely.
 * @param themeAppend - Optional CSS appended AFTER the (default or replaced)
 *   stylesheet in its own `<style id="worldnotes-theme">`, so it wins the
 *   cascade at equal specificity while the defaults stay intact. `''` removes
 *   a previously injected theme; `undefined` leaves the current one alone.
 */
const DEFAULT_CSS = EDITOR_TOKENS_CSS + EDITOR_CHROME_CSS + EDITOR_CONTENT_CSS + SITE_BANDS_CSS

function injectStyles(theme?: string, themeAppend?: string): void {
  const STYLE_ID = 'worldnotes-styles'
  const THEME_ID = 'worldnotes-theme'
  let base = document.getElementById(STYLE_ID)
  if (base) {
    if (theme !== undefined) base.textContent = theme
  } else {
    base = document.createElement('style')
    base.id = STYLE_ID
    base.textContent = theme ?? DEFAULT_CSS
    document.head.appendChild(base)
  }

  if (themeAppend === undefined) return
  const existing = document.getElementById(THEME_ID)
  if (themeAppend === '') {
    existing?.remove()
    return
  }
  const themeStyle = existing ?? document.createElement('style')
  themeStyle.id = THEME_ID
  // textContent, never innerHTML: the CSS cannot break out of the element.
  themeStyle.textContent = themeAppend
  // Always directly after the base sheet, whatever else landed in <head>.
  base.after(themeStyle)
}

// ─── Editor DOM ──────────────────────────────────────────────────────────────

/**
 * Public handle for the editor DOM elements returned by {@link createEditorDOM}.
 */
export interface EditorDOM {
  container: HTMLElement
  header: HTMLElement
  breadcrumb: HTMLElement
  nav: HTMLElement
  menu: HTMLElement
  actions: HTMLElement
  toolbar: HTMLElement
  editorWrap: HTMLElement
  editorDiv: HTMLDivElement
  placeholder: HTMLElement
  overlay: HTMLElement
  body: HTMLElement
  footer: HTMLElement
  leftSidepanel: HTMLElement
  rightSidepanel: HTMLElement
}

/**
 * Build the complete editor DOM inside `container`, inject default CSS into the
 * document head, and return typed references to each element.
 */
/**
 * Insert the admin-authored site header/footer bands into the editor's
 * scrollable wrapper (`editorWrap.prepend/appendChild`), mirroring the
 * reader's placement inside `<main>`: the bands sit above and below the
 * ~46rem content column and scroll with the document. The CSS is admin-
 * trusted raw HTML (same sink policy as render/layout.ts); empty values
 * insert nothing.
 */
export function insertSiteBands(
  editorWrap: HTMLElement,
  headerHtml: string,
  footerHtml: string,
): void {
  if (headerHtml) {
    const band = el('div', 'wn-site-header')
    band.innerHTML = headerHtml
    editorWrap.prepend(band)
  }
  if (footerHtml) {
    const band = el('div', 'wn-site-footer')
    band.innerHTML = footerHtml
    editorWrap.appendChild(band)
  }
}

export function createEditorDOM(
  container: HTMLElement,
  theme?: string,
  themeAppend?: string,
): EditorDOM {
  injectStyles(theme, themeAppend)

  container.innerHTML = ''
  container.className = 'wn-root'

  const header = el('div', 'wn-header')
  const breadcrumb = el('div', 'wn-breadcrumb')
  const nav = el('nav', 'wn-nav')
  nav.setAttribute('aria-label', 'Site')
  const menu = document.createElement('details')
  menu.className = 'wn-menu'
  const menuSummary = document.createElement('summary')
  menuSummary.setAttribute('aria-label', 'Site menu')
  menuSummary.textContent = '\u2630'
  menu.appendChild(menuSummary)
  const actions = el('div', 'wn-actions')
  const toolbar = el('div', 'wn-toolbar')
  const body = el('div', 'wn-body')
  const leftSidepanel = el('div', 'wn-left-sidepanel')
  const editorWrap = el('div', 'wn-editor-wrap')
  const editorCol = el('div', 'wn-editor-col')
  const editorDiv = el('div', 'wn-editor') as HTMLDivElement
  const placeholder = el('div', 'wn-placeholder')
  const overlay = el('div', 'wn-overlay')
  const rightSidepanel = el('div', 'wn-right-sidepanel')
  const footer = el('div', 'wn-footer')

  placeholder.textContent = 'Start writing… use [[page name]] to link deeper'
  editorDiv.contentEditable = 'true'
  editorDiv.spellcheck = false

  header.appendChild(breadcrumb)
  nav.appendChild(menu)
  nav.appendChild(actions)
  header.appendChild(nav)

  editorCol.appendChild(placeholder)
  editorCol.appendChild(editorDiv)
  editorCol.appendChild(overlay)
  editorWrap.appendChild(editorCol)

  body.appendChild(leftSidepanel)
  body.appendChild(editorWrap)
  body.appendChild(rightSidepanel)

  container.appendChild(header)
  container.appendChild(toolbar)
  container.appendChild(body)
  container.appendChild(footer)

  return {
    container,
    header,
    breadcrumb,
    nav,
    menu,
    actions,
    toolbar,
    editorWrap,
    editorDiv,
    placeholder,
    overlay,
    body,
    footer,
    leftSidepanel,
    rightSidepanel,
  }
}
