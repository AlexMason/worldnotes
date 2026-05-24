# Testing Patterns

**Analysis Date:** 2026-05-23

## Test Framework

**Runner:**
No test framework. Tests are plain Node.js `.mjs` files run directly with the `node` binary, using the built-in `node:assert/strict` module for assertions. Each test file self-reports success on completion.

**Assertion Library:**
Node.js built-in `node:assert/strict` — no third-party assertion library.

**Run Commands:**
```bash
npm test              # Run all tests sequentially
npm run typecheck     # TypeScript type-checking (separate from tests)
```

The `npm test` script is a chained shell command:
```json
"test": "node test/cursor.test.mjs && node test/navigation.test.mjs && node test/renderer.test.mjs"
```

Tests run sequentially — if one fails, subsequent tests are not executed (due to `&&` chaining).

**No Watch Mode:**
There is no watch mode, no file-watching, and no test runner CLI.

## Test File Organization

**Location:**
Tests live in a top-level `test/` directory, separate from source code.

```
test/
├── cursor.test.mjs       # Tests for src/cursor.ts
├── navigation.test.mjs   # Tests for src/navigation.ts
└── renderer.test.mjs     # Tests for src/renderer.ts
```

**Naming:**
- Format: `{module-name}.test.mjs`
- Each test file targets exactly one source module
- Files use `.mjs` extension (ES modules in Node.js)

## Test Structure

**Suite Organization:**
No `describe`/`it` blocks — tests are flat sequences of `assert.equal()` and `assert.deepEqual()` calls. Each file ends with a `console.log('module tests passed')` message.

**Assertion Pattern:**
```javascript
import assert from 'node:assert/strict'

assert.equal(
  actualValue,
  expectedValue,
  'description of what is being tested',
)
```

All assertions include a descriptive message string as the third argument. Both `assert.equal()` (for primitives) and `assert.deepEqual()` (for objects/arrays) are used.

**Setup Pattern (All Three Files):**
1. Import `assert` from `node:assert/strict`
2. Use `createRequire(import.meta.url)` to get a CommonJS `require` function
3. Dynamically load the `typescript` dev dependency via `require('typescript')`
4. Read the TypeScript source file from disk with `fs/promises readFile`
5. Transpile TypeScript → CommonJS using `ts.transpileModule()`
6. Write the transpiled output to a temp file via `fs/promises writeFile`
7. `require()` the temp file to access the module's exported functions
8. Set up any global mocks (DOM globals, `Node` constants)
9. Run assertions
10. Log completion message

**Source Import Pattern:**
```javascript
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
```

**Teardown:**
No explicit teardown. Temp files are written to `os.tmpdir()` and left for the OS to clean up. No `afterEach` or cleanup hooks exist.

## Mocking

**Framework:**
No mocking framework or library. Mocks are created manually — fake DOM nodes, fake document objects, and global stubs.

**Manual DOM Mocks:**
In `test/cursor.test.mjs`, DOM structure is mocked with plain JavaScript objects:
```javascript
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
```

In `test/renderer.test.mjs`, the entire Document API is stubbed with fake classes:
```javascript
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName
    this.nodeType = 1
    this.childNodes = []
    this.textContent = ''
  }
  appendChild(node) { this.childNodes.push(node); return node }
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
```

**What to Mock:**
- DOM globals (`document`, `window`, `HTMLElement`, `Node`)
- Browser APIs that don't exist in Node.js

**What NOT to Mock:**
- Pure functions (`navigation.test.mjs` tests functions directly with no mocks)
- The module under test itself is never mocked

## Fixtures and Factories

**Test Data:**
Test inputs are constructed inline within each test. No external fixture files or factory functions are shared across test files.

**Inline Pattern:**
```javascript
// Cursor test: constructing a DOM tree inline
const before = text('open ')
const label = text('acme')
const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
const after = text(' done')
const line = element('DIV', [before, link, after])
```

**Location:**
No `__fixtures__` or `test/fixtures` directory exists. All test data is constructed in the test file.

## Coverage

**Requirements:**
No coverage targets or thresholds are enforced.

**No Coverage Tooling:**
The repository has no coverage configuration — no `c8`, `nyc`, `istanbul`, or `vitest coverage` setup. The `coverage/` and `.nyc_output/` directories are listed in `.gitignore` but no tool is configured to produce them.

**View Coverage:**
No command available for coverage reporting.

## Test Types

**Unit Tests:**
All 3 test files are unit tests — they test individual exported functions in isolation:
- `test/cursor.test.mjs` — tests `getTextOffset()` with 5 assertions
- `test/renderer.test.mjs` — tests `renderLine()` with 2 assertions
- `test/navigation.test.mjs` — tests `parseWikiLink()`, `pageDisplayName()`, `encodePathSearch()`, `decodePathSearch()` with 5 assertions

**Integration Tests:**
None. There are no tests that exercise multiple modules together or test the full editor pipeline.

**E2E Tests:**
None. No browser-based testing (Playwright, Cypress, Puppeteer). The editor can only be tested manually via `npm run dev` in a browser.

## Common Patterns

**Async Testing:**
Tests themselves are top-level `await` in `.mjs` files — no `async/await` wrapper needed:
```javascript
const source = await readFile(new URL('../src/cursor.ts', import.meta.url), 'utf8')
// ...assertions run synchronously after setup...
```

**Error Testing:**
No error/exception testing exists. The codebase does not throw custom errors, so no tests assert on thrown errors.

**State Isolation:**
Each test file operates independently. The use of `Date.now()` in temp file names prevents collisions between concurrent runs.

## Test Coverage Gaps

The following modules have **no tests at all**:

| Module | File | Risk |
|--------|------|------|
| Editor core | `src/editor.ts` (489 lines) | **High** — the largest and most complex module; handles DOM mounting, input events, navigation, rendering orchestration, debounced saves |
| Tokenizer | `src/tokenizer.ts` (97 lines) | **Medium** — core parsing logic; line-level vs inline pattern discrimination, left-to-right scanning |
| Wiki link plugin | `src/plugins/wikiLink.ts` (43 lines) | **Low** — simple wrapper; behavior is implicitly tested through navigation and renderer tests |
| Headings plugin | `src/plugins/headings.ts` (53 lines) | **Low** — straightforward switch-case renderer |
| Inline plugins | `src/plugins/inline.ts` (117 lines) | **Low** — all five plugins (bold, italic, inlineCode, blockquote, hr) follow the same `withPunct` pattern |
| Defaults plugin list | `src/plugins/defaults.ts` (20 lines) | **Low** — array export |
| localStorage adapter | `src/storage/localStorage.ts` (36 lines) | **Low** — thin wrapper over `localStorage` API |
| IndexedDB adapter | `src/storage/indexedDB.ts` (71 lines) | **Medium** — async IDB lifecycle, promise-based wrapping |
| Types | `src/types.ts` (121 lines) | **N/A** — type definitions only |

---

*Testing analysis: 2026-05-23*
