import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock, ArrowRight, ChevronLeft, ChevronRight,
  FileText, Inbox, Plus
} from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Quote, type Order, type Task } from '../domain';

type Period = '8 semanas' | '6 meses';
type Series = { label: string; consultations: number; quotations: number };
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
  const statusLabel = value === 0 ? 'Al día' : accent === 'blue' ? 'Nuevo' : accent === 'cyan' ? 'Pendiente' : 'Urgente';
  return <Link className={'hr-stat hr-stat-' + accent + (value === 0 ? ' hr-stat-clear' : '')} to={to}>
    <span className="hr-stat-label">{title}</span>
    <span className="hr-stat-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.85}/></span>
    <span className="hr-stat-bottom">
      <span className="hr-stat-numberline">
        <strong>{value}</strong><span className="hr-stat-badge">{statusLabel}</span>
      </span>
      <small>{hint}</small>
    </span>
  </Link>;
}

type AttentionItem = {
  id: string;
  title: string;
  context: string;
  label: string;
  due?: string;
  tone: 'late' | 'today' | 'new' | 'quote' | 'future';
  to: string;
  priority: number;
};

function shortDashboardDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value + 'T12:00:00');
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
}

function attentionItems(opportunities: Opportunity[], tasks: Task[], orders: Order[]): AttentionItem[] {
  const current = today();
  const pendingTasks = tasks.filter(t => !t.done);
  const taskItems: AttentionItem[] = pendingTasks.map(t => {
    const opportunity = opportunities.find(o => t.context.includes(o.id));
    const order = orders.find(o => t.context.includes(o.id));
    const late = Boolean(t.due && t.due < current);
    const isToday = t.due === current;
    return {
      id: t.id,
      title: t.title,
      context: opportunity ? opportunity.name + ' · ' + opportunity.channel
        : order ? order.buyerName + ' · Pedido'
        : t.context || 'Agenda',
      label: late ? 'Vencida' : isToday ? 'Hoy' : 'Próxima',
      due: t.due || undefined,
      tone: late ? 'late' : isToday ? 'today' : 'future',
      to: opportunity ? '/oportunidades/' + opportunity.id
        : order ? '/pedidos/' + order.id : '/agenda',
      priority: late ? 0 : isToday ? 2 : 5,
    };
  });
  const opportunityItems: AttentionItem[] = opportunities
    .filter(o =>
      (o.status === 'Nueva' || o.status === 'Por presupuestar')
      && !pendingTasks.some(t => t.context.includes(o.id))
    )
    .map(o => {
      const late = Boolean(o.nextDate && o.nextDate < current);
      const isNew = o.status === 'Nueva';
      return {
        id: o.id,
        title: o.nextAction.trim() || (isNew ? 'Responder solicitud' : 'Preparar presupuesto'),
        context: o.name + ' · ' + o.channel,
        label: late ? 'Vencida' : isNew ? 'Sin responder' : 'Por presupuestar',
        due: o.nextDate || undefined,
        tone: late ? 'late' : isNew ? 'new' : 'quote',
        to: '/oportunidades/' + o.id,
        priority: late ? 0 : isNew ? 1 : 3,
      };
    });
  return [...taskItems, ...opportunityItems].sort((a, b) =>
    a.priority - b.priority
    || (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31')
    || a.id.localeCompare(b.id)
  );
}

function PriorityWork({ opportunities, tasks, orders }: {
  opportunities: Opportunity[];
  tasks: Task[];
  orders: Order[];
}) {
  const items = attentionItems(opportunities, tasks, orders);
  return <section className="hr-panel hr-workpanel hr-priorities" aria-labelledby="hr-priorities-heading">
    <div className="hr-panel-heading">
      <div>
        <h2 id="hr-priorities-heading">Qué atender ahora</h2>
        <p>Respuestas y acciones pendientes, por prioridad</p>
      </div>
      <span className="hr-work-count" aria-label={items.length + ' pendientes'}>{items.length}</span>
    </div>
    <div className="hr-work-list">
      {items.length ? items.slice(0, 3).map(item =>
        <Link className="hr-work-row" key={item.id} to={item.to}>
          <span className={'hr-work-accent is-' + item.tone} aria-hidden="true"/>
          <span className="hr-work-content">
            <strong title={item.title}>{item.title}</strong>
            <small title={item.context}>{item.context}</small>
          </span>
          <span className="hr-work-aside">
            <span className={'hr-work-status is-' + item.tone}>{item.label}</span>
            {item.due && <time dateTime={item.due}>{shortDashboardDate(item.due)}</time>}
          </span>
        </Link>
      ) : <div className="hr-work-empty">No hay acciones comerciales pendientes.</div>}
    </div>
    <div className="hr-work-footer">
      <Link to="/agenda">Abrir agenda <ArrowRight size={14}/></Link>
      <Link to="/oportunidades">Ver solicitudes <ArrowRight size={14}/></Link>
    </div>
  </section>;
}

function QuoteFollowUps({ opportunities, quotes }: { opportunities: Opportunity[]; quotes: Quote[] }) {
  const candidates = quotes
    .filter(q => {
      const opportunity = opportunities.find(o => o.id === q.opportunityId);
      return q.status === 'Enviado'
        && opportunity?.status !== 'Aceptada'
        && opportunity?.status !== 'Perdida';
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 3);

  return <section className="hr-panel hr-workpanel hr-followups" aria-labelledby="hr-followups-heading">
    <div className="hr-panel-heading">
      <div>
        <h2 id="hr-followups-heading">Presupuestos enviados</h2>
        <p>Para revisar y recuperar oportunidades</p>
      </div>
      <Link to="/presupuestos" aria-label="Ver todos los presupuestos"><ArrowRight size={17}/></Link>
    </div>
    <div className="hr-follow-list">
      {candidates.length ? candidates.map(q => {
        const opportunity = opportunities.find(o => o.id === q.opportunityId);
        return <Link className="hr-follow-row" key={q.id} to={'/presupuestos/' + q.id}>
          <span className="hr-follow-content">
            <strong title={q.name}>{q.name}</strong>
            <small title={q.product}>{q.product}</small>
            <span className="hr-follow-action" title={opportunity?.nextAction || 'Sin próxima acción registrada'}>
              {opportunity?.nextAction ? 'Siguiente: ' + opportunity.nextAction : 'Sin próxima acción registrada'}
            </span>
          </span>
          <span className="hr-follow-aside">
            <span className="hr-follow-tag">Enviado</span>
            <time dateTime={q.createdAt} title={'Presupuesto registrado: ' + dateText(q.createdAt)}>
              {shortDashboardDate(q.createdAt)}
            </time>
          </span>
        </Link>;
      }) : <div className="hr-work-empty">No hay presupuestos enviados pendientes de revisión.</div>}
    </div>
    <Link to="/presupuestos" className="hr-work-footer hr-follow-footer">
      Ver todos los presupuestos <ArrowRight size={14}/>
    </Link>
  </section>;
}

function requestInitials(name: string): string {
  const words = name.replace(/\s*·\s*ejemplo$/i, '').trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? (words[0][0] + words[words.length - 1][0]).toLocaleUpperCase('es-ES')
    : (words[0] || '?').slice(0, 2).toLocaleUpperCase('es-ES');
}

function requestDate(o: Opportunity) {
  const received = o.receivedAt ? new Date(o.receivedAt) : null;
  const hasTime = received !== null && !Number.isNaN(received.getTime());
  const date = hasTime ? received! : new Date(o.createdAt + 'T12:00:00');
  return {
    shortDate: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''),
    shortTime: hasTime ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
    fullDate: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

function RecentRequests({ opportunities }: { opportunities: Opportunity[] }) {
  const recent = [...opportunities]
    .sort((a, b) => (b.receivedAt || b.createdAt).localeCompare(a.receivedAt || a.createdAt))
    .slice(0, 4);
  return <section className="hr-right-card hr-recent" aria-labelledby="hr-recent-heading">
    <div className="hr-panel-heading">
      <div><h2 id="hr-recent-heading">Últimas solicitudes</h2><p>Entradas recientes por canal</p></div>
      <Link to="/oportunidades" aria-label="Ver todas las solicitudes"><ArrowRight size={17}/></Link>
    </div>
    <div className="hr-recent-list">
      {recent.length ? recent.map(o => {
        const when = requestDate(o);
        return <Link key={o.id} to={'/oportunidades/' + o.id} className="hr-recent-row"
          aria-label={'Abrir solicitud de ' + o.name + ', ' + o.channel + ', ' + when.fullDate + (when.shortTime ? ' a las ' + when.shortTime : '')}>
          <span className="hr-recent-avatar" aria-hidden="true">{requestInitials(o.name)}</span>
          <span className="hr-recent-main"><strong title={o.name}>{o.name}</strong><small>{o.channel}</small></span>
          <time className="hr-recent-date" dateTime={o.receivedAt || o.createdAt} title={when.fullDate}>
            <span>{when.shortDate}</span>
            {when.shortTime && <small>{when.shortTime}</small>}
          </time>
        </Link>;
      }) : <div className="hr-empty">Todavía no hay solicitudes registradas.</div>}
    </div>
    <Link className="hr-recent-footer" to="/oportunidades">Ver todas las solicitudes <ArrowRight size={16}/></Link>
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
          <PriorityWork opportunities={data.opportunities} tasks={data.tasks} orders={data.orders}/>
          <QuoteFollowUps opportunities={data.opportunities} quotes={data.quotes}/>
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
      <aside className="hr-side-column" aria-label="Solicitudes recientes y calendario">
        <div className="hr-side-top">
          <span>Planificación</span>
          <Link to="/oportunidades/nueva"><Plus size={16}/> Nueva solicitud</Link>
        </div>
        <RecentRequests opportunities={data.opportunities}/>
        <MiniCalendar tasks={data.tasks}/>
      </aside>
    </div>
  </div>;
}
