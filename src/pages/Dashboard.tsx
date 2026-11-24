import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, X, CalendarClock, Search } from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Task } from '../domain';

function makeKey(year:number,month:number,date:number) {
  return year+'-'+String(month+1).padStart(2,'0')+'-'+String(date).padStart(2,'0');
}
function receivedDate(o:Opportunity) {
  const parsed=o.receivedAt?new Date(o.receivedAt):null;
  const valid=parsed&&!Number.isNaN(parsed.getTime());
  const date=valid?parsed:new Date(o.createdAt+'T12:00:00');
  return {
    date:date.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.',''),
    label:date.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}),
    hour:valid?date.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):''
  };
}
type QuickMatch={title:string;detail:string;destination:string;type:string;keywords:string};
const fold=(s:string)=>s.toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function QuickSearch(){
  const {data}=useCrm();
  const navigate=useNavigate();
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(0);
  const matches=useMemo(()=>{
    const term=fold(query.trim());
    if(term.length<2)return [];
    const all:QuickMatch[]=[
      ...data.opportunities.map(o=>({title:o.product,detail:o.name+' · '+o.id+' · '+o.capacity,type:'Oportunidad',destination:'/oportunidades/'+o.id,keywords:[o.product,o.name,o.id,o.capacity,o.channel,o.destination,o.contact].join(' ')})),
      ...data.customers.map(c=>({title:c.name,detail:c.destination+' · '+c.id,type:'Cliente',destination:'/clientes/'+c.id,keywords:[c.name,c.id,c.destination,c.contact].join(' ')})),
      ...data.quotes.map(q=>({title:q.name,detail:q.product+' · '+q.id,type:'Presupuesto',destination:'/presupuestos/'+q.id,keywords:[q.name,q.product,q.id,q.status].join(' ')})),
      ...data.orders.map(o=>({title:o.buyerName,detail:o.product+' · '+o.id,type:'Pedido',destination:'/pedidos/'+o.id,keywords:[o.buyerName,o.id,o.product,o.capacity,o.factory].join(' ')})),
      ...data.tasks.map(t=>({title:t.title,detail:t.context+' · '+dateText(t.due),type:'Tarea',destination:'/agenda?fecha='+t.due,keywords:[t.title,t.context,t.due].join(' ')}))
    ];
    return all.filter(x=>fold(x.keywords).includes(term)).slice(0,7);
  },[query,data]);
  const go=(item:QuickMatch)=>{setOpen(false);setQuery('');setActive(0);navigate(item.destination);};
  return <div className="focus-search" role="search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false);}}>
    <div className={'focus-search-field'+(open?' is-open':'')}>
      <Search size={19} aria-hidden="true"/>
      <input type="search" aria-label="Buscar en todo el CRM" aria-expanded={open&&query.trim().length>=2} aria-controls="focus-search-results"
        autoComplete="off" value={query} placeholder="Buscar clientes, oportunidades, presupuestos o pedidos..."
        onFocus={()=>setOpen(true)}
        onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true);}}
        onKeyDown={e=>{
          if(e.key==='Escape'){setOpen(false);e.currentTarget.blur();}
          if(e.key==='ArrowDown'&&matches.length){e.preventDefault();setOpen(true);setActive(i=>(i+1)%matches.length);}
          if(e.key==='ArrowUp'&&matches.length){e.preventDefault();setOpen(true);setActive(i=>(i-1+matches.length)%matches.length);}
          if(e.key==='Enter'&&matches.length){e.preventDefault();go(matches[Math.min(active,matches.length-1)]);}
        }}/>
      {query&&<button type="button" className="focus-search-clear" aria-label="Limpiar búsqueda" onClick={()=>{setQuery('');setActive(0);setOpen(false);}}><X size={15}/></button>}
      <span className="focus-search-hint">Búsqueda rápida</span>
    </div>
    {open&&query.trim().length>=2&&<div className="focus-search-results" id="focus-search-results" aria-label="Resultados de búsqueda">
      <div className="focus-search-results-label">Resultados en registros locales</div>
      {matches.length?matches.map((item,i)=><button type="button" key={item.type+item.destination} className={'focus-search-result'+(i===active?' is-active':'')}
        onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(i)} onClick={()=>go(item)}>
        <span className="focus-search-result-kind">{item.type}</span>
        <span className="focus-search-result-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
        <ArrowRight size={15} aria-hidden="true"/>
      </button>):<div className="focus-search-none">No hay coincidencias. Prueba otra palabra, nombre o referencia.</div>}
    </div>}
  </div>;
}
function isPending(o:Opportunity) {
  return o.status!=='Aceptada'&&o.status!=='Perdida';
}
function daysOpen(o:Opportunity) {
  return dayDiff(o.createdAt);
}
function isOldPending(o:Opportunity) {
  return isPending(o)&&(daysOpen(o)>=7||Boolean(o.nextDate&&o.nextDate<today()));
}
function needsAttention(o:Opportunity) {
  return isPending(o)&&(o.status==='Nueva'||o.status==='Por presupuestar'||isOldPending(o));
}
function priority(o:Opportunity) {
  return o.nextDate&&o.nextDate<today()?0:isOldPending(o)?1:o.status==='Nueva'?2:o.status==='Por presupuestar'?3:4;
}
function initials(name:string) {
  const parts=name.replace(/\s*·\s*ejemplo$/i,'').trim().split(/\s+/).filter(Boolean);
  return parts.length>1?(parts[0][0]+parts[parts.length-1][0]).toLocaleUpperCase('es-ES'):(parts[0]||'?').slice(0,2).toLocaleUpperCase('es-ES');
}
function FocusRequests({opportunities}:{opportunities:Opportunity[]}) {
  const sorted=[...opportunities].sort((a,b)=>(b.receivedAt||b.createdAt).localeCompare(a.receivedAt||a.createdAt));
  const attention=sorted.filter(needsAttention).sort((a,b)=>priority(a)-priority(b)||a.createdAt.localeCompare(b.createdAt));
  const items=[...attention,...sorted.filter(o=>!attention.some(urgent=>urgent.id===o.id))].slice(0,5);
  return <section className="focus-card focus-requests" aria-labelledby="focus-requests-title">
    <div className="focus-card-heading">
      <div>
        <h2 id="focus-requests-title">Oportunidades recientes y por atender</h2>
        <p>Las últimas entradas y las que requieren seguimiento</p>
      </div>
      <Link to="/oportunidades" className="focus-inline-link">Ver todas <ArrowRight size={17}/></Link>
    </div>
    <div className="focus-requests-list">
      {items.map(o=>{
        const d=receivedDate(o);
        const overdue=isPending(o)&&Boolean(o.nextDate&&o.nextDate<today());
        const label=overdue?'Seguimiento vencido':o.status==='Nueva'?'Sin responder':isOldPending(o)?'Pendiente antiguo':o.status;
        return <Link to={'/oportunidades/'+o.id} className="focus-request-row" key={o.id}>
          <span className="focus-request-avatar" aria-hidden="true">{initials(o.name)}</span>
          <span className="focus-request-detail">
            <strong title={o.name+' · '+o.capacity}>{o.name}{o.capacity?' · '+o.capacity:''}</strong>
            <small title={o.product+' · '+o.id}>{o.product}{o.id?' · '+o.id:''}</small>
          </span>
          <span className={'focus-request-status'+(overdue||o.status==='Nueva'||isOldPending(o)?' is-urgent':'')}>{label}</span>
          <time className="focus-request-date" dateTime={o.receivedAt||o.createdAt} title={'Entrada: '+d.label+(d.hour?' a las '+d.hour:'')}>{d.date}</time>
          <ArrowRight className="focus-request-arrow" size={16} aria-hidden="true"/>
        </Link>;
      })}
      {!items.length&&<div className="focus-empty">No hay registros para mostrar ahora mismo. ¡Estás al día!</div>}
    </div>
    <div className="focus-requests-foot">Datos locales de demostración · Todas las oportunidades se conservan en el listado</div>
  </section>;
}

