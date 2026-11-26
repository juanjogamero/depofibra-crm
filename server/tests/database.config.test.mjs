import test from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../src/database.mjs';

test('API usa únicamente socket local y base CRM nueva por defecto', async () => {
  const store = new Database();
  try {
    assert.equal(store.pool.options.host, '/var/run/postgresql');
    assert.equal(store.pool.options.database, 'depofibra_crm_v2');
    assert.equal(store.pool.options.user, 'depofibra_v2_api');
    assert.equal(store.pool.options.password, null);
  } finally { await store.close(); }
});

test('La API rechaza DSN explícito salvo configuración exclusiva de CI', () => {
  const prevMode=process.env.NODE_ENV;
  const prevFlag=process.env.CRM_INTEGRATION_TEST;
  try {
    process.env.NODE_ENV='production';
    delete process.env.CRM_INTEGRATION_TEST;
    assert.throws(() => new Database({
      testConnectionString:'postgresql://depofibra_v2_api:secret@127.0.0.1/depofibra_crm_v2'
    }), /Solo las pruebas CI/);
  } finally {
    if (prevMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV=prevMode;
    if (prevFlag === undefined) delete process.env.CRM_INTEGRATION_TEST;
    else process.env.CRM_INTEGRATION_TEST=prevFlag;
  }
});
