-- Instance-wide settings (key/value), editable from the admin area.
-- Keys today: `search_enabled` ("true"|"false"), `home_slug`, `nav_slug`
-- ("" = unset for both), `all_pages_enabled`, `site_name`, `header_html`,
-- `footer_html`, `favicon_media_id`.

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);
