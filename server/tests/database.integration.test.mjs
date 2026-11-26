import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { Database } from '../src/database.mjs';
import { createApiServer } from '../src/http.mjs';
import { hashPassword } from '../src/security.mjs';

test('PostgreSQL real: login, sesión, cierre y RBAC SQL sin modificación del rol', {
  skip: !process.env.TEST_ADMIN_DATABASE_URL || !process.env.CRM_DATABASE_URL
}, async () => {
  const admin = new pg.Pool({connectionString:process.env.TEST_ADMIN_DATABASE_URL});
  const store = new Database(process.env.CRM_DATABASE_URL);
  const username = 'qa_test_user';
  const password = 'clave-efimera-solo-pruebas-2026';
  const hashed = await hashPassword(password);
  let server;
  try {
    await admin.query(
      "INSERT INTO crm.users(username,password_hash,role) VALUES($1,$2,'oficina')",
      [username,hashed]
    );
    await store.health();
    server = createApiServer(store,'https://crm.example.test');
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url = 'http://127.0.0.1:'+server.address().port;
    const bad = await fetch(url+'/api/login',{
      method:'POST',headers:{'Origin':'https://crm.example.test','Content-Type':'application/json'},
      body:JSON.stringify({username,password:'clave-incorrecta'})
    });
    assert.equal(bad.status,401);
    const login = await fetch(url+'/api/login',{
      method:'POST',headers:{'Origin':'https://crm.example.test','Content-Type':'application/json'},
      body:JSON.stringify({username,password})
    });
    assert.equal(login.status,200);
    const response = await login.json();
    assert.equal(response.role,'oficina');
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie||'',/^crm_session=/);
    const me = await fetch(url+'/api/me',{headers:{Cookie:cookie}});
    assert.equal(me.status,200);
    assert.equal((await me.json()).role,'oficina');

    await assert.rejects(
      store.pool.query("UPDATE crm.users SET role='direccion' WHERE username=$1",[username]),
      error=>error?.code==='42501'
    );
    const logout = await fetch(url+'/api/logout',{
      method:'POST',headers:{'Origin':'https://crm.example.test',Cookie:cookie}
    });
    assert.equal(logout.status,200);
    const denied = await fetch(url+'/api/me',{headers:{Cookie:cookie}});
    assert.equal(denied.status,401);
  } finally {
    if (server) await new Promise(resolve=>server.close(resolve));
    await store.close();
    await admin.query("DELETE FROM crm.users WHERE username=$1",[username]);
    await admin.end();
  }
});
