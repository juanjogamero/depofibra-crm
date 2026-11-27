import { createHash } from 'node:crypto';

export const COLLECTIONS = Object.freeze([
  'opportunities', 'quotes', 'customers', 'orders', 'tasks', 'products'
]);
export const OPTIONAL_COLLECTIONS = Object.freeze([
  'productCategories', 'commissionPayments', 'orderAlerts', 'internalNotes'
]);

// Cero operaciones inventadas. La tarifa de transporte comienza sin configurar.
export function emptyWorkspace() {
  return {
    opportunities: [], quotes: [], customers: [], orders: [],
    tasks: [], products: [], productCategories: [], commissionPayments: [],
    orderAlerts: [], internalNotes: [],
    transport: { smallRate: 0, largeRate: 0, buffer: 0, distanceLimit: 0, specialExtra: 0 }
  };
}

export class WorkspaceInputError extends Error {
  constructor(message = 'estado_invalido') { super(message); this.status = 400; }
}
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const allowed = new Set([...COLLECTIONS, ...OPTIONAL_COLLECTIONS, 'transport']);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

function scan(value, depth = 0) {
  if (depth > 16) throw new WorkspaceInputError();
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (value.length > 16000) throw new WorkspaceInputError();
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new WorkspaceInputError();
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 10000) throw new WorkspaceInputError();
    for (const element of value) scan(element, depth + 1);
    return;
  }
  if (!isObject(value)) throw new WorkspaceInputError();
  const keys = Object.keys(value);
  if (keys.length > 120 || keys.some(key => key.length > 120 || forbidden.has(key))) {
    throw new WorkspaceInputError();
  }
  for (const key of keys) scan(value[key], depth + 1);
}

export function validateWorkspace(input) {
  if (!isObject(input) || Object.keys(input).some(key => !allowed.has(key))) {
    throw new WorkspaceInputError();
  }
  for (const key of COLLECTIONS) {
    if (!Array.isArray(input[key]) || input[key].length > 10000
      || input[key].some(value => !isObject(value)
        || typeof value.id !== 'string' || !value.id || value.id.length > 120)) {
      throw new WorkspaceInputError();
    }
  }
  for (const key of OPTIONAL_COLLECTIONS) {
    if (input[key] !== undefined
      && (!Array.isArray(input[key]) || input[key].some(value => !isObject(value)))) {
      throw new WorkspaceInputError();
    }
  }
  if (!isObject(input.transport)
    || ['smallRate','largeRate','buffer','distanceLimit','specialExtra']
      .some(key => !Number.isFinite(input.transport[key]) || input.transport[key] < 0)) {
    throw new WorkspaceInputError();
  }
  scan(input);
  const serialized = JSON.stringify(input);
  if (Buffer.byteLength(serialized, 'utf8') > 1024 * 1024 - 2048) {
    throw new WorkspaceInputError('estado_demasiado_grande');
  }
  return { state: input, serialized,
    digest: createHash('sha256').update(serialized).digest('hex') };
}

export async function loadWorkspace(pool) {
  const result = await pool.query(
    'SELECT version,state FROM crm.business_workspace WHERE workspace_id=1'
  );
  if (!result.rows[0]) return { version: 0, state: emptyWorkspace() };
  const version = Number(result.rows[0].version);
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('versión de estado inválida');
  return { version, state: result.rows[0].state };
}

export async function saveWorkspace(pool, actorId, expectedVersion, input) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(actorId || '')
      || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new WorkspaceInputError();
  }
  const { serialized, digest } = validateWorkspace(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = expectedVersion === 0
      ? await client.query(
          `INSERT INTO crm.business_workspace(workspace_id,version,state,updated_by)
           VALUES(1,1,$1::jsonb,$2) ON CONFLICT (workspace_id) DO NOTHING
           RETURNING version`, [serialized, actorId]
        )
      : await client.query(
          `UPDATE crm.business_workspace
              SET state=$1::jsonb,version=version+1,updated_by=$2,updated_at=now()
            WHERE workspace_id=1 AND version=$3 RETURNING version`,
          [serialized, actorId, expectedVersion]
        );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return { error: 'conflicto_version' };
    }
    const version = Number(result.rows[0].version);
    await client.query(
      `INSERT INTO crm.business_workspace_events
         (actor_id,prior_version,new_version,state_sha256)
       VALUES($1,$2,$3,$4)`, [actorId, expectedVersion, version, digest]
    );
    await client.query('COMMIT');
    return { version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
