// ─── Instance settings service ───────────────────────────────────────────────
// Loads key/value settings from a SettingsRepository at boot, caches them in
// memory (single-instance assumption, same as the render cache), and exposes a
// validated, typed view. Reads re-validate/normalize so a corrupt stored row
// degrades to defaults and never breaks the read path. Writes run the SAME
// normalizer (`normalizeSettings`) before persisting, so the in-memory view
// never diverges from what a restart would parse.
//
// SECURITY: `headerHtml`/`footerHtml` are raw, admin-trusted HTML. They are
// stored and re-emitted verbatim into every page (see render/layout.ts and
// render/editor-shell.ts) — scripts inside them execute for anonymous
// readers. "Admin-trusted" currently means ANY authenticated user (see
// docs/api.md trust model); the IdP audience is the access control.

import type { SettingsRepository } from './db/settings-repository'
import { validateSlug } from '../shared/slug'

const KEY_SEARCH = 'search_enabled'
const KEY_HOME = 'home_slug'
const KEY_ALL_PAGES = 'all_pages_enabled'
const KEY_SITE_NAME = 'site_name'
const KEY_HEADER_HTML = 'header_html'
const KEY_FOOTER_HTML = 'footer_html'
const KEY_FAVICON = 'favicon_media_id'

export const DEFAULT_SITE_NAME = 'WorldNotes'
export const SITE_NAME_MAX = 200
export const SITE_HTML_MAX = 20_000

/** C0/C1 control chars except tab/newline; Postgres `text` rejects NUL, and
 *  the rest are nonsense in a name or HTML band. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/

export interface AppSettings {
  searchEnabled: boolean
  /** Slug rendered at `/`; null = show the index listing. */
  homeSlug: string | null
  /** Show the page index at `/all` and the "All pages" nav affordances. */
  allPagesEnabled: boolean
  /** Site branding name: tab-title suffix + breadcrumb home label. */
  siteName: string
  /** Raw admin-trusted HTML rendered inside `<main>` before the body. */
  headerHtml: string
  /** Raw admin-trusted HTML rendered inside `<main>` after the body. */
  footerHtml: string
  /** Media row overriding the bundled favicon set; null = bundled defaults. */
  faviconMediaId: number | null
}

export interface SettingsPatch {
  searchEnabled?: boolean
  homeSlug?: string | null
  allPagesEnabled?: boolean
  siteName?: string
  headerHtml?: string
  footerHtml?: string
  faviconMediaId?: number | null
}

export interface SettingsService {
  /** Current settings (defensive copy). */
  get(): AppSettings
  /** Merge a patch, persist changed values, and return the new settings. */
  update(patch: SettingsPatch, by?: string | null): Promise<AppSettings>
  /**
   * Monotonic counter bumped on every successful update. Reader ETags mix it
   * in so chrome-only (branding/toggle) changes bust browser revalidation —
   * the cached article alone would otherwise 304 stale chrome indefinitely.
   */
  getRevision(): number
}

