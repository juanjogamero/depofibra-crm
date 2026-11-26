import { InputError } from './opportunities.mjs';

const FIELDS = Object.freeze({
  name:'name',channel:'channel',contact:'contact',alias:'alias',
  conversation:'conversation',product:'product',capacity:'capacity',
  destination:'destination',status:'status',nextAction:'next_action',
  nextDate:'next_date',message:'message',lostReason:'lost_reason'
});
const SELECT=[
  'id,name,channel,contact,alias,conversation,product,capacity,destination,status',
  'next_action AS "nextAction"',
  "to_char(next_date,'YYYY-MM-DD') AS \"nextDate\"",
  'message,lost_reason AS "lostReason",created_at AS "createdAt"',
  'received_at AS "receivedAt",updated_at AS "updatedAt"',
  'deleted_at AS "deletedAt",version'
].join(',');
export function isUuid(v) {
  return typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
export async function listOpportunities(pool) {
  const result=await pool.query(
    'SELECT '+SELECT+' FROM crm.opportunities WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 100'
  );
  return result.rows.map(row=>({...row,activity:[]}));
}
export async function createOpportunity(pool,actorId,fields) {
  if(!isUuid(actorId)) throw new InputError();
  const entries=Object.entries(fields);
  const columns=['created_by','updated_by',...entries.map(([key])=>FIELDS[key])];
  const values=[actorId,actorId,...entries.map(([,value])=>value)];
  const placeholders=columns.map((_,i)=>'$'+(i+1)).join(',');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query(
      'INSERT INTO crm.opportunities('+columns.join(',')+') VALUES('+placeholders+') RETURNING '+SELECT,
      values);
    await client.query(
      "INSERT INTO crm.opportunity_events(opportunity_id,actor_id,action,new_version) VALUES($1,$2,'created',1)",
      [result.rows[0].id,actorId]);
    await client.query('COMMIT');
    return {...result.rows[0],activity:[]};
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
}
export async function updateOpportunity(pool,actorId,id,version,fields) {
  if(!isUuid(actorId)||!isUuid(id)||!Number.isSafeInteger(version)||version<1)
    throw new InputError();
  if(!Object.keys(fields).length)throw new InputError();
  const patch={...fields};
  if(Object.hasOwn(patch,'status')&&patch.status!=='Perdida'
    && !Object.hasOwn(patch,'lostReason'))patch.lostReason='';
  const entries=Object.entries(patch);
  const setters=entries.map(([key],i)=>FIELDS[key]+'=$'+(i+4));
  setters.push('updated_by=$2','updated_at=now()','version=version+1');
  const params=[id,actorId,version,...entries.map(([,val])=>val)];
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query(
      'UPDATE crm.opportunities SET '+setters.join(',')
      +' WHERE id=$1 AND version=$3 AND deleted_at IS NULL RETURNING '+SELECT,params);
    if(!result.rows.length) {
      const existing=await client.query(
        'SELECT version FROM crm.opportunities WHERE id=$1 AND deleted_at IS NULL',[id]);
      await client.query('ROLLBACK');
      return {error:existing.rows.length?'conflicto_version':'no_encontrada'};
    }
    const row=result.rows[0];
    await client.query(
      "INSERT INTO crm.opportunity_events(opportunity_id,actor_id,action,previous_version,new_version) VALUES($1,$2,'updated',$3,$4)",
      [id,actorId,version,row.version]);
    await client.query('COMMIT');
    return {item:{...row,activity:[]}};
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
}
