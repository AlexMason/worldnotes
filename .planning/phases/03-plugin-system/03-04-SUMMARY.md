---
phase: 03-plugin-system
plan: 04
subsystem: plugins
tags: [typescript, content-plugin, strikethrough, link, markdown, formatting]

# Dependency graph
requires:
  - phase: 03-02
    provides: "PluginManifest discriminated union, ContentPlugin interface, version validation"
  - phase: 03-03
    provides: "PluginRegistry, EditorBuilder.use() accepting PluginManifest, buildPluginMap() dispatch"
provides:
  - "strikethroughPlugin: ~~text~~ formatting with punct markers and line-through CSS"
  - "linkPlugin: [text](url) external anchor links and internal wiki-page navigation"
  - "Public API exports for PluginManifest, ContentPlugin, UIPlugin, StoragePlugin"
  - "Updated api.md documentation with lifecycle hooks, version validation, type tables"
affects: [ui, formatting, docs]

# Tech tracking
tech-stack:
  added: []
  patterns: ["withPunct helper pattern for strikethrough (reused from bold/italic)", "dataset.raw for cursor fidelity (Pitfall 4)", "internal vs external URL detection via :// absence"]

key-files:
  created:
    - src/plugins/strikethrough.ts
    - src/plugins/link.ts
  modified:
    - src/plugins/inline.ts
    - src/plugins/defaults.ts
    - src/plugins/index.ts
    - src/editor-dom.ts
    - src/index.ts
    - docs/api.md

key-decisions:
  - "Strikethrough uses withPunct helper, following bold/italic pattern exactly (D-10)"
  - "Link plugin internal detection based on absence of :// or // prefix (D-11)"
  - "Link plugin reuses wn-wiki-link class for internal links, consistent styling"
  - "Removed deprecated Plugin type from public API — PluginManifest union is the migration point (D-08)"

patterns-established:
  - "strikethrough rendering: withPunct('wn-strikethrough', '~~', text) + dataset.raw on outer span"
  - "link rendering: external = <a> with target=_blank, internal = <span> with data-page"
  - "onNavigate return true = suppressed default, false = let browser handle"

requirements-completed: [FORMAT-01, FORMAT-02, FORMAT-03, PLUG-05]

# Metrics
duration: 10min
completed: 2026-05-24
---

# Phase 3 Plan 4: Strikethrough & Link Plugins + Public API Types

**Two new ContentPlugin implementations (strikethrough, link) with comprehensive tests, CSS styling, and public API type exports**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-24T09:29:00Z
- **Completed:** 2026-05-24T09:45:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Created strikethroughPlugin rendering ~~text~~ with punct markers and line-through CSS, following bold/italic pattern
- Created linkPlugin rendering [text](url) as external anchor tags (new tab) or internal wiki-page spans with navigation
- Registered both plugins in defaultPlugins in correct order: wiki-link → link → bold → italic → strikethrough → inline-code
- Added 17 new tests covering DOM structure, tokenization patterns, renderer dispatch, and onNavigate behavior
- Exported PluginManifest, ContentPlugin, UIPlugin, StoragePlugin types from package entry point
- Updated docs/api.md with lifecycle hooks, version validation, type tables, and dataset.raw guidance

## Task Commits

Each task was committed atomically:

1. **Task 0: create strikethroughPlugin and linkPlugin source files** - `ecbbdf3` (feat)
2. **Task 1: add tests for strikethrough and link plugins** - `3b7a18a` (test)
3. **Task 2: update public API exports and docs/api.md** - `20b5907` (feat)

## Files Created/Modified
- `src/plugins/strikethrough.ts` - New plugin: ~~text~~ renders with punct and line-through
- `src/plugins/link.ts` - New plugin: [text](url) external/anchor or internal/wiki-span
- `src/plugins/inline.ts` - Exported withPunct helper for reuse
- `src/plugins/defaults.ts` - Registered linkPlugin + strikethroughPlugin in correct order
- `src/plugins/index.ts` - Re-exported new plugins from barrel
- `src/editor-dom.ts` - Added .wn-strikethrough and .wn-link CSS styles
- `src/index.ts` - Exported PluginManifest, ContentPlugin, UIPlugin, StoragePlugin types; removed deprecated Plugin
- `src/__tests__/plugins.test.ts` - Added 8 tests (strikethrough render + link render/onNavigate)
- `src/__tests__/tokenizer.test.ts` - Added 8 tests (strikethrough + link token patterns, priority)
- `src/__tests__/renderer.test.ts` - Added 1 test (link token dispatch)
- `docs/api.md` - Documented PluginManifest types, lifecycle hooks, version validation

## Decisions Made
- Strikethrough uses exported `withPunct` helper from inline.ts — same DOM structure as bold/italic
- Link internal detection: `!url.includes('://') && !url.startsWith('//')` — protocol-relative URLs are external
- Internal links reuse `wn-wiki-link` class for consistent visual styling with wiki links
- `onNavigate` returns `true` for internal (suppressed, we navigate) and `false` for external (browser handles `<a>` click)
- Plugin registration order: `linkPlugin` after `wikiLinkPlugin` (Pitfall 1: `[[page]]` before `[text](url)`)
- Removed deprecated `Plugin` type from public API — `PluginManifest` union is the migration point per D-08

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all typecheck, lint, test, and build checks passed on first run.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: external-url-link | src/plugins/link.ts | linkPlugin creates `<a href>` from user-provided URLs with `target="_blank"` and `rel="noopener noreferrer"` — mitigated per T-03-12 |
| threat_flag: internal-external-detection | src/plugins/link.ts | URL classification based on `://` absence — edge case `https:evil` detected as internal per T-03-13 (accepted risk) |

## Next Phase Readiness
- All 4 FORMAT requirements (FORMAT-01 through FORMAT-03) completed
- PLUG-05 (public API types + docs) completed
- Phase 3 now has 9 built-in plugins: headings, hr, blockquote, wiki-link, link, bold, italic, strikethrough, inline-code
- PluginManifest type system is complete and publicly exported
- Ready for Phase 5 UI slots or Phase 4 testing/fixes

---
*Phase: 03-plugin-system*
*Completed: 2026-05-24*
