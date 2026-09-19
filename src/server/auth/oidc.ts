// ─── OIDC relying party (generic provider via discovery) ─────────────────────
// Authorization Code flow with state + PKCE + nonce (ID token replay binding)
// and iss/aud validation performed by openid-client. All discovery/transport
// is injectable so tests run without network access.

import * as oidc from 'openid-client'
import type { ServerConfig } from '../config'
import type { SessionUser } from './session'
import type { SealedFields } from './session'

const customFetch = (oidc as unknown as { customFetch: symbol }).customFetch

export interface PendingAuth extends SealedFields {
  state: string
  nonce: string
  verifier: string
  returnTo: string | null
}

export interface CallbackInput {
  /** Absolute URL of the incoming callback including query string. */
  callbackUrl: URL
  pending: PendingAuth
}

export interface OidcRelyingParty {
  /** Build the provider authorization URL + pending-state to persist. */
  startLogin(returnTo: string | null): Promise<{ url: string; pending: PendingAuth }>
  /** Validate + exchange; throws on any protocol violation. */
  completeLogin(input: CallbackInput): Promise<SessionUser>
  /** RP-initiated logout URL when the provider advertises one. */
  endSessionUrl(): string | null
}

export interface OidcDeps {
  /** fetch override used for discovery + token exchange (tests). */
  fetch?: unknown
}

/**
 * Open-redirect guard: only accept app-relative targets. Reject scheme
 * relative (`//host`), absolute URLs, and backslash variants.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (/[\s\p{Cc}]/u.test(raw)) return null
  return raw
}

export async function createRelyingParty(
  config: ServerConfig,
  deps: OidcDeps = {},
): Promise<OidcRelyingParty> {
  const oidcCfg = config.oidc
  if (!oidcCfg) throw new Error('createRelyingParty: OIDC not configured')

  const options = deps.fetch
    ? { [customFetch]: deps.fetch }
    : undefined

  const rp = await oidc.discovery(
    new URL(oidcCfg.issuer),
    oidcCfg.clientId,
    {
      client_secret: oidcCfg.clientSecret,
      redirect_uris: [oidcCfg.redirectUrl],
      response_types: ['code'],
      grant_types: ['authorization_code'],
    },
    oidc.ClientSecretBasic(oidcCfg.clientSecret),
    options,
  )

  if (!config.isProduction) {
    // Dev providers are often plain http (localhost Keycloak/Authentik).
    try {
      oidc.allowInsecureRequests(rp)
    } catch {
      /* already https */
    }
  }

  return {
    async startLogin(returnTo) {
      const state = oidc.randomState()
      const nonce = oidc.randomNonce()
      const verifier = oidc.randomPKCECodeVerifier()
      const challenge = await oidc.calculatePKCECodeChallenge(verifier)

      const url = oidc
        .buildAuthorizationUrl(rp, {
          redirect_uri: oidcCfg.redirectUrl,
          scope: 'openid email profile',
          state,
          nonce,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          response_type: 'code',
        })
        .toString()

      return {
        url,
        pending: {
          state,
          nonce,
          verifier,
          returnTo: sanitizeReturnTo(returnTo),
          exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes to finish
        },
      }
    },

    async completeLogin({ callbackUrl, pending }) {
      const tokens = await oidc.authorizationCodeGrant(rp, callbackUrl, {
        expectedState: pending.state,
        expectedNonce: pending.nonce,
        pkceCodeVerifier: pending.verifier,
      })

      const claims = tokens.claims() as {
        sub?: string
        email?: string
        name?: string
        preferred_username?: string
      }
      const sub = claims?.sub
      if (!sub) throw new Error('OIDC id_token missing sub')

      return {
        sub,
        email: claims.email,
        name: claims.name ?? claims.preferred_username ?? claims.email,
      }
    },

    endSessionUrl() {
      try {
        // No id_token_hint: we keep sessions stateless (encrypted cookie only).
        // Providers that require a hint fall back to their own logout page.
        return oidc
          .buildEndSessionUrl(rp, {
            post_logout_redirect_uri: new URL(oidcCfg.redirectUrl).origin + '/',
          })
          .toString()
      } catch {
        return null
      }
    },
  }
}
