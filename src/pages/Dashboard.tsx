import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, X, TrendingUp, CalendarClock } from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Quote, type Task } from '../domain';

type Period='8 semanas' | '6 meses';
type Series={label:string; consultations:number; quotations:number};

function makeKey(year:number,month:number,date:number) {
  return year+'-'+String(month+1).padStart(2,'0')+'-'+String(date).padStart(2,'0');
}
function timeSeries(opportunities:Opportunity[],quotes:Quote[],period:Period):Series[] {
  if(period==='6 meses') {
    const now=new Date(today()+'T12:00:00');
    return Array.from({length:6},(_,index)=>{
      const month=new Date(now.getFullYear(),now.getMonth()-(5-index),1);
      const prefix=makeKey(month.getFullYear(),month.getMonth(),1).slice(0,7);
      return {
        label:month.toLocaleDateString('es-ES',{month:'short'}).replace('.',''),
        consultations:opportunities.filter(o=>o.createdAt.startsWith(prefix)).length,
        quotations:quotes.filter(q=>q.createdAt.startsWith(prefix)).length
      };
    });
  }
  return Array.from({length:8},(_,index)=>{
    const age=(7-index)*7;
    const start=new Date(today()+'T12:00:00');
    start.setDate(start.getDate()-age-6);
    return {
      label:start.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.',''),
      consultations:opportunities.filter(o=>dayDiff(o.createdAt)>=age&&dayDiff(o.createdAt)<age+7).length,
      quotations:quotes.filter(q=>dayDiff(q.createdAt)>=age&&dayDiff(q.createdAt)<age+7).length
    };
  });
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
function shortInitials(name:string) {
  const words=name.replace(/\\s*·\\s*ejemplo$/i,'').trim().split(/\\s+/).filter(Boolean);
  return words.length>1
    ?(words[0][0]+words[words.length-1][0]).toLocaleUpperCase('es-ES')
    :(words[0]||'?').slice(0,2).toLocaleUpperCase('es-ES');
}
function isPending(o:Opportunity) {
  return o.status!=='Aceptada'&&o.status!=='Perdida';
}
function needsAttention(o:Opportunity) {
  return isPending(o) && (o.status==='Nueva'||o.status==='Por presupuestar'||Boolean(o.nextDate&&o.nextDate<today()));
}
function priority(o:Opportunity) {
  return o.nextDate&&o.nextDate<today()?0:o.status==='Nueva'?1:o.status==='Por presupuestar'?2:3;
}
function FocusRequests({opportunities}:{opportunities:Opportunity[]}) {
  const [view,setView]=useState<'atender'|'ultimas'>('atender');
  const sorted=[...opportunities].sort((a,b)=>(b.receivedAt||b.createdAt).localeCompare(a.receivedAt||a.createdAt));
  const attention=sorted.filter(needsAttention).sort((a,b)=>priority(a)-priority(b));
  const items=(view==='atender'?attention:sorted).slice(0,4);
  return <section className="focus-card focus-requests" aria-labelledby="focus-requests-title">
    <div className="focus-card-heading">
      <div>
        <h2 id="focus-requests-title">Consultas que importan</h2>
        <p>Lo más reciente y lo que necesita una respuesta</p>
      </div>
      <Link to="/oportunidades" className="focus-inline-link">Ver todas <ArrowRight size={15}/></Link>
    </div>
    <div className="focus-switch" role="group" aria-label="Elegir tipo de solicitudes">
      <button type="button" aria-pressed={view==='atender'} className={view==='atender'?'is-active':''} onClick={()=>setView('atender')}>
        Para atender <span>{attention.length}</span>
      </button>
      <button type="button" aria-pressed={view==='ultimas'} className={view==='ultimas'?'is-active':''} onClick={()=>setView('ultimas')}>
        Últimas entradas
      </button>
    </div>
    <div className="focus-requests-list">
      {items.map(o=>{
        const d=receivedDate(o);
        const overdue=isPending(o)&&Boolean(o.nextDate&&o.nextDate<today());
        const label=overdue?'Seguimiento vencido':o.status==='Nueva'?'Sin responder':o.status==='Por presupuestar'?'Por presupuestar':o.status;
        return <Link to={'/oportunidades/'+o.id} className="focus-request-row" key={o.id}>
          <span className="focus-request-avatar" aria-hidden="true">{shortInitials(o.name)}</span>
          <span className="focus-request-detail">
            <strong title={o.name}>{o.name}</strong>
            <small title={o.product+' · '+o.capacity}>{o.product}{o.capacity?' · '+o.capacity:''}</small>
          </span>
          <span className={'focus-request-status'+(overdue||o.status==='Nueva'?' is-urgent':'')}>{label}</span>
          <time dateTime={o.receivedAt||o.createdAt} title={d.label+(d.hour?' a las '+d.hour:'')}>{d.date}</time>
          <ArrowRight className="focus-request-arrow" size={16} aria-hidden="true"/>
        </Link>;
      })}
      {!items.length&&<div className="focus-empty">
        {view==='atender'?'Sin consultas que requieran atención inmediata. Puedes revisar las últimas entradas.':'Todavía no hay consultas registradas.'}
      </div>}
    </div>
    <div className="focus-requests-foot"><span>Solicitudes registradas en este CRM de demostración</span></div>
  </section>;
}
function smoothLine(values:number[],x:(i:number)=>number,y:(value:number)=>number) {
  if(!values.length)return '';
  let d='M '+x(0).toFixed(2)+' '+y(values[0]).toFixed(2);
  for(let i=1;i<values.length;i++){
    const mid=(x(i-1)+x(i))/2;
    d+=' C '+mid.toFixed(2)+' '+y(values[i-1]).toFixed(2)+' '+mid.toFixed(2)+' '+y(values[i]).toFixed(2)+' '+x(i).toFixed(2)+' '+y(values[i]).toFixed(2);
  }
  return d;
}
function SmallPulse({opportunities,quotes}:{opportunities:Opportunity[];quotes:Quote[]}) {
  const points=timeSeries(opportunities,quotes,'8 semanas');
  const current=points.slice(4).reduce((sum,p)=>sum+p.consultations,0);
  const previous=points.slice(0,4).reduce((sum,p)=>sum+p.consultations,0);
  const delta=current-previous;
  const max=Math.max(2,...points.flatMap(p=>[p.consultations,p.quotations]));
  const ceiling=Math.ceil(max/2)*2;
  const x=(i:number)=>28+i*642/Math.max(1,points.length-1);
  const y=(n:number)=>103-(n/ceiling)*76;
  const tooltip=delta>0?'Más consultas':delta<0?'Menos consultas':'Mismas consultas';
  return <section className="focus-card focus-pulse" aria-labelledby="focus-pulse-title">
    <div className="focus-pulse-copy">
      <div className="focus-pulse-label"><TrendingUp size={16}/><span>Ritmo comercial</span></div>
      <h2 id="focus-pulse-title">Pulso de las últimas 8 semanas</h2>
      <div className="focus-pulse-trend"><strong>{current} consultas</strong><span>últimas 4 semanas</span></div>
      <p className="focus-pulse-comparison">{tooltip} que en las 4 semanas anteriores ({previous}).</p>
      <Link to="/resultados" className="focus-inline-link">Ver resultados <ArrowRight size={14}/></Link>
    </div>
    <div className="focus-pulse-chart">
      <div className="focus-chart-key"><span><i className="is-leads"/>Consultas</span><span><i className="is-quotes"/>Presupuestos</span></div>
      <svg role="img" viewBox="0 0 700 125" preserveAspectRatio="none"
        aria-label={'Consultas y presupuestos por semana. '+points.map(p=>p.label+': '+p.consultations+' consultas y '+p.quotations+' presupuestos').join('; ')}>
        {[0,1,2].map(i=><line key={i} x1="28" x2="670" y1={27+i*38} y2={27+i*38} stroke="#e0ebf5" strokeWidth="1"/>)}
        <path d={smoothLine(points.map(p=>p.consultations),x,y)} fill="none" stroke="#01488e" strokeWidth="3.2" strokeLinecap="round"/>
        <path d={smoothLine(points.map(p=>p.quotations),x,y)} fill="none" stroke="#67afd5" strokeWidth="2.6" strokeLinecap="round"/>
        {points.map((p,i)=><g key={i}>
          <circle cx={x(i)} cy={y(p.consultations)} r="3.6" fill="#01488e" stroke="#fff" strokeWidth="1.5"/>
          <circle cx={x(i)} cy={y(p.quotations)} r="3.3" fill="#67afd5" stroke="#fff" strokeWidth="1.3"/>
        </g>)}
      </svg>
      <div className="focus-chart-labels">{points.map((p,i)=><span key={i}>{p.label}</span>)}</div>
    </div>
    <p className="focus-pulse-note">Datos locales de la demo. Para decidir campañas, contrasta consultas cualificadas, presupuestos, cierres y coste de captación reales.</p>
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
  const {data}=useCrm();
  const [hour]=useState(()=>new Date().getHours());
  const greeting=hour<12?'Buenos días':hour<20?'Buenas tardes':'Buenas noches';
  const date=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  const pendingTasks=data.tasks.filter(t=>!t.done&&t.due<today()).length;
  return <div className="page page-dashboard dashboard-hr dashboard-focus">
    <header className="focus-welcome">
      <div>
        <span className="focus-eyebrow">TU ESPACIO DE TRABAJO</span>
        <h1>{greeting}</h1>
        <p>Las consultas, la agenda y el ritmo comercial. Todo a mano.</p>
      </div>
      <div className="focus-welcome-aside">
        <span className="focus-today">{date}</span>
        {pendingTasks>0&&<Link to="/agenda" className="focus-overdue"><CalendarClock size={15}/>{pendingTasks} {pendingTasks===1?'tarea vencida':'tareas vencidas'}</Link>}
      </div>
    </header>
    <div className="focus-main">
      <FocusRequests opportunities={data.opportunities}/>
      <MiniCalendar tasks={data.tasks}/>
    </div>
    <SmallPulse opportunities={data.opportunities} quotes={data.quotes}/>
  </div>;
}
