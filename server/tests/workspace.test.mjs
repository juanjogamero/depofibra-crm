import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyWorkspace, validateWorkspace, WorkspaceInputError,
  loadWorkspace, saveWorkspace
} from '../src/workspace-store.mjs';

const actor = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

test('estado inicial real vacío y sin tarifas ficticias', () => {
  const empty = emptyWorkspace();
  assert.equal(empty.opportunities.length, 0);
  assert.equal(empty.quotes.length, 0);
  assert.equal(empty.orders.length, 0);
  assert.deepEqual(Object.values(empty.transport), [0, 0, 0, 0, 0]);
  const validated = validateWorkspace(empty);
  assert.match(validated.digest, /^[a-f0-9]{64}$/);
});

test('bloquea cargas malformadas, claves inesperadas y contaminación', () => {
  const empty = emptyWorkspace();
  assert.throws(() => validateWorkspace({ ...empty, users: [{ id: 'x' }] }), WorkspaceInputError);
  assert.throws(() => validateWorkspace({ ...empty, opportunities: [null] }), WorkspaceInputError);
  assert.throws(() => validateWorkspace({ ...empty, opportunities: [{ name: 'sin id' }] }), WorkspaceInputError);
  assert.throws(() => validateWorkspace({ ...empty, transport: { ...empty.transport, buffer: -5 } }), WorkspaceInputError);
  assert.throws(() => validateWorkspace(JSON.parse(JSON.stringify(empty).replace(
    '"tasks":[]', '"tasks":[], "__proto__":{"admin":true}'
  ))), WorkspaceInputError);
});

test('lectura sin registro no introduce ejemplos', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  assert.deepEqual(await loadWorkspace(pool), { version: 0, state: emptyWorkspace() });
});

test('inserta revisión inicial y evento en una transacción', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      return sql.includes('RETURNING version') ? { rows: [{ version: '1' }] } : { rows: [] };
    },
    release() { statements.push('RELEASE'); }
  };
  const pool = { connect: async () => client };
  assert.deepEqual(await saveWorkspace(pool, actor, 0, emptyWorkspace()), { version: 1 });
  assert.equal(statements[0], 'BEGIN');
  assert.ok(statements.some(sql => sql.includes('business_workspace_events')));
  assert.ok(statements.includes('COMMIT'));
  assert.equal(statements.at(-1), 'RELEASE');
});

test('conflicto de revisión hace rollback y no sobrescribe', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      return { rows: [] };
    },
    release() { statements.push('RELEASE'); }
  };
  const pool = { connect: async () => client };
  assert.deepEqual(await saveWorkspace(pool, actor, 4, emptyWorkspace()), { error: 'conflicto_version' });
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.some(sql => sql.includes('business_workspace_events')));
  assert.ok(!statements.includes('COMMIT'));
});

test('rechaza versión inválida sin tocar base de datos', async () => {
  let connected = false;
  const pool = { connect: async () => { connected = true; throw Error('no se debe llamar'); } };
  await assert.rejects(saveWorkspace(pool, actor, -1, emptyWorkspace()), WorkspaceInputError);
  assert.equal(connected, false);
});
