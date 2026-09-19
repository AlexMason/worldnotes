// ─── Postgres integration smoke ──────────────────────────────────────────────
// Skipped unless WN_TEST_PG_URL points at a reachable Postgres.
// Local:  docker run --rm -e POSTGRES_HOST_AUTH_METHOD=trust -p 54432:5432 -d postgres:16
//         WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm test
// CI:     postgres service container (see .github/workflows/ci.yml)

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPool } from '../db/pool'
import { runMigrations } from '../db/migrate'
import { createPgPagesRepository } from '../db/pages-pg'

const url = process.env.WN_TEST_PG_URL
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '../../../migrations')

describe.skipIf(!url)('PagesRepository on Postgres', () => {
  // Each run gets its own throwaway database name via the provided URL.
  let pool: ReturnType<typeof createPool>
  let repo: ReturnType<typeof createPgPagesRepository>

  beforeAll(async () => {
    pool = createPool(url as string)
    const applied = await runMigrations(pool, migrationsDir)
    expect(applied.length).toBeGreaterThanOrEqual(0)
    // second run must be idempotent
    expect(await runMigrations(pool, migrationsDir)).toEqual([])
    repo = createPgPagesRepository(pool)
    await pool.query('DELETE FROM pages WHERE slug <> $1', ['home'])
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('migrations create the seeded home page', async () => {
    const home = await repo.get('home')
    expect(home).not.toBeNull()
    expect(home?.title).toBe('Home')
    expect(home?.version).toBe(1)
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
})
