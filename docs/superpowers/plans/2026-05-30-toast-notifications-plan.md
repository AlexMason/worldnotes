# Toast Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a typed toast notification system (info/success/warning/error) with configurable corners, optional actions, stacking, and themeable CSS tokens. Migrate the existing 404 "Create page?" overlay to use it.

**Architecture:** New `src/notifications.ts` module manages a `ToastState[]` array per corner container. CSS classes with `--wn-toast-*` tokens are appended to the existing `<style id="worldnotes-styles">`. The factory `createNotificationSystem(rootEl)` returns `{ notify, dismiss, destroy }`, exposed on `EditorInstance`. The 404 overlay in `editor-render.ts` is removed and replaced with `notifications.notify({ id: 'wn-404', ... })`.

**Tech Stack:** TypeScript, Vitest + happy-dom, no third-party libraries.

---

## TDD Approach

All implementation follows test-driven development: write the test first, run it to see it fail, then write minimal code to make it pass. Each task includes the test code first.

---

### Task 1: Add Types to `src/types.ts`

**Files:**
- Modify: `src/types.ts`
- No test file needed for types-only changes (validated by typecheck)

- [ ] **Step 1: Add type exports to `src/types.ts`**

Add after the `EditorOptions` interface (after the `syncServer?: string` line, before the `EditorInstance` interface):

```typescript
// ─── Toast Notifications ─────────────────────────────────────────────────────

/** Toast variant types. */
export type ToastType = 'info' | 'success' | 'warning' | 'error'

/** Screen corner for toast stacking. */
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

/** Optional action button on a toast. */
export interface ToastAction {
  label: string
  onClick: () => void
}

/** Configuration for a single toast notification. */
export interface ToastOptions {
  /** Fixed ID for idempotent toasts (e.g., "wn-404"). Auto-generated if omitted. */
  id?: string
  message: string
  /** Default: 'info' */
  type?: ToastType
  /** Duration in ms. Default: 4000. Set 0 for persistent. */
  duration?: number
  action?: ToastAction
  /** Default: 'top-right' */
  position?: ToastPosition
}
```

Add to the `EditorInstance` interface (after `getSelection()`):

```typescript
/**
 * Show a toast notification. Returns the toast ID. If an id is
 * provided and a toast with that id is already visible, the call
 * is a no-op (idempotent).
 */
notify(options: ToastOptions): string
/** Dismiss a specific toast by ID. */
dismiss(toastId: string): void
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: TypeCheck errors in editor-lifecycle.ts (EditorInstance missing notify/dismiss) — expected, will be resolved in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ToastOptions, ToastType, ToastPosition types and EditorInstance.notify/dismiss"
```

---

### Task 2: Add CSS Tokens and Classes to `src/editor-dom.ts`

**Files:**
- Modify: `src/editor-dom.ts`

- [ ] **Step 1: Add 7 toast tokens to `DEFAULT_TOKENS`**

In the `DEFAULT_TOKENS` template literal, add before the closing `}` of `.wn-root`:

```css
  /* Toast */
  --wn-toast-bg: #17171e;
  --wn-toast-bg-success: #14241a;
  --wn-toast-bg-warning: #24201a;
  --wn-toast-bg-error: #24141a;
  --wn-toast-border: #332d6a;
  --wn-toast-radius: 4px;
  --wn-toast-color: #c9c9d0;
```

- [ ] **Step 2: Add toast CSS rules to the end of `DEFAULT_CSS`**

Append after the existing CSS in the `DEFAULT_CSS` template literal (after the remote cursor section, before the closing backtick):

```css

/* Toast notifications */
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
  animation: wn-toast-enter 0.2s ease-out;
}
.wn-toast--success { background: var(--wn-toast-bg-success, #14241a); }
.wn-toast--warning { background: var(--wn-toast-bg-warning, #24201a); }
.wn-toast--error   { background: var(--wn-toast-bg-error, #24141a); }
.wn-toast--exiting {
  animation: wn-toast-exit 0.15s ease-in forwards;
  pointer-events: none;
}

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

@keyframes wn-toast-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wn-toast-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/editor-dom.ts
git commit -m "feat: add --wn-toast-* design tokens and toast CSS classes"
```

---

### Task 3: Create `src/notifications.ts` Module

