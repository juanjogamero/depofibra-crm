import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock, ArrowRight, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardList, FileText, Inbox, Plus
} from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Quote, type Order, type Task } from '../domain';

type Period = '8 semanas' | '6 meses';
type Series = { label: string; consultations: number; quotations: number };
type StatusSlice = { label: string; count: number; color: string };

const isClosed = (o: Opportunity) => o.status === 'Aceptada' || o.status === 'Perdida';

function makeKey(year: number, month: number, date: number) {
  return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(date).padStart(2, '0');
}

function timeSeries(opportunities: Opportunity[], quotes: Quote[], period: Period): Series[] {
  if (period === '6 meses') {
    const now = new Date(today() + 'T12:00:00');
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const prefix = makeKey(month.getFullYear(), month.getMonth(), 1).slice(0, 7);
      return {
        label: month.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
        consultations: opportunities.filter(o => o.createdAt.startsWith(prefix)).length,
        quotations: quotes.filter(q => q.createdAt.startsWith(prefix)).length,
      };
    });
  }
  return Array.from({ length: 8 }, (_, index) => {
    const age = (7 - index) * 7;
    const start = new Date(today() + 'T12:00:00');
    start.setDate(start.getDate() - age - 6);
    return {
      label: start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''),
      consultations: opportunities.filter(o => dayDiff(o.createdAt) >= age && dayDiff(o.createdAt) < age + 7).length,
      quotations: quotes.filter(q => dayDiff(q.createdAt) >= age && dayDiff(q.createdAt) < age + 7).length,
    };
  });
}

function DashboardBars({ points }: { points: Series[] }) {
  const largest = Math.max(2, ...points.flatMap(p => [p.consultations, p.quotations]));
  const ceiling = Math.ceil(largest / 4) * 4 || 4;
  const top = 18;
  const bottom = 223;
  const xStart = 53;
  const totalWidth = 705;
  const groupWidth = totalWidth / Math.max(points.length, 1);
  const barWidth = Math.min(22, groupWidth * .27);
  const ticks = [0, 1, 2, 3, 4];

  return <div className="hr-bars-area">
    <svg viewBox="0 0 800 270" preserveAspectRatio="none" role="img"
      aria-label={'Evolución de consultas y presupuestos: ' + points.map(p => p.label + ', ' + p.consultations + ' consultas y ' + p.quotations + ' presupuestos').join('; ')}>
      {ticks.map(t => {
        const value = ceiling * t / 4;
        const y = bottom - (value / ceiling) * (bottom - top);
        return <g key={t}>
          <line x1={xStart} y1={y} x2={xStart + totalWidth} y2={y} className="hr-chart-gridline"/>
          <text x={xStart - 13} y={y + 4} textAnchor="end" className="hr-chart-tick">{value}</text>
        </g>;
      })}
      {points.map((p, i) => {
        const cx = xStart + groupWidth * (i + .5);
        const firstH = (p.consultations / ceiling) * (bottom - top);
        const secondH = (p.quotations / ceiling) * (bottom - top);
        return <g key={p.label}>
          <rect x={cx - barWidth - 3} y={bottom - firstH} width={barWidth} height={firstH} rx="6" className="hr-bar-consultations">
            <title>{p.label}: {p.consultations} consultas</title>
          </rect>
          <rect x={cx + 3} y={bottom - secondH} width={barWidth} height={secondH} rx="6" className="hr-bar-quotes">
            <title>{p.label}: {p.quotations} presupuestos</title>
          </rect>
          <text x={cx} y="251" textAnchor="middle" className="hr-chart-label">{p.label}</text>
        </g>;
      })}
    </svg>
  </div>;
}

function QuickStat({ icon: Icon, title, value, hint, accent, to }: {
  icon: typeof Inbox;
  title: string;
  value: number;
  hint: string;
  accent: 'blue' | 'cyan' | 'amber';
  to: string;
}) {
  return <Link className={'hr-stat hr-stat-' + accent} to={to}>
    <span className="hr-stat-label">{title}</span>
    <span className="hr-stat-icon"><Icon size={22} strokeWidth={1.8}/></span>
    <span className="hr-stat-bottom">
      <strong>{value}</strong>
      <small>{hint}</small>
    </span>
  </Link>;
}

