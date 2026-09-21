import { describe, it, expect } from 'vitest'
import { createSettingsService, parseSettings, DEFAULT_SETTINGS } from '../settings'
import { createMemorySettingsRepository } from '../db/settings-memory'

describe('parseSettings', () => {
  it('returns defaults when no keys are stored', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('parses favicon_media_id; corrupt/empty/non-positive degrades to null', () => {
    expect(parseSettings({ favicon_media_id: '7' }).faviconMediaId).toBe(7)
    expect(parseSettings({ favicon_media_id: '' }).faviconMediaId).toBeNull()
    expect(parseSettings({ favicon_media_id: 'banana' }).faviconMediaId).toBeNull()
    expect(parseSettings({ favicon_media_id: '0' }).faviconMediaId).toBeNull()
    expect(parseSettings({ favicon_media_id: '-3' }).faviconMediaId).toBeNull()
    expect(parseSettings({ favicon_media_id: '1.5' }).faviconMediaId).toBeNull()
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

  it('parses nav_slug with the same policy as home_slug', () => {
    expect(parseSettings({ nav_slug: 'nav' }).navSlug).toBe('nav')
    expect(parseSettings({ nav_slug: '  ' }).navSlug).toBeNull()
    expect(parseSettings({ nav_slug: 'Bad Slug!' }).navSlug).toBeNull()
    expect(parseSettings({}).navSlug).toBeNull()
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
      navSlug: null,
      allPagesEnabled: false,
      siteName: 'WorldNotes',
      headerHtml: '',
      footerHtml: '',
      faviconMediaId: null,
      requireLogin: false,
      notFoundSlug: null,
      forbiddenSlug: null,
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
      navSlug: null,
      allPagesEnabled: true,
      siteName: 'WorldNotes',
      headerHtml: '',
      footerHtml: '',
      faviconMediaId: null,
      requireLogin: false,
      notFoundSlug: null,
      forbiddenSlug: null,
    })
    expect(svc.get()).toEqual(next)
    expect(await repo.getAll()).toEqual({
      search_enabled: 'false',
      home_slug: 'blog/intro',
      nav_slug: '',
      all_pages_enabled: 'true',
      site_name: 'WorldNotes',
      header_html: '',
      footer_html: '',
      favicon_media_id: '',
      require_login: 'false',
      not_found_slug: '',
      forbidden_slug: '',
    })
  })

  it('persists a nav page and clears it with an empty field', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    const next = await svc.update({ navSlug: 'navigation' })
    expect(next.navSlug).toBe('navigation')
    expect((await repo.getAll()).nav_slug).toBe('navigation')
    expect((await svc.update({ navSlug: '  ' })).navSlug).toBeNull()
    expect((await repo.getAll()).nav_slug).toBe('')
  })

  it('rejects an invalid nav_slug on the write path', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ navSlug: 'Bad Slug' })).rejects.toThrow(/invalid nav slug/)
  })

  it('clears home_slug from an empty string (admin form blanks the field)', async () => {
    const repo = createMemorySettingsRepository({ home_slug: 'welcome' })
    const svc = await createSettingsService(repo)
    expect((await svc.update({ homeSlug: '' })).homeSlug).toBeNull()
    expect((await repo.getAll()).home_slug).toBe('')
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

  it('round-trips faviconMediaId and clears it back to bundled defaults', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    const next = await svc.update({ faviconMediaId: 42 })
    expect(next.faviconMediaId).toBe(42)
    expect(await repo.getAll()).toMatchObject({ favicon_media_id: '42' })
    // boot-read of the stored row sees the same value the live view holds
    const reloaded = await createSettingsService(repo)
    expect(reloaded.get().faviconMediaId).toBe(42)
    await reloaded.update({ faviconMediaId: null })
    expect(reloaded.get().faviconMediaId).toBeNull()
  })

  it('rejects non-integer / non-positive faviconMediaId patches', async () => {
    const svc = await createSettingsService(createMemorySettingsRepository())
    await expect(svc.update({ faviconMediaId: 0 })).rejects.toThrow(/positive integer or null/)
    await expect(svc.update({ faviconMediaId: -2 })).rejects.toThrow(/positive integer or null/)
    await expect(svc.update({ faviconMediaId: 1.5 })).rejects.toThrow(/positive integer or null/)
    await expect(svc.update({ faviconMediaId: '7' as unknown as number })).rejects.toThrow(
      /positive integer or null/,
    )
    expect(svc.get().faviconMediaId).toBeNull()
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

  // SECURITY: the highest-blast-radius default in the roles feature — a
  // pre-feature settings row must NEVER parse as login-only.
  it('rows written before the roles feature parse requireLogin false', () => {
    const legacy = {
      search_enabled: 'true',
      home_slug: 'welcome',
      nav_slug: '',
      all_pages_enabled: 'true',
      site_name: 'WorldNotes',
      header_html: '',
      footer_html: '',
      favicon_media_id: '',
    }
    expect(parseSettings(legacy).requireLogin).toBe(false)
    expect(parseSettings(legacy).notFoundSlug).toBeNull()
    expect(parseSettings(legacy).forbiddenSlug).toBeNull()
    expect(parseSettings({ require_login: 'banana' }).requireLogin).toBe(false)
  })

  it('round-trips requireLogin and status slugs; blank clears; invalid rejects', async () => {
    const repo = createMemorySettingsRepository()
    const svc = await createSettingsService(repo)
    const next = await svc.update({
      requireLogin: true,
      notFoundSlug: 'not-found',
      forbiddenSlug: 'no-access',
    })
    expect(next.requireLogin).toBe(true)
    expect(next.notFoundSlug).toBe('not-found')
    expect(next.forbiddenSlug).toBe('no-access')
    expect((await repo.getAll()).require_login).toBe('true')
    const cleared = await svc.update({
      requireLogin: false,
      notFoundSlug: '  ',
      forbiddenSlug: null,
    })
    expect(cleared.requireLogin).toBe(false)
    expect(cleared.notFoundSlug).toBeNull()
    expect(cleared.forbiddenSlug).toBeNull()
    await expect(svc.update({ notFoundSlug: 'Bad Slug' })).rejects.toThrow(/invalid notFound slug/)
    await expect(svc.update({ requireLogin: 'yes' as unknown as boolean })).rejects.toThrow(
      /requireLogin must be a boolean/,
    )
  })
})
