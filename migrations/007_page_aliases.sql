-- Former slugs of moved pages (page moves, issue #15). Each alias redirects
-- to the page's CURRENT slug: it points at pages.id, so successive moves
-- never build redirect chains and an older alias follows the page.
--
-- Page slugs and alias slugs are kept disjoint by the repository (creating a
-- page at an alias slug is refused; moving a page onto an alias slug deletes
-- the alias) — there is no cross-table constraint. Deleting a page drops its
-- aliases. Same slug charset CHECK as pages (001_init.sql): aliases are only
-- ever former page slugs.

CREATE TABLE page_aliases (
  slug        TEXT PRIMARY KEY
                CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),
  page_id     BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX page_aliases_page_id_idx ON page_aliases (page_id);
