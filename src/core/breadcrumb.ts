// ─── Breadcrumb chrome ───────────────────────────────────────────────────────
// Renders the editor header trail. Shared by the production editor
// (editor-render.ts) and the CM6 spike surface so both paint identical chrome.

import { slugDisplayName } from '../shared/slug'

/** Deep history collapses under an ellipsis dropdown past this many crumb
 *  boxes (mirrors render/layout.ts CRUMB_MAX_BOXES on the reader surface).
 *  NOTE: the editor trail is navigation HISTORY, not path ancestry — the
 *  collapse fires on ordinary browsing where the reader only collapses on
 *  slug depth. Same shape, different frequency (accepted). */
const CRUMB_MAX_BOXES = 4

export interface BreadcrumbOptions {
  /** Root crumb label (site name); defaults to 'Home'. */
  homeLabel?: string
  /** A non-active crumb was activated; `index` is its ORIGINAL trail index. */
  onCrumb(index: number): void
}

/**
 * Repaint `breadcrumb` for `trail`. Open hamburger/crumb dropdowns under
 * `container` are closed before `onCrumb` runs — a tapped crumb navigates, so
 * the disclosure must not linger over the freshly painted page.
 */
export function renderBreadcrumb(
  breadcrumb: HTMLElement,
  container: HTMLElement,
  trail: string[],
  options: BreadcrumbOptions,
): void {
  breadcrumb.innerHTML = ''

  const addSep = (): void => {
    const sep = document.createElement('span')
    sep.className = 'wn-crumb-sep'
    sep.textContent = '/'
    breadcrumb.appendChild(sep)
  }
  const activate = (i: number): void => {
    container.querySelectorAll('details[open]').forEach((open) => {
      ;(open as HTMLDetailsElement).open = false
    })
    options.onCrumb(i)
  }
  const addCrumb = (page: string, i: number): void => {
    const crumb = document.createElement('span')
    crumb.className = 'wn-crumb' + (i === trail.length - 1 ? ' wn-crumb--active' : '')
    // Root crumb is always the wiki home (labelled with the site name when
    // branded, else "Home"); path segments are humanized slugs, matching
    // the viewer's breadcrumb chrome.
    crumb.textContent = i === 0 ? options.homeLabel || 'Home' : slugDisplayName(page)
    if (i < trail.length - 1) {
      crumb.addEventListener('click', () => activate(i))
    }
    breadcrumb.appendChild(crumb)
  }

  if (trail.length <= CRUMB_MAX_BOXES) {
    trail.forEach((page, i) => {
      if (i > 0) addSep()
      addCrumb(page, i)
    })
    return
  }

  // Home / … / parent / current — hidden crumbs keep their ORIGINAL trail
  // indices inside the dropdown, so truncateTrail behaves identically.
  addCrumb(trail[0]!, 0)
  addSep()
  const more = document.createElement('details')
  more.className = 'wn-crumb-more'
  const summary = document.createElement('summary')
  summary.setAttribute('aria-label', 'Hidden breadcrumb levels')
  summary.textContent = '\u2026'
  more.appendChild(summary)
  const drop = document.createElement('div')
  drop.className = 'wn-crumb-drop'
  for (let i = 1; i < trail.length - 2; i++) {
    const item = document.createElement('span')
    item.className = 'wn-crumb'
    item.textContent = slugDisplayName(trail[i]!)
    const index = i
    item.addEventListener('click', () => activate(index))
    drop.appendChild(item)
  }
  more.appendChild(drop)
  breadcrumb.appendChild(more)
  addSep()
  addCrumb(trail[trail.length - 2]!, trail.length - 2)
  addSep()
  addCrumb(trail[trail.length - 1]!, trail.length - 1)
}
