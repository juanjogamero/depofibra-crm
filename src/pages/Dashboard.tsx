import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, ChevronDown, Download, Inbox,
  MoreHorizontal, PackageCheck, UsersRound
} from 'lucide-react';
import { useCrm } from '../store';
import { dateText, dayDiff, today, type Opportunity, type Task } from '../domain';
import { Initials } from '../ui';

type InboxTab = 'Pendientes' | 'En seguimiento' | 'Presupuestadas' | 'Cerradas';
type ChartPeriod = '8 semanas' | '6 meses';
type DonutPeriod = 'Todas' | 'Últimos 30 días';
type Sample = { label: string; leads: number; tasks: number };
const tabs: InboxTab[] = ['Pendientes', 'En seguimiento', 'Presupuestadas', 'Cerradas'];
const closed = (o: Opportunity) => o.status === 'Aceptada' || o.status === 'Perdida';

function matchTab(o: Opportunity, tab: InboxTab): boolean {
  if (tab === 'Pendientes') return !closed(o);
  if (tab === 'En seguimiento') return o.status === 'Seguimiento';
  if (tab === 'Presupuestadas') return o.status === 'Presupuesto enviado';
  return closed(o);
}

function csvEscape(value: string): string {
  const sanitized = /^[\s]*[=+@\-]/.test(value) ? "'" + value : value;
  return '"' + sanitized.replace(/"/g, '""') + '"';
}

function downloadLeads(items: Opportunity[]) {
  const data = [
    ['Referencia', 'Solicitante', 'Canal', 'Producto', 'Destino', 'Próxima acción', 'Fecha', 'Estado'],
    ...items.map(o => [o.id, o.name, o.channel, o.product, o.destination, o.nextAction, o.nextDate, o.status])
  ];
  const csv = '\uFEFF' + data.map(row => row.map(value => csvEscape(String(value))).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'depofibra-solicitudes-demo.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function age(o: Opportunity): number {
  return Math.max(0, dayDiff(o.createdAt));
}

function AttentionTable({ items }: { items: Opportunity[] }) {
  if (!items.length) {
    return <div className="vek-empty">No hay solicitudes en esta fase. Puedes consultar el resto en Oportunidades.</div>;
  }
  return <div className="vek-table-scroll">
    <table className="vek-table">
      <thead><tr>
        <th scope="col">Solicitante</th>
        <th scope="col">Canal</th>
        <th scope="col">Próxima acción</th>
        <th scope="col">Fecha</th>
        <th scope="col">Antigüedad</th>
      </tr></thead>
      <tbody>{items.map(o => {
        const days = age(o);
        const pct = Math.min(100, (days / 20) * 100);
        const overdue = Boolean(o.nextDate && o.nextDate <= today());
        return <tr key={o.id}>
          <td><Link className="vek-name" to={'/oportunidades/' + o.id} title={o.name}>{o.name}</Link></td>
          <td><span className="vek-channel"><span className={'vek-channel-dot vek-channel-' + o.channel.toLowerCase()}/>{o.channel}</span></td>
          <td className="vek-action"><span title={o.nextAction || 'Sin acción asignada'}>{o.nextAction || 'Pendiente de definir'}</span></td>
          <td><span className={overdue ? 'vek-date vek-date-due' : 'vek-date'}>{o.nextDate ? dateText(o.nextDate) : 'Sin fecha'}</span></td>
          <td>
            <div className="vek-progress" title={days + ' días desde la solicitud. Aviso de revisión a partir de 15–20 días.'}>
              <span className="vek-progress-track"><span className={days >= 15 ? 'vek-progress-fill is-old' : 'vek-progress-fill'} style={{width: pct + '%'}}/></span>
              <span>{days} d</span>
            </div>
          </td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function OpportunityDonut({ items, customers }: { items: Opportunity[]; customers: number }) {
  const segments = [
    {name:'Sin responder', value:items.filter(o => o.status === 'Nueva').length, color:'#002d59'},
    {name:'En gestión', value:items.filter(o => ['Cualificación','Por presupuestar','Seguimiento'].includes(o.status)).length, color:'#1874c9'},
    {name:'Presupuestadas', value:items.filter(o => o.status === 'Presupuesto enviado').length, color:'#7cc4ea'},
    {name:'Cerradas', value:items.filter(closed).length, color:'#cbd8e6'}
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const length = 2 * Math.PI * 74;
  let used = 0;
  return <>
    <div className="vek-donut-content">
      <div className="vek-donut" role="img" aria-label={'Oportunidades: ' + segments.map(s=>s.name + ', ' + s.value).join('; ')}>
        <svg viewBox="0 0 210 210" aria-hidden="true">
          <circle cx="105" cy="105" r="74" stroke="#edf1f6" strokeWidth="29" fill="none"/>
          {total > 0 && segments.filter(s => s.value > 0).map(s => {
            const stroke = s.value / total * length;
            const start = used;
            used += stroke;
            return <circle key={s.name} cx="105" cy="105" r="74" stroke={s.color} strokeWidth="29" fill="none"
              transform="rotate(-90 105 105)" strokeDasharray={stroke + ' ' + (length-stroke)}
              strokeDashoffset={-start} />;
          })}
        </svg>
      </div>
      <div className="vek-donut-legend">
        {segments.map(s=><div key={s.name} className="vek-legend-line"><i style={{backgroundColor:s.color}}/><span>{s.name}</span><strong>{s.value}</strong></div>)}
      </div>
    </div>
    <div className="vek-donut-foot">
      <div><span className="vek-foot-icon"><Inbox size={19}/></span><span><strong>{total}</strong><small>Oportunidades</small></span></div>
      <div><span className="vek-foot-icon"><UsersRound size={19}/></span><span><strong>{customers}</strong><small>Clientes compradores</small></span></div>
    </div>
  </>;
}

function timeSeries(opportunities: Opportunity[], tasks: Task[], period: ChartPeriod): Sample[] {
  if (period === '6 meses') {
    const now = new Date(today() + 'T12:00:00');
    return Array.from({length:6}, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5-i), 1);
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      return {
        label:d.toLocaleDateString('es-ES',{month:'short'}).replace('.',''),
        leads:opportunities.filter(o=>o.createdAt.startsWith(key)).length,
        tasks:tasks.filter(t=>t.due.startsWith(key)).length
      };
    });
  }
  return Array.from({length:8},(_,i)=>{
    const start=(7-i)*7;
    const d=new Date(today()+'T12:00:00');
    d.setDate(d.getDate()-(start+6));
    const label=d.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.','');
    return {label,
      leads:opportunities.filter(o=>dayDiff(o.createdAt)>=start && dayDiff(o.createdAt)<start+7).length,
      tasks:tasks.filter(t=>dayDiff(t.due)>=start && dayDiff(t.due)<start+7).length
    };
  });
}

/** Curva suavizada sin depender de una biblioteca externa de gráficos. */
function smoothPath(coords: {x:number; y:number}[]): string {
  if (!coords.length) return '';
  if (coords.length === 1) return 'M '+coords[0].x+' '+coords[0].y;
  return coords.reduce((path,point,i) => {
    if (i === 0) return 'M '+point.x+' '+point.y;
    const previous=coords[i-1];
    const before=coords[i-2] || previous;
    const after=coords[i+1] || point;
    const cp1x=previous.x+(point.x-before.x)/6;
    const cp1y=previous.y+(point.y-before.y)/6;
    const cp2x=point.x-(after.x-previous.x)/6;
    const cp2y=point.y-(after.y-previous.y)/6;
    return path+' C '+cp1x.toFixed(2)+' '+cp1y.toFixed(2)+' '+cp2x.toFixed(2)+' '+cp2y.toFixed(2)+' '+point.x+' '+point.y;
  },'');
}

function EvolutionChart({ samples }: { samples: Sample[] }) {
  const max=Math.max(3,...samples.flatMap(s=>[s.leads,s.tasks]));
  const left=14,right=676,top=24,bottom=203;
  const positions=samples.map((d,i)=>({
    x:left+(right-left)*i/Math.max(samples.length-1,1),
    leads:bottom-d.leads/max*(bottom-top),
    tasks:bottom-d.tasks/max*(bottom-top),
    label:d.label,
    leadsValue:d.leads,
    tasksValue:d.tasks
  }));
  const leadsPath=smoothPath(positions.map(p=>({x:p.x,y:p.leads})));
  const tasksPath=smoothPath(positions.map(p=>({x:p.x,y:p.tasks})));
  return <div className="vek-chart">
    <svg viewBox="0 0 690 240" preserveAspectRatio="none" role="img"
      aria-label={'Evolución comercial: '+samples.map(s=>s.label+': '+s.leads+' consultas y '+s.tasks+' tareas').join('; ')}>
      {Array.from({length:5},(_,i)=>{
        const y=top+(bottom-top)*i/4;
        return <line key={i} x1={left} x2={right} y1={y} y2={y} className="vek-gridline"/>;
      })}
      <path d={leadsPath} className="vek-line vek-line-navy"/>
      <path d={tasksPath} className="vek-line vek-line-teal"/>
      {positions.map(p=><g key={p.label}>
        <circle cx={p.x} cy={p.leads} r="4.8" className="vek-line-dot"><title>{p.label}: {p.leadsValue} consultas</title></circle>
        <circle cx={p.x} cy={p.tasks} r="3.6" className="vek-line-dot-teal"><title>{p.label}: {p.tasksValue} tareas</title></circle>
        <text x={p.x} y="231" textAnchor="middle" className="vek-axis-label">{p.label}</text>
      </g>)}
    </svg>
  </div>;
}

function AgendaPreview({ tasks }: { tasks: Task[] }) {
  const visible=tasks.filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,4);
  return <div className="vek-agenda-list">
    {visible.length===0 ? <div className="vek-empty">No tienes tareas pendientes para mostrar.</div> :
      visible.map(t=><Link className="vek-agenda-item" key={t.id} to="/agenda" title={'Abrir agenda: '+t.title}>
        <span className="vek-agenda-avatar"><CalendarDays size={17}/></span>
        <span className="vek-agenda-main"><strong>{t.title}</strong><small>{t.context}</small></span>
        <span className="vek-agenda-due"><strong>{t.due ? dateText(t.due) : 'Sin fecha'}</strong><small className={t.due<today()?'is-overdue':t.due===today()?'is-today':''}>{t.due<today()?'Vencida':t.due===today()?'Hoy':'Programada'}</small></span>
        <MoreHorizontal size={17} className="vek-agenda-more"/>
      </Link>)}
  </div>;
}

export default function Dashboard() {
  const {data}=useCrm();
  const [tab,setTab]=useState<InboxTab>('Pendientes');
  const [donutPeriod,setDonutPeriod]=useState<DonutPeriod>('Todas');
  const [chartPeriod,setChartPeriod]=useState<ChartPeriod>('8 semanas');
  const open=data.opportunities.filter(o=>!closed(o));
  const visible=open.length;
  const tableItems=data.opportunities
    .filter(o=>matchTab(o,tab))
    .sort((a,b)=>{
      const dueA=a.nextDate || '9999-12-31';
      const dueB=b.nextDate || '9999-12-31';
      return dueA.localeCompare(dueB) || a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0,4);
  const donutData=donutPeriod==='Todas'?data.opportunities:data.opportunities.filter(o=>dayDiff(o.createdAt)>=0 && dayDiff(o.createdAt)<30);
  const samples=timeSeries(data.opportunities,data.tasks,chartPeriod);

  return <div className="page page-dashboard dashboard-vektora">
    <div className="vek-grid">
      <section className="vek-card vek-attention">
        <div className="vek-card-header">
          <div><h2>Clientes pendientes de respuesta</h2><p>{visible} consultas abiertas · Prioriza las más antiguas</p></div>
          <div className="vek-card-actions">
            <button type="button" className="vek-button vek-button-light" onClick={()=>downloadLeads(tableItems)}><Download size={14}/> Exportar</button>
            <Link className="vek-button vek-button-primary" to="/oportunidades">Ver todos</Link>
          </div>
        </div>
        <div className="vek-tabs" role="tablist" aria-label="Fase de las oportunidades">
          {tabs.map(t=><button key={t} type="button" role="tab" aria-selected={tab===t} className={tab===t?'vek-tab active':'vek-tab'} onClick={()=>setTab(t)}>{t}</button>)}
        </div>
        <AttentionTable items={tableItems}/>
      </section>

      <section className="vek-card vek-statistics">
        <div className="vek-card-header">
          <h2>Estado de oportunidades</h2>
          <label className="vek-select-wrap">
            <span className="sr-only">Período del gráfico circular</span>
            <select value={donutPeriod} onChange={e=>setDonutPeriod(e.target.value as DonutPeriod)} aria-label="Período del estado de oportunidades">
              <option value="Todas">Todas</option><option value="Últimos 30 días">Últimos 30 días</option>
            </select>
            <ChevronDown size={13}/>
          </label>
        </div>
        <OpportunityDonut items={donutData} customers={data.customers.length}/>
      </section>

      <section className="vek-card vek-evolution">
        <div className="vek-card-header">
          <h2>Evolución comercial</h2>
          <div className="vek-chart-controls">
            <span className="vek-chart-legend"><i className="navy"/>Consultas</span>
            <span className="vek-chart-legend"><i className="teal"/>Tareas programadas</span>
            <label className="vek-select-wrap"><span className="sr-only">Período de evolución</span>
              <select value={chartPeriod} onChange={e=>setChartPeriod(e.target.value as ChartPeriod)} aria-label="Período de evolución comercial">
                <option value="8 semanas">8 semanas</option><option value="6 meses">6 meses</option>
              </select><ChevronDown size={13}/>
            </label>
          </div>
        </div>
        <EvolutionChart samples={samples}/>
      </section>

      <section className="vek-card vek-agenda">
        <div className="vek-card-header">
          <div><h2>Agenda y calendario</h2><p>Llamadas y acciones próximas</p></div>
          <Link className="vek-button vek-button-primary" to="/agenda">Ver agenda <ArrowRight size={13}/></Link>
        </div>
        <AgendaPreview tasks={data.tasks}/>
        <div className="vek-agenda-footer">
          <span><Check size={13}/>{data.tasks.filter(t=>t.done).length} completadas</span>
          <span><PackageCheck size={13}/>{data.orders.filter(o=>o.factory!=='Entregado').length} pedidos en curso</span>
        </div>
      </section>
    </div>
  </div>;
}
