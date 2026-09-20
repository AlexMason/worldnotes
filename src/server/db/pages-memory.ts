// ─── In-memory PagesRepository ───────────────────────────────────────────────
// Mirrors the Postgres semantics (version bump per write, If-Match conflict,
// case-sensitive unique slug) so tests exercise the real contract.

import type {
  CreateResult,
  DeleteResult,
  PageListItem,
  PageRecord,
  PagesRepository,
  PutResult,
} from './repository'

export function createMemoryPagesRepository(
  seed: PageRecord[] = [],
): PagesRepository & { dump(): PageRecord[] } {
  const pages = new Map<string, PageRecord>()
  for (const page of seed) pages.set(page.slug, { ...page })

  function snapshot(slug: string, title: string, content: string, by: string | null): PageRecord {
    const prev = pages.get(slug)
    const record: PageRecord = {
      slug,
      title,
      content,
      version: (prev?.version ?? 0) + 1,
      updatedAt: Date.now(),
      updatedBy: by,
    }
    pages.set(slug, record)
    return { ...record }
  }

  return {
    async get(slug) {
      const page = pages.get(slug)
      return page ? { ...page } : null
    },

    async list(opts = {}) {
      const { query, limit } = opts
      let items = [...pages.values()].sort((a, b) => b.updatedAt - a.updatedAt)
      if (query) {
        const needle = query.toLowerCase()
        items = items.filter(
          (p) =>
            p.slug.toLowerCase().includes(needle) ||
            p.title.toLowerCase().includes(needle) ||
            p.content.toLowerCase().includes(needle),
        )
      }
      const mapped: PageListItem[] = items.map((p) => ({
        slug: p.slug,
        title: p.title,
        updatedAt: p.updatedAt,
      }))
      return limit ? mapped.slice(0, limit) : mapped
    },

    async put(slug, { title, content, by = null }) {
      return snapshot(slug, title, content, by)
    },

    async putIfMatch(slug, { title, content, by = null }, ifMatch): Promise<PutResult> {
      const prev = pages.get(slug)
      if (!prev) return { ok: false, reason: 'missing' }
      if (prev.version !== ifMatch)
        return {
          ok: false,
          reason: 'conflict',
          current: { version: prev.version, updatedAt: prev.updatedAt },
        }
      return { ok: true, record: snapshot(slug, title, content, by) }
    },

    async create(slug, { title, content, by = null }): Promise<CreateResult> {
      if (pages.has(slug))
        return { ok: false, reason: 'exists', current: { version: pages.get(slug)!.version } }
      return { ok: true, record: snapshot(slug, title, content, by) }
    },

    async deleteIfMatch(slug, ifMatch): Promise<DeleteResult> {
      const prev = pages.get(slug)
      if (!prev) return { ok: false, reason: 'missing' }
      if (prev.version !== ifMatch)
        return {
          ok: false,
          reason: 'conflict',
          current: { version: prev.version, updatedAt: prev.updatedAt },
        }
      pages.delete(slug)
      return { ok: true }
    },

    async delete(slug) {
      return pages.delete(slug)
    },

    async destroy() {
      pages.clear()
    },

    dump() {
      return [...pages.values()].map((p) => ({ ...p }))
    },
  }
}
