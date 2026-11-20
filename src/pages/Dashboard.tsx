import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock,
  CheckCircle2, FileText, Inbox, PackageCheck, Plus,
  TrendingUp, UsersRound
} from 'lucide-react';
import { useCrm } from '../store';
import { dayDiff, dateText, today } from '../domain';
import { Initials, Status } from '../ui';

type Bucket = { label: string; value: number };
type Filter = 'Todas' | 'Pendientes' | 'Cerradas';
type Period = 'semanas' | 'meses';
type SimpleOpportunity = { createdAt: string };

/** Últimas ocho ventanas móviles de siete días (incluida la semana actual). */
function weeklyBuckets(items: SimpleOpportunity[]): Bucket[] {
  const now = new Date(today() + 'T12:00:00').getTime();
  const oneDay = 86400000;
  return Array.from({ length: 8 }, (_, index) => {
    const age = (7 - index) * 7;
    const start = new Date(now - (age + 6) * oneDay);
    return {
      label: start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''),
      value: items.filter(o => {
        const days = dayDiff(o.createdAt);
        return days >= age && days < age + 7;
      }).length
    };
  });
}

function monthlyBuckets(items: SimpleOpportunity[]): Bucket[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0');
    return {
      label: month.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
      value: items.filter(o => o.createdAt.startsWith(key)).length
    };
  });
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="dash-delta dash-delta-neutral">Sin comparación anterior</span>;
  }
  const variation = Math.round(((current - previous) / previous) * 100);
  const isPositive = variation >= 0;
  return <span className={'dash-delta '+(isPositive?'dash-delta-positive':'dash-delta-negative')}>
    {isPositive ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
    {isPositive?'+':''}{variation} % respecto a la semana anterior
  </span>;
}

function StatCard({
  title, value, helper, icon: Icon, tone, to, delta
}: {
  title: string; value: string | number; helper: string; icon: typeof Inbox;
  tone: 'blue' | 'teal' | 'indigo' | 'sky'; to: string; delta?: React.ReactNode;
}) {
  return <Link to={to} className={'dash-ref-stat dash-ref-stat-'+tone}>
    <span className="dash-ref-stat-accent" aria-hidden="true"/>
    <div className="dash-ref-stat-top">
      <span>{title}</span>
      <span className="dash-ref-stat-icon"><Icon size={18} strokeWidth={1.85}/></span>
    </div>
    <strong className="dash-ref-stat-value">{value}</strong>
    <div className="dash-ref-stat-foot">{delta || <span>{helper}</span>}</div>
  </Link>;
}

function StatusDonut({
  newItems, inProgress, closed
}: { newItems:number; inProgress:number; closed:number }) {
  const segments = [
    { name:'Nuevas', value:newItems, color:'#3156af' },
    { name:'En gestión', value:inProgress, color:'#002d59' },
    { name:'Cerradas', value:closed, color:'#e4e9f1' }
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);
  const circumference = 2 * Math.PI * 73;
  let offset = 0;
  return <div className="dash-ref-donut-layout">
    <div className="dash-ref-donut-figure" role="img" aria-label={'Distribución de '+total+' oportunidades: '+segments.map(s=>s.name+' '+s.value).join(', ')}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="73" fill="none" stroke="#edf0f5" strokeWidth="25"/>
        {total > 0 && segments.filter(s => s.value > 0).map(s => {
          const length = circumference * s.value / total;
          const segmentOffset = offset;
          offset += length;
          return <circle key={s.name} cx="100" cy="100" r="73" fill="none"
            stroke={s.color} strokeWidth="25"
            strokeDasharray={length+' '+(circumference-length)}
            strokeDashoffset={-segmentOffset}
            transform="rotate(-90 100 100)" />;
        })}
      </svg>
      <div className="dash-ref-donut-centre">
        <strong>{total}</strong>
        <span>consultas</span>
      </div>
    </div>
    <div className="dash-ref-donut-legend">
      {segments.map(s => <div className="dash-ref-legend-row" key={s.name}>
        <div className="dash-ref-legend-name"><i style={{background:s.color}}/>{s.name}</div>
        <strong>{s.value}</strong>
      </div>)}
    </div>
  </div>;
}

