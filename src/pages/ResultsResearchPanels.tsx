/* Informes de rendimiento comercial. Solo lectura de datos locales, sin métricas inventadas. */
import {useMemo,useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Info,Search} from 'lucide-react';
import {money,type CrmState,type Opportunity,type Quote,type Order,type Channel} from '../domain';

type Dataset={data:CrmState;leads:Opportunity[];quotes:Quote[];orders:Order[]};
const n=(x:number)=>new Intl.NumberFormat('es-ES').format(x);
const pct=(a:number,b:number)=>b?Math.round(a/b*100)+'%':'0%';
const euro=(x:number)=>money(x);
const norm=(s:string)=>s.toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s);
const productLabel=(product:string,capacity?:string)=>{
 const name=product.trim()||'Producto no indicado',size=(capacity||'').trim();
 return size&&size!=='A determinar'&&!norm(name).includes(norm(size))?name+' · '+size:name;
};
function RowLink({children,to}:{children:ReactNode;to:string}){return <Link to={to} className="ri-study-link">{children}<ArrowRight size={14}/></Link>}
function Head({title,subtitle,extra}:{title:string;subtitle:string;extra?:ReactNode}){
 return <header className="ri-study-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{extra}</header>;
}
function Strip({items}:{items:{label:string;value:string;hint?:string}[]}){
 return <div className="ri-study-strip">{items.map(x=><div key={x.label}><span>{x.label}</span><strong>{x.value}</strong>{x.hint&&<small>{x.hint}</small>}</div>)}</div>;
}
function InfoLine({children}:{children:ReactNode}){return <p className="ri-study-footnote"><Info size={14}/>{children}</p>}
function Empty(){return <div className="ri-study-empty">No hay datos de este tipo en el periodo seleccionado.</div>}

type ProductRow={key:string;leads:number;quotes:number;quoteAmount:number;orders:number;delivered:number;orderAmount:number};
function buildProducts({data,leads,quotes,orders}:Dataset){
 const rows=new Map<string,ProductRow>();
 const allLeads=new Map(data.opportunities.map(x=>[x.id,x]));
 const allQuotes=new Map(data.quotes.map(x=>[x.id,x]));
 const row=(key:string)=>{
  let value=rows.get(key);
  if(!value){value={key,leads:0,quotes:0,quoteAmount:0,orders:0,delivered:0,orderAmount:0};rows.set(key,value)}
  return value;
 };
 const itemForQuote=(q:Quote)=>{const lead=allLeads.get(q.opportunityId);return lead?productLabel(lead.product,lead.capacity):q.product||'Sin producto'};
 const itemForOrder=(o:Order)=>{
  const q=allQuotes.get(o.quoteId);const lead=q?allLeads.get(q.opportunityId):undefined;
  return lead?productLabel(lead.product,lead.capacity):productLabel(o.product,o.capacity);
 };
 leads.forEach(o=>row(productLabel(o.product,o.capacity)).leads++);
 quotes.forEach(q=>{const v=row(itemForQuote(q));v.quotes++;v.quoteAmount+=Number(q.amount)||0});
 orders.forEach(o=>{const v=row(itemForOrder(o));v.orders++;if(o.factory==='Entregado')v.delivered++;v.orderAmount+=Number(o.amount)||0});
 return [...rows.values()];
}
export function ProductsResearch(props:Dataset){
 const rows=useMemo(()=>buildProducts(props),[props.data,props.leads,props.quotes,props.orders]);
 const [sort,setSort]=useState<'orders'|'leads'|'quotes'|'amount'>('orders');
 const [query,setQuery]=useState('');
 const list=rows.filter(x=>norm(x.key).includes(norm(query))).sort((a,b)=>sort==='amount'?b.orderAmount-a.orderAmount||b.orders-a.orders:
  sort==='leads'?b.leads-a.leads||b.orders-a.orders:
  sort==='quotes'?b.quotes-a.quotes||b.leads-a.leads:
  b.orders-a.orders||b.leads-a.leads);
 const total=props.orders.length,delivered=props.orders.filter(o=>o.factory==='Entregado').length;
 const top=list.find(x=>x.orders>0);
 return <section className="ri-study-section">
  <Head title="Rendimiento por producto" subtitle="Consultas, propuestas, pedidos y entregas por producto o capacidad anotados" extra={<RowLink to="/catalogo">Catálogo</RowLink>}/>
  <Strip items={[
   {label:'Productos con consultas',value:n(rows.filter(x=>x.leads>0).length)},
   {label:'Productos con pedidos',value:n(rows.filter(x=>x.orders>0).length)},
   {label:'Pedidos registrados',value:n(total)},
   {label:'Pedidos entregados',value:n(delivered),hint:top?'Más pedidos: '+top.key:undefined}
  ]}/>
  <div className="ri-study-controls">
   <label className="ri-study-search"><Search size={15}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto o capacidad" aria-label="Buscar producto en estadísticas"/></label>
   <label className="ri-study-sort">Ordenar por <select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}>
    <option value="orders">Más pedidos</option><option value="leads">Más consultas</option><option value="quotes">Más presupuestos</option><option value="amount">Importe pedidos</option>
   </select></label>
  </div>
  <div className="ri-study-table-scroll"><table className="ri-study-table">
   <thead><tr><th>Producto / capacidad</th><th>Consultas</th><th>Presupuestos</th><th>Pedidos</th><th>Entregados</th><th>Importe pedidos</th></tr></thead>
   <tbody>{list.length?list.map(x=><tr key={x.key}>
    <th scope="row">{x.key}</th><td>{n(x.leads)}</td><td>{n(x.quotes)}</td>
    <td className="ri-study-strong">{n(x.orders)}</td><td>{n(x.delivered)}</td><td>{euro(x.orderAmount)}</td>
   </tr>):<tr><td colSpan={6}><Empty/></td></tr>}</tbody>
  </table></div>
  <InfoLine>«Más vendido» se aproxima aquí mediante pedidos registrados, no por facturación de Depofibra. Un pedido no cuenta como entregado salvo estado «Entregado». Se agrupan registros mediante producto/capacidad y vínculos disponibles; nombres distintos pueden quedar separados.</InfoLine>
 </section>;
}

