# Theming Research: CSS Custom Properties

**Domain:** CSS custom property design tokens for browser library theming
**Researched:** 2026-05-24
**Confidence:** HIGH

## Design Token Naming Conventions

### Namespace Convention

All tokens use the `--wn-*` namespace prefix to avoid collisions with consumer CSS. This follows the pattern established by the existing `wn-*` CSS class prefix convention in the codebase.

**Pattern:** `--wn-{category}-{property}`

```
--wn-color-bg          → Background color
--wn-color-fg          → Foreground/text color
--wn-font-size-body    → Body font size
--wn-padding-editor-y  → Editor vertical padding
--wn-radius-crumb      → Breadcrumb crumb border radius
```

### Category Grouping

Tokens are grouped by visual concern. Each category forms a logical unit:

| Category | Prefix | Tokens | Purpose |
|----------|--------|--------|---------|
| Colors | `--wn-color-*` | ~21 | All color values (fg, bg, accent, semantic) |
| Typography | `--wn-font-*`, `--wn-line-height` | 8 | Font families, sizes, line height |
| Spacing | `--wn-padding-*`, `--wn-gap-*`, `--wn-block-*` | 6 | Padding and gap values |
| Radii | `--wn-radius-*` | 3 | Border radii |
| Shadows | `--wn-shadow-*` | 2 | Box shadows |
| Transitions | `--wn-transition-*` | 2 | CSS transition durations |
| Misc | `--wn-caret-*`, `--wn-font-weight-*` | 2 | Caret color, bold weight |

### Semantic vs. Presentational Naming

Tokens use **semantic naming** (what the value represents) rather than presentational naming (what the value looks like):

```css
/* Good — semantic: describes role */
--wn-color-fg-muted
--wn-color-heading-h1

/* Bad — presentational: describes appearance */
--wn-color-dark-gray
--wn-font-size-large
```

This allows consumers to change the meaning without the name lying: `--wn-color-fg-muted: red` is self-evident; `--wn-color-dark-gray: red` is confusing.

### Flat Token Structure

All tokens are flat (no nested object structure). The `DEFAULT_TOKENS` constant is a TypeScript template literal string, not a nested object, matching the `DEFAULT_CSS` pattern already in the codebase. This keeps them directly injectable into a `<style>` element with zero transformation.

## CSS Custom Property Best Practices

### Cascade Strategy

Tokens are injected on `.wn-root` via a `<style>` element:

```css
.wn-root {
  --wn-color-bg: #0e0e10;
  --wn-color-fg: #c9c9d0;
  /* ... all tokens ... */
}
```

This scoping means:
1. **Consumer overrides from any ancestor** — setting `--wn-color-bg: red` on a parent `<div>` cascades into the editor via normal CSS inheritance
2. **Multiple editors on one page** — each `.wn-root` gets its own token scope; they don't interfere
3. **No `:root` pollution** — tokens don't leak to the page at large

### `var()` Fallback Strategy

Every `var()` reference includes a hardcoded fallback:

```css
.wn-editor {
  color: var(--wn-color-fg, #c9c9d0);
}
```

This provides belt-and-suspenders protection:
- If a token is deleted (e.g., by a full theme that doesn't define it), the editor still renders with sensible defaults
- Debugging is easier — missing tokens are visibly different from intentionally-changed ones

**Important constraint:** Each token maps to exactly one CSS property (per D-03). No token is shared across properties. This prevents the "change one token, break five things" problem.

### Full Theme Replacement

When `EditorOptions.theme` is provided, the entire `<style id="worldnotes-styles">` content is replaced. This is an escape hatch for consumers who need complete control. The replacement CSS must:
1. Target `.wn-root` for scoping
2. Define all necessary `wn-*` classes or equivalent selectors
3. Optionally define `--wn-*` tokens — but has no obligation to use the token system

The token system covers 80% of customization use cases. Full replacement covers the remaining 20%.

### Performance Considerations

- **Single injection, done once:** `injectStyles()` checks for existing `<style id="worldnotes-styles">` before injecting. Idempotent.
- **Zero runtime overhead:** After injection, the browser's CSS engine handles custom property resolution. No JavaScript involvement during rendering.
- **No layout thrashing:** CSS custom properties don't trigger reflow unless they affect layout properties (width, height, etc.). Color and typography changes repaint only.

## Anti-Patterns

### Anti-Pattern 1: Inline Styles

**Bad:** Setting `element.style.color = 'var(--wn-color-fg)'` in JavaScript.

**Why wrong:** Inline styles bypass the cascade. Consumers can't override with normal CSS. Breaks D-06 (zero inline `style` attributes).

**Do instead:** Assign semantic class names and let the stylesheet define the appearance via custom properties.

### Anti-Pattern 2: Nested Token References in Fallbacks

**Bad:** `color: var(--wn-color-fg, var(--wn-color-text, #000))`

**Why wrong:** Browser support for nested `var()` fallbacks is inconsistent. Chrome supports it; Safari didn't until recently.

**Do instead:** Use a single flat fallback value.

### Anti-Pattern 3: Token Names That Leak Implementation

**Bad:** `--wn-color-purple-accent-hover-bright`

**Why wrong:** If the consumer changes the accent to green, the token name lies. Semantic naming prevents this.

**Do instead:** `--wn-color-accent-hover` — describes the ROLE, not the color.

## Sources

- **CSS Custom Properties (MDN)** — https://developer.mozilla.org/en-US/docs/Web/CSS/--* — HIGH confidence (official web standards documentation). Covers `var()`, fallback syntax, cascade behavior, and `@property` registration.
- **Obsidian Theme Documentation** — https://docs.obsidian.md/ — HIGH confidence. Obsidian uses an extensive CSS variable system (`--background-primary`, `--text-normal`, etc.) scoped to `.theme-dark`/`.theme-light` on `body`. Our `--wn-*` namespace on `.wn-root` follows the same pattern adapted for a library context.
- **TipTap Headless Styling** — https://tiptap.dev/docs/editor/getting-started/style-editor — MEDIUM confidence. TipTap ships zero styles, leaving all styling to consumers. Our approach (default theme + tokens + full replacement) provides a better out-of-box experience while preserving full customization.
- **WorldNotes existing conventions** — `.planning/codebase/CONVENTIONS.md` — HIGH confidence. All CSS class selectors use `wn-*` prefix. The `DEFAULT_CSS` template string pattern in `editor-dom.ts` is established. The `injectStyles()` idempotent injection pattern is proven.

---

*Research for: worldnotes Phase 4 theming system*
*Researched: 2026-05-24*
