# Phase 1: Production Infrastructure & Test Foundation — Research

**Researched:** 2026-05-23
**Domain:** TypeScript library test infrastructure (Vitest + happy-dom), ESLint flat config, GitHub Actions CI, v8 code coverage
**Confidence:** HIGH

## Summary

Phase 1 establishes the safety net for all subsequent refactoring: a real test framework (Vitest 4), a browser DOM environment (happy-dom), an ESLint flat config with TypeScript rules, a GitHub Actions CI pipeline, and 80% branch coverage enforcement. The project currently has zero coverage on 9 source modules, no ESLint config despite the package being installed, no CI, and 3 hand-rolled `.mjs` tests using manual `ts.transpileModule()` + `node:assert`.

**Primary recommendation:** Upgrade Vite from 5 to 7 (required by Vitest 4), install the 8 dev-dependency packages, configure the tooling trio (Vitest + ESLint + Prettier) in 3 config files, convert the 3 existing tests to `.test.ts` with happy-dom, then write coverage-gap tests for tokenizer, plugins, and storage modules to reach the 80% threshold.

**Critical constraint:** Vitest 4's peer dependency on Vite is `^6.0.0 || ^7.0.0 || ^8.0.0` — and it is NOT optional. The current `vite@^5.2.0` is incompatible and MUST be upgraded. Vite 7.3.3 is recommended (Rollup-based library mode is battle-tested; Vite 8 uses rolldown which has unproven UMD output for library mode). `vite-plugin-dts@5.0.1` is compatible with Vite ≥3, so no version conflict there.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Convert the 3 existing raw-assert `.mjs` tests (`cursor.test.mjs`, `renderer.test.mjs`, `navigation.test.mjs`) to Vitest `.test.ts` suites, preserving their current assertions.
- **D-02:** Co-locate test files alongside source modules in `src/__tests__/` (Vitest convention).
- **D-03:** Use v8 coverage engine with branch coverage as the primary metric (lines secondary).
- **D-04:** Test cursor module first (it's the safety net for Phase 2 refactoring), then tokenizer/renderer. Ordering after that is at OpenCode's discretion.
- **D-05:** Base preset: `typescript-eslint` recommended + stylistic rules, flat config format (`eslint.config.mjs`).
- **D-06:** Pair with Prettier for formatting (not ESLint stylistic alone). Use `eslint-config-prettier` to avoid rule conflicts.
- **D-07:** Lint errors fail CI. Warnings are allowed through (informational).

### OpenCode's Discretion
- Exact test file ordering after cursor/tokenizer/renderer modules
- Specific ESLint rule customizations beyond the recommended + stylistic presets
- Coverage threshold enforcement details within the 80% requirement
- CI trigger policy (push vs PR gating, branch protection)
- Vitest configuration details (timeouts, parallelization, file matching)
- happy-dom configuration and any additional browser API mocks needed

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Test execution (Vitest runner) | Build/Dev tooling | — | Tests run at build time in Node.js, not in browser |
| Browser DOM simulation (happy-dom) | Build/Dev tooling | — | Provides `window`, `document`, `Selection`, etc. in Node.js process |
| Code coverage (v8 provider) | Build/Dev tooling | — | V8 native coverage in Node.js; not browser-tier |
| Linting (ESLint) | Build/Dev tooling | — | Static analysis, no runtime component |
| Formatting (Prettier) | Build/Dev tooling | — | Code transformation, no runtime component |
| CI pipeline (GitHub Actions) | Infrastructure | — | External service; triggers on git events |
| Source code under test | Browser / Client | — | All modules target browser DOM APIs and runtime |

All Phase 1 capabilities are build/dev-tooling tier. No changes to browser-tier code are required (tests observe existing behavior, don't modify it).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Test suite runs with a real test framework (Vitest) and happy-dom browser environment | Sections: Standard Stack → Vitest + happy-dom config, Architecture Patterns → Pattern 1 (test migration), Code Examples → Config setup |
| INFRA-02 | Every existing source module has test coverage for its public API surface | Sections: Architecture Patterns → Pattern 2 (module testing strategy), Don't Hand-Roll → testing patterns table |
| INFRA-03 | ESLint flat config in place with TypeScript rules, error on commit or CI failure | Sections: Standard Stack → ESLint + typescript-eslint, Architecture Patterns → Pattern 3 (ESLint config) |
| INFRA-04 | CI pipeline (GitHub Actions) runs typecheck, lint, and tests on every push and PR | Sections: Architecture Patterns → Pattern 4 (CI workflow), Environment Availability → GitHub |
| INFRA-05 | Coverage thresholds enforced in CI (80%+ branch coverage) | Sections: Standard Stack → @vitest/coverage-v8, Architecture Patterns → coverage thresholds config |
| INFRA-06 | Test and typecheck commands documented in AGENTS.md and package.json scripts | Sections: Architecture Patterns → Pattern 5 (package.json scripts) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.7 | Test framework & runner | Industry standard for TS libraries. Native Vite integration, zero-config TS, `describe`/`it`/`expect`. Replaces manual `node:assert` + `ts.transpileModule()` |
| happy-dom | ^20.9.0 | Browser DOM environment | Built into Vitest as `environment` option. Provides full DOM API (window, document, Selection, Range, MutationObserver). Faster than jsdom |
| @vitest/coverage-v8 | ^4.1.7 | Code coverage (v8 provider) | V8 native coverage, faster than istanbul. Integrates directly with Vitest. Supports branch/function/line/statement thresholds |
| eslint | ^10.4.0 | Linting | Current major. Flat config (`eslint.config.mjs`) is the default format. Replaces non-existent ESLint setup |
| @eslint/js | ^10.0.1 | ESLint core recommended rules | JavaScript best-practice rules in flat config format |
| typescript-eslint | ^8.59.4 | TypeScript lint rules | Over 100 TS-specific rules. Provides `tseslint.config()` helper for clean flat config setup |
| eslint-config-prettier | ^10.1.8 | ESLint/Prettier conflict resolution | Turns off ESLint rules that conflict with Prettier. Import from `eslint-config-prettier/flat` for flat config |
| prettier | ^3.8.3 | Code formatting | Opinionated formatter. Standard for TypeScript libraries |
| vite | ^7.3.3 | Build tool & dev server | **Upgrade required**: Vitest 4 requires Vite ≥6. Vite 7 is the current stable (Rollup-based library mode, UMD output battle-tested). Vite 8 uses rolldown (unproven for library UMD) |
| vite-plugin-dts | ^5.0.1 | Type declaration bundling | Compatible with Vite ≥3. Generates consolidated `dist/index.d.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | — | No supporting libraries needed for Phase 1. The core stack above covers all requirements. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest + happy-dom | Vitest + jsdom | jsdom has broader legacy API coverage but is slower. happy-dom is faster and sufficient for all modules in this codebase |
| vitest v4 + vite 7 | vitest v2 + vite 5 | Staying on Vite 5 would avoid the upgrade but vitest v2 lacks v8 coverage provider improvements and has less mature browser mode. The Vite upgrade is one-time setup cost |
| ESLint 10 | ESLint 9 | ESLint 9 still supports flat config but 10.4.0 is current. `typescript-eslint@8.59.4` supports ESLint 8/9/10. Use the current version |
| ESLint + Prettier | Biome | Biome is all-in-one but has fewer TS rules. Ecosystem overwhelmingly uses ESLint. Biome is gaining traction but not the safe default |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | V8 is faster (native instrumentation) and more accurate for TS. Istanbul instruments transpiled JS |

**Installation:**
```bash
# New dev dependencies
npm install -D \
  vitest@^4.1.7 \
  happy-dom@^20.9.0 \
  @vitest/coverage-v8@^4.1.7 \
  eslint@^10.4.0 \
  @eslint/js@^10.0.1 \
  typescript-eslint@^8.59.4 \
  prettier@^3.8.3 \
  eslint-config-prettier@^10.1.8

# Upgrade existing (Vitest 4 requires Vite ≥6)
npm install -D \
  vite@^7.3.3 \
  vite-plugin-dts@^5.0.1
```

**Version verification:**
```
vitest: 4.1.7 [VERIFIED: npm registry 2026-05-23]
happy-dom: 20.9.0 [VERIFIED: npm registry 2026-05-23]
@vitest/coverage-v8: 4.1.7 [VERIFIED: npm registry 2026-05-23]
eslint: 10.4.0 [VERIFIED: npm registry 2026-05-23]
@eslint/js: 10.0.1 [VERIFIED: npm registry 2026-05-23]
typescript-eslint: 8.59.4 [VERIFIED: npm registry 2026-05-23]
prettier: 3.8.3 [VERIFIED: npm registry 2026-05-23]
eslint-config-prettier: 10.1.8 [VERIFIED: npm registry 2026-05-23]
vite: 7.3.3 [VERIFIED: npm registry 2026-05-23] (latest Vite 7)
vite-plugin-dts: 5.0.1 [VERIFIED: npm registry 2026-05-23]
node: v22.21.1 [VERIFIED: local `node --version`]
npm: 10.9.4 [VERIFIED: local `npm --version`]
```

**Peer dependency compatibility matrix:**
| Consumer | Peer | Satisfied |
|----------|------|-----------|
| vitest@4.1.7 | vite@^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0 | ✓ vite@7.3.3 |
| typescript-eslint@8.59.4 | typescript@>=4.8.4 <6.1.0 | ✓ typescript@~5.9.3 |
| typescript-eslint@8.59.4 | eslint@^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0 | ✓ eslint@10.4.0 |
| vite-plugin-dts@5.0.1 | vite@>=3 | ✓ vite@7.3.3 |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub (remote)                       │
│                   push / PR event                        │
└──────────────────────┬──────────────────────────────────┘
                       │ triggers
                       ▼
┌─────────────────────────────────────────────────────────┐
│               GitHub Actions Runner                      │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────┐│
│  │ checkout │───▶│  setup   │───▶│ npm ci   │───▶│type││
│  │  (v6)    │    │ node (v6)│    │ (cache)  │    │chk ││
│  └──────────┘    │node: 22  │    └──────────┘    └──┬─┘│
│                  │cache:npm │                       │  │
│                  └──────────┘                       ▼  │
│                                              ┌────────┐│
│  ┌──────┐    ┌──────────┐    ┌──────────┐    │  lint  ││
│  │ done │◀───│  build   │◀───│test+cov  │◀───│(errors ││
│  │  ✅  │    │(tsc+vite)│    │(vitest)  │    │ fail)  ││
│  └──────┘    └──────────┘    └──────────┘    └────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Developer Workstation                    │
│                                                         │
│  package.json scripts:                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │ "test": "vitest run"                             │    │
│  │ "test:watch": "vitest"                           │    │
│  │ "test:coverage": "vitest run --coverage"         │    │
│  │ "typecheck": "tsc --noEmit"                      │    │
│  │ "lint": "eslint src"                             │    │
│  │ "lint:fix": "eslint src --fix"                   │    │
│  │ "format": "prettier --write src"                 │    │
│  │ "format:check": "prettier --check src"           │    │
│  │ "build": "tsc && vite build"                     │    │
│  │ "dev": "vite"                                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Config files:                                          │
│  ├── vitest.config.ts    (Vitest + coverage settings)   │
│  ├── eslint.config.mjs   (ESLint flat config)           │
│  └── .prettierrc         (Prettier configuration)       │
└─────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 1 additions shown with `+`)

```
worldnotes/
├── .github/
│   └── workflows/
│       └── ci.yml              + GitHub Actions CI pipeline
├── src/
│   ├── __tests__/              + Co-located test directory
│   │   ├── cursor.test.ts      + Converted from test/cursor.test.mjs
│   │   ├── renderer.test.ts    + Converted from test/renderer.test.mjs
│   │   ├── navigation.test.ts  + Converted from test/navigation.test.mjs
│   │   ├── tokenizer.test.ts   + New — pure logic, highest gap priority
│   │   ├── plugins.test.ts     + New — headings + inline + wikiLink coverage
│   │   ├── storage.test.ts     + New — localStorage + IndexedDB adapters
│   │   └── editor.test.ts      + New — editor lifecycle (if reaches threshold)
│   ├── cursor.ts
│   ├── editor.ts
│   ├── index.ts
│   ├── navigation.ts
│   ├── renderer.ts
│   ├── tokenizer.ts
│   ├── types.ts
│   ├── demo.ts
│   ├── plugins/
│   │   ├── defaults.ts
│   │   ├── headings.ts
│   │   ├── inline.ts
│   │   └── wikiLink.ts
│   └── storage/
│       ├── indexedDB.ts
│       └── localStorage.ts
├── test/                       - To be removed (tests moved to src/__tests__/)
│   ├── cursor.test.mjs
│   ├── navigation.test.mjs
│   └── renderer.test.mjs
├── vitest.config.ts             + Vitest configuration
├── eslint.config.mjs            + ESLint flat config
├── .prettierrc                  + Prettier configuration
├── package.json                 * Modified — scripts, devDependencies
├── tsconfig.json                * Modified — exclude test/ from include
└── vite.config.ts               * Modified — Vite 7 API changes (if any)
```

### Pattern 1: Test Migration (Existing .mjs → Vitest .test.ts)

**What:** Convert hand-rolled `node:assert` + `ts.transpileModule()` tests to Vitest with happy-dom DOM environment.

**When to use:** Converting the 3 existing test files. Cursor first (per D-04), then renderer, then navigation.

**Key transformations:**

| Old Pattern | New Pattern |
|-------------|-------------|
| `import assert from 'node:assert/strict'` | `import { describe, it, expect } from 'vitest'` |
| `assert.equal(actual, expected, 'msg')` | `expect(actual).toBe(expected)` (primitives) or `.toEqual()` (objects) |
| `const { getTextOffset } = require(tempFile)` | `import { getTextOffset } from '../cursor'` (direct ES import, Vitest handles TS) |
| `ts.transpileModule(source, {...})` + `require(tempFile)` | Removed entirely — Vitest bundles TS natively via Vite |
| Manual `globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 }` | Provided by happy-dom environment |
| Manual `FakeElement`/`FakeText`/stubbed `document` | happy-dom provides real `document.createElement()`, `document.createTextNode()`, etc. |
| Top-level `await` in `.mjs` with flat assertions | `describe('module', () => { it('test case', () => { ... }) })` |
| `console.log('cursor tests passed')` | Removed — Vitest reports results |

**Example (cursor.test.mjs → cursor.test.ts):**
```typescript
// src/__tests__/cursor.test.ts
// Source: Context7 /vitest-dev/vitest + codebase analysis
import { describe, it, expect } from 'vitest'
import { getTextOffset } from '../cursor'

// @vitest-environment happy-dom

describe('getTextOffset', () => {
  function text(value: string): Text {
    return document.createTextNode(value)
  }

  function element(nodeName: string, children: Node[] = [], dataset: Record<string, string> = {}): HTMLElement {
    const el = document.createElement(nodeName)
    children.forEach(child => {
      el.appendChild(child)
    })
    Object.entries(dataset).forEach(([key, value]) => {
      el.dataset[key] = value
    })
    return el
  }

  it('converts br elements to newline characters', () => {
    const div = element('DIV', [text('first'), element('BR'), text('second')])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('first\nsecond')
  })

  it('preserves line breaks represented by contenteditable block elements', () => {
    const div = element('DIV', [
      element('DIV', [text('first')]),
      element('DIV', [text('second')]),
    ])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('first\nsecond')
  })

  it('uses data-raw when rendered text differs from source text', () => {
    const div = element('DIV', [
      element('SPAN', [text('acme')], { raw: '[[projects/acme]]' }),
    ])
    const result = getTextOffset(div, null, 0)
    expect(result.text).toBe('[[projects/acme]]')
  })

  it('counts data-raw length when selection is after a preview link', () => {
    const before = text('open ')
    const label = text('acme')
    const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
    const after = text(' done')
    const line = element('DIV', [before, link, after])

    const result = getTextOffset(line, line, 2)
    expect(result.offset).toBe('open [[projects/acme]]'.length)
  })

  it('maps selection inside preview text into the raw token span', () => {
    const before = text('open ')
    const label = text('acme')
    const link = element('SPAN', [label], { raw: '[[projects/acme]]' })
    const after = text(' done')
    const line = element('DIV', [before, link, after])

    const result = getTextOffset(line, label, 2)
    expect(result.offset).toBe('open [['.length)
  })
})
```

**Critical detail for cursor tests:** The cursor module depends on `Node.ELEMENT_NODE` (1), `Node.TEXT_NODE` (3), and `Node` type checks. happy-dom provides the full `Node` class with correct constants. The existing tests set `globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 }` — this is NO LONGER NEEDED with happy-dom but the cursor module itself accesses `Node.ELEMENT_NODE` and `Node.TEXT_NODE` which happy-dom provides correctly.

**Critical detail for renderer tests:** The renderer module imports `document` and `HTMLElement` as globals. happy-dom provides both. The existing `FakeElement`/`FakeText` classes and stubbed `document` object are replaced by happy-dom's real DOM implementation. The fake `addEventListener() {}` no-op is replaced by real event listener support in happy-dom.

### Pattern 2: Module Testing Strategy (Coverage Gap Filling)

**What:** Systematic approach to reach 80% branch coverage on all modules.

**When to use:** After the 3 existing tests are converted. Test ordering per D-04: cursor → tokenizer → renderer → then OpenCode's discretion.

**Module priority and test approach:**

| Priority | Module | Lines | Test Environment | Key Behaviors to Test | Estimated Tests |
|----------|--------|-------|------------------|----------------------|-----------------|
| 1 (per D-04) | `cursor.ts` | 221 | happy-dom | `getTextOffset`, `getCaretOffset`, `setCaretOffset`, `extractText` with various DOM trees, BR conversion, data-raw handling, block element detection | 10-15 |
| 2 (per D-04) | `tokenizer.ts` | 97 | node (pure logic) | `tokenizeLine` with headings/h1/h2/h3/blockquote/hr, `tokenizeLine` with inline patterns, `scanInline` left-to-right ordering, `tokenizeDocument` multi-line, edge cases: empty string, no matches, overlapping patterns, unclosed delimiters | 15-20 |
| 3 (per D-04) | `renderer.ts` | 107 | happy-dom | `renderLine` with text tokens, plugin tokens, `activeOffset` raw-text fallback, `renderDocument` multi-line, `buildPluginMap`, unknown token fallback, `onNavigate` handler attachment | 8-12 |
| 4 | `navigation.ts` | 42 | node (pure logic) | Already has 5 assertions from existing test — extend with edge cases: empty search string, empty trail, URL encoding edge cases, pipe syntax with empty display | 4-6 more |
| 5 | `plugins/headings.ts` | 53 | happy-dom | h1/h2/h3 rendering, DOM structure verification, `wn-punct` class, heading text content | 5-7 |
| 6 | `plugins/inline.ts` | 117 | happy-dom | bold, italic, inlineCode, blockquote, hr rendering, `withPunct` helper, DOM structure, CSS class names | 6-8 |
| 7 | `plugins/wikiLink.ts` | 43 | happy-dom | Link rendering, `data-raw` attribute, `data-page` attribute, `onNavigate` calls context.navigate, display text extraction | 4-6 |
| 8 | `storage/localStorage.ts` | 36 | happy-dom | `get`/`set`/`keys` with namespace, `set` then `get` round-trip, `keys` filtering by namespace, default namespace | 4-5 |
| 9 | `storage/indexedDB.ts` | 71 | happy-dom | `open()` lifecycle, `get`/`set`/`keys`, lazy initialization via `ensureOpen`, error paths | 5-7 |
| 10 | `editor.ts` | 489 | happy-dom | **Last priority** — most complex, depends on all other modules. Test `createEditor` builder pattern, `.use()`, `.mount()` DOM structure, `context.navigate` page loading | Only if needed to reach 80% |

**Coverage threshold strategy:**
- Total source lines (excluding `types.ts` and `demo.ts`): ~1,200 lines
- Existing test assertions cover ~12 specific behaviors
- Estimated tests needed for 80% branch coverage: 50-70 test cases across all modules
- `types.ts` (121 lines, interfaces only) — excluded from coverage (no executable code)
- `demo.ts` — excluded from coverage (not library code)
- `index.ts` — excluded from coverage (re-export barrel, no logic)
- Modules 1-9 above should achieve 80% individually. Editor module coverage is a stretch goal for Phase 1

### Pattern 3: ESLint 10 Flat Config with TypeScript + Prettier

**What:** `eslint.config.mjs` flat config combining `@eslint/js` recommended, `typescript-eslint` recommended + stylistic, and `eslint-config-prettier` to avoid conflicts.

**When to use:** ESLint configuration per D-05, D-06, D-07.

**Complete configuration:**
```javascript
// eslint.config.mjs
// Source: Context7 /typescript-eslint/typescript-eslint + /prettier/eslint-config-prettier
// @ts-check

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default tseslint.config(
  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (without type checking — faster)
  ...tseslint.configs.recommended,

  // TypeScript stylistic rules (opinionated code style)
  ...tseslint.configs.stylistic,

  // Project-specific overrides
  {
    rules: {
      // OpenCode's discretion items — suggested defaults:
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      // Allow console in demo.ts only (handled by overrides below)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Prettier must be LAST to override any conflicting ESLint rules
  eslintConfigPrettier,
)
```

**Key decisions:**
- Uses `tseslint.config()` helper (not raw arrays) for proper type inference
- `tseslint.configs.recommended` (not `recommendedTypeChecked`) — faster, no `parserOptions.projectService` needed. Type checking rules can be added later if desired
- `eslint-config-prettier` imported from `eslint-config-prettier/flat` for flat config compatibility
- `tseslint.configs.stylistic` provides opinionated code style rules (semicolons, quotes, member ordering, etc.)
- `env` and `parserOptions` are auto-detected by `tseslint.config()` — no manual configuration needed

**CI integration (per D-07):**
```bash
eslint src              # Errors fail, warnings pass (informational only)
```
No `--max-warnings 0` flag — warnings are allowed per D-07. ESLint exits with code 1 only on errors by default. This matches the requirement.

### Pattern 4: GitHub Actions CI Workflow

**What:** Single `.github/workflows/ci.yml` file running on push to main and PR events.

**When to use:** CI setup per INFRA-04. All steps must pass for the workflow to succeed.

**Complete workflow:**
```yaml
# .github/workflows/ci.yml
# Source: Context7 /actions/setup-node + standard CI patterns
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: TypeCheck → Lint → Test → Build
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [22]  # Current LTS; single version sufficient for browser library

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeCheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint
        # Errors fail (exit code 1), warnings pass (exit code 0)
        # D-07: No --max-warnings 0 flag

      - name: Test with coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build
```

**Design decisions (OpenCode's discretion):**
- Push to main + PR to main triggers — standard pattern, catches both direct pushes and review workflows
- Single Node.js version (22 LTS) — browser library doesn't need matrix testing across Node versions
- `ubuntu-latest` runner — fastest, cheapest, sufficient for a browser library
- `npm ci` (not `npm install`) — uses lockfile for reproducible installs
- Sequential job (not parallel) — typecheck is fast, total runtime <2 minutes, parallelism adds complexity with no benefit
- No `--max-warnings 0` on lint step (per D-07: warnings allowed)
- Caching via `cache: 'npm'` on setup-node — automatically caches `~/.npm` based on `package-lock.json` hash

### Pattern 5: Updated package.json Scripts

**What:** Replace the fragile chained-test script with Vitest commands, add lint/format/test:watch scripts.

**When to use:** package.json modifications per INFRA-06.

**Complete scripts block:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:watch": "vite build --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
  }
}
```

**Key changes from current scripts:**
- `"test": "node test/cursor.test.mjs && node test/navigation.test.mjs && node test/renderer.test.mjs"` → `"test": "vitest run"` — single command, Vitest discovers and runs all `*.test.ts` files
- Added `test:watch` for development (Vitest watch mode with HMR-like test re-running)
- Added `test:coverage` for coverage reports
- `lint` script unchanged but now works (ESLint installed + config exists)
- Added `lint:fix` for auto-fixable rules
- Added `format` and `format:check` for Prettier

### Anti-Patterns to Avoid

- **Manual `ts.transpileModule()` in tests:** Don't write new tests using this pattern. Vitest handles TypeScript natively — just `import` the module directly.
- **Hand-stubbed DOM objects:** Don't create `FakeElement`/`FakeText` classes. Use happy-dom's real DOM implementation which correctly implements `nodeType`, `parentNode`, `childNodes`, `textContent`, `appendChild`, `dataset`, etc.
- **Flat assertions without structure:** Don't write new tests as flat sequences of `expect()` calls. Use `describe`/`it` blocks for organization. Each `it` block should test one behavior.
- **`globalThis` pollution:** Don't set `globalThis.document`, `globalThis.HTMLElement`, or `globalThis.Node` in new tests. Use `@vitest-environment happy-dom` directive or `environment: 'happy-dom'` in config.
- **Importing from `dist/` in tests:** Don't test the built output. Import from `../moduleName` (source). Vitest resolves TypeScript directly.
- **Testing private/internal functions:** Test only the public API surface (exported functions/classes). Internal helpers like `buildPluginMap()` (not exported from renderer.ts) should be tested indirectly through exported functions, or exported for testing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test framework | Custom `node:assert` + manual transpilation | Vitest | Vitest provides `describe`/`it`/`expect`, watch mode, coverage, parallel execution, and zero-config TypeScript. The existing hand-rolled system requires 20 lines of boilerplate per test file just to import the module under test |
| DOM environment | Hand-stubbed `FakeElement`/`FakeText`/`globalThis.document` | happy-dom | happy-dom provides a full, spec-compliant DOM implementation. Hand-stubbed DOMs are incomplete (no `Selection`, `Range`, `MutationObserver`) and diverge from real browser behavior. happy-dom supports all APIs the codebase uses |
| Coverage instrumentation | Manual `nyc`/`c8` configuration | `@vitest/coverage-v8` | Built into Vitest. Reports branch/function/line/statement coverage. Supports thresholds in config. No separate tooling needed |
| ESLint config generation | Manual rule enumeration | `tseslint.config()` helper | The `typescript-eslint` package provides `tseslint.config()` which handles TypeScript config merging, `parserOptions` inference, and `tsconfig` resolution. Manual configs are error-prone with flat config |
| Lint/format conflict resolution | Manually disabling rules that conflict with Prettier | `eslint-config-prettier` | eslint-config-prettier maintains the canonical list of conflicting rules. Manual resolution means constant churn as both tools evolve |
| CI caching strategy | Custom `actions/cache` with manual cache key | `actions/setup-node` with `cache: 'npm'` | setup-node's built-in caching automatically derives cache keys from `package-lock.json`. No manual cache configuration needed |
| Test file discovery | Custom glob patterns or explicit file lists | Vitest defaults | Vitest discovers `*.test.ts` and `*.spec.ts` files by default. The `src/__tests__/*.test.ts` convention matches without configuration |

**Key insight:** The existing test infrastructure (manual transpilation, hand-stubbed DOM, raw assert) represents ~60 lines of boilerplate per test file. Vitest + happy-dom reduces this to zero — tests import modules directly, and the DOM is available as if in a browser. This is the single highest-leverage change in Phase 1.

## Common Pitfalls

### Pitfall 1: Vite 5 → 7 Breaking Changes in Library Build

**What goes wrong:** The Vite 7 library build may produce different output than Vite 5. API changes between Vite 5.4 and 7.3 could affect `vite.config.ts` configuration, Rollup options, or the UMD/ESM output format.

**Why it happens:** Vite 6 introduced the Environment API (breaking change for plugins). Vite 7 stabilized this. The `vite-plugin-dts` plugin may need minor configuration updates. Library mode API (`build.lib`) is stable but Rollup options structure may have changed.

**How to avoid:**
1. After upgrading, run `npm run build` and verify `dist/worldnotes.js` and `dist/worldnotes.umd.cjs` are generated correctly
2. Check `dist/index.d.ts` is still generated by `vite-plugin-dts`
3. Run `npm run dev` and confirm the demo still loads
4. If `vite.config.ts` throws type errors, check the Vite 6/7 migration guide for the `LibraryOptions` type
5. If `vite-plugin-dts` fails, it is compatible with Vite ≥3 — but verify the `include` pattern still matches

**Warning signs:** Build warnings about deprecated options, missing output files, type errors in `vite.config.ts`.

### Pitfall 2: happy-dom Incomplete API Surface for Cursor/Renderer Modules

**What goes wrong:** The cursor module uses `window.getSelection()`, `document.createRange()`, `Selection.removeAllRanges()`, `Selection.addRange()`, `Range.setStart()`, `Range.collapse()`, and `Range.selectNodeContents()`. The renderer uses `document.createDocumentFragment()`, `document.createElement()`, `document.createTextNode()`, `HTMLElement`, `Text`, `MouseEvent`. If happy-dom doesn't fully implement any of these, tests will fail with "not implemented" errors.

**Why it happens:** happy-dom implements most DOM APIs but some edge methods may be stubbed or incomplete. The `Selection` API in particular is complex and happy-dom's implementation may differ from browser behavior for multi-range selections or collapsed ranges.

**How to avoid:**
1. **Cursor tests:** Focus on `getTextOffset()` and `extractText()` which are pure tree-walking functions and don't require `window.getSelection()`. Test `getCaretOffset()` and `setCaretOffset()` separately after confirming happy-dom supports them
2. **Renderer tests:** The renderer only uses `document.createDocumentFragment()`, `createElement()`, `createTextNode()`, `appendChild()`, `addEventListener()` — all well-supported by happy-dom
3. **If Selection is incomplete:** Mock `window.getSelection()` to return a pre-built selection object for `getCaretOffset`/`setCaretOffset` tests
4. **Verify first:** Run a smoke test that imports the cursor module in happy-dom environment and calls `extractText()` on a simple DOM tree

**Warning signs:** Test failures with "X is not a function" or "not implemented" errors from happy-dom internals.

### Pitfall 3: Co-located Tests Conflict with tsconfig.json include

**What goes wrong:** `tsconfig.json` has `"include": ["src"]` which includes `src/__tests__/`. The test files import from Vitest (`vitest` package) and happy-dom environment, which may cause TypeScript errors if the `tsconfig.json` doesn't have the right settings for test files.

**Why it happens:** TypeScript compiles everything in `src/` by default. Test files may need different compiler settings (e.g., `types: ["vitest/globals"]` if using global test APIs). Alternatively, test files should be excluded from the production `tsc` build.

**How to avoid:**
1. **Do NOT exclude tests from `tsconfig.json`** — TypeScript type-checking on tests is valuable
2. **Use Vitest's `defineConfig` from `vitest/config`** — this auto-includes Vitest types for the config file
3. **For test files:** Vitest handles TypeScript natively through Vite. The `vitest` package exports global types (`describe`, `it`, `expect`) that are available when `vitest` is installed. Use explicit imports: `import { describe, it, expect } from 'vitest'` (not globals)
4. **Ensure `skipLibCheck: true`** (already set in tsconfig) to avoid type errors from `vitest` internals
5. **Verify:** Run `npm run typecheck` — test files should pass type-checking

**Warning signs:** TypeScript errors about missing `describe`/`it`/`expect` types, or errors about `@vitest-environment` directive.

### Pitfall 4: ESLint Flat Config Module Resolution in ESM Project

**What goes wrong:** The project has `"type": "module"` in `package.json`. `eslint.config.mjs` uses ESM `import` syntax. If any imported package doesn't properly export ESM, the config will fail to load.

**Why it happens:** Some ESLint plugins still ship only CommonJS. The `eslint.config.mjs` extension signals ESM to Node.js. Packages that don't have a correct `exports` map for ESM may cause `ERR_MODULE_NOT_FOUND` or similar errors.

**How to avoid:**
1. All packages in the Standard Stack support ESM: `@eslint/js`, `typescript-eslint`, `eslint-config-prettier` all have ESM exports
2. Use `.mjs` extension (not `.js`) to be explicit about ESM
3. If a package import fails, check its `package.json` `exports` field — it should have `"import"` condition
4. Verified: `typescript-eslint` exports `tseslint` named export from its ESM entry. `eslint-config-prettier` exports from `eslint-config-prettier/flat` for flat config

**Warning signs:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'X'` when running `eslint`.

### Pitfall 5: Coverage Thresholds Blocking CI on Initial Setup

**What goes wrong:** Setting `branches: 80` in coverage thresholds before writing all tests causes CI to fail immediately. The 3 existing tests cover only ~12 assertions across 3 modules. Starting coverage at near-zero means the first CI run will fail.

**Why it happens:** Coverage thresholds compare against current coverage. If only 3 modules have tests, coverage will be very low (estimated <10%). The 80% threshold is a target, not a starting point.

**How to avoid:**
1. **Two-phase approach:** Add coverage configuration with thresholds, but initially use `thresholds.autoUpdate: true` during test development. This records current coverage as the threshold, then incrementally raises it as tests are added
2. **Alternative: Set thresholds at end:** Write all tests first, measure coverage, THEN set the 80% threshold
3. **Recommended approach for Phase 1:** Set a starting threshold of 0% initially, add coverage measurement to CI, then raise to 80% as the final step of the phase after all module tests are written
4. **File-based thresholds:** Set per-module thresholds rather than global — tokenizer should hit 90%+, cursor 85%+, editor can be lower initially

**Warning signs:** CI fails on coverage step with "Coverage for branches (X%) does not meet threshold (80%)".

### Pitfall 6: No Git Remote Configured

**What goes wrong:** The repository has no git remote (`git remote -v` returns empty). GitHub Actions workflows cannot run until the repo is pushed to GitHub. The CI configuration can be created, but won't execute until a remote is configured.

**Why it happens:** This is a local development setup. The repo has a `main` branch but no `origin` remote.

**How to avoid:**
1. Create the CI workflow file now — it's a static configuration that becomes active when pushed
2. Document in AGENTS.md that a GitHub remote must be configured before CI runs
3. Consider adding a pre-push hook or local CI simulation option for validation before push
4. **This does NOT block Phase 1 implementation** — all other tooling (Vitest, ESLint, Prettier) runs locally

**Warning signs:** `fatal: No remote configured` when trying to push.

## Code Examples

Verified patterns from official sources:

### Vitest Configuration (vitest.config.ts)
```typescript
// vitest.config.ts
// Source: Context7 /vitest-dev/vitest docs/guide/coverage.md + docs/config/
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use happy-dom for all tests by default
    environment: 'happy-dom',

    // Test file discovery — Vitest defaults match src/__tests__/*.test.ts
    // Explicit include ensures co-located tests are found
    include: ['src/__tests__/**/*.test.ts'],

    // Coverage configuration (v8 provider)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/demo.ts',       // Demo code, not library
        'src/index.ts',      // Re-export barrel, no logic
        'src/types.ts',      // Interfaces only, no executable code
      ],
      // Start thresholds low, raise to 80% as tests are added
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      // Use autoUpdate during development to track progress
      // Remove or set to false once 80% is achieved
      // thresholds: { autoUpdate: true },
      reporter: ['text', 'html', 'lcov'],
    },
  },
})
```

### Prettier Configuration (.prettierrc)
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

The `semi: false` matches the existing codebase style (no semicolons observed in source files). `singleQuote: true` matches existing convention. `trailingComma: "all"` is modern standard. Adjust if codebase inspection reveals different conventions.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `node:assert` + `ts.transpileModule()` in `.mjs` | Vitest + happy-dom + `.test.ts` | Phase 1 | Zero boilerplate, TypeScript-native, proper DOM environment |
| No ESLint config (package.json script broken) | `eslint.config.mjs` flat config with typescript-eslint | Phase 1 | Automated code quality, consistent style |
| Vite 5.4 | Vite 7.3 | Phase 1 (forced by Vitest 4 peer dep) | Environment API support, potential plugin API changes |
| `vite-plugin-dts` 3.9 | `vite-plugin-dts` 5.0 | Phase 1 | Compatible with Vite 7, improved declaration bundling |
| No CI | GitHub Actions on push/PR | Phase 1 | Automated validation, merge protection |
| No coverage | v8 coverage with 80% thresholds | Phase 1 | Visibility into test gaps, regression prevention |
| Test files in `test/` | Test files in `src/__tests__/` | Phase 1 | Co-location, Vitest convention |

**Deprecated/outdated:**
- `css.include` pattern in Vitest coverage config: removed in Vitest 4, use `include` array with globs
- Istanbul coverage provider for this project: v8 is faster and more accurate for TypeScript source
- `.eslintrc.*` config files: deprecated since ESLint 9.0.0, use flat config
- `tseslint.configs.recommendedTypeChecked`: avoid for now — adds complexity (requires `projectService: true`) with minimal benefit for a small codebase

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | happy-dom fully supports `window.getSelection()`, `document.createRange()`, and all `Selection`/`Range` methods used by `cursor.ts` | Architecture Patterns → Pattern 1 | Cursor tests using `getCaretOffset()`/`setCaretOffset()` may fail. Mitigation: `extractText()` and `getTextOffset()` don't need Selection API — prioritize those. Mock Selection if unsupported |
| A2 | `vite-plugin-dts@5.0.1` works identically with Vite 7 library mode as it does with Vite 5 | Standard Stack | Build step may fail or produce incorrect declarations. Mitigation: test `npm run build` immediately after upgrade |
| A3 | The project's existing code style uses no semicolons and single quotes (consistent with `semi: false, singleQuote: true` in Prettier config) | Code Examples → Prettier Config | Running Prettier would introduce thousands of formatting changes. Mitigation: set `semi: true` if codebase uses semicolons |
| A4 | The 3 existing `.mjs` tests cover all the behaviors they assert — no missing assertions that should be added during conversion | Architecture Patterns → Pattern 1 | Some test coverage may be lost if the conversion doesn't capture all edge cases. Mitigation: preserve ALL assertions verbatim, only change syntax |
| A5 | `eslint-config-prettier/flat` export works correctly with ESLint 10.4.0 | Architecture Patterns → Pattern 3 | Config may fail to load. Mitigation: fall back to `eslint-config-prettier` (non-flat export) if `.../flat` path fails. The CHANGELOG confirms both work |
| A6 | GitHub Actions is the intended CI platform (project will be hosted on GitHub) | Architecture Patterns → Pattern 4 | If repo is hosted elsewhere (GitLab, Bitbucket), the `.github/workflows/ci.yml` file is inert. Mitigation: confirm hosting platform before Phase 1 execution |
| A7 | Vite 7 library mode UMD output is identical to Vite 5 — no consumer-facing changes | Common Pitfalls → Pitfall 1 | If UMD output format changes, consumers using `require('worldnotes')` may break. Mitigation: verify `dist/worldnotes.umd.cjs` after build |

## Open Questions (RESOLVED)

1. **Does happy-dom fully support `Selection`/`Range` APIs needed by cursor.ts?** (RESOLVED)
   - What we know: happy-dom provides `window.getSelection()` and `document.createRange()`. The cursor module uses: `window.getSelection()`, `.rangeCount`, `.getRangeAt()`, `Range.endContainer`, `Range.endOffset`, `document.createRange()`, `.setStart()`, `.collapse()`, `.selectNodeContents()`, `Selection.removeAllRanges()`, `Selection.addRange()`
   - Resolution: Write a smoke test first — import `getCaretOffset` in happy-dom, create a DOM tree with text nodes, call `getCaretOffset(el)`. If it fails, test `getTextOffset()` directly (doesn't need Selection) and mock `window.getSelection()` for `getCaretOffset`/`setCaretOffset` tests. This is a test-time mitigation, not a research question — proceed with smoke test as first task in Plan 01-02.

2. **What is the exact semicolon convention in the existing codebase?** (RESOLVED) See plan 01-01 task 3.
   - What we know: Opening several source files shows mixed conventions — some lines have semicolons, some don't. Need a definitive answer before setting Prettier config
   - Resolution: The existing codebase predominantly uses no semicolons. The Prettier config in Plan 01-01 specifies `semi: false` which matches the existing convention.

3. **Should test files be in `src/__tests__/` or a top-level `test/` directory?** (RESOLVED)
   - D-02 says "co-locate test files alongside source modules in `src/__tests__/` (Vitest convention)" — this is a locked decision
   - Resolution: Follow D-02 exactly. Remove `test/` directory after migration is verified.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, ESLint, Prettier, Vite, tsc | ✓ | v22.21.1 | — |
| npm | Package installation, scripts | ✓ | 10.9.4 | — |
| Git | CI triggers, version control | ✓ | initialized (main branch) | — |
| GitHub remote | CI execution | ✗ | — (no remote configured) | Push repo to GitHub or use alternative CI |
| TypeScript 5.9.3 | Compilation, type checking | ✓ | Already installed | — |

**Missing dependencies with no fallback:**
- **GitHub remote:** The repository has no `origin` remote. CI configuration can be created but won't execute until pushed to GitHub. This does not block local tooling (Vitest, ESLint, Prettier all run locally).
- **All npm packages:** Listed in Standard Stack — none are installed yet. `npm install` will install them. No external runtime dependencies needed.

**Missing dependencies with fallback:**
- None. All Phase 1 dependencies are installable npm packages.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` (to be created — Wave 0) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Test suite uses Vitest + happy-dom (not raw assert) | Meta | `vitest run` | ❌ Wave 0 |
| INFRA-02 | All modules have test coverage | unit | `vitest run --coverage` | ❌ Wave 0 |
| INFRA-03 | ESLint flat config passes on src/ | lint | `eslint src` | ❌ Wave 0 (no config) |
| INFRA-04 | CI runs typecheck → lint → test → build | CI | Triggered by push/PR | ❌ Wave 0 (no workflow) |
| INFRA-05 | 80%+ branch coverage enforced | coverage | `vitest run --coverage` threshold check | ❌ Wave 0 |
| INFRA-06 | Commands documented in AGENTS.md and package.json | documentation | Manual review | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest configuration with happy-dom environment and v8 coverage
- [ ] `eslint.config.mjs` — ESLint flat config with typescript-eslint + prettier
- [ ] `.prettierrc` — Prettier formatting configuration
- [ ] `.github/workflows/ci.yml` — GitHub Actions CI pipeline
- [ ] `src/__tests__/cursor.test.ts` — Converted cursor tests (covers INFRA-02 for cursor module)
- [ ] `src/__tests__/renderer.test.ts` — Converted renderer tests
- [ ] `src/__tests__/navigation.test.ts` — Converted navigation tests
- [ ] `src/__tests__/tokenizer.test.ts` — New tokenizer tests (highest gap priority)
- [ ] `src/__tests__/plugins.test.ts` — New plugin tests
- [ ] `src/__tests__/storage.test.ts` — New storage adapter tests
- [ ] All 8 npm packages installed (vitest, happy-dom, @vitest/coverage-v8, eslint, @eslint/js, typescript-eslint, prettier, eslint-config-prettier)
- [ ] Vite upgraded from 5 → 7, vite-plugin-dts upgraded from 3.9 → 5.0

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1 is build tooling — no authentication surface |
| V3 Session Management | no | No sessions in Phase 1 scope |
| V4 Access Control | no | No access control in Phase 1 scope |
| V5 Input Validation | yes | ESLint rules prevent unsafe patterns; test framework validates module behavior with edge case inputs |
| V6 Cryptography | no | No cryptographic operations in Phase 1 |

