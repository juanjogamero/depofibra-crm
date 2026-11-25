import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, BarChart3, CalendarDays, CheckCircle2, CircleAlert,
  Layers3, Search, Users
} from 'lucide-react';
import { useCrm } from '../store';
import ResultsIberiaMap from './ResultsIberiaMap';
import {ResultsExecutiveOverview} from './ResultsDecisionPanels';
import ResultsExport from './ResultsExport';
import ResultsTrendReport from './ResultsTrendReport';
import ResultsExternalSources from './ResultsExternalSources';
import {ProductsResearch,ChannelsResearch,QuotesResearch,OrdersResearch} from './ResultsResearchPanels';
import {ProductRankCard,DistributionCard} from './ResultsProductPanels';
import { today, CHANNELS, sourceChannel, type Channel, type Opportunity, type Order, type Quote, type CrmState } from '../domain';

type Period = 'all' | '30' | '90' | '365';
type Count = { label: string; count: number };
type TrendPoint = { label: string; leads: number; quotes: number };
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

function RankedBars({items,tone='blue',empty='No hay registros en este periodo.',limit=6,unit='',destination}:
  {items:Count[];tone?:'blue'|'teal'|'amber';empty?:string;limit?:number;unit?:string;destination?:string}) {
  const [chosen,setChosen]=useState<string|null>(null);
  const max=Math.max(1,...items.map(item=>item.count));
  const total=items.reduce((sum,item)=>sum+item.count,0);
  const selection=items.find(item=>item.label===chosen);
  return items.length?<div className="ri-ranked-interactive">
    <div className="ri-ranks">
      {items.slice(0,limit).map((item,i)=><button type="button" className={'ri-rank ri-rank-button'+(item.label===chosen?' is-selected':'')}
        key={item.label} aria-pressed={item.label===chosen} title={'Examinar '+item.label}
        onClick={()=>setChosen(item.label===chosen?null:item.label)}>
        <div className="ri-rank-head"><span title={item.label}><i>{String(i+1).padStart(2,'0')}</i>{item.label}</span><strong>{nf.format(item.count)}{unit}</strong></div>
        <div className="ri-track"><span className={'ri-fill ri-fill-'+tone} style={{width:(item.count/max*100)+'%'}}/></div>
      </button>)}
    </div>
    {selection&&<div className="ri-ranking-inspector" aria-live="polite">
      <div><span>Detalle seleccionado</span><strong>{selection.label}</strong></div>
      <div className="ri-ranking-stat"><strong>{nf.format(selection.count)}</strong><span>registros · {total?Math.round(selection.count/total*100):0}% del total</span></div>
      {destination&&<Link to={destination}>Ver registros <ArrowRight size={15}/></Link>}
    </div>}
  </div>:<div className="ri-empty">{empty}</div>;
}
function ChannelDonut({channels}:{channels:{channel:Channel;total:number;wins:number}[]}) {
  const [selected,setSelected]=useState<Channel|null>(null);
  const total=channels.reduce((sum,x)=>sum+x.total,0);
  const active=channels.find(c=>c.channel===selected)||channels[0];
  const colors=['#01488e','#2c7bb7','#53a9d0','#66b6ae','#8b88c9','#b5c8df'];
  const radius=76,circumference=2*Math.PI*radius;
  let offset=0;
  if(!channels.length)return <div className="ri-empty">No hay consultas con canal en este periodo.</div>;
  return <div className="ri-channel-visual">
    <div className="ri-donut-layout">
      <svg className="ri-donut-svg" viewBox="0 0 240 240" role="img" aria-label="Canales de consultas; selecciona un segmento para ver su detalle">
        <circle cx="120" cy="120" r={radius} fill="none" stroke="#edf3f8" strokeWidth="28"/>
        {channels.map((item,i)=>{
          const portion=item.total/total*circumference;
          const prior=offset;offset+=portion;
          return <circle key={item.channel} cx="120" cy="120" r={radius} fill="none" stroke={colors[i%colors.length]}
            strokeWidth={active?.channel===item.channel?32:27}
            strokeDasharray={portion+' '+(circumference-portion)}
            strokeDashoffset={-prior}
            transform="rotate(-90 120 120)" className="ri-donut-segment"
            tabIndex={0} role="button" aria-label={item.channel+': '+item.total+' consultas'}
            onPointerEnter={()=>setSelected(item.channel)} onFocus={()=>setSelected(item.channel)} onClick={()=>setSelected(item.channel)}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(item.channel)}}}>
            <title>{item.channel}: {item.total} consultas</title>
          </circle>;
        })}
        <text x="120" y="109" textAnchor="middle" className="ri-donut-total">{active.total}</text>
        <text x="120" y="129" textAnchor="middle" className="ri-donut-caption">{active.channel}</text>
        <text x="120" y="147" textAnchor="middle" className="ri-donut-percent">{Math.round(active.total/total*100)}% de consultas</text>
      </svg>
      <div className="ri-donut-legend" role="group" aria-label="Seleccionar canal">
        {channels.map((item,i)=><button type="button" key={item.channel} className={'ri-donut-choice'+(active.channel===item.channel?' is-selected':'')}
          onClick={()=>setSelected(item.channel)} aria-pressed={active.channel===item.channel}>
          <span><i style={{backgroundColor:colors[i%colors.length]}}/>{item.channel}</span>
          <strong>{item.total}<small> ({Math.round(item.total/total*100)}%)</small></strong>
        </button>)}
      </div>
    </div>
    <div className="ri-channel-selected" aria-live="polite">
      <span><strong>{active.channel}</strong> · {active.total} {active.total===1?'consulta':'consultas'} · {active.wins} {active.wins===1?'aceptada':'aceptadas'}</span>
      <Link to="/oportunidades">Ver oportunidades <ArrowRight size={15}/></Link>
    </div>
  </div>;
}
function FunnelExplorer({stages}:{stages:Count[]}) {
  const [index,setIndex]=useState(0);
  const active=stages[Math.min(index,stages.length-1)];
  const max=Math.max(1,...stages.map(stage=>stage.count));
  return <div className="ri-funnel-explorer">
    <div className="ri-funnel">
      {stages.map((stage,i)=><button type="button" className={'ri-funnel-row ri-funnel-button'+(index===i?' is-selected':'')}
        key={stage.label} onClick={()=>setIndex(i)} aria-pressed={index===i}>
        <div><span>{i+1}. {stage.label}</span><strong>{stage.count}</strong></div>
        <div className="ri-track"><span className="ri-fill ri-fill-blue" style={{width:(stage.count/max*100)+'%'}}/></div>
      </button>)}
    </div>
    {active&&<div className="ri-funnel-inspector" aria-live="polite">
      <span>Etapa seleccionada</span><strong>{active.label}</strong>
      <p>{active.count} {active.count===1?'oportunidad':'oportunidades'} · {stages[0]?.count?Math.round(active.count/stages[0].count*100):0}% de las consultas del periodo</p>
      <Link to="/oportunidades">Consultar oportunidades <ArrowRight size={15}/></Link>
    </div>}
  </div>;
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
  const [period,setPeriod]=useState<Period>('90');
  const navigate=useNavigate();
  const route=useParams()['*']||'overview';
  const allowed=['overview','activity','products','channels','zones','quotes','orders','conversion','sources'];
  const view=allowed.includes(route)?route:'overview';
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
      const total=leads.filter(o=>sourceChannel(o)===channel).length;
      const wins=leads.filter(o=>sourceChannel(o)===channel&&o.status==='Aceptada').length;
      return {channel,total,wins};
    }).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
    const lossReasons=countBy(lost,o=>o.lostReason||'Sin motivo registrado');
    const familyDemand=countBy(leads,o=>o.product||'Sin producto');
    const capacityDemand=countBy(leads,o=>o.capacity||'Sin capacidad');
    const orderTypes=countBy(orders,o=>productVariant(o.product,o.capacity));
    const orderStatuses=countBy(orders,o=>o.factory||'Sin estado');
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
    return {leads,quotes,orders,accepted,lost,open,channels,lossReasons,familyDemand,capacityDemand,orderTypes,orderStatuses,areaLeads,areaOrders,overdue,unlinkedOrders,amount,delivered,stageCounts};
  },[data,period]);
  const times=useMemo(()=>windowSeries(insights.leads,insights.quotes,period),[insights.leads,insights.quotes,period]);
  const mapLeads=useMemo(()=>insights.leads.map(o=>({destination:o.destination})),[insights.leads]);
  const mapOrders=useMemo(()=>insights.orders.map(o=>({destination:orderDestination(o,data)})),[insights.orders,data]);

  const sections=[
    {id:'overview',label:'Resumen y mapa',description:'Panorama comercial y distribución territorial'},
    {id:'activity',label:'Evolución',description:'Ritmo de consultas, presupuestos y actividad pendiente'},
    {id:'products',label:'Productos',description:'Más solicitados, pedidos, capacidades y entregas'},
    {id:'channels',label:'Canales',description:'Origen de las consultas y resultados por plataforma'},
    {id:'zones',label:'Zonas',description:'Mapa detallado y destinos de consultas/pedidos'},
    {id:'quotes',label:'Presupuestos',description:'Propuestas, estados, importes y tiempos registrados'},
    {id:'orders',label:'Pedidos',description:'Producto, volumen, estados y entregas'},
    {id:'conversion',label:'Conversión',description:'Embudo, pérdidas y seguimientos'},
    {id:'sources',label:'Web y SEO',description:'Fuentes GSC, GA4 y GTM, aún no conectadas'}
  ];
  const selectedReport=sections.find(section=>section.id===view)||sections[0];
  const goToReport=(id:string)=>navigate(id==='overview'?'/resultados':'/resultados/'+id);
  return <div className="page page-opportunities page-results page-results-insights ri-gsc">
    <header className="ri-header">
      <div className="ri-header-copy">
        <h1>Rendimiento</h1>
        <p>Estadísticas comerciales · {selectedReport.description}</p>
      </div>
    </header>
    <div className="ri-toolbar ri-toolbar-workspace">
      <div className="ri-toolbar-actions">
        <div className="ri-period-pills" role="group" aria-label="Periodo de análisis">
          {([
            ['30','30 días'],['90','3 meses'],['365','12 meses'],['all','Histórico']
          ] as const).map(([id,label])=><button type="button" key={id}
            aria-pressed={period===id} className={period===id?'is-active':''}
            onClick={()=>setPeriod(id)}>{period===id?'✓ ':''}{label}</button>)}
        </div>
        <label className="ri-report-selector"><span>Informe</span>
          <select aria-label="Seleccionar subapartado de Resultados" value={view} onChange={e=>goToReport(e.target.value)}>
            {sections.map(section=><option key={section.id} value={section.id}>{section.label}</option>)}
          </select>
        </label>
      </div>
      <ResultsExport data={data} snapshot={insights} period={period} series={times.points}/>
    </div>
    <div className="ri-data-context"><span className="ri-status-dot"/> Datos de este navegador · Sin conexión a Analytics ni Search Console</div>
    <div className="ri-active-content">

    {view==='overview'&&<>
      <ResultsExecutiveOverview data={data} period={period} summary={insights} mode="summary"/>
      <div className="ri-overview-signals">
        <span><strong>Principal canal:</strong> {insights.channels[0]?.channel||'Sin datos'} · {insights.channels[0]?.total||0} consultas</span>
        <span><strong>Producto más pedido:</strong> {insights.orderTypes[0]?.label||'Sin datos'} · {insights.orderTypes[0]?.count||0} pedidos</span>
        <Link to="/resultados/channels">Analizar canales <ArrowRight size={14}/></Link>
      </div>
      <ResultsIberiaMap leads={mapLeads} orders={mapOrders}/>
    </>}
    {view==='activity'&&<>
      <ResultsTrendReport key={period} points={times.points} caption={times.caption} period={period}/>
      <ResultsExecutiveOverview data={data} period={period} summary={insights} mode="detail"/>
    </>}
    {view==='products'&&<>
      <ProductsResearch data={data} leads={insights.leads} quotes={insights.quotes} orders={insights.orders}/>
      <div className="ri-view-section-label"><h2>Gráficos de productos y capacidades</h2><p>Selección interactiva por ranking y distribución.</p></div>
      <div className="ri-product-card-grid">
        <ProductRankCard title="Productos más consultados" subtitle="Tipos solicitados en las oportunidades"
          items={insights.familyDemand} kind="consultas" to="/oportunidades"/>
        <ProductRankCard title="Productos con más pedidos" subtitle="Referencias y capacidades registradas; no implica entrega"
          items={insights.orderTypes} kind="pedidos" to="/pedidos"/>
      </div>
      <div className="ri-product-secondary">
        <DistributionCard items={insights.capacityDemand} kind="capacidades" title="Capacidades más solicitadas"
          subtitle="Volúmenes indicados por los interesados" to="/oportunidades"/>
        <DistributionCard items={insights.orderStatuses} kind="estados" title="Situación de los pedidos"
          subtitle="Último estado de gestión registrado" to="/pedidos"/>
      </div>
    </>}

    {view==='channels'&&<>
      <ChannelsResearch data={data} leads={insights.leads} quotes={insights.quotes} orders={insights.orders}/>
      <div className="ri-acquisition-grid ri-gsc-channels">
        <Panel title="Distribución interactiva de canales" subtitle="Selecciona un canal para inspeccionar consultas y aceptadas" className="ri-panel-channels">
          <ChannelDonut channels={insights.channels}/>
          <div className="ri-inline-note">El canal procede de la oportunidad; no identifica sesiones ni campañas web.</div>
        </Panel>
        <Panel title="Lectura de la captación" subtitle="Datos para evaluar dónde se genera trabajo">
          <div className="ri-channel-table">
            <div className="ri-channel-table-head"><span>Canal</span><span>Consultas</span><span>Aceptadas</span><span>Ratio</span></div>
            {insights.channels.length?insights.channels.map(row=><div key={row.channel} className="ri-channel-table-row">
              <strong>{row.channel}</strong><span>{row.total}</span><span>{row.wins}</span>
              <b>{row.total?Math.round(row.wins/row.total*100):0}%</b>
            </div>):<p>No hay consultas en este periodo.</p>}
          </div>
          <div className="ri-inline-note">La relación entre consultas y aceptadas no acredita rentabilidad ni atribución publicitaria.</div>
        </Panel>
      </div>
    </>}
    {view==='zones'&&<>
      <ResultsIberiaMap leads={mapLeads} orders={mapOrders}/>
      <div className="ri-gsc-location-grid">
        <Panel title="Destinos anotados en consultas" subtitle="Texto del lugar de entrega registrado, sin geocodificar">
          <RankedBars items={insights.areaLeads} limit={12} destination="/oportunidades"/>
        </Panel>
        <Panel title="Destinos anotados en pedidos" subtitle="Cliente, presupuesto u oportunidad si está vinculada">
          <RankedBars items={insights.areaOrders} limit={12} destination="/pedidos"/>
        </Panel>
      </div>
    </>}
    {view==='quotes'&&<>
      <QuotesResearch data={data} leads={insights.leads} quotes={insights.quotes} orders={insights.orders}/>
    </>}
    {view==='orders'&&<>
      <OrdersResearch data={data} leads={insights.leads} quotes={insights.quotes} orders={insights.orders}/>
      <div className="ri-view-section-label"><h2>Distribución de estados</h2></div>
      <DistributionCard items={insights.orderStatuses} kind="estados" title="Situación de los pedidos" subtitle="Último estado registrado en el CRM" to="/pedidos"/>
    </>}
    {view==='conversion'&&<>
      <div className="ri-view-section-label"><h2>Conversión y seguimiento</h2><p>Vínculos comerciales, pérdidas y acciones pendientes.</p></div>
      <div className="ri-grid-three">
        <Panel title="De la consulta al pedido" subtitle="Etapas con vínculos de CRM comprobables" extra={<CheckCircle2 size={21}/>}>
          <FunnelExplorer stages={insights.stageCounts}/>
          <div className="ri-inline-note">{insights.unlinkedOrders?insights.unlinkedOrders+' pedidos carecen de presupuesto vinculado y no se les atribuye origen.':'Los pedidos solo se vinculan si existe una referencia válida.'} Los estados actuales pueden haber cambiado después del periodo.</div>
        </Panel>
        <Panel title="Motivos de pérdida" subtitle={insights.lost.length+' oportunidades marcadas como perdidas'} extra={<CircleAlert size={21}/>}>
          <RankedBars items={insights.lossReasons} tone="amber" destination="/oportunidades" empty="No hay oportunidades perdidas en este periodo."/>
          <div className="ri-inline-note">Un motivo «precio» no prueba que otro proveedor venda más barato.</div>
        </Panel>
        <Panel title="Actividad pendiente" subtitle="Datos para priorizar seguimientos y posventa" extra={<CalendarDays size={21}/>}>
          <div className="ri-signals">
            <div><span>Oportunidades abiertas</span><strong>{insights.open.length}</strong></div>
            <div><span>Seguimientos vencidos</span><strong>{insights.overdue}</strong></div>
            <div><span>Oportunidades perdidas</span><strong>{insights.lost.length}</strong></div>
            <div><span>Pedidos entregados</span><strong>{insights.delivered}</strong></div>
          </div>
          <Link to="/agenda" className="ri-panel-link">Abrir agenda y seguimientos <ArrowRight size={16}/></Link>
        </Panel>
      </div>
    </>}
    {view==='sources'&&<>
      <div className="ri-view-section-label"><h2>Fuentes digitales</h2><p>Estructura de consulta preparada para incorporar datos reales una vez verificadas las conexiones.</p></div>
      <ResultsExternalSources/>
      <section className="ri-integration-panel">
        <div className="ri-integration-note"><CircleAlert size={18}/><span>Estas fuentes <strong>no están sincronizadas</strong> con el CRM actual. Por ahora no existen aquí datos de sesiones, campañas, edades ni búsquedas de Google.</span></div>
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
    </>}
    </div>
    <footer className="ri-footer ri-workspace-footer">Datos del navegador, sin conciliación contable. Antes de tomar decisiones sobre campañas o inversión, comprueba la calidad de las consultas, los cierres, el coste de captación y la rentabilidad real.</footer>
  </div>;
}
