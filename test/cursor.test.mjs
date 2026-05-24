import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const source = await readFile(new URL('../src/cursor.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText

const tempFile = join(tmpdir(), `worldnotes-cursor-${Date.now()}.cjs`)
await writeFile(tempFile, compiled)

const { getTextOffset } = require(tempFile)

globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 }

function text(value) {
  return { nodeType: Node.TEXT_NODE, textContent: value, parentNode: null }
}

function element(nodeName, children = [], dataset = {}) {
  const node = {
    nodeType: 1,
    nodeName,
    childNodes: children,
    dataset,
  }
  children.forEach(child => { child.parentNode = node })
  return node
}

assert.equal(
  getTextOffset(element('DIV', [text('first'), element('BR'), text('second')]), null, 0).text,
  'first\nsecond',
  'converts br elements to newline characters',
)

assert.equal(
  getTextOffset(element('DIV', [
    element('DIV', [text('first')]),
    element('DIV', [text('second')]),
  ]), null, 0).text,
  'first\nsecond',
  'preserves line breaks represented by contenteditable block elements',
)

assert.equal(
  getTextOffset(element('DIV', [
    element('SPAN', [text('acme')], { raw: '[[projects/acme]]' }),
  ]), null, 0).text,
  '[[projects/acme]]',
  'uses data-raw when rendered text differs from source text',
)

const before = text('open ')
const label = text('acme')
const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
const after = text(' done')
const line = element('DIV', [before, link, after])

assert.equal(
  getTextOffset(line, line, 2).offset,
  'open [[projects/acme]]'.length,
  'counts data-raw length when selection is after a preview link',
)

assert.equal(
  getTextOffset(line, label, 2).offset,
  'open [['.length,
  'maps selection inside preview text into the raw token span',
)

console.log('cursor tests passed')
