# Technology Stack

**Analysis Date:** 2026-05-23

## Languages

**Primary:**
- TypeScript 5.9.3 (compiled to ES2020) — entire codebase under `src/`

**No secondary languages.**

## Runtime

**Environment:**
- Browser only (no Node.js server, no SSR)
- Relies on DOM APIs: `contentEditable`, `window.getSelection()`, `document.createRange()`, `MutationObserver`, `localStorage`, `IndexedDB`, `URL`/`URLSearchParams`

**Package Manager:**
- npm (no alternative lockfile detected)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- None — vanilla TypeScript with no runtime framework. The library is zero-dependency at runtime (see `vite.config.ts` line 18–20: `external: []`).

**Testing:**
- `node:assert/strict` (built-in Node.js assertion) — no test framework dependency
- Test files (`.mjs`) transpile TypeScript source at test time using the `typescript` dev dependency via `ts.transpileModule()`

**Build/Dev:**
- Vite 5.4.21 — library-mode bundler (`vite.config.ts`)
- TypeScript 5.9.3 — type-checking (`tsc --noEmit`) and declaration emit (`tsc`)
- `vite-plugin-dts` 3.9.1 — consolidated `.d.ts` bundle entry point

## Key Dependencies

**Runtime (zero dependencies):**
- No packages in `dependencies`. The library is fully self-contained.

**Dev-only:**
- `typescript` ^5.4.0 — type-checking, declaration generation, and test-time transpilation
- `vite` ^5.2.0 — dev server (`npm run dev`) and library build
- `vite-plugin-dts` ^3.9.0 — generates `dist/index.d.ts` as the types entry point

## Configuration

**TypeScript:** `tsconfig.json`
- Target: `ES2020`
- Module: `ESNext` with `bundler` module resolution
- Strict mode enabled
- Declaration files emitted to `dist/`
- Source root: `src/`

**Build:** `vite.config.ts`
- Library mode with entry `src/index.ts`
- Global name: `WorldNotes`
- Output: `dist/worldnotes.js` (ESM) + `dist/worldnotes.umd.cjs` (UMD)
- No externals — fully self-contained bundle

**Package:** `package.json`
- `"type": "module"` — ESM by default
- `"main"`: `./dist/worldnotes.umd.cjs` (CommonJS require)
- `"module"`: `./dist/worldnotes.js` (ESM import)
- `"types"`: `./dist/index.d.ts`
- `"files"`: `["dist"]` — only the build output is published

## Platform Requirements

**Development:**
- Node.js (for npm/Vite/TypeScript toolchain)
- Any modern browser for the Vite dev server demo

**Production:**
- Any browser supporting ES2020 and the DOM APIs listed above
- No polyfills required; no server-side component

---

*Stack analysis: 2026-05-23*
