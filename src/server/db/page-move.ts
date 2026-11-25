// ─── Page move planning (shared by the pg and memory repositories) ──────────
// Pure helpers: both PagesRepository implementations lock/collect rows their
// own way, then agree on WHAT a move does through these functions.

import { relocateSlug } from '../../shared/slug'
import type { MoveInput, MoveResult } from './repository'

export type MovePlan =
  | { ok: true; moved: Map<string, string> }
  | Extract<MoveResult, { reason: 'invalid' | 'taken' }>

/**
 * Old → new slug for every page in the moved subtree (`subtree` = existing
 * slugs equal to or under `from`). Refuses invalid relocated slugs and
 * targets that collide with another page of the subtree itself (only
 * possible when moving up into an ancestor, e.g. `a/b` → `a` while `a/b/b`
 * exists) — that keeps the slug UPDATEs free of unique collisions.
 * Collisions with pages OUTSIDE the subtree are checked by the caller.
 */
export function planMove(
  from: string,
  to: string,
  subtree: readonly string[],
  validate: MoveInput['validate'],
): MovePlan {
  const moved = new Map<string, string>()
  for (const slug of subtree) {
    const target = relocateSlug(slug, from, to)
    if (target === null) continue
    const error = validate(target)
    if (error !== null) return { ok: false, reason: 'invalid', slug: target, error }
    moved.set(slug, target)
  }
  const sources = new Set(subtree)
  for (const target of moved.values()) {
    if (sources.has(target)) return { ok: false, reason: 'taken', slug: target }
  }
  return { ok: true, moved }
}

export interface RowUpdate {
  oldSlug: string
  newSlug: string
  title: string
  content: string
  contentChanged: boolean
}

/** The writes a move performs: every row whose slug or content changes. */
export function computeRowUpdates(
  rows: readonly { slug: string; title: string; content: string }[],
  moved: ReadonlyMap<string, string>,
  rewrite: MoveInput['rewrite'],
): RowUpdate[] {
  const updates: RowUpdate[] = []
  for (const row of rows) {
    const newSlug = moved.get(row.slug) ?? row.slug
    const next = rewrite({ slug: row.slug, newSlug, title: row.title, content: row.content }, moved)
    const contentChanged = next !== null && next.content !== row.content
    if (newSlug === row.slug && !contentChanged) continue
    updates.push({
      oldSlug: row.slug,
      newSlug,
      title: contentChanged ? next.title : row.title,
      content: contentChanged ? next.content : row.content,
      contentChanged,
    })
  }
  return updates
}

/** The success payload: moved pairs in subtree order + rewritten NEW slugs. */
export function moveSuccess(
  moved: ReadonlyMap<string, string>,
  updates: readonly RowUpdate[],
): Extract<MoveResult, { ok: true }> {
  return {
    ok: true,
    moved: [...moved].map(([from, to]) => ({ from, to })),
    rewritten: updates.filter((u) => u.contentChanged).map((u) => u.newSlug),
  }
}
