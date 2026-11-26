-- Requiere que el administrador haya creado antes el rol LOGIN
-- depofibra_v2_api con contraseña privada. No crea contraseñas.
-- Ejecutar SOLO en la BD nueva depofibra_crm_v2 como postgres.
BEGIN;
GRANT CONNECT ON DATABASE depofibra_crm_v2 TO depofibra_v2_api;
GRANT USAGE ON SCHEMA crm TO depofibra_v2_api;
GRANT SELECT ON crm.users, crm.sessions TO depofibra_v2_api;
GRANT UPDATE (failed_attempts, locked_until, last_login_at)
  ON crm.users TO depofibra_v2_api;
GRANT INSERT ON crm.sessions TO depofibra_v2_api;
GRANT UPDATE (revoked_at) ON crm.sessions TO depofibra_v2_api;
GRANT INSERT ON crm.audit TO depofibra_v2_api;
GRANT USAGE ON SEQUENCE crm.audit_id_seq TO depofibra_v2_api;
COMMIT;