function CommercialRows({ opportunities, quotes }: { opportunities: Opportunity[]; quotes: Quote[] }) {
  const oppMetrics = [
    { title: 'Nuevas', n: opportunities.filter(o => o.status === 'Nueva').length },
    { title: 'En seguimiento', n: opportunities.filter(o => o.status === 'Seguimiento').length },
    { title: 'Presupuestadas', n: opportunities.filter(o => o.status === 'Presupuesto enviado').length },
  ];
  const quoteMetrics = [
    { title: 'Borradores', n: quotes.filter(q => q.status === 'Borrador').length },
    { title: 'Enviados', n: quotes.filter(q => q.status === 'Enviado').length },
    { title: 'Aceptados', n: quotes.filter(q => q.status === 'Aceptado').length },
  ];
  return <section className="hr-panel hr-activity" aria-labelledby="hr-activity-heading">
    <div className="hr-panel-heading">
      <h2 id="hr-activity-heading">Actividad comercial</h2>
      <Link to="/oportunidades">Ver todas <ArrowRight size={15}/></Link>
    </div>
    <div className="hr-activity-groups">
      <div className="hr-activity-group">
        <Link to="/oportunidades" className="hr-group-title">Solicitudes <ArrowRight size={13}/></Link>
        <div className="hr-metric-band">
          {oppMetrics.map(m => <div className="hr-band-cell" key={m.title}>
            <strong>{m.n}</strong><span>{m.title}</span>
          </div>)}
        </div>
      </div>
      <div className="hr-activity-group">
        <Link to="/presupuestos" className="hr-group-title">Presupuestos <ArrowRight size={13}/></Link>
        <div className="hr-metric-band">
          {quoteMetrics.map(m => <div className="hr-band-cell" key={m.title}>
            <strong>{m.n}</strong><span>{m.title}</span>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}

function OpportunityDonut({ opportunities }: { opportunities: Opportunity[] }) {
  const slices: StatusSlice[] = [
    { label:'Sin responder', count:opportunities.filter(o=>o.status==='Nueva').length, color:'#01488e' },
    { label:'En gestión', count:opportunities.filter(o=>['Cualificación','Por presupuestar','Seguimiento'].includes(o.status)).length, color:'#638ca4' },
    { label:'Presupuestadas', count:opportunities.filter(o=>o.status==='Presupuesto enviado').length, color:'#c7a262' },
    { label:'Cerradas', count:opportunities.filter(isClosed).length, color:'#d2dae0' },
  ];
  const total = slices.reduce((n, x) => n + x.count, 0);
  const length = Math.PI * 2 * 65;
  let offset = 0;
  return <section className="hr-panel hr-opportunities" aria-labelledby="hr-status-heading">
    <div className="hr-panel-heading">
      <h2 id="hr-status-heading">Estado de oportunidades</h2>
      <Link to="/oportunidades" aria-label="Abrir oportunidades"><ArrowRight size={16}/></Link>
    </div>
    <div className="hr-donut-layout">
      <div className="hr-donut" role="img"
        aria-label={'Total ' + total + ' oportunidades: ' + slices.map(s=>s.label + ' ' + s.count).join(', ')}>
        <svg viewBox="0 0 190 190" aria-hidden="true">
          <circle cx="95" cy="95" r="65" fill="none" stroke="#e8f0f6" strokeWidth="20"/>
          {total > 0 && slices.filter(s=>s.count > 0).map(s => {
            const piece = s.count / total * length;
            const current = offset;
            offset += piece;
            return <circle key={s.label} cx="95" cy="95" r="65" fill="none"
              stroke={s.color} strokeWidth="20"
              strokeDasharray={piece + ' ' + (length - piece)}
              strokeDashoffset={-current} transform="rotate(-90 95 95)"/>;
          })}
        </svg>
        <div className="hr-donut-center"><strong>{total}</strong><span>consultas</span></div>
      </div>
      <div className="hr-donut-legend">
        {slices.map(s => <div className="hr-legend-row" key={s.label}>
          <i style={{backgroundColor:s.color}}/><span>{s.label}</span><strong>{s.count}</strong>
        </div>)}
      </div>
    </div>
  </section>;
}

function taskDestination(task: Task, opportunities: Opportunity[], orders: Order[]): string {
  const opp = opportunities.find(o => task.context.includes(o.id));
  if (opp) return '/oportunidades/' + opp.id;
  const order = orders.find(o => task.context.includes(o.id));
  if (order) return '/pedidos/' + order.id;
  return '/agenda';
}

function PendingActions({ tasks, opportunities, orders }: { tasks: Task[]; opportunities: Opportunity[]; orders: Order[] }) {
  const upcoming = tasks.filter(t => !t.done)
    .slice().sort((a,b)=>a.due.localeCompare(b.due))
    .slice(0,4);
  return <section className="hr-right-card hr-tasks" aria-labelledby="hr-tasks-heading">
    <div className="hr-panel-heading">
      <div><h2 id="hr-tasks-heading">Próximas acciones</h2><p>Llamadas y seguimientos</p></div>
      <Link to="/agenda" aria-label="Abrir agenda"><CalendarDays size={17}/></Link>
    </div>
    <div className="hr-tasks-list">
      {upcoming.length ? upcoming.map(t => {
        const initials = t.context.startsWith('OP-') ? 'OP' : t.context.startsWith('PED-') ? 'PD' : 'TA';
        const state = t.due < today() ? 'Vencida' : t.due === today() ? 'Hoy' : 'Pendiente';
        return <Link key={t.id} to={taskDestination(t,opportunities,orders)} className="hr-task-row">
          <span className="hr-task-avatar" aria-hidden="true">{initials}</span>
          <span className="hr-task-main"><strong>{t.title}</strong><small>{t.context}</small></span>
          <span className="hr-task-date"><strong>{dateText(t.due)}</strong><small className={state==='Vencida'?'is-late':''}>{state}</small></span>
        </Link>;
      }) : <div className="hr-empty">No hay acciones pendientes.</div>}
    </div>
    <Link className="hr-tasks-footer" to="/agenda"><Plus size={16}/> Abrir agenda y añadir tarea</Link>
  </section>;
}

function MiniCalendar({ tasks }: { tasks: Task[] }) {
  const base = new Date(today()+'T12:00:00');
  const [month, setMonth] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const year = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(year,m,1).getDay()+6)%7;
  const dayCount = new Date(year,m+1,0).getDate();
  const positions = Math.ceil((offset + dayCount)/7)*7;
  const selectedTasks = tasks.filter(t=>!t.done && t.due===selected);
  const monthTitle = month.toLocaleDateString('es-ES', { month:'long', year:'numeric' });
  const weekdays = ['L','M','X','J','V','S','D'];
  const move = (delta:number) => {
    const next = new Date(year,m+delta,1);
    setMonth(next);
    setSelected(makeKey(next.getFullYear(),next.getMonth(),1));
  };
  return <section className="hr-right-card hr-calendar" aria-labelledby="hr-calendar-heading">
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
        const count=tasks.filter(t=>!t.done&&t.due===date).length;
        const classes='hr-calendar-day'+(date===today()?' is-today':'')+(date===selected?' is-selected':'');
        return <button key={date} type="button" className={classes} onClick={()=>setSelected(date)}
          aria-label={day+' de '+monthTitle+(count?', '+count+' tareas':'')} aria-pressed={date===selected}>
          <span>{day}</span>{count>0&&<i aria-hidden="true"/>}
        </button>;
      })}
    </div>
    <div className="hr-calendar-footer">
      <span className="hr-selected-date">{dateText(selected)}</span>
      <span className="hr-selected-tasks">{selectedTasks.length===0 ? 'Sin tareas' : selectedTasks.length + (selectedTasks.length===1?' tarea':' tareas')}</span>
      <Link to="/agenda">Ver agenda <ArrowRight size={13}/></Link>
    </div>
  </section>;
}

