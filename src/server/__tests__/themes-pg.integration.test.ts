// ─── ThemesRepository on Postgres ────────────────────────────────────────────
// Skipped unless WN_TEST_PG_URL points at a reachable Postgres (same gate and
// local recipe as pages-pg.integration.test.ts).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPool, type SqlPool } from '../db/pool'
import { createPgThemesRepository } from '../db/themes-pg'
import { ThemeNameTakenError, type ThemesRepository } from '../db/themes-repository'
import { migrateWithRetry } from './helpers/migrate'

const url = process.env.WN_TEST_PG_URL
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '../../../migrations')

describe.skipIf(!url)('ThemesRepository on Postgres', () => {
  let pool: SqlPool
  let repo: ThemesRepository

  beforeAll(async () => {
    pool = createPool(url as string)
    await migrateWithRetry(pool, migrationsDir)
    repo = createPgThemesRepository(pool)
    await pool.query('DELETE FROM themes')
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('round-trips a theme and lists oldest first', async () => {
    const a = await repo.create({ name: 'A', description: 'first', css: 'a{}', by: 'boss' })
    const b = await repo.create({ name: 'B', description: '', css: 'b{}' })
    expect(a.id).toBeLessThan(b.id)
    expect(a).toMatchObject({ name: 'A', description: 'first', css: 'a{}', updatedBy: 'boss' })
    expect((await repo.get(a.id))?.css).toBe('a{}')
    expect((await repo.list()).map((t) => t.name)).toEqual(['A', 'B'])
  })

  it('maps unique-name violations to ThemeNameTakenError on create and rename', async () => {
    await expect(repo.create({ name: 'A', description: '', css: '' })).rejects.toBeInstanceOf(
      ThemeNameTakenError,
    )
    const b = (await repo.list()).find((t) => t.name === 'B')!
    await expect(repo.update(b.id, { name: 'A' })).rejects.toBeInstanceOf(ThemeNameTakenError)
  })

  it('updates only provided fields and stamps updated_at/by', async () => {
    const a = (await repo.list()).find((t) => t.name === 'A')!
    const updated = await repo.update(a.id, { css: 'a{color:red}', by: 'someone' })
    expect(updated).toMatchObject({
      name: 'A',
      description: 'first',
      css: 'a{color:red}',
      updatedBy: 'someone',
    })
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(a.updatedAt)
    expect(await repo.update(999_999, { css: 'x' })).toBeNull()
  })

  it('stores css verbatim at the 64 KiB cap and rejects beyond it', async () => {
    const css = 'x'.repeat(65_536)
    const row = await repo.create({ name: 'Big', description: '', css })
    expect((await repo.get(row.id))?.css).toHaveLength(65_536)
    await expect(repo.create({ name: 'TooBig', description: '', css: css + 'x' })).rejects.toThrow()
  })

  it('deletes rows and reports whether one existed', async () => {
    const row = await repo.create({ name: 'Temp', description: '', css: '' })
    expect(await repo.delete(row.id)).toBe(true)
    expect(await repo.delete(row.id)).toBe(false)
    expect(await repo.get(row.id)).toBeNull()
  })
})
