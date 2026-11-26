export type Role='direccion'|'oficina';
export type Identity={username:string;role:Role};
export const CHANNELS=['Web','WhatsApp','Wallapop','Facebook Marketplace','Facebook','Instagram','Teléfono','Correo electrónico','Recomendación','Otro'] as const;
export const STATUSES=['Nueva','Cualificación','Por presupuestar','Seguimiento','Perdida'] as const;
export type Channel=typeof CHANNELS[number];
export type Status=typeof STATUSES[number];
export type Opportunity={
 id:string;name:string;channel:Channel;contact:string;alias:string;
 conversation:string;product:string;capacity:string;destination:string;
 status:Status;nextAction:string;nextDate:string|null;
 message:string;lostReason:string;version:number;
 createdAt:string;receivedAt:string;updatedAt:string;
};
export class ApiError extends Error{
 constructor(public readonly status:number,public readonly errorCode:string){super(errorCode);}
}
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 if(!/^\/api\/[a-zA-Z0-9/_-]+$/.test(path))throw new Error('Ruta API no permitida');
 const response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',
  headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 const result:unknown=await response.json().catch(()=>null);
 if(!response.ok){
  const err=result&&typeof result==='object'&&'error' in result?String(result.error):'servicio_no_disponible';
  throw new ApiError(response.status,err);
 }
 return result as T;
}
