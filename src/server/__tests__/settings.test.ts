import { describe, it, expect } from 'vitest'
import { createSettingsService, parseSettings, DEFAULT_SETTINGS } from '../settings'
import { createMemorySettingsRepository } from '../db/settings-memory'

describe('parseSettings', () => {
  it('returns defaults when no keys are stored', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('parses search_enabled true/false', () => {
    expect(parseSettings({ search_enabled: 'true' }).searchEnabled).toBe(true)
    expect(parseSettings({ search_enabled: 'false' }).searchEnabled).toBe(false)
  })

  it('degrades a corrupt search_enabled value to the default (true)', () => {
    expect(parseSettings({ search_enabled: 'banana' }).searchEnabled).toBe(true)
  })

  it('parses a valid home_slug and normalizes it', () => {
    expect(parseSettings({ home_slug: 'blog/first-post' }).homeSlug).toBe('blog/first-post')
  })

  it('treats empty/whitespace home_slug as unset', () => {
    expect(parseSettings({ home_slug: '' }).homeSlug).toBeNull()
    expect(parseSettings({ home_slug: '   ' }).homeSlug).toBeNull()
  })

  it('degrades an invalid stored home_slug to unset', () => {
    expect(parseSettings({ home_slug: 'Bad Slug!' }).homeSlug).toBeNull()
    expect(parseSettings({ home_slug: 'UPPER' }).homeSlug).toBeNull()
  })
})

describe('createSettingsService', () => {
  it('loads existing values and returns a defensive copy from get()', async () => {
    const repo = createMemorySettingsRepository({ search_enabled: 'false', home_slug: 'welcome' })
    const svc = await createSettingsService(repo)
    const s = svc.get()
    expect(s).toEqual({ searchEnabled: false, homeSlug: 'welcome' })
    s.searchEnabled = true
    expect(svc.get().searchEnabled).toBe(false)
  })

  it('persists and returns an updated patch', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    const next = await svc.update({ searchEnabled: false, homeSlug: 'blog/intro' })
    expect(next).toEqual({ searchEnabled: false, homeSlug: 'blog/intro' })
    expect(svc.get()).toEqual(next)
    expect(await repo.getAll()).toEqual({ search_enabled: 'false', home_slug: 'blog/intro' })
  })

  it('clears home_slug when set to null/empty', async () => {
    const repo = createMemorySettingsRepository({ home_slug: 'welcome' })
    const svc = await createSettingsService(repo)
    await svc.update({ homeSlug: null })
    expect(svc.get().homeSlug).toBeNull()
  })

  it('rejects a non-boolean searchEnabled', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ searchEnabled: 'yes' as unknown as boolean })).rejects.toThrow(
      /boolean/,
    )
  })

  it('rejects an invalid home_slug', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ homeSlug: 'Bad Slug' })).rejects.toThrow(/invalid home slug/)
    await expect(svc.update({ homeSlug: 'UPPER' })).rejects.toThrow(/invalid home slug/)
  })
})
