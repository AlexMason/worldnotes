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

export function encodePathSearch(search: string, trail: string[]): string {
  const params = search.replace(/^\?/, '').split('&').filter(Boolean)
  const withoutPath = params.filter((param) => {
    const [name = ''] = param.split('=', 1)
    return decodeURIComponent(name.replace(/\+/g, ' ')) !== 'path'
  })
  const path = trail.map(page => encodeURIComponent(page)).join('/')
  const next = [...withoutPath, `path=${path}`]
  return `?${next.join('&')}`
}

export function decodePathSearch(search: string): string[] {
  const params = search.replace(/^\?/, '').split('&').filter(Boolean)
  const pathParam = params.find((param) => {
    const [name = ''] = param.split('=', 1)
    return decodeURIComponent(name.replace(/\+/g, ' ')) === 'path'
  })
  if (!pathParam) return []

  const equalsIndex = pathParam.indexOf('=')
  const rawPath = equalsIndex === -1 ? '' : pathParam.slice(equalsIndex + 1)
  if (!rawPath) return []
  return rawPath.split('/').filter(Boolean).map(page => decodeURIComponent(page))
}
