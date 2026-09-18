# Status Pages Design

## Overview

Add support for custom status pages (404 Not Found, 403 Forbidden, extensible to other codes). Status pages are regular wiki pages that users can create and edit. When a navigation error occurs, the editor redirects to the configured status page instead of silently auto-creating or failing.

## New Types

### PermissionError (`src/types.ts`)

```typescript
export class PermissionError extends Error {
  constructor(message?: string) {
    super(message ?? 'Permission denied')
    this.name = 'PermissionError'
  }
}
```

Thrown by `StorageAdapter.get()` when the caller lacks read access. Caught in `loadPage()` to trigger 403 redirect.

### EditorOptions additions (`src/types.ts`)

```typescript
export interface EditorOptions {
  // ... existing fields ...

  /**
   * Map of HTTP-style status codes to wiki page names.
   * Defaults: { 404: '404', 403: '403' }
   */
  statusPages?: Record<number, string>

  /**
   * Show the "Create page?" overlay on the 404 page.
   * Default: true.
   */
  showCreateOverlay?: boolean
}
```

### EditorState addition (`src/editor-state.ts`)

```typescript
/** The page name that was requested before redirecting to 404. null when not on a 404 redirect. */
pendingRequestedPage: string | null

// getter/setter:
getPendingRequestedPage(): string | null
setPendingRequestedPage(page: string | null): void
```

**Lifecycle rule:** Cleared at the end of any `navigateToPage()` call whose target is not a status page. Preserved when navigating between status pages (prevents premature clearing if status pages chain, e.g., 404 → 403).

## Navigation Flow Changes (`src/editor-navigation.ts`)

### navigateToPage(page)

Current: if page not in Y.Doc or storage → auto-create with `# ${page}\n\n`.

New:

```
if not in Y.Doc and not in storage:
    set state.pendingRequestedPage = page
    navigate to statusPages[404]  // resolves via navigateToStatusPage(404)
    return
```

### loadPage(page)

Wrap `storage.get(page)` in try/catch:

```
try:
    stored = await storage.get(page)
catch PermissionError:
    navigate to statusPages[403]
    return
catch other: rethrow
```

### navigateToStatusPage(code) — new internal helper

1. Resolve page name: `options.statusPages?.[code] ?? String(code)`
2. If that page doesn't exist in Y.Doc or storage → auto-create with default content
3. Navigate to it normally (sets trail, loads content, renders)

### Default content for auto-created status pages

**404 page:** `# Page Not Found\n\n` (minimal heading, user customizes)
**403 page:** `# Access Denied\n\n`
**Any other code:** `# Error ${code}\n\n`

## Create Overlay UI

### When shown

- Current page equals `statusPages[404]`
- `state.pendingRequestedPage` is not null
- `options.showCreateOverlay !== false`

### What it renders

A non-editable banner above the editor content area:

> **Page "{requestedPage}" not found.** [Create]

### Behavior on click

Clears `state.pendingRequestedPage`, then navigates to the requested page. Since `pendingRequestedPage` is now null, the navigation succeeds normally (page doesn't exist → auto-create).

### Rendering approach

Injected as a DOM element by the render/lifecycle step (`editor-lifecycle.ts` or `editor-render.ts`). Styled with `--wn-*` design tokens. Removed when `pendingRequestedPage` is cleared (any navigation away from the 404 page clears it).

### 403 page

No overlay. Just displays the 403 page content.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Status page itself doesn't exist | Auto-created with default content on first redirect |
| User navigates directly to status pages[404] (not via redirect) | Renders normally, no overlay (pendingRequestedPage is null) |
| User edits the 404 page | Works like any other page; overlay sits above content |
| Navigating away from 404 page to a non-status page | pendingRequestedPage cleared at end of navigateToPage() when target is not a status page |
| Navigating between status pages | pendingRequestedPage preserved (e.g., 404 → 403 chain) |
| showCreateOverlay is false | 404 page renders normally, no banner. User can add their own wikilink to create the page |
| PermissionError on status page itself | Falls through to auto-create (status pages bypass permission checks) |
| statusPages not configured | Defaults applied: { 404: '404', 403: '403' } |

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `PermissionError` class, `statusPages` and `showCreateOverlay` to `EditorOptions` |
| `src/editor-state.ts` | Add `pendingRequestedPage` field, getter, setter |
| `src/editor-navigation.ts` | Modify `navigateToPage()`, `loadPage()`, add `navigateToStatusPage()` |
| `src/editor-lifecycle.ts` or `src/editor-render.ts` | Render create overlay when applicable |
| `src/editor.ts` | Pass new options through EditorBuilder → mountEditor |
| `src/index.ts` | Export `PermissionError` |
| `src/__tests__/editor-navigation.test.ts` | Tests for status page redirects |
| `src/__tests__/plugins.test.ts` | Wikilink click → 404 redirect test |
| `docs/api.md` | Document new options and PermissionError |