function TrendsChart({ data, period }: { data:Bucket[]; period:Period }) {
  const left=39, right=690, top=18, bottom=206;
  const largest=Math.max(1,...data.map(x=>x.value));
  const scaleMax=Math.max(3,Math.ceil(largest*1.2));
  const points=data.map((d,index)=>({
    ...d,
    x:left+((right-left)*index/Math.max(1,data.length-1)),
    y:bottom-(d.value/scaleMax)*(bottom-top)
  }));
  const line=points.map((p,index)=>(index===0?'M ':'L ')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
  const area=line+' L '+right+' '+bottom+' L '+left+' '+bottom+' Z';
  const ticks=[0,1,2,3,4];
  const total=data.reduce((sum,x)=>sum+x.value,0);
  return <div className="dash-ref-trend-wrapper">
    <svg className="dash-ref-trend-svg" viewBox="0 0 720 250" preserveAspectRatio="none" role="img"
      aria-label={'Consultas '+(period==='semanas'?'semanales':'mensuales')+': '+data.map(x=>x.label+' '+x.value).join('; ')}>
      <defs>
        <linearGradient id="dash-ref-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5e7ccd" stopOpacity=".23"/>
          <stop offset="100%" stopColor="#5e7ccd" stopOpacity=".025"/>
        </linearGradient>
      </defs>
      {ticks.map(tick=>{
        const y=bottom-tick/4*(bottom-top);
        return <g key={tick}>
          <line x1={left} y1={y} x2={right} y2={y} stroke="#e8ecf3" strokeWidth="1"/>
          <text x="30" y={y+4} textAnchor="end" fill="#9aa5b4" fontSize="11">{Math.round(tick/4*scaleMax)}</text>
        </g>;
      })}
      {points.map((p,index)=><line key={'grid-'+index} x1={p.x} y1={top} x2={p.x} y2={bottom} stroke="#f0f2f6" strokeWidth="1"/>)}
      <path d={area} fill="url(#dash-ref-area)"/>
      <path d={line} fill="none" stroke="#3158aa" strokeWidth="2.8"
        strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p,index)=><g key={index}>
        <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#3158aa" strokeWidth="2.5">
          <title>{p.label}: {p.value} consultas</title>
        </circle>
        <text x={p.x} y="235" textAnchor="middle" fontSize="11" fill="#8b97a7">{p.label}</text>
      </g>)}
    </svg>
    <div className="dash-ref-chart-foot">
      <span><i className="dash-ref-series-dot"/> Consultas registradas</span>
      <strong>{total} en el período</strong>
    </div>
  </div>;
}

