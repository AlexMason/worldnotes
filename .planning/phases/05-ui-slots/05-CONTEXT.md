# Phase 5: UI Extension Slots - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

## Phase Boundary

Add a toolbar slot to the editor DOM where UI plugins can mount content. Plugin manifests declare which slots they populate. Conflicts detected at registration. Plugin destruction cleanly removes mounted DOM.

## Implementation Decisions

### Toolbar Slot
- **D-01:** A single `<div class="wn-toolbar">` is added to the editor chrome, between the topbar (breadcrumbs) and the editor area. This is the only UI slot in v1.
- **D-02:** The toolbar is rendered unconditionally — always present in the DOM, even when no UI plugins are registered. Empty state: a zero-height div that doesn't affect layout.

### Plugin Integration
- **D-03:** UIPlugin manifest (already defined in Phase 3) declares `slots: string[]` — an array of slot names (e.g., `['wn-toolbar']`) this plugin populates.
- **D-04:** UIPlugin `onMount(element: HTMLElement)` receives the slot container DOM element. The plugin appends its own DOM as children. `onDestroy()` is called when the plugin is removed — the plugin is responsible for cleaning up its DOM.
- **D-05:** Multiple UI plugins can populate the same slot. They render in registration order. The slot container is a simple `div` — no special stacking or z-index management.

### Conflict Detection
- **D-06:** Two UIPlugins claiming the same slot with the same `priority` value produce a registration error. This is already implemented in PluginRegistry (Phase 3). Phase 5 just needs to test it end-to-end with actual DOM slots.
- **D-07:** `priority` is an optional number field on UIPlugin manifest (default 0). Lower numbers render first (closer to the top of the slot container). Used for ordering within a slot.

### Plugin Lifecycle
- **D-08:** When a UIPlugin is registered (via `editor.use()`), its `onMount` is called immediately with the slot element if the editor is already mounted. If the editor hasn't been mounted yet, `onMount` is called during the editor mount lifecycle.
- **D-09:** When a UIPlugin is replaced (same name, new manifest), the old plugin's `onDestroy` is called before the new plugin's `onMount`.

### OpenCode's Discretion
- Exact DOM structure and CSS for `wn-toolbar` (flexbox row, positioning)
- Whether toolbar slot is in `editor-dom.ts` (DOM construction) or a separate function
- `priority` ordering implementation within PluginRegistry
- Slot mounting timing relative to editor lifecycle hooks

## Specific Ideas

No specific requirements — open to standard approaches.

## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — UI-01 through UI-04
- `.planning/ROADMAP.md` — Phase 5 goal, 4 success criteria

### Prior Phases
- `.planning/phases/03-plugin-system/03-CONTEXT.md` — PluginRegistry, UIPlugin type, conflict detection
- `src/plugin-registry.ts` — Existing PluginRegistry with UI conflict detection
- `src/types.ts` — UIPlugin interface (kind: 'ui', slots, onMount, onDestroy)

### Codebase
- `src/editor-dom.ts` — DOM construction (add toolbar slot)
- `src/editor-lifecycle.ts` — Mount lifecycle (call onMount for UI plugins)

## Existing Code Insights

### Reusable Assets
- **PluginRegistry** (`src/plugin-registry.ts`): Already has `uiPlugins` Map, `register()` with conflict detection for UI plugins. Phase 5 just extends with `priority` ordering and slot mounting.
- **UIPlugin type** (`src/types.ts`): Already defined with `kind: 'ui'`, `slots`, `onMount`, `onDestroy`. No structural changes needed.

### Integration Points
- **`createEditorDOM()`** (`src/editor-dom.ts`): Add `<div class="wn-toolbar">` between topbar and editor-wrap.
- **`mount()` lifecycle** (`src/editor-lifecycle.ts`): After DOM construction, iterate registered UI plugins and call `onMount` with their slot elements.
- **`destroy()`** (`src/editor-lifecycle.ts`): Call `onDestroy` on all UI plugins before clearing container.
- **`EditorBuilder.use()`** (`src/editor.ts`): When registering a UIPlugin after mount, call `onMount` immediately.

## Deferred Ideas

- Additional UI slots (sidebar-left, sidebar-right, status-bar) — v2
- Floating/bubble menu slots — v2
- Slot visibility toggling — v2 (plugins manage their own visibility)

---
*Phase: 05-ui-slots*
*Context gathered: 2026-05-23*