export const DEFAULT_SETTINGS: AppSettings = {
  searchEnabled: true,
  homeSlug: null,
  allPagesEnabled: true,
  siteName: DEFAULT_SITE_NAME,
  headerHtml: '',
  footerHtml: '',
  faviconMediaId: null,
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

/** Reject control characters anywhere in a free-text setting. */
function assertNoControlChars(value: string, field: string): void {
  if (CONTROL_CHARS.test(value)) {
    throw new Error(`${field} contains control characters`)
  }
}

/** Collapse all whitespace runs (incl. newlines) to single spaces, trim. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Normalize the branding fields on BOTH paths (boot read and update write):
 * - siteName: whitespace-collapsed, capped, empty → default.
 * - header/footer HTML: capped (truncated), otherwise verbatim raw HTML.
 * Over-long corrupt DB rows clamp to the cap rather than degrading, so one
 * stray byte of legacy data never erases an operator's footer.
 */
function normalizeBranding(
  raw: Partial<Pick<AppSettings, 'siteName' | 'headerHtml' | 'footerHtml'>>,
) {
  const siteName = collapseWhitespace(raw.siteName ?? '')
  return {
    siteName: (siteName === '' ? DEFAULT_SITE_NAME : siteName).slice(0, SITE_NAME_MAX),
    headerHtml: (raw.headerHtml ?? '').slice(0, SITE_HTML_MAX),
    footerHtml: (raw.footerHtml ?? '').slice(0, SITE_HTML_MAX),
  }
}

function normalizeHomeSlug(homeRaw: string): string | null {
  const trimmed = homeRaw.trim()
  if (trimmed === '') return null
  const validated = validateSlug(trimmed)
  return validated.ok ? validated.slug : null
}

/** Stored favicon media id: ''/corrupt/non-positive → bundled default. */
function parseFaviconId(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const id = Number(raw)
  return Number.isInteger(id) && id >= 1 ? id : null
}

/** Normalize raw key/value rows into validated settings. */
export function parseSettings(raw: Record<string, string>): AppSettings {
  return {
    searchEnabled: parseBool(raw[KEY_SEARCH], true),
    homeSlug: normalizeHomeSlug(raw[KEY_HOME] ?? ''),
    allPagesEnabled: parseBool(raw[KEY_ALL_PAGES], true),
    ...normalizeBranding({
      siteName: raw[KEY_SITE_NAME],
      headerHtml: raw[KEY_HEADER_HTML],
      footerHtml: raw[KEY_FOOTER_HTML],
    }),
    faviconMediaId: parseFaviconId(raw[KEY_FAVICON]),
  }
}

function serialize(settings: AppSettings): Record<string, string> {
  return {
    [KEY_SEARCH]: settings.searchEnabled ? 'true' : 'false',
    [KEY_HOME]: settings.homeSlug ?? '',
    [KEY_ALL_PAGES]: settings.allPagesEnabled ? 'true' : 'false',
    [KEY_SITE_NAME]: settings.siteName,
    [KEY_HEADER_HTML]: settings.headerHtml,
    [KEY_FOOTER_HTML]: settings.footerHtml,
    [KEY_FAVICON]: settings.faviconMediaId === null ? '' : String(settings.faviconMediaId),
  }
}

export async function createSettingsService(repo: SettingsRepository): Promise<SettingsService> {
  let current = parseSettings(await repo.getAll())
  let revision = 0

  return {
    get() {
      return { ...current }
    },

    getRevision() {
      return revision
    },

    async update(patch, by = null) {
      if (patch.searchEnabled !== undefined && typeof patch.searchEnabled !== 'boolean') {
        throw new Error('searchEnabled must be a boolean')
      }
      if (patch.allPagesEnabled !== undefined && typeof patch.allPagesEnabled !== 'boolean') {
        throw new Error('allPagesEnabled must be a boolean')
      }
      if (patch.homeSlug !== undefined && patch.homeSlug !== null) {
        const validated = validateSlug(patch.homeSlug)
        if (!validated.ok) throw new Error(`invalid home slug: ${validated.error}`)
      }
      for (const field of ['siteName', 'headerHtml', 'footerHtml'] as const) {
        const value = patch[field]
        if (value !== undefined && typeof value !== 'string') {
          throw new Error(`${field} must be a string`)
        }
        if (typeof value === 'string') {
          assertNoControlChars(value, field)
          // siteName caps the COLLAPSED form (what gets stored); the HTML
          // bands cap the raw string (whitespace is meaningful there).
          const measured = field === 'siteName' ? collapseWhitespace(value) : value
          const cap = field === 'siteName' ? SITE_NAME_MAX : SITE_HTML_MAX
          if (measured.length > cap) {
            throw new Error(`${field} exceeds ${cap} characters`)
          }
        }
      }
      if (patch.faviconMediaId !== undefined && patch.faviconMediaId !== null) {
        if (!Number.isInteger(patch.faviconMediaId) || patch.faviconMediaId < 1) {
          throw new Error('faviconMediaId must be a positive integer or null')
        }
      }

      const next: AppSettings = {
        searchEnabled: patch.searchEnabled ?? current.searchEnabled,
        homeSlug: patch.homeSlug === undefined ? current.homeSlug : patch.homeSlug,
        allPagesEnabled: patch.allPagesEnabled ?? current.allPagesEnabled,
        ...normalizeBranding({
          siteName: patch.siteName ?? current.siteName,
          headerHtml: patch.headerHtml ?? current.headerHtml,
          footerHtml: patch.footerHtml ?? current.footerHtml,
        }),
        faviconMediaId:
          patch.faviconMediaId === undefined ? current.faviconMediaId : patch.faviconMediaId,
      }

      // With the index disabled, `/` must still have a landing page.
      if (!next.allPagesEnabled && !next.homeSlug) {
        throw new Error('a home page is required when all-pages listing is disabled')
      }

      for (const [key, value] of Object.entries(serialize(next))) {
        await repo.set(key, value, by)
      }
      current = next
      revision++
      return { ...current }
    },
  }
}