export default function Dashboard() {
  const { data }=useCrm();
  const [period,setPeriod]=useState<Period>('semanas');
  const [filter,setFilter]=useState<Filter>('Todas');

  const open=data.opportunities.filter(o=>!['Aceptada','Perdida'].includes(o.status));
  const newCount=data.opportunities.filter(o=>o.status==='Nueva').length;
  const forQuote=data.opportunities.filter(o=>o.status==='Por presupuestar').length;
  const urgentLeads=open.filter(o=>o.nextDate && o.nextDate<=today()).length;
  const activeOrders=data.orders.filter(o=>o.factory!=='Entregado').length;
  const finished=data.opportunities.filter(o=>['Aceptada','Perdida'].includes(o.status)).length;
  const week=data.opportunities.filter(o=>dayDiff(o.createdAt)>=0 && dayDiff(o.createdAt)<7).length;
  const previousWeek=data.opportunities.filter(o=>dayDiff(o.createdAt)>=7 && dayDiff(o.createdAt)<14).length;
  const overdueTasks=data.tasks.filter(t=>!t.done && t.due<=today()).length;
  const dataChart=period==='semanas'?weeklyBuckets(data.opportunities):monthlyBuckets(data.opportunities);

  const filtered=data.opportunities
    .filter(o=>filter==='Todas'||(filter==='Pendientes'?!['Aceptada','Perdida'].includes(o.status):['Aceptada','Perdida'].includes(o.status)))
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))
    .slice(0,4);

  return <div className="page page-dashboard dashboard-reference">
    <div className="dash-ref-heading">
      <div>
        <h1>Resumen de actividad</h1>
        <p>Lo nuevo, lo pendiente y la evolución de tus consultas.</p>
      </div>
      <div className="dash-ref-heading-actions">
        <span className="dash-ref-today"><CalendarClock size={15}/>{new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</span>
        <Link to="/oportunidades/nueva" className="btn btn-primary"><Plus size={16}/>Nueva solicitud</Link>
      </div>
    </div>

    <div className="dash-ref-stats">
      <StatCard title="Consultas esta semana" value={week} helper="Solicitudes recibidas"
        icon={Inbox} tone="indigo" to="/oportunidades" delta={<Delta current={week} previous={previousWeek}/>}/>
      <StatCard title="Sin responder" value={newCount} helper="Nuevas solicitudes pendientes"
        icon={UsersRound} tone="teal" to="/oportunidades"/>
      <StatCard title="Por presupuestar" value={forQuote} helper="Esperando precio comercial"
        icon={FileText} tone="blue" to="/presupuestos"/>
      <StatCard title="Seguimientos urgentes" value={urgentLeads} helper={overdueTasks+' tarea(s) vencidas o de hoy'}
        icon={CalendarClock} tone="sky" to="/agenda"/>
    </div>

    <div className="dash-ref-middle">
      <section className="dash-ref-panel dash-ref-status-panel">
        <div className="dash-ref-panel-head">
          <h2>Estado de las solicitudes</h2>
          <Link to="/oportunidades" title="Ver todas las oportunidades" aria-label="Ver todas las oportunidades" className="dash-ref-more">•••</Link>
        </div>
        <StatusDonut newItems={newCount} inProgress={open.length-newCount} closed={finished}/>
      </section>
      <section className="dash-ref-panel dash-ref-trends-panel">
        <div className="dash-ref-panel-head">
          <h2>Evolución comercial</h2>
          <div className="dash-ref-panel-actions">
            <label className="dash-ref-period-label">
              <span className="sr-only">Período del gráfico</span>
              <select value={period} onChange={e=>setPeriod(e.target.value as Period)} aria-label="Período del gráfico">
                <option value="semanas">Últimas 8 semanas</option>
                <option value="meses">Últimos 6 meses</option>
              </select>
            </label>
            <Link to="/resultados" title="Abrir resultados" aria-label="Abrir resultados" className="dash-ref-more">•••</Link>
          </div>
        </div>
        <TrendsChart data={dataChart} period={period}/>
      </section>
    </div>

    <section className="dash-ref-panel dash-ref-table-panel">
      <div className="dash-ref-panel-head">
        <div>
          <h2>Solicitudes recientes</h2>
          <span className="dash-ref-table-hint">Últimas consultas registradas</span>
        </div>
        <div className="dash-ref-panel-actions">
          <label className="dash-ref-filter-label">
            <span className="sr-only">Filtrar solicitudes</span>
            <select value={filter} onChange={e=>setFilter(e.target.value as Filter)} aria-label="Filtrar solicitudes">
              <option value="Todas">Todas</option>
              <option value="Pendientes">Pendientes</option>
              <option value="Cerradas">Cerradas</option>
            </select>
          </label>
          <Link className="dash-ref-see-all" to="/oportunidades">Ver todas <ArrowRight size={14}/></Link>
        </div>
      </div>
      <div className="dash-ref-table-wrap">
        <table className="dash-ref-table">
          <thead><tr>
            <th scope="col">Referencia</th><th scope="col">Solicitante</th>
            <th scope="col">Producto</th><th scope="col">Canal</th>
            <th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col">Ficha</th>
          </tr></thead>
          <tbody>{filtered.map(o=><tr key={o.id}>
            <td className="dash-ref-id">{o.id}</td>
            <td><Link className="dash-ref-person" to={'/oportunidades/'+o.id}><Initials name={o.name}/><span>{o.name}</span></Link></td>
            <td className="dash-ref-product">{o.product}<small>{o.capacity}</small></td>
            <td>{o.channel}</td>
            <td className="dash-ref-date">{dateText(o.createdAt)}</td>
            <td><Status value={o.status}/></td>
            <td><Link className="dash-ref-row-action" to={'/oportunidades/'+o.id} aria-label={'Abrir '+o.name}>Ver <ArrowRight size={13}/></Link></td>
          </tr>)}
          {filtered.length===0&&<tr><td colSpan={7} className="dash-ref-table-empty">No hay solicitudes que coincidan con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="dash-ref-table-bottom">
        <span>Mostrando {filtered.length} de {data.opportunities.length} solicitudes · Demo</span>
        <span><CheckCircle2 size={13}/> Datos ficticios · Sin conexión al servidor</span>
      </div>
    </section>
  </div>;
}