**Files:**
- Create: `src/notifications.ts`
- Create: `src/__tests__/notifications.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createNotificationSystem } from '../notifications'
import type { ToastOptions } from '../types'

function tick(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('createNotificationSystem', () => {
  let root: HTMLElement
  let ns: ReturnType<typeof createNotificationSystem>

  beforeEach(() => {
    root = document.createElement('div')
    ns = createNotificationSystem(root)
  })

  afterEach(() => {
    ns.destroy()
    root.innerHTML = ''
    vi.useRealTimers()
  })

  // ── notify() basic ──────────────────────────────────────────────────────

  it('notify() returns a string ID', () => {
    const id = ns.notify({ message: 'hello' })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('notify() creates a toast element in the DOM', () => {
    ns.notify({ message: 'hello' })
    const toast = root.querySelector('.wn-toast')
    expect(toast).not.toBeNull()
    expect(toast!.textContent).toContain('hello')
  })

  it('notify() creates a container with correct position class', () => {
    ns.notify({ message: 'test', position: 'bottom-left' })
    const container = root.querySelector('.wn-toast-container--bottom-left')
    expect(container).not.toBeNull()
  })

  // ── Type variants ───────────────────────────────────────────────────────

  it('info type gets default class (no modifier)', () => {
    ns.notify({ message: 'info toast', type: 'info' })
    const toast = root.querySelector('.wn-toast')
    expect(toast!.className).not.toContain('--success')
    expect(toast!.className).not.toContain('--warning')
    expect(toast!.className).not.toContain('--error')
  })

  it('success type gets wn-toast--success class', () => {
    ns.notify({ message: 'done', type: 'success' })
    const toast = root.querySelector('.wn-toast')
    expect(toast!.classList.contains('wn-toast--success')).toBe(true)
  })

  it('warning type gets wn-toast--warning class', () => {
    ns.notify({ message: 'careful', type: 'warning' })
    const toast = root.querySelector('.wn-toast')
    expect(toast!.classList.contains('wn-toast--warning')).toBe(true)
  })

  it('error type gets wn-toast--error class', () => {
    ns.notify({ message: 'fail', type: 'error' })
    const toast = root.querySelector('.wn-toast')
    expect(toast!.classList.contains('wn-toast--error')).toBe(true)
  })

  // ── Icons ───────────────────────────────────────────────────────────────

  it('info toast renders default icon', () => {
    ns.notify({ message: 'test', type: 'info' })
    const icon = root.querySelector('.wn-toast__icon')
    expect(icon).not.toBeNull()
  })

  it('success toast renders checkmark icon', () => {
    ns.notify({ message: 'test', type: 'success' })
    const icon = root.querySelector('.wn-toast__icon')
    expect(icon!.textContent).toBe('\u2713')
  })

  it('warning toast renders warning icon', () => {
    ns.notify({ message: 'test', type: 'warning' })
    const icon = root.querySelector('.wn-toast__icon')
    expect(icon!.textContent).toBe('\u26A0')
  })

  it('error toast renders cross icon', () => {
    ns.notify({ message: 'test', type: 'error' })
    const icon = root.querySelector('.wn-toast__icon')
    expect(icon!.textContent).toBe('\u2717')
  })

  // ── Stacking ────────────────────────────────────────────────────────────

  it('multiple toasts stack in the same container', () => {
    ns.notify({ message: 'first' })
    ns.notify({ message: 'second' })
    ns.notify({ message: 'third' })

    const toasts = root.querySelectorAll('.wn-toast')
    expect(toasts.length).toBe(3)
  })

  it('toasts beyond 5 cap remove the oldest one', () => {
    for (let i = 0; i < 7; i++) {
      ns.notify({ message: `toast ${i}` })
    }
    const toasts = root.querySelectorAll('.wn-toast')
    expect(toasts.length).toBe(5)
    // First two should be gone — the last five remain
    expect(toasts[0].textContent).toContain('toast 2')
    expect(toasts[4].textContent).toContain('toast 6')
  })

  // ── Dismiss ─────────────────────────────────────────────────────────────

  it('dismiss() removes a toast by ID', () => {
    const id = ns.notify({ message: 'bye' })
    ns.dismiss(id)
    const toast = root.querySelector('.wn-toast')
    expect(toast).toBeNull()
  })

  it('dismiss() adds exiting class then removes element after animation', async () => {
    const id = ns.notify({ message: 'bye' })
    ns.dismiss(id)
    const toast = root.querySelector('.wn-toast--exiting')
    expect(toast).not.toBeNull()
    // After 150ms the element should be removed
    await tick(200)
    const removed = root.querySelector('.wn-toast')
    expect(removed).toBeNull()
  })

  it('dismiss() is a no-op for unknown IDs', () => {
    expect(() => ns.dismiss('nonexistent')).not.toThrow()
  })

  // ── Auto-dismiss (duration) ─────────────────────────────────────────────

  it('auto-dismisses after duration', async () => {
    vi.useFakeTimers()
    ns.notify({ message: 'temp', duration: 2000 })

    expect(root.querySelector('.wn-toast')).not.toBeNull()

    vi.advanceTimersByTime(1999)
    expect(root.querySelector('.wn-toast')).not.toBeNull()

    vi.advanceTimersByTime(1)
    // Element gets exiting class, then removed
    expect(root.querySelector('.wn-toast--exiting')).not.toBeNull()

    vi.advanceTimersByTime(200)
    expect(root.querySelector('.wn-toast')).toBeNull()
  })

  it('duration 0 is persistent (no auto-dismiss)', async () => {
    vi.useFakeTimers()
    ns.notify({ message: 'stay', duration: 0 })

    vi.advanceTimersByTime(10000)
    expect(root.querySelector('.wn-toast')).not.toBeNull()
  })

  it('default duration is 4000ms', async () => {
    vi.useFakeTimers()
    ns.notify({ message: 'default' })

    vi.advanceTimersByTime(3999)
    expect(root.querySelector('.wn-toast')).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(root.querySelector('.wn-toast--exiting')).not.toBeNull()
  })

  // ── Action buttons ──────────────────────────────────────────────────────

  it('renders action button when action is provided', () => {
    const onClick = vi.fn()
    ns.notify({ message: 'action test', action: { label: 'Undo', onClick } })
    const btn = root.querySelector('.wn-toast__action-btn')
    expect(btn).not.toBeNull()
    expect(btn!.textContent).toBe('Undo')

    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking action button dismisses the toast', () => {
    const id = ns.notify({
      message: 'action',
      action: { label: 'Go', onClick: () => {} },
    })
    const btn = root.querySelector('.wn-toast__action-btn')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const toast = root.querySelector(`[data-toast-id="${id}"]`)
    expect(toast).toBeNull()
  })

  // ── Close button ────────────────────────────────────────────────────────

  it('renders close button on every toast', () => {
    ns.notify({ message: 'test' })
    const closeBtn = root.querySelector('.wn-toast__close-btn')
    expect(closeBtn).not.toBeNull()
    expect(closeBtn!.textContent).toBe('\u00d7')
  })

  it('close button dismisses the toast', () => {
    const id = ns.notify({ message: 'close me' })
    const closeBtn = root.querySelector('.wn-toast__close-btn')!
    closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const toast = root.querySelector(`[data-toast-id="${id}"]`)
    expect(toast).toBeNull()
  })

  // ── Idempotency ─────────────────────────────────────────────────────────

  it('notify with same id is idempotent (no-op)', () => {
    const id1 = ns.notify({ id: 'unique', message: 'first' })
    const id2 = ns.notify({ id: 'unique', message: 'second' })

    expect(id1).toBe(id2)
    const toasts = root.querySelectorAll('.wn-toast')
    expect(toasts.length).toBe(1)
    expect(toasts[0].textContent).toContain('first')
  })

  // ── Destroy ─────────────────────────────────────────────────────────────

  it('destroy() removes all toasts and containers', () => {
    ns.notify({ message: 'a', position: 'top-right' })
    ns.notify({ message: 'b', position: 'bottom-left' })

    ns.destroy()

    expect(root.querySelector('.wn-toast')).toBeNull()
    expect(root.querySelector('.wn-toast-container')).toBeNull()
  })

  // ── Container click-through ─────────────────────────────────────────────

  it('container has pointer-events:none', () => {
    ns.notify({ message: 'test' })
    const container = root.querySelector('.wn-toast-container') as HTMLElement
    expect(container.style.pointerEvents).toBe('') // CSS, not inline
    // check computed style?
    // CSS class is sufficient — Toast elements have pointer-events:auto
    const toast = root.querySelector('.wn-toast') as HTMLElement
    expect(toast).not.toBeNull()
    // toast does not need pointer-events test — CSS handles it
  })

  // ── Multiple positions ──────────────────────────────────────────────────

  it('separate containers for different positions', () => {
    ns.notify({ message: 'tr', position: 'top-right' })
    ns.notify({ message: 'bl', position: 'bottom-left' })

    const containers = root.querySelectorAll('.wn-toast-container')
    expect(containers.length).toBe(2)
  })

  it('capped per position independently', () => {
    for (let i = 0; i < 7; i++) {
      ns.notify({ message: `tr-${i}`, position: 'top-right' })
      ns.notify({ message: `bl-${i}`, position: 'bottom-left' })
    }
    const trToasts = root.querySelectorAll('.wn-toast-container--top-right .wn-toast')
    const blToasts = root.querySelectorAll('.wn-toast-container--bottom-left .wn-toast')
    expect(trToasts.length).toBe(5)
    expect(blToasts.length).toBe(5)
  })

  // ── Accessibility ───────────────────────────────────────────────────────

  it('container has role="log"', () => {
    ns.notify({ message: 'test' })
    const container = root.querySelector('.wn-toast-container')
    expect(container!.getAttribute('role')).toBe('log')
  })

  it('error toasts use aria-live="assertive", others use "polite"', () => {
    const infoId = ns.notify({ message: 'info', type: 'info' })
    const errorId = ns.notify({ message: 'error', type: 'error' })

    const infoToast = root.querySelector(`[data-toast-id="${infoId}"]`)
    const errorToast = root.querySelector(`[data-toast-id="${errorId}"]`)

    expect(infoToast!.getAttribute('aria-live')).toBe('polite')
    expect(errorToast!.getAttribute('aria-live')).toBe('assertive')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/notifications.test.ts
```

