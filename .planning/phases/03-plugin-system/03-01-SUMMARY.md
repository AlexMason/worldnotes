---
phase: 03-plugin-system
plan: 01
subsystem: plugin-system
tags: [typescript, discriminated-union, plugin-registry, semver, conflict-detection, lifecycle-hooks]

# Dependency graph
requires: []
provides:
  - ContentPlugin, UIPlugin, StoragePlugin interfaces with discriminated union on kind
  - PluginLifecycle interface with optional onInit/onDestroy hooks
  - PluginManifest discriminated union type for exhaustiveness checking
  - PluginRegistry class with Map-based O(1) conflict detection
  - Semver validation at registration time
  - Token type conflict detection for content plugins
  - Slot+priority conflict detection for UI plugins
  - Name-based plugin replacement with onDestroy lifecycle call
  - 36 unit tests covering conflict detection, semver, lifecycle, and edge cases
affects: [03-02, 03-03, 03-04, plugin-migration, tokenizer, renderer, editor-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Discriminated union type narrowing via switch(manifest.kind)
    - Map-based plugin registry with O(1) name and type lookup
    - Atomic registration with rollback on onInit failure
    - Conflict-before-store pattern (validate all tokens/slots first, then commit)

key-files:
  created:
    - src/plugin-registry.ts
    - src/__tests__/plugin-registry.test.ts
  modified:
    - src/types.ts

key-decisions:
  - "PluginRegistry uses 5 internal Maps (contentPlugins, uiPlugins, storagePlugins, tokenTypeOwners, slotAssignments) for O(1) conflict detection"
  - "onInit rollback: if a plugin's onInit throws, the plugin is fully removed from all Maps (atomic registration)"
  - "clear() does NOT call onDestroy — caller manages lifecycle teardown separately"
  - "Content plugin self-overlap (same name, same token types) is allowed — only cross-plugin conflicts throw"
  - "Legacy Plugin interface retained with @deprecated notice for migration compatibility"

patterns-established:
  - "Pattern 1: Discriminated union PluginManifest type with switch(manifest.kind) for exhaustiveness checking"
  - "Pattern 2: Conflict-before-store algorithm — validate all constraints before writing to any Map"
  - "Pattern 3: Semver validation regex /^\d+\.\d+\.\d+(-[\w.]+)?$/ at registration boundary"

requirements-completed: [PLUG-01, PLUG-03, PLUG-06]

# Metrics
duration: 7min
completed: 2026-05-24
---

# Phase 3 Plan 1: PluginManifest Type System & PluginRegistry Summary

**PluginManifest discriminated union types (content/ui/storage) and PluginRegistry class with Map-based O(1) conflict detection, semver validation, and lifecycle hooks — 36 tests passing, zero existing-code changes**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-24T13:00:00Z
- **Completed:** 2026-05-24T13:07:20Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Defined PluginLifecycle, ContentPlugin, UIPlugin, StoragePlugin interfaces and PluginManifest discriminated union type in src/types.ts
- Built PluginRegistry class with 5 internal Maps, semver validation, token type conflict detection, slot+priority conflict detection, and name-based replacement
- Created 36 comprehensive unit tests covering 8 test categories (semver, registration, content conflicts, UI conflicts, replacement, lifecycle, accessors, edge cases)
- All 209 existing tests continue to pass — zero changes to existing code

## Task Commits

Each task was committed atomically:

1. **Task 0: define PluginManifest types** - `41352b8` (feat)
2. **Task 1: create PluginRegistry class** - `2ea31a0` (feat)
3. **Task 2: create PluginRegistry unit tests** - `8f8cb84` (test)

## Files Created/Modified

- `src/types.ts` - Added PluginLifecycle, ContentPlugin, UIPlugin, StoragePlugin interfaces, PluginManifest discriminated union; retained legacy Plugin interface with @deprecated notice
- `src/plugin-registry.ts` - PluginRegistry class: 5 Maps (contentPlugins, uiPlugins, storagePlugins, tokenTypeOwners, slotAssignments), semver validation, conflict detection, lifecycle orchestration, accessors
- `src/__tests__/plugin-registry.test.ts` - 36 tests: semver validation (7), content registration (4), content conflict detection (4), UI conflict detection (4), name replacement (3), lifecycle hooks (4), accessors (4), edge cases (6)

## Decisions Made
- Used 5 internal Maps for O(1) lookup: contentPlugins, uiPlugins, storagePlugins, tokenTypeOwners, slotAssignments — following the RESEARCH.md Pattern 3 algorithm exactly
- onInit rollback: wrapped `manifest.onInit?.()` in try/catch; if it throws, `removeByName()` is called to fully undo registration — plugin is never partially registered
- clear() intentionally does not call onDestroy — follows plan specification that "caller handles teardown"
- Self-overlap allowed: a plugin re-registering with its own name (replacement) passes conflict checks because `owner !== plugin.name` allows self-ownership
- Storage plugins have no conflict detection — they're simple adapter registrations with no tokens or slots to conflict on

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added onInit rollback for atomic registration**
- **Found during:** task 2 (test creation)
- **Issue:** Plan behavior spec says "onInit that throws → error propagates, plugin NOT registered", but initial register() implementation called onInit after storing in Maps without rollback
- **Fix:** Wrapped `manifest.onInit?.()` in try/catch in register(); on throw, calls `removeByName()` to undo registration, then re-throws
- **Files modified:** src/plugin-registry.ts
- **Verification:** Test "onInit that throws does not leave plugin registered (rollback)" passes — confirms Maps are empty after throw
- **Committed in:** 8f8cb84 (task 2 commit)

### Other Adjustments

**2. [Test Fix] Resolved token type collision in test helpers**
- **Found during:** task 2 (test execution)
- **Issue:** makeContentPlugin() defaulted to token type `'test'` — multiple plugins created with this helper triggered conflict detection
- **Fix:** Added explicit unique `tokens` overrides in tests creating multiple plugins (clear() lifecycle test, getAllPlugins test)
- **Files modified:** src/__tests__/plugin-registry.test.ts

**3. [Lint Fix] ESLint no-empty-function on test stubs**
- **Found during:** task 2 (verification)
- **Issue:** makeUIPlugin's `onMount: () => {}` and makeStoragePlugin's `set: async () => {}` violated @typescript-eslint/no-empty-function
- **Fix:** Added parameter annotations and body comments to satisfy the lint rule
- **Files modified:** src/__tests__/plugin-registry.test.ts

---

**Total deviations:** 3 (1 bug fix, 2 test infrastructure adjustments)
**Impact on plan:** All fixes necessary for correctness (atomic registration) and verification pass (lint, test collisions). No scope creep.

## Verification

```bash
# All checks pass:
npm run typecheck   # zero errors
npm run lint        # zero errors, zero warnings
npm test            # 209 tests pass (12 files, including 36 new tests)
```

## Issues Encountered
- `npx vitest` didn't work directly — used `npm test -- --run` instead (project uses vitest via npm script)
- Pre-existing unstaged modifications in `src/editor-state.ts`, `src/__tests__/editor-state.test.ts`, `src/__tests__/navigation.test.ts`, `src/__tests__/renderer.test.ts` — unrelated to this plan, not touched

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- PluginManifest types and PluginRegistry are ready for Plan 02 (migrate 7 existing plugins to ContentPlugin)
- PluginRegistry.register() accepts PluginManifest — existing Plugin objects will need kind+version added to satisfy the ContentPlugin type
- All existing tests pass — migration can proceed without risk of breaking existing functionality
- Legacy Plugin interface retained until all consumers migrate (Plan 03 handles removal)

## Self-Check: PASSED

- [x] `src/plugin-registry.ts` exists
- [x] `src/__tests__/plugin-registry.test.ts` exists
- [x] `.planning/phases/03-plugin-system/03-01-SUMMARY.md` exists
- [x] Commit `41352b8` (Task 0) found
- [x] Commit `2ea31a0` (Task 1) found
- [x] Commit `8f8cb84` (Task 2) found

---
*Phase: 03-plugin-system*
*Completed: 2026-05-24*
