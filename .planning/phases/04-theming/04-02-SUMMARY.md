---
phase: 04-theming
plan: 02
subsystem: theming
tags: [theme, api, documentation, design-tokens]
key-decisions:
  - "EditorOptions.theme is an optional string that replaces the entire <style> element content"
  - "injectStyles(theme?) uses theme ?? DEFAULT_CSS for textContent assignment"
  - "When theme is provided and style already exists, content is replaced (not appended)"
  - "Backward compatible: omitting theme uses DEFAULT_CSS (existing behavior)"
requires: [04-01]
provides:
  - Theme replacement API (EditorOptions.theme)
  - Theme threading through full editor pipeline
  - Complete design token reference documentation
affects: []
tech-stack:
  added: []
  patterns:
    - "Optional parameter threading pattern: EditorOptions → EditorBuilder → mountEditor → createEditorDOM → injectStyles"
    - "Nullish coalescing for fallback: theme ?? DEFAULT_CSS"
key-files:
  created:
    - docs/theming.md (228 lines, complete token reference and theming guide)
  modified:
    - src/types.ts (EditorOptions.theme?: string field)
    - src/editor-dom.ts (injectStyles + createEditorDOM theme param)
    - src/editor.ts (mountEditor threads options.theme)
    - src/__tests__/editor-dom.test.ts (4 new theme tests)
decisions:
  - "Theme CSS replaces existing style content when already injected (enables future dynamic switching)"
  - "All 46 design tokens documented in theming.md with default values and CSS property mappings"
  - "Full theme replacement example provided as working copy-paste code"
metrics:
  duration: 373s (~6.2 min)
  completed-date: 2026-05-24T14:00:58Z
  tests: 247 total (4 new theme tests)
  coverage: "94.68% statements, 85.03% branches, 93.19% functions, 95.98% lines"
---

# Phase 4 Plan 2: Theme Replacement API + Documentation Summary

**One-liner:** Added `EditorOptions.theme` escape hatch for full stylesheet replacement, threaded through the pipeline, with comprehensive 46-token design reference documentation.

## Tasks Executed

### Task 1: Add EditorOptions.theme field and thread through pipeline (TDD)

- **Type:** `auto` (tdd=true)
- **RED phase:** Added 4 failing tests for theme option behavior (theme replaces DEFAULT_CSS, style replacement on re-injection, backward compatibility, idempotency)
- **GREEN phase:** Implemented changes in three files:
  - `src/types.ts`: Added `theme?: string` field to `EditorOptions` with JSDoc and usage example
  - `src/editor-dom.ts`: Modified `injectStyles(theme?)` to accept optional theme parameter, using `theme ?? DEFAULT_CSS` for textContent. Modified `createEditorDOM(container, theme?)` to pass theme through to injectStyles. When theme is provided and style already exists, content is replaced.
  - `src/editor.ts`: Updated `mountEditor()` to pass `options.theme` to `createEditorDOM(container, options.theme)`
- **REFACTOR:** Not needed — implementation is clean and minimal
- **Commits:**
  - `7136cb0` — `test(04-theming-02): add failing tests for EditorOptions.theme threading`
  - `fa9e1bd` — `feat(04-theming-02): add EditorOptions.theme field and thread through pipeline`

### Task 2: Write docs/theming.md

- **Type:** `auto`
- Created `docs/theming.md` (228 lines) with:
  - Two-tier theming overview (token overrides + full replacement)
  - Quick-start example: override `--wn-color-accent` on parent element
  - Complete design token reference tables (23 colors, 8 typography, 6 spacing, 3 radii, 2 shadows, 2 transitions, 2 misc)
  - Light theme token override example (full CSS block)
  - Full theme replacement example using `EditorOptions.theme` (working code)
  - CSS class reference (25 wn-* prefixed classes with elements and purposes)
  - "How It Works" section explaining injection, cascade, overrides, and replacement
- **Coverage verified:** All 46 tokens from DEFAULT_TOKENS are documented with defaults and property mappings
- **Commit:** `262eb54` — `docs(04-theming-02): add design token reference and theming guide`

### Task 3: Verify full CI gate and backward compatibility

- **Type:** `auto`
- Full CI pipeline passed:
  - TypeScript typecheck: PASSED (zero errors)
  - ESLint: PASSED (zero errors)
  - Test coverage: 94.68% statements, 85.03% branches, 93.19% functions, 95.98% lines (all above 80% threshold)
  - Build: PASSED (worldnotes.js 34.29 kB, worldnotes.umd.cjs 24.86 kB)
- Backward compatibility: Confirmed — theme field is optional, `undefined ?? DEFAULT_CSS` resolves to DEFAULT_CSS
- **Commit:** `6461210` — `chore(04-theming-02): update dist/ build output with theme option changes`

## Deviations from Plan

None — plan executed exactly as written. All three tasks followed the specified action steps precisely.

## Requirement Completion

| Requirement | Status |
|-------------|--------|
| THEME-04: Full theme replacement via EditorOptions.theme | COMPLETE |
| THEME-05: Design token reference in docs/theming.md | COMPLETE |

## Self-Check: PASSED

- `src/types.ts` — EditorOptions.theme field exists ✓
- `src/editor-dom.ts` — injectStyles(theme?) and createEditorDOM(container, theme?) ✓
- `src/editor.ts` — mountEditor passes options.theme ✓
- `docs/theming.md` — exists, 228 lines, all 46 tokens documented ✓
- `src/__tests__/editor-dom.test.ts` — 4 new theme tests ✓
- `dist/` — build output updated with theme changes ✓
- All 247 tests pass, typecheck + lint clean, build succeeds ✓
