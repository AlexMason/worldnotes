-- User identities and roles. Rows are provisioned automatically on first
-- authentication (see src/server/auth/roles.ts and /oidc/callback): the role
-- is 'admin' when the sub is on BOOTSTRAP_ADMIN_SUBS or the table is still
-- empty (first login = admin), and DEFAULT_ROLE otherwise.
--
-- SECURITY: deleting a row is NOT a revocation mechanism — the account is
-- re-provisioned at the default role on its next request. Revoke access by
-- demoting to 'viewer' (or deprovision at the IdP). `updated_at`/`updated_by`
-- track the last ROLE CHANGE only (logins refresh last_login_at instead).

CREATE TABLE users (
  sub           TEXT PRIMARY KEY,
  email         TEXT,
  name          TEXT,
  role          TEXT NOT NULL
                  CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    TEXT
);

-- Serves the admin-count guard in setRoleGuarded.
CREATE INDEX users_role_idx ON users (role);
