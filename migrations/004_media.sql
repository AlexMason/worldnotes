-- Uploaded media (favicon overrides today; editor-inserted images later).
-- Bytes live here, not on disk: the Docker image stays disposable and
-- `pg_dump` covers everything. Served publicly at /media/{id}.
--
-- Guard: 'media' and 'icons' are becoming reserved slug prefixes (see
-- src/shared/slug.ts). If any page already uses one, its URL would be
-- silently shadowed by the new routes — fail loudly at migrate time instead
-- so the operator can rename before booting.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pages WHERE split_part(slug, '/', 1) = ANY (ARRAY['media', 'icons'])
  ) THEN
    RAISE EXCEPTION
      'pages exist under slug prefixes media/ or icons/, which are now reserved '
      'by the media store; rename them (e.g. media/… -> gallery/…) before migrating';
  END IF;
END
$$;

CREATE TABLE media (
  id          BIGSERIAL PRIMARY KEY,
  media_type  TEXT NOT NULL
                CHECK (media_type IN ('image/png', 'image/jpeg', 'image/gif',
                                      'image/webp', 'image/vnd.microsoft.icon')),
  width       INT,
  height      INT,
  size_bytes  BIGINT NOT NULL,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT
);
