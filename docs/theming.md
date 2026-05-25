# Theming

WorldNotes uses CSS custom properties (design tokens) for all visual styling.
You can customize the editor's appearance at two levels:

1. **Token overrides** — Set `--wn-*` properties on a parent element (covers ~80% of use cases)
2. **Full theme replacement** — Pass a complete CSS string to `EditorOptions.theme` (covers the remaining ~20%)

## Quick Start

Override the accent color by setting a CSS custom property on the editor's parent element:

```css
.editor-container {
  --wn-color-accent: #ff6b6b;
}
```

```typescript
import { createEditor } from 'worldnotes'

const editor = await createEditor(document.getElementById('editor-container')).mount()
```

All accent-colored elements (links, wiki links, code, crumb hover, caret) will use red instead of purple.

## Design Token Reference

All tokens are defined on `.wn-root` and cascade to child elements.
Override any token by setting it on an ancestor of the editor container.

### Colors

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-color-bg` | `#0e0e10` | `background` | Root editor background |
| `--wn-color-surface` | `#0a0a0c` | `background` | Topbar background |
| `--wn-color-fg` | `#c9c9d0` | `color` | Primary text and chrome foreground |
| `--wn-color-fg-muted` | `#4a4a5e` | `color` | Secondary text (breadcrumbs, placeholder) |
| `--wn-color-accent` | `#9b8fe8` | `color` | Links, code text, wiki links, crumb hover, caret |
| `--wn-color-accent-hover` | `#bbb3f8` | `color` | Accent elements on hover (links, wiki links) |
| `--wn-color-border` | `#1f1f23` | `border-color` | Topbar border, blockquote border |
| `--wn-color-punct` | `#2e2e44` | `color` | Markdown punctuation markers (`**`, `##`, `~~`) |
| `--wn-color-heading-h1` | `#e2e1f4` | `color` | H1 heading text |
| `--wn-color-heading-h2` | `#c8c7e2` | `color` | H2 heading text |
| `--wn-color-heading-h3` | `#a8a8c4` | `color` | H3 heading text |
| `--wn-color-bold` | `#d4d4ea` | `color` | Bold text |
| `--wn-color-italic` | `#7878a0` | `color` | Italic text |
| `--wn-color-code` | `#9b8fe8` | `color` | Inline code text |
| `--wn-color-code-bg` | `#17171e` | `background` | Inline code background |
| `--wn-color-blockquote` | `#4a4a66` | `color` | Blockquote text |
| `--wn-color-hr` | `#1e1e2c` | `border-color` | Horizontal rule color |
| `--wn-color-wiki-link` | `#9b8fe8` | `color` | Wiki link text |
| `--wn-color-wiki-link-bg` | `#16142a` | `background` | Wiki link background |
| `--wn-color-wiki-link-border` | `#332d6a` | `border-color` | Wiki link border |
| `--wn-color-wiki-link-hover` | `#bbb3f8` | `color` | Wiki link text on hover |
| `--wn-color-wiki-link-bg-hover` | `#221e42` | `background` | Wiki link background on hover |
| `--wn-color-link` | `#9b8fe8` | `color` | External link text |

### Typography

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-font-family` | `sans-serif` | `font-family` | Heading font family |
| `--wn-font-mono` | `monospace` | `font-family` | Body text and code font family |
| `--wn-font-size-body` | `14px` | `font-size` | Editor body text size |
| `--wn-font-size-h1` | `22px` | `font-size` | H1 heading size |
| `--wn-font-size-h2` | `17px` | `font-size` | H2 heading size |
| `--wn-font-size-h3` | `14px` | `font-size` | H3 heading size |
| `--wn-font-size-small` | `12px` | `font-size` | Breadcrumb, code, wiki link text size |
| `--wn-line-height` | `1.9` | `line-height` | Editor line height |

### Spacing

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-padding-editor-y` | `28px` | `padding-top`, `padding-bottom` | Editor top/bottom padding |
| `--wn-padding-editor-x` | `36px` | `padding-left`, `padding-right` | Editor left/right padding |
| `--wn-padding-topbar-y` | `10px` | `padding-top`, `padding-bottom` | Topbar top/bottom padding |
| `--wn-padding-topbar-x` | `14px` | `padding-left`, `padding-right` | Topbar left/right padding |
| `--wn-block-padding-left` | `10px` | `padding-left` | Blockquote left padding |
| `--wn-gap-breadcrumb` | `0` | `gap` | Breadcrumb crumb spacing |

### Radii

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-radius-crumb` | `4px` | `border-radius` | Breadcrumb crumb corner rounding |
| `--wn-radius-code` | `3px` | `border-radius` | Inline code corner rounding |
| `--wn-radius-wiki-link` | `4px` | `border-radius` | Wiki link corner rounding |

### Shadows

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-shadow-wiki-link` | `none` | `box-shadow` | Wiki link shadow (default: none) |
| `--wn-shadow-wiki-link-hover` | `none` | `box-shadow` | Wiki link hover shadow (default: none) |