function MiniCalendar({ tasks }: { tasks: Task[] }) {
  const base = new Date(today()+'T12:00:00');
  const [month, setMonth] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const year = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(year,m,1).getDay()+6)%7;
  const dayCount = new Date(year,m+1,0).getDate();
  const positions = Math.ceil((offset + dayCount)/7)*7;
  const pendingTasks = tasks.filter(t=>!t.done);
  const selectedTasks = pendingTasks.filter(t=>t.due===selected);
  const monthTitle = month.toLocaleDateString('es-ES', { month:'long', year:'numeric' });
  const weekdays = ['L','M','X','J','V','S','D'];
  const agendaUrl = '/agenda?fecha=' + selected;
  const move = (delta:number) => {
    const next = new Date(year,m+delta,1);
    setMonth(next);
    setSelected(makeKey(next.getFullYear(),next.getMonth(),1));
    setDetailsOpen(false);
  };
  const showDate = (date:string) => {
    setSelected(date);
    setDetailsOpen(true);
  };
  return <section className="hr-right-card hr-calendar vek2-card vek2-calendar focus-calendar" aria-labelledby="hr-calendar-heading">
    <div className="hr-panel-heading hr-calendar-head">
      <h2 id="hr-calendar-heading">Calendario</h2>
      <div className="hr-month-selector">
        <button type="button" onClick={()=>move(-1)} aria-label="Mes anterior"><ChevronLeft size={16}/></button>
        <span>{monthTitle}</span>
        <button type="button" onClick={()=>move(1)} aria-label="Mes siguiente"><ChevronRight size={16}/></button>
      </div>
    </div>
    <div className="hr-calendar-weekdays">{weekdays.map((d,i)=><span key={i}>{d}</span>)}</div>
    <div className="hr-calendar-days">
      {Array.from({length:positions},(_,i)=>{
        const day=i-offset+1;
        if(day<1||day>dayCount) return <span key={'blank-'+i} aria-hidden="true"/>;
        const date=makeKey(year,m,day);
        const count=pendingTasks.filter(t=>t.due===date).length;
        const classes='hr-calendar-day'+(date===today()?' is-today':'')+(date===selected?' is-selected':'');
        return <button key={date} type="button" className={classes} onClick={()=>showDate(date)}
          aria-label={day+' de '+monthTitle+(count?', '+count+(count===1?' tarea pendiente':' tareas pendientes'):', sin tareas pendientes')+'. Ver detalles'}
          aria-pressed={date===selected && detailsOpen}>
          <span>{day}</span>{count>0&&<i aria-hidden="true"/>}
        </button>;
      })}
    </div>
    {detailsOpen&&<div className="hr-calendar-inspector" role="region" aria-label={'Tareas del '+dateText(selected)}>
      <div className="hr-calendar-inspector-head">
        <div><small>Agenda del día</small><strong>{dateText(selected)}</strong></div>
        <button type="button" onClick={()=>setDetailsOpen(false)} aria-label="Cerrar detalles del calendario"><X size={16}/></button>
      </div>
      <div className="hr-calendar-inspector-list">
        {selectedTasks.length ? selectedTasks.slice(0,2).map(t=>
          <Link key={t.id} to={agendaUrl} className="hr-calendar-task-link" title={'Ver la tarea en Agenda: '+t.title}>
            <span className="hr-calendar-task-dot" aria-hidden="true"/>
            <span className="hr-calendar-task-copy"><strong>{t.title}</strong>{t.context&&<small>{t.context}</small>}</span>
            <ArrowRight size={13} aria-hidden="true"/>
          </Link>
        ) : <p className="hr-calendar-no-tasks">No hay tareas pendientes en esta fecha.</p>}
        {selectedTasks.length>2&&<span className="hr-calendar-task-more">Y {selectedTasks.length-2} más en Agenda</span>}
      </div>
      <Link className="hr-calendar-open-day" to={selectedTasks.length?agendaUrl:agendaUrl+'&nueva=1'}>
        {selectedTasks.length?'Ver todas las tareas del día':'Crear tarea para este día'} <ArrowRight size={14}/>
      </Link>
    </div>}
    <div className="hr-calendar-footer">
      <span className="hr-selected-date">{dateText(selected)}</span>
      <Link className="focus-calendar-create" to={agendaUrl+'&nueva=1'}><Plus size={13}/>Anotar tarea</Link>
      <Link to={agendaUrl}>Ver agenda <ArrowRight size={13}/></Link>
    </div>
  </section>;
}


