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

  it('parses all_pages_enabled true/false and defaults to true', () => {
    expect(parseSettings({ all_pages_enabled: 'false' }).allPagesEnabled).toBe(false)
    expect(parseSettings({ all_pages_enabled: 'true' }).allPagesEnabled).toBe(true)
    expect(parseSettings({}).allPagesEnabled).toBe(true)
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
    const repo = createMemorySettingsRepository({
      search_enabled: 'false',
      home_slug: 'welcome',
      all_pages_enabled: 'false',
    })
    const svc = await createSettingsService(repo)
    const s = svc.get()
    expect(s).toEqual({
      searchEnabled: false,
      homeSlug: 'welcome',
      allPagesEnabled: false,
      siteName: 'WorldNotes',
      headerHtml: '',
      footerHtml: '',
    })
    s.searchEnabled = true
    expect(svc.get().searchEnabled).toBe(false)
  })

  it('persists and returns an updated patch', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    const next = await svc.update({ searchEnabled: false, homeSlug: 'blog/intro' })
    expect(next).toEqual({
      searchEnabled: false,
      homeSlug: 'blog/intro',
      allPagesEnabled: true,
      siteName: 'WorldNotes',
      headerHtml: '',
      footerHtml: '',
    })
    expect(svc.get()).toEqual(next)
    expect(await repo.getAll()).toEqual({
      search_enabled: 'false',
      home_slug: 'blog/intro',
      all_pages_enabled: 'true',
      site_name: 'WorldNotes',
      header_html: '',
      footer_html: '',
    })
  })

  it('rejects disabling the all-pages listing without a home page', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    await expect(svc.update({ allPagesEnabled: false })).rejects.toThrow(/home page is required/)
    // With a home page configured, it succeeds…
    await svc.update({ homeSlug: 'welcome' })
    const next = await svc.update({ allPagesEnabled: false })
    expect(next.allPagesEnabled).toBe(false)
    // …and clearing the home page afterwards is rejected while disabled.
    await expect(svc.update({ homeSlug: null })).rejects.toThrow(/home page is required/)
  })

  it('rejects a non-boolean allPagesEnabled', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ allPagesEnabled: 'yes' as unknown as boolean })).rejects.toThrow(
      /boolean/,
    )
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

  it('normalizes siteName on the write path (trim/collapse, blank → default)', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    expect((await svc.update({ siteName: '  Mason\u2019s Wiki  ' })).siteName).toBe(
      'Mason\u2019s Wiki',
    )
    expect((await svc.update({ siteName: 'a\n b' })).siteName).toBe('a b')
    expect((await svc.update({ siteName: '   ' })).siteName).toBe('WorldNotes')
    expect((await svc.get()).siteName).toBe('WorldNotes')
  })

  it('enforces caps on write and clamps corrupt rows on read', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    await expect(svc.update({ siteName: 'x'.repeat(201) })).rejects.toThrow(/exceeds 200/)
    await expect(svc.update({ headerHtml: '<p>' + 'x'.repeat(20_000) })).rejects.toThrow(
      /exceeds 20000/,
    )
    // A corrupt over-long DB row (out-of-band write) degrades to a truncated
    // value at parse time rather than breaking the read path.
    const corrupt = createMemorySettingsRepository({
      site_name: 'y'.repeat(500),
      footer_html: 'z'.repeat(50_000),
    })
    const boot = await createSettingsService(corrupt)
    expect(boot.get().siteName).toHaveLength(200)
    expect(boot.get().footerHtml).toHaveLength(20_000)
  })

  it('rejects control characters (NUL would break Postgres text)', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ headerHtml: '<p>\u0000</p>' })).rejects.toThrow(/control characters/)
    await expect(svc.update({ siteName: 'a\u0007' })).rejects.toThrow(/control characters/)
  })

  it('rejects non-string branding values', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ siteName: 5 as unknown as string })).rejects.toThrow(
      /must be a string/,
    )
    await expect(svc.update({ footerHtml: {} as unknown as string })).rejects.toThrow(
      /must be a string/,
    )
  })

  it('bumps the revision on every successful update only', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    expect(svc.getRevision()).toBe(0)
    await svc.update({ searchEnabled: false })
    expect(svc.getRevision()).toBe(1)
    await expect(svc.update({ homeSlug: 'Nope' })).rejects.toThrow()
    expect(svc.getRevision()).toBe(1)
    await svc.update({ headerHtml: '<marquee>hi</marquee>' })
    expect(svc.getRevision()).toBe(2)
  })
})
