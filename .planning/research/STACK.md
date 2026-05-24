# Stack Research

**Domain:** Browser Markdown editor library with plugin extensibility
**Researched:** 2026-05-23
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ~5.9.3 | Language | Already in use. Pinned to avoid unexpected breakage from minor bumps. TS 6.0.3 exists but introduces breaking changes — defer bump to a dedicated milestone. |
| Vite | ^7.3.0 | Build tool & dev server | Vitest 4 requires Vite ^6/^7/^8. Vite 7 is the stable current-gen: proven Rollup-based library mode (ESM + UMD), mature ecosystem, no breaking rolldown migration. Vite 8 uses rolldown which is still proving library output stability. |
| vite-plugin-dts | ^5.0.0 | Type declaration bundling | Generates consolidated `dist/index.d.ts`. Compatible with Vite >=3, works with Vite 7. Version 5 is the current major. |

### Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | ^4.1.0 | Test framework & runner | Industry standard for TypeScript libraries (used by TipTap 36.9k★, Milkdown 11.5k★). Native Vite integration, zero-config TypeScript, watch mode, isolated test selection, `describe`/`it`/`expect` semantics. Replaces the current hand-rolled `node:assert` + `ts.transpileModule()` test infrastructure. |
| happy-dom | ^20.9.0 | Browser DOM environment | Built into Vitest as an `environment` option. Faster than jsdom, better spec compliance, actively maintained. Provides `window`, `document`, `Selection`, `Range`, `MutationObserver`, `localStorage`, `IndexedDB` — everything the editor needs. Replaces the current hand-stubbed DOM in test files. |
| @vitest/coverage-v8 | ^4.1.0 | Code coverage | Native V8 coverage (successor to c8). Faster than istanbul. Integrates directly with Vitest. Supports coverage thresholds in config. |