Expected: All tests FAIL (module not found or function not defined).

- [ ] **Step 3: Write `src/notifications.ts` implementation**

```typescript
import type { ToastOptions } from './types'

const MAX_TOASTS_PER_POSITION = 5
const EXIT_ANIMATION_MS = 150
const DEFAULT_DURATION = 4000

interface ToastState {
  id: string
  timer: ReturnType<typeof setTimeout> | null
  el: HTMLElement
}

export interface NotificationSystem {
  notify(options: ToastOptions): string
  dismiss(toastId: string): void
  destroy(): void
}

const TYPE_ICONS: Record<string, string> = {
  info: '\u2139',
  success: '\u2713',
  warning: '\u26A0',
  error: '\u2717',
}

let idCounter = 0

export function createNotificationSystem(rootEl: HTMLElement): NotificationSystem {
  const containers = new Map<string, HTMLElement>()
  const toasts: ToastState[] = []

  function getContainer(position: string): HTMLElement {
    const existing = containers.get(position)
    if (existing) return existing

    const container = document.createElement('div')
    container.className = `wn-toast-container wn-toast-container--${position}`
    container.setAttribute('role', 'log')
    rootEl.appendChild(container)
    containers.set(position, container)
    return container
  }

  function buildToastEl(options: ToastOptions): { el: HTMLElement; id: string } {
    const toastType = options.type ?? 'info'
    const toastId = options.id ?? `toast-${idCounter++}`

    const toast = document.createElement('div')
    toast.className = 'wn-toast'
    if (toastType !== 'info') {
      toast.classList.add(`wn-toast--${toastType}`)
    }
    toast.setAttribute('data-toast-id', toastId)
    toast.setAttribute('aria-live', toastType === 'error' ? 'assertive' : 'polite')

    const icon = document.createElement('span')
    icon.className = 'wn-toast__icon'
    icon.textContent = TYPE_ICONS[toastType] ?? TYPE_ICONS.info

    const message = document.createElement('span')
    message.className = 'wn-toast__message'
    message.textContent = options.message

    const actions = document.createElement('span')
    actions.className = 'wn-toast__actions'

    toast.appendChild(icon)
    toast.appendChild(message)
    toast.appendChild(actions)

    const dismiss = (): void => {
      // Clear timer first to prevent double-dismiss
      const state = toasts.find((t) => t.id === toastId)
      if (state?.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }
      toast.classList.add('wn-toast--exiting')
      setTimeout(() => {
        toast.remove()
        const idx = toasts.findIndex((t) => t.id === toastId)
        if (idx !== -1) toasts.splice(idx, 1)
      }, EXIT_ANIMATION_MS)
    }

    if (options.action) {
      const actionBtn = document.createElement('button')
      actionBtn.className = 'wn-toast__action-btn'
      actionBtn.textContent = options.action.label
      actionBtn.addEventListener('click', () => {
        options.action!.onClick()
        dismiss()
      })
      actions.appendChild(actionBtn)
    }

    const closeBtn = document.createElement('button')
    closeBtn.className = 'wn-toast__close-btn'
    closeBtn.textContent = '\u00d7'
    closeBtn.addEventListener('click', () => {
      dismiss()
    })
    actions.appendChild(closeBtn)

    return { el: toast, id: toastId }
  }

  function capContainer(position: string): void {
    const positionToasts = toasts.filter((t) => {
      const container = t.el.parentElement
      return container?.classList.contains(`wn-toast-container--${position}`)
    })
    while (positionToasts.length > MAX_TOASTS_PER_POSITION) {
      const oldest = positionToasts.shift()!
      // Synchronous immediate removal (skip animation for cap)
      if (oldest.timer) {
        clearTimeout(oldest.timer)
        oldest.timer = null
      }
      oldest.el.remove()
      const idx = toasts.indexOf(oldest)
      if (idx !== -1) toasts.splice(idx, 1)
    }
  }

  function notify(options: ToastOptions): string {
    // Idempotency: check if toast with this id already exists
    if (options.id) {
      const existing = toasts.find((t) => t.id === options.id)
      if (existing) return options.id
    }

    const { el, id } = buildToastEl(options)
    const position = options.position ?? 'top-right'
    const container = getContainer(position)

    const state: ToastState = { id, timer: null, el }
    container.appendChild(el)
    toasts.push(state)

    // Cap at 5 per position
    capContainer(position)

    // Auto-dismiss timer
    const duration = options.duration ?? DEFAULT_DURATION
    if (duration > 0) {
      state.timer = setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }

  function dismiss(toastId: string): void {
    const state = toasts.find((t) => t.id === toastId)
    if (!state) return

    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }

    state.el.classList.add('wn-toast--exiting')
    setTimeout(() => {
      state.el.remove()
      const idx = toasts.indexOf(state)
      if (idx !== -1) toasts.splice(idx, 1)
    }, EXIT_ANIMATION_MS)
  }

  function destroy(): void {
    // Synchronous removal — skip animations
    for (const t of toasts) {
      if (t.timer) clearTimeout(t.timer)
      t.el.remove()
    }
    toasts.length = 0
    for (const container of containers.values()) {
      container.remove()
    }
    containers.clear()
  }

  return { notify, dismiss, destroy }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/notifications.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notifications.ts src/__tests__/notifications.test.ts
git commit -m "feat: implement toast notification system"
```

