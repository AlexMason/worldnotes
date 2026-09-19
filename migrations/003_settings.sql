-- Instance-wide settings (key/value), editable from the admin area.
-- Keys today: `search_enabled` ("true"|"false"), `home_slug` ("" = unset).

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);
