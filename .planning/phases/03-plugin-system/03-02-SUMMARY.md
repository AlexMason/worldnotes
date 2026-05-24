---
phase: 03-plugin-system
plan: 02
subsystem: plugins
tags: [migration, types, content-plugin, additive]
requires: [03-01 (PluginManifest types)]
provides: [ContentPlugin-migrated-plugins]
affects: [03-03 (EditorBuilder integration)]
duration: "2m 30s"
completed: "2026-05-24T13:13:33Z"
key-decisions:
  - "All 7 plugins migrated in-place per D-07 (not wrapped)"
  - "kind: 'content' as const ensures discriminated union narrowing"
  - "version: '1.0.0' added as hardcoded string per D-02"
  - "Test file unchanged — ContentPlugin import unused, would cause lint error"
---

# Phase 3 Plan 2: Plugin Migration to ContentPlugin Summary

Migrated all 7 existing built-in plugins from the old `Plugin` interface to the new `ContentPlugin` interface by adding `kind: 'content'` and `version: '1.0.0'` fields. Pure type migration — no logic, rendering, or token pattern changes.

## Tasks Completed

| # | Name | Type | Commit | Files |
|---|------|------|--------|-------|
| 0 | Migrate 7 plugin source files to ContentPlugin | auto | `d364843` | `src/plugins/headings.ts`, `src/plugins/inline.ts`, `src/plugins/wikiLink.ts` |
| 1 | Update defaults.ts and plugins/index.ts | auto | `33a6799` | `src/plugins/defaults.ts` |
| 2 | Update existing tests for ContentPlugin types | auto | n/a (no changes needed) | `src/__tests__/plugins.test.ts` (verified, zero changes) |

## Changes Summary

### Plugin Source Files (Task 0)

Each of the 7 plugins received exactly 2 additive fields:
- `kind: 'content' as const` — enables discriminated union narrowing
- `version: '1.0.0'` — semver string per D-02

| Plugin | File | Changes |
|--------|------|---------|
| headingsPlugin | `src/plugins/headings.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |
| boldPlugin | `src/plugins/inline.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |
| italicPlugin | `src/plugins/inline.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |
| inlineCodePlugin | `src/plugins/inline.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |
| blockquotePlugin | `src/plugins/inline.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |
| hrPlugin | `src/plugins/inline.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |
| wikiLinkPlugin | `src/plugins/wikiLink.ts` | Import: `Plugin` → `ContentPlugin`; added `kind`, `version` |

No render functions, token patterns, `onNavigate` handlers, or `withPunct` helper were modified.

### Defaults File (Task 1)

- `src/plugins/defaults.ts`: Import changed from `Plugin` to `ContentPlugin`; type annotation changed from `Plugin[]` to `ContentPlugin[]`
- Array ordering preserved per D-09: `headingsPlugin, hrPlugin, blockquotePlugin, wikiLinkPlugin, boldPlugin, italicPlugin, inlineCodePlugin`

### Index File (Task 1)

- `src/plugins/index.ts`: No changes needed — re-exports automatically pick up updated types

### Tests (Task 2)

- `src/__tests__/plugins.test.ts`: No changes needed
- All 22 existing plugin tests pass without modification
- Adding `ContentPlugin` to the type import would be unused (the helper uses an inline type and plugin imports are structurally typed), causing a lint error

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS — zero errors |
| `npx vitest run src/__tests__/plugins.test.ts` | PASS — 22 tests passed |
| `npm test` (full suite) | PASS — 209 tests passed across 12 files |
| `npm run lint` | PASS on modified files |
| `grep -c "kind: 'content'" src/plugins/headings.ts` | 1 |
| `grep -c "kind: 'content'" src/plugins/inline.ts` | 5 |
| `grep -c "kind: 'content'" src/plugins/wikiLink.ts` | 1 |
| `grep -c "version: '1.0.0'" src/plugins/*.ts` | 7 total across all files |
| `grep -c "ContentPlugin\[']" src/plugins/defaults.ts` | 1 |
| Plugin ordering in defaults.ts | Preserved: headings, hr, blockquote, wiki-link, bold, italic, inline-code |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ContentPlugin import in plugins.test.ts would be unused**
- **Found during:** task 2
- **Issue:** Plan instructed adding `ContentPlugin` to the test file's type import, but the type is never referenced in the file (the `renderPlugin` helper uses an inline type, and plugins are imported as values)
- **Fix:** Removed the unused import to avoid `@typescript-eslint/no-unused-vars` lint error
- **Files modified:** `src/__tests__/plugins.test.ts` (rolled back to original state)
- **Result:** Zero changes to test file; all tests pass; typecheck and lint clean

## Known Stubs

None — this is a pure type migration; no placeholder values or incomplete wiring.

## Threat Flags

None — this plan is purely additive (adding `kind` and `version` fields to existing plugin objects). No new endpoints, auth paths, or trust boundaries are introduced.

## Threat Model Compliance

| Threat ID | Category | Disposition | Status |
|-----------|----------|-------------|--------|
| T-03-05 | Tampering (version strings) | accept | Version is `'1.0.0'` hardcoded — no runtime tampering vector |
| T-03-06 | Information Disclosure (token patterns) | accept | Token patterns unchanged from pre-migration |

## Key Files

| File | Status |
|------|--------|
| `src/plugins/headings.ts` | Modified — 1 plugin migrated |
| `src/plugins/inline.ts` | Modified — 5 plugins migrated |
| `src/plugins/wikiLink.ts` | Modified — 1 plugin migrated |
| `src/plugins/defaults.ts` | Modified — ContentPlugin[] type |
| `src/plugins/index.ts` | Unchanged — re-exports auto-updated |
| `src/__tests__/plugins.test.ts` | Unchanged — structurally compatible |

## Self-Check: PASSED

All files and commits verified:
- `src/plugins/headings.ts` — FOUND
- `src/plugins/inline.ts` — FOUND
- `src/plugins/wikiLink.ts` — FOUND
- `src/plugins/defaults.ts` — FOUND
- `src/plugins/index.ts` — FOUND
- `src/__tests__/plugins.test.ts` — FOUND
- `.planning/phases/03-plugin-system/03-02-SUMMARY.md` — FOUND
- Commit `33a6799` (defaults.ts update) — FOUND
- Commit `d364843` (plugin migration) — FOUND
