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

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: 'conflict'; current: { version: number; updatedAt: number } }
  | { ok: false; reason: 'missing' }

export interface PagesRepository {
  /** Exact-match fetch. */
  get(slug: string): Promise<PageRecord | null>
  /** All pages, newest first; optional ILIKE-free substring filter over slug/title/content. */
  list(opts?: { query?: string; limit?: number }): Promise<PageListItem[]>
  /** Insert-or-update with optimistic concurrency. */
  put(
    slug: string,
    data: { title: string; content: string; by?: string | null },
  ): Promise<PageRecord>
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
  /**
   * Delete only if the page exists AND its version matches `ifMatch`.
   * Guards the blank-save delete path: a stale client must never destroy
   * content written after its snapshot. Unrelated to the unconditional
   * {@link delete} used by the manual DELETE route.
   */
  deleteIfMatch(slug: string, ifMatch: number): Promise<DeleteResult>
  /** Unconditional removal (manual delete route). @returns true when a row was deleted. */
  delete(slug: string): Promise<boolean>
  destroy(): Promise<void>
}
