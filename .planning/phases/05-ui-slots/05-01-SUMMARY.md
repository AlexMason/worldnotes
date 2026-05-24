---
phase: 05-ui-slots
plan: 01
subsystem: ui
tags: [toolbar, uiplugin, priority-sort, lifecycle, dom-slots]

# Dependency graph
requires:
  - phase: 03-plugin-system
    provides: PluginRegistry with UI conflict detection, UIPlugin type
  - phase: 04-theming
    provides: CSS design tokens, token-driven stylesheet
provides:
  - Toolbar DOM slot (wn-toolbar) between topbar and editor-wrap
  - PluginRegistry.getUIPluginsForSlot(slot) — priority-sorted accessor
  - UI plugin lifecycle wiring (onMount during mount, onDestroy during destroy)
  - Post-mount UI plugin registration in EditorBuilder.use()
affects: [any-future-ui-slots, plugin-authors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UI plugins mount into named DOM slots via onMount(slotEl) hook"
    - "Priority-based ordering within a slot (lowest first)"
    - "Post-mount registration: EditorBuilder stores slot element refs for immediate mounting"
    - "onDestroy try/catch pattern applied to both content and UI plugins"

key-files:
  created: []
  modified:
    - src/editor-dom.ts (EditorDOM.toolbar + wn-toolbar CSS)
    - src/plugin-registry.ts (getUIPluginsForSlot method)
    - src/editor-lifecycle.ts (uiPlugins param, mount/teardown lifecycle)
    - src/editor.ts (post-mount UI registration, _slotElements, _mounted)
    - src/__tests__/editor-dom.test.ts (4 toolbar slot tests)
    - src/__tests__/plugin-registry.test.ts (5 getUIPluginsForSlot tests)
    - src/__tests__/editor-lifecycle.test.ts (mockDOM toolbar + 5 UI lifecycle tests)
    - src/__tests__/editor-render.test.ts (mockDOM toolbar fix)
    - src/__tests__/editor-navigation.test.ts (mockDOM toolbar fix)
    - docs/architecture.md (toolbar slot, UI plugin extension boundary, construction order)

key-decisions:
  - "Toolbar div rendered unconditionally with zero-height when empty (D-02)"
  - "CSS uses flex row with gap: 6px, flex-shrink: 0 for horizontal plugin layout"
  - "Priority sorting (ascending) in mountEditor rather than lifecycle to keep lifecycle generic"
  - "Post-mount slot elements captured via querySelector on EditorBuilder.el after mount"

patterns-established:
  - "UI plugin mounting: slotElements map built in lifecycle, iterated per-plugin per-slot"
  - "Post-mount registration: _mounted flag + _slotElements map checked in EditorBuilder.use()"
  - "onDestroy teardown ordered: content plugins first, then UI plugins, then DOM clear"

requirements-completed: [UI-01, UI-02, UI-03, UI-04]

# Metrics
duration: 8min
completed: 2026-05-24
---

# Phase 5 Plan 1: UI Extension Slots Summary

**Toolbar DOM slot with priority-sorted UI plugin mounting and post-mount registration**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-24T14:18:34Z
- **Completed:** 2026-05-24T14:26:45Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Added `<div class="wn-toolbar">` to editor DOM between topbar and editor-wrap with zero-height empty state
- Added `PluginRegistry.getUIPluginsForSlot(slot)` returning plugins sorted by priority ascending
- Wired UI plugin lifecycle: `onMount(slotEl)` during editor mount, `onDestroy()` during teardown with try/catch
- EditorBuilder handles post-mount UI plugin registration — calls `onMount` immediately if editor already mounted
- Same-name UIPlugin replacement correctly calls old `onDestroy` before new `onMount` (via PluginRegistry.removeByName)

## Task Commits

Each task was committed atomically:

| # | Task | Commits |
|---|------|---------|
| 1 | Add toolbar slot to editor DOM | `9333bdc` (test: RED), `20adf7b` (feat: GREEN) |
| 2 | Add getUIPluginsForSlot + wire lifecycle | `a5fc3ba` (test: RED), `0701f64` (feat: GREEN) |
| 3 | Post-mount registration + lifecycle tests + docs | `a09172e` (feat: GREEN) |
| — | Fix mockDOM toolbar in render/navigation tests | `7651041` (fix: Rule 1) |
| — | Updated dist/ build output | `c8d978e` (chore) |

## Files Created/Modified
- `src/editor-dom.ts` - Added toolbar field to EditorDOM interface, toolbar div creation between topbar/editorWrap, `.wn-toolbar` CSS rule
- `src/plugin-registry.ts` - Added `getUIPluginsForSlot(slot)` with priority-sorted output
- `src/editor-lifecycle.ts` - Added `uiPlugins: UIPlugin[]` parameter, onMount/onDestroy lifecycle wiring
- `src/editor.ts` - Added `_mounted`/`_slotElements` fields, post-mount UI registration in `use()`, priority-sorted plugin pass-through
- `src/__tests__/editor-dom.test.ts` - 4 toolbar slot tests (existence, DOM position, zero-height empty, CSS)
- `src/__tests__/plugin-registry.test.ts` - 5 getUIPluginsForSlot tests (sorting, filtering, edge cases)
- `src/__tests__/editor-lifecycle.test.ts` - mockDOM update + 5 UI lifecycle tests (mount, destroy, error handling, unknown slots)
- `src/__tests__/editor-render.test.ts` - mockDOM toolbar field fix
- `src/__tests__/editor-navigation.test.ts` - mockDOM toolbar field fix
- `docs/architecture.md` - Toolbar slot in module table, UI plugin extension boundary, construction order update

## Decisions Made
- Followed all 9 decisions from 05-CONTEXT.md (D-01 through D-09)
- Priority sorting placed in `EditorBuilder.mount()` rather than `createEditorLifecycle` — keeps lifecycle generic
- Post-mount slot elements queried via `this.el.querySelector('.wn-toolbar')` — simple, no cross-module coupling
- `getUIPluginsForSlot` uses `.filter(Boolean)` safety check in case slot assignments linger after plugin removal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing toolbar field in render/navigation test mockDOM functions**
- **Found during:** task 3 (typecheck after all tasks)
- **Issue:** `TS2741: Property 'toolbar' is missing in type` — editor-render.test.ts and editor-navigation.test.ts had inline `mockDOM()` functions without the new `toolbar` field
- **Fix:** Added toolbar div creation + `container.appendChild(toolbar)` + added `toolbar` to return object in both test files
- **Files modified:** `src/__tests__/editor-render.test.ts`, `src/__tests__/editor-navigation.test.ts`
- **Verification:** `npm run typecheck` passes with zero errors
- **Committed in:** `7651041`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test infrastructure update required by EditorDOM type change. No scope creep.

## Issues Encountered
None — plan executed cleanly with one automated test fix.

## Verification

All CI gates passed:
- **typecheck:** Zero errors
- **lint:** Zero errors
- **test:coverage:** 261 tests pass, 82.69% branches (>80% threshold)
- **build:** Bundle produced successfully

## Next Phase Readiness
- Phase 5 complete — this is the LAST plan of the LAST phase
- All 4 UI requirements (UI-01 through UI-04) satisfied
- UIPlugin contract fully functional: slot declaration, priority ordering, conflict detection, lifecycle hooks, post-mount registration

---

*Phase: 05-ui-slots*
*Completed: 2026-05-24*
