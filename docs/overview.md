# WorldNotes — Project Overview

**What it is.** A self-hosted, single-binary-style markdown wiki: PostgreSQL
for storage, generic OIDC for auth, Fastify for serving. Anonymous visitors
read fast cached server-rendered HTML rendered by the same engine as the
editor; logged-in users edit with an inline
WYSIWYG markdown editor that autosaves with conflict detection. Pages nest by
slug (`/blog/post-name`) and wiki links (`[[Page]]`) are real URLs with a
create-on-missing flow.

**History.** WorldNotes began as an extensible client-side collaborative editor
library (Yjs CRDT sync, pluggable storage backends, npm packaging). It pivoted
to this server application: multiplayer, the library surface, and browser
storage adapters were removed; the editor survives as the authenticated edit
surface of the app. The full decision record lives in
`.pi/docs/plans/worldnotes-server-pivot.md`.

**Core invariants.**

1. Readers never execute author markup: source-based rendering escapes every
   text and attribute position, scheme-allowlisted hrefs (unsafe targets stay
   literal).
2. Editors never lose work silently: versioned writes (`If-Match`/409) with an
   explicit conflict choice.
3. URLs are content: slug = address; no query strings, `/p/` prefixes, or
   `?path=` trails.
4. One grammar, one renderer: the server read path and the browser editor
   share the single `src/core` engine (tokenizer + block pass + content
   plugins); the reader is the editor, read-only. Grammar changes happen
   only in `src/core/plugins/` and the declarative `BlockDef` layer
   (`src/core/document.ts`).

**Non-goals.** Multi-user simultaneous editing, revision history, horizontal
scale-out (single process), npm library distribution, email/password auth,
per-user ACLs.

**Status.** Feature-complete for v1 of the server pivot (Phase 1). Future
directions: shared cache/locks for multi-instance, image/binary attachments,
import from the old zip exports, RP-initiated provider logout wiring, viewer
search highlighting.
