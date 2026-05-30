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

export function createNotificationSystem(
  rootEl: HTMLElement,
): NotificationSystem {
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
    toast.setAttribute(
      'aria-live',
      toastType === 'error' ? 'assertive' : 'polite',
    )

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

    capContainer(position)

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
