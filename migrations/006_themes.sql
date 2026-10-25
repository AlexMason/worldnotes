-- Admin-authored themes: named raw CSS stylesheets, appended after the default
-- stylesheet on the reader and the editor. Exactly one theme (or none) is
-- active, tracked by the `active_theme_id` row in `settings`; that pointer is
-- deliberately NOT a foreign key (settings is a free-form key/value table) —
-- the API refuses to delete the active theme and the read path degrades a
-- dangling pointer to the default look.
--
-- SECURITY: `css` is admin-trusted and emitted verbatim into an inline
-- <style>; the size cap and `</style` rejection are enforced in
-- src/server/themes.ts (the only writer). The CHECKs here are a backstop for
-- the cap/emptiness invariants, not the primary validation.

CREATE TABLE themes (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE CHECK (name <> ''),
  description  TEXT NOT NULL DEFAULT '',
  css          TEXT NOT NULL CHECK (char_length(css) <= 65536),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT
);
