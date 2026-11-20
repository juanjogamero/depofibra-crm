import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, FileText, Inbox, Package, Plus, Wallet } from 'lucide-react';
import { useCrm } from '../store';
import { dayDiff, dt, money, dateText, today } from '../domain';
import { ActionLink, Initials, PageHeader, Panel, Pill, Status } from '../ui';

export default function Dashboard() {
  const {data,toggleTask}=useCrm();
  const open=data.opportunities.filter(o=>!['Perdida','Aceptada'].includes(o.status));
  const newCount=data.opportunities.filter(o=>o.status==='Nueva').length;
  const toQuote=data.opportunities.filter(o=>o.status==='Por presupuestar').length;
  const urgentTasks=data.tasks.filter(t=>!t.done&&t.due<=today());
  const comm=data.orders.reduce((s,o)=>s+Math.max(0,o.commission-o.commissionPaid),0);
  const attention=[...open].sort((a,b)=>(a.nextDate&&a.nextDate<=today()?0:1)-(b.nextDate&&b.nextDate<=today()?0:1)||a.createdAt.localeCompare(b.createdAt)).slice(0,4);
  const activeOrders=data.orders.filter(o=>o.factory!=='Entregado').slice(0,3);
  const days=Array.from({length:7},(_,i)=>{const day=dt(i-6);return {day:new Date(day+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short'}).replace('.',''),value:data.opportunities.filter(o=>o.createdAt===day).length}});
  const week=data.opportunities.filter(o=>dayDiff(o.createdAt)>=0&&dayDiff(o.createdAt)<7).length;
  const prev=data.opportunities.filter(o=>dayDiff(o.createdAt)>=7&&dayDiff(o.createdAt)<14).length;
  const growth=prev?Math.round((week-prev)/prev*100):null;
  return <div className="page page-dashboard">
    <PageHeader eyebrow="RESUMEN DIARIO" title="Panel de trabajo" subtitle="Consultas recibidas, tareas prioritarias y pedidos en curso." actions={<Link to="/oportunidades/nueva" className="btn btn-primary"><Plus size={17}/>Registrar solicitud</Link>}/>
    <div className="kpi-grid">
      <div className="kpi kpi-feature"><div className="kpi-top"><span>Solicitudes nuevas</span><span className="kpi-icon"><Inbox size={20}/></span></div><div className="kpi-value">{newCount}<small>sin responder</small></div><div className="kpi-foot"><span className="kpi-micro-dot"/>Consultas recién recibidas</div></div>
      <div className="kpi"><div className="kpi-top"><span>Por presupuestar</span><span className="kpi-icon purple"><FileText size={20}/></span></div><div className="kpi-value">{toQuote}<small>en preparación</small></div><div className="kpi-foot">Solicitudes con precio pendiente</div></div>
      <div className="kpi"><div className="kpi-top"><span>Tareas urgentes</span><span className="kpi-icon amber"><CalendarDays size={20}/></span></div><div className="kpi-value">{urgentTasks.length}<small>vencidas o de hoy</small></div><div className="kpi-foot">Priorizar antes de terminar</div></div>
      <div className="kpi"><div className="kpi-top"><span>Comisiones pendientes</span><span className="kpi-icon teal"><Wallet size={20}/></span></div><div className="kpi-value">{money(comm)}</div><div className="kpi-foot">Saldo interno · datos de ejemplo</div></div>
    </div>
    <div className="dashboard-grid">
      <Panel title="Pendientes de atención" extra={<ActionLink to="/oportunidades">Ver todas</ActionLink>} className="attention-panel">
        <p className="panel-sub">Solicitudes nuevas y seguimientos que requieren respuesta</p>
        <div className="attention-list">{attention.map(o=><Link to={'/oportunidades/'+o.id} className="attention-row" key={o.id}><Initials name={o.name}/><div className="attention-copy"><strong>{o.name}</strong><span>{o.product} · {o.capacity}</span></div><div className="attention-meta"><Status value={o.status}/><small className={o.nextDate&&o.nextDate<today()?'overdue':''}>{o.nextDate&&o.nextDate<=today()?'Necesita atención':o.nextDate?'Próx. '+dateText(o.nextDate):'Sin fecha'}</small></div><ChevronRight size={16} className="muted-icon"/></Link>)}</div>
      </Panel>
      <Panel title="Consultas de la semana" extra={<ActionLink to="/resultados">Ver informe</ActionLink>} className="activity-panel">
        <p className="panel-sub">Evolución de los últimos siete días</p>
        <div className="activity-number"><strong>{week}</strong><span>esta semana</span><Pill tone={growth===null?'neutral':growth>=0?'green':'red'}>{growth===null?'Sin comparación':(growth>=0?'+':'')+growth+' %'}</Pill></div>
        <div className="mini-chart" aria-label="Consultas diarias de los últimos siete días">{days.map((d,i)=><div className="chart-col" key={i}><div className="chart-track"><span className="chart-column" title={d.value+' consultas'} style={{height:Math.max(10,d.value/Math.max(1,...days.map(v=>v.value))*100)+'%'}}/></div><small>{d.day}</small></div>)}</div>
        <div className="activity-bottom"><div><strong>{prev}</strong><span>semana anterior</span></div><div><strong>{data.quotes.filter(q=>dayDiff(q.createdAt)<30).length}</strong><span>presupuestos · 30 días</span></div></div>
      </Panel>

    </div>
    <div className="dashboard-bottom">
      <Panel title="Pedidos en marcha" extra={<ActionLink to="/pedidos">Ver pedidos</ActionLink>} className="orders-widget"><div className="order-strips">{activeOrders.map(o=><Link className="order-strip" to={'/pedidos/'+o.id} key={o.id}><span className="order-strip-icon"><Package size={17}/></span><div><strong>{o.buyerName}</strong><small>{o.capacity} · {o.id}</small></div><Status value={o.factory}/><ChevronRight size={15}/></Link>)}</div></Panel>
      <Panel title="Próximas tareas" extra={<ActionLink to="/agenda">Abrir agenda</ActionLink>} className="tasks-panel">
        <p className="panel-sub">Llamadas y seguimientos</p>
        <div className="dashboard-task-list">{data.tasks.filter(t=>!t.done).slice(0,3).map(t=><label className="task-row" key={t.id}><input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)}/><span><strong>{t.title}</strong><small>{t.context}</small></span><time className={t.due<today()?'overdue':''}>{t.due<today()?'Vencida':t.due===today()?'Hoy':dateText(t.due)}</time></label>)}</div>
      </Panel>
    </div>
  </div>;
}
