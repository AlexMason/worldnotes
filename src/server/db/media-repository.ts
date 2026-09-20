// ─── Media Repository ────────────────────────────────────────────────────────
// Storage-agnostic contract for uploaded images. Postgres implements it in
// production (bytea column); the in-memory variant powers tests and dev.
// Rows are immutable once written — replacing an image is a new upload with a
// new id, which is what makes /media/{id} cacheable forever.

export type StoredMediaType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'image/vnd.microsoft.icon'

export interface MediaRow {
  id: number
  mediaType: StoredMediaType
  width: number | null
  height: number | null
  sizeBytes: number
  data: Buffer
  createdAt: number
}

export interface MediaInsert {
  mediaType: StoredMediaType
  width: number | null
  height: number | null
  data: Buffer
  by?: string | null
}

export interface MediaRepository {
  insert(media: MediaInsert): Promise<{ id: number }>
  get(id: number): Promise<MediaRow | null>
  /** Returns true when a row was removed. */
  delete(id: number): Promise<boolean>
  destroy(): Promise<void>
}
