import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, CreditCard, Download, Factory, FileText, Filter, MapPin, Package, Plus, Search, Shield, Truck, Wallet, X } from 'lucide-react';
import { useCrm } from '../store';
import { type FactoryStatus, type Order, dateText, money, today } from '../domain';
import { ActionLink, Back, Button, Empty, Field, Info, Initials, PageHeader, Panel, Pill, Status, Timeline, NoteDemo } from '../ui';

const stages:FactoryStatus[]=['Pendiente','Confirmando detalles','En fabricación','Preparado','En tránsito','Entregado'];

type ClientListGroup = 'Todos'|'Altas recientes'|'Altas anteriores'|'Datos pendientes';
type ClientListSort = 'Recientes'|'Antiguos'|'Nombre A-Z'|'Más pedidos';
const clientRangeDate=(iso:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso+'T12:00:00'));

export function Clients(){
 const {data}=useCrm();
 const nav=useNavigate();
 const [search,setSearch]=useState('');
 const [group,setGroup]=useState<ClientListGroup>('Todos');
 const [sort,setSort]=useState<ClientListSort>('Recientes');
 const [destination,setDestination]=useState('Todas las localidades');
 const [dateFrom,setDateFrom]=useState('');
 const [dateTo,setDateTo]=useState('');
 const [datesOpen,setDatesOpen]=useState(false);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const orderCount=(id:string)=>data.orders.filter(o=>o.customerId===id).length;
 const cutoff=new Date(today()+'T12:00:00');
 cutoff.setDate(cutoff.getDate()-30);
 const recentSince=cutoff.toISOString().slice(0,10);
 const needsData=(client:{contact:string;destination:string})=>{
   const needsContact=!client.contact.trim()||['por completar','cliente ficticio','pendiente'].includes(client.contact.trim().toLocaleLowerCase('es'));
   const needsDestination=!client.destination.trim()||['por completar','pendiente'].includes(client.destination.trim().toLocaleLowerCase('es'));
   return needsContact||needsDestination;
 };
 const matches=(client:{createdAt:string;contact:string;destination:string},key:ClientListGroup)=>
   key==='Todos'
   ||key==='Altas recientes'&&client.createdAt.slice(0,10)>=recentSince
   ||key==='Altas anteriores'&&client.createdAt.slice(0,10)<recentSince
   ||key==='Datos pendientes'&&needsData(client);
 const groups:{id:ClientListGroup;label:string}[]=[
   {id:'Todos',label:'Todos'},
   {id:'Altas recientes',label:'Últimos 30 días'},
   {id:'Altas anteriores',label:'Anteriores'},
   {id:'Datos pendientes',label:'Datos pendientes'}
 ];
 const destinations=[...new Set(data.customers.map(c=>c.destination).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 const query=search.trim().toLocaleLowerCase('es-ES');
 const list=data.customers.filter(c=>
   matches(c,group)
   &&(destination==='Todas las localidades'||c.destination===destination)
   &&(!dateFrom||c.createdAt.slice(0,10)>=dateFrom)
   &&(!dateTo||c.createdAt.slice(0,10)<=dateTo)
   &&[c.id,c.name,c.destination,c.contact,c.notes].join(' ').toLocaleLowerCase('es-ES').includes(query)
 ).sort((a,b)=>{
   if(sort==='Nombre A-Z')return a.name.localeCompare(b.name,'es');
   if(sort==='Más pedidos')return orderCount(b.id)-orderCount(a.id)||b.createdAt.localeCompare(a.createdAt);
   const difference=b.createdAt.localeCompare(a.createdAt);
   return sort==='Antiguos'?-difference:difference;
 });
 const activeFilters=Boolean(query||group!=='Todos'||destination!=='Todas las localidades'||sort!=='Recientes'||dateFrom||dateTo);
 const clearFilters=()=>{setSearch('');setGroup('Todos');setSort('Recientes');setDestination('Todas las localidades');setDateFrom('');setDateTo('');};
 const dateLabel=dateFrom&&dateTo?clientRangeDate(dateFrom)+' – '+clientRangeDate(dateTo):dateFrom?'Desde '+clientRangeDate(dateFrom):dateTo?'Hasta '+clientRangeDate(dateTo):'Todas las fechas';
 const exportClients=()=>{
   if(!list.length)return;
   const headers=['Referencia','Cliente','Localidad','Pedidos registrados','Documentos anotados','Fecha de alta'];
   const cell=(raw:string)=>{
     const value=String(raw??'');
     const safe=/^\s*[=+@-]/.test(value)?"'"+value:value;
     return '"'+safe.replace(/"/g,'""')+'"';
   };
   const rows=list.map(c=>[c.id,c.name,c.destination,String(orderCount(c.id)),String(c.documentNames.length),c.createdAt.slice(0,10)]);
   const csv='\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(';')).join('\r\n');
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;a.download='depofibra-clientes-'+today()+'.csv';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <div className="page page-opportunities page-clients">
   <div className="op-screen-heading">
     <div className="op-heading-copy">
       <h1 id="clients-title">Clientes</h1>
       <p>Compradores registrados. Consulta sus datos, historial y seguimiento de clientes.</p>
     </div>
     <div className="op-heading-actions">
       <button type="button" className="op-export-button" onClick={exportClients} disabled={!list.length}
         title="Exportar clientes filtrados, sin datos de contacto ni información económica interna">
         <Download size={16}/>Exportar
       </button>
       <Link to="/pedidos" className="op-new-button"><Package size={16}/>Ver pedidos</Link>
     </div>
   </div>
   <nav className="op-phase-tabs" aria-label="Filtrar clientes">
     {groups.map(g=><button key={g.id} type="button" className={'op-phase-tab'+(group===g.id?' is-active':'')}
       aria-pressed={group===g.id} onClick={()=>setGroup(g.id)}>
       <span>{g.label}</span><strong>{data.customers.filter(c=>matches(c,g.id)).length}</strong>
     </button>)}
   </nav>
   <div className="op-searchbar">
     <label className="op-search">
       <Search size={18} aria-hidden="true"/>
       <input type="search" aria-label="Buscar clientes por nombre, localidad o referencia" value={search}
         onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, localidad o referencia"/>
       {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
     </label>
     <div className="op-searchbar-actions">
       <div className="op-date-range-control">
         <button type="button" className={'op-date-range-trigger'+(dateFrom||dateTo?' has-range':'')}
           aria-expanded={datesOpen} aria-controls="clients-date-range"
           onClick={()=>{setDatesOpen(v=>!v);setFiltersOpen(false)}}>
           <CalendarDays size={17}/><span>{dateLabel}</span><ChevronDown size={15}/>
         </button>
         {datesOpen&&<div className="op-date-popover" id="clients-date-range" role="group" aria-label="Filtrar por fecha de alta">
           <strong>Fecha de alta del cliente</strong>
           <div className="op-date-fields">
             <label><span>Desde</span><input type="date" aria-label="Clientes desde" value={dateFrom}
               max={dateTo||undefined} onChange={e=>setDateFrom(e.target.value)}/></label>
             <label><span>Hasta</span><input type="date" aria-label="Clientes hasta" value={dateTo}
               min={dateFrom||undefined} onChange={e=>setDateTo(e.target.value)}/></label>
           </div>
           <div className="op-date-buttons">
             <button type="button" onClick={()=>{setDateFrom('');setDateTo('')}}>Borrar fechas</button>
             <button type="button" onClick={()=>setDatesOpen(false)}>Listo</button>
           </div>
         </div>}
       </div>
       <button type="button" className={'op-filter-toggle'+(filtersOpen?' is-active':'')}
         aria-expanded={filtersOpen} aria-controls="clients-advanced-filters"
         onClick={()=>{setFiltersOpen(v=>!v);setDatesOpen(false)}}>
         <Filter size={16}/>Filtros
       </button>
       {activeFilters&&<button type="button" className="op-reset-filters" onClick={clearFilters}>Limpiar</button>}
     </div>
   </div>
   {filtersOpen&&<div className="op-advanced-filters" id="clients-advanced-filters">
     <label><span>Localidad</span><select aria-label="Filtrar clientes por localidad" value={destination}
       onChange={e=>setDestination(e.target.value)}>
       <option>Todas las localidades</option>
       {destinations.map(d=><option key={d} value={d}>{d}</option>)}
     </select></label>
     <label><span>Ordenar por</span><select aria-label="Ordenar clientes" value={sort}
       onChange={e=>setSort(e.target.value as ClientListSort)}>
       <option>Recientes</option><option>Antiguos</option><option>Nombre A-Z</option><option>Más pedidos</option>
     </select></label>
   </div>}
   <section className="op-table-panel" aria-labelledby="clients-title">
     <div className="op-table-scroll" role="region" tabIndex={0} aria-label="Lista de clientes con desplazamiento vertical">
       <table className="op-data-table clients-data-table">
         <thead><tr>
           <th scope="col" className="op-col-id">Referencia</th>
           <th scope="col" className="op-col-client">Cliente</th>
           <th scope="col" className="clients-col-location">Localidad</th>
           <th scope="col" className="clients-col-orders">Pedidos</th>
           <th scope="col" className="clients-col-docs">Documentos anotados</th>
           <th scope="col" className="clients-col-date">Alta</th>
           <th scope="col" className="op-col-open" aria-label="Acceso a la ficha"></th>
         </tr></thead>
         <tbody>{list.map(c=>{
           const orders=orderCount(c.id);
           return <tr key={c.id} className="op-clickable-row" onClick={()=>nav('/clientes/'+c.id)}>
             <td className="op-col-id"><span className="op-reference">{c.id}</span></td>
             <td className="op-col-client"><div className="op-client-cell">
               <Initials name={c.name}/>
               <div className="op-client-copy">
                 <Link to={'/clientes/'+c.id} className="op-client-name"
                   onClick={e=>e.stopPropagation()}>{c.name}</Link>
                 <span className="op-client-sub">{c.contact||'Contacto por completar'}</span>
               </div>
             </div></td>
             <td className="clients-col-location"><span className="op-location" title={c.destination}>{c.destination||'Por completar'}</span></td>
             <td className="clients-col-orders"><span className={'clients-count is-orders'+(orders?' has-items':'')}>{orders} {orders===1?'pedido':'pedidos'}</span></td>
             <td className="clients-col-docs"><span className={'clients-count is-docs'+(c.documentNames.length?' has-items':'')}>{c.documentNames.length} {c.documentNames.length===1?'referencia':'referencias'}</span></td>
             <td className="clients-col-date"><time dateTime={c.createdAt}>{dateText(c.createdAt)}</time></td>
             <td className="op-col-open"><Link className="op-row-open" to={'/clientes/'+c.id}
               onClick={e=>e.stopPropagation()} aria-label={'Abrir ficha de '+c.name}><ChevronRight size={17}/></Link></td>
           </tr>;
         })}</tbody>
       </table>
       {!list.length&&<Empty title="No hay clientes" body="Prueba otra búsqueda o modifica los filtros."/>}
     </div>
     <footer className="op-table-footer">
       Mostrando <strong>{list.length}</strong> de <strong>{data.customers.length}</strong> clientes
       <span className="clients-footer-note">Los documentos de esta demo son nombres anotados, no archivos almacenados.</span>
     </footer>
   </section>
 </div>;
}

export function ClientDetail(){
 const {id}=useParams();const {data,addDocumentName}=useCrm();const [tab,setTab]=useState('Resumen');
 const c=data.customers.find(x=>x.id===id);if(!c)return <div className="page"><Back to="/clientes" label="Volver a clientes"/><Empty title="Cliente no encontrado" body="Revisa el listado de demostración."/></div>;
 const orders=data.orders.filter(o=>o.customerId===c.id);
 return <div className="page"><Back to="/clientes" label="Volver a clientes"/><div className="record-hero"><div className="record-identity"><Initials name={c.name}/><div><div className="eyebrow">{c.id} · Cliente confirmado</div><h1>{c.name}</h1><div className="record-meta"><MapPin size={14}/>{c.destination}<span>·</span><Pill tone="green">Comprador</Pill></div></div></div><Pill>{orders.length} pedidos</Pill></div>
 <div className="detail-tabs">{['Resumen','Pedidos','Documentos'].map(t=><button onClick={()=>setTab(t)} key={t} className={tab===t?'selected':''}>{t}</button>)}</div>
 {tab==='Resumen'&&<div className="detail-grid"><Panel title="Datos de cliente"><div className="info-grid"><Info label="Cliente" value={c.name}/><Info label="Contacto" value={c.contact}/><Info label="Destino" value={c.destination}/><Info label="Desde" value={dateText(c.createdAt)}/></div><h4 className="minor-title">Observaciones</h4><div className="note-area">{c.notes||'Sin observaciones'}</div></Panel><Panel title="Resumen de compras"><div className="money-summary"><span>Pedidos registrados</span><strong>{orders.length}</strong></div><div className="summary-line"><span>Importe de operaciones</span><strong>{money(orders.reduce((a,o)=>a+o.amount,0))}</strong></div><div className="summary-line"><span>Documentos relacionados</span><strong>{c.documentNames.length}</strong></div></Panel></div>}
 {tab==='Pedidos'&&<Panel title="Historial de pedidos"><div className="simple-list">{orders.map(o=><Link to={'/pedidos/'+o.id} className="simple-item" key={o.id}><Package size={20}/><div><strong>{o.product} · {o.capacity}</strong><small>{o.id} · {dateText(o.createdAt)}</small></div><b>{money(o.amount)}</b><Status value={o.factory}/><ChevronRight size={16}/></Link>)}</div></Panel>}
 {tab==='Documentos'&&<div className="detail-grid"><Panel title="Documentos de la oficina"><div className="simple-list">{c.documentNames.map((name,i)=><div className="simple-item" key={i}><FileText size={20}/><div><strong>{name}</strong><small>Nombre registrado en la demo · no hay fichero almacenado</small></div></div>)}{!c.documentNames.length&&<Empty title="Sin documentos" body="Los PDF se incorporarán a un sistema privado cuando exista el backend."/>}</div></Panel><Panel title="Adjuntos: comportamiento de demostración"><p className="muted">Este entorno público no guarda el contenido de los PDF. Solo registra nombres de prueba. No selecciones facturas reales.</p><Field label="Elegir un PDF ficticio"><input type="file" accept="application/pdf" onChange={e=>{const f=e.target.files?.[0];if(f&&f.type==='application/pdf')addDocumentName(c.id,f.name)}}/></Field><NoteDemo/></Panel></div>}
 </div>;
}

type OrderListGroup = 'Todos'|'Por confirmar'|'En preparación'|'En tránsito'|'Entregados';
type OrderListSort = 'Recientes'|'Antiguos'|'Entrega más próxima'|'Mayor importe';
const orderGroupMatches=(order:Order,group:OrderListGroup)=>
 group==='Todos'
 ||group==='Por confirmar'&&['Pendiente','Confirmando detalles'].includes(order.factory)
 ||group==='En preparación'&&['En fabricación','Preparado'].includes(order.factory)
 ||group==='En tránsito'&&order.factory==='En tránsito'
 ||group==='Entregados'&&order.factory==='Entregado';

export function Orders(){
 const {data}=useCrm();
 const nav=useNavigate();
 const [search,setSearch]=useState('');
 const [group,setGroup]=useState<OrderListGroup>('Todos');
 const [sort,setSort]=useState<OrderListSort>('Recientes');
 const [factory,setFactory]=useState('Todas las fases');
 const [payment,setPayment]=useState('Todos los pagos');
 const [dateFrom,setDateFrom]=useState('');
 const [dateTo,setDateTo]=useState('');
 const [datesOpen,setDatesOpen]=useState(false);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const groups:{id:OrderListGroup;label:string}[]=[
   {id:'Todos',label:'Todos'},
   {id:'Por confirmar',label:'Por confirmar'},
   {id:'En preparación',label:'En preparación'},
   {id:'En tránsito',label:'En tránsito'},
   {id:'Entregados',label:'Entregados'}
 ];
 const query=search.trim().toLocaleLowerCase('es-ES');
 const list=data.orders.filter(o=>
   orderGroupMatches(o,group)
   &&(factory==='Todas las fases'||o.factory===factory)
   &&(payment==='Todos los pagos'||o.paymentMode===payment)
   &&(!dateFrom||o.createdAt.slice(0,10)>=dateFrom)
   &&(!dateTo||o.createdAt.slice(0,10)<=dateTo)
   &&[o.id,o.quoteId,o.buyerName,o.product,o.capacity,o.factory,o.paymentMode]
       .join(' ').toLocaleLowerCase('es-ES').includes(query)
 ).sort((a,b)=>{
   if(sort==='Entrega más próxima')return (a.deliveryDate||'9999-12-31').localeCompare(b.deliveryDate||'9999-12-31')
     ||b.createdAt.localeCompare(a.createdAt);
   if(sort==='Mayor importe')return b.amount-a.amount||b.createdAt.localeCompare(a.createdAt);
   const diff=b.createdAt.localeCompare(a.createdAt);
   return sort==='Antiguos'?-diff:diff;
 });
 const activeFilters=Boolean(query||group!=='Todos'||sort!=='Recientes'||factory!=='Todas las fases'||payment!=='Todos los pagos'||dateFrom||dateTo);
 const clearFilters=()=>{setSearch('');setGroup('Todos');setSort('Recientes');setFactory('Todas las fases');setPayment('Todos los pagos');setDateFrom('');setDateTo('');};
 const dateLabel=dateFrom&&dateTo?clientRangeDate(dateFrom)+' – '+clientRangeDate(dateTo):dateFrom?'Desde '+clientRangeDate(dateFrom):dateTo?'Hasta '+clientRangeDate(dateTo):'Todas las fechas';
 const exportOrders=()=>{
   if(!list.length)return;
   const headers=['Pedido','Presupuesto','Comprador','Producto','Capacidad','Importe del pedido (EUR)','Registro de pago','Estado de preparación','Fecha de registro','Entrega prevista anotada'];
   const safeCell=(raw:string)=>{
     const value=String(raw??'');
     const safe=/^\s*[=+@-]/.test(value)?"'"+value:value;
     return '"'+safe.replace(/"/g,'""')+'"';
   };
   const rows=list.map(o=>[o.id,o.quoteId,o.buyerName,o.product,o.capacity,o.amount.toFixed(2).replace('.',','),o.paymentMode,o.factory,o.createdAt.slice(0,10),o.deliveryDate||'']);
   const csv='\uFEFF'+[headers,...rows].map(row=>row.map(safeCell).join(';')).join('\r\n');
   const file=new Blob([csv],{type:'text/csv;charset=utf-8;'});
   const url=URL.createObjectURL(file);
   const a=document.createElement('a');
   a.href=url;a.download='depofibra-pedidos-'+today()+'.csv';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <div className="page page-opportunities page-orders">
   <div className="op-screen-heading">
     <div className="op-heading-copy">
       <h1 id="orders-title">Pedidos</h1>
       <p>Seguimiento de pedidos registrados: preparación, estado de pago y entrega.</p>
     </div>
     <div className="op-heading-actions">
       <button type="button" className="op-export-button" disabled={!list.length}
         onClick={exportOrders} title="Exportar pedidos filtrados sin comisiones ni costes privados">
         <Download size={16}/>Exportar
       </button>
       <Link to="/presupuestos" className="op-new-button"><FileText size={17}/>Ver presupuestos</Link>
     </div>
   </div>
   <nav className="op-phase-tabs" aria-label="Filtrar pedidos por fase de preparación">
     {groups.map(g=><button type="button" key={g.id}
       className={'op-phase-tab'+(group===g.id?' is-active':'')}
       aria-pressed={group===g.id} onClick={()=>{setGroup(g.id);setFactory('Todas las fases')}}>
       <span>{g.label}</span><strong>{data.orders.filter(o=>orderGroupMatches(o,g.id)).length}</strong>
     </button>)}
   </nav>
   <div className="op-searchbar">
     <label className="op-search">
       <Search size={18} aria-hidden="true"/>
       <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
         aria-label="Buscar pedido, comprador o producto" placeholder="Buscar pedido, comprador o producto"/>
       {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
     </label>
     <div className="op-searchbar-actions">
       <div className="op-date-range-control">
         <button type="button" className={'op-date-range-trigger'+(dateFrom||dateTo?' has-range':'')}
           aria-expanded={datesOpen} aria-controls="orders-date-range"
           onClick={()=>{setDatesOpen(v=>!v);setFiltersOpen(false)}}>
           <CalendarDays size={17}/><span>{dateLabel}</span><ChevronDown size={15}/>
         </button>
         {datesOpen&&<div className="op-date-popover" id="orders-date-range" role="group" aria-label="Filtrar por fecha de registro">
           <strong>Fecha de registro</strong>
           <div className="op-date-fields">
             <label><span>Desde</span><input type="date" value={dateFrom} max={dateTo||undefined}
               aria-label="Pedidos desde" onChange={e=>setDateFrom(e.target.value)}/></label>
             <label><span>Hasta</span><input type="date" value={dateTo} min={dateFrom||undefined}
               aria-label="Pedidos hasta" onChange={e=>setDateTo(e.target.value)}/></label>
           </div>
           <div className="op-date-buttons">
             <button type="button" onClick={()=>{setDateFrom('');setDateTo('')}}>Borrar fechas</button>
             <button type="button" onClick={()=>setDatesOpen(false)}>Listo</button>
           </div>
         </div>}
       </div>
       <button type="button" className={'op-filter-toggle'+(filtersOpen?' is-active':'')}
         aria-expanded={filtersOpen} aria-controls="orders-advanced-filters"
         onClick={()=>{setFiltersOpen(v=>!v);setDatesOpen(false)}}>
         <Filter size={16}/>Filtros
       </button>
       {activeFilters&&<button type="button" className="op-reset-filters" onClick={clearFilters}>Limpiar</button>}
     </div>
   </div>
   {filtersOpen&&<div className="op-advanced-filters" id="orders-advanced-filters">
     <label><span>Fase exacta</span><select aria-label="Filtrar por fase logística"
       value={factory} onChange={e=>setFactory(e.target.value)}>
       <option>Todas las fases</option>{stages.map(s=><option key={s}>{s}</option>)}
     </select></label>
     <label><span>Pago registrado</span><select aria-label="Filtrar por estado de pago"
       value={payment} onChange={e=>setPayment(e.target.value)}>
       <option>Todos los pagos</option>
       <option>Pendiente</option><option>Anticipo verificado</option><option>Pago completo verificado</option>
     </select></label>
     <label><span>Ordenar por</span><select aria-label="Ordenar pedidos"
       value={sort} onChange={e=>setSort(e.target.value as OrderListSort)}>
       <option>Recientes</option><option>Antiguos</option><option>Entrega más próxima</option><option>Mayor importe</option>
     </select></label>
   </div>}
   <section className="op-table-panel" aria-labelledby="orders-title">
     <div className="op-table-scroll" tabIndex={0} role="region"
       aria-label="Listado de pedidos con desplazamiento vertical">
       <table className="op-data-table orders-data-table">
         <thead><tr>
           <th scope="col" className="op-col-id">Pedido</th>
           <th scope="col" className="op-col-client">Comprador</th>
           <th scope="col" className="op-col-product">Producto</th>
           <th scope="col" className="orders-col-payment">Estado de pago</th>
           <th scope="col" className="orders-col-factory">Preparación / entrega</th>
           <th scope="col" className="orders-col-date">Fecha</th>
           <th scope="col" className="op-col-open" aria-label="Acceso a la ficha"></th>
         </tr></thead>
         <tbody>{list.map(o=>{
           const factoryTone=o.factory==='Entregado'?'won':o.factory==='En tránsito'?'shipping':o.factory==='Pendiente'?'draft':'progress';
           const paymentTone=o.paymentMode==='Pendiente'?'pending':o.paymentMode==='Anticipo verificado'?'advance':'paid';
           return <tr key={o.id} className="op-clickable-row" onClick={()=>nav('/pedidos/'+o.id)}>
             <td className="op-col-id"><span className="op-reference">{o.id}</span></td>
             <td className="op-col-client"><div className="op-client-cell">
               <Initials name={o.buyerName}/>
               <div className="op-client-copy">
                 <Link to={'/pedidos/'+o.id} className="op-client-name"
                   onClick={e=>e.stopPropagation()}>{o.buyerName}</Link>
                 <span className="op-client-sub">Presupuesto {o.quoteId}</span>
               </div>
             </div></td>
             <td className="op-col-product"><span className="op-product" title={o.product}>{o.product}</span><span className="op-product-sub">{o.capacity||'Por concretar'}</span></td>
             <td className="orders-col-payment"><span className={'orders-status is-'+paymentTone}>{o.paymentMode}</span></td>
             <td className="orders-col-factory"><span className={'orders-status is-'+factoryTone}>{o.factory}</span>
               <span className="orders-delivery">{o.deliveryDate?'Entrega indicada: '+dateText(o.deliveryDate):'Entrega por confirmar'}</span></td>
             <td className="orders-col-date"><time dateTime={o.createdAt}>{dateText(o.createdAt)}</time></td>
             <td className="op-col-open"><Link className="op-row-open" to={'/pedidos/'+o.id}
               onClick={e=>e.stopPropagation()} aria-label={'Abrir pedido '+o.id}><ChevronRight size={17}/></Link></td>
           </tr>;
         })}</tbody>
       </table>
       {!list.length&&<Empty title="No hay pedidos" body="Prueba otra búsqueda o modifica los filtros."/>}
     </div>
     <footer className="op-table-footer">Mostrando <strong>{list.length}</strong> de <strong>{data.orders.length}</strong> pedidos
       <span className="orders-footer-note">Pago y fechas: anotaciones del CRM de demostración.</span>
     </footer>
   </section>
 </div>;
}

export function OrderDetail(){
 const {id}=useParams();const [params]=useSearchParams();const {data,role,verifyPayment,updateOrder,addCommissionPayment}=useCrm();
 const o=data.orders.find(x=>x.id===id);const [tab,setTab]=useState(params.get('tab')||'Resumen');const [payment,setPayment]=useState(''),[payMode,setPayMode]=useState(''),[commission,setCommission]=useState(''),[note,setNote]=useState('');
 if(!o)return <div className="page"><Back to="/pedidos" label="Volver a pedidos"/><Empty title="Pedido no encontrado" body="Consulta el listado de pedidos."/></div>;
 const balance=Math.max(0,o.commission-o.commissionPaid);
 const tabs=role==='fabrica'?['Resumen','Fabricación','Actividad','Comisión (consulta)']:['Resumen','Formalización','Fabricación','Comisiones','Actividad'];
 const selected=tabs.includes(tab)?tab:'Resumen';
 return <div className="page"><Back to="/pedidos" label="Volver a pedidos"/><div className="record-hero"><div><div className="eyebrow">{o.id} · {dateText(o.createdAt)}</div><h1>{o.buyerName}</h1><p>{o.product} · {o.capacity}</p><div className="record-meta"><Status value={o.factory}/><span>·</span><Status value={o.paymentMode}/></div></div><Pill>{role==='fabrica'?'Gestión técnica':'Ficha de pedido'}</Pill></div>
 <div className="order-progress">{stages.slice(1).map((s,i)=><div key={s} className={'progress-step '+(stages.indexOf(o.factory)>=i+1?'is-done':'')}><span>{i+1}</span><small>{s}</small></div>)}</div>
 <div className="detail-tabs">{tabs.map(t=><button className={selected===t?'selected':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div>
 {selected==='Resumen'&&<div className="detail-grid"><Panel title="Información general"><div className="info-grid"><Info label="Referencia" value={o.id}/><Info label="Producto" value={o.product}/><Info label="Capacidad" value={o.capacity}/><Info label="Fabricación" value={o.factory}/><Info label="Cliente" value={o.buyerName}/><Info label="Entrega" value={dateText(o.deliveryDate)}/></div><h4 className="minor-title">Notas de seguimiento</h4><div className="note-area">{o.notes||'Sin observaciones registradas.'}</div></Panel>
 <div className="right-stack"><Panel title="Estado operativo"><div className="stage-hero"><span className="stage-symbol"><Factory size={25}/></span><div><span>Situación en Fábrica</span><strong>{o.factory}</strong></div></div><div className="summary-line"><span>Formalización</span><Status value={o.paymentMode}/></div><div className="summary-line"><span>Fecha de entrega</span><strong>{dateText(o.deliveryDate)}</strong></div><div className="inline-tip"><Truck size={16}/> Fábrica coordina las conexiones, color, medidas finales y entrega.</div></Panel>
 {role==='direccion'&&<Panel title="Control económico privado"><div className="money-summary"><span>Importe de operación</span><strong>{money(o.amount)}</strong></div><div className="summary-line"><span>Ingreso inicial verificado</span><strong>{money(o.advanceReceived)}</strong></div><div className="summary-line"><span>Comisión pendiente</span><strong>{money(balance)}</strong></div></Panel>}</div></div>}
 {selected==='Formalización'&&role==='direccion'&&<div className="detail-grid"><Panel title="Comprobación del ingreso"><p className="muted">El documento oficial lo emite Fábrica. Registra únicamente pagos ya comprobados; aquí son ficticios.</p><div className="form-grid"><Field label="Forma de pago"><select value={payMode||o.paymentMode} onChange={e=>setPayMode(e.target.value)}><option>Pendiente</option><option>Anticipo verificado</option><option>Pago completo verificado</option></select></Field><Field label="Importe comprobado (€)"><input type="number" min="0" step=".01" value={payment} onChange={e=>setPayment(e.target.value)} placeholder={String(o.advanceReceived)}/></Field></div><Button onClick={()=>{const mode=(payMode||o.paymentMode) as Order['paymentMode'];const amount=Number(payment||o.advanceReceived);if(mode!=='Pendiente'&&amount>0)verifyPayment(o.id,mode,amount)}}><CheckCircle2 size={16}/>Registrar verificación demo</Button><div className="inline-tip"><Check size={16}/> Solo tras verificar el anticipo/pago se crea el cliente comprador.</div></Panel>
 <Panel title="Documentación preparada por oficina"><div className="info-grid"><Info label="Presupuesto" value={o.quoteId||'Operación de ejemplo'}/><Info label="Proforma" value="Oficina del fabricante"/><Info label="Factura" value="Oficina del fabricante"/><Info label="Archivos PDF" value="Pendiente de almacenamiento privado"/></div><NoteDemo/></Panel></div>}
 {selected==='Fabricación'&&<div className="detail-grid"><Panel title="Gestión técnica y producción"><div className="form-stack"><Field label="Etapa actual"><select value={o.factory} onChange={e=>updateOrder(o.id,{factory:e.target.value as FactoryStatus},'Cambio de estado: '+e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></Field><Field label="Fecha de entrega"><input type="date" value={o.deliveryDate} onChange={e=>updateOrder(o.id,{deliveryDate:e.target.value},'Fecha de entrega actualizada')}/></Field><Field label="Color"><input value={o.color} onChange={e=>updateOrder(o.id,{color:e.target.value})}/></Field><Field label="Conexiones / tomas"><textarea rows={3} value={o.connections} onChange={e=>updateOrder(o.id,{connections:e.target.value})}/></Field></div><div className="hint-row"><Factory size={17}/> La oficina de Fábrica confirma estos detalles con el comprador.</div></Panel>
 <Panel title="Registrar avance o incidencia"><form onSubmit={(e:FormEvent)=>{e.preventDefault();if(note.trim()){updateOrder(o.id,{notes:note},note.trim());setNote('')}}} className="form-stack"><Field label="Observación"><textarea rows={5} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej. Confirmadas las bocas; entrega coordinada..."/></Field><Button type="submit"><Plus size={16}/>Guardar nota técnica</Button></form><div className="inline-tip"><CheckCircle2 size={16}/> Los avances se añaden al historial.</div></Panel></div>}
 {(selected==='Comisiones'||selected==='Comisión (consulta)')&&<div className="detail-grid"><Panel title="Liquidación comercial"><div className="big-balance">{money(balance)}<span>pendiente de abonar</span></div><div className="summary-line"><span>Comisión acordada</span><strong>{money(o.commission)}</strong></div><div className="summary-line"><span>Comisión abonada</span><strong>{money(o.commissionPaid)}</strong></div><div className="commission-meter"><span style={{width:(o.commission?100*o.commissionPaid/o.commission:0)+'%'}}/></div><Pill tone={balance?'amber':'green'}>{balance?'Pendiente / parcial':'Pagada'}</Pill></Panel>
 <Panel title={role==='direccion'?'Registrar cobro parcial o total':'Acceso de consulta'}>{role==='direccion'?<div className="form-stack"><p className="muted">Cada ingreso actualiza el saldo sin modificar el importe total acordado.</p><Field label="Importe recibido (€)"><input type="number" min=".01" step=".01" max={balance} value={commission} onChange={e=>setCommission(e.target.value)}/></Field><Button disabled={!(Number(commission)>0&&Number(commission)<=balance)} onClick={()=>{addCommissionPayment(o.id,Number(commission));setCommission('')}}><CreditCard size={16}/>Registrar cobro</Button></div>:<div className="inline-tip"><Shield size={18}/> Fábrica ve esta liquidación, pero no puede editarla ni marcarla como pagada.</div>}</Panel></div>}
 {selected==='Actividad'&&<div className="detail-grid"><Panel title="Cronología del pedido"><Timeline items={o.activity}/></Panel><Panel title="Seguimiento posventa"><div className="note-area">Después de la entrega seguiremos teniendo el historial y podremos planificar una llamada posventa.</div><Link to="/agenda" className="btn btn-outline"><CalendarPlus size={16}/>Abrir agenda</Link></Panel></div>}
 </div>;
}
export function Commissions(){
 const {data}=useCrm();const [filter,setFilter]=useState('Pendientes');
 const list=data.orders.filter(o=>filter==='Todas'||(filter==='Pendientes'?o.commissionPaid===0:filter==='Parciales'?o.commissionPaid>0&&o.commissionPaid<o.commission:o.commissionPaid>=o.commission));
 const earned=data.orders.reduce((a,o)=>a+o.commission,0),paid=data.orders.reduce((a,o)=>a+o.commissionPaid,0);
 return <div className="page"><PageHeader eyebrow="CONTROL PRIVADO DE DIRECCIÓN" title="Mis comisiones" subtitle="Separación entre las generadas en cada venta y las efectivamente cobradas."/>
 <div className="kpi-grid three"><div className="kpi"><div className="kpi-top"><span>Generadas</span><Wallet size={20}/></div><div className="kpi-value">{money(earned)}</div><div className="kpi-foot">Comisiones por pedidos de la demo</div></div><div className="kpi"><div className="kpi-top"><span>Cobradas</span><CheckCircle2 size={20}/></div><div className="kpi-value">{money(paid)}</div><div className="kpi-foot">Importes liquidados</div></div><div className="kpi"><div className="kpi-top"><span>Pendientes</span><Clock3 size={20}/></div><div className="kpi-value">{money(earned-paid)}</div><div className="kpi-foot">No equivale a beneficio neto</div></div></div>
 <Panel className="table-panel"><div className="table-toolbar"><div className="segmented">{['Pendientes','Parciales','Pagadas','Todas'].map(x=><button className={filter===x?'seg-active':''} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Cliente / pedido</th><th>Comisión acordada</th><th>Cobrado</th><th>Pendiente</th><th>Estado</th><th></th></tr></thead><tbody>{list.map(o=><tr key={o.id}><td><div className="cell-person"><Initials name={o.buyerName}/><span><strong>{o.buyerName}</strong><small>{o.id}</small></span></div></td><td>{money(o.commission)}</td><td>{money(o.commissionPaid)}</td><td className="price-cell">{money(o.commission-o.commissionPaid)}</td><td><Status value={o.commissionPaid===0?'Pendiente':o.commissionPaid<o.commission?'Parcialmente cobrada':'Pagada'}/></td><td><Link className="table-link" to={'/pedidos/'+o.id+'?tab=Comisiones'}>Abrir <ChevronRight size={16}/></Link></td></tr>)}</tbody></table>{!list.length&&<Empty title="Sin registros" body="Prueba otra pestaña para consultar el historial."/>}</div></Panel></div>;
}
export function FactoryHome(){
 const {data}=useCrm();const active=data.orders.filter(o=>o.factory!=='Entregado');
 return <div className="page"><PageHeader eyebrow="OFICINA DEL FABRICANTE · DEMOSTRACIÓN" title="Pedidos asignados" subtitle="Acceso de Fábrica: confirma detalles, avance de producción y entrega."/>
 <div className="kpi-grid three"><div className="kpi"><div className="kpi-top">Por revisar<Package size={20}/></div><div className="kpi-value">{active.filter(o=>o.factory==='Pendiente'||o.factory==='Confirmando detalles').length}</div></div><div className="kpi"><div className="kpi-top">En fabricación<Factory size={20}/></div><div className="kpi-value">{active.filter(o=>o.factory==='En fabricación').length}</div></div><div className="kpi"><div className="kpi-top">Preparado / en tránsito<Truck size={20}/></div><div className="kpi-value">{active.filter(o=>o.factory==='Preparado'||o.factory==='En tránsito').length}</div></div></div>
 <Panel title="Operaciones a cargo" extra={<ActionLink to="/pedidos">Ver listado</ActionLink>}><div className="simple-list">{active.map(o=><Link className="simple-item" to={'/pedidos/'+o.id} key={o.id}><Package size={19}/><div><strong>{o.buyerName}</strong><small>{o.id} · {o.capacity}</small></div><Status value={o.factory}/><ChevronRight size={16}/></Link>)}</div></Panel><div className="inline-tip top-gap"><Shield size={16}/> Los permisos son solo una simulación visual. La autenticación real se desarrollará en el VPS.</div></div>;
}
