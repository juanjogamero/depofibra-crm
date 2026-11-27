import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { Database } from '../src/database.mjs';
import { createApiServer } from '../src/http.mjs';
import { hashPassword } from '../src/security.mjs';

/* Solo CI en PostgreSQL efímero, nunca contra VPS ni datos comerciales.
   Requiere migración 004 y las dos conexiones de test locales habilitadas. */
test('PostgreSQL 18 real: workspace original, sesión, persistencia, RBAC, CSRF, concurrencia y auditoría', {
  skip: !process.env.TEST_ADMIN_DATABASE_URL || !process.env.CRM_DATABASE_URL
}, async () => {
  const admin = new pg.Pool({ connectionString: process.env.TEST_ADMIN_DATABASE_URL });
  const director = 'qa_workspace_direction';
  const office = 'qa_workspace_office';
  const password = 'solo-ci-datos-sinteticos-2026';
  const origin = 'https://crm.example.test';
  const api = new Database({ testConnectionString: process.env.CRM_DATABASE_URL });
  const headers = { Origin: origin, 'Content-Type': 'application/json' };
  let server;
  let directId, officeId;
  let cookieDirector, cookieOffice;
  try {
    assert.equal((await admin.query("SELECT current_database() AS db")).rows[0].db, 'depofibra_crm_v2');
    assert.match(String((await admin.query("SELECT to_regclass('crm.business_workspace') AS rel")).rows[0].rel),
      /business_workspace$/);
    assert.equal((await admin.query('SELECT count(*)::integer AS n FROM crm.business_workspace')).rows[0].n, 0);
    const hashed = await hashPassword(password);
    const a = await admin.query("INSERT INTO crm.users(username,password_hash,role) VALUES($1,$2,'direccion') RETURNING id",[director,hashed]);
    directId = a.rows[0].id;
    const b = await admin.query("INSERT INTO crm.users(username,password_hash,role) VALUES($1,$2,'oficina') RETURNING id",[office,hashed]);
    officeId = b.rows[0].id;

    server = createApiServer(api,origin);
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const anonymous = await fetch(base+'/api/workspace');
    assert.equal(anonymous.status,401);
    const anonymousWrite = await fetch(base+'/api/workspace',{
      method:'PUT',headers,body:JSON.stringify({version:0,state:{}})
    });
    assert.equal(anonymousWrite.status,401);

    async function login(username) {
      const res=await fetch(base+'/api/login',{
        method:'POST',headers,body:JSON.stringify({username,password})
      });
      assert.equal(res.status,200);
      const cookie=res.headers.get('set-cookie')?.split(';')[0];
      assert.match(cookie||'',/^crm_session=/);
      return cookie;
    }
    cookieDirector = await login(director);
    cookieOffice = await login(office);

    const deniedRead=await fetch(base+'/api/workspace',{headers:{Cookie:cookieOffice}});
    assert.equal(deniedRead.status,403);
    const deniedWrite=await fetch(base+'/api/workspace',{
      method:'PUT',headers:{...headers,Cookie:cookieOffice},
      body:JSON.stringify({version:0,state:{}})
    });
    assert.equal(deniedWrite.status,403);

    const empty=await fetch(base+'/api/workspace',{headers:{Cookie:cookieDirector}});
    assert.equal(empty.status,200);
    const initial=await empty.json();
    assert.equal(initial.version,0);
    for (const list of ['opportunities','quotes','customers','orders','tasks','products']) {
      assert.deepEqual(initial.state[list],[]);
    }
    assert.equal(initial.state.transport.smallRate,0);
    assert.equal(initial.state.transport.buffer,0);

    const synthetic = { ...initial.state, opportunities:[{
      id:'OP-QA-REAL-001',name:'Cliente ficticio de CI',status:'Nueva',
      product:'Depósito ficticio de prueba',activity:[],createdAt:'2026-11-27'
    }] };
    const wrongOrigin=await fetch(base+'/api/workspace',{
      method:'PUT',
      headers:{...headers,Origin:'https://evil.example.test',Cookie:cookieDirector},
      body:JSON.stringify({version:0,state:synthetic})
    });
    assert.equal(wrongOrigin.status,403);

    const saved=await fetch(base+'/api/workspace',{
      method:'PUT',headers:{...headers,Cookie:cookieDirector},
      body:JSON.stringify({version:0,state:synthetic})
    });
    assert.equal(saved.status,200);
    assert.equal((await saved.json()).version,1);

    const restored=await fetch(base+'/api/workspace',{headers:{Cookie:cookieDirector}});
    assert.equal(restored.status,200);
    const first=await restored.json();
    assert.equal(first.version,1);
    assert.deepEqual(first.state.opportunities,synthetic.opportunities);

    const stale=await fetch(base+'/api/workspace',{
      method:'PUT',headers:{...headers,Cookie:cookieDirector},
      body:JSON.stringify({version:0,state:synthetic})
    });
    assert.equal(stale.status,409);

    const next={...first.state,quotes:[{
      id:'PRE-QA-REAL-001',opportunityId:'OP-QA-REAL-001',
      status:'Borrador',amount:1234.56
    }]};
    const second=await fetch(base+'/api/workspace',{
      method:'PUT',headers:{...headers,Cookie:cookieDirector},
      body:JSON.stringify({version:1,state:next})
    });
    assert.equal(second.status,200);
    assert.equal((await second.json()).version,2);

    const durable=(await admin.query('SELECT version,state FROM crm.business_workspace WHERE workspace_id=1')).rows[0];
    assert.equal(Number(durable.version),2);
    assert.deepEqual(durable.state.quotes,next.quotes);
    const events=(await admin.query(
      'SELECT actor_id,prior_version,new_version,state_sha256 FROM crm.business_workspace_events ORDER BY event_id'
    )).rows;
    assert.deepEqual(events.map(e=>[Number(e.prior_version),Number(e.new_version)]),[[0,1],[1,2]]);
    assert.ok(events.every(e=>e.actor_id===directId && /^[a-f0-9]{64}$/.test(e.state_sha256)));

    await assert.rejects(api.pool.query('DELETE FROM crm.business_workspace WHERE workspace_id=1'),
      error => error?.code === '42501');

    const logout=await fetch(base+'/api/logout',{
      method:'POST',headers:{Origin:origin,Cookie:cookieDirector}
    });
    assert.equal(logout.status,200);
    const afterLogout=await fetch(base+'/api/workspace',{headers:{Cookie:cookieDirector}});
    assert.equal(afterLogout.status,401);
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await api.close();
    // Borrado EXCLUSIVAMENTE en base efímera CI: sin tocar VPS.
    if(directId || officeId){
      await admin.query('DELETE FROM crm.business_workspace_events');
      await admin.query('DELETE FROM crm.business_workspace');
      await admin.query("DELETE FROM crm.sessions WHERE user_id IN (SELECT id FROM crm.users WHERE username IN ($1,$2))",[director,office]);
      await admin.query("DELETE FROM crm.audit WHERE actor_id IN (SELECT id FROM crm.users WHERE username IN ($1,$2))",[director,office]);
      await admin.query('DELETE FROM crm.users WHERE username IN ($1,$2)',[director,office]);
    }
    await admin.end();
  }
});
