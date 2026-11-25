// ─── Edit-surface chrome shared by every editing surface ─────────────────────
// Header actions (site nav links / Search / All pages / Admin / sign-out) and
// the browser back/forward bridge. Used by the production editor (main.ts) and
// the CM6 spike so both surfaces behave identically.

import { slugFromPath } from '../shared/url-helpers'
import type { EditorShellConfig } from '../shared/dto'
import type { ToastOptions } from '../core/types'
import type { ApiPageStoreEvents } from './api-page-store'

/**
 * Populate `.wn-actions` — mirrors the viewer chrome. No login affordance:
 * sign-in is a known route. `navigate` receives a slug for internal nav links
 * (SPA navigation keeps the debounced autosave buffer — the sanctioned
 * divergence for in-wiki links on the edit surface). `onMovePage`, when
 * given, adds "Move page…" (opens the inline move field in the breadcrumb —
 * the same field the current page's crumb opens).
 */
export function mountHeaderActions(
  container: HTMLElement,
  cfg: EditorShellConfig,
  navigate: (slug: string) => void,
  onMovePage?: () => void,
): void {
  const actions = container.querySelector('.wn-actions')
  if (!actions) return

  for (const link of cfg.navLinks ?? []) {
    const a = document.createElement('a')
    a.href = link.href
    a.className = 'wn-nav-link'
    a.textContent = link.label
    a.addEventListener('click', (e) => {
      e.preventDefault()
      navigate(link.slug)
    })
    actions.appendChild(a)
  }
  if (cfg.searchEnabled) {
    const search = document.createElement('a')
    search.href = '/search'
    search.textContent = 'Search'
    actions.appendChild(search)
  }
  if (cfg.allPagesEnabled) {
    const all = document.createElement('a')
    all.href = '/all'
    all.textContent = 'All pages'
    actions.appendChild(all)
  }
  if (onMovePage) {
    const move = document.createElement('a')
    move.href = '#'
    move.setAttribute('role', 'button')
    move.className = 'wn-action-move'
    move.textContent = 'Move page…'
    move.addEventListener('click', (e) => {
      e.preventDefault()
      onMovePage()
    })
    actions.appendChild(move)
  }
  // Role-gated chrome: the Admin link is for admins only (absent role in
  // a fallback/legacy config = least privilege — no link).
  if (cfg.userRole === 'admin') {
    const admin = document.createElement('a')
    admin.href = '/admin'
    admin.textContent = 'Admin settings'
    actions.appendChild(admin)
  }
  if (cfg.authDisabled) {
    const name = document.createElement('span')
    name.title = 'dev mode'
    name.textContent = cfg.userName ?? 'dev'
    actions.appendChild(name)
  } else {
    const signOut = document.createElement('a')
    signOut.href = '/oidc/logout'
    signOut.textContent = `Sign out (${cfg.userName ?? ''})`
    actions.appendChild(signOut)
  }
}

/**
 * Back/forward within the SPA: when the URL's slug differs from the editor's
 * current page, `navigate` it. `getCurrent`/`setCurrent` own the "current
 * slug" bookkeeping so the pushState that navigation triggers is not repeated.
 */
export function bindPopstate(
  getCurrent: () => string,
  setCurrent: (slug: string) => void,
  navigate: (slug: string) => void,
): void {
  window.addEventListener('popstate', () => {
    const slug = slugFromPath(window.location.pathname)
    if (slug !== getCurrent()) {
      setCurrent(slug)
      navigate(slug)
    }
  })
}

/** The slice of an editor surface the save/conflict toasts need. */
export interface ToastHost {
  notify(options: ToastOptions): string
  dismiss(toastId: string): void
}

/**
 * Save / conflict / auth toasts for `ApiPageStore`, shared by every editing
 * surface. `host()` is lazy: the store is created before the editor mounts, and
 * events that fire before then are dropped (same as the original inline form).
 */
export function createStoreEvents(
  host: () => ToastHost | null,
  hooks: {
    /** A save landed (title bookkeeping etc.). */
    onSaved(page: string): void
    /** "Load theirs": replace the surface's content with the server's. */
    loadServerContent(content: string): void
    /** A blank save deleted the page (link-state bookkeeping etc.). */
    onDeleted?(page: string): void
    /** The page was moved elsewhere; a save followed it (re-key the surface). */
    onMoved?(from: string, to: string): void
  },
): ApiPageStoreEvents {
  return {
    onSaved(page) {
      host()?.notify({ id: 'wn-save', message: 'Saved', type: 'success', duration: 1500 })
      hooks.onSaved(page)
    },
    onDeleted(page) {
      // A blank save deleted the page. Stay put: the empty buffer plus the
      // cleared store version mean the next non-blank save recreates it.
      // Dismiss first — notify() ignores an id that is still on screen.
      host()?.dismiss('wn-save')
      host()?.notify({ id: 'wn-save', message: 'Page deleted', type: 'warning', duration: 2500 })
      hooks.onDeleted?.(page)
    },
    onMoved(from, to) {
      hooks.onMoved?.(from, to)
    },
    onAuthLost() {
      const target = encodeURIComponent(window.location.pathname)
      host()?.notify({
        id: 'wn-auth',
        message: 'Session expired.',
        type: 'warning',
        duration: 0,
        action: {
          label: 'Log in',
          onClick: () => {
            window.location.href = `/oidc/login?returnTo=${target}`
          },
        },
      })
    },
    onForbidden() {
      host()?.notify({
        id: 'wn-forbidden',
        message: 'You no longer have edit access on this site.',
        type: 'warning',
        duration: 0,
      })
    },
    onConflict(_page, server) {
      const ui = host()
      if (!ui) return
      if (!server) {
        ui.notify({
          id: 'wn-conflict',
          message: 'Page was deleted; your edits will recreate it on save.',
          type: 'warning',
          duration: 0,
        })
        return
      }
      ui.notify({
        id: 'wn-conflict',
        message: 'Someone else saved a newer version of this page.',
        type: 'warning',
        duration: 0,
        action: {
          label: 'Load theirs',
          onClick: () => {
            hooks.loadServerContent(server.content)
            ui.notify({
              id: 'wn-conflict-done',
              message: 'Loaded the server version.',
              type: 'info',
              duration: 2000,
            })
          },
        },
      })
    },
  }
}