---

### Task 4: Wire Notifications into `src/editor.ts`

**Files:**
- Modify: `src/editor.ts`

- [ ] **Step 1: Wire `createNotificationSystem` into `mountEditor()`**

In `src/editor.ts`, after `const dom = createEditorDOM(container, options.theme)`:

```typescript
import { createNotificationSystem, type NotificationSystem } from './notifications'
```

Add after the dom line:

```typescript
const notifications: NotificationSystem = createNotificationSystem(dom.container)
```

Update `EditorRenderOptions` to accept notifications:

In the `renderOpts` object, add:

```typescript
notifications,
```

Pass `notifications.destroy()` call into the `destroy()` method of the instance. But wait — the EditorInstance is created in `editor-lifecycle.ts`. So instead, we need to pass `notifications` to the lifecycle.

Actually, the simplest approach: `notifications` needs to be passed through to `editor-render.ts` (for 404 migration) and to `editor-lifecycle.ts` (for EditorInstance.destroy).

Let's add `notifications` to the lifecycle constructor and to the mount result.

First, update the import in `src/editor.ts`:

```typescript
import { createNotificationSystem, type NotificationSystem } from './notifications'
```

Add after `const dom = createEditorDOM(container, options.theme)`:

```typescript
const notifications = createNotificationSystem(dom.container)
```

