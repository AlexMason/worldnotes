# Phase 4: Theming System - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

## Phase Boundary

Consumers customize the editor's appearance by overriding CSS custom properties or replacing the entire stylesheet. The editor DOM uses only prefixed, token-driven classes. No behavior changes — purely visual customization.

## Implementation Decisions

### Design Tokens
- **D-01:** ~40 `--wn-*` CSS custom properties defined in a `DEFAULT_TOKENS` constant, grouped by category:
  - **Colors** (18): `--wn-color-bg`, `--wn-color-surface`, `--wn-color-fg`, `--wn-color-fg-muted`, `--wn-color-accent`, `--wn-color-accent-hover`, `--wn-color-border`, `--wn-color-punct`, `--wn-color-heading-h1` through `--wn-color-heading-h3`, `--wn-color-bold`, `--wn-color-italic`, `--wn-color-code`, `--wn-color-code-bg`, `--wn-color-blockquote`, `--wn-color-hr`, `--wn-color-wiki-link`, `--wn-color-wiki-link-bg`, `--wn-color-wiki-link-border`, `--wn-color-link`
  - **Typography** (8): `--wn-font-family`, `--wn-font-mono`, `--wn-font-size-body`, `--wn-font-size-h1`, `--wn-font-size-h2`, `--wn-font-size-h3`, `--wn-font-size-small`, `--wn-line-height`
  - **Spacing** (6): `--wn-padding-editor-y`, `--wn-padding-editor-x`, `--wn-padding-topbar-y`, `--wn-padding-topbar-x`, `--wn-block-padding-left`, `--wn-gap-breadcrumb`
  - **Radii** (3): `--wn-radius-crumb`, `--wn-radius-code`, `--wn-radius-wiki-link`
  - **Shadows** (2): `--wn-shadow-wiki-link`, `--wn-shadow-wiki-link-hover`
  - **Transitions** (2): `--wn-transition-color`, `--wn-transition-bg`
  - **Misc** (2): `--wn-caret-color`, `--wn-font-weight-bold`
- **D-02:** Tokens are injected on the `:root` of the editor container (`.wn-root`) so consumers can override from any ancestor element via CSS cascade.
- **D-03:** Each token maps to exactly one CSS property usage. No token is used for two different visual properties.

### Stylesheet Transformation
- **D-04:** The existing `DEFAULT_CSS` template string (122 lines of hardcoded values in `src/editor-dom.ts`) is replaced with a token-driven stylesheet that references `var(--wn-*)` values.
- **D-05:** All CSS class selectors remain `wn-*` prefixed. No new classes are introduced. Existing classes keep their current names.
- **D-06:** Zero inline `style` attributes in the editor DOM. All styling originates from the injected `<style>` element.

### Theme Replacement
- **D-07:** `EditorOptions.theme` accepts an optional `string` (a complete CSS stylesheet). When provided, it replaces the injected `<style id="worldnotes-styles">` content entirely. When omitted, the default token-driven stylesheet is used.
- **D-08:** `injectStyles()` in `editor-dom.ts` accepts an optional `theme` parameter. If provided, it injects the theme string instead of the default token-driven CSS.

### Documentation
- **D-09:** `docs/theming.md` documents every `--wn-*` design token with its default value, CSS property mapping, and visual impact. Includes a quick-start example: override `--wn-color-primary` on a parent element.

### OpenCode's Discretion
- Exact default color values (preserve current visual appearance approximately)
- Token naming within each category (exact property names)
- Whether to add new tokens for strikethrough and link plugin styles (added in Phase 3)
- CSS variable fallback strategy for tokens not defined by consumer

## Specific Ideas

No specific requirements — open to standard approaches.

## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — THEME-01 through THEME-05
- `.planning/ROADMAP.md` — Phase 4 goal, 5 success criteria

### Codebase
- `src/editor-dom.ts` — Current `DEFAULT_CSS` and `injectStyles()` (source to be transformed)
- `.planning/research/ARCHITECTURE.md` — Theming separation patterns
- `.planning/research/FEATURES.md` — Two-tier theming: tokens (80%) + full replacement (20%)

### Prior Phases
- `.planning/phases/02-architecture-refactoring/02-CONTEXT.md` — Module architecture

## Existing Code Insights

### Reusable Assets
- **`injectStyles()`** (`src/editor-dom.ts`): Already idempotent (checks `#worldnotes-styles`). Extend with optional theme parameter.
- **`DEFAULT_CSS`** (`src/editor-dom.ts`): 122-line template string. Each hardcoded value becomes a `var(--wn-*)` reference.

### Established Patterns
- **`wn-*` class prefix**: All CSS selectors use `wn-` prefix. Must be preserved.
- **Idempotent injection**: `injectStyles()` checks for existing `<style id="worldnotes-styles">` before injecting. Must continue to work.

### Integration Points
- **`EditorOptions`** (`src/types.ts`): Add `theme?: string` field.
- **`createEditorDOM()`** (`src/editor-dom.ts`): Pass theme option through to `injectStyles()`.
- **`EditorBuilder`** (`src/editor.ts`): Thread theme option from `EditorOptions` through to DOM factory.

## Deferred Ideas

None — discussion stayed within phase scope.

---
*Phase: 04-theming*
*Context gathered: 2026-05-23*
