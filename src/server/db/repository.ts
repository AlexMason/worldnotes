// ─── Pages Repository ────────────────────────────────────────────────────────
// Storage-agnostic contract for page persistence. Postgres implements it in
// production; the in-memory variant powers tests and dev.

export interface PageRecord {
  slug: string
  title: string
  content: string
  version: number
  updatedAt: number // epoch ms
  updatedBy: string | null
}

export interface PageListItem {
  slug: string
  title: string
  updatedAt: number
}

export type PutResult =
  | { ok: true; record: PageRecord }
  | { ok: false; reason: 'conflict'; current: { version: number; updatedAt: number } }
  | { ok: false; reason: 'missing' }

export type CreateResult =
  | { ok: true; record: PageRecord }
  | { ok: false; reason: 'exists'; current: { version: number } }

export interface PagesRepository {
  /** Exact-match fetch. */
  get(slug: string): Promise<PageRecord | null>
  /** All pages, newest first; optional ILIKE-free substring filter over slug/title/content. */
  list(opts?: { query?: string; limit?: number }): Promise<PageListItem[]>
  /** Insert-or-update with optimistic concurrency. */
  put(slug: string, data: { title: string; content: string; by?: string | null }): Promise<PageRecord>
  /** Update only if the page already exists AND version matches `ifMatch`. */
  putIfMatch(
    slug: string,
    data: { title: string; content: string; by?: string | null },
    ifMatch: number,
  ): Promise<PutResult>
  /** Insert only; conflict when the slug is taken. */
  create(
    slug: string,
    data: { title: string; content: string; by?: string | null },
  ): Promise<CreateResult>
  /** @returns true when a row was deleted. */
  delete(slug: string): Promise<boolean>
  destroy(): Promise<void>
}
