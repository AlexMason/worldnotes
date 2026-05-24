# Agent Instructions

## Project Overview

`worldnotes` is a TypeScript browser library for an extensible inline Markdown editor with wiki-style page navigation. The public API is exported from `src/index.ts`; source files live under `src/`, tests under `src/__tests__/`, documentation under `docs/`, and generated package output under `dist/`.

## Development Commands

Run these checks before reporting behavior changes as complete:

| Command | What it does |
|---------|-------------|
| `npm test` | Run all tests with Vitest (single run) |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run test:coverage` | Run tests with v8 coverage report (threshold: 80% branches) |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | ESLint static analysis on `src/` (errors fail, warnings allowed) |
| `npm run lint:fix` | Auto-fix ESLint errors where possible |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Check if source files match Prettier config (CI-friendly) |
| `npm run build` | Type-check then bundle library (tsc + vite build) |
| `npm run dev` | Start Vite dev server for the demo page |

**CI Pipeline:** Every push to `main` and every pull request triggers GitHub Actions
which runs: `typecheck → lint → test:coverage → build`. All steps must pass.

**Test Infrastructure:**
- Framework: Vitest 4 with happy-dom browser environment
- Coverage: v8 provider, 80% branch/function/line/statement thresholds
- Test location: `src/__tests__/*.test.ts` (co-located with source modules)

## Editing Guidelines

- Keep changes small and focused.
- Preserve the plugin contract defined in `src/types.ts`.
- Update `docs/api.md` when exported APIs, options, plugins, or storage adapters change.
- Update `docs/architecture.md` when module responsibilities or the editor pipeline change.
- Prefer TypeScript types from the public interfaces instead of introducing parallel shapes.
- Do not commit `node_modules/`, local environment files, logs, or test/build caches.

## Repository Notes

This repository intentionally commits `dist/` because the package manifest points consumers at built files. If build output changes as part of a source change, review and commit the generated files with the source change.

## CI Setup Note

The CI pipeline (`.github/workflows/ci.yml`) is configured but requires a GitHub remote
to execute. Push this repository to GitHub to activate CI. Until then, validate locally:
```bash
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```
