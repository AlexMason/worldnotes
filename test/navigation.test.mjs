import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const source = await readFile(new URL('../src/navigation.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText

const tempFile = join(tmpdir(), `worldnotes-navigation-${Date.now()}.cjs`)
await writeFile(tempFile, compiled)

const {
  decodePathSearch,
  encodePathSearch,
  pageDisplayName,
  parseWikiLink,
} = require(tempFile)

assert.deepEqual(
  parseWikiLink('projects/acme'),
  { page: 'projects/acme', display: 'acme' },
  'uses the final path segment as wiki link display text',
)

assert.deepEqual(
  parseWikiLink('projects/acme|Client Portal'),
  { page: 'projects/acme', display: 'Client Portal' },
  'supports Obsidian-style custom wiki link display text',
)

assert.equal(
  pageDisplayName('projects/acme'),
  'acme',
  'uses the final path segment for breadcrumb labels',
)

assert.equal(
  encodePathSearch('?theme=dark', ['home', 'projects/acme']),
  '?theme=dark&path=home/projects%2Facme',
  'serializes breadcrumb trail without flattening page path separators',
)

assert.deepEqual(
  decodePathSearch('?theme=dark&path=home/projects%2Facme'),
  ['home', 'projects/acme'],
  'restores breadcrumb trail while preserving slashes inside page names',
)

console.log('navigation tests passed')
