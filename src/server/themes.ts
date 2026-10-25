// ─── Theme service ───────────────────────────────────────────────────────────
// Admin-authored theme stylesheets: validation/normalization on every write,
// the "active theme" resolution used by both render surfaces, and the guard
// that the active theme cannot be deleted. The active POINTER lives in the
// settings service (`activeThemeId`), so activating a theme bumps the same
// revision that busts reader ETags; this service only resolves pointer → CSS.
//
// SECURITY: `css` is raw, admin-trusted text emitted verbatim into an inline
// `<style>` (render/layout.ts, editor shell → client). That is no new
// privilege class — `headerHtml`/`footerHtml` already run arbitrary admin JS
// for every reader (docs/api.md trust model). The guardrails below exist to
// keep a mistake from corrupting the document, not to sandbox the author:
// a size cap, control-character rejection (Postgres `text` rejects NUL), and
// rejection of `</style` — the only sequence that terminates a `<style>`
// raw-text element, i.e. the only break-out of the inline sink.

import type { SettingsService } from './settings'
import { type ThemeRow, type ThemesRepository } from './db/themes-repository'

export const THEME_NAME_MAX = 100
export const THEME_DESCRIPTION_MAX = 500
export const THEME_CSS_MAX = 65_536

/** Operator-facing validation failure → HTTP 400. */
export class ThemeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ThemeValidationError'
  }
}

/** Deleting the active theme is refused → HTTP 409. */
export class ThemeActiveError extends Error {
  constructor() {
    super('theme is active — activate another theme (or none) before deleting it')
    this.name = 'ThemeActiveError'
  }
}

/** Untrusted field bag (parsed request body); the service validates it. */
export interface ThemeFieldsInput {
  name?: unknown
  description?: unknown
  css?: unknown
}

export interface ThemeService {
  list(): Promise<ThemeRow[]>
  get(id: number): Promise<ThemeRow | null>
  /** Validates, then persists. Throws ThemeValidationError / ThemeNameTakenError. */
  create(input: ThemeFieldsInput, by?: string | null): Promise<ThemeRow>
  /** Partial update; null when the id does not exist. */
  update(id: number, input: ThemeFieldsInput, by?: string | null): Promise<ThemeRow | null>
  /** False when the id does not exist; throws ThemeActiveError when active. */
  remove(id: number): Promise<boolean>
  /** True when a theme row with this id exists (activation/preview checks). */
  exists(id: number): Promise<boolean>
  /** CSS of an arbitrary theme (preview); null when it does not exist. */
  cssFor(id: number): Promise<string | null>
  /**
   * CSS of the active theme, '' when none is active or the pointer dangles
   * (a missing theme degrades to the default look, never to an error).
   */
  activeCss(): Promise<string>
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
const STYLE_CLOSE = /<\/style/i

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ThemeValidationError(`${field} must be a string`)
  return value
}

function normalizeName(value: unknown): string {
  const raw = requireString(value, 'name')
  if (CONTROL_CHARS.test(raw)) throw new ThemeValidationError('name contains control characters')
  const name = collapseWhitespace(raw)
  if (name === '') throw new ThemeValidationError('name must not be empty')
  if (name.length > THEME_NAME_MAX) {
    throw new ThemeValidationError(`name exceeds ${THEME_NAME_MAX} characters`)
  }
  return name
}

function normalizeDescription(value: unknown): string {
  const raw = requireString(value, 'description')
  if (CONTROL_CHARS.test(raw)) {
    throw new ThemeValidationError('description contains control characters')
  }
  const description = collapseWhitespace(raw)
  if (description.length > THEME_DESCRIPTION_MAX) {
    throw new ThemeValidationError(`description exceeds ${THEME_DESCRIPTION_MAX} characters`)
  }
  return description
}

/** CSS is stored verbatim (whitespace is meaningful), only gated. */
function validateCss(value: unknown): string {
  const css = requireString(value, 'css')
  if (css.length > THEME_CSS_MAX) {
    throw new ThemeValidationError(`css exceeds ${THEME_CSS_MAX} characters`)
  }
  if (CONTROL_CHARS.test(css)) throw new ThemeValidationError('css contains control characters')
  if (STYLE_CLOSE.test(css)) throw new ThemeValidationError('css must not contain “</style”')
  return css
}

export function createThemeService(
  repo: ThemesRepository,
  settings: SettingsService,
): ThemeService {
  // Memo of the active theme's CSS keyed by id. Cleared after every mutation,
  // so an edit to the active theme is visible on the next render without a
  // restart; a pointer change misses by id and reloads.
  let memo: { id: number; css: string } | null = null
  // Bumped by every mutation; a load that raced a write never memoizes.
  let generation = 0
  const invalidate = (): void => {
    memo = null
    generation++
  }

  return {
    list: () => repo.list(),
    get: (id) => repo.get(id),

    async create(input, by = null) {
      const name = normalizeName(input.name)
      const description =
        input.description === undefined ? '' : normalizeDescription(input.description)
      const css = validateCss(input.css ?? '')
      try {
        return await repo.create({ name, description, css, by })
      } finally {
        invalidate()
      }
    },

    async update(id, input, by = null) {
      const patch: { name?: string; description?: string; css?: string; by: string | null } = {
        by,
      }
      if (input.name !== undefined) patch.name = normalizeName(input.name)
      if (input.description !== undefined) {
        patch.description = normalizeDescription(input.description)
      }
      if (input.css !== undefined) patch.css = validateCss(input.css)
      try {
        return await repo.update(id, patch)
      } finally {
        invalidate()
      }
    },

    async remove(id) {
      if (settings.get().activeThemeId === id) throw new ThemeActiveError()
      try {
        return await repo.delete(id)
      } finally {
        invalidate()
      }
    },

    async exists(id) {
      return (await repo.get(id)) !== null
    },

    async cssFor(id) {
      return (await repo.get(id))?.css ?? null
    },

    async activeCss() {
      const id = settings.get().activeThemeId
      if (id === null) return ''
      if (memo?.id === id) return memo.css
      const loadedAt = generation
      const row = await repo.get(id)
      // A dangling pointer is not memoized: re-checking is one indexed read
      // per render and lets a restored/recreated row take effect.
      if (!row) return ''
      if (generation === loadedAt) memo = { id, css: row.css }
      return row.css
    },
  }
}
