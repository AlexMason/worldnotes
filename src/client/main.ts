// ─── WorldNotes edit client ──────────────────────────────────────────────────
// Bootstrap for /{slug}: mounts the inline editor over the pages API
// with debounced autosave, conflict UX, and real-path navigation.

import { createEditor } from '../core/editor'
import type { EditorInstance } from '../core/types'
import { createApiPageStore } from './api-page-store'
import { slugFromPath, pageUrlPath } from '../shared/url-helpers'
import { slugify, validateSlug, slugDisplayName } from '../shared/slug'

interface ShellConfig {
  slug: string
  autosaveMs: number
  searchEnabled: boolean
  allPagesEnabled: boolean
  homeSlug: string | null
  userName: string | null
  authDisabled: boolean
}

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
        document.title = slugDisplayName(page)
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
    saveDebounceMs: cfg.autosaveMs,
    onTrailChange: (trail) => {
      const page = trail.length <= 1 ? (trail[0] ?? 'home') : trail.slice(1).join('/')
      const slug = slugify(page) || page
      if (slug !== currentSlug) {
        currentSlug = slug
        window.history.pushState(null, '', pageUrlPath(slug))
        document.title = slugDisplayName(slug)
      }
    },
  })

  instance = await editor.mount()

  // Header actions — mirror the viewer chrome (Search / All pages / Admin / sign-out)
  const actions = container.querySelector('.wn-actions')
  if (actions) {
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

  // Ctrl+S forces an immediate save flush
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      const content = instance?.getContent() ?? ''
      const validated = validateSlug(currentSlug)
      if (validated.ok) void store.save(validated.slug, content)
    }
  })
}

void main().catch((err) => {
  console.error('WorldNotes client failed to start:', err)
  const el = document.getElementById('wn-app')
  if (el) el.textContent = 'Editor failed to load. Reload the page or log in again.'
})
