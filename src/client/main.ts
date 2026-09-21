// ─── WorldNotes edit client ──────────────────────────────────────────────────
// Bootstrap for /{slug}: mounts the inline editor over the pages API
// with debounced autosave, conflict UX, and real-path navigation.

import { createEditor } from '../core/editor'
import type { EditorInstance } from '../core/types'
import { insertSiteBands } from '../core/editor-dom'
import { createApiPageStore } from './api-page-store'
import { slugFromPath, pageUrlPath } from '../shared/url-helpers'
import { slugDisplayName } from '../shared/slug'
import { composeDocTitle } from '../shared/doc-title'
import type { EditorShellConfig } from '../shared/dto'

type ShellConfig = EditorShellConfig

interface PageEmbed {
  slug: string
  content: string | null
  version: number | null
  exists: boolean
}

function readShellConfig(): ShellConfig {
  const el = document.getElementById('wn-config')
  if (el?.textContent) {
    try {
      return JSON.parse(JSON.parse(el.textContent) as string) as ShellConfig
    } catch {
      /* fall through */
    }
  }
  return {
    slug: slugFromPath(window.location.pathname),
    autosaveMs: 1500,
    searchEnabled: true,
    allPagesEnabled: true,
    homeSlug: null,
    siteName: 'WorldNotes',
    headerHtml: '',
    footerHtml: '',
    userName: null,
    authDisabled: false,
  }
}

/**
 * The SSR-embedded page record (Task 1). `null` when the shell has no
 * `wn-page` script (fresh page, older server, or parse failure) — the editor
 * then falls back to fetching via the store as before.
 */
function readPageEmbed(): PageEmbed | null {
  const el = document.getElementById('wn-page')
  if (!el?.textContent) return null
  try {
    return JSON.parse(el.textContent) as PageEmbed
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const container = document.getElementById('wn-app')
  if (!container) return
  const cfg = readShellConfig()
  const embed = readPageEmbed()
  const seeded = embed && embed.exists && embed.version !== null

  let instance: EditorInstance | null = null
  let currentSlug = cfg.slug

  const store = createApiPageStore(
    {
      onSaved(page) {
        instance?.notify({ id: 'wn-save', message: 'Saved', type: 'success', duration: 1500 })
        document.title = composeDocTitle(slugDisplayName(page), cfg.siteName)
      },
      onDeleted() {
        // A blank save deleted the page. Stay put: the empty buffer plus the
        // cleared store version mean the next non-blank save recreates it.
        // Dismiss first — notify() ignores an id that is still on screen.
        instance?.dismiss('wn-save')
        instance?.notify({
          id: 'wn-save',
          message: 'Page deleted',
          type: 'warning',
          duration: 2500,
        })
      },
      onAuthLost() {
        const target = encodeURIComponent(window.location.pathname)
        instance?.notify({
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
      onConflict(page, server) {
        const editor = instance
        if (!editor) return
        if (!server) {
          editor.notify({
            id: 'wn-conflict',
            message: 'Page was deleted; your edits will recreate it on save.',
            type: 'warning',
            duration: 0,
          })
          return
        }
        editor.notify({
          id: 'wn-conflict',
          message: 'Someone else saved a newer version of this page.',
          type: 'warning',
          duration: 0,
          action: {
            label: 'Load theirs',
            onClick: () => {
              editor.setContent(server.content)
              editor.notify({
                id: 'wn-conflict-done',
                message: 'Loaded the server version.',
                type: 'info',
                duration: 2000,
              })
            },
          },
        })
      },
    },
    // Seed the store version from the SSR embed so the first autosave sends
    // the correct If-Match (avoids a needless 428 → refetch → retry).
    seeded ? [{ slug: cfg.slug, version: embed.version! }] : [],
  )

  const editor = createEditor(container, {
    pageStore: store,
    initialPage: cfg.slug,
    // Seed the buffer from the embed so first paint is synchronous.
    initialContent: seeded ? (embed.content ?? '') : undefined,
    homeSlug: cfg.homeSlug,
    homeLabel: cfg.siteName || undefined,
    saveDebounceMs: cfg.autosaveMs,
    onTrailChange: (trail) => {
      // Trail segments are always canonical slugs: navigateToPage folds every
      // click target via navTargetToSlug, and the initial trail is seeded from
      // the server-validated URL. So the joined page IS the slug.
      const page = trail.length <= 1 ? (trail[0] ?? 'home') : trail.slice(1).join('/')
      if (page !== currentSlug) {
        currentSlug = page
        window.history.pushState(null, '', pageUrlPath(page))
        document.title = composeDocTitle(slugDisplayName(page), cfg.siteName)
      }
      // A navigation happened (any way) — do not leave an open menu hovering
      // over the new page on mobile.
      container.querySelector('details[open]')?.removeAttribute('open')
    },
  })

  instance = await editor.mount()

  // Site header/footer bands (admin-authored raw HTML) around the content
  // column, mirroring the reader's placement inside <main>.
  const editorWrap = container.querySelector<HTMLElement>('.wn-editor-wrap')
  if (editorWrap) insertSiteBands(editorWrap, cfg.headerHtml, cfg.footerHtml)

  // Header actions — mirror the viewer chrome (nav links / Search / All
  // pages / Admin / sign-out). No login affordance: sign-in is a known route.
  const actions = container.querySelector('.wn-actions')
  if (actions) {
    for (const link of cfg.navLinks ?? []) {
      const a = document.createElement('a')
      a.href = link.href
      a.className = 'wn-nav-link'
      a.textContent = link.label
      // Internal link → SPA navigate (keeps the debounced autosave buffer,
      // the sanctioned divergence for in-wiki links on the edit surface).
      a.addEventListener('click', (e) => {
        e.preventDefault()
        instance?.navigate(link.slug)
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
    const admin = document.createElement('a')
    admin.href = '/admin'
    admin.textContent = 'Admin settings'
    actions.appendChild(admin)
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

  // Back/forward within the SPA
  window.addEventListener('popstate', () => {
    const slug = slugFromPath(window.location.pathname)
    if (slug !== currentSlug && instance) {
      currentSlug = slug
      instance.navigate(slug)
    }
  })

  // Ctrl+S is owned by the editor keymap (saveNow flush through the store's
  // full save path — onError toast + onSave callback included). The old
  // window-level handler here was removed: it double-fired with the keymap
  // and bypassed onSave by calling store.save directly.
}

void main().catch((err) => {
  console.error('WorldNotes client failed to start:', err)
  const el = document.getElementById('wn-app')
  if (el) el.textContent = 'Editor failed to load. Reload the page or log in again.'
})
