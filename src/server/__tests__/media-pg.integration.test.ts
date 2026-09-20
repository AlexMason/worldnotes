// ─── MediaRepository on Postgres ─────────────────────────────────────────────
// Skipped unless WN_TEST_PG_URL points at a reachable Postgres (same gate and
// local recipe as pages-pg.integration.test.ts).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPool } from '../db/pool'
import { createPgMediaRepository } from '../db/media-pg'
import { migrateWithRetry } from './helpers/migrate'
import { pngBytes, GIF_BYTES, ICO_BYTES } from './helpers/media-fixtures'

const url = process.env.WN_TEST_PG_URL
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '../../../migrations')

const PNG = pngBytes()

describe.skipIf(!url)('MediaRepository on Postgres', () => {
  let pool: ReturnType<typeof createPool>
  let repo: ReturnType<typeof createPgMediaRepository>

  beforeAll(async () => {
    pool = createPool(url as string)
    await migrateWithRetry(pool, migrationsDir)
    repo = createPgMediaRepository(pool)
    await pool.query('DELETE FROM media')
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('round-trips bytes, dimensions and type', async () => {
    const { id } = await repo.insert({
      mediaType: 'image/png',
      width: 1,
      height: 1,
      data: PNG,
      by: 'test-subject',
    })
    const row = await repo.get(id)
    expect(row).not.toBeNull()
    expect(row!.id).toBe(id)
    expect(row!.mediaType).toBe('image/png')
    expect(row!.width).toBe(1)
    expect(row!.height).toBe(1)
    expect(row!.sizeBytes).toBe(PNG.byteLength)
    expect(Buffer.compare(row!.data, PNG)).toBe(0)
  })

  it('get on unknown id returns null', async () => {
    expect(await repo.get(999999)).toBeNull()
  })

  it('CHECK constraint rejects disallowed types', async () => {
    await expect(
      pool.query(
        `INSERT INTO media (media_type, size_bytes, data)
         VALUES ('image/svg+xml', $1, $2)`,
        [PNG.byteLength, PNG],
      ),
    ).rejects.toThrow()
  })

  it('accepts ICO and GIF rows', async () => {
    const ico = await repo.insert({ mediaType: 'image/vnd.microsoft.icon', width: 1, height: 1, data: ICO_BYTES })
    const gif = await repo.insert({ mediaType: 'image/gif', width: 1, height: 1, data: GIF_BYTES })
    expect((await repo.get(ico.id))!.mediaType).toBe('image/vnd.microsoft.icon')
    expect((await repo.get(gif.id))!.mediaType).toBe('image/gif')
  })

  it('delete removes rows and reports misses', async () => {
    const { id } = await repo.insert({ mediaType: 'image/png', width: 1, height: 1, data: PNG })
    expect(await repo.delete(id)).toBe(true)
    expect(await repo.delete(id)).toBe(false)
    expect(await repo.get(id)).toBeNull()
  })
})
