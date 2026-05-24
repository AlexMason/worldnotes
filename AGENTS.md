# Agent Instructions

## Project Overview

`worldnotes` is a TypeScript browser library for an extensible inline Markdown editor with wiki-style page navigation. The public API is exported from `src/index.ts`; source files live under `src/`, tests under `test/`, documentation under `docs/`, and generated package output under `dist/`.

## Development Commands

Run these checks before reporting behavior changes as complete:

```bash
npm run typecheck
npm test
npm run build
```

Use `npm run dev` to start the Vite demo during local development.

## Editing Guidelines

- Keep changes small and focused.
- Preserve the plugin contract defined in `src/types.ts`.
- Update `docs/api.md` when exported APIs, options, plugins, or storage adapters change.
- Update `docs/architecture.md` when module responsibilities or the editor pipeline change.
- Prefer TypeScript types from the public interfaces instead of introducing parallel shapes.
- Do not commit `node_modules/`, local environment files, logs, or test/build caches.

## Repository Notes

This repository intentionally commits `dist/` because the package manifest points consumers at built files. If build output changes as part of a source change, review and commit the generated files with the source change.
