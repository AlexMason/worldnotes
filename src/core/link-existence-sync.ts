// ─── In-place link-state sync (editor surface) ───────────────────────────────
// When a page-existence answer arrives after the DOM was rendered, links are
// re-classed IN PLACE instead of re-rendering: a re-render risks the caret and
// selection, while toggling a class never touches DOM text. Later renders ask
// the resolver synchronously (plugins' `context.pageExists`), so both paths
// converge on the same classes.

import { navTargetToSlug } from '../shared/slug'
import { MISSING_LINK_CLASS } from './plugins/link-class'
import type { PageExistenceResolver } from './types'

export function syncLinkExistence(
  root: ParentNode,
  resolver: Pick<PageExistenceResolver, 'exists'>,
): void {
  root.querySelectorAll<HTMLElement>('.wn-wiki-link[data-page]').forEach((el) => {
    // data-page carries a root-semantics navigation target (wiki links: the
    // resolved root-absolute address; markdown links: the raw URL); fold it
    // exactly as navigation and the plugins do. Unfoldable targets are never
    // marked.
    const slug = navTargetToSlug(el.dataset.page ?? '')
    el.classList.toggle(MISSING_LINK_CLASS, slug !== null && resolver.exists(slug) === false)
  })
}
