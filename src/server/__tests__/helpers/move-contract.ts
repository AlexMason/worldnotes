// ─── PagesRepository.move contract (memory + Postgres) ─────────────────────
// One behavioral suite, run against both implementations so the in-memory
// repository used by route tests cannot drift from production semantics.

import { describe, it, expect, beforeEach } from 'vitest'
import type { MoveInput, PagesRepository } from '../../db/repository'
import { rewriteLinks } from '../../../core/link-rewrite'
import { defaultPlugins } from '../../../core/plugins/defaults'
import { validateSlug, wikiLinkBase } from '../../../shared/slug'

export function moveInput(from: string, to: string): MoveInput {
  return {
    from,
    to,
    by: 'mover',
    validate: (slug) => {
      const v = validateSlug(slug)
      return v.ok ? null : v.error
    },
    rewrite: (row, moved) => {
      const content = rewriteLinks(row.content, defaultPlugins, {
        oldBase: wikiLinkBase(row.slug, null),
        newBase: wikiLinkBase(row.newSlug, null),
        moved: (s) => moved.get(s),
      })
      return content === row.content ? null : { title: row.title, content }
    },
  }
}

export function describeMoveContract(
  name: string,
  repo: () => PagesRepository,
  reset: () => Promise<void> = async () => undefined,
): void {
  describe(`${name}: move`, () => {
    beforeEach(reset)

    it('moves a page and its subtree, leaving aliases; version bumps only on rewrite', async () => {
      const r = repo()
      await r.put('mv/alpha', { title: 'Alpha', content: 'see [[beta]]' })
      await r.put('mv/alpha/beta', { title: 'Beta', content: 'child' })
      await r.put('mv/alpha-x', { title: 'Sibling', content: 'untouched' })
      await r.put('mv/linker', { title: 'L', content: '[[/mv/alpha/beta]] and [x](/mv/alpha)' })

      const result = await r.move(moveInput('mv/alpha', 'mv/gamma'))
      expect(result).toEqual({
        ok: true,
        moved: [
          { from: 'mv/alpha', to: 'mv/gamma' },
          { from: 'mv/alpha/beta', to: 'mv/gamma/beta' },
        ],
        rewritten: ['mv/linker'],
      })

      expect(await r.get('mv/alpha')).toBeNull()
      // Relative [[beta]] followed the move: content and version unchanged.
      expect(await r.get('mv/gamma')).toMatchObject({ content: 'see [[beta]]', version: 1 })
      expect(await r.get('mv/gamma/beta')).toMatchObject({ content: 'child', version: 1 })
      expect(await r.get('mv/alpha-x')).toMatchObject({ content: 'untouched' })
      expect(await r.get('mv/linker')).toMatchObject({
        content: '[[/mv/gamma/beta]] and [x](/mv/gamma)',
        version: 2,
        updatedBy: 'mover',
      })

      expect(await r.resolveAlias('mv/alpha')).toBe('mv/gamma')
      expect(await r.resolveAlias('mv/alpha/beta')).toBe('mv/gamma/beta')
      expect(await r.resolveAlias('mv/alpha-x')).toBeNull()
      expect([...(await r.existing(['mv/alpha', 'mv/gamma', 'mv/ghost']))].sort()).toEqual([
        'mv/alpha',
        'mv/gamma',
      ])
    })

    it('never chains aliases and reclaims an alias moved onto', async () => {
      const r = repo()
      await r.put('ch/a', { title: 'A', content: 'x' })
      expect((await r.move(moveInput('ch/a', 'ch/b'))).ok).toBe(true)
      expect((await r.move(moveInput('ch/b', 'ch/c'))).ok).toBe(true)
      expect(await r.resolveAlias('ch/a')).toBe('ch/c')
      expect(await r.resolveAlias('ch/b')).toBe('ch/c')

      // Moving back onto a former slug reclaims it: page, not alias.
      expect((await r.move(moveInput('ch/c', 'ch/a'))).ok).toBe(true)
      expect(await r.get('ch/a')).not.toBeNull()
      expect(await r.resolveAlias('ch/a')).toBeNull()
      expect(await r.resolveAlias('ch/c')).toBe('ch/a')
    })

    it('refuses missing, aliased, taken, overlapping and invalid moves without changes', async () => {
      const r = repo()
      await r.put('rf/a', { title: 'A', content: 'x' })
      await r.put('rf/b', { title: 'B', content: 'x' })
      await r.put('rf/p/q', { title: 'Q', content: 'x' })
      await r.put('rf/p/q/q', { title: 'QQ', content: 'x' })

      expect(await r.move(moveInput('rf/ghost', 'rf/z'))).toEqual({ ok: false, reason: 'missing' })
      expect(await r.move(moveInput('rf/a', 'rf/b'))).toEqual({
        ok: false,
        reason: 'taken',
        slug: 'rf/b',
      })
      // rf/p/q → rf/p would relocate rf/p/q/q onto rf/p/q (inside the subtree).
      expect(await r.move(moveInput('rf/p/q', 'rf/p'))).toEqual({
        ok: false,
        reason: 'taken',
        slug: 'rf/p/q',
      })
      const long = `rf/${'x'.repeat(252)}` // 255 chars: valid; its child is not
      expect(await r.move(moveInput('rf/p/q', long))).toMatchObject({
        ok: false,
        reason: 'invalid',
        slug: `${long}/q`,
      })

      expect((await r.move(moveInput('rf/a', 'rf/c'))).ok).toBe(true)
      expect(await r.move(moveInput('rf/a', 'rf/d'))).toEqual({
        ok: false,
        reason: 'moved',
        to: 'rf/c',
      })
      expect(await r.get('rf/b')).not.toBeNull()
      expect(await r.get('rf/p/q/q')).not.toBeNull()
    })

    it('drops aliases with their page', async () => {
      const r = repo()
      await r.put('dl/a', { title: 'A', content: 'x' })
      await r.move(moveInput('dl/a', 'dl/b'))
      expect(await r.delete('dl/b')).toBe(true)
      expect(await r.resolveAlias('dl/a')).toBeNull()
      expect(await r.existing(['dl/a'])).toEqual(new Set())
    })
  })
}
