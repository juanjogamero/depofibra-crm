-- 004: almacenamiento persistente transaccional de la interfaz original.
-- SOLO depofibra_crm_v2; no modificar depofibra_crm ni datos del CRM v1.
-- El modelo es una primera base operativa (un único espacio de trabajo);
-- reemplazaremos grupos por entidades relacionales sin perder la información.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'depofibra_crm_v2'
     OR to_regclass('crm.users') IS NULL
     OR to_regclass('crm.business_workspace') IS NOT NULL
  THEN
    RAISE EXCEPTION 'Migracion 004 detenida: esquema/base inesperados';
  END IF;
END $$;
SET LOCAL ROLE depofibra_v2_owner;

CREATE TABLE crm.business_workspace (
  workspace_id smallint PRIMARY KEY CHECK (workspace_id = 1),
  version bigint NOT NULL CHECK (version >= 1),
  state jsonb NOT NULL CHECK (
    jsonb_typeof(state) = 'object'
    AND jsonb_typeof(state->'opportunities') = 'array'
    AND jsonb_typeof(state->'quotes') = 'array'
    AND jsonb_typeof(state->'customers') = 'array'
    AND jsonb_typeof(state->'orders') = 'array'
    AND jsonb_typeof(state->'tasks') = 'array'
    AND jsonb_typeof(state->'products') = 'array'
    AND jsonb_typeof(state->'transport') = 'object'
    AND octet_length(state::text) <= 1048576
  ),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES crm.users(id)
);

CREATE TABLE crm.business_workspace_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id smallint NOT NULL DEFAULT 1 CHECK (workspace_id = 1),
  actor_id uuid NOT NULL REFERENCES crm.users(id),
  prior_version bigint NOT NULL CHECK (prior_version >= 0),
  new_version bigint NOT NULL CHECK (new_version = prior_version + 1),
  at timestamptz NOT NULL DEFAULT now(),
  state_sha256 char(64) NOT NULL CHECK (state_sha256 ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX business_workspace_event_version_idx
  ON crm.business_workspace_events (workspace_id, new_version);

REVOKE ALL ON crm.business_workspace,crm.business_workspace_events FROM PUBLIC;
GRANT SELECT,INSERT ON crm.business_workspace TO depofibra_v2_api;
GRANT UPDATE(version,state,updated_at,updated_by)
  ON crm.business_workspace TO depofibra_v2_api;
GRANT SELECT,INSERT ON crm.business_workspace_events TO depofibra_v2_api;
GRANT USAGE ON SEQUENCE crm.business_workspace_events_event_id_seq TO depofibra_v2_api;
COMMIT;