export default function Dashboard(){
  const {data,role}=useCrm();
  const [hour]=useState(()=>new Date().getHours());
  const greeting=hour<12?'Buenos días':hour<20?'Buenas tardes':'Buenas noches';
  // La demo no dispone todavía de usuarios autenticados: se usa la vista activa del CRM.
  const profileName=role==='fabrica'?'Oficina de Fábrica':'Dirección';
  const date=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  const pendingTasks=data.tasks.filter(t=>!t.done&&t.due<today()).length;
  return <div className="page page-dashboard dashboard-hr dashboard-focus">
    <header className="focus-topline">
      <span className="focus-eyebrow">TU ESPACIO DE TRABAJO</span>
      <div className="focus-topline-date">
        <span className="focus-today">{date}</span>
        {pendingTasks>0&&<Link to="/agenda" className="focus-overdue"><CalendarClock size={15}/>{pendingTasks} {pendingTasks===1?'tarea vencida':'tareas vencidas'}</Link>}
      </div>
    </header>
    <div className="focus-center-stage">
      <div className="focus-greeting">
        <h1>{greeting}, <span className="focus-profile-name">{profileName}</span></h1>
      </div>
      <QuickSearch/>
      <div className="focus-main">
        <FocusRequests opportunities={data.opportunities}/>
        <MiniCalendar tasks={data.tasks}/>
      </div>
    </div>
  </div>;
}
