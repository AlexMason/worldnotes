// ─── PWA chrome: head tags, web app manifest, service worker ─────────────────
// Single source for everything that makes the site installable, emitted in
// BOTH the reader layout and the editor shell head (like render/icons.ts).
//
// Design constraints:
// - The same URL serves different HTML per role (editor vs reader) and
//   login-only mode gates anonymous reads, so the service worker NEVER caches
//   page, API or media bytes. It only answers a failed navigation with a
//   static offline document — a stale editor shell after sign-out, or gated
//   content surviving a logout, are impossible by construction.
// - /manifest.webmanifest and /sw.js are explicit root routes (routes/pwa.ts):
//   a root-scoped worker and manifest are required for the whole site to be
//   in scope, and neither name is a valid slug (no dots), so the SSR
//   catch-all would otherwise 404 them.
// - Manifest icons are the bundled set. An uploaded favicon override only
//   changes <link rel="icon|apple-touch-icon"> (iOS home-screen icon follows
//   it); Android installs keep the bundled icons — the override's format and
//   dimensions are unknowable on the sync render path.

export const MANIFEST_PATH = '/manifest.webmanifest'
export const SERVICE_WORKER_PATH = '/sw.js'

/** Match the editor palette's page background (light / dark). */
const THEME_LIGHT = '#fbfaf7'
const THEME_DARK = '#191816'

/** `<head>` tags: manifest link + browser chrome colour. */
export function pwaTagsHtml(): string {
  return (
    `<link rel="manifest" href="${MANIFEST_PATH}">\n` +
    `<meta name="theme-color" content="${THEME_LIGHT}" media="(prefers-color-scheme: light)">\n` +
    `<meta name="theme-color" content="${THEME_DARK}" media="(prefers-color-scheme: dark)">\n` +
    '<meta name="apple-mobile-web-app-capable" content="yes">'
  )
}

/** Inline body script registering the worker (inline: the reader is zero-JS
 *  otherwise, and the editor bundle is not loaded on read surfaces). */
export const SW_REGISTER_SCRIPT = `if('serviceWorker'in navigator)addEventListener('load',function(){navigator.serviceWorker.register('${SERVICE_WORKER_PATH}').catch(function(){})})`

export function buildManifest(siteName: string): Record<string, unknown> {
  return {
    id: '/',
    name: siteName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: THEME_LIGHT,
    background_color: THEME_LIGHT,
    icons: [
      { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

const OFFLINE_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Offline</title><style>' +
  `body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
  `font:16px/1.5 system-ui,sans-serif;background:${THEME_LIGHT};color:#23211d;text-align:center;padding:1rem}` +
  `@media(prefers-color-scheme:dark){body{background:${THEME_DARK};color:#dcd7cd}}` +
  'button{font:inherit;padding:.4rem 1rem;margin-top:1rem}' +
  '</style></head><body><main><h1>You\u2019re offline</h1>' +
  '<p>This page needs a connection. Nothing is cached on this device.</p>' +
  '<button onclick="location.reload()">Retry</button></main></body></html>'

/** Network-only worker with an offline fallback for navigations. No Cache
 *  API use — see the design note above. */
export const SERVICE_WORKER_JS = `const OFFLINE=${JSON.stringify(OFFLINE_HTML)}
self.addEventListener('install',()=>self.skipWaiting())
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()))
self.addEventListener('fetch',e=>{
  if(e.request.mode!=='navigate')return
  e.respondWith(fetch(e.request).catch(()=>new Response(OFFLINE,{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})))
})
`