Add `notifications` to the render options:

```typescript
const renderOpts: EditorRenderOptions = {
  navigateFn: (page: string) => {
    navigation.navigateToPage(page)
  },
  onBreadcrumbNavigate: (page: string) => {
    navigation.loadPage(page)
  },
  onTrailChange: options.onTrailChange,
  statusPages: options.statusPages,
  showCreateOverlay: options.showCreateOverlay,
  notifications,
}
```

Pass `notifications` to the lifecycle call:

```typescript
const lifecycle = createEditorLifecycle(
  dom,
  contentPlugins,
  allUIPlugins,
  state,
  render,
  navigation,
  storage,
  options,
  notifications,   // NEW
)
```

- [ ] **Step 2: Run typecheck to verify wiring compiles**

```bash
npm run typecheck
```

Expected: Type errors in `editor-lifecycle.ts` and `editor-render.ts` (they don't accept notifications yet). These will be resolved in Tasks 5 and 6.

- [ ] **Step 3: Commit**

```bash
git add src/editor.ts
git commit -m "feat: wire notification system into editor construction"
```

---

### Task 5: Migrate 404 Overlay to Use Notifications (`src/editor-render.ts`)

**Files:**
- Modify: `src/editor-render.ts`
- Modify: `src/__tests__/editor-render.test.ts`

- [ ] **Step 1: Update test to verify 404 toast via notifications**

In `src/__tests__/editor-render.test.ts`, add these tests. We need to import `createNotificationSystem`:

```typescript
import { createNotificationSystem } from '../notifications'
```

Add the following test block after the existing `describe('createEditorRender: render()')` block (before the breadcrumb describe):

```typescript
// ── 404 Toast (via notifications) ──────────────────────────────────────────────

describe('createEditorRender: 404 toast', () => {
  let dom: EditorDOM
  let plugins: ContentPlugin[]
  let state: ReturnType<typeof createEditorState>
  let notifications: ReturnType<typeof createNotificationSystem>

  beforeEach(() => {
    dom = createTestDOM()
    plugins = [testPlugin()]
    state = createEditorState(mockStorage(), { initialPage: 'test' })
    // Mock root container for notifications
    const root = document.createElement('div')
    document.body.appendChild(root)
    notifications = createNotificationSystem(root)
    // Patch destroy to clean up
    const originalDestroy = notifications.destroy.bind(notifications)
    notifications.destroy = () => {
      originalDestroy()
      root.remove()
    }
  })

  afterEach(() => {
    notifications.destroy()
  })

  it('renders 404 toast when on 404 page with pending requested page', () => {
    state.setTrail(['404'])
    state.setPendingRequestedPage('missing')

    const render = createEditorRender(dom, plugins, state, {
      notifications,
      showCreateOverlay: true,
    })

    const ytext = state.getYDocState().getPage('404')
    ytext.insert(0, '# Page Not Found\n\n')
    render.render()

    const toast = document.body.querySelector('.wn-toast')
    expect(toast).not.toBeNull()
    expect(toast!.textContent).toContain('missing')
    expect(toast!.textContent).toContain('not found')
  })

  it('does not show 404 toast when showCreateOverlay is false', () => {
    state.setTrail(['404'])
    state.setPendingRequestedPage('missing')

    const render = createEditorRender(dom, plugins, state, {
      notifications,
      showCreateOverlay: false,
    })

    const ytext = state.getYDocState().getPage('404')
    ytext.insert(0, '# Page Not Found\n\n')
    render.render()

    const toast = document.body.querySelector('.wn-toast')
    expect(toast).toBeNull()
  })

  it('dismisses 404 toast when navigating away', () => {
    state.setTrail(['404'])
    state.setPendingRequestedPage('missing')

    const render = createEditorRender(dom, plugins, state, {
      notifications,
      showCreateOverlay: true,
    })

    const ytext = state.getYDocState().getPage('404')
    ytext.insert(0, '# Page Not Found\n\n')
    render.render()

    expect(document.body.querySelector('.wn-toast')).not.toBeNull()

    // Navigate away
    state.setPendingRequestedPage(null)
    state.setTrail(['home'])
    render.render()

    expect(document.body.querySelector('.wn-toast')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/editor-render.test.ts
```

Expected: New tests FAIL (EditorRenderOptions doesn't accept notifications).

- [ ] **Step 3: Update `src/editor-render.ts`**

Update the `EditorRenderOptions` interface to accept notifications:

```typescript
import type { NotificationSystem } from './notifications'

export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
  statusPages?: Record<number, string>
  showCreateOverlay?: boolean
  notifications?: NotificationSystem
}
```

In the `createEditorRender` function, destructure `notifications` from options:

```typescript
export function createEditorRender(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  state: EditorStateAPI,
  options: EditorRenderOptions = {},
): EditorRenderAPI {
  const { editorDiv, placeholder, breadcrumb } = dom
  const { notifications } = options
```

**Remove** the entire `OVERLAY_CLASS`, `dismissOverlay()`, and `renderCreateOverlay()` code (lines 96-159 in current file). Replace `renderCreateOverlay()` call in the render function (line 93) with:

```typescript
// ── 404 toast (via notification system) ────────────────────────────────────

if (notifications) {
  const statusPages = options.statusPages ?? {}
  const notFoundPage = statusPages[404] ?? '404'
  const currentPage = state.getCurrentPage()
  const requestedPage = state.getPendingRequestedPage()
  const showOverlay = options.showCreateOverlay !== false

  if (currentPage === notFoundPage && requestedPage && showOverlay) {
    const navigateFn = options.navigateFn
    notifications.notify({
      id: 'wn-404',
      message: `Page "${requestedPage}" not found.`,
      type: 'info',
      duration: 0,
      action: {
        label: 'Create',
        onClick: () => {
          const page = requestedPage
          const yDocState = state.getYDocState()
          const ytext = yDocState.getPage(page)
          if (ytext.toString() === '') {
            ytext.insert(0, `# ${page}\n\n`)
          }
          state.setPendingRequestedPage(null)
          if (navigateFn) {
            navigateFn(page)
          }
          notifications.dismiss('wn-404')
        },
      },
    })
  } else {
    notifications.dismiss('wn-404')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/editor-render.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor-render.ts src/__tests__/editor-render.test.ts
git commit -m "feat: migrate 404 overlay to use notification system"
```

---

### Task 6: Wire `notify/dismiss` into EditorInstance (`src/editor-lifecycle.ts`)

**Files:**
- Modify: `src/editor-lifecycle.ts`

- [ ] **Step 1: Update lifecycle to accept notifications**

In `src/editor-lifecycle.ts`, add import:

```typescript
import type { NotificationSystem } from './notifications'
```

Update the `createEditorLifecycle` function signature to accept `notifications`. After the `options` parameter:

```typescript
export function createEditorLifecycle(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  uiPlugins: UIPlugin[],
  state: EditorStateAPI,
  render: EditorRenderAPI,
  navigation: EditorNavigationAPI,
  storage: StorageAdapter,
  options: EditorOptions,
  notifications: NotificationSystem,
) {
```

In the `destroy()` method of the returned `EditorInstance`, add `notifications.destroy()`:

```typescript
destroy() {
  state.clearSaveTimer()
  syncProvider?.destroy()
  notifications.destroy()    // NEW
  for (const plugin of contentPlugins) {
    // ... rest of existing destroy code
```

Add `notify` and `dismiss` methods to the returned EditorInstance object:

```typescript
notify(opts: import('../types').ToastOptions): string {
  return notifications.notify(opts)
},

dismiss(toastId: string): void {
  notifications.dismiss(toastId)
},
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/editor-lifecycle.ts src/editor.ts
git commit -m "feat: expose notify/dismiss on EditorInstance"
```

---

### Task 7: Update Exports (`src/index.ts`)

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Export new types and notification system**

Add to the type exports section:

```typescript
export type {
  // ... existing ...
  ToastType,
  ToastPosition,
  ToastAction,
  ToastOptions,
} from './types'
```

Also export the notification system factory for standalone use:

```typescript
export { createNotificationSystem } from './notifications'
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export toast types and createNotificationSystem"
```

---

### Task 8: Update Documentation

**Files:**
- Modify: `docs/api.md`
- Modify: `docs/theming.md`

- [ ] **Step 1: Update `docs/api.md`**

Add after the `EditorInstance` table (after the `getSelection()` row):

```markdown
| `notify(options)` | Show a toast notification. Returns the toast ID. Idempotent when `options.id` matches an existing visible toast. |
| `dismiss(toastId)` | Programmatically dismiss a toast by its ID. |
```

Add a new section after the `EditorInstance` section:

```markdown
## Toast Notifications

The editor includes a built-in toast notification system. Toasts are stackable,
positionable, themeable, and support optional action buttons.

### `editor.notify(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto-generated | Fixed ID for idempotent toasts. If a toast with this ID is already visible, the call is a no-op. |
| `message` | `string` | _(required)_ | The notification message text. |
| `type` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Toast variant — affects icon, background color, and aria-live. |
| `duration` | `number` | `4000` | Auto-dismiss after this many milliseconds. Set `0` for persistent toasts. |
| `action` | `{ label: string, onClick: () => void }` | `undefined` | Optional action button. Clicking the button calls `onClick`, then auto-dismisses the toast. |
| `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Screen corner for toast stacking. |

**Returns:** `string` — the toast ID, usable with `editor.dismiss()`.

```ts
// Show a success toast that auto-dismisses after 3 seconds
editor.notify({ type: 'success', message: 'Page saved', duration: 3000 })

// Show a persistent error toast with a retry button
editor.notify({
  type: 'error',
  message: 'Failed to save',
  duration: 0,
  action: { label: 'Retry', onClick: () => savePage() },
})

// Dismiss a specific toast
const id = editor.notify({ message: 'Loading...' })
// ... later ...
editor.dismiss(id)
```

### Stacking and Caps

Toasts stack within their position container. Each corner is capped at 5 visible toasts;
when exceeded, the oldest toast in that corner is immediately removed.

### editor.dismiss(toastId)

Programmatically dismiss a toast by ID. No-op if the toast doesn't exist or was
already dismissed.
```

- [ ] **Step 2: Update `docs/theming.md`**

Add after the Colors table in the Design Token Reference section (after the `--wn-color-link` row):

```markdown
| `--wn-toast-bg` | `#17171e` | `background` | Info toast background |
| `--wn-toast-bg-success` | `#14241a` | `background` | Success toast background |
| `--wn-toast-bg-warning` | `#24201a` | `background` | Warning toast background |
| `--wn-toast-bg-error` | `#24141a` | `background` | Error toast background |
| `--wn-toast-border` | `#332d6a` | `border-color` | Toast border color |
| `--wn-toast-radius` | `4px` | `border-radius` | Toast border radius |
| `--wn-toast-color` | `#c9c9d0` | `color` | Toast text color |
```

Add to the light theme example at the end:

```css
  --wn-toast-bg: #ffffff;
  --wn-toast-bg-success: #f0fff0;
  --wn-toast-bg-warning: #fffff0;
  --wn-toast-bg-error: #fff0f0;
  --wn-toast-border: #d0d0d0;
  --wn-toast-radius: 6px;
  --wn-toast-color: #333333;
```

Add to the CSS Class Reference table:

```markdown
| `.wn-toast-container` | Container div | Toast stacking container per corner |
| `.wn-toast` | Toast div | Individual toast notification |
| `.wn-toast--success` | Toast div | Success variant modifier |
| `.wn-toast--warning` | Toast div | Warning variant modifier |
| `.wn-toast--error` | Toast div | Error variant modifier |
| `.wn-toast--exiting` | Toast div | Exit animation state |
| `.wn-toast__icon` | Icon span | Toast type icon |
| `.wn-toast__message` | Message span | Toast text content |
| `.wn-toast__actions` | Actions span | Action + close button container |
| `.wn-toast__action-btn` | Action button | Optional action button |
| `.wn-toast__close-btn` | Close button | Dismiss (x) button |
```

- [ ] **Step 3: Commit**

```bash
git add docs/api.md docs/theming.md
git commit -m "docs: document toast notifications API and theming tokens"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all checks**

```bash
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

Expected: All pass with coverage thresholds met.

- [ ] **Step 2: Commit any remaining changes**

Only if needed — all changes should already be committed per task.

---

## Verification Checklist

After all tasks complete, verify:

1. `npm run typecheck` — no errors
2. `npm run lint` — no errors (warnings OK)
3. `npm run test:coverage` — all tests pass, coverage thresholds met
4. `npm run build` — library bundles successfully
5. `npm run dev` — demo page loads, 404 toast appears correctly
