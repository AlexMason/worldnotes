// ─── Wire formats shared by client and server ────────────────────────────────

export interface PageDto {
  slug: string
  title: string
  content: string
  version: number
  updatedAt: number
  updatedBy: string | null
}

export interface PageListItemDto {
  slug: string
  title: string
  updatedAt: number
}

export interface MeDto {
  sub: string
  email?: string
  name?: string
}

export interface ApiError {
  error: string
  /** Present on 409: the server-side version to reconcile against. */
  current?: { version: number; updatedAt?: number }
}
