-- WorldNotes initial schema
CREATE TABLE pages (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE
                CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  version     BIGINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

CREATE INDEX pages_updated_at_idx ON pages (updated_at DESC);

INSERT INTO pages (slug, title, content) VALUES (
  'home',
  'Home',
  '# Welcome to WorldNotes\n\nStart writing. Use [[page name]] to link into new pages — missing pages offer a create flow.\n\n**Bold**, *italic*, ~~strike~~, `code`, lists, and nested [[blog/first-post|posts]] all render for readers.\n'
) ON CONFLICT (slug) DO NOTHING;
