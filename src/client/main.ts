// ─── WorldNotes edit client ──────────────────────────────────────────────────
// Bootstrap for /edit/{slug}: mounts the inline editor over the pages API
// with debounced autosave, conflict UX, and real-path navigation.

import { createEditor } from '../core/editor'
import type { EditorInstance } from '../core/types'
import { createApiPageStore } from './api-page-store'
import { editUrlPath, slugFromEditPath, pageUrlPath } from '../shared/url-helpers'
import { slugify, validateSlug } from '../shared/slug'

interface ShellConfig {
  slug: string
  autosaveMs: number
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
  return { slug: slugFromEditPath(window.location.pathname), autosaveMs: 1500 }
}

async function main(): Promise<void> {
  const container = document.getElementById('wn-app')
  if (!container) return
  const cfg = readShellConfig()

  let instance: EditorInstance | null = null
  let currentSlug = cfg.slug

  const store = createApiPageStore({
    onSaved(page) {
      instance?.notify({ id: 'wn-save', message: 'Saved', type: 'success', duration: 1500 })
      document.title = `Edit — ${page}`
    },
    onAuthLost() {
      const target = encodeURIComponent(window.location.pathname)
      instance?.notify({
        id: 'wn-auth',
        message: 'Session expired.',
        type: 'warning',
        duration: 0,
        action: { label: 'Log in', onClick: () => { window.location.href = `/oidc/login?returnTo=${target}` } },
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
            editor.notify({ id: 'wn-conflict-done', message: 'Loaded the server version.', type: 'info', duration: 2000 })
          },
        },
      })
    },
  })

  const editor = createEditor(container, {
    pageStore: store,
    initialPage: cfg.slug,
    saveDebounceMs: cfg.autosaveMs,
    onTrailChange: (trail) => {
      const page = trail.length <= 1 ? (trail[0] ?? 'home') : trail.slice(1).join('/')
      const slug = slugify(page) || page
      if (slug !== currentSlug) {
        currentSlug = slug
        window.history.pushState(null, '', editUrlPath(slug))
      }
    },
  })

  instance = await editor.mount()

  // Read-view link in the editor header
  const header = container.querySelector('.wn-header')
  if (header) {
    const back = document.createElement('a')
    back.className = 'wn-view-link'
    back.href = pageUrlPath(cfg.slug)
    back.textContent = '← Reading view'
    header.appendChild(back)
    const home = document.createElement('a')
    home.href = '/'
    home.textContent = 'All pages'
    header.appendChild(home)
  }

  // Back/forward within the SPA
  window.addEventListener('popstate', () => {
    const slug = slugFromEditPath(window.location.pathname)
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
