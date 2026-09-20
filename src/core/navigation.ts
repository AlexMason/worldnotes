export interface WikiLinkTarget {
  page: string
  display: string
}

export function pageDisplayName(page: string): string {
  const trimmed = page.trim().replace(/\/+$/, '')
  const parts = trimmed.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? trimmed
}

export function parseWikiLink(value: string): WikiLinkTarget {
  const pipeIndex = value.indexOf('|')
  const page = (pipeIndex === -1 ? value : value.slice(0, pipeIndex)).trim()
  const display = pipeIndex === -1 ? pageDisplayName(page) : value.slice(pipeIndex + 1).trim()
  return { page, display: display || pageDisplayName(page) }
}
