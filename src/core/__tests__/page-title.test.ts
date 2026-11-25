import { describe, it, expect } from 'vitest'
import { pageTitle } from '../page-title'

describe('pageTitle', () => {
  it('takes the first H1, even after other headings', () => {
    expect(pageTitle('intro\n## Section\n# The **Old** Gods  \n# Later', 'lore/old-gods')).toBe(
      'The **Old** Gods',
    )
  })

  it('ignores a "# x" line inside a code fence', () => {
    expect(pageTitle('```sh\n# not a title\n```\n# Real Title', 'x')).toBe('Real Title')
  })

  it('skips an empty H1', () => {
    expect(pageTitle('#  \n# Named', 'x')).toBe('Named')
  })

  it('falls back to the last slug segment, humanized, when there is no H1', () => {
    expect(pageTitle('## only h2\nbody', 'lore/old-gods')).toBe('Old Gods')
    expect(pageTitle('', 'home')).toBe('Home')
  })
})
