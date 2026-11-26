-- 003. Solo ejecutar en la nueva base depofibra_crm_v2.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'depofibra_crm_v2'
    OR to_regclass('crm.users') IS NULL
    OR to_regclass('crm.opportunities') IS NOT NULL
  THEN
    RAISE EXCEPTION 'Migración detenida: esquema inesperado o base incorrecta';
  END IF;
END
$$;
SET LOCAL ROLE depofibra_v2_owner;
CREATE TABLE crm.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  channel text NOT NULL CHECK (channel IN ('Web','WhatsApp','Wallapop',
    'Facebook Marketplace','Facebook','Instagram','Teléfono',
    'Correo electrónico','Recomendación','Otro')),
  contact text NOT NULL DEFAULT '' CHECK (length(contact) <= 300),
  alias text NOT NULL DEFAULT '' CHECK (length(alias) <= 160),
  conversation text NOT NULL DEFAULT '' CHECK (length(conversation) <= 4000),
  product text NOT NULL DEFAULT '' CHECK (length(product) <= 200),
  capacity text NOT NULL DEFAULT '' CHECK (length(capacity) <= 100),
  destination text NOT NULL DEFAULT '' CHECK (length(destination) <= 200),
  status text NOT NULL DEFAULT 'Nueva'
    CHECK (status IN ('Nueva','Cualificación','Por presupuestar','Seguimiento','Perdida')),
  next_action text NOT NULL DEFAULT '' CHECK (length(next_action) <= 300),
  next_date date,
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 4000),
  lost_reason text NOT NULL DEFAULT '' CHECK (length(lost_reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES crm.users(id),
  updated_by uuid NOT NULL REFERENCES crm.users(id),
  CHECK (status = 'Perdida' OR lost_reason = '')
);
CREATE INDEX opportunities_recent_idx
  ON crm.opportunities(created_at DESC,id) WHERE deleted_at IS NULL;
CREATE INDEX opportunities_followup_idx
  ON crm.opportunities(next_date) WHERE deleted_at IS NULL AND next_date IS NOT NULL;
CREATE TABLE crm.opportunity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES crm.opportunities(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES crm.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created','updated')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  previous_version integer,
  new_version integer NOT NULL CHECK (new_version > 0)
);
CREATE INDEX opportunity_events_by_opportunity
  ON crm.opportunity_events(opportunity_id,occurred_at DESC);
REVOKE ALL ON crm.opportunities,crm.opportunity_events FROM PUBLIC;
GRANT SELECT, INSERT ON crm.opportunities TO depofibra_v2_api;
GRANT UPDATE(name,channel,contact,alias,conversation,product,capacity,destination,
  status,next_action,next_date,message,lost_reason,updated_at,version,updated_by)
  ON crm.opportunities TO depofibra_v2_api;
GRANT SELECT,INSERT ON crm.opportunity_events TO depofibra_v2_api;
GRANT USAGE ON SEQUENCE crm.opportunity_events_id_seq TO depofibra_v2_api;
COMMIT;