type ChannelRow={name:Channel;total:number;accepted:number;lost:number;quotedLeads:number;orders:number;delivered:number;orderAmount:number};
const CHANNELS:Channel[]=['Web','WhatsApp','Wallapop','Facebook','Teléfono','Otro'];
export function ChannelsResearch({data,leads}:Dataset){
 const [metric,setMetric]=useState<'total'|'accepted'|'orders'>('total');
 const allQuotes=data.quotes;
 const byLead=new Map<string,Quote[]>();
 allQuotes.forEach(q=>{if(!q.opportunityId)return;const prev=byLead.get(q.opportunityId)||[];prev.push(q);byLead.set(q.opportunityId,prev)});
 const byQuote=new Map<string,Order[]>();
 data.orders.forEach(o=>{if(!o.quoteId)return;const prev=byQuote.get(o.quoteId)||[];prev.push(o);byQuote.set(o.quoteId,prev)});
 const rows:ChannelRow[]=CHANNELS.map(name=>{
  const group=leads.filter(x=>x.channel===name);
  const linkedQuotes=new Map(group.flatMap(x=>byLead.get(x.id)||[]).map(q=>[q.id,q]));
  const linkedOrders=new Map([...linkedQuotes.keys()].flatMap(id=>byQuote.get(id)||[]).map(o=>[o.id,o]));
  const relatedOrders=[...linkedOrders.values()];
  return {
   name,total:group.length,accepted:group.filter(x=>x.status==='Aceptada').length,lost:group.filter(x=>x.status==='Perdida').length,
   quotedLeads:group.filter(x=>(byLead.get(x.id)||[]).length>0).length,
   orders:relatedOrders.length,delivered:relatedOrders.filter(o=>o.factory==='Entregado').length,
   orderAmount:relatedOrders.reduce((sum,o)=>sum+(Number(o.amount)||0),0)
  };
 }).sort((a,b)=>b[metric]-a[metric]||a.name.localeCompare(b.name,'es'));
 const leading=rows.find(x=>x.total>0);
 return <section className="ri-study-section">
  <Head title="Consultas y resultados por plataforma" subtitle="De qué canal llegan oportunidades y qué recorrido tienen dentro del CRM" extra={<RowLink to="/oportunidades">Oportunidades</RowLink>}/>
  <Strip items={[
   {label:'Consultas registradas',value:n(leads.length)},
   {label:'Canales con actividad',value:n(rows.filter(x=>x.total>0).length)},
   {label:'Principal canal',value:leading?.name||'—',hint:leading?n(leading.total)+' consultas':undefined},
   {label:'Aceptadas en el periodo',value:n(leads.filter(x=>x.status==='Aceptada').length)}
  ]}/>
  <div className="ri-study-controls"><label className="ri-study-sort">Clasificar por <select value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>
   <option value="total">Consultas</option><option value="accepted">Aceptadas</option><option value="orders">Pedidos vinculados</option>
  </select></label></div>
  <div className="ri-study-table-scroll"><table className="ri-study-table">
   <thead><tr><th>Plataforma</th><th>Consultas</th><th>% consultas</th><th>Con propuesta</th><th>Aceptadas</th><th>% aceptación</th><th>Pedidos vinculados</th><th>Entregados</th><th>Importe pedidos</th></tr></thead>
   <tbody>{rows.map(x=><tr key={x.name}><th scope="row">{x.name}</th><td className="ri-study-strong">{n(x.total)}</td><td>{pct(x.total,leads.length)}</td>
    <td>{n(x.quotedLeads)}</td><td>{n(x.accepted)}</td><td>{pct(x.accepted,x.total)}</td>
    <td>{n(x.orders)}</td><td>{n(x.delivered)}</td><td>{euro(x.orderAmount)}</td></tr>)}</tbody>
  </table></div>
  <InfoLine>Para cada canal se toman las consultas creadas en el periodo elegido. Los presupuestos y pedidos vinculados reflejan su estado acumulado actual, incluso si se crearon después; no se presupone atribución de Analytics. Los pedidos sin relación verificable con una oportunidad quedan fuera del reparto por canal.</InfoLine>
 </section>;
}

