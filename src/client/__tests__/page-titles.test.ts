import { describe, it, expect, vi } from 'vitest'
import { createPageTitles } from '../page-titles'

function fetcher(answer: (slugs: string[]) => Response) {
  const fn = vi.fn(async (url: string) => {
    const slugs = decodeURIComponent(new URL(url, 'http://x.test').searchParams.get('slugs') ?? '')
    return answer(slugs === '' ? [] : slugs.split(','))
  })
  return { fn, fetchImpl: fn as unknown as typeof fetch }
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('createPageTitles', () => {
  it('answers seeded slugs without fetching', () => {
    const f = fetcher(() => Response.json({ titles: {} }))
    const titles = createPageTitles({ lore: 'Lore of Ashfall' }, { fetchImpl: f.fetchImpl })
    titles.request(['lore'])
    expect(titles.title('lore')).toBe('Lore of Ashfall')
    expect(f.fn).not.toHaveBeenCalled()
  })

  it('fetches unknown slugs once (nested slugs unescaped) and notifies on answers', async () => {
    const f = fetcher(() => Response.json({ titles: { 'lore/gods': 'The Gods' } }))
    const titles = createPageTitles({}, { fetchImpl: f.fetchImpl })
    const changed = vi.fn()
    titles.onChange(changed)

    titles.request(['lore/gods', 'lore/ghost', 'lore/gods'])
    await flush()
    expect(f.fn).toHaveBeenCalledTimes(1)
    expect(f.fn.mock.calls[0]![0]).toBe('/api/page-titles?slugs=lore/gods,lore/ghost')
    expect(titles.title('lore/gods')).toBe('The Gods')
    expect(titles.title('lore/ghost')).toBeUndefined()
    expect(changed).toHaveBeenCalledTimes(1)

    // Missing pages are not re-asked on every repaint.
    titles.request(['lore/gods', 'lore/ghost'])
    await flush()
    expect(f.fn).toHaveBeenCalledTimes(1)
  })

  it('a failed lookup leaves titles unknown without retry loops or notifications', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const f = fetcher(() => new Response('nope', { status: 500 }))
    const titles = createPageTitles({}, { fetchImpl: f.fetchImpl })
    const changed = vi.fn()
    titles.onChange(changed)
    titles.request(['a'])
    await flush()
    titles.request(['a'])
    await flush()
    expect(f.fn).toHaveBeenCalledTimes(1)
    expect(titles.title('a')).toBeUndefined()
    expect(changed).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