function greeting() {
  const h=new Date().getHours();
  return h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches';
}

export default function Dashboard() {
  const {data}=useCrm();
  const [period,setPeriod]=useState<Period>('8 semanas');
  const newLeads=data.opportunities.filter(o=>o.status==='Nueva').length;
  const forQuote=data.opportunities.filter(o=>o.status==='Por presupuestar').length;
  const overdue=data.tasks.filter(t=>!t.done && t.due<today()).length;
  const periods=timeSeries(data.opportunities,data.quotes,period);
  return <div className="page page-dashboard dashboard-hr">
    <div className="hr-workspace">
      <div className="hr-main-column">
        <div className="hr-greeting">
          <div><h1>{greeting()} <span aria-hidden="true">👋</span></h1>
            <p>Tu actividad comercial, de un vistazo.</p></div>
          <span className="hr-current-date">{new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</span>
        </div>
        <div className="hr-stats">
          <QuickStat icon={Inbox} title="Sin responder" value={newLeads} hint="Solicitudes nuevas" accent="blue" to="/oportunidades"/>
          <QuickStat icon={FileText} title="Por presupuestar" value={forQuote} hint="Precios pendientes" accent="cyan" to="/presupuestos"/>
          <QuickStat icon={AlarmClock} title="Seguimientos vencidos" value={overdue} hint={overdue?'Requieren atención':'Al día'} accent="amber" to="/agenda"/>
        </div>
        <div className="hr-center-panels">
          <CommercialRows opportunities={data.opportunities} quotes={data.quotes}/>
          <OpportunityDonut opportunities={data.opportunities}/>
        </div>
        <section className="hr-panel hr-chart-panel" aria-labelledby="hr-chart-heading">
          <div className="hr-panel-heading">
            <h2 id="hr-chart-heading">Evolución comercial</h2>
            <div className="hr-chart-controls">
              <span className="hr-chart-legend"><i className="hr-dot-leads"/>Consultas</span>
              <span className="hr-chart-legend"><i className="hr-dot-quotes"/>Presupuestos</span>
              <label className="hr-period">
                <span className="sr-only">Período de evolución comercial</span>
                <select value={period} onChange={e=>setPeriod(e.target.value as Period)}>
                  <option value="8 semanas">8 semanas</option>
                  <option value="6 meses">6 meses</option>
                </select>
              </label>
            </div>
          </div>
          <DashboardBars points={periods}/>
        </section>
      </div>
      <aside className="hr-side-column" aria-label="Agenda y calendario">
        <div className="hr-side-top">
          <span>Planificación</span>
          <Link to="/oportunidades/nueva"><Plus size={16}/> Nueva solicitud</Link>
        </div>
        <PendingActions tasks={data.tasks} opportunities={data.opportunities} orders={data.orders}/>
        <MiniCalendar tasks={data.tasks}/>
      </aside>
    </div>
  </div>;
}
