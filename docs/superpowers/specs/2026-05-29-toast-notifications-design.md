# Toast Notifications Design

## Overview

Add a generalized toast notification system that follows the existing 404 overlay visual style. Supports four types (info, success, warning, error), configurable corner positioning, optional action buttons, stacking, dismiss by user or timeout, and full themability via `--wn-*` design tokens. The existing 404 "Create page?" overlay is migrated to use this system instead of being a standalone hardcoded element.

## New Types (`src/types.ts`)

```typescript
type ToastType = 'info' | 'success' | 'warning' | 'error'

type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastOptions {
  /** Fixed ID for idempotent toasts (e.g., "wn-404"). Auto-generated if omitted. */
  id?: string
  message: string
  /** Default: 'info' */
  type?: ToastType
  /** Duration in ms. Default: 4000. Set 0 for persistent (requires manual dismiss or action click). */
  duration?: number
  action?: ToastAction
  /** Default: 'top-right' */
  position?: ToastPosition
}
```

### EditorInstance additions (`src/types.ts`)

```typescript
interface EditorInstance {
  // ... existing ...
  /** Show a toast notification. Returns the toast ID. If an id is provided and a toast
   *  with that id is already visible, the call is a no-op (idempotent). */
  notify(options: ToastOptions): string
  /** Dismiss a specific toast by ID. */
  dismiss(toastId: string): void
}
```

## Design Tokens (`src/editor-dom.ts`)

Add 7 new tokens to the `DEFAULT_TOKENS` constant on `.wn-root`:

| Token | Purpose | Default |
|-------|---------|---------|
| `--wn-toast-bg` | Background (info) | `#17171e` |
| `--wn-toast-bg-success` | Background (success) | `#14241a` |
| `--wn-toast-bg-warning` | Background (warning) | `#24201a` |
| `--wn-toast-bg-error` | Background (error) | `#24141a` |
| `--wn-toast-border` | Border | `#332d6a` |
| `--wn-toast-radius` | Border radius | `4px` |
| `--wn-toast-color` | Text color | `#c9c9d0` |

The info toast defaults match the 404 overlay visually. Consumers override tokens via CSS cascade on `.wn-root`.

## CSS Classes (appended to `<style id="worldnotes-styles">`)

### Container

```css
.wn-toast-container {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 380px;
}
.wn-toast-container--top-right    { top: 12px; right: 12px; align-items: flex-end; }
.wn-toast-container--top-left     { top: 12px; left: 12px; align-items: flex-start; }
.wn-toast-container--bottom-right { bottom: 12px; right: 12px; align-items: flex-end; }
.wn-toast-container--bottom-left  { bottom: 12px; left: 12px; align-items: flex-start; }
```

### Individual toast

```css
.wn-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border: 0.5px solid var(--wn-toast-border, #332d6a);
  border-radius: var(--wn-toast-radius, 4px);
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-small, 12px);
  color: var(--wn-toast-color, #c9c9d0);
  background: var(--wn-toast-bg, #17171e);
  min-width: 260px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.wn-toast--success { background: var(--wn-toast-bg-success, #14241a); }
.wn-toast--warning { background: var(--wn-toast-bg-warning, #24201a); }
.wn-toast--error   { background: var(--wn-toast-bg-error, #24141a); }
```

### Sub-elements

```css
.wn-toast__icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  line-height: 14px;
  font-size: var(--wn-font-size-small, 12px);
}
.wn-toast__message {
  flex: 1;
  word-break: break-word;
  line-height: 1.4;
}
.wn-toast__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}
.wn-toast__action-btn {
  padding: 2px 8px;
  background: var(--wn-color-wiki-link-bg, #16142a);
  color: var(--wn-color-wiki-link, #9b8fe8);
  border: 0.5px solid var(--wn-color-wiki-link-border, #332d6a);
  border-radius: var(--wn-radius-wiki-link, 4px);
  cursor: pointer;
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-small, 12px);
  white-space: nowrap;
}
.wn-toast__action-btn:hover {
  background: var(--wn-color-wiki-link-bg-hover, #221e42);
  color: var(--wn-color-wiki-link-hover, #bbb3f8);
}
.wn-toast__close-btn {
  padding: 1px 4px;
  background: none;
  color: var(--wn-color-fg-muted, #4a4a5e);
  border: none;
  cursor: pointer;
  font-family: var(--wn-font-mono, monospace);
  font-size: 15px;
  line-height: 1;
}
.wn-toast__close-btn:hover {
  color: var(--wn-color-fg, #c9c9d0);
}
```

### Animations

```css
.wn-toast {
  animation: wn-toast-enter 0.2s ease-out;
}
.wn-toast--exiting {
  animation: wn-toast-exit 0.15s ease-in forwards;
  pointer-events: none;
}

@keyframes wn-toast-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wn-toast-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
```

Top and bottom toasts enter from their respective directions via container-aligned animations. Exit animation is always fade + shrink (direction-agnostic).

## Module Design (`src/notifications.ts`)

### Internal state

```typescript
interface ToastState {
  id: string
  options: ToastOptions
  timer: ReturnType<typeof setTimeout> | null
  el: HTMLElement
}
```

### Exported factory

```typescript
interface NotificationSystem {
  notify(options: ToastOptions): string
  dismiss(toastId: string): void
  destroy(): void
}

function createNotificationSystem(rootEl: HTMLElement): NotificationSystem
```

### Container management

