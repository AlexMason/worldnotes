// ─── Instance settings service ───────────────────────────────────────────────
// Loads key/value settings from a SettingsRepository at boot, caches them in
// memory (single-instance assumption, same as the render cache), and exposes a
// validated, typed view. Reads re-validate/normalize so a corrupt stored row
// degrades to defaults and never breaks the read path.

import type { SettingsRepository } from './db/settings-repository'
import { validateSlug } from '../shared/slug'

const KEY_SEARCH = 'search_enabled'
const KEY_HOME = 'home_slug'

export interface AppSettings {
  searchEnabled: boolean
  /** Slug rendered at `/`; null = show the index listing. */
  homeSlug: string | null
}

export interface SettingsPatch {
  searchEnabled?: boolean
  homeSlug?: string | null
}

export interface SettingsService {
  /** Current settings (defensive copy). */
  get(): AppSettings
  /** Merge a patch, persist changed values, and return the new settings. */
  update(patch: SettingsPatch, by?: string | null): Promise<AppSettings>
}

export const DEFAULT_SETTINGS: AppSettings = { searchEnabled: true, homeSlug: null }

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

/** Normalize raw key/value rows into validated settings. */
export function parseSettings(raw: Record<string, string>): AppSettings {
  const homeRaw = (raw[KEY_HOME] ?? '').trim()
  let homeSlug: string | null = null
  if (homeRaw !== '') {
    const validated = validateSlug(homeRaw)
    if (validated.ok) homeSlug = validated.slug
  }
  return {
    searchEnabled: parseBool(raw[KEY_SEARCH], true),
    homeSlug,
  }
}

function serialize(settings: AppSettings): Record<string, string> {
  return {
    [KEY_SEARCH]: settings.searchEnabled ? 'true' : 'false',
    [KEY_HOME]: settings.homeSlug ?? '',
  }
}

export async function createSettingsService(repo: SettingsRepository): Promise<SettingsService> {
  let current = parseSettings(await repo.getAll())

  return {
    get() {
      return { ...current }
    },

    async update(patch, by = null) {
      if (patch.searchEnabled !== undefined && typeof patch.searchEnabled !== 'boolean') {
        throw new Error('searchEnabled must be a boolean')
      }
      if (patch.homeSlug !== undefined && patch.homeSlug !== null) {
        const validated = validateSlug(patch.homeSlug)
        if (!validated.ok) throw new Error(`invalid home slug: ${validated.error}`)
      }

      const next: AppSettings = {
        searchEnabled: patch.searchEnabled ?? current.searchEnabled,
        homeSlug: patch.homeSlug === undefined ? current.homeSlug : patch.homeSlug,
      }

      for (const [key, value] of Object.entries(serialize(next))) {
        await repo.set(key, value, by)
      }
      current = next
      return { ...current }
    },
  }
}