const QUOTE_STATES=['Borrador','Enviado','Aceptado','Rechazado'] as const;
export function QuotesResearch({data,leads,quotes}:Dataset){
 const total=quotes.length,accepted=quotes.filter(q=>q.status==='Aceptado').length;
 const amount=quotes.reduce((s,q)=>s+(Number(q.amount)||0),0);
 const transport=quotes.reduce((s,q)=>s+(Number(q.transport)||0),0);
 const linked=quotes.filter(q=>data.opportunities.some(x=>x.id===q.opportunityId)).length;
 const dated=quotes.flatMap(q=>{
  const lead=data.opportunities.find(o=>o.id===q.opportunityId);
  if(!lead||!validDate(lead.createdAt)||!validDate(q.createdAt))return [];
  const days=Math.round((new Date(q.createdAt+'T12:00:00').getTime()-new Date(lead.createdAt+'T12:00:00').getTime())/86400000);
  return days<0?[]:[days];
 });
 const avgDays=dated.length?(dated.reduce((a,b)=>a+b,0)/dated.length).toFixed(1).replace('.',',')+' días':'—';
 const amounts=QUOTE_STATES.map(status=>{
  const arr=quotes.filter(x=>x.status===status);
  return {status,count:arr.length,amount:arr.reduce((s,q)=>s+(Number(q.amount)||0),0)};
 });
 return <section className="ri-study-section">
  <Head title="Informe de presupuestos" subtitle="Estados comerciales, importes propuestos y tiempos entre registros" extra={<RowLink to="/presupuestos">Presupuestos</RowLink>}/>
  <Strip items={[
   {label:'Presupuestos creados',value:n(total)},
   {label:'Presupuestos aceptados',value:n(accepted),hint:pct(accepted,total)+' sobre presupuestos'},
   {label:'Importe presupuestado',value:euro(amount),hint:'No equivale a ventas'},
   {label:'Días hasta propuesta',value:avgDays,hint:n(dated.length)+' vínculos con fechas válidas'}
  ]}/>
  <div className="ri-study-table-scroll"><table className="ri-study-table">
    <thead><tr><th>Estado actual</th><th>Presupuestos</th><th>% del total</th><th>Importe propuesto</th></tr></thead>
    <tbody>{amounts.map(x=><tr key={x.status}><th scope="row">{x.status}</th><td className="ri-study-strong">{n(x.count)}</td><td>{pct(x.count,total)}</td><td>{euro(x.amount)}</td></tr>)}
     <tr className="ri-study-total"><th scope="row">Total</th><td>{n(total)}</td><td>100%{total===0?' (sin datos)':''}</td><td>{euro(amount)}</td></tr>
    </tbody>
   </table></div>
  <div className="ri-study-inline-facts">
   <span><b>{n(linked)}</b> presupuestos con oportunidad enlazada</span>
   <span><b>{euro(transport)}</b> costes de transporte incluidos como campo interno de presupuesto</span>
   <span><b>{n(leads.length)}</b> consultas creadas en el periodo</span>
  </div>
  <InfoLine>Los importes se suman por presupuestos creados, no por operaciones únicas: varias propuestas a un mismo cliente se cuentan varias veces. «Días hasta propuesta» mide días entre las fechas almacenadas (no tiempo real de respuesta). El transporte es un campo del presupuesto: no debe sumarse de nuevo a su total.</InfoLine>
 </section>;
}

