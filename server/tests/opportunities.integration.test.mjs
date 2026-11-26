import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { Database } from '../src/database.mjs';
import { createApiServer } from '../src/http.mjs';
import { hashPassword } from '../src/security.mjs';

test('PostgreSQL 18: oportunidades requieren sesión y dejan eventos auditables', {
  skip:!process.env.TEST_ADMIN_DATABASE_URL||!process.env.CRM_DATABASE_URL
},async()=>{
  const admin=new pg.Pool({connectionString:process.env.TEST_ADMIN_DATABASE_URL});
  const db=new Database({testConnectionString:process.env.CRM_DATABASE_URL});
  const username='qa_opportunities';
  const password='clave-solo-ci-efimera-2026';
  const hash=await hashPassword(password);
  let server,recordId;
  try{
    await admin.query(
      "INSERT INTO crm.users(username,password_hash,role) VALUES($1,$2,'oficina')",
      [username,hash]);
    server=createApiServer(db,'https://crm.example.test');
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    const origin='https://crm.example.test';
    const anonymous=await fetch(base+'/api/opportunities');
    assert.equal(anonymous.status,401);

    const login=await fetch(base+'/api/login',{
      method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({username,password})
    });
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie||'',/^crm_session=/);

    const empty=await fetch(base+'/api/opportunities',{headers:{Cookie:cookie}});
    assert.equal(empty.status,200);
    assert.deepEqual((await empty.json()).items,[]);

    const badOrigin=await fetch(base+'/api/opportunities',{
      method:'POST',
      headers:{Cookie:cookie,Origin:'https://evil.example.test','Content-Type':'application/json'},
      body:JSON.stringify({name:'No crear',channel:'Web'})
    });
    assert.equal(badOrigin.status,403);

    const created=await fetch(base+'/api/opportunities',{
      method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({name:'Consulta sintética CI',channel:'WhatsApp',product:'Depósito vertical',
        capacity:'10.000 L',destination:'Lugar de prueba',nextAction:'Revisar datos',nextDate:'2026-12-01'})
    });
    assert.equal(created.status,201);
    const {item}=await created.json();
    assert.equal(item.version,1);
    assert.equal(item.name,'Consulta sintética CI');
    recordId=item.id;

    const listed=await fetch(base+'/api/opportunities',{headers:{Cookie:cookie}});
    const list=await listed.json();
    assert.equal(list.items.length,1);
    assert.equal(list.items[0].id,item.id);

    const patched=await fetch(base+'/api/opportunities/'+item.id,{
      method:'PATCH',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({version:1,status:'Seguimiento',nextAction:'Llamar mañana'})
    });
    assert.equal(patched.status,200);
    assert.equal((await patched.json()).item.version,2);

    const stale=await fetch(base+'/api/opportunities/'+item.id,{
      method:'PATCH',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({version:1,nextAction:'Conflicto simulado'})
    });
    assert.equal(stale.status,409);
    const audit=await admin.query(
      'SELECT action,previous_version,new_version FROM crm.opportunity_events WHERE opportunity_id=$1 ORDER BY id',
      [item.id]);
    assert.deepEqual(audit.rows.map(e=>e.action),['created','updated']);
    assert.equal(audit.rows[1].new_version,2);

    await assert.rejects(
      db.pool.query('DELETE FROM crm.opportunities WHERE id=$1',[item.id]),
      error=>error?.code==='42501'
    );
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await db.close();
    if(recordId){
      await admin.query('DELETE FROM crm.opportunity_events WHERE opportunity_id=$1',[recordId]);
      await admin.query('DELETE FROM crm.opportunities WHERE id=$1',[recordId]);
    }
    await admin.query('DELETE FROM crm.users WHERE username=$1',[username]);
    await admin.end();
  }
});
