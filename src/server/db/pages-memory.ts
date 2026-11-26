// ─── In-memory PagesRepository ───────────────────────────────────────────────
// Mirrors the Postgres semantics (version bump per write, If-Match conflict,
// case-sensitive unique slug, aliases pointing at a stable page id) so tests
// exercise the real contract.

import type {
  CreateResult,
  DeleteResult,
  MoveResult,
  PageListItem,
  PageRecord,
  PagesRepository,
  PutResult,
} from './repository'
import { computeRowUpdates, moveSuccess, planMove } from './page-move'

export function createMemoryPagesRepository(
  seed: PageRecord[] = [],
): PagesRepository & { dump(): PageRecord[] } {
  const pages = new Map<string, PageRecord>()
  // Stable page identity (pages.id): survives moves, owns aliases.
  const ids = new Map<string, number>()
  const aliases = new Map<string, number>()
  let nextId = 1

  function slugOfId(id: number): string | null {
    for (const [slug, pageId] of ids) if (pageId === id) return slug
    return null
  }

  function resolveAlias(slug: string): string | null {
    const id = aliases.get(slug)
    return id === undefined ? null : slugOfId(id)
  }

  function remove(slug: string): boolean {
    const id = ids.get(slug)
    if (!pages.delete(slug)) return false
    ids.delete(slug)
    for (const [alias, pageId] of aliases) if (pageId === id) aliases.delete(alias)
    return true
  }

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
    if (!ids.has(slug)) ids.set(slug, nextId++)
    pages.set(slug, record)
    return { ...record }
  }

  for (const page of seed) {
    pages.set(page.slug, { ...page })
    ids.set(page.slug, nextId++)
  }

  return {
    async get(slug) {
      const page = pages.get(slug)
      return page ? { ...page } : null
    },

    async existing(slugs) {
      return new Set(slugs.filter((slug) => pages.has(slug) || aliases.has(slug)))
    },

    async titles(slugs) {
      const found = new Map<string, string>()
      for (const slug of slugs) {
        const page = pages.get(slug)
        if (page) found.set(slug, page.title)
      }
      return found
    },

    async resolveAlias(slug) {
      return resolveAlias(slug)
    },

    async move({ from, to, by = null, validate, rewrite, title }): Promise<MoveResult> {
      const subtree = [...pages.keys()]
        .filter((slug) => slug === from || slug.startsWith(`${from}/`))
        .sort()
      if (!pages.has(from)) {
        const current = resolveAlias(from)
        return current === null
          ? { ok: false, reason: 'missing' }
          : { ok: false, reason: 'moved', to: current }
      }
      const plan = planMove(from, to, subtree, validate)
      if (!plan.ok) return plan
      const sources = new Set(subtree)
      for (const target of plan.moved.values()) {
        if (pages.has(target) && !sources.has(target))
          return { ok: false, reason: 'taken', slug: target }
      }

      const rows = [...pages.values()].filter((p) => sources.has(p.slug) || p.content.includes('['))
      const updates = computeRowUpdates(rows, plan.moved, rewrite, title)
      // Apply: detach every moving row first, then re-insert under its new slug
      // (targets never collide with sources — planMove refused overlaps).
      const staged = updates.map((u) => ({
        u,
        prev: pages.get(u.oldSlug)!,
        id: ids.get(u.oldSlug)!,
      }))
      for (const { u } of staged) {
        pages.delete(u.oldSlug)
        ids.delete(u.oldSlug)
      }
      const now = Date.now()
      for (const { u, prev, id } of staged) {
        pages.set(u.newSlug, {
          slug: u.newSlug,
          title: u.title,
          content: u.content,
          version: prev.version + (u.contentChanged ? 1 : 0),
          updatedAt: now,
          updatedBy: by,
        })
        ids.set(u.newSlug, id)
      }
      for (const target of plan.moved.values()) aliases.delete(target)
      for (const [oldSlug, newSlug] of plan.moved) aliases.set(oldSlug, ids.get(newSlug)!)
      return moveSuccess(plan.moved, updates)
    },

    async list(opts = {}) {
      const { query, limit, scope } = opts
      let items = [...pages.values()].sort((a, b) => b.updatedAt - a.updatedAt)
      if (query) {
        const needle = query.toLowerCase()
        items = items.filter(
          (p) =>
            p.slug.toLowerCase().includes(needle) ||
            p.title.toLowerCase().includes(needle) ||
            (scope !== 'name' && p.content.toLowerCase().includes(needle)),
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
      remove(slug)
      return { ok: true }
    },

    async delete(slug) {
      return remove(slug)
    },

    async destroy() {
      pages.clear()
      ids.clear()
      aliases.clear()
    },

    dump() {
      return [...pages.values()].map((p) => ({ ...p }))
    },
  }
}
