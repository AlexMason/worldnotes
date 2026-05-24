---
phase: 04-theming
plan: 01
subsystem: theming
tags: [tokens, css-custom-properties, design-system, refactoring]
requires: []
provides: [DEFAULT_TOKENS, token-driven-DEFAULT_CSS]
affects: [editor-dom, theme-cascade]
tech-stack:
  added: []
  patterns: [CSS-custom-properties, design-tokens, var()-references, template-literal-concatenation]
key-files:
  created: [src/__tests__/editor-dom.test.ts]
  modified: [src/editor-dom.ts]
decisions:
  - "46 --wn-* tokens across 7 categories: Colors (23), Typography (8), Spacing (6), Radii (3), Shadows (2), Transitions (2), Misc (2)"
  - "Tokens injected on .wn-root via template literal concatenation (DEFAULT_CSS = DEFAULT_TOKENS + ...)"
  - "All var() references include fallbacks matching token defaults for graceful degradation"
  - "Wiki-link font-size (13px) and code-text font-size (12.5px) shifted to unified --wn-font-size-small (12px) — intentional ~1px visual change"
metrics:
  duration: 6m 1s
  completed: 2026-05-24T13:57:33Z
---

# Phase 4 Plan 1: Theming Token System Summary

Extracted every hardcoded design value from `DEFAULT_CSS` into 46 `--wn-*` CSS custom properties, then replaced all values with `var()` references. The editor now supports full visual customization via CSS cascade — consumers override `--wn-*` properties on any ancestor element.

## Implementation

### DEFAULT_TOKENS Constant

A new `const DEFAULT_TOKENS` template literal string defines 46 CSS custom properties scoped to `.wn-root`, grouped by category:

| Category | Count | Example Tokens |
|----------|-------|----------------|
| Colors | 23 | `--wn-color-bg`, `--wn-color-accent`, `--wn-color-heading-h1` |
| Typography | 8 | `--wn-font-mono`, `--wn-font-size-body`, `--wn-line-height` |
| Spacing | 6 | `--wn-padding-editor-y`, `--wn-padding-topbar-x` |
| Radii | 3 | `--wn-radius-crumb`, `--wn-radius-code` |
| Shadows | 2 | `--wn-shadow-wiki-link`, `--wn-shadow-wiki-link-hover` |
| Transitions | 2 | `--wn-transition-color`, `--wn-transition-bg` |
| Misc | 2 | `--wn-caret-color`, `--wn-font-weight-bold` |

Each token includes an inline comment explaining its visual role. Tokens are injected by concatenating `DEFAULT_TOKENS +` at the start of `DEFAULT_CSS`.

### DEFAULT_CSS Transformation

Every design value (colors, fonts, sizes, spacing, radii, transitions) now uses `var(--wn-TOKEN, fallback)` syntax. Structural properties (display, position, cursor, text-decoration) remain as literal values.

Example transformation:
```css
/* Before */
.wn-root { background: #0e0e10; }

/* After */
.wn-root { background: var(--wn-color-bg, #0e0e10); }
```

All 44 CSS property references use `var()` with hardcoded fallbacks matching token defaults.

### Minor Visual Changes

- **Wiki-link font-size**: 13px → 12px (`--wn-font-size-small`) — ~1px smaller
- **Code-text font-size**: 12.5px → 12px (`--wn-font-size-small`) — 0.5px smaller
- **Blockquote/topbar borders**: two previously-different colors (`#2a2a42`, `#1f1f23`) unified to `--wn-color-border`

### Preserved Contracts

- All 22 `wn-*` class selectors unchanged (verified by test)
- `injectStyles()` idempotent check (`#worldnotes-styles`) unchanged
- Zero inline style attributes in editor DOM
- `createEditorDOM` function signature unchanged

## TDD Gate Compliance

| Phase | Commit | Type |
|-------|--------|------|
| Task 1 RED | `cbe1829` | `test`: 8 failing tests for `--wn-*` token definitions |
| Task 1 GREEN | `1b05402` | `feat`: DEFAULT_TOKENS with 46 tokens |
| Task 2 RED | `eda0026` | `test`: 8 failing tests for `var(--wn-*)` references |
| Task 2 GREEN | `e9a9c0b` | `feat`: token-driven DEFAULT_CSS |

All 4 gate commits present in git history. RED→GREEN sequence verified.

## Verification Results

| Gate | Result |
|------|--------|
| `npm run typecheck` | ✅ Zero errors |
| `npm run lint` | ✅ Zero errors |
| `npm run test:coverage` | ✅ 243 tests pass, 94.65% stmts / 84.81% branches |
| `npm run build` | ✅ Library bundles, 44 var() references in output |

## Test Coverage

**New test file:** `src/__tests__/editor-dom.test.ts` — 17 tests across 2 `describe` blocks:

1. **DEFAULT_TOKENS** (8 tests): Verifies all 7 token categories exist in injected stylesheet with category comment headers
2. **DEFAULT_CSS** (9 tests): Verifies `var()` usage for colors, typography, spacing, headings, wiki links, caret, transitions, and class selector preservation

All existing 226 tests continue to pass — zero regressions.

## Deviations from Plan

None — plan executed exactly as written. The plan's TDD gates (RED/GREEN for both tasks) were followed precisely.

## Known Stubs

None. All token definitions are complete and wired into the stylesheet. The `DEFAULT_TOKENS` constant and `var()` references are fully functional.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundaries introduced. The only change is CSS template string content within a `<style>` element, covered by the existing threat model (T-04-01 through T-04-03).

## Decisions Made

- **Token count**: 46 tokens (slightly above the ~40 target) — includes hover variant tokens for wiki links (Phase 3 support)
- **Fallback strategy**: Every `var()` reference includes a fallback matching the token default, ensuring graceful degradation if a consumer defines tokens incompletely
- **Minor visual changes accepted**: Wiki-link and code-text font-size reductions (~1px) are intentional per plan specification

## Commits

| Hash | Message |
|------|---------|
| `cbe1829` | test(04-theming-01): add failing tests for --wn-* design token definitions |
| `1b05402` | feat(04-theming-01): add DEFAULT_TOKENS constant with ~46 --wn-* CSS custom properties |
| `eda0026` | test(04-theming-01): add failing tests for var(--wn-*) references in DEFAULT_CSS |
| `e9a9c0b` | feat(04-theming-01): replace DEFAULT_CSS with token-driven var() references |