### Transitions

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-transition-color` | `color 0.15s` | `transition` | Color transition speed |
| `--wn-transition-bg` | `background 0.12s` | `transition` | Background transition speed |

### Misc

| Token | Default | CSS Property | Visual Impact |
|-------|---------|-------------|---------------|
| `--wn-caret-color` | `#9b8fe8` | `caret-color` | Text cursor (caret) color |
| `--wn-font-weight-bold` | `600` | `font-weight` | Bold text weight |

## Token Override Example

Create a light theme by overriding tokens on a parent element:

```css
.editor-container {
  --wn-color-bg: #ffffff;
  --wn-color-surface: #f5f5f7;
  --wn-color-fg: #1a1a1a;
  --wn-color-fg-muted: #888888;
  --wn-color-accent: #0066cc;
  --wn-color-accent-hover: #004499;
  --wn-color-border: #e0e0e0;
  --wn-color-punct: #cccccc;
  --wn-color-heading-h1: #111111;
  --wn-color-heading-h2: #222222;
  --wn-color-heading-h3: #333333;
  --wn-color-bold: #1a1a1a;
  --wn-color-italic: #666666;
  --wn-color-code: #0066cc;
  --wn-color-code-bg: #f0f0f5;
  --wn-color-blockquote: #888888;
  --wn-color-hr: #e0e0e0;
  --wn-color-wiki-link: #0066cc;
  --wn-color-wiki-link-bg: #f0f5ff;
  --wn-color-wiki-link-border: #c0d0f0;
  --wn-color-wiki-link-hover: #004499;
  --wn-color-wiki-link-bg-hover: #e0ebff;
  --wn-color-link: #0066cc;
  --wn-caret-color: #0066cc;
}
```

## Full Theme Replacement

For complete control, pass a CSS string to `EditorOptions.theme`.
This replaces the entire default stylesheet.

```typescript
const myTheme = `
.wn-root {
  --wn-color-bg: #1a1a2e;
  --wn-color-fg: #e0e0e0;
  --wn-color-accent: #e94560;
}

.wn-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wn-color-bg, #1a1a2e);
  color: var(--wn-color-fg, #e0e0e0);
  font-family: 'Fira Code', monospace;
  overflow: hidden;
}

.wn-editor {
  outline: none;
  min-height: 100%;
  font-size: 15px;
  line-height: 1.8;
  color: var(--wn-color-fg, #e0e0e0);
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: var(--wn-color-accent, #e94560);
}

/* Define all wn-* classes for your theme */
.wn-bold { font-weight: 700; color: #ffffff; }
.wn-italic { font-style: italic; color: #a0a0b0; }
/* ... more classes ... */
`

const editor = await createEditor(document.getElementById('app'), {
  theme: myTheme
}).mount()
```

When `theme` is provided, the default token system is bypassed entirely.
You have full control over every CSS rule.

## CSS Class Reference

All editor elements use `wn-*` prefixed CSS classes.
These class names are stable and will not change across versions:

| Class | Element | Purpose |
|-------|---------|---------|
| `.wn-root` | Container div | Editor root container |
| `.wn-topbar` | Topbar div | Breadcrumb navigation bar |
| `.wn-breadcrumb` | Breadcrumb div | Breadcrumb trail container |
| `.wn-crumb` | Crumb span | Individual breadcrumb item |
| `.wn-crumb--active` | Crumb span | Active (current) breadcrumb |
| `.wn-crumb-sep` | Separator span | Breadcrumb separator (`/`) |
| `.wn-editor-wrap` | Wrapper div | Scrollable editor wrapper |
| `.wn-editor` | ContentEditable div | The editable text area |
| `.wn-placeholder` | Placeholder div | "Start writing..." hint |
| `.wn-punct` | Punctuation span | Markdown punctuation characters |
| `.wn-h1`, `.wn-h2`, `.wn-h3` | Heading divs | Heading block containers |
| `.wn-h1-text`, `.wn-h2-text`, `.wn-h3-text` | Text spans | Heading text (after `#` markers) |
| `.wn-bold` | Bold span | Bold text |
| `.wn-italic` | Italic span | Italic text |
| `.wn-inline-code` | Code span | Inline code punctuation |
| `.wn-code-text` | Code span | Inline code text content |
| `.wn-blockquote` | Blockquote div | Blockquote content |
| `.wn-hr` | HR div | Horizontal rule |
| `.wn-wiki-link` | Link span | Wiki page link |
| `.wn-strikethrough` | Strikethrough span | Strikethrough text |
| `.wn-link` | Link anchor | External URL link |

## How It Works

1. **Editor mount:** `createEditorDOM()` calls `injectStyles()` which inserts a `<style id="worldnotes-styles">` element into the document `<head>`
2. **Token cascade:** Design tokens are defined on `.wn-root`, so they cascade to all child elements
3. **Consumer overrides:** Setting `--wn-*` on any ancestor element overrides the default token values via normal CSS cascade
4. **Full replacement:** When `EditorOptions.theme` is provided, the `<style>` element's content is replaced entirely — the default token stylesheet is bypassed
