// ─── Inline page-move field (breadcrumb) ─────────────────────────────────────
// Replaces the breadcrumb with `/ [address input]` while the user types a new
// address for the current page. No dialog: Enter moves, Escape or leaving
// the field cancels. Input folds exactly like a wiki-link target
// (navTargetToSlug — `Clients/Acme Corp` → `clients/acme-corp`), previewed
// live; slug-policy errors show inline before anything is sent, and the
// server's answer (taken, invalid child, …) shows in the same place.

import { navTargetToSlug, slugify, validateSlug } from '../shared/slug'

export interface PageMoveFieldOptions {
  /** The current page's slug (prefilled). */
  current: string
  /** Perform the move; resolves null on success, else the message to show. */
  submit(to: string): Promise<string | null>
  /** The field is done (cancelled or moved): repaint the breadcrumb. */
  close(): void
}

type Check = { ok: true; slug: string } | { ok: false; error: string }

function check(raw: string, current: string): Check {
  const value = raw.trim()
  if (value === '' || value === '/') return { ok: false, error: 'Enter a page address' }
  const slug = navTargetToSlug(value)
  if (slug === null) {
    const v = validateSlug(slugify(value) || value)
    return { ok: false, error: v.ok ? 'Not a valid page address' : v.error }
  }
  if (slug.startsWith(`${current}/`))
    return { ok: false, error: 'A page cannot move inside itself' }
  return { ok: true, slug }
}

/** Open the field inside `host` (the breadcrumb). Returns the input element. */
export function openPageMoveField(
  host: HTMLElement,
  options: PageMoveFieldOptions,
): HTMLInputElement {
  host.innerHTML = ''
  const field = document.createElement('div')
  field.className = 'wn-move'
  const prefix = document.createElement('span')
  prefix.className = 'wn-move-prefix'
  prefix.textContent = '/'
  const input = document.createElement('input')
  input.className = 'wn-move-input'
  input.type = 'text'
  input.value = options.current
  input.spellcheck = false
  input.autocomplete = 'off'
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('aria-label', 'New page address')
  const msg = document.createElement('span')
  msg.className = 'wn-move-msg'
  msg.setAttribute('role', 'status')
  msg.setAttribute('aria-live', 'polite')
  field.append(prefix, input, msg)
  host.appendChild(field)

  let submitting = false
  let closed = false

  const show = (text: string, error = false): void => {
    msg.textContent = text
    msg.classList.toggle('wn-move-msg--error', error)
    input.setAttribute('aria-invalid', error ? 'true' : 'false')
  }
  const close = (): void => {
    if (closed) return
    closed = true
    options.close()
  }
  const refresh = (): void => {
    const result = check(input.value, options.current)
    if (!result.ok) return show(result.error, true)
    const typed = input.value.trim().replace(/^\/+|\/+$/g, '')
    show(result.slug === typed ? '' : `→ /${result.slug}`)
  }

  input.addEventListener('input', refresh)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (!submitting) close()
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (submitting) return
    const result = check(input.value, options.current)
    if (!result.ok) return show(result.error, true)
    if (result.slug === options.current) return close()
    submitting = true
    input.readOnly = true
    show('Moving…')
    void options.submit(result.slug).then(
      (error) => {
        if (error === null) return close()
        submitting = false
        input.readOnly = false
        show(error, true)
        input.focus()
      },
      () => {
        submitting = false
        input.readOnly = false
        show('The page was not moved.', true)
      },
    )
  })
  input.addEventListener('blur', () => {
    if (!submitting) close()
  })

  input.focus()
  // Select the last segment: renaming in place is the common case.
  const lastSlash = options.current.lastIndexOf('/')
  input.setSelectionRange(lastSlash + 1, options.current.length)
  return input
}
