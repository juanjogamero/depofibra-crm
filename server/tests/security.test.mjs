import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, makeSession, readSessionCookie, sessionCookie, clearSessionCookie, validOrigin } from '../src/security.mjs';
import { createApiServer } from '../src/http.mjs';

test('scrypt guarda sal, no texto plano y verifica contraseña', async () => {
  const password = 'un-texto-de-prueba-largo-2026';
  const hash = await hashPassword(password);
  assert.match(hash, /^scrypt\$131072\$8\$1\$/);
  assert.ok(!hash.includes(password));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('otra-contraseña', hash), false);
  assert.equal(await verifyPassword(password, 'no-valido'), false);
});

test('sesiones generan tokens aleatorios y cookies seguras', () => {
  const a = makeSession(), b = makeSession();
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.hash, b.hash);
  assert.equal(readSessionCookie(`x=y; crm_session=${a.token}; z=3`), a.token);
  assert.match(sessionCookie(a.token), /HttpOnly; Secure; SameSite=Strict/);
  assert.match(clearSessionCookie(), /Max-Age=0/);
  assert.equal(validOrigin('https://crm.example.test','https://crm.example.test'),true);
  assert.equal(validOrigin('http://crm.example.test','https://crm.example.test'),false);
});

test('sin sesión se deniega y se bloquea origen incorrecto', async () => {
  const fake = { health: async () => {}, session: async () => null };
  const server = createApiServer(fake, 'https://crm.example.test');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const me = await fetch(url + '/api/me');
    assert.equal(me.status, 401);
    const health = await fetch(url + '/api/health');
    assert.equal(health.status, 200);
    const denied = await fetch(url + '/api/logout', { method:'POST',headers:{ Origin:'https://evil.example' } });
    assert.equal(denied.status, 403);
    const invalidType = await fetch(url + '/api/login', {method:'POST',headers:{Origin:'https://crm.example.test','Content-Type':'text/plain'},body:'abc'});
    assert.equal(invalidType.status, 415);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
