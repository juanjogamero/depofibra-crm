export const CHANNELS=Object.freeze(['Web','WhatsApp','Wallapop','Facebook Marketplace',
  'Facebook','Instagram','Teléfono','Correo electrónico','Recomendación','Otro']);
export const STATUSES=Object.freeze(['Nueva','Cualificación','Por presupuestar','Seguimiento','Perdida']);
const TEXT_FIELDS=Object.freeze({
  name:160,contact:300,alias:160,conversation:4000,product:200,capacity:100,
  destination:200,nextAction:300,message:4000,lostReason:300
});
const ALLOWED=new Set([...Object.keys(TEXT_FIELDS),'channel','status','nextDate']);
export class InputError extends Error {
  constructor(reason='datos_invalidos') { super(reason); this.status=400; }
}
export function validateOpportunity(value,{partial=false}={}) {
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new InputError();
  const keys=Object.keys(value);
  if(!keys.length || keys.some(k=>!ALLOWED.has(k))) throw new InputError();
  if(!partial && (!Object.hasOwn(value,'name')||!Object.hasOwn(value,'channel'))) throw new InputError();
  const result={};
  for(const key of keys) {
    const item=value[key];
    if(Object.hasOwn(TEXT_FIELDS,key)){
      if(typeof item!=='string'||item.length>TEXT_FIELDS[key])throw new InputError();
      if(key==='name'&&!item.trim())throw new InputError();
      result[key]=item.trim();
    } else if(key==='channel') {
      if(!CHANNELS.includes(item))throw new InputError();
      result.channel=item;
    } else if(key==='status') {
      if(!STATUSES.includes(item))throw new InputError();
      result.status=item;
    } else if(key==='nextDate') {
      if(item!==null&&(typeof item!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(item)
          ||Number.isNaN(Date.parse(item+'T12:00:00Z'))
          ||new Date(item+'T12:00:00Z').toISOString().slice(0,10)!==item))throw new InputError();
      result.nextDate=item;
    }
  }
  if(Object.hasOwn(result,'lostReason') && result.lostReason && result.status!=='Perdida')
    throw new InputError('Se requiere estado Perdida para indicar motivo');
  if(result.status && result.status!=='Perdida' && result.lostReason)
    throw new InputError();
  return result;
}
export function validateChange(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||!Number.isSafeInteger(value.version)||value.version<1) throw new InputError();
  const {version,...patch}=value;
  return {version,patch:validateOpportunity(patch,{partial:true})};
}
