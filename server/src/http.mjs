import { createServer } from 'node:http';
import { loadWorkspace, saveWorkspace } from './workspace-store.mjs';
import { validateOpportunity, validateChange } from './opportunities.mjs';
import { listOpportunities, createOpportunity, updateOpportunity, isUuid } from './opportunities-store.mjs';
import { makeSession, verifyPassword, wasteLoginWork, tokenHash, readSessionCookie, sessionCookie, clearSessionCookie, validOrigin, SESSION_SECONDS } from './security.mjs';

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};
function reply(res, status, value, extra = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra });
  res.end(body);
}
async function jsonBody(req, maxBytes = 8192) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    const error = new Error('content-type'); error.status = 415; throw error;
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) { const error = new Error('body limit'); error.status = 413; throw error; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { const error = new Error('invalid JSON'); error.status = 400; throw error; }
}

export function createApiServer(store, origin) {
  if (!origin || !origin.startsWith('https://')) throw new Error('CRM_ORIGIN debe ser HTTPS');
  const loginAttempts = [];
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url || '/', 'http://localhost').pathname;
      const isPost = req.method === 'POST';
      const isWrite = ['POST','PATCH','PUT','DELETE'].includes(req.method);
      if (isWrite && !validOrigin(req.headers.origin, origin)) {
        return reply(res, 403, { error: 'origen_no_permitido' });
      }
      if (req.method === 'GET' && path === '/api/health') {
        await store.health();
        return reply(res, 200, { status: 'ok' });
      }
      if (isPost && path === '/api/login') {
        const now = Date.now();
        while (loginAttempts.length && loginAttempts[0] < now - 60000) loginAttempts.shift();
        if (loginAttempts.length >= 20) {
          return reply(res, 429, { error: 'demasiados_intentos' }, { 'Retry-After': '60' });
        }
        loginAttempts.push(now);
        const payload = await jsonBody(req);
        const username = payload?.username;
        const password = payload?.password;
        if (typeof username !== 'string' || !/^[a-z0-9_.-]{3,64}$/.test(username)
            || typeof password !== 'string' || password.length > 1024 || !password) {
          return reply(res, 400, { error: 'datos_invalidos' });
        }
        const user = await store.getUser(username);
        if (!user || !user.active || (user.locked_until && new Date(user.locked_until).getTime() > now)) {
          await wasteLoginWork(password);
          return reply(res, 401, { error: 'acceso_denegado' });
        }
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          await store.failLogin(user.id);
          return reply(res, 401, { error: 'acceso_denegado' });
        }
        const session = makeSession();
        await store.successfulLogin(user.id, session.hash, SESSION_SECONDS);
        return reply(res, 200, { username: user.username, role: user.role }, { 'Set-Cookie': sessionCookie(session.token) });
      }
      const cookie = readSessionCookie(req.headers.cookie);
      const hash = cookie ? tokenHash(cookie) : null;
      if (req.method === 'GET' && path === '/api/me') {
        if (!hash) return reply(res, 401, { error: 'sin_sesion' });
        const user = await store.session(hash);
        return user
          ? reply(res, 200, { username: user.username, role: user.role })
          : reply(res, 401, { error: 'sin_sesion' });
      }
      if (isPost && path === '/api/logout') {
        if (hash) await store.logout(hash);
        return reply(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
      }
      // El CRM original conserva sus pantallas, pero solo Dirección puede
      // consultar y modificar su espacio real persistido. No hay datos demo.
      if (path === '/api/workspace') {
        if (!hash) return reply(res, 401, { error: 'sin_sesion' });
        const principal = await store.session(hash);
        if (!principal) return reply(res, 401, { error: 'sin_sesion' });
        if (principal.role !== 'direccion') {
          return reply(res, 403, { error: 'sin_permiso' });
        }
        if (req.method === 'GET') {
          return reply(res, 200, await loadWorkspace(store.pool));
        }
        if (req.method === 'PUT') {
          const payload = await jsonBody(req, 1024 * 1024 + 8192);
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)
              || Object.keys(payload).sort().join(',') !== 'state,version') {
            return reply(res, 400, { error: 'solicitud_invalida' });
          }
          const result = await saveWorkspace(store.pool, principal.id, payload.version, payload.state);
          if (result.error === 'conflicto_version') return reply(res, 409, result);
          return reply(res, 200, result);
        }
        return reply(res, 405, { error: 'metodo_no_permitido' });
      }
      // Los recursos comerciales nunca son públicos. El rol viene de la sesión
      // validada contra PostgreSQL, nunca de una cabecera del navegador.
      if (path === '/api/opportunities' || path.startsWith('/api/opportunities/')) {
        if (!hash) return reply(res, 401, { error: 'sin_sesion' });
        const principal = await store.session(hash);
        if (!principal) return reply(res, 401, { error: 'sin_sesion' });
        if (!['direccion','oficina'].includes(principal.role)) {
          return reply(res, 403, { error: 'sin_permiso' });
        }
        if (req.method==='GET' && path==='/api/opportunities') {
          return reply(res, 200, { items: await listOpportunities(store.pool) });
        }
        if (isPost && path==='/api/opportunities') {
          const data=validateOpportunity(await jsonBody(req));
          const item=await createOpportunity(store.pool,principal.id,data);
          return reply(res, 201, { item });
        }
        if (req.method==='PATCH' && path.startsWith('/api/opportunities/')) {
          const id=path.slice('/api/opportunities/'.length);
          if (!isUuid(id)) return reply(res, 404, { error: 'no_encontrado' });
          const {version,patch}=validateChange(await jsonBody(req));
          const result=await updateOpportunity(store.pool,principal.id,id,version,patch);
          if (result.error==='conflicto_version') return reply(res,409,{error:result.error});
          if (result.error==='no_encontrada')return reply(res,404,{error:result.error});
          return reply(res,200,result);
        }
      }
      return reply(res, 404, { error: 'no_encontrado' });
    } catch (error) {
      if (error?.status) return reply(res, error.status, { error: 'solicitud_invalida' });
      // No emitir datos privados, SQL ni credenciales en respuestas o trazas públicas.
      console.error('Error interno de API', error?.code || error?.name || 'Error');
      return reply(res, 503, { error: 'servicio_no_disponible' });
    }
  });
}