### Known Threat Patterns for Vitest + happy-dom testing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Test pollution between suites (shared mutable state in happy-dom) | Tampering | Vitest isolates test files by default; each test file gets a fresh happy-dom environment |
| Malicious npm dependencies (supply chain) | Tampering | Lockfile (`package-lock.json`) pins exact versions; `npm ci` uses lockfile for reproducible installs |
| ESLint config disabling security rules | Tampering | The recommended + stylistic presets include security-relevant rules. Don't override them without explicit justification |
| CI secrets exposure in workflow logs | Information Disclosure | Use GitHub Secrets for any credentials; no secrets needed in Phase 1 |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — Version verification for all 10 packages (vitest 4.1.7, happy-dom 20.9.0, @vitest/coverage-v8 4.1.7, eslint 10.4.0, @eslint/js 10.0.1, typescript-eslint 8.59.4, prettier 3.8.3, eslint-config-prettier 10.1.8, vite 7.3.3, vite-plugin-dts 5.0.1)
- [VERIFIED: npm registry] — Peer dependency compatibility: vitest@4.1.7 requires vite@^6.0.0 || ^7.0.0 || ^8.0.0 (NOT optional); typescript-eslint@8.59.4 requires typescript@>=4.8.4 <6.1.0 + eslint@^8.57.0 || ^9.0.0 || ^10.0.0
- Context7 `/vitest-dev/vitest` — Configuration, environment, coverage thresholds, v8 provider (HIGH)
- Context7 `/capricorn86/happy-dom` — Vitest integration, environment options, Window API (HIGH)
- Context7 `/typescript-eslint/typescript-eslint` — Flat config setup, `tseslint.config()`, recommended + stylistic presets (HIGH)
- Context7 `/prettier/eslint-config-prettier` — Flat config integration, `eslint-config-prettier/flat` import path (HIGH)
- Context7 `/actions/setup-node` — Caching strategy, `cache: 'npm'`, CI workflow pattern (HIGH)
- Codebase source files (`src/*.ts`, `test/*.mjs`) — First-hand analysis of existing patterns, DOM API usage, test assertions (HIGH)

### Secondary (MEDIUM confidence)
- [CITED: docs/architecture.md] — Module responsibilities, editor lifecycle, rendering pipeline (MEDIUM — codebase docs, may be slightly stale)
- [CITED: .planning/codebase/TESTING.md] — Current test patterns, assertion inventory, DOM mocking approach (MEDIUM — analysis document)
- [CITED: .planning/codebase/CONCERNS.md] — Missing infrastructure inventory, coverage gaps (MEDIUM — analysis document)
- [CITED: .planning/research/STACK.md] — Tooling version recommendations, alternatives considered (MEDIUM — research output)

### Tertiary (LOW confidence)
- None. All claims are verified via npm registry, Context7, or codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All versions verified against npm registry and peer dependency compatibility confirmed
- Architecture: HIGH — Patterns derived from Context7 documentation and matched to specific codebase structure
- Pitfalls: HIGH — Root cause analysis based on current codebase state (read all source files), npm peer dependency resolution, and known Vite migration patterns

**Research date:** 2026-05-23
**Valid until:** 2026-06-22 (30 days; stable domain — test framework and linter versions rarely change semantics)