- Four containers (one per corner), created lazily on first `notify()` call for that position
- Each container is a `<div class="wn-toast-container wn-toast-container--{position}">` appended to `rootEl`
- `destroy()` removes all containers from DOM

### notify()

1. If `options.id` is provided and a toast with that ID is already visible, return the ID (no-op)
2. Generate an ID if none provided (`"toast-N"` counter)
3. Build the DOM element:
   - Icon span (type character: i ✓ ⚠ ✗)
   - Message span
   - If `action`: action button with `onClick` handler -> auto-dismisses toast after click
   - Close button x -> calls `dismiss(id)`
4. Append to the container for `options.position`
5. If `duration > 0`: set `setTimeout` to call `dismiss(id)` after `duration` ms
6. If `duration === 0`: persistent, no auto-dismiss
7. Cap visible toasts per position at 5 (remove oldest when exceeded)
8. Return the toast ID

### dismiss()

1. Find the toast state by ID
2. Clear its timer if set
3. Add `.wn-toast--exiting` class to trigger exit animation
4. After animation duration (150ms): remove element from DOM, remove from state array

### destroy()

1. Call `dismiss()` on all active toasts (synchronously, skip animations)
2. Remove all containers from DOM

## 404 Overlay Migration (`src/editor-render.ts`)

### Removed

- `renderCreateOverlay()` function (lines 96-159)
- `dismissOverlay()` function (lines 100-103)
- `OVERLAY_CLASS` constant
- Call to `renderCreateOverlay()` at end of each render cycle

### Added

In the render cycle, after checking conditions (currentPage === statusPages[404] && pendingRequestedPage && showCreateOverlay), call:

```typescript
notifications.notify({
  id: 'wn-404',
  message: `Page "${requestedPage}" not found.`,
  type: 'info',
  duration: 0,
  action: {
    label: 'Create',
    onClick: () => {
      const pageName = state.getPendingRequestedPage()
      if (!pageName) return
      const yDocState = state.getYDocState()
      const ytext = yDocState.getPage(pageName)
      if (ytext.toString() === '') {
        ytext.insert(0, `# ${pageName}\n\n`)
      }
      state.setPendingRequestedPage(null)
      navigateFn(pageName)
      notifications.dismiss('wn-404')
    },
  },
})
```

When the 404 conditions are no longer met (user navigated away), call `notifications.dismiss('wn-404')`. The idempotency guarantee means repeating this call on every render cycle is safe -- it's a no-op when the toast is already visible.

## Construction Order (`src/editor.ts`)

```
1. createEditorState(storage, options)
2. createEditorDOM(container, theme)          -> injects CSS tokens + toast classes
3. createNotificationSystem(dom.root)         -> NEW: returns NotificationSystem
4. createEditorNavigation(state, storage, dom, options)
5. createEditorRender(dom, contentPlugins, state, renderOpts)
   |-- Pass notifications reference to render
   +-- Render cycle calls notify/dismiss for 404
6. navigation.setRenderAPI(render)
7. createEditorLifecycle(...)
8. lifecycle.mount()
9. Expose notify() / dismiss() on EditorInstance
```

On `editor.destroy()`: call `notifications.destroy()` to clean up all toasts, timers, and container DOM.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Idempotent notify (same id) | No-op, returns existing ID |
| duration: 0 | Persistent until manually dismissed or action clicked |
| Action button clicked | Auto-dismisses toast (after onClick runs) |
| Exceed 5 toasts per position | Oldest dismissed instantly, newest enters with animation |
| destroy() while animating | Synchronous immediate removal, skips exit animation |
| Multiple positions in use | Separate containers per position, independently capped |
| Consumer dismisses wn-404 | Same as clicking x -- toast removed, overlay gone |
| Navigating away from 404 page | render cycle calls dismiss('wn-404'), toast removed |
| No pendingRequestedPage on 404 page | dismiss('wn-404') called, no toast shown |
| showCreateOverlay: false | dismiss('wn-404') called, no toast shown |
| Consumer overrides --wn-toast-* tokens | Cascades into all toast instances |
| Container click-through | Container uses pointer-events:none; clicks pass through between toasts |
| Accessibility | Container has role="log"; toasts use aria-live (assertive for error, polite for others) |

## Files Changed

| File | Change |
|------|--------|
| `src/notifications.ts` | **New** -- core notification system module |
| `src/editor-dom.ts` | Add 7 `--wn-toast-*` tokens to `DEFAULT_TOKENS`; append toast CSS classes + keyframes to `DEFAULT_CSS` |
| `src/types.ts` | Add `ToastType`, `ToastPosition`, `ToastAction`, `ToastOptions`; add `notify()` + `dismiss()` to `EditorInstance` |
| `src/editor.ts` | Wire notification system in `mountEditor()`, expose on `EditorInstance`, clean up on destroy |
| `src/editor-render.ts` | Remove `renderCreateOverlay()`, `dismissOverlay()`, `OVERLAY_CLASS`; replace with `notifications.notify()` / `notifications.dismiss()` calls |
| `src/index.ts` | Export new types |
| `src/__tests__/notifications.test.ts` | **New** -- tests for DOM creation, stacking, type variants, duration/auto-dismiss, manual dismiss, action buttons, corner positions, destroy cleanup, idempotency, rapid notifications, 5-toast cap |
| `src/__tests__/editor-render.test.ts` | Update 404 overlay tests to use notification system |
| `docs/api.md` | Document `editor.notify()` and `editor.dismiss()` |
| `docs/theming.md` | Document new `--wn-toast-*` tokens |
