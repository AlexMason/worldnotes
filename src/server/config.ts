// ─── Server Configuration ────────────────────────────────────────────────────
// All deployment knobs come from environment variables, validated at boot.

import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1).default('postgres://localhost:5432/worldnotes'),

  // OIDC (generic provider via discovery). Required unless AUTH_DISABLED=1.
  OIDC_ISSUER: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  /** Absolute redirect URL registered with the provider, e.g. https://notes.example/oidc/callback */
  OIDC_REDIRECT_URL: z.string().url().optional(),
  /** Comma-separated list; first entry encrypts new cookies, all entries decrypt (rotation). */
  SESSION_SECRETS: z.string().min(32).optional(),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(28_800),
  /** DEV ONLY: bypass OIDC with a fake editor user. Refused in production. */
  AUTH_DISABLED: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),

  // Read-path render cache
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(200),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(55),

  // Editor client autosave debounce
  AUTOSAVE_DEBOUNCE_MS: z.coerce.number().int().positive().default(1500),
})

export type Env = z.infer<typeof EnvSchema>

export interface ServerConfig {
  env: Env
  isProduction: boolean
  oidc: {
    issuer: string
    clientId: string
    clientSecret: string
    redirectUrl: string
  } | null
  sessionSecrets: string[]
  authDisabled: boolean
}

export function loadConfig(
  overrides: Record<string, string | undefined> = {},
): ServerConfig {
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides })
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration — ${details}`)
  }
  const env = parsed.data
  const isProduction = env.NODE_ENV === 'production'

  const authDisabled = env.AUTH_DISABLED && !isProduction ? true : false
  if (env.AUTH_DISABLED && isProduction) {
    throw new Error('AUTH_DISABLED is not permitted when NODE_ENV=production')
  }

  let oidc: ServerConfig['oidc'] = null
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URL } = env
  if (OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_CLIENT_SECRET && OIDC_REDIRECT_URL) {
    oidc = {
      issuer: OIDC_ISSUER,
      clientId: OIDC_CLIENT_ID,
      clientSecret: OIDC_CLIENT_SECRET,
      redirectUrl: OIDC_REDIRECT_URL,
    }
  } else if (!authDisabled) {
    throw new Error(
      'OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET and OIDC_REDIRECT_URL are ' +
        'required unless AUTH_DISABLED=1 (development only)',
    )
  }

  const sessionSecrets = (env.SESSION_SECRETS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!authDisabled && sessionSecrets.length === 0) {
    throw new Error('SESSION_SECRETS (comma-separated, >=32 chars each) is required')
  }
  if (!authDisabled && sessionSecrets.some((s) => s.length < 32)) {
    throw new Error('Every SESSION_SECRETS entry must be at least 32 characters')
  }

  return { env, isProduction, oidc, sessionSecrets, authDisabled }
}
