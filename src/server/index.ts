// ─── Server bootstrap ────────────────────────────────────────────────────────
// Wire env → pool → migrations → repository → app → listen.

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadConfig } from './config'
import { buildApp } from './app'
import { createRelyingParty, type OidcRelyingParty } from './auth/oidc'
import { createPool } from './db/pool'
import { runMigrations } from './db/migrate'
import { createPgPagesRepository } from './db/pages-pg'

const here = dirname(fileURLToPath(import.meta.url))

async function main(): Promise<void> {
  const config = loadConfig()
  const pool = createPool(config.env.DATABASE_URL)
  const migrationsDir = process.env.MIGRATIONS_DIR ?? resolve(here, '../../migrations')

  const applied = await runMigrations(pool, migrationsDir)
  if (applied.length) console.warn(`applied migrations: ${applied.join(', ')}`)

  let relyingParty: OidcRelyingParty | null = null
  if (!config.authDisabled && config.oidc) {
    relyingParty = await createRelyingParty(config)
  }

  const app = await buildApp({
    config,
    pages: createPgPagesRepository(pool),
    relyingParty,
    clientAssetsDir: resolve(here, '../../dist/client'),
    logger:
      config.env.LOG_LEVEL === 'silent' ? false : { level: config.env.LOG_LEVEL },
  })

  app.log.info(
    `WorldNotes server on http://${config.env.HOST}:${config.env.PORT} (auth ${config.authDisabled ? 'DISABLED' : 'OIDC'})`,
  )
  await app.listen({ host: config.env.HOST, port: config.env.PORT })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
