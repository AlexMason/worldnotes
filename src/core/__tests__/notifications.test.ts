// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createNotificationSystem } from '../notifications'

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

  it('dismiss() removes a toast by ID', async () => {
    const id = ns.notify({ message: 'bye' })
    ns.dismiss(id)
    await tick(200)
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

  it('auto-dismisses after duration', () => {
    vi.useFakeTimers()
    ns.notify({ message: 'temp', duration: 2000 })

    expect(root.querySelector('.wn-toast')).not.toBeNull()

    vi.advanceTimersByTime(1999)
    expect(root.querySelector('.wn-toast')).not.toBeNull()

    vi.advanceTimersByTime(1)
    // Element gets exiting class
    expect(root.querySelector('.wn-toast--exiting')).not.toBeNull()

    vi.advanceTimersByTime(200)
    expect(root.querySelector('.wn-toast')).toBeNull()
  })

  it('duration 0 is persistent (no auto-dismiss)', () => {
    vi.useFakeTimers()
    ns.notify({ message: 'stay', duration: 0 })

    vi.advanceTimersByTime(10000)
    expect(root.querySelector('.wn-toast')).not.toBeNull()
  })

  it('default duration is 4000ms', () => {
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

  it('clicking action button dismisses the toast', async () => {
    const id = ns.notify({
      message: 'action',
      action: { label: 'Go', onClick: vi.fn() },
    })
    const btn = root.querySelector('.wn-toast__action-btn')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await tick(200)
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

  it('close button dismisses the toast', async () => {
    const id = ns.notify({ message: 'close me' })
    const closeBtn = root.querySelector('.wn-toast__close-btn')!
    closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await tick(200)
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
