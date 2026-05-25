# UI Slots: Header, Footer, Sidepanels

**Date:** 2026-05-25  
**Status:** Draft

## Goal

Add four new UI plugin slots — `wn-header`, `wn-footer`, `wn-left-sidepanel`, `wn-right-sidepanel` — to the editor DOM. These allow future plugins to inject content into fixed regions without modifying core layout code.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Header, toolbar, footer span full width (not pushed by sidepanels) | Only the editor area lives between sidepanels. Chrome stays 100% wide. |
| Sidepanels hidden when empty (`display: none`) | No dead space when no plugin claims the slot. |
| Slots use same `string[]` pattern as existing `wn-toolbar` / `wn-overlay` | No changes to `UIPlugin` contract or `PluginRegistry`. |
| Wrapper element `.wn-body` introduced for the sidepanel+editor row | Keeps flex layout clean without CSS hacks. |

## Layout

```
.wn-root (flex column)
├── .wn-header              ← NEW slot `wn-header`
├── .wn-topbar              (existing, breadcrumb)
├── .wn-toolbar             ← existing slot `wn-toolbar`
├── .wn-body (flex row, flex: 1, min-height: 0)
│   ├── .wn-left-sidepanel  ← NEW slot `wn-left-sidepanel`
│   ├── .wn-editor-wrap     (existing, flex: 1)
│   └── .wn-right-sidepanel ← NEW slot `wn-right-sidepanel`
└── .wn-footer              ← NEW slot `wn-footer`
```

All new elements use `flex-shrink: 0` except sidepanels which participate in the row and `.wn-body` which fills remaining height.

## New Slots

| Slot name | DOM element class | Width behavior | Visibility |
|-----------|-------------------|----------------|------------|
| `wn-header` | `.wn-header` | Full width, `flex-shrink: 0` | Always in DOM; empty by default |
| `wn-footer` | `.wn-footer` | Full width, `flex-shrink: 0` | Always in DOM; empty by default |
| `wn-left-sidepanel` | `.wn-left-sidepanel` | Default 240px, `overflow-y: auto` | `display: none` when empty |
| `wn-right-sidepanel` | `.wn-right-sidepanel` | Default 240px, `overflow-y: auto` | `display: none` when empty |

Sidepanel visibility is CSS-driven: a plugin's `onMount(slotEl)` appends children, making the element non-empty and therefore visible. No explicit JS toggle needed.

## Changes by File

### 1. `src/editor-dom.ts`

**EditorDOM interface** — add four new properties:

```typescript
export interface EditorDOM {
  // ... existing ...
  header: HTMLElement
  body: HTMLElement
  footer: HTMLElement
  leftSidepanel: HTMLElement
  rightSidepanel: HTMLElement
}
```

**createEditorDOM()** — build new elements and restructure append order:

```typescript
const header = el('div', 'wn-header')
const body = el('div', 'wn-body')
const leftSidepanel = el('div', 'wn-left-sidepanel')
const rightSidepanel = el('div', 'wn-right-sidepanel')
const footer = el('div', 'wn-footer')

body.appendChild(leftSidepanel)
body.appendChild(editorWrap)    // was previously appended to container
body.appendChild(rightSidepanel)

container.appendChild(header)
container.appendChild(topbar)
container.appendChild(toolbar)
container.appendChild(body)
container.appendChild(footer)
```

**CSS additions** — new rules in `DEFAULT_CSS`:

```css
.wn-header { flex-shrink: 0; }
.wn-body { display: flex; flex: 1; min-height: 0; }
.wn-footer { flex-shrink: 0; }
.wn-left-sidepanel { display: none; width: 240px; flex-shrink: 0; overflow-y: auto; border-right: 0.5px solid var(--wn-color-border); }
.wn-right-sidepanel { display: none; width: 240px; flex-shrink: 0; overflow-y: auto; border-left: 0.5px solid var(--wn-color-border); }
.wn-left-sidepanel:not(:empty) { display: block; }
.wn-right-sidepanel:not(:empty) { display: block; }
```

### 2. `src/editor-lifecycle.ts`

Extend `slotElements` record (line 334):

```typescript
const slotElements: Record<string, HTMLElement> = {
  'wn-header': dom.header,
  'wn-toolbar': dom.toolbar,
  'wn-overlay': dom.overlay,
  'wn-left-sidepanel': dom.leftSidepanel,
  'wn-right-sidepanel': dom.rightSidepanel,
  'wn-footer': dom.footer,
}
```

### 3. `src/editor.ts`

Extend `_slotElements` in `EditorBuilder.mount()` (line 118):

```typescript
this._slotElements = {
  'wn-header': this.el.querySelector('.wn-header') as HTMLElement,
  'wn-toolbar': this.el.querySelector('.wn-toolbar') as HTMLElement,
  'wn-left-sidepanel': this.el.querySelector('.wn-left-sidepanel') as HTMLElement,
  'wn-right-sidepanel': this.el.querySelector('.wn-right-sidepanel') as HTMLElement,
  'wn-footer': this.el.querySelector('.wn-footer') as HTMLElement,
}
```

## What Does NOT Change

- **`src/types.ts`** — `UIPlugin` contract unchanged; slots remain `string[]`.
- **`src/plugin-registry.ts`** — no changes; slot validation is name-agnostic.
- **Existing plugins** — `importExport` (`wn-toolbar`) and `remoteCursors` (`wn-overlay`) continue working unchanged.
- **Breadcrumb / navigation** — topbar stays at full width above the body row.

## Testing

Add a test in `src/__tests__/editor-dom.test.ts` (or wherever DOM construction tests live) verifying:

1. `createEditorDOM()` returns all new properties in the `EditorDOM` object.
2. The DOM hierarchy matches the layout spec (header, topbar, toolbar, body containing left-sidepanel + editor-wrap + right-sidepanel, footer).
3. `.wn-left-sidepanel` and `.wn-right-sidepanel` have `display: none` by default (empty).
4. Appending a child to a sidepanel makes it visible (`:not(:empty)` selector applies).
5. Existing UI plugins (`wn-toolbar`, `wn-overlay`) still mount correctly.

## Risks

- **CSS `:not(:empty)` whitespace sensitivity**: An empty sidepanel div with a text node (newline) counts as non-empty. The DOM builder uses `el()` which creates elements via `document.createElement` with no text nodes, so this is fine.
- **Post-mount registration via `EditorBuilder.use()`**: The `_slotElements` record must include all new slots so plugins registered after mount are wired immediately. Covered in the `editor.ts` change above.
