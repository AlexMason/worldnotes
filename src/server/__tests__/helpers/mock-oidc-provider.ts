// ─── Mock OIDC provider ──────────────────────────────────────────────────────
// Implements discovery, JWKS, and token endpoints with a real RS256 keypair so
// openid-client performs full signature + claim validation — no network needed.

import { generateKeyPairSync, createSign } from 'node:crypto'

const keypair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const publicJwk = keypair.publicKey.export({ format: 'jwk' }) as {
  n: string
  e: string
}

const KID = 'test-key-1'
export const ISSUER = 'https://idp.test/realms/worldnotes'
// Hyphenated like a real deployment (UUID client id, 'ta-' style secret):
// encodes any client that percent-form-encodes Basic credentials (RFC 6749
// App. B style) — TinyAuth-like servers compare raw and reject them.
export const CLIENT_ID = '9231f655-282b-4140-83e1-8f467b5a3272'
export const CLIENT_SECRET = 'ta-rku-1zyv-749c-xisb-gf6q'
export const REDIRECT_URL = 'http://localhost:3000/oidc/callback'

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf as never)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export interface IdTokenClaims {
  iss: string
  aud: string
  sub: string
  exp: number
  iat: number
  nonce?: string
  email?: string
  name?: string
}

export function signIdToken(claims: IdTokenClaims): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID }))
  const payload = b64url(JSON.stringify(claims))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  return `${header}.${payload}.${b64url(signer.sign(keypair.privateKey).toString('base64url'))}`
}

/** Mutable canned responses for the fake token endpoint. */
export const tokenEndpoint = {
  response: (): { status: number; body: unknown } => ({
    status: 200,
    body: {},
  }),
}

const serverMetadata = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/protocol/openid-connect/auth`,
  token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
  jwks_uri: `${ISSUER}/protocol/openid-connect/certs`,
  end_session_endpoint: `${ISSUER}/protocol/openid-connect/logout`,
  response_types_supported: ['code'],
  id_token_signing_alg_values_supported: ['RS256'],
  subject_types_supported: ['public'],
  scopes_supported: ['openid', 'email', 'profile'],
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
}

/** openid-client customFetch implementation. */
export const mockFetch = (async (
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<Response> => {
  const u = new URL(url)
  if (u.pathname.endsWith('/.well-known/openid-configuration')) {
    return Response.json(serverMetadata)
  }
  if (u.pathname.endsWith('/certs')) {
    return Response.json({
      keys: [{ kty: 'RSA', kid: KID, alg: 'RS256', use: 'sig', n: publicJwk.n, e: publicJwk.e }],
    })
  }
  if (u.pathname.endsWith('/token')) {
    // TinyAuth-like: raw-credential Basic auth, literal comparison.
    const expected =
      'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`, 'utf8').toString('base64')
    const headers = options.headers ?? {}
    const auth = Object.entries(headers).find(([k]) => k.toLowerCase() === 'authorization')?.[1]
    if (auth !== expected) {
      return Response.json({ error: 'invalid_client' }, { status: 400 })
    }
    const body = options.body as URLSearchParams
    if (body.get?.('grant_type') !== 'authorization_code') {
      return Response.json({ error: 'unsupported_grant_type' }, { status: 400 })
    }
    const { status, body: json } = tokenEndpoint.response()
    return Response.json(json, { status })
  }
  return new Response('not found', { status: 404 })
}) as never

export function idTokenFor(nonce: string, over: Partial<IdTokenClaims> = {}): string {
  const now = Math.floor(Date.now() / 1000)
  return signIdToken({
    iss: ISSUER,
    aud: CLIENT_ID,
    sub: 'user-42',
    exp: now + 300,
    iat: now,
    nonce,
    email: 'alice@example.com',
    name: 'Alice Example',
    ...over,
  })
}
