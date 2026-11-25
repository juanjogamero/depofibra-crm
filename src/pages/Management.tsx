import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, ChevronLeft, CircleAlert, Plus, Search, X, UserRound, LockKeyhole, ClipboardList, Truck, Database, ArrowRight, Bell, Clock3, Pin, Pencil, Trash2, BookOpen, Mail, MessageCircle } from 'lucide-react';
import { useCrm } from '../store';
import { CHANNELS, type Channel, dt, money, decimal, dateText, today } from '../domain';
import { Button, Empty, Field, Modal, Panel } from '../ui';
import ResultsInsights from './ResultsInsights';
import FinanceAnalytics from './FinanceAnalytics';
import CatalogManager from './CatalogManager';
import TransportRouteCalculator from './TransportRouteCalculator';

export function Agenda(){
  const {data,role,addTask,toggleTask,addInternalNote,updateInternalNote,deleteInternalNote}=useCrm();
  const [searchParams,setSearchParams]=useSearchParams();
  const requestedDay=searchParams.get('fecha');
  const validDate=(value:string|null):value is string=>{
    if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const d=new Date(value+'T12:00:00');
    return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
  };
  const selectedDay=validDate(requestedDay)?requestedDay:today();
  const [month,setMonth]=useState(()=>new Date(selectedDay+'T12:00:00'));
  const [filter,setFilter]=useState('Pendientes');
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(()=>searchParams.get('nueva')==='1');
  const [title,setTitle]=useState('');
  const [due,setDue]=useState(selectedDay);
  const [atTime,setAtTime]=useState('09:00');
  const [reminder,setReminder]=useState('none');
  const [context,setContext]=useState('');
  const [noteSearch,setNoteSearch]=useState('');
  const [noteModal,setNoteModal]=useState(false);
  const [noteId,setNoteId]=useState('');
  const [noteTitle,setNoteTitle]=useState('');
  const [noteBody,setNoteBody]=useState('');
  const [noteCategory,setNoteCategory]=useState('General');
  const [now,setNow]=useState(()=>Date.now());
  const notes=data.internalNotes||[];
  useEffect(()=>{if(validDate(requestedDay))setMonth(new Date(requestedDay+'T12:00:00'))},[requestedDay]);
  useEffect(()=>{
    const refresh=()=>setNow(Date.now());
    window.addEventListener('focus',refresh);
    const timer=window.setInterval(refresh,60000);
    return ()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer)};
  },[]);
  const reminderTime=(task:{due:string;atTime?:string;reminderMinutes?:number|null})=>{
    if(task.reminderMinutes===undefined||task.reminderMinutes===null)return null;
    const at=new Date(task.due+'T'+(task.atTime||'09:00')+':00').getTime();
    return Number.isFinite(at)?at-task.reminderMinutes*60000:null;
  };
  const dueReminders=data.tasks.filter(t=>!t.done&&reminderTime(t)!==null&&reminderTime(t)!<=now);
  const dayTasks=data.tasks.filter(t=>t.due===selectedDay);
  const matchesTab=(done:boolean,tab:string)=>tab==='Todas'||(tab==='Pendientes'?!done:done);
  const query=search.trim().toLocaleLowerCase('es-ES');
  const tasks=data.tasks.filter(t=>(!requestedDay||t.due===selectedDay)
    &&matchesTab(t.done,filter)
    &&(t.title+' '+t.context+' '+t.due).toLocaleLowerCase('es-ES').includes(query))
    .sort((a,b)=>a.due.localeCompare(b.due)||(a.atTime||'').localeCompare(b.atTime||''));
  const start=new Date(month.getFullYear(),month.getMonth(),1);
  const offset=(start.getDay()+6)%7;
  const cells=Math.ceil((offset+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7;
  const monthLabel=month.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
  const dayKey=(day:number)=>month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  const moveMonth=(delta:number)=>setMonth(new Date(month.getFullYear(),month.getMonth()+delta,1));
  const selectDay=(date:string)=>{setSearchParams({fecha:date});setDue(date)};
  const openTask=()=>{setDue(selectedDay);setModal(true)};
  const closeTask=()=>{
    setModal(false);
    if(searchParams.get('nueva')==='1')setSearchParams({fecha:selectedDay},{replace:true});
  };
  const saveTask=(e:FormEvent)=>{
    e.preventDefault();
    if(!title.trim()||!validDate(due))return;
    addTask(title.trim(),due,context.trim(),{
      atTime,
      reminderMinutes:reminder==='none'?null:Number(reminder)
    });
    setTitle('');setContext('');setReminder('none');closeTask();
    setSearchParams({fecha:due});
  };
  const beginNote=(id?:string)=>{
    const current=notes.find(n=>n.id===id);
    setNoteId(current?.id||'');setNoteTitle(current?.title||'');
    setNoteBody(current?.body||'');setNoteCategory(current?.category||'General');setNoteModal(true);
  };
  const saveNote=(e:FormEvent)=>{
    e.preventDefault();
    if(!noteTitle.trim()||!noteBody.trim())return;
    const item={title:noteTitle.trim(),body:noteBody.trim(),category:noteCategory};
    if(noteId)updateInternalNote(noteId,item);
    else addInternalNote(item);
    setNoteModal(false);
  };
  const shownNotes=notes.filter(n=>(n.title+' '+n.body+' '+n.category).toLocaleLowerCase('es-ES').includes(noteSearch.toLocaleLowerCase('es-ES')))
    .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt));
  const categories=['General','Técnica','Proveedores','Comercial','Logística'];
  return <div className="page page-opportunities page-agenda agenda-pro">
    <header className="op-screen-heading">
      <div className="op-heading-copy">
        <h1>Agenda y notas</h1><p>Planifica tareas, consulta los avisos y conserva información de trabajo.</p>
      </div>
      <div className="op-heading-actions">
        <button type="button" className="op-new-button" onClick={openTask}><Plus size={17}/>Nueva tarea</button>
      </div>
    </header>
    {dueReminders.length>0&&<div className="agenda-pro-alert" role="status">
      <Bell size={17}/><span><strong>{dueReminders.length} {dueReminders.length===1?'aviso pendiente':'avisos pendientes'}</strong> · Se muestran al abrir el CRM. No se envían mensajes externos.</span>
      <button type="button" onClick={()=>{setFilter('Pendientes');setSearch('')}}>Ver tareas</button>
    </div>}
    <div className="agenda-pro-layout">
      <section className="agenda-pro-calendar" aria-labelledby="agenda-pro-month-title">
        <div className="agenda-pro-heading">
          <div><h2 id="agenda-pro-month-title">Calendario</h2><p>Selecciona un día para ver las tareas debajo.</p></div>
          <div className="agenda-pro-month">
            <button type="button" onClick={()=>moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={17}/></button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={()=>moveMonth(1)} aria-label="Mes siguiente"><ChevronRight size={17}/></button>
          </div>
        </div>
        <div className="agenda-pro-weekdays">{['L','M','X','J','V','S','D'].map((name,i)=><span key={i}>{name}</span>)}</div>
        <div className="agenda-pro-days">
          {Array.from({length:cells},(_,i)=>{
            const n=i-offset+1;
            const max=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
            if(n<1||n>max)return <span key={'empty'+i} className="agenda-pro-blank"/>;
            const date=dayKey(n);
            const count=data.tasks.filter(t=>t.due===date&&!t.done).length;
            return <button key={date} type="button" onClick={()=>selectDay(date)}
              className={'agenda-pro-day'+(date===today()?' is-today':'')+(date===selectedDay&&requestedDay?' is-selected':'')}
              aria-pressed={date===selectedDay&&Boolean(requestedDay)}
              aria-label={dateText(date)+', '+count+' tareas pendientes'}>
              <span>{n}</span>{count>0&&<small>{count}</small>}
            </button>;
          })}
        </div>
        <div className="agenda-pro-day-details">
          <div className="agenda-pro-day-heading">
            <div><strong>{dateText(selectedDay)}</strong><span>{dayTasks.length} {dayTasks.length===1?'tarea':'tareas'}</span></div>
            <button type="button" onClick={openTask}><Plus size={15}/>Añadir</button>
          </div>
          {dayTasks.length?<ul className="agenda-pro-day-list">{dayTasks.slice(0,3).map(t=><li key={t.id}>
            <span className={'agenda-pro-event-dot'+(t.done?' is-done':'')}/>
            <span><strong>{t.title}</strong>{t.atTime&&<small>{t.atTime}</small>}</span>
          </li>)}</ul>:<p className="agenda-pro-day-empty">Sin tareas para este día.</p>}
          {dayTasks.length>3&&<p className="agenda-pro-day-more">Y {dayTasks.length-3} más en el listado</p>}
          {requestedDay&&<button type="button" className="agenda-pro-all" onClick={()=>setSearchParams({})}>Mostrar todas las fechas</button>}
        </div>
      </section>
      <section className="agenda-pro-notes" aria-labelledby="agenda-pro-notes-title">
        <div className="agenda-pro-heading">
          <div><h2 id="agenda-pro-notes-title">Notas internas</h2><p>Condiciones y referencias que necesitas consultar.</p></div>
          <button type="button" className="agenda-pro-note-add" onClick={()=>beginNote()}><Plus size={16}/>Nueva nota</button>
        </div>
        <label className="agenda-pro-notes-search"><Search size={16}/>
          <input aria-label="Buscar notas internas" value={noteSearch} onChange={e=>setNoteSearch(e.target.value)} placeholder="Buscar en tus notas"/>
        </label>
        <div className="agenda-pro-note-list">
          {role==='direccion'?shownNotes.map(n=><article key={n.id} className="agenda-pro-note">
            <div className="agenda-pro-note-top"><span>{n.category}</span>
              <div><button type="button" aria-label={n.pinned?'Desfijar '+n.title:'Fijar '+n.title} title={n.pinned?'Desfijar':'Fijar arriba'} onClick={()=>updateInternalNote(n.id,{pinned:!n.pinned})}><Pin size={15} fill={n.pinned?'currentColor':'none'}/></button>
                <button type="button" aria-label={'Editar '+n.title} onClick={()=>beginNote(n.id)}><Pencil size={15}/></button>
                <button type="button" aria-label={'Eliminar '+n.title} onClick={()=>{if(window.confirm('¿Eliminar esta nota interna?'))deleteInternalNote(n.id)}}><Trash2 size={15}/></button>
              </div>
            </div>
            <h3>{n.title}</h3><p>{n.body}</p>
          </article>):role==='direccion'?<div className="agenda-pro-note-empty"><BookOpen size={23}/>
            <strong>Tu espacio de consulta</strong><p>Anota aquí información técnica, condiciones comunicadas por proveedores o recordatorios comerciales. Comprueba su vigencia antes de aplicarlas.</p>
            <button type="button" onClick={()=>beginNote()}>Crear primera nota</button>
          </div>:<div className="agenda-pro-note-empty"><BookOpen size={23}/>
            <p>Las notas de Dirección no están disponibles en esta vista.</p>
          </div>}
        </div>
        <p className="agenda-pro-local-hint">Las notas se guardan en este navegador. La privacidad por usuario se activará con el acceso del servidor.</p>
      </section>
    </div>
    <section className="agenda-pro-tasks" aria-label="Listado de tareas">
      <div className="agenda-pro-heading agenda-pro-tasks-heading">
        <div><h2>Tareas de trabajo</h2><p>Consulta lo pendiente y marca las tareas completadas.</p></div>
        <span>{tasks.length} {tasks.length===1?'resultado':'resultados'}</span>
      </div>
      <div className="agenda-pro-tasks-tools">
        <div className="agenda-pro-pills" role="group" aria-label="Estado de tareas">{['Pendientes','Hechas','Todas'].map(tab=><button key={tab} type="button" aria-pressed={filter===tab}
          onClick={()=>setFilter(tab)} className={filter===tab?'is-active':''}>{tab}</button>)}</div>
        <label className="agenda-pro-task-search"><Search size={16}/><input type="search" aria-label="Buscar tareas" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar tarea o contexto"/></label>
      </div>
      <div className="agenda-pro-task-rows">
        {tasks.map(t=><label key={t.id} className={'agenda-pro-task-row'+(t.done?' is-done':'')}>
          <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)} aria-label={(t.done?'Marcar pendiente ':'Completar ')+t.title}/>
          <span className="agenda-pro-task-text"><strong>{t.title}</strong><small>{t.context||'Sin contexto'}</small></span>
          <time dateTime={t.due}>{dateText(t.due)}{t.atTime?' · '+t.atTime:''}</time>
          {reminderTime(t)!==null&&!t.done&&<span className={'agenda-pro-reminder'+(reminderTime(t)!<=now?' is-due':'')}><Bell size={13}/>{reminderTime(t)!<=now?'Aviso pendiente':'Aviso en CRM'}</span>}
        </label>)}
        {!tasks.length&&<p className="agenda-pro-empty">No hay tareas que coincidan con estos filtros.</p>}
      </div>
    </section>
    {modal&&<Modal title="Nueva tarea" onClose={closeTask}>
      <form className="modal-form agenda-pro-modal" onSubmit={saveTask}>
        <Field label="Tarea"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Revisar presupuesto de un cliente"/></Field>
        <div className="form-grid"><Field label="Fecha"><input type="date" required value={due} onChange={e=>setDue(e.target.value)}/></Field>
          <Field label="Hora"><input type="time" required value={atTime} onChange={e=>setAtTime(e.target.value)}/></Field></div>
        <Field label="Contexto / pedido / cliente"><input value={context} onChange={e=>setContext(e.target.value)} placeholder="Referencia y próxima acción"/></Field>
        <Field label="Recordatorio dentro del CRM"><select value={reminder} onChange={e=>setReminder(e.target.value)}>
          <option value="none">Sin aviso</option><option value="0">A la hora de la tarea</option>
          <option value="15">15 minutos antes</option><option value="60">Una hora antes</option>
          <option value="1440">Un día antes</option>
        </select></Field>
        <div className="agenda-pro-channel-status"><Bell size={15}/><span>El aviso se muestra al abrir el CRM. Los avisos por <Mail size={14}/>correo y <MessageCircle size={14}/>WhatsApp necesitan la conexión al servidor y todavía no se envían.</span></div>
        <div className="modal-actions"><Button variant="outline" onClick={closeTask}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar tarea</Button></div>
      </form>
    </Modal>}
    {noteModal&&<Modal title={noteId?'Editar nota':'Nueva nota interna'} onClose={()=>setNoteModal(false)}>
      <form className="modal-form agenda-pro-modal" onSubmit={saveNote}>
        <Field label="Título"><input autoFocus required maxLength={110} value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="Ej. Condiciones comunicadas por fábrica"/></Field>
        <Field label="Categoría"><select value={noteCategory} onChange={e=>setNoteCategory(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Contenido"><textarea required rows={6} value={noteBody} onChange={e=>setNoteBody(e.target.value)} placeholder="Escribe la información y su fecha de confirmación, para poder comprobar su vigencia."/></Field>
        <div className="modal-actions"><Button variant="outline" onClick={()=>setNoteModal(false)}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar nota</Button></div>
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
type DemoProfile = { displayName: string; email: string; position: string; photo: string };
const profileKey = (role: DemoRole) => 'depofibra-crm-profile-demo-v1-' + role;
const blankProfile = (role: DemoRole): DemoProfile => ({
  displayName: role === 'direccion' ? 'Dirección' : 'Oficina de Fábrica',
  email: '',
  position: role === 'direccion' ? 'Administración (vista demo)' : 'Colaborador (vista demo)',
  photo: ''
});
function readDemoProfile(role: DemoRole): DemoProfile {
  const blank=blankProfile(role);
  try {
    const parsed=JSON.parse(localStorage.getItem(profileKey(role)) || 'null');
    return parsed && typeof parsed.displayName==='string' && typeof parsed.email==='string'
      ? {displayName:parsed.displayName,email:parsed.email,position:typeof parsed.position==='string'?parsed.position:blank.position,
          photo:typeof parsed.photo==='string' && parsed.photo.startsWith('data:image/')?parsed.photo:''}
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
        displayName:profile.displayName.trim(),email:profile.email.trim(),position:profile.position.trim(),photo:profile.photo
      }));
      window.dispatchEvent(new Event('depofibra-crm-profile-updated'));
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
          <div className="settings-avatar-editor">
            <span className="settings-avatar-preview" aria-hidden="true">{profile.photo?<img src={profile.photo} alt=""/>:<UserRound size={34}/>}</span>
            <div className="settings-avatar-controls">
              <strong>Foto de perfil</strong>
              <div className="settings-avatar-actions">
                <label className="settings-avatar-pick">Elegir foto
                  <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Elegir foto de perfil"
                    onChange={e=>{
                      const file=e.currentTarget.files?.[0];
                      e.currentTarget.value='';
                      if(!file)return;
                      setSaved(false);setError('');
                      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){
                        setError('Elige una imagen JPG, PNG o WebP de hasta 8 MB.');return;
                      }
                      const url=URL.createObjectURL(file);
                      const image=new Image();
                      image.onload=()=>{
                        try{
                          const canvas=document.createElement('canvas');
                          canvas.width=160;canvas.height=160;
                          const ctx=canvas.getContext('2d');
                          if(!ctx)throw new Error('Canvas no disponible');
                          const edge=Math.min(image.naturalWidth,image.naturalHeight);
                          if(!edge)throw new Error('Imagen vacía');
                          ctx.drawImage(image,(image.naturalWidth-edge)/2,(image.naturalHeight-edge)/2,edge,edge,0,0,160,160);
                          const photo=canvas.toDataURL('image/jpeg',0.78);
                          setProfile(p=>({...p,photo}));
                        }catch{setError('No se ha podido procesar esta foto. Prueba otra imagen.');}
                        finally{URL.revokeObjectURL(url);}
                      };
                      image.onerror=()=>{URL.revokeObjectURL(url);setError('No se ha podido leer esta imagen.');};
                      image.src=url;
                    }}/>
                </label>
                {profile.photo&&<button type="button" className="settings-avatar-remove" onClick={()=>{setProfile(p=>({...p,photo:''}));setSaved(false)}}>Quitar foto</button>}
              </div>
              <small>La foto se muestra en el menú lateral al guardar. Se conserva solo en este navegador.</small>
            </div>
          </div>
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