const ORDER_STATES=['Pendiente','Confirmando detalles','En fabricación','Preparado','En tránsito','Entregado'] as const;
export function OrdersResearch({orders}:Dataset){
 const total=orders.length,delivered=orders.filter(x=>x.factory==='Entregado').length;
 const amount=orders.reduce((sum,o)=>sum+(Number(o.amount)||0),0);
 const countByCapacity=new Map<string,{count:number;amount:number}>();
 orders.forEach(o=>{const key=o.capacity?.trim()||'No indicada',entry=countByCapacity.get(key)||{count:0,amount:0};entry.count++;entry.amount+=Number(o.amount)||0;countByCapacity.set(key,entry)});
 const capacities=[...countByCapacity.entries()].sort((a,b)=>b[1].count-a[1].count);
 return <section className="ri-study-section">
  <Head title="Informe de pedidos" subtitle="Pedidos registrados, entregas, importes y capacidades más repetidas" extra={<RowLink to="/pedidos">Pedidos</RowLink>}/>
  <Strip items={[
   {label:'Pedidos registrados',value:n(total)},
   {label:'Pedidos entregados',value:n(delivered),hint:pct(delivered,total)+' del total'},
   {label:'Importe de pedidos',value:euro(amount),hint:'Volumen de pedidos, no facturación propia'},
   {label:'Importe medio/pedido',value:total?euro(amount/total):'—'}
  ]}/>
  <div className="ri-study-duo">
   <div><h3>Estado de ejecución</h3><div className="ri-study-table-scroll"><table className="ri-study-table"><thead><tr><th>Estado</th><th>Pedidos</th><th>%</th></tr></thead>
    <tbody>{ORDER_STATES.map(status=>{const count=orders.filter(x=>x.factory===status).length;return <tr key={status}><th scope="row">{status}</th><td className="ri-study-strong">{n(count)}</td><td>{pct(count,total)}</td></tr>})}</tbody></table></div></div>
   <div><h3>Capacidades en pedidos</h3><div className="ri-study-table-scroll"><table className="ri-study-table"><thead><tr><th>Capacidad</th><th>Pedidos</th><th>Importe</th></tr></thead>
    <tbody>{capacities.length?capacities.map(([capacity,o])=><tr key={capacity}><th scope="row">{capacity}</th><td className="ri-study-strong">{n(o.count)}</td><td>{euro(o.amount)}</td></tr>):<tr><td colSpan={3}><Empty/></td></tr>}</tbody>
   </table></div></div>
  </div>
  <InfoLine>El estado «Entregado» procede de la ficha del pedido, no de un transportista. El volumen económico de pedidos no es facturación, ingreso cobrado ni beneficio neto de Depofibra; son registros locales de demostración.</InfoLine>
 </section>;
}
