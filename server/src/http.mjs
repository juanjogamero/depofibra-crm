import { createServer } from 'node:http';
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
async function jsonBody(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    const error = new Error('content-type'); error.status = 415; throw error;
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8192) { const error = new Error('body limit'); error.status = 413; throw error; }
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
      if (isPost && !validOrigin(req.headers.origin, origin)) {
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
      return reply(res, 404, { error: 'no_encontrado' });
    } catch (error) {
      if (error?.status) return reply(res, error.status, { error: 'solicitud_invalida' });
      // No emitir datos privados, SQL ni credenciales en respuestas o trazas públicas.
      console.error('Error interno de API', error?.code || error?.name || 'Error');
      return reply(res, 503, { error: 'servicio_no_disponible' });
    }
  });
}