### Linting & Formatting

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ESLint | ^10.4.0 | Linting | ESLint 10 + flat config (`eslint.config.mjs`) is the current standard. Replaces the non-existent ESLint setup (package.json references `eslint` but it's not installed and no config exists). |
| @eslint/js | ^10.0.0 | ESLint recommended rules | Core JavaScript rules in flat config format. |
| typescript-eslint | ^8.59.0 | TypeScript lint rules | Over 100 TS-specific rules including type-aware linting. Peers with ESLint 8/9/10 and TS >=4.8.4 <6.1.0. Provides `tseslint.config()` helper for clean flat config setup. |
| eslint-config-prettier | ^10.1.0 | ESLint/Prettier conflict resolution | Turns off ESLint rules that conflict with Prettier. Standard pairing for any project using both tools. |
| Prettier | ^3.8.0 | Code formatting | Opinionated formatter. Used by TipTap and Milkdown. Standard for TypeScript libraries. |

### CI/CD

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| GitHub Actions | — | CI pipeline | Standard for GitHub-hosted repos. No cost for public repos. TipTap, Milkdown, and ProseMirror all use it. Single workflow file runs typecheck → lint → test → build on push/PR. |

### Design Tokens & Theming

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| CSS Custom Properties | Native (browser) | Design token system | Zero-dependency theming via `--wn-*` custom properties. Covers the 80% use case (color, spacing, typography overrides). Requires no library — just a documented set of CSS variables emitted by the editor core. |
| CSS class scoping | Native (browser) | Theme replacement escape hatch | 20% use case: full CSS file swap. Editor emits BEM-style class names (`.wn-editor`, `.wn-toolbar`, etc.) so consumers can write complete replacement stylesheets. |

## Installation

```bash
# Dev dependencies (add/replace existing)
npm install -D \
  vitest@^4.1.0 \
  happy-dom@^20.9.0 \
  @vitest/coverage-v8@^4.1.0 \
  eslint@^10.4.0 \
  @eslint/js@^10.0.0 \
  typescript-eslint@^8.59.0 \
  prettier@^3.8.0 \
  eslint-config-prettier@^10.1.0

# Upgrade existing
npm install -D \
  vite@^7.3.0 \
  vite-plugin-dts@^5.0.0 \
  typescript@~5.9.3
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vitest + happy-dom | Jest + jsdom | Never. Jest is superseded by Vitest for TypeScript projects. Vitest is faster, has native ESM/TS support, and shares Vite config. Only use Jest if migrating a massive existing Jest codebase. |
| Vitest + happy-dom | Vitest + jsdom | When you need a specific jsdom feature happy-dom doesn't support. happy-dom is faster and has better spec compliance for modern DOM APIs (Custom Elements, CSSOM, etc.). jsdom is older, slower, but slightly broader legacy API coverage. |
| Vitest + happy-dom | Vitest browser mode (Playwright) | When you need to test actual browser rendering behavior (layout, paint, real selection/Caret). Browser mode runs tests in real Chromium/Firefox/WebKit. This is valuable for cursor/caret tests. Consider as a **complement** to happy-dom, not a replacement. Use happy-dom for unit tests, Playwright browser mode for integration tests. |
| Vite 7.3 | Vite 8.0 | When rolldown library output is proven stable for your output formats. Vite 8 uses rolldown instead of Rollup. The library mode preset in Vite 7 is battle-tested for ESM + UMD output. |
| ESLint 10 + flat config | ESLint 9 (legacy .eslintrc) | Never for new configs. Flat config has been the default since ESLint 9.0.0. Legacy config is deprecated. |
| ESLint + Prettier | Biome | When you want a single tool for both linting and formatting. Biome is all-in-one but has fewer rules than ESLint + typescript-eslint, and the TypeScript ecosystem overwhelmingly uses ESLint. Biome is gaining traction but not yet the safe default for libraries. |
| ESLint + Prettier | oxlint + oxfmt | When build speed is the top priority. oxlint is extremely fast (Rust) but has far fewer rules than typescript-eslint and is less configurable. Milkdown uses it alongside Prettier but still runs ESLint for CI. |
| GitHub Actions | GitLab CI / CircleCI | Only if the repo is not hosted on GitHub. GitHub Actions is the default for GitHub repos and has the best ecosystem of pre-built actions. |
| CSS Custom Properties | A theming library (e.g., `@radix-ui/colors`, `open-props`) | When you want a pre-built design system rather than defining tokens yourself. These libraries provide color scales and spacing values. Adding them as a dependency contradicts the zero-runtime-deps constraint. Define your own `--wn-*` tokens. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Jest | Superseded by Vitest. No native ESM/TypeScript support without transformers. Slower. | Vitest |
| jsdom | Slower than happy-dom. Less actively maintained. Worse Custom Elements and CSSOM support. | happy-dom |
| Mocha / Jasmine | Legacy test frameworks. No native TypeScript support. No watch mode without plugins. No Vite integration. | Vitest |
| Istanbul (nyc) | V8 native coverage is faster and more accurate for TypeScript. Istanbul instruments transpiled code. | @vitest/coverage-v8 |
| Vite 5 | Vitest 4 requires Vite ^6/^7/^8. Staying on Vite 5 would force staying on an older Vitest (v2.x). | Vite 7 |
| Vite 8 (rolldown) | Library mode ESM+UMD output not yet proven with rolldown. Vite 7 uses battle-tested Rollup. | Vite 7 (for now) |
| oxlint as sole linter | Far fewer rules than typescript-eslint. No type-aware linting. Immature ecosystem. | ESLint 10 + typescript-eslint |
| TSLint | Deprecated since 2019. | ESLint + typescript-eslint |
| Any runtime dependency | The zero-dep constraint is a core differentiator. Every runtime dependency adds bundle weight, version conflicts, and supply chain risk. | Vanilla TypeScript + DOM APIs |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| vitest@4.1.7 | vite@^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0 | Vitest 4 is the latest major. |
| vitest@4.1.7 | happy-dom@* | happy-dom is a peer dep — any version works. 20.9.0 is latest. |
| typescript-eslint@8.59.4 | eslint@^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0 | Both ESLint 9 and 10 supported. |
| typescript-eslint@8.59.4 | typescript@>=4.8.4 <6.1.0 | TS 5.9.3 is within range. TS 6.0.3 also works but not recommended. |
| vite-plugin-dts@5.0.1 | vite@>=3 | Wide compatibility. Works with Vite 7. |
| eslint-config-prettier@10.1.8 | eslint@* | Turn off conflicting rules. Flat config compatible. |
| @eslint/js@10.0.1 | eslint@10.x | Core recommended rules for ESLint 10 flat config. |

## Stack Patterns by Variant

**For unit tests (pure logic, tokenizer, storage adapters):**
- Use Vitest with `environment: 'node'` (default)
- No DOM needed — these are pure functions

**For DOM-dependent tests (renderer, cursor, editor, plugins):**
- Use Vitest with `environment: 'happy-dom'`
- Configure via `vitest.config.ts`: `environment: 'happy-dom'`
- Test files: `*.test.ts` (Vitest auto-detects TypeScript)

**For cursor/caret integration tests (optional, future):**
- Use Vitest browser mode with `@vitest/browser-playwright`
- Runs in real Chromium — tests actual `Selection`/`Range` behavior
- Not needed for initial testing setup; add when cursor tests become flaky in happy-dom

**For CI:**
- Single GitHub Actions workflow with jobs: `typecheck` → `lint` → `test` → `build`
- Run on Node.js LTS (currently 22.x) — single version is sufficient for a browser library
- Cache npm dependencies for speed

**For theming:**
- 80% use case: Override `--wn-*` CSS custom properties in consumer's stylesheet
- 20% use case: Full CSS replacement by targeting `.wn-*` class selectors

## Sources

- Context7 `/vitest-dev/vitest` (v4.1.7) — configuration, environment, browser providers (HIGH)
- Context7 `/capricorn86/happy-dom` (v20.9.0) — Vitest integration, GlobalRegistrator (HIGH)
- Context7 `/eslint/eslint` (v10.4.0) — flat config migration, TypeScript config files (HIGH)
- Context7 `/typescript-eslint/typescript-eslint` (v8.59.4) — flat config setup, type-aware rules (HIGH)
- Context7 `/vitejs/vite` (v8.0.14, v7.3.3) — library mode, build configuration (HIGH)
- GitHub: TipTap (ueberdosis/tiptap, 36.9k★) — stack reference: Vitest, ESLint, Prettier, Changesets, pnpm, Playwright (MEDIUM)
- GitHub: Milkdown (Milkdown/milkdown, 11.5k★) — stack reference: Vitest, Prettier, oxlint, oxfmt, Cypress (MEDIUM)
- npm registry — version verification for all recommended packages (HIGH)
- Vite 7 official docs (v7.vite.dev/guide/build) — library mode confirmed uses `rollupOptions`, not rolldown (HIGH)

---

*Stack research for: worldnotes browser Markdown editor library*
*Researched: 2026-05-23*
