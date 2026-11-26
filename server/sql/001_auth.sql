-- Ejecutar SOLO en la BD nueva depofibra_crm_v2 como postgres local.
-- No ejecutar en la BD heredada depofibra_crm. Base sin tablas al inicio.
BEGIN;
SET LOCAL ROLE depofibra_v2_owner;
CREATE SCHEMA crm AUTHORIZATION depofibra_v2_owner;
REVOKE ALL ON SCHEMA crm FROM PUBLIC;

CREATE TABLE crm.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_.-]{3,64}$'),
  password_hash text NOT NULL CHECK (length(password_hash) BETWEEN 60 AND 300),
  role text NOT NULL CHECK (role IN ('direccion','oficina')),
  active boolean NOT NULL DEFAULT true,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE crm.sessions (
  token_hash char(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES crm.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_active_user_idx ON crm.sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;
CREATE TABLE crm.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES crm.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('login_ok','login_fail','logout')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
COMMIT;
