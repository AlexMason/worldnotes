// ─── Wire formats shared by client and server ────────────────────────────────

import type { Role } from './roles'

export interface PageDto {
  slug: string
  title: string
  content: string
  version: number
  updatedAt: number
  updatedBy: string | null
}

export interface PageListItemDto {
  slug: string
  title: string
  updatedAt: number
}

export interface MeDto {
  sub: string
  email?: string
  name?: string
}

export interface ApiError {
  error: string
  /** Present on 409: the server-side version to reconcile against. */
  current?: { version: number; updatedAt?: number }
}

/**
 * One site-nav link extracted from the configured nav page (server parses it
 * in `render/nav.ts`; the editor shell embeds the current set per render).
 * `slug` is the resolved page slug so the SPA can navigate without parsing
 * the href; `href` is the plain reader URL.
 */
export interface NavLink {
  slug: string
  href: string
  label: string
}

/**
 * Shape of the JSON embedded in `<script id="wn-config">` by the editor
 * shell — the single source of truth for the server writer
 * (`render/editor-shell.ts`) and the client reader (`client/main.ts`).
 */
export interface EditorShellConfig {
  slug: string
  autosaveMs: number
  searchEnabled: boolean
  allPagesEnabled: boolean
  /** Configured home page slug (breadcrumb trail root); null = 'home'. */
  homeSlug: string | null
  /** Site branding: document.title suffix + breadcrumb root label. */
  siteName: string
  /** Nav links from the configured nav page (optional for shell-config
   *  fallback compatibility with older embedded configs). */
  navLinks?: NavLink[]
  /** Raw admin-trusted HTML bands, injected around the content column. */
  headerHtml: string
  footerHtml: string
  userName: string | null
  authDisabled: boolean
  /** Viewer/editor/admin role of the session (optional for embedded-config
   *  compatibility; ABSENT = least privilege — e.g. no Admin link). The
   *  server always writes the real role; authDisabled sends 'admin'. */
  userRole?: Role
}
