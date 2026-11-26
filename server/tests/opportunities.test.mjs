import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOpportunity,validateChange,InputError } from '../src/opportunities.mjs';
import { createApiServer } from '../src/http.mjs';

test('opportunidades: alta admite datos válidos sin valores ficticios',()=>{
  const data=validateOpportunity({name:'Consulta de depósito',channel:'WhatsApp',capacity:'5.000 L',nextDate:'2026-12-01'});
  assert.equal(data.name,'Consulta de depósito');
  assert.equal(data.nextDate,'2026-12-01');
  assert.equal(data.status,undefined);
});
test('oportunidades: no se admiten estados comerciales falsos, atributos de sistema ni fechas inválidas',()=>{
  assert.throws(()=>validateOpportunity({name:'x',channel:'WhatsApp',status:'Aceptada'}),InputError);
  assert.throws(()=>validateOpportunity({name:'x',channel:'WhatsApp',createdBy:'admin'}),InputError);
  assert.throws(()=>validateOpportunity({name:'x',channel:'WhatsApp',nextDate:'2026-02-31'}),InputError);
  assert.throws(()=>validateOpportunity({name:'',channel:'Web'}),InputError);
  assert.throws(()=>validateOpportunity({name:'x',channel:'Web',lostReason:'precio'}),InputError);
});
test('oportunidades: ediciones requieren versión entera positiva y campos permitidos',()=>{
  assert.deepEqual(validateChange({version:2,nextAction:'Llamar'}),{version:2,patch:{nextAction:'Llamar'}});
  assert.throws(()=>validateChange({version:0,status:'Nueva'}),InputError);
  assert.throws(()=>validateChange({version:1,id:'fake'}),InputError);
});
test('oportunidades API: sin sesión 401; Origin inválido en PATCH 403; rol indebido 403',async()=>{
  const fake={session:async()=>({id:'11111111-1111-4111-8111-111111111111',role:'fabrica'})};
  const server=createApiServer(fake,'https://crm.example.test');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try{
    const noSession=await fetch(url+'/api/opportunities');
    assert.equal(noSession.status,401);
    const invalidOrigin=await fetch(url+'/api/opportunities/11111111-1111-4111-8111-111111111111',{
      method:'PATCH',headers:{Origin:'https://evil.example.test'}
    });
    assert.equal(invalidOrigin.status,403);
    const wrongRole=await fetch(url+'/api/opportunities',{
      headers:{Cookie:'crm_session='+('A'.repeat(43))}
    });
    assert.equal(wrongRole.status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
