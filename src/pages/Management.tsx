import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, CircleAlert, Plus, Search, X, UserRound, LockKeyhole, ClipboardList, Truck, Database, ArrowRight } from 'lucide-react';
import { useCrm } from '../store';
import { CHANNELS, type Channel, dt, money, decimal, dateText, today } from '../domain';
import { Button, Empty, Field, Modal, Panel } from '../ui';
import ResultsInsights from './ResultsInsights';
import FinanceAnalytics from './FinanceAnalytics';
import CatalogManager from './CatalogManager';
import TransportRouteCalculator from './TransportRouteCalculator';

export function Agenda(){
  const {data,addTask,toggleTask}=useCrm();
  const [searchParams,setSearchParams]=useSearchParams();
  const requestedDay=searchParams.get('fecha');
  const isValidDate=(value:string|null): value is string => {
    if(!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const check=new Date(value+'T12:00:00');
    return !Number.isNaN(check.getTime()) && check.getFullYear()===Number(value.slice(0,4))
      && check.getMonth()+1===Number(value.slice(5,7)) && check.getDate()===Number(value.slice(8,10));
  };
  const selectedDay=isValidDate(requestedDay)?requestedDay:null;
  const [modal,setModal]=useState(()=>searchParams.get('nueva')==='1' && Boolean(selectedDay));
  const [filter,setFilter]=useState('Pendientes');
  const [search,setSearch]=useState('');
  const [title,setTitle]=useState('');
  const [due,setDue]=useState(selectedDay||today());
  const [context,setContext]=useState('');
  const tasksForDay=data.tasks.filter(t=>!selectedDay || t.due===selectedDay);
  const tabs=['Pendientes','Hechas','Todas'];
  const matchesTab=(done:boolean,tab:string)=>tab==='Todas'||(tab==='Pendientes'?!done:done);
  const query=search.trim().toLocaleLowerCase('es-ES');
  const tasks=tasksForDay.filter(t=>
    matchesTab(t.done,filter)
    &&(t.title+' '+t.context+' '+t.due).toLocaleLowerCase('es-ES').includes(query)
  );
  const closeModal=()=>{
    setModal(false);
    if(searchParams.get('nueva')==='1' && selectedDay) setSearchParams({fecha:selectedDay},{replace:true});
  };
  const save=(e:FormEvent)=>{
    e.preventDefault();
    if(title.trim()){
      addTask(title.trim(),due,context);
      closeModal();
      setTitle('');
      setContext('');
    }
  };
  return <div className="page page-opportunities page-agenda">
    <div className="op-screen-heading">
      <div className="op-heading-copy">
        <h1 id="agenda-title">Agenda y notas</h1>
        <p>Organiza llamadas, seguimientos, tareas y anotaciones comerciales.</p>
      </div>
      <div className="op-heading-actions">
        <button type="button" className="op-new-button"
          onClick={()=>{setDue(selectedDay||today());setModal(true)}}>
          <Plus size={17}/>Nueva tarea
        </button>
      </div>
    </div>
    {selectedDay&&<div className="agenda-selected-day agenda-active-date" role="status">
      <div><CalendarDays size={17} aria-hidden="true"/><span>Mostrando tareas del <strong>{dateText(selectedDay)}</strong></span></div>
      <button type="button" onClick={()=>setSearchParams({},{replace:true})}>Ver todas las fechas</button>
    </div>}
    <nav className="op-phase-tabs agenda-phase-tabs" aria-label="Filtrar tareas por estado">
      {tabs.map(tab=><button key={tab} type="button" className={'op-phase-tab'+(filter===tab?' is-active':'')}
        aria-pressed={filter===tab} onClick={()=>setFilter(tab)}>
        <span>{tab}</span><strong>{tasksForDay.filter(t=>matchesTab(t.done,tab)).length}</strong>
      </button>)}
    </nav>
    <div className="op-searchbar agenda-searchbar">
      <label className="op-search">
        <Search size={18} aria-hidden="true"/>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
          aria-label="Buscar tareas por título, contexto o fecha" placeholder="Buscar tarea, cliente o pedido"/>
        {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
      </label>
      <span className="agenda-toolbar-meta">{tasks.length} {tasks.length===1?'tarea':'tareas'} en esta vista</span>
    </div>
    <div className="agenda-content-grid">
      <section className="agenda-tasks-card" aria-labelledby="agenda-list-title">
        <div className="agenda-card-heading">
          <div><h2 id="agenda-list-title">{selectedDay?'Tareas del día':'Tareas de trabajo'}</h2>
            <p>{selectedDay?'Seguimientos previstos para esta fecha':'Pendientes y seguimientos de tu actividad comercial'}</p></div>
          <span className="agenda-task-counter">{tasksForDay.length} {tasksForDay.length===1?'registrada':'registradas'}</span>
        </div>
        <div className="agenda-list-columns" aria-hidden="true">
          <span>TAREA / CONTEXTO</span><span>FECHA</span><span>ESTADO</span>
        </div>
        <div className="agenda-list-scroll" tabIndex={0} role="region" aria-label="Listado de tareas con desplazamiento vertical">
          {tasks.map(t=>{
            const overdue=!t.done&&t.due<today();
            return <label className={'agenda-task-row'+(t.done?' is-complete':'')+(overdue?' is-overdue':'')} key={t.id}>
              <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)}
                aria-label={(t.done?'Marcar como pendiente: ':'Marcar como hecha: ')+t.title}/>
              <span className="agenda-task-copy">
                <strong title={t.title}>{t.title}</strong>
                <small title={t.context}>{t.context||'Sin contexto adicional'}</small>
              </span>
              <time dateTime={t.due} className={overdue?'overdue':''}>{dateText(t.due)}</time>
              <span className={'agenda-task-state'+(t.done?' is-done':overdue?' is-late':' is-pending')}>
                {t.done?'Hecha':overdue?'Vencida':'Pendiente'}
              </span>
            </label>;
          })}
          {!tasks.length&&<Empty title="Sin tareas en esta vista"
            body={search?'Prueba otra búsqueda o cambia el filtro.':selectedDay?'Este día no tiene tareas para el filtro seleccionado. Puedes crear una nueva.':'Registra una llamada o un seguimiento con fecha.'}/>}
        </div>
        <footer className="agenda-list-footer">Mostrando <strong>{tasks.length}</strong> de <strong>{tasksForDay.length}</strong> tareas</footer>
      </section>
      <aside className="agenda-side-stack" aria-label="Calendario y notas">
        <section className="agenda-side-card agenda-week-card" aria-labelledby="agenda-week-title">
          <div className="agenda-side-heading"><h2 id="agenda-week-title">Próximos siete días</h2><CalendarDays size={17} aria-hidden="true"/></div>
          <div className="calendar-strip agenda-calendar-strip">
            {Array.from({length:7},(_,i)=>{
              const day=dt(i);
              return <button type="button" className={'calendar-day agenda-strip-day'+(selectedDay===day?' is-selected':'')+(day===today()?' is-today':'')}
                key={day} aria-pressed={selectedDay===day}
                aria-label={'Ver tareas del '+dateText(day)}
                onClick={()=>setSearchParams({fecha:day})}>
                <small>{new Date(day+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short'})}</small>
                <strong>{new Date(day+'T12:00:00').getDate()}</strong>
                <i className={data.tasks.some(t=>t.due===day&&!t.done)?'has-event':''}/>
              </button>;
            })}
          </div>
          <p className="agenda-week-help">Selecciona un día para consultar sus tareas. El punto azul indica tareas pendientes.</p>
        </section>
        <section className="agenda-side-card agenda-notes-card" aria-labelledby="agenda-notes-title">
          <div className="agenda-side-heading"><h2 id="agenda-notes-title">Notas y condiciones</h2></div>
          <div className="knowledge-note agenda-knowledge-note"><CircleAlert size={19}/><div>
            <strong>Comprobaciones pendientes</strong>
            <p>Suplementos, garantías, precios o accesorios comunicados verbalmente deben verificarse con proveedor antes de ofertar.</p>
          </div></div>
          <Link to="/oportunidades" className="link-action agenda-notes-link">Consultar oportunidades <ChevronRight size={15}/></Link>
        </section>
      </aside>
    </div>
    {modal&&<Modal title="Nueva tarea o llamada" onClose={closeModal}>
      <form className="modal-form" onSubmit={save}>
        <Field label="Qué tienes que hacer"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Llamar para seguimiento"/></Field>
        <div className="form-grid">
          <Field label="Fecha"><input type="date" required value={due} onChange={e=>setDue(e.target.value)}/></Field>
          <Field label="Cliente / operación asociada"><input value={context} onChange={e=>setContext(e.target.value)} placeholder="OP, cliente o pedido"/></Field>
        </div>
        <div className="modal-actions"><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar tarea</Button></div>
      </form>
    </Modal>}
  </div>;
}

export function Results(){
  return <ResultsInsights/>;
}

export function Finance(){
  return <FinanceAnalytics/>;
}
export function Catalog(){
  return <CatalogManager/>;
}

/* Las dos vistas ('direccion' / 'fabrica') son una simulación local, no permisos
   ni identidades autentificadas. No almacenar contraseñas ni simular logs. */
type DemoRole = 'direccion' | 'fabrica';
type DemoProfile = { displayName: string; email: string; position: string };
const profileKey = (role: DemoRole) => 'depofibra-crm-profile-demo-v1-' + role;
const blankProfile = (role: DemoRole): DemoProfile => ({
  displayName: role === 'direccion' ? 'Dirección' : 'Oficina de Fábrica',
  email: '',
  position: role === 'direccion' ? 'Administración (vista demo)' : 'Colaborador (vista demo)'
});
function readDemoProfile(role: DemoRole): DemoProfile {
  const blank=blankProfile(role);
  try {
    const parsed=JSON.parse(localStorage.getItem(profileKey(role)) || 'null');
    return parsed && typeof parsed.displayName==='string' && typeof parsed.email==='string'
      ? {displayName:parsed.displayName,email:parsed.email,position:typeof parsed.position==='string'?parsed.position:blank.position}
      : blank;
  } catch { return blank; }
}

export function TransportCalculator(){
  const {data}=useCrm();
  return <div className="page page-opportunities crm-workspace page-transport">
    <header className="op-screen-heading">
      <div className="op-heading-copy">
        <h1>Calculadora de transporte</h1>
        <p>Estima el porte desde Casariche. Los parámetros internos se administran en Cuenta y configuración.</p>
      </div>
    </header>
    <TransportRouteCalculator tariffs={data.transport}/>
  </div>;
}

function TariffsEditor(){
  const {data,updateTransport}=useCrm();
  const [edit,setEdit]=useState({...data.transport});
  const [saved,setSaved]=useState(false);
  useEffect(()=>setEdit({...data.transport}),[data.transport]);
  const valid=Object.values(edit).every(value=>Number.isFinite(value)&&value>=0)&&edit.distanceLimit>=1;
  return <section className="settings-panel">
    <div className="settings-panel-head"><h2>Tarifas orientativas de transporte</h2><p>Solo para uso interno. Los portes siguen sujetos a confirmación del transportista y de la descarga.</p></div>
    <div className="transport-fast-tariff-grid settings-tariff-grid">
      <Field label="Hasta Ø 2,45 m · €/km"><input type="number" min="0" step=".05" value={edit.smallRate} onChange={e=>{setSaved(false);setEdit({...edit,smallRate:Number(e.target.value)})}}/></Field>
      <Field label="Desde Ø 3,00 m · €/km"><input type="number" min="0" step=".05" value={edit.largeRate} onChange={e=>{setSaved(false);setEdit({...edit,largeRate:Number(e.target.value)})}}/></Field>
      <Field label="Ajuste fijo · €"><input type="number" min="0" step="1" value={edit.buffer} onChange={e=>{setSaved(false);setEdit({...edit,buffer:Number(e.target.value)})}}/></Field>
      <Field label="Recargo especial · €"><input type="number" min="0" step="1" value={edit.specialExtra} onChange={e=>{setSaved(false);setEdit({...edit,specialExtra:Number(e.target.value)})}}/></Field>
      <Field label="Límite de kilómetros"><input type="number" min="1" step="1" value={edit.distanceLimit} onChange={e=>{setSaved(false);setEdit({...edit,distanceLimit:Number(e.target.value)})}}/></Field>
    </div>
    <div className="settings-actions"><Button disabled={!valid} onClick={()=>{updateTransport(edit);setSaved(true)}}><Check size={16}/>Guardar tarifas de la demo</Button>
      <Link to="/transporte" className="settings-inline-link">Ir a la calculadora <ArrowRight size={15}/></Link></div>
    {saved&&<p className="settings-success" role="status">Tarifas guardadas localmente. No se ha consultado ni confirmado un transporte real.</p>}
  </section>;
}

export function Configuration(){
  const {role,setRole,resetDemo}=useCrm();
  const location=useLocation();
  const section=location.pathname.split('/')[2]||'perfil';
  const admin=role==='direccion';
  const [profile,setProfile]=useState<DemoProfile>(()=>readDemoProfile(role));
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{setProfile(readDemoProfile(role));setSaved(false);setError('')},[role]);

  const sections=[
    {id:'perfil',label:'Mi perfil',icon:UserRound},
    {id:'seguridad',label:'Acceso y seguridad',icon:LockKeyhole},
    ...(admin?[
      {id:'actividad',label:'Registro de actividad',icon:ClipboardList},
      {id:'transporte',label:'Tarifas de transporte',icon:Truck},
      {id:'datos',label:'Datos de demostración',icon:Database}
    ]:[])
  ];
  const allowed=sections.some(s=>s.id===section);
  const saveProfile=(event:FormEvent)=>{
    event.preventDefault();
    setSaved(false);setError('');
    try{
      localStorage.setItem(profileKey(role),JSON.stringify({
        displayName:profile.displayName.trim(),email:profile.email.trim(),position:profile.position.trim()
      }));
      setSaved(true);
    }catch{setError('El navegador no permite guardar este perfil de demostración.')}
  };

  return <div className="page page-opportunities crm-workspace page-settings">
    <header className="op-screen-heading">
      <div className="op-heading-copy">
        <h1>Cuenta y configuración</h1>
        <p>Datos de usuario, acceso y parámetros internos de la plataforma.</p>
      </div>
      <span className="settings-demo-flag">Vista de prueba · sin autenticación real</span>
    </header>
    <div className="settings-workspace">
      <nav className="settings-sections" aria-label="Secciones de la cuenta y configuración">
        <p className="settings-sections-label">TU CUENTA</p>
        {sections.map(({id,label,icon:Icon})=><NavLink key={id} to={'/configuracion/'+id}
          className={({isActive})=>'settings-section-link'+(isActive?' active':'')}>
          <Icon size={17}/><span>{label}</span><ChevronRight size={15}/>
        </NavLink>)}
      </nav>
      <div className="settings-main">
      {!allowed&&<section className="settings-panel"><h2>Sección no disponible</h2>
        <p>Esta vista no incluye ese apartado. Los permisos reales requerirán acceso autenticado y validación en el servidor.</p>
        <Link to="/configuracion/perfil" className="settings-inline-link">Ir a mi perfil <ArrowRight size={15}/></Link>
      </section>}
      {allowed&&section==='perfil'&&<section className="settings-panel">
        <div className="settings-panel-head"><h2>Mi perfil</h2>
          <p>Datos identificativos para la interfaz. En esta versión son solo preferencias locales de demostración.</p></div>
        <form className="settings-profile-form" onSubmit={saveProfile}>
          <div className="settings-form-grid">
            <Field label="Nombre visible"><input required maxLength={80} value={profile.displayName} autoComplete="off"
              onChange={e=>{setProfile({...profile,displayName:e.target.value});setSaved(false)}}/></Field>
            <Field label="Correo de contacto (opcional)"><input type="email" maxLength={120} value={profile.email} autoComplete="off"
              placeholder="Sin configurar" onChange={e=>{setProfile({...profile,email:e.target.value});setSaved(false)}}/></Field>
            <Field label="Cargo o descripción"><input maxLength={90} value={profile.position} autoComplete="off"
              onChange={e=>{setProfile({...profile,position:e.target.value});setSaved(false)}}/></Field>
            <Field label="Tipo de vista"><input disabled value={admin?'Dirección · administrador (simulado)':'Oficina de Fábrica · colaborador (simulado)'} /></Field>
          </div>
          <div className="settings-actions"><Button type="submit"><Check size={16}/>Guardar perfil en este navegador</Button></div>
          {saved&&<p className="settings-success" role="status">Perfil guardado en este navegador. No modifica una cuenta real.</p>}
          {error&&<p className="settings-error" role="alert">{error}</p>}
        </form>
        <div className="settings-demo-switch">
          <div><strong>Probar las dos vistas</strong><p>Este selector es solo de desarrollo. No concede permisos ni inicia sesión.</p></div>
          <select aria-label="Cambiar vista simulada del CRM" value={role}
            onChange={e=>setRole(e.target.value as DemoRole)}>
            <option value="direccion">Dirección / administrador</option>
            <option value="fabrica">Oficina de Fábrica / colaborador</option>
          </select>
        </div>
      </section>}
      {allowed&&section==='seguridad'&&<section className="settings-panel">
        <div className="settings-panel-head"><h2>Acceso y seguridad</h2>
          <p>La recuperación de contraseñas y la gestión de sesiones se habilitarán al conectar un sistema de cuentas seguro.</p></div>
        <div className="settings-feature-row"><div><strong>Restablecer contraseña</strong>
          <p>Pendiente de autenticación real, verificación de correo y envío seguro del enlace de recuperación.</p></div>
          <button type="button" disabled className="settings-disabled-action">No disponible en demo</button></div>
        <div className="settings-feature-row"><div><strong>Sesiones y dispositivos</strong>
          <p>Se requiere gestionar las sesiones desde el servidor para poder cerrarlas o revocarlas.</p></div>
          <span className="settings-pending-label">Pendiente</span></div>
        <p className="settings-note"><CircleAlert size={17}/>Nunca se pedirán ni guardarán contraseñas en el almacenamiento local del navegador.</p>
      </section>}
      {allowed&&section==='actividad'&&<section className="settings-panel">
        <div className="settings-panel-head"><h2>Registro de actividad · administración</h2>
          <p>Auditoría prevista para el perfil administrador. Todavía no existe un registro central fiable.</p></div>
        <div className="settings-audit-empty">
          <ClipboardList size={25}/><strong>Sin registros de auditoría del servidor</strong>
          <p>El CRM actual guarda datos de demostración en cada navegador; no puede certificar quién ha realizado cada acción ni detectar manipulaciones.</p>
        </div>
        <h3>Eventos que deberá registrar el sistema definitivo</h3>
        <div className="settings-audit-spec">
          <span>Inicios y cierres de sesión</span><span>Creación y edición de registros</span>
          <span>Cambios de presupuesto y pedidos</span><span>Tarifas y configuración</span>
          <span>Cambios de usuario y permisos</span><span>Exportación y borrado de datos</span>
        </div>
        <p className="settings-note"><CircleAlert size={17}/>Para una auditoría verificable hacen falta cuentas autenticadas, permisos aplicados en servidor, fecha/hora, usuario, acción, registro y retención controlada. No se mostrarán eventos inventados.</p>
      </section>}
      {allowed&&section==='transporte'&&<TariffsEditor/>}
      {allowed&&section==='datos'&&<section className="settings-panel">
        <div className="settings-panel-head"><h2>Datos de demostración</h2>
          <p>Opciones locales de pruebas. No afectan a bases de datos reales ni a otras personas.</p></div>
        <div className="settings-feature-row"><div><strong>Restablecer datos ficticios</strong>
          <p>Reinicia los registros de este navegador. Esta acción no se puede deshacer.</p></div>
          <Button variant="outline" onClick={()=>{if(window.confirm('¿Reiniciar todos los datos de demostración?'))resetDemo()}}>Restablecer demo</Button></div>
      </section>}
      </div>
    </div>
  </div>;
}
