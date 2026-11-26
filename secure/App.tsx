import { useEffect,useState,type FormEvent } from 'react';
import { ApiError,CHANNELS,STATUSES,request,type Channel,type Identity,type Opportunity,type Status } from './api';

const INITIAL={
 name:'',channel:'Web' as Channel,contact:'',product:'',capacity:'',
 destination:'',nextAction:'',nextDate:''
};
const displayDate=(value:string|null|undefined)=>{
 if(!value)return 'Sin fecha';
 const raw=value.slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:'Sin fecha';
};
function errorText(e:unknown){
 if(e instanceof ApiError){
  if(e.status===401)return 'Sesión caducada o credenciales incorrectas.';
  if(e.status===403)return 'No tienes permiso para realizar esta acción.';
  if(e.status===409)return 'El registro ha cambiado. Actualiza el listado antes de editar.';
  if(e.status===400)return 'Revisa los campos del formulario.';
 }
 return 'No se ha podido completar la operación. Comprueba la conexión.';
}
function OpportunityRow({item,onChange}:{item:Opportunity;onChange:()=>Promise<void>}){
 const [status,setStatus]=useState<Status>(item.status);
 const [nextAction,setNextAction]=useState(item.nextAction);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{setStatus(item.status);setNextAction(item.nextAction);},[item.id,item.version,item.status,item.nextAction]);
 const changed=status!==item.status||nextAction!==item.nextAction;
 const save=async()=>{
  setBusy(true);setError('');
  try{
   await request<{item:Opportunity}>('/api/opportunities/'+item.id,{
    method:'PATCH',
    body:JSON.stringify({version:item.version,status,nextAction})
   });
   await onChange();
  }catch(e){setError(errorText(e));if(e instanceof ApiError&&e.status===409)await onChange();}
  finally{setBusy(false);}
 };
 return <tr>
  <td><strong>{item.name}</strong><small>{item.product||'Producto pendiente'}{item.capacity?' · '+item.capacity:''}</small></td>
  <td><span>{item.channel}</span><small>{item.contact||'Sin contacto'}</small></td>
  <td>{item.destination||'Pendiente'}</td>
  <td><label className="sr-only" htmlFor={'status-'+item.id}>Estado</label>
   <select id={'status-'+item.id} value={status} onChange={e=>setStatus(e.target.value as Status)}
    disabled={busy}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></td>
  <td><label className="sr-only" htmlFor={'next-'+item.id}>Próxima acción</label>
   <input id={'next-'+item.id} value={nextAction} maxLength={300}
    onChange={e=>setNextAction(e.target.value)} disabled={busy} placeholder="Próxima acción"/></td>
  <td className="action"><button type="button" className="button-outline" onClick={save}
   disabled={!changed||busy}>{busy?'Guardando…':'Guardar'}</button>{error&&<small role="alert" className="error">{error}</small>}</td>
 </tr>;
}
export default function App(){
 const [phase,setPhase]=useState<'checking'|'guest'|'ready'|'fault'>('checking');
 const [identity,setIdentity]=useState<Identity|null>(null);
 const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');
 const [loginBusy,setLoginBusy]=useState(false);
 const [error,setError]=useState('');
 const [items,setItems]=useState<Opportunity[]>([]);
 const [loading,setLoading]=useState(false);
 const [addOpen,setAddOpen]=useState(false);
 const [draft,setDraft]=useState(INITIAL);
 const [saving,setSaving]=useState(false);
 const refresh=async()=>{
  setLoading(true);
  try{
   const result=await request<{items:Opportunity[]}>('/api/opportunities');
   setItems(result.items);
   setError('');
  }catch(e){
   if(e instanceof ApiError&&e.status===401){setIdentity(null);setItems([]);setPhase('guest');}
   setError(errorText(e));
  }finally{setLoading(false);}
 };
 useEffect(()=>{
  let mounted=true;
  request<Identity>('/api/me')
   .then(u=>{if(mounted){setIdentity(u);setPhase('ready');}})
   .catch(e=>{if(mounted){setPhase(e instanceof ApiError&&e.status===401?'guest':'fault');}});
  return()=>{mounted=false;};
 },[]);
 useEffect(()=>{if(phase==='ready'&&identity)void refresh();},[phase,identity?.username]);
 const login=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');setLoginBusy(true);
  try{
   await request('/api/login',{method:'POST',body:JSON.stringify({username,password})});
   const user=await request<Identity>('/api/me');
   setIdentity(user);setPassword('');setPhase('ready');
  }catch(e){setError(errorText(e));setPassword('');}
  finally{setLoginBusy(false);}
 };
 const logout=async()=>{
  setError('');
  try{
   await request('/api/logout',{method:'POST'});
   setItems([]);setIdentity(null);setPhase('guest');setUsername('');setPassword('');
  }catch(e){setError(errorText(e));}
 };
 const create=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setSaving(true);setError('');
  try{
   await request('/api/opportunities',{method:'POST',
    body:JSON.stringify({...draft,nextDate:draft.nextDate||null})});
   setDraft(INITIAL);setAddOpen(false);await refresh();
  }catch(e){setError(errorText(e));}finally{setSaving(false);}
 };
 const change=<K extends keyof typeof INITIAL>(field:K,value:(typeof INITIAL)[K])=>{
  setDraft(prev=>({...prev,[field]:value}));
 };
 return <div className="app">
  <header className="header"><div className="brand"><span className="brand-symbol" aria-hidden="true">D</span>
   <div><strong>DEPOFIBRA</strong><small>CRM privado · Versión en preparación</small></div></div>
   {identity&&<div className="account"><span>{identity.username}<small>{identity.role==='direccion'?'Dirección':'Oficina'}</small></span>
    <button className="button-ghost" onClick={logout}>Cerrar sesión</button></div>}
  </header>
  <div className="notice" role="note">Entorno de desarrollo. No introducir datos personales ni operaciones reales hasta completar seguridad, copias externas y aprobación de producción.</div>
  {phase==='checking'?<main className="auth-main"><p>Comprobando sesión segura…</p></main>
  :phase==='fault'?<main className="auth-main"><div className="auth-panel"><h1>Conexión no disponible</h1>
    <p>La API no está accesible o no responde correctamente. La aplicación no carga datos locales de demostración.</p>
    <button onClick={()=>location.reload()}>Reintentar</button></div></main>
  :phase==='guest'?<main className="auth-main"><section className="auth-panel" aria-labelledby="login-title">
    <div className="eyebrow">Acceso restringido</div><h1 id="login-title">Entrar al CRM</h1>
    <p>Accede con tu usuario autorizado. La identidad y los permisos se verifican en el servidor.</p>
    <form onSubmit={login}>
     <label htmlFor="username">Usuario</label>
     <input id="username" value={username} autoComplete="username" required minLength={3} maxLength={64}
      pattern="[a-z0-9_.-]+" onChange={e=>setUsername(e.target.value)} placeholder="Usuario"/>
     <label htmlFor="password">Contraseña</label>
     <input id="password" type="password" value={password} required autoComplete="current-password"
      onChange={e=>setPassword(e.target.value)} placeholder="Contraseña"/>
     {error&&<p className="error" role="alert">{error}</p>}
     <button className="button-primary" disabled={loginBusy}>{loginBusy?'Verificando…':'Iniciar sesión'}</button>
    </form>
    <p className="auth-footnote">Sin cuentas preconfiguradas. No se permite cambiar de rol desde el navegador.</p>
  </section></main>
  :<div className="workspace"><nav className="nav" aria-label="Módulos CRM">
    <div className="nav-title">GESTIÓN COMERCIAL</div>
    <span className="nav-active" aria-current="page">Oportunidades</span>
    <span className="nav-disabled">Presupuestos <small>Pendiente</small></span>
    <span className="nav-disabled">Clientes <small>Pendiente</small></span>
    <span className="nav-disabled">Pedidos <small>Pendiente</small></span>
    <div className="nav-separator"/>
    <p>No se importan datos de la demostración.</p>
   </nav>
   <main className="main"><div className="heading">
    <div><div className="eyebrow">GESTIÓN DE CONSULTAS</div><h1>Oportunidades</h1>
     <p>Consultas comerciales guardadas en PostgreSQL. Todas las acciones requieren una sesión autorizada.</p></div>
    <div className="heading-actions"><button className="button-outline" disabled={loading} onClick={()=>void refresh()}>Actualizar</button>
     <button className="button-primary" onClick={()=>setAddOpen(x=>!x)}>{addOpen?'Cerrar formulario':'Nueva oportunidad'}</button></div>
   </div>
   {error&&<p role="alert" className="alert-error">{error}</p>}
   {addOpen&&<section className="form-panel" aria-label="Nueva oportunidad">
    <h2>Registrar consulta</h2><form onSubmit={create}>
    <div className="fields">
     <label>Nombre de oportunidad <input required maxLength={160} value={draft.name} onChange={e=>change('name',e.target.value)} placeholder="Identificación de la consulta"/></label>
     <label>Canal <select value={draft.channel} onChange={e=>change('channel',e.target.value as Channel)}>
      {CHANNELS.map(c=><option key={c}>{c}</option>)}</select></label>
     <label>Contacto <input maxLength={300} value={draft.contact} onChange={e=>change('contact',e.target.value)}/></label>
     <label>Producto <input maxLength={200} value={draft.product} onChange={e=>change('product',e.target.value)} placeholder="Depósito, fosa…"/></label>
     <label>Capacidad <input maxLength={100} value={draft.capacity} onChange={e=>change('capacity',e.target.value)} placeholder="10.000 L"/></label>
     <label>Destino <input maxLength={200} value={draft.destination} onChange={e=>change('destination',e.target.value)}/></label>
     <label>Próxima acción <input maxLength={300} value={draft.nextAction} onChange={e=>change('nextAction',e.target.value)}/></label>
     <label>Fecha de seguimiento <input type="date" value={draft.nextDate} onChange={e=>change('nextDate',e.target.value)}/></label>
    </div>
    <button className="button-primary" disabled={saving}>{saving?'Guardando…':'Registrar oportunidad'}</button>
    </form>
   </section>}
   <section className="list" aria-labelledby="list-title">
    <div className="list-heading"><h2 id="list-title">Listado</h2><small>{loading?'Cargando…':items.length+' oportunidades'} · máximo 100 recientes</small></div>
    {!loading&&!items.length?<div className="empty"><strong>No hay oportunidades registradas.</strong><p>La base comienza vacía. No se han importado contactos ni presupuestos de ejemplo.</p></div>
    :<div className="table-scroll"><table><thead><tr><th>Oportunidad</th><th>Origen / Contacto</th><th>Destino</th><th>Estado</th><th>Próxima acción</th><th>Guardar</th></tr></thead>
    <tbody>{items.map(item=><OpportunityRow item={item} key={item.id} onChange={refresh}/>)}</tbody></table></div>}
   </section>
   <footer>Depofibra · CRM v2 en desarrollo. Roles y datos validados en el servidor. Sin acceso público aprobado.</footer>
   </main>
  </div>}
 </div>;
}
