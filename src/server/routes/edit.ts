// ─── Edit SPA shell + static client assets ──────────────────────────────────
// Authenticated users get the editor shell at /edit/{slug}; anonymous users
// are redirected to the SSR read view (or its 404 create page).

import type { FastifyInstance } from 'fastify'
import { validateSlug } from '../../shared/slug'
import { escapeHtml } from '../render/layout'
import { pageUrlPath } from '../../shared/url-helpers'

export interface EditShellDeps {
  /** Absolute prefix the client bundle is served under, e.g. '/assets'. */
  assetPrefix: string
}

export function editShellHtml(slug: string, assetPrefix: string, autosaveMs: number): string {
  const config = { slug, autosaveMs }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Edit — ${escapeHtml(slug)}</title>
<link rel="icon" href="data:,">
</head>
<body>
<div id="wn-app"></div>
<script id="wn-config" type="application/json">${JSON.stringify(JSON.stringify(config))}</script>
<script src="${escapeHtml(assetPrefix)}/client.js" type="module"></script>
</body>
</html>`
}

export async function registerEditRoutes(
  app: FastifyInstance,
  deps: EditShellDeps & { autosaveMs: number },
): Promise<void> {
  app.get('/edit', async (req, reply) => reply.redirect('/edit/home', 302))

  app.get('/edit/*', async (req, reply) => {
    const raw = (req.params as { '*': string })['*']
    const validated = validateSlug(raw)
    if (!req.user) {
      // anonymous: reading view handles missing pages (create overlay)
      return reply.redirect(validated.ok ? pageUrlPath(validated.slug) : '/', 302)
    }
    if (!validated.ok) {
      return reply
        .code(404)
        .header('content-type', 'text/html; charset=utf-8')
        .send('<!doctype html><title>Not found</title><h1>Not a valid page path</h1>')
    }
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(editShellHtml(validated.slug, deps.assetPrefix, deps.autosaveMs))
  })
}
