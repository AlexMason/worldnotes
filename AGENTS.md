# Agent Instructions

## Project Overview

`worldnotes` is a self-hosted markdown wiki server (TypeScript, Fastify,
PostgreSQL): anonymous visitors get cached server-rendered HTML at `/{slug}`;
OIDC-authenticated users get an inline markdown editor at `/edit/{slug}` with
debounced autosave and If-Match conflict handling. Multiplayer/Yjs and npm
library packaging were removed in the server pivot — the editor lives in
`src/core/`, the client bootstrap in `src/client/`, the Fastify app in
`src/server/`, and env-agnostic code shared between them in `src/shared/`.
Docs: `docs/` (start with `architecture.md`); full pivot decisions in
`.pi/docs/plans/worldnotes-server-pivot.md`.

## Development Commands

Run these checks before reporting behavior changes as complete:

| Command | What it does |
|---------|-------------|
| `npm test` | Run all tests with Vitest (dom + node projects, single run) |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run test:coverage` | Run tests with v8 coverage report (threshold: 80% branches) |
| `npm run typecheck` | tsc across core/client/server configs (`tsconfig.*.json`) |
| `npm run lint` | ESLint static analysis on `src/` (errors fail, warnings allowed) |
| `npm run lint:fix` | Auto-fix ESLint errors where possible |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Check if source files match Prettier config (CI-friendly) |
| `npm run build` | Type-check then bundle edit client → `dist/client/` |
| `npm run dev` | Server with hot reload via `tsx watch` (needs Postgres) |
| `npm run dev:client` | Client bundle in watch mode |
| `npm start` | Run the server (`tsx src/server/index.ts`) |

**CI Pipeline:** Every push to `main` and every pull request triggers GitHub
Actions which runs: `typecheck → lint → test:coverage → build` against a
Postgres service container (`WN_TEST_PG_URL` enables the pg integration suite).
All steps must pass.

**Test infrastructure:**
- Framework: Vitest 4 with two projects — `dom` (happy-dom; core/client) and
  `node` (server/shared)
- Coverage: v8 provider, 80% branch/function/line/statement thresholds;
  server modules are covered, only bootstraps/type-only files excluded
- Tests are co-located: `src/<area>/__tests__/*.test.ts`

## Editing Guidelines

- Keep changes small and focused.
- `src/shared/` must stay environment-agnostic (no DOM, no Node APIs);
  `src/server/**` may import DOM-free parts of `src/core` (guarded by the
  node smoke test).
- The read path must never emit edit-preview HTML: viewer rendering is
  `src/server/render/markdown.ts`; the core plugin `renderToHTML` stays
  edit-surface-only.
- Slug policy lives in `src/shared/slug.ts` — change it, the DB `CHECK` in
  `migrations/001_init.sql`, and both route/SSR layers together.
- Update `docs/api.md` when HTTP APIs or env configuration change;
  `docs/architecture.md` when module responsibilities or request flow change;
  `docs/theming.md` when editor `--wn-*` tokens or viewer CSS change.
- Do not commit `node_modules/`, `dist/`, `.env`, logs, or caches.

## Repository Notes

`dist/` holds the built edit client bundle and is not committed. The server
runs TypeScript directly via `tsx`; there is no server build artifact.

## Local Validation

The CI pipeline needs a GitHub remote to run. Until then validate locally
(with Postgres reachable for the integration suite):
```bash
npm run typecheck && npm run lint && WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm run test:coverage && npm run build
```
