import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, CalendarDays, CheckCircle2, CircleAlert,
  FileText, Inbox, Layers3, MapPin, Package, Search, TrendingUp, Users
} from 'lucide-react';
import { useCrm } from '../store';
import { money, today, type Channel, type Opportunity, type Order, type Quote, type CrmState } from '../domain';

type Period = 'all' | '30' | '90' | '365';
type Count = { label: string; count: number };
type TrendPoint = { label: string; leads: number; quotes: number };
const CHANNELS: Channel[] = ['Web','WhatsApp','Wallapop','Facebook','Teléfono','Otro'];
const nf = new Intl.NumberFormat('es-ES');

function dateWithin(date: string, period: Period): boolean {
  if (period === 'all') return true;
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return false;
  const end = new Date(today()+'T12:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - Number(period) + 1);
  const first = localISO(start);
  return date.slice(0,10) >= first && date.slice(0,10) <= today();
}
function localISO(d: Date): string {
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function countBy<T>(items: T[], pick: (item:T)=>string): Count[] {
  const result = new Map<string,number>();
  items.forEach(item=>{
    const label = pick(item).trim() || 'Sin especificar';
    result.set(label,(result.get(label)||0)+1);
  });
  return [...result.entries()].map(([label,count])=>({label,count}))
    .sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label,'es'));
}
function productVariant(product:string,capacity:string):string {
  const name=product.trim()||'Producto no indicado';
  const size=capacity.trim();
  return size && size!=='A determinar' && !name.toLocaleLowerCase('es-ES').includes(size.toLocaleLowerCase('es-ES'))
    ? name+' · '+size : name;
}
function orderDestination(order:Order,source:CrmState):string {
  const customer=source.customers.find(c=>c.id===order.customerId);
  if(customer?.destination?.trim() && customer.destination!=='Pendiente') return customer.destination;
  const quote=source.quotes.find(q=>q.id===order.quoteId);
  const lead=source.opportunities.find(o=>o.id===quote?.opportunityId);
  return lead?.destination?.trim()||'Destino sin indicar';
}
function windowSeries(leads:Opportunity[],quotes:Quote[],period:Period): {points:TrendPoint[];caption:string} {
  const end=new Date(today()+'T12:00:00');
  if(period==='365'){
    const points=Array.from({length:12},(_,i)=>{
      const month=new Date(end.getFullYear(),end.getMonth()-11+i,1);
      const prefix=localISO(month).slice(0,7);
      return {
        label:month.toLocaleDateString('es-ES',{month:'short'}).replace('.',''),
        leads:leads.filter(o=>o.createdAt.startsWith(prefix)).length,
        quotes:quotes.filter(q=>q.createdAt.startsWith(prefix)).length
      };
    });
    return {points,caption:'Últimos 12 meses, agrupados por mes'};
  }
  const n=period==='30'?5:period==='90'?13:8;
  const points=Array.from({length:n},(_,i)=>{
    const start=new Date(end);
    start.setDate(start.getDate() - ((n-i)*7-1));
    const stop=new Date(start);
    stop.setDate(stop.getDate()+6);
    const first=localISO(start),last=localISO(stop);
    return {
      label:start.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.',''),
      leads:leads.filter(o=>o.createdAt>=first && o.createdAt<=last).length,
      quotes:quotes.filter(q=>q.createdAt>=first && q.createdAt<=last).length
    };
  });
  return {points,caption:period==='all'?'Tendencia de las últimas 8 semanas; el resto de indicadores incluye todo el historial':'Actividad semanal del periodo elegido'};
}
function linePath(rows:TrendPoint[],key:'leads'|'quotes',max:number):string{
  return rows.map((item,i)=>{
    const x=30+i*660/Math.max(1,rows.length-1);
    const y=180-item[key]*135/Math.max(1,max);
    return (i?'L ':'M ')+x.toFixed(2)+' '+y.toFixed(2);
  }).join(' ');
}
function TrendChart({points}:{points:TrendPoint[]}) {
  const peak=Math.max(2,...points.flatMap(p=>[p.leads,p.quotes]));
  const middle=Math.ceil((points.length-1)/2);
  return <div className="ri-trend">
    <div className="ri-trend-key"><span><i className="is-lead"/>Consultas</span><span><i className="is-quote"/>Presupuestos</span></div>
    <svg viewBox="0 0 720 216" preserveAspectRatio="none" role="img"
      aria-label={'Evolución de consultas y presupuestos: '+points.map(p=>p.label+': '+p.leads+' consultas y '+p.quotes+' presupuestos').join('; ')}>
      {[0,1,2,3].map(t=><line key={t} x1="30" x2="690" y1={45+t*45} y2={45+t*45} stroke="#e5edf4" strokeWidth="1"/>)}
      <path d={linePath(points,'leads',peak)} stroke="#01488e" strokeWidth="3.4" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      <path d={linePath(points,'quotes',peak)} stroke="#57a8d3" strokeWidth="2.8" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((p,i)=><g key={i}>
        <circle cx={30+i*660/Math.max(1,points.length-1)} cy={180-p.leads*135/peak} r="3.7" fill="#01488e" stroke="#fff" strokeWidth="1.4"/>
        <circle cx={30+i*660/Math.max(1,points.length-1)} cy={180-p.quotes*135/peak} r="3.3" fill="#57a8d3" stroke="#fff" strokeWidth="1.4"/>
      </g>)}
    </svg>
    <div className="ri-trend-dates"><span>{points[0]?.label||'—'}</span><span>{points[middle]?.label||'—'}</span><span>{points[points.length-1]?.label||'—'}</span></div>
  </div>;
}
function RankedBars({items,tone='blue',empty='No hay registros en este periodo.',limit=6,unit=''}:
  {items:Count[];tone?:'blue'|'teal'|'amber';empty?:string;limit?:number;unit?:string}) {
  const max=Math.max(1,...items.map(item=>item.count));
  return items.length?<div className="ri-ranks">
    {items.slice(0,limit).map((item,i)=><div className="ri-rank" key={item.label}>
      <div className="ri-rank-head"><span title={item.label}><i>{String(i+1).padStart(2,'0')}</i>{item.label}</span><strong>{nf.format(item.count)}{unit}</strong></div>
      <div className="ri-track"><span className={'ri-fill ri-fill-'+tone} style={{width:(item.count/max*100)+'%'}}/></div>
    </div>)}
  </div>:<div className="ri-empty">{empty}</div>;
}
function Panel({title,subtitle,children,extra,className=''}:{title:string;subtitle:string;children:ReactNode;extra?:ReactNode;className?:string}){
  return <section className={'ri-panel '+className}>
    <div className="ri-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{extra}</div>
    <div className="ri-panel-content">{children}</div>
  </section>;
}
function SourceCard({name,status,details,icon}:{name:string;status:string;details:string;icon:ReactNode}){
  return <div className="ri-source">
    <span className="ri-source-icon">{icon}</span>
    <div className="ri-source-copy"><strong>{name}</strong><p>{details}</p></div>
    <span className="ri-source-status">{status}</span>
  </div>;
}
export default function ResultsInsights(){
  const {data}=useCrm();
  const [period,setPeriod]=useState<Period>('all');
  const insights=useMemo(()=>{
    const leads=data.opportunities.filter(o=>dateWithin(o.createdAt,period));
    const quotes=data.quotes.filter(q=>dateWithin(q.createdAt,period));
    const orders=data.orders.filter(o=>dateWithin(o.createdAt,period));
    const accepted=leads.filter(o=>o.status==='Aceptada');
    const lost=leads.filter(o=>o.status==='Perdida');
    const open=leads.filter(o=>o.status!=='Perdida'&&o.status!=='Aceptada');
    const linkedQuotes=new Set(data.quotes.filter(q=>q.opportunityId).map(q=>q.opportunityId));
    const linkedOrderLeadIds=new Set(orders.map(o=>{
      const quote=data.quotes.find(q=>q.id===o.quoteId);
      return quote?.opportunityId||'';
    }).filter(Boolean));
    const quotedLeads=leads.filter(o=>linkedQuotes.has(o.id));
    const linkedOrders=leads.filter(o=>linkedOrderLeadIds.has(o.id));
    const channels=CHANNELS.map(channel=>{
      const total=leads.filter(o=>o.channel===channel).length;
      const wins=leads.filter(o=>o.channel===channel&&o.status==='Aceptada').length;
      return {channel,total,wins};
    }).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
    const lossReasons=countBy(lost,o=>o.lostReason||'Sin motivo registrado');
    const familyDemand=countBy(leads,o=>o.product||'Sin producto');
    const capacityDemand=countBy(leads,o=>o.capacity||'Sin capacidad');
    const orderTypes=countBy(orders,o=>productVariant(o.product,o.capacity));
    const areaLeads=countBy(leads,o=>o.destination||'Destino sin indicar');
    const areaOrders=countBy(orders,o=>orderDestination(o,data));
    const overdue=open.filter(o=>o.nextDate&&o.nextDate<today()).length;
    const unlinkedOrders=orders.filter(o=>!o.quoteId||!data.quotes.some(q=>q.id===o.quoteId)).length;
    const amount=orders.reduce((sum,o)=>sum+(Number(o.amount)||0),0);
    const delivered=orders.filter(o=>o.factory==='Entregado').length;
    const stageCounts=[
      {label:'Consultas recibidas',count:leads.length},
      {label:'Con presupuesto asociado',count:quotedLeads.length},
      {label:'Oportunidades aceptadas',count:accepted.length},
      {label:'Con pedido vinculado',count:linkedOrders.length}
    ];
    return {leads,quotes,orders,accepted,lost,open,channels,lossReasons,familyDemand,capacityDemand,orderTypes,areaLeads,areaOrders,overdue,unlinkedOrders,amount,delivered,stageCounts};
  },[data,period]);
  const times=useMemo(()=>windowSeries(insights.leads,insights.quotes,period),[insights.leads,insights.quotes,period]);
  const total=insights.leads.length;
  const conversion=total?Math.round(insights.accepted.length/total*100):0;
  const maxChannel=Math.max(1,...insights.channels.map(x=>x.total));
  const maxStage=Math.max(1,...insights.stageCounts.map(x=>x.count));
  return <div className="page page-opportunities page-results page-results-insights">
    <header className="ri-header">
      <div className="ri-header-copy">
        <div className="ri-eyebrow">DIRECCIÓN · ANÁLISIS COMERCIAL</div>
        <h1>Resultados y estadísticas</h1>
        <p>Qué productos interesan, de dónde llegan las consultas y cómo evolucionan las oportunidades y los pedidos.</p>
      </div>
      <div className="ri-header-actions">
        <Link to="/oportunidades" className="ri-link"><Inbox size={17}/>Ver oportunidades <ArrowRight size={15}/></Link>
      </div>
    </header>
    <div className="ri-toolbar">
      <div className="ri-source-badge"><span className="ri-status-dot"/>Datos del CRM · DEMOSTRACIÓN LOCAL</div>
      <label className="ri-period"><CalendarDays size={17}/><span>Periodo</span>
        <select value={period} onChange={e=>setPeriod(e.target.value as Period)} aria-label="Filtrar estadísticas por periodo">
          <option value="all">Todo el historial</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Últimos 12 meses</option>
        </select>
      </label>
    </div>
    <section className="ri-kpi-grid" aria-label="Indicadores principales">
      <div className="ri-kpi"><span className="ri-kpi-head"><span>Consultas recibidas</span><Inbox size={18}/></span><strong>{nf.format(total)}</strong><small>Oportunidades registradas</small></div>
      <div className="ri-kpi"><span className="ri-kpi-head"><span>Presupuestos</span><FileText size={18}/></span><strong>{nf.format(insights.quotes.length)}</strong><small>Propuestas creadas en el periodo</small></div>
      <div className="ri-kpi"><span className="ri-kpi-head"><span>Aceptadas</span><CheckCircle2 size={18}/></span><strong>{nf.format(insights.accepted.length)}</strong><small>Estado actual de oportunidades</small></div>
      <div className="ri-kpi"><span className="ri-kpi-head"><span>Pedidos registrados</span><Package size={18}/></span><strong>{nf.format(insights.orders.length)}</strong><small>{insights.delivered} entregados · resto en curso</small></div>
      <div className="ri-kpi"><span className="ri-kpi-head"><span>Tasa de aceptación</span><TrendingUp size={18}/></span><strong>{conversion}%</strong><small>Aceptadas / consultas del periodo</small></div>
      <div className="ri-kpi"><span className="ri-kpi-head"><span>Importe de pedidos</span><BarChart3 size={18}/></span><strong>{money(insights.amount)}</strong><small>Importes registrados; no facturación propia</small></div>
    </section>
    <div className="ri-section-title"><div><h2>Productos y demanda</h2><p>Diferenciamos interés comercial de pedidos realmente registrados.</p></div><span>Fuente · CRM</span></div>
    <div className="ri-grid-two">
      <Panel title="Productos más consultados" subtitle="Familias o tipos solicitados en las oportunidades" extra={<Package size={19}/>}>
        <RankedBars items={insights.familyDemand} limit={6} empty="Aún no hay productos consultados en el periodo."/>
      </Panel>
      <Panel title="Productos con más pedidos" subtitle="Referencias y capacidades con pedidos registrados; no implica entrega" extra={<Package size={19}/>}>
        <RankedBars items={insights.orderTypes} tone="teal" limit={6} empty="No se han registrado pedidos en este periodo."/>
        {insights.orders.length>0&&<div className="ri-inline-note">Entregados: <strong>{insights.delivered}</strong> de {insights.orders.length}. Los demás pueden estar en curso.</div>}
      </Panel>
    </div>
    <div className="ri-grid-two">
      <Panel title="Capacidades más solicitadas" subtitle="Litros o tamaños indicados en las consultas" extra={<BarChart3 size={19}/>}>
        <RankedBars items={insights.capacityDemand} tone="amber" limit={6} empty="Sin capacidades registradas para este periodo."/>
      </Panel>
      <Panel title="Origen de las consultas" subtitle="Canales anotados al registrar la oportunidad" extra={<Inbox size={19}/>}>
        {insights.channels.length?<div className="ri-channels">
          {insights.channels.map(({channel,total:count,wins})=><div className="ri-channel" key={channel}>
            <div className="ri-channel-line"><strong>{channel}</strong><span>{count} {count===1?'consulta':'consultas'} · {wins} {wins===1?'aceptada':'aceptadas'}</span></div>
            <div className="ri-track"><span className="ri-fill ri-fill-blue" style={{width:(count/maxChannel*100)+'%'}}/></div>
          </div>)}
        </div>:<div className="ri-empty">No hay consultas con canal en este periodo.</div>}
        <div className="ri-inline-note">Aceptadas por canal: estado registrado en la oportunidad, no atribución de Analytics.</div>
      </Panel>
    </div>
    <div className="ri-section-title"><div><h2>Zonas y compradores</h2><p>Destinos escritos en las fichas. No se infiere la ubicación real del usuario de la web.</p></div><span>Fuente · CRM</span></div>
    <div className="ri-grid-two">
      <Panel title="¿De dónde llegan las consultas?" subtitle="Destino solicitado por cada oportunidad" extra={<MapPin size={19}/>}>
        <RankedBars items={insights.areaLeads} limit={7} empty="No hay destinos de consultas registrados."/>
      </Panel>
      <Panel title="¿Dónde compran nuestros clientes?" subtitle="Destino vinculado a los pedidos del periodo" extra={<MapPin size={19}/>}>
        <RankedBars items={insights.areaOrders} tone="teal" limit={7} empty="Sin destinos de pedidos registrados en este periodo."/>
        <div className="ri-inline-note">Se usa la dirección de cliente vinculada y, si falta, el destino de su oportunidad. No equivale a residencia.</div>
      </Panel>
    </div>
    <div className="ri-section-title"><div><h2>Evolución y cierre comercial</h2><p>Volumen, oportunidades aceptadas y motivos de pérdida.</p></div><span>Fuente · CRM</span></div>
    <div className="ri-grid-two ri-grid-trend">
      <Panel title="Evolución de la actividad" subtitle={times.caption} extra={<TrendingUp size={19}/>}>
        <TrendChart points={times.points}/>
        <div className="ri-inline-note">Los registros se agrupan por su fecha de creación. No incluyen visitas web.</div>
      </Panel>
      <Panel title="De la consulta al pedido" subtitle="Seguimiento de oportunidades del periodo con vínculos verificables" extra={<CheckCircle2 size={19}/>}>
        <div className="ri-funnel">
          {insights.stageCounts.map((s,i)=><div className="ri-funnel-row" key={s.label}>
            <div><span>{i+1}. {s.label}</span><strong>{s.count}</strong></div>
            <div className="ri-track"><span className="ri-fill ri-fill-blue" style={{width:(s.count/maxStage*100)+'%'}}/></div>
          </div>)}
        </div>
        <div className="ri-inline-note">{insights.unlinkedOrders?insights.unlinkedOrders+' pedidos del periodo no tienen presupuesto vinculado; no se les atribuye un origen.':'El embudo enlaza oportunidades, presupuestos y pedidos cuando existe referencia.'} El estado actual puede ser posterior al periodo seleccionado.</div>
      </Panel>
    </div>
    <div className="ri-grid-two">
      <Panel title="Motivos de pérdida" subtitle={insights.lost.length+' oportunidades marcadas como perdidas'} extra={<CircleAlert size={19}/>}>
        <RankedBars items={insights.lossReasons} tone="amber" empty="No hay oportunidades perdidas en este periodo."/>
        <div className="ri-inline-note">Un motivo «precio» no demuestra que la competencia venda más barato.</div>
      </Panel>
      <Panel title="Seguimientos pendientes" subtitle="Señales para revisar la actividad comercial" extra={<CalendarDays size={19}/>}>
        <div className="ri-signals">
          <div><span>Oportunidades abiertas</span><strong>{insights.open.length}</strong></div>
          <div><span>Con seguimiento vencido</span><strong>{insights.overdue}</strong></div>
          <div><span>Oportunidades perdidas</span><strong>{insights.lost.length}</strong></div>
          <div><span>Pedidos entregados</span><strong>{insights.delivered}</strong></div>
        </div>
        <Link to="/agenda" className="ri-panel-link">Abrir agenda y seguimientos <ArrowRight size={15}/></Link>
      </Panel>
    </div>
    <div className="ri-section-title"><div><h2>Analítica web y perfil de audiencia</h2><p>Preparado para cruzar captación digital y rendimiento comercial cuando existan conexiones verificadas.</p></div><span>Fuentes · Pendientes</span></div>
    <section className="ri-integration-panel">
      <div className="ri-integration-note"><CircleAlert size={18}/><span>Estas fuentes <strong>no están sincronizadas</strong> con la demo actual. Por ahora no existen aquí datos de sesiones, campañas, edades ni búsquedas de Google.</span></div>
      <div className="ri-sources">
        <SourceCard icon={<BarChart3 size={19}/>} name="Google Analytics 4" status="Sin conectar" details="Sesiones, procedencia, campañas, conversiones y, si está disponible legalmente, demografía agregada."/>
        <SourceCard icon={<Search size={19}/>} name="Search Console" status="Sin conectar" details="Clics, impresiones, CTR, consultas y páginas de búsqueda orgánica."/>
        <SourceCard icon={<Layers3 size={19}/>} name="Google Tag Manager" status="Por verificar" details="Gestión de etiquetas y medición; no aporta por sí solo estadísticas comerciales."/>
      </div>
      <div className="ri-audience">
        <div><Users size={20}/><strong>Edades de la audiencia</strong><span>Sin datos disponibles</span></div>
        <p>El CRM no registra edades. GA4 podría aportar tramos agregados con configuración y consentimiento adecuados, sujetos a umbrales de privacidad. No se debe deducir la edad de un comprador a partir de su nombre o ubicación.</p>
      </div>
    </section>
    <footer className="ri-footer">Panel de dirección · Los registros de demostración no justifican por sí solos invertir en publicidad. Para decidir campañas, contrasta consultas cualificadas, cierres, gastos y rentabilidad real.</footer>
  </div>;
}
