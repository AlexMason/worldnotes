// ─── Postgres integration smoke ──────────────────────────────────────────────
// Skipped unless WN_TEST_PG_URL points at a reachable Postgres.
// Local:  docker run --rm -e POSTGRES_HOST_AUTH_METHOD=trust -p 54432:5432 -d postgres:16
//         WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm test
// CI:     postgres service container (see .github/workflows/ci.yml)

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPool } from '../db/pool'
import { createPgPagesRepository } from '../db/pages-pg'
import { createPgSettingsRepository } from '../db/settings-pg'
import { backfillTitles, TITLE_BACKFILL_NAME } from '../db/title-backfill'
import { migrateWithRetry } from './helpers/migrate'
import { describeMoveContract, moveInput } from './helpers/move-contract'

const url = process.env.WN_TEST_PG_URL
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '../../../migrations')

describe.skipIf(!url)('PagesRepository on Postgres', () => {
  // Each run gets its own throwaway database name via the provided URL.
  let pool: ReturnType<typeof createPool>
  let repo: ReturnType<typeof createPgPagesRepository>

  beforeAll(async () => {
    pool = createPool(url as string)
    const applied = await migrateWithRetry(pool, migrationsDir)
    expect(applied.length).toBeGreaterThanOrEqual(0)
    // second run must be idempotent
    expect(await migrateWithRetry(pool, migrationsDir)).toEqual([])
    repo = createPgPagesRepository(pool)
    await pool.query('DELETE FROM pages WHERE slug <> $1', ['home'])
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('migrations create the seeded home page', async () => {
    // Deterministic on fresh DBs (CI); tolerant of reused dev DBs where the
    // seed row may have been edited by manual smoke tests.
    const home = await repo.get('home')
    expect(home).not.toBeNull()
    expect(home!.version).toBeGreaterThanOrEqual(1)
    expect(home!.title.length).toBeGreaterThan(0)
  })

  it('seeds the home page with real newlines (no literal \\n)', async () => {
    const home = await repo.get('home')
    expect(home).not.toBeNull()
    expect(home!.content).toContain('\n')
    expect(home!.content).not.toContain('\\n')
  })

  it('settings round-trip through the Postgres repository', async () => {
    const settings = createPgSettingsRepository(pool)
    await settings.set('search_enabled', 'false', 'sub-1')
    await settings.set('home_slug', 'welcome')
    const all = await settings.getAll()
    expect(all).toMatchObject({ search_enabled: 'false', home_slug: 'welcome' })
    await settings.set('search_enabled', 'true')
    expect((await settings.getAll()).search_enabled).toBe('true')
  })

  it('put / get / version bump round-trip', async () => {
    const first = await repo.put('blog/hello', { title: 'Hello', content: 'one', by: 'sub-1' })
    expect(first.version).toBe(1)
    const second = await repo.put('blog/hello', { title: 'Hello', content: 'two', by: 'sub-1' })
    expect(second.version).toBe(2)
    const got = await repo.get('blog/hello')
    expect(got).toMatchObject({ content: 'two', version: 2, updatedBy: 'sub-1' })
  })

  it('putIfMatch enforces optimistic concurrency', async () => {
    await repo.put('conflict', { title: 'C', content: 'v1' })
    const ok = await repo.putIfMatch('conflict', { title: 'C', content: 'v2' }, 1)
    expect(ok.ok).toBe(true)
    const stale = await repo.putIfMatch('conflict', { title: 'C', content: 'v3' }, 1)
    expect(stale).toMatchObject({ ok: false, reason: 'conflict' })
    const missing = await repo.putIfMatch('nope', { title: 'n', content: '' }, 1)
    expect(missing).toMatchObject({ ok: false, reason: 'missing' })
  })

  it('create rejects duplicate slugs', async () => {
    const res = await repo.create('home', { title: 'Dupe', content: '' })
    expect(res).toMatchObject({ ok: false, reason: 'exists' })
  })

  it('CHECK constraint rejects invalid slugs', async () => {
    await expect(
      pool.query("INSERT INTO pages (slug, title) VALUES ('Bad Slug', 'x')"),
    ).rejects.toThrow()
  })

  it('search matches slug, title, and content case-insensitively', async () => {
    await repo.put('notes/x', { title: 'Findable Title', content: 'boring' })
    await repo.put('other', { title: 'Other', content: 'contains findable-word body' })
    const byTitle = await repo.list({ query: 'FINDABLE' })
    expect(byTitle.map((p) => p.slug).sort()).toEqual(['notes/x', 'other'])
    const pct = await repo.list({ query: '100%' })
    expect(pct).toEqual([])
  })

  it('delete removes rows', async () => {
    await repo.put('temp', { title: 'T', content: '' })
    expect(await repo.delete('temp')).toBe(true)
    expect(await repo.delete('temp')).toBe(false)
  })

  it('deleteIfMatch: conflict keeps the row, correct version removes it, gone is missing', async () => {
    await repo.put('guarded', { title: 'G', content: 'v1' })
    await repo.put('guarded', { title: 'G', content: 'v2' }) // version 2

    const stale = await repo.deleteIfMatch('guarded', 1)
    expect(stale).toMatchObject({ ok: false, reason: 'conflict' })
    if (!stale.ok && stale.reason === 'conflict') expect(stale.current.version).toBe(2)
    expect(await repo.get('guarded')).not.toBeNull()

    expect(await repo.deleteIfMatch('guarded', 2)).toEqual({ ok: true })
    expect(await repo.get('guarded')).toBeNull()

    // Row already removed — classifies as missing, never conflict.
    expect(await repo.deleteIfMatch('guarded', 2)).toMatchObject({ ok: false, reason: 'missing' })
  })

  it('existing reports exactly the stored slugs, deduped, without fetching content', async () => {
    await repo.put('ex/one', { title: 'One', content: 'x' })
    await repo.put('ex/two', { title: 'Two', content: 'x' })
    const found = await repo.existing(['ex/one', 'ex/one', 'ex/ghost', 'ex/two'])
    expect([...found].sort()).toEqual(['ex/one', 'ex/two'])
    expect(await repo.existing([])).toEqual(new Set())
  })

  it('titles maps stored page slugs to titles', async () => {
    await repo.put('ti/one', { title: 'One Title', content: 'x' })
    expect(await repo.titles(['ti/one', 'ti/one', 'ti/ghost'])).toEqual(
      new Map([['ti/one', 'One Title']]),
    )
    expect(await repo.titles([])).toEqual(new Map())
  })

  it('backfillTitles recomputes stale titles once, without bumping versions', async () => {
    await pool.query('DELETE FROM schema_migrations WHERE name = $1', [TITLE_BACKFILL_NAME])
    await repo.put('bf/old-rule', { title: 'Sub Heading', content: '## Sub Heading\n\nbody' })
    await repo.put('bf/kept', { title: 'Kept', content: '# Kept\n\nbody' })

    expect(await backfillTitles(pool)).toBeGreaterThanOrEqual(1)
    expect(await repo.get('bf/old-rule')).toMatchObject({ title: 'Old Rule', version: 1 })
    expect(await repo.get('bf/kept')).toMatchObject({ title: 'Kept', version: 1 })

    // Recorded: a later boot never reruns it.
    await pool.query("UPDATE pages SET title = 'Stale' WHERE slug = 'bf/kept'")
    expect(await backfillTitles(pool)).toBe(0)
    expect((await repo.get('bf/kept'))?.title).toBe('Stale')
  })
})

describe.skipIf(!url)('PagesRepository.move on Postgres', () => {
  let pool: ReturnType<typeof createPool>
  let repo: ReturnType<typeof createPgPagesRepository>

  beforeAll(async () => {
    pool = createPool(url as string)
    await migrateWithRetry(pool, migrationsDir)
    repo = createPgPagesRepository(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  describeMoveContract(
    'pg PagesRepository',
    () => repo,
    async () => {
      await pool.query('DELETE FROM pages WHERE slug <> $1', ['home'])
    },
  )

  it('a save in flight on a linking page is never lost: the move waits and rewrites it', async () => {
    await pool.query('DELETE FROM pages WHERE slug <> $1', ['home'])
    await repo.put('cc/target', { title: 'T', content: 'x' })
    await repo.put('cc/linker', { title: 'L', content: 'old [[/cc/target]]' })

    // A concurrent writer holds the linker row (an UPDATE mid-transaction).
    const writer = await pool.connect()
    try {
      await writer.query('BEGIN')
      await writer.query(
        `UPDATE pages SET content = 'saved [[/cc/target]]', version = version + 1
          WHERE slug = 'cc/linker'`,
      )
      let settled = false
      const moving = repo.move(moveInput('cc/target', 'cc/moved')).finally(() => {
        settled = true
      })
      await new Promise((r) => setTimeout(r, 150))
      expect(settled).toBe(false) // blocked on the row lock
      await writer.query('COMMIT')
      expect((await moving).ok).toBe(true)
    } finally {
      writer.release()
    }
    // The committed save was re-read under the lock and rewritten — not lost.
    expect(await repo.get('cc/linker')).toMatchObject({
      content: 'saved [[/cc/moved]]',
      version: 3,
    })
  })
})

describe.skipIf(!url)('PagesRepository.move concurrency on Postgres', () => {
  let pool: ReturnType<typeof createPool>
  let repo: ReturnType<typeof createPgPagesRepository>

  beforeAll(async () => {
    pool = createPool(url as string)
    await migrateWithRetry(pool, migrationsDir)
    repo = createPgPagesRepository(pool)
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('a move never queues behind another move: it answers busy and changes nothing', async () => {
    await pool.query('DELETE FROM pages WHERE slug <> $1', ['home'])
    await repo.put('busy/a', { title: 'A', content: 'x' })
    const other = await pool.connect()
    try {
      await other.query('BEGIN')
      await other.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['wnmv'])
      expect(await repo.move(moveInput('busy/a', 'busy/b'))).toEqual({ ok: false, reason: 'busy' })
      await other.query('COMMIT')
    } finally {
      other.release()
    }
    expect(await repo.get('busy/a')).not.toBeNull()
  })

  it('moves of missing slugs never hold a second pool connection (no pool exhaustion)', async () => {
    // A pool of 1: a nested checkout inside move would wait forever.
    const tiny = new (await import('pg')).default.Pool({ connectionString: url, max: 1 })
    try {
      const tinyRepo = createPgPagesRepository(tiny)
      await expect(tinyRepo.move(moveInput('nope/nope', 'x'))).resolves.toEqual({
        ok: false,
        reason: 'missing',
      })
    } finally {
      await tiny.end()
    }
  })
})
