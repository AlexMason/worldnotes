import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const source = await readFile(new URL('../src/renderer.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText

const tempFile = join(tmpdir(), `worldnotes-renderer-${Date.now()}.cjs`)
await writeFile(tempFile, compiled)

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName
    this.nodeType = 1
    this.childNodes = []
    this.textContent = ''
  }

  appendChild(node) {
    this.childNodes.push(node)
    return node
  }

  addEventListener() {}
}

class FakeText {
  constructor(text) {
    this.nodeType = 3
    this.textContent = text
  }
}

globalThis.HTMLElement = FakeElement
globalThis.document = {
  createDocumentFragment: () => new FakeElement('#fragment'),
  createElement: (tagName) => new FakeElement(tagName),
  createTextNode: (text) => new FakeText(text),
}

const { renderLine } = require(tempFile)

const previewPlugin = {
  name: 'preview',
  tokens: [{ type: 'preview', pattern: /\[\[([^\]]+)\]\]/ }],
  render(token) {
    const el = document.createElement('span')
    el.textContent = token.groups[0].split('/').pop()
    return el
  },
}

const tokens = [
  { type: 'text', raw: 'open ', groups: ['open '] },
  { type: 'preview', raw: '[[projects/acme]]', groups: ['projects/acme'] },
]

assert.equal(
  renderLine(tokens, [previewPlugin], {}, 0).childNodes[1].textContent,
  'acme',
  'renders preview text when caret is outside the token',
)

assert.equal(
  renderLine(tokens, [previewPlugin], {}, 8).childNodes[1].textContent,
  '[[projects/acme]]',
  'renders raw token text when caret is inside the token',
)

console.log('renderer tests passed')
