# WorldNotes

A self-hosted markdown wiki with wiki-style navigation.

- **Anonymous visitors** get fast, cached, **server-rendered semantic HTML** — no
  JavaScript required for reading.
- **Authenticated users** (any OIDC provider) get an **inline WYSIWYG markdown
  editor** that autosaves as you type, with conflict detection.
- Pages live at **nested slugs**: `/blog`, `/blog/post-name`. Wiki links
  (`[[Some Page]]`) resolve to real URLs; missing pages offer a **create** flow.
- Content is stored in **PostgreSQL**. Single process; no external cache needed.

> WorldNotes was previously published as a client-side collaborative editor
> library. The project pivoted to this server model: multiplayer/Yjs was
> removed, packaging stopped, and the editor now ships as the app's authenticated
> edit surface. See `docs/architecture.md`.

## Quick start (development)

```bash
npm install

# 1. Start Postgres
docker run --rm --name wn-db -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_DB=worldnotes -p 5432:5432 -d postgres:16

# 2. Build the client bundle (also: npm run dev:client for watch mode)
npm run build

# 3. Run the server with auth bypassed (a fake editor identity is injected)
AUTH_DISABLED=1 NODE_ENV=development \
  DATABASE_URL=postgres://postgres@localhost:5432/worldnotes \
  npm run dev
```

Open <http://localhost:3000>. Migrations (including a seeded `home` page) run
automatically at boot. Edit at `/edit/home` — changes autosave.

## Configuration

Copy `.env.example` and set the values; every knob is an environment variable,
validated at boot (`src/server/config.ts`).

| Variable | Meaning |
|---|---|
| `PORT`, `HOST` | Listen address (default `3000`, `0.0.0.0`) |
| `DATABASE_URL` | Postgres connection string |
| `OIDC_ISSUER` | Provider issuer URL (`.well-known` discovery) |
| `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | Registered client credentials |
| `OIDC_REDIRECT_URL` | `<your-host>/oidc/callback`, registered at the provider |
| `SESSION_SECRETS` | Comma-separated AES keys (each ≥ 32 chars); first key seals, all keys open → rotation |
| `SESSION_MAX_AGE_SECONDS` | Session lifetime (default 8 h) |
| `OIDC_CLOCK_TOLERANCE_SECONDS` | Skew tolerated when validating id_token timestamps (default 30, max 120) |
| `LOG_LEVEL` | Server request logging: `fatal..trace` or `silent` (default `info`) |
| `CACHE_MAX_ENTRIES` / `CACHE_TTL_SECONDS` | Bounded SSR render cache |
| `AUTOSAVE_DEBOUNCE_MS` | Editor idle time before a save PUT (default 1500) |
| `AUTH_DISABLED=1` | **Development only** — fake editor user; refused when `NODE_ENV=production` |

Auth model: **any account the OIDC provider lets in may edit.** Gate who can
obtain an account at the provider (or a reverse-proxy layer) to restrict
writing.

## Deployment (Docker)

```bash
docker compose up --build -d
```

`docker-compose.yml` runs the app plus Postgres; required env vars come from
your shell or an `.env` file (`SESSION_SECRETS` and the `OIDC_*` values are
mandatory — generate a secret with `openssl rand -hex 32`).

Sessions are stored in an encrypted cookie and the render cache is in-process,
so run **one app instance**. Multiple instances behind a load balancer will
serve slightly stale reads within the cache TTL — acceptable, but a shared
cache (Redis) is the natural next step if you scale.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Vitest (dom + node projects) |
| `npm run test:coverage` | Tests with 80 % thresholds |
| `npm run typecheck` | tsc across core / client / server configs |
| `npm run lint` | ESLint |
| `npm run build` | typecheck + client bundle → `dist/client/` |
| `npm run dev` | server with hot reload (`tsx watch`) |
| `npm run dev:client` | client bundle watch mode |

Postgres-backed integration tests run when `WN_TEST_PG_URL` points at a
reachable database (CI provides a service container).
