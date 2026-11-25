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

/** One page row handed to the move's rewrite callback. */
export interface MovePageRow {
  /** Slug before the move. */
  slug: string
  /** Slug after the move (=== slug for pages outside the moved subtree). */
  newSlug: string
  title: string
  content: string
}

export interface MoveInput {
  from: string
  to: string
  by?: string | null
  /** Error message when a relocated slug is invalid (slug policy), else null. */
  validate(slug: string): string | null
  /**
   * Rewrite one page's links for the move (`moved`: old → new slug of every
   * moved page). Return null when the content is unchanged. Must be pure and
   * synchronous — it runs inside the move transaction.
   */
  rewrite(
    row: MovePageRow,
    moved: ReadonlyMap<string, string>,
  ): { title: string; content: string } | null
}

export type MoveResult =
  /** `rewritten`: NEW slugs of pages whose content changed. */
  | { ok: true; moved: { from: string; to: string }[]; rewritten: string[] }
  | { ok: false; reason: 'missing' }
  | { ok: false; reason: 'moved'; to: string }
  | { ok: false; reason: 'taken'; slug: string }
  | { ok: false; reason: 'invalid'; slug: string; error: string }
  /** Another move is running (moves never queue; the caller retries). */
  | { ok: false; reason: 'busy' }

export interface PagesRepository {
  /** Exact-match fetch. */
  get(slug: string): Promise<PageRecord | null>
  /**
   * Which of `slugs` exist (exact match on a page slug OR an alias — an alias
   * redirects, so a link to it works). One round trip for any size input;
   * empty input answers without touching the store. Backs link-state styling
   * (existing vs missing page) — never fetches page content.
   */
  existing(slugs: readonly string[]): Promise<Set<string>>
  /** Current slug of the page `slug` is a former slug (alias) of, or null. */
  resolveAlias(slug: string): Promise<string | null>
  /**
   * Move page `from` and its whole subtree to `to`, rewrite every page's links
   * to moved pages, and leave an alias at every old slug — atomically, all or
   * nothing. `version` increments only for rows whose content changed.
   */
  move(input: MoveInput): Promise<MoveResult>
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
