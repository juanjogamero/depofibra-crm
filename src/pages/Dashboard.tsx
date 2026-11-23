import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Plus, X } from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Quote, type Task } from '../domain';

type Period='8 semanas' | '6 meses';
type Tab='todas' | 'nuevas' | 'gestion' | 'cerradas';
type Series={label:string; consultations:number; quotations:number};
type Segment={label:string;value:number;color:string};

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
  const withTime=o.receivedAt?new Date(o.receivedAt):null;
  const valid=withTime&&!Number.isNaN(withTime.getTime());
  const date=valid?withTime:new Date(o.createdAt+'T12:00:00');
  return {
    day:date.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.',''),
    hour:valid?date.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'',
    label:date.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})
  };
}
function shortInitials(name:string) {
  const words=name.replace(/\s*·\s*ejemplo$/i,'').trim().split(/\s+/).filter(Boolean);
  return words.length>1
    ?(words[0][0]+words[words.length-1][0]).toLocaleUpperCase('es-ES')
    :(words[0]||'?').slice(0,2).toLocaleUpperCase('es-ES');
}
function RecentTable({opportunities}:{opportunities:Opportunity[]}) {
  const [tab,setTab]=useState<Tab>('todas');
  const sorted=[...opportunities].sort((a,b)=>(b.receivedAt||b.createdAt).localeCompare(a.receivedAt||a.createdAt));
  const filter=(o:Opportunity)=>tab==='todas'
    ||(tab==='nuevas'&&o.status==='Nueva')
    ||(tab==='gestion'&&['Cualificación','Por presupuestar','Presupuesto enviado','Seguimiento'].includes(o.status))
    ||(tab==='cerradas'&&['Aceptada','Perdida'].includes(o.status));
  const latest=sorted.filter(filter).slice(0,4);
  const tabs:[Tab,string][]=[['todas','Todas'],['nuevas','Sin responder'],['gestion','En gestión'],['cerradas','Cerradas']];
  return <section className="vek2-card vek2-summary" aria-labelledby="vek2-summary-heading">
    <div className="vek2-card-heading">
      <div><h2 id="vek2-summary-heading">Solicitudes recientes</h2><p>Control de entradas y oportunidades</p></div>
      <div className="vek2-heading-actions">
        <a className="vek2-secondary-action" href="https://depofibra.com/" target="_blank" rel="noopener noreferrer">Abrir web <ExternalLink size={13}/></a>
        <Link className="vek2-primary-action" to="/oportunidades">Ver todas <ArrowRight size={13}/></Link>
      </div>
    </div>
    <div className="vek2-tabs" role="group" aria-label="Filtrar solicitudes">
      {tabs.map(([id,label])=><button key={id} type="button"
        className={tab===id?'is-active':''} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}
    </div>
    <div className="vek2-table-area">
      <table className="vek2-table">
        <thead><tr>
          <th scope="col">Cliente / solicitud</th><th scope="col">Producto</th><th scope="col">Canal</th>
          <th scope="col">Entrada</th><th scope="col">Estado</th><th scope="col"><span className="vek2-sr-only">Abrir</span></th>
        </tr></thead>
        <tbody>
          {latest.map(o=>{
            const d=receivedDate(o);
            const stateClass=o.status==='Nueva'?'is-new':['Aceptada'].includes(o.status)?'is-won':o.status==='Perdida'?'is-lost':'is-progress';
            return <tr key={o.id}>
              <td><Link className="vek2-client-link" to={'/oportunidades/'+o.id}><span className="vek2-client-avatar" aria-hidden="true">{shortInitials(o.name)}</span><span className="vek2-client-copy"><strong title={o.name}>{o.name}</strong><small>{o.id}</small></span></Link></td>
              <td><span className="vek2-ellipsis" title={o.product+' '+o.capacity}>{o.product}<small>{o.capacity||'—'}</small></span></td>
              <td><span className="vek2-ellipsis">{o.channel}</span></td>
              <td><time dateTime={o.receivedAt||o.createdAt} title={d.label}><span>{d.day}</span>{d.hour&&<small>{d.hour}</small>}</time></td>
              <td><span className={'vek2-status '+stateClass}>{o.status}</span></td>
              <td><Link className="vek2-open-row" to={'/oportunidades/'+o.id} aria-label={'Abrir solicitud de '+o.name}><ArrowRight size={15}/></Link></td>
            </tr>;
          })}
        </tbody>
      </table>
      {!latest.length&&<div className="vek2-empty">No hay solicitudes en este estado.</div>}
    </div>
  </section>;
}

function OpportunityStatus({opportunities,tasks}:{opportunities:Opportunity[];tasks:Task[]}) {
  const segments:Segment[]=[
    {label:'Sin responder',value:opportunities.filter(o=>o.status==='Nueva').length,color:'#0d4fa0'},
    {label:'En gestión',value:opportunities.filter(o=>['Cualificación','Por presupuestar','Seguimiento'].includes(o.status)).length,color:'#18b794'},
    {label:'Presupuestadas',value:opportunities.filter(o=>o.status==='Presupuesto enviado').length,color:'#e1bf43'},
    {label:'Cerradas',value:opportunities.filter(o=>['Aceptada','Perdida'].includes(o.status)).length,color:'#76cbd0'}
  ];
  const total=opportunities.length;
  const circumference=2*Math.PI*49;
  let offset=0;
  const arcs=segments.map(s=>{
    const portion=total?Math.max(0,s.value/total)*circumference:0;
    const arc={...s,length:portion,offset};
    offset+=portion;
    return arc;
  });
  const due=tasks.filter(t=>!t.done&&t.due<today()).length;
  const quotePending=opportunities.filter(o=>o.status==='Por presupuestar').length;
  return <section className="vek2-card vek2-statistics" aria-labelledby="vek2-stat-heading">
    <div className="vek2-card-heading"><h2 id="vek2-stat-heading">Estado comercial</h2>
      <Link className="vek2-text-link" to="/resultados">Ver resultados <ArrowRight size={13}/></Link>
    </div>
    <div className="vek2-donut-layout">
      <div className="vek2-donut-wrap">
        <svg viewBox="0 0 150 150" role="img"
          aria-label={'Distribución de '+total+' solicitudes: '+segments.map(s=>s.label+' '+s.value).join(', ')}>
          <circle cx="75" cy="75" r="49" fill="none" stroke="#eaf0f6" strokeWidth="19"/>
          {arcs.filter(s=>s.length>0).map(s=><circle key={s.label}
            cx="75" cy="75" r="49" fill="none" stroke={s.color} strokeWidth="19"
            strokeDasharray={s.length+' '+circumference} strokeDashoffset={-s.offset}
            transform="rotate(-90 75 75)"/>)}
        </svg>
        <div className="vek2-donut-total"><strong>{total}</strong><small>solicitudes</small></div>
      </div>
      <div className="vek2-stat-legend">
        {segments.map(s=><div key={s.label} className="vek2-legend-row">
          <span className="vek2-legend-dot" style={{background:s.color}}/>
          <span>{s.label}</span><strong>{s.value}</strong>
        </div>)}
      </div>
    </div>
    <div className="vek2-stat-foot">
      <Link to="/oportunidades" className="vek2-foot-metric">
        <span className="vek2-foot-icon is-green" aria-hidden="true"><ArrowRight size={17}/></span>
        <span><strong>{quotePending}</strong><small>Por presupuestar</small></span>
      </Link>
      <Link to="/agenda" className="vek2-foot-metric">
        <span className="vek2-foot-icon is-blue" aria-hidden="true"><ArrowRight size={17}/></span>
        <span><strong>{due}</strong><small>Seguimientos vencidos</small></span>
      </Link>
    </div>
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
function InteractiveEvolution({opportunities,quotes}:{opportunities:Opportunity[];quotes:Quote[]}) {
  const [period,setPeriod]=useState<Period>('8 semanas');
  const [hover,setHover]=useState<number|null>(null);
  const points=timeSeries(opportunities,quotes,period);
  const maxValue=Math.max(2,...points.flatMap(p=>[p.consultations,p.quotations]));
  const ceiling=Math.max(4,Math.ceil(maxValue/4)*4);
  const x=(i:number)=>42+i*628/Math.max(points.length-1,1);
  const y=(n:number)=>172-(n/ceiling)*135;
  const consultations=points.map(p=>p.consultations);
  const quotations=points.map(p=>p.quotations);
  const active=hover!==null?points[hover]:null;
  const marker=hover!==null?x(hover):0;
  const tooltipX=Math.max(19,Math.min(81,marker/720*100));
  return <section className="vek2-card vek2-evolution" aria-labelledby="vek2-evolution-heading">
    <div className="vek2-card-heading">
      <div><h2 id="vek2-evolution-heading">Evolución comercial</h2><p>Consultas y presupuestos registrados</p></div>
      <div className="vek2-chart-top-controls">
        <span className="vek2-legend-mark"><i className="is-consultations"/>Consultas</span>
        <span className="vek2-legend-mark"><i className="is-quotations"/>Presupuestos</span>
        <label className="vek2-period"><span className="vek2-sr-only">Periodo de análisis</span>
          <select value={period} onChange={e=>{setPeriod(e.target.value as Period);setHover(null);}}>
            <option value="8 semanas">8 semanas</option><option value="6 meses">6 meses</option>
          </select>
        </label>
      </div>
    </div>
    <div className="vek2-chart-plot">
      <svg viewBox="0 0 720 212" preserveAspectRatio="none" onMouseLeave={()=>setHover(null)} aria-label={'Evolución: '+points.map(p=>p.label+' '+p.consultations+' consultas '+p.quotations+' presupuestos').join('; ')}>
        {[0,1,2,3,4].map(i=><line key={i} x1="42" x2="670" y1={y(ceiling*i/4)} y2={y(ceiling*i/4)} className="vek2-chart-gridline"/>)}
        {hover!==null&&<g aria-hidden="true">
          <rect x={marker-22} y="25" width="44" height="150" fill="#e4f5f8" opacity=".46"/>
          <line x1={marker} x2={marker} y1="22" y2="173" stroke="#8ac9d3" strokeWidth="1" strokeDasharray="4 5"/>
        </g>}
        <path d={smoothLine(consultations,x,y)} className="vek2-line is-consultations"/>
        <path d={smoothLine(quotations,x,y)} className="vek2-line is-quotations"/>
        {points.map((p,i)=><g key={p.label}>
          <text className="vek2-axis-label" x={x(i)} y="203" textAnchor="middle">{p.label}</text>
          <rect x={x(i)-Math.max(21,628/Math.max(points.length-1,1)/2)} y="20"
            width={Math.max(42,628/Math.max(points.length-1,1))} height="155" fill="transparent"
            onMouseEnter={()=>setHover(i)} onMouseMove={()=>setHover(i)}
            onClick={()=>setHover(i)}/>
          <circle cx={x(i)} cy={y(p.consultations)} r={hover===i?6:3.7}
            fill="#17b396" stroke="#fff" strokeWidth="2" tabIndex={0} role="button"
            aria-label={p.label+': '+p.consultations+' consultas y '+p.quotations+' presupuestos'}
            onFocus={()=>setHover(i)} onBlur={()=>setHover(null)}/>
          <circle cx={x(i)} cy={y(p.quotations)} r={hover===i?6:3.7}
            fill="#e1bf43" stroke="#fff" strokeWidth="2"/>
        </g>)}
      </svg>
      {active&&<div className="vek2-chart-tooltip" style={{left:tooltipX+'%'}} role="status">
        <strong>{active.label}</strong>
        <span><i className="is-consultations"/>{active.consultations} consultas</span>
        <span><i className="is-quotations"/>{active.quotations} presupuestos</span>
      </div>}
    </div>
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
  return <section className="hr-right-card hr-calendar vek2-card vek2-calendar" aria-labelledby="hr-calendar-heading">
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
      <span className="hr-selected-tasks">{selectedTasks.length===0 ? 'Sin tareas' : selectedTasks.length + (selectedTasks.length===1?' tarea':' tareas')}</span>
      <Link to={agendaUrl}>Ver agenda <ArrowRight size={13}/></Link>
    </div>
  </section>;
}


export default function Dashboard(){
  const {data}=useCrm();
  return <div className="page page-dashboard dashboard-hr dashboard-vektora vek2-dashboard">
    <div className="vek2-grid">
      <div className="vek2-grid-top">
        <RecentTable opportunities={data.opportunities}/>
        <OpportunityStatus opportunities={data.opportunities} tasks={data.tasks}/>
      </div>
      <div className="vek2-grid-bottom">
        <InteractiveEvolution opportunities={data.opportunities} quotes={data.quotes}/>
        <MiniCalendar tasks={data.tasks}/>
      </div>
    </div>
  </div>;
}
