import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Check, CheckCircle2, ClipboardCheck, ChevronDown, ChevronRight, Clock3, CreditCard, Download, Factory, FileText, Filter, MapPin, Package, Plus, Search, Shield, Truck, UploadCloud, Wallet, X } from 'lucide-react';
import { useCrm } from '../store';
import { type FactoryStatus, type Order, dateText, money, today } from '../domain';
import { ActionLink, Back, Button, Empty, Field, Info, Initials, PageHeader, Panel, Pill, Status, Timeline, NoteDemo, Modal } from '../ui';

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
       <span className="clients-footer-note">Solo se han anotado nombres de documentos; los archivos no están almacenados.</span>
     </footer>
   </section>
 </div>;
}

export function ClientDetail(){
 const {id}=useParams();const {data,addDocumentName}=useCrm();const [tab,setTab]=useState('Resumen');
 const [selectedPdf,setSelectedPdf]=useState<File|null>(null);
 const [docNotice,setDocNotice]=useState('');
 const c=data.customers.find(x=>x.id===id);if(!c)return <div className="page"><Back to="/clientes" label="Volver a clientes"/><Empty title="Cliente no encontrado" body="Revisa el listado del CRM."/></div>;
 const orders=data.orders.filter(o=>o.customerId===c.id);
 return <div className="page page-crm-record"><Back to="/clientes" label="Volver a clientes"/><div className="record-hero"><div className="record-identity"><Initials name={c.name}/><div><div className="eyebrow">{c.id} · Cliente confirmado</div><h1>{c.name}</h1><div className="record-meta"><MapPin size={14}/>{c.destination}<span>·</span><Pill tone="green">Comprador</Pill></div></div></div><Pill>{orders.length} pedidos</Pill></div>
 <div className="detail-tabs">{['Resumen','Pedidos','Documentos'].map(t=><button onClick={()=>setTab(t)} key={t} className={tab===t?'selected':''}>{t}</button>)}</div>
 {tab==='Resumen'&&<div className="detail-grid"><Panel title="Datos de cliente"><div className="info-grid"><Info label="Cliente" value={c.name}/><Info label="Contacto" value={c.contact}/><Info label="Destino" value={c.destination}/><Info label="Desde" value={dateText(c.createdAt)}/></div><h4 className="minor-title">Observaciones</h4><div className="note-area">{c.notes||'Sin observaciones'}</div></Panel><Panel title="Resumen de compras"><div className="money-summary"><span>Pedidos registrados</span><strong>{orders.length}</strong></div><div className="summary-line"><span>Importe de operaciones</span><strong>{money(orders.reduce((a,o)=>a+o.amount,0))}</strong></div><div className="summary-line"><span>Documentos relacionados</span><strong>{c.documentNames.length}</strong></div></Panel></div>}
 {tab==='Pedidos'&&<Panel title="Historial de pedidos"><div className="simple-list">{orders.map(o=><Link to={'/pedidos/'+o.id} className="simple-item" key={o.id}><Package size={20}/><div><strong>{o.product} · {o.capacity}</strong><small>{o.id} · {dateText(o.createdAt)}</small></div><b>{money(o.amount)}</b><Status value={o.factory}/><ChevronRight size={16}/></Link>)}</div></Panel>}
 {tab==='Documentos'&&<div className="detail-grid crm-client-documents">
  <Panel title="Referencias de documentos">
   <div className="simple-list">{c.documentNames.map((name,i)=><div className="simple-item" key={i}>
     <FileText size={20}/><div><strong>{name}</strong><small>Referencia anotada · archivo no almacenado</small></div></div>)}
     {!c.documentNames.length&&<Empty title="Sin documentos anotados" body="Puedes registrar el nombre de un PDF para recordar qué documento está pendiente de archivar."/>}
   </div>
  </Panel>
  <Panel title="Añadir referencia PDF">
    <p className="crm-inline-help">Selecciona un PDF para guardar únicamente su nombre como referencia interna. El documento no se sube ni se almacena todavía; no selecciones archivos confidenciales.</p>
    <label className="crm-file-picker">
      <UploadCloud size={25}/>
      <strong>{selectedPdf?selectedPdf.name:'Seleccionar archivo PDF'}</strong>
      <span>{selectedPdf?'Archivo seleccionado; solo se conservará el nombre.':'Pulsa para elegir un PDF (sin subida real)'}</span>
      <input type="file" accept="application/pdf,.pdf" aria-label="Elegir referencia PDF" onChange={e=>{
        const next=e.currentTarget.files?.[0]||null;
        if(next&&next.type!=='application/pdf'&&!next.name.toLowerCase().endsWith('.pdf')){setDocNotice('Selecciona un PDF válido.');setSelectedPdf(null);return;}
        setSelectedPdf(next);setDocNotice('');
      }}/>
    </label>
    {docNotice&&<p className="crm-inline-help" role="status">{docNotice}</p>}
    <div className="crm-document-actions">
      <Button disabled={!selectedPdf} onClick={()=>{
        if(!selectedPdf)return;
        if(c.documentNames.includes(selectedPdf.name)){setDocNotice('Esta referencia ya está registrada.');return;}
        addDocumentName(c.id,selectedPdf.name);
        setDocNotice('Nombre del documento anotado. El contenido del PDF no se ha guardado.');
        setSelectedPdf(null);
      }}><Check size={16}/>Anotar nombre del PDF</Button>
      {selectedPdf&&<button type="button" className="crm-record-secondary" onClick={()=>setSelectedPdf(null)}>Cancelar</button>}
    </div>
  </Panel>
 </div>}
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
       <span className="orders-footer-note">Pagos y fechas anotados en este navegador, pendientes de validación documental.</span>
     </footer>
   </section>
 </div>;
}


/** Flujo de oficina: sin checklists genéricas ni mensajes externos simulados. */
function FactoryWorkflow({order,updateOrder,onPayment}:{order:Order;
 updateOrder:(id:string,patch:Partial<Order>,eventText?:string)=>void;onPayment:()=>void;}){
 const paid=order.paymentMode!=='Pendiente'&&order.advanceReceived>0;
 const [config,setConfig]=useState(()=>({
   color:order.color==='Por confirmar'?'':order.color,
   inletCount:order.inletCount||'',outletCount:order.outletCount||'',
   inletDiameterMm:order.inletDiameterMm||'',outletDiameterMm:order.outletDiameterMm||'',
   inletHeightMm:order.inletHeightMm||'',outletHeightMm:order.outletHeightMm||'',
   configurationNotes:order.configurationNotes||'',
   deliveryDate:order.deliveryDate||''
 }));
 const [spoken,setSpoken]=useState(false);
 const [transport,setTransport]=useState(()=>({
   transportCompany:order.transportCompany||'',transportContact:order.transportContact||'',
   departureDate:order.departureDate||'',transportNotes:order.transportNotes||''
 }));
 const [carrierConfirmed,setCarrierConfirmed]=useState(false);
 const [deliveredDate,setDeliveredDate]=useState(order.deliveredAt?.slice(0,10)||today());
 const [deliveryConfirmed,setDeliveryConfirmed]=useState(false);
 const [notice,setNotice]=useState('');
 const numberOk=(s:string)=>s.trim()!==''&&Number.isInteger(Number(s))&&Number(s)>=0;
 const mmOk=(s:string)=>s.trim()!==''&&Number.isFinite(Number(s))&&Number(s)>0;
 const countAndSizesOk=numberOk(config.inletCount)&&numberOk(config.outletCount)
  &&(Number(config.inletCount)===0||mmOk(config.inletDiameterMm))
  &&(Number(config.outletCount)===0||mmOk(config.outletDiameterMm));
 const configOk=paid&&config.color.trim()!==''&&config.color!=='Por confirmar'&&
   countAndSizesOk&&Boolean(config.deliveryDate)&&spoken;
 const transportOk=Boolean(transport.transportCompany.trim()&&transport.departureDate&&carrierConfirmed);
 const patchConfig=()=>{
   const connections='Entradas: '+config.inletCount+' · Ø '+(config.inletDiameterMm||'—')+
   ' mm · posición '+(config.inletHeightMm||'por confirmar')+' mm. Salidas: '+
   config.outletCount+' · Ø '+(config.outletDiameterMm||'—')+
   ' mm · posición '+(config.outletHeightMm||'por confirmar')+' mm.';
   return {...config,connections};
 };
 const saveConfig=()=>{
   updateOrder(order.id,patchConfig(),'Ficha de configuración del depósito guardada por la oficina');
   setNotice('Datos técnicos guardados en este navegador.');
 };
 const startProduction=()=>{
   if(!configOk||order.factory!=='Confirmando detalles')return;
   if(!window.confirm('¿Has hablado con el cliente y confirmado la configuración, medidas y fecha estimada? Se marcará el inicio de fabricación.'))return;
   updateOrder(order.id,{...patchConfig(),configurationConfirmedAt:new Date().toISOString(),
     productionStartedAt:new Date().toISOString(),factory:'En fabricación'},
   'Configuración confirmada con el cliente. Fabricación iniciada; aviso a Dirección registrado localmente.');
   setNotice('Fabricación iniciada. Aviso registrado en este CRM; el correo y WhatsApp aún no están conectados.');
 };
 const finishProduction=()=>{
   if(!window.confirm('¿Fábrica ha confirmado que la fabricación ha terminado y el producto está preparado?'))return;
   updateOrder(order.id,{factory:'Preparado'},'Fabricación terminada. Pedido preparado para coordinar transporte.');
   setNotice('Pedido preparado. Ahora corresponde confirmar transporte y descarga.');
 };
 const startShipping=()=>{
   if(!transportOk||order.factory!=='Preparado')return;
   if(!window.confirm('¿Transportista, salida y condiciones de entrega están confirmados?'))return;
   updateOrder(order.id,{...transport,transportConfirmedAt:new Date().toISOString(),factory:'En tránsito'},
     'Transporte confirmado: '+transport.transportCompany+'. Salida prevista '+transport.departureDate+'. Aviso local para Dirección.');
   setNotice('Transporte registrado. Aviso local a Dirección; correo/WhatsApp pendientes de activación.');
 };
 const confirmDelivered=()=>{
   if(!deliveryConfirmed||!deliveredDate||order.factory!=='En tránsito')return;
   if(!window.confirm('¿Está confirmada la entrega real del pedido? La comisión acordada pasará a pendiente de cobro.'))return;
   updateOrder(order.id,{deliveredAt:deliveredDate+'T12:00:00',factory:'Entregado'},
     'Entrega confirmada el '+deliveredDate+'. Comisión pendiente de liquidación al estar entregado.');
   setNotice('Entrega registrada. La comisión pendiente ya figura como exigible para Dirección.');
 };
 const phase=order.factory;
 return <div className="crm-office-flow">
  <div className="crm-office-top">
   <div><span>PROCESO DE OFICINA Y FÁBRICA</span><h3>{phase}</h3>
    <p>Primero confirma el ingreso; después recoge los detalles con el cliente y registra cada avance.</p></div>
   <span className={'crm-office-pay-status'+(paid?' is-paid':'')}>{paid?<><CheckCircle2 size={15}/>Primer pago verificado</>:<><Clock3 size={15}/>Primer pago pendiente</>}</span>
  </div>
  <div className="crm-office-timeline" aria-label="Fases de trabajo">
    {stages.map((step,index)=><div key={step} className={'crm-office-step'+(index===stages.indexOf(phase)?' is-current':index<stages.indexOf(phase)?' is-complete':'')}>
      <span>{index<stages.indexOf(phase)?<Check size={13}/>:index+1}</span><small>{step}</small>
    </div>)}
  </div>
  {!paid&&<div className="crm-office-gate">
    <strong>1. Comprobar el primer pago</strong>
    <p>El pedido está aceptado. La oficina o Dirección debe comprobar el ingreso antes de confirmar los detalles de fabricación.</p>
    <button type="button" onClick={onPayment}>Ir a Formalización <ChevronRight size={16}/></button>
  </div>}
  {paid&&phase==='Pendiente'&&<div className="crm-office-gate">
    <strong>Pago verificado. Continuar con los detalles</strong>
    <p>El registro es anterior al nuevo flujo. Puedes abrir la preparación sin alterar el pago ya anotado.</p>
    <button type="button" onClick={()=>updateOrder(order.id,{factory:'Confirmando detalles'},'Inicio de coordinación técnica tras comprobar ingreso')}>Continuar con el cliente <ChevronRight size={16}/></button>
  </div>}
  {paid&&phase!=='Pendiente'&&<div className="crm-office-config">
    <div className="crm-office-section-heading"><div><span>PASO DE CONFIGURACIÓN</span>
     <h4>Datos acordados con el cliente</h4><p>Color, entradas, salidas, medidas en mm y entrega estimada.</p></div>
     {order.configurationConfirmedAt&&<span className="crm-office-verified"><CheckCircle2 size={15}/>Confirmado</span>}
    </div>
    {phase==='Confirmando detalles'||phase==='En fabricación'?<div className="crm-office-fields">
      <Field label="Color del depósito"><input value={config.color} placeholder="Ej. Blanco" onChange={e=>setConfig(v=>({...v,color:e.target.value}))}/></Field>
      <Field label="Entrega estimada"><input type="date" value={config.deliveryDate} onChange={e=>setConfig(v=>({...v,deliveryDate:e.target.value}))}/></Field>
      <Field label="Número de entradas"><input type="number" min="0" step="1" value={config.inletCount} placeholder="0" onChange={e=>setConfig(v=>({...v,inletCount:e.target.value}))}/></Field>
      <Field label="Diámetro entradas (mm)"><input type="number" min="0" step="1" value={config.inletDiameterMm} placeholder="Ej. 63" onChange={e=>setConfig(v=>({...v,inletDiameterMm:e.target.value}))}/></Field>
      <Field label="Altura/posición entradas (mm)"><input type="number" min="0" step="1" value={config.inletHeightMm} placeholder="Desde la base, si aplica" onChange={e=>setConfig(v=>({...v,inletHeightMm:e.target.value}))}/></Field>
      <Field label="Número de salidas"><input type="number" min="0" step="1" value={config.outletCount} placeholder="0" onChange={e=>setConfig(v=>({...v,outletCount:e.target.value}))}/></Field>
      <Field label="Diámetro salidas (mm)"><input type="number" min="0" step="1" value={config.outletDiameterMm} placeholder="Ej. 50" onChange={e=>setConfig(v=>({...v,outletDiameterMm:e.target.value}))}/></Field>
      <Field label="Altura/posición salidas (mm)"><input type="number" min="0" step="1" value={config.outletHeightMm} placeholder="Desde la base, si aplica" onChange={e=>setConfig(v=>({...v,outletHeightMm:e.target.value}))}/></Field>
      <div className="crm-office-field-wide"><Field label="Otras conexiones, ubicación y detalles de la llamada"><textarea rows={3} value={config.configurationNotes} onChange={e=>setConfig(v=>({...v,configurationNotes:e.target.value}))} placeholder="Tomas, accesorios, observaciones y condiciones confirmadas..."/></Field></div>
    </div>:<div className="crm-office-summary">
      <span><b>Color:</b> {order.color||'Pendiente'}</span>
      <span><b>Entradas:</b> {order.inletCount||'No anotadas'} · diámetro {order.inletDiameterMm||'—'} mm</span>
      <span><b>Salidas:</b> {order.outletCount||'No anotadas'} · diámetro {order.outletDiameterMm||'—'} mm</span>
      <span><b>Entrega prevista:</b> {dateText(order.deliveryDate)}</span>
      {order.configurationNotes&&<p>{order.configurationNotes}</p>}
    </div>}
    {phase==='Confirmando detalles'&&<div className="crm-office-actions">
      <label className="crm-office-confirm"><input type="checkbox" checked={spoken} onChange={e=>setSpoken(e.target.checked)}/>He hablado con el cliente y ha confirmado estos datos</label>
      <div><button type="button" className="crm-office-secondary" onClick={saveConfig}>Guardar anotaciones</button>
      <button type="button" className="crm-office-primary" disabled={!configOk} onClick={startProduction}><Factory size={16}/>Confirmar e iniciar fabricación</button></div>
    </div>}
    {phase==='En fabricación'&&<div className="crm-office-actions">
      <div><button type="button" className="crm-office-secondary" onClick={saveConfig}>Guardar cambios técnicos</button>
      <button type="button" className="crm-office-primary" onClick={finishProduction}>Fabricación terminada <ChevronRight size={16}/></button></div>
    </div>}
  </div>}
  {paid&&['Preparado','En tránsito','Entregado'].includes(phase)&&<div className="crm-office-transport">
   <div className="crm-office-section-heading"><div><span>PASO DE TRANSPORTE</span><h4>Transportista y salida</h4>
    <p>Comprobar previamente acceso, medios de descarga y condiciones del porte externo.</p></div>
    {order.transportConfirmedAt&&<span className="crm-office-verified"><CheckCircle2 size={15}/>Confirmado</span>}
   </div>
   {phase==='Preparado'?<>
     <div className="crm-office-fields">
      <Field label="Transportista confirmado"><input value={transport.transportCompany} placeholder="Nombre o referencia" onChange={e=>setTransport(v=>({...v,transportCompany:e.target.value}))}/></Field>
      <Field label="Teléfono o contacto transportista"><input value={transport.transportContact} onChange={e=>setTransport(v=>({...v,transportContact:e.target.value}))}/></Field>
      <Field label="Fecha prevista de salida"><input type="date" value={transport.departureDate} onChange={e=>setTransport(v=>({...v,departureDate:e.target.value}))}/></Field>
      <div className="crm-office-field-wide"><Field label="Acceso, descarga y observaciones de transporte"><textarea rows={3} value={transport.transportNotes} placeholder="¿Quién descarga? ¿Grúa/pluma? ¿Acceso apto?" onChange={e=>setTransport(v=>({...v,transportNotes:e.target.value}))}/></Field></div>
     </div>
     <div className="crm-office-actions"><label className="crm-office-confirm"><input type="checkbox" checked={carrierConfirmed} onChange={e=>setCarrierConfirmed(e.target.checked)}/>He hablado con el transportista y está confirmado</label>
      <div><button type="button" className="crm-office-primary" disabled={!transportOk} onClick={startShipping}><Truck size={16}/>Confirmar transporte y marcar enviado</button></div>
     </div>
   </>:<div className="crm-office-summary">
     <span><b>Transportista:</b> {order.transportCompany||'Sin especificar'}</span>
     <span><b>Salida:</b> {dateText(order.departureDate)}</span>
     {order.transportContact&&<span><b>Contacto:</b> {order.transportContact}</span>}
     {order.transportNotes&&<p>{order.transportNotes}</p>}
   </div>}
  </div>}
  {paid&&phase==='En tránsito'&&<div className="crm-office-delivery">
    <div className="crm-office-section-heading"><div><span>PASO DE ENTREGA</span><h4>Confirmar entrega al cliente</h4>
     <p>Al confirmar la entrega, la comisión pendiente quedará disponible para su cobro.</p></div></div>
    <Field label="Fecha real de entrega"><input type="date" value={deliveredDate} max={today()} onChange={e=>setDeliveredDate(e.target.value)}/></Field>
    <div className="crm-office-actions"><label className="crm-office-confirm"><input type="checkbox" checked={deliveryConfirmed} onChange={e=>setDeliveryConfirmed(e.target.checked)}/>Entrega confirmada por cliente o transportista</label>
      <div><button type="button" className="crm-office-primary" disabled={!deliveredDate||deliveredDate>today()||!deliveryConfirmed} onClick={confirmDelivered}><CheckCircle2 size={16}/>Marcar entregado</button></div></div>
  </div>}
  {phase==='Entregado'&&<div className="crm-office-delivered" role="status"><CheckCircle2 size={19}/>
   <div><strong>Pedido entregado{order.deliveredAt?' · '+dateText(order.deliveredAt.slice(0,10)):''}</strong>
   <p>El saldo de comisión, si existe, está pendiente de liquidación. El cobro no se registra automáticamente.</p></div>
  </div>}
  {notice&&<div role="status" className="crm-office-notice"><CheckCircle2 size={16}/>{notice}</div>}
  <p className="crm-office-disclaimer">Los avisos a Dirección quedan anotados en este navegador. No se envían WhatsApp o correos hasta que exista backend, usuarios autenticados y proveedor configurado.</p>
 </div>;
}

export function OrderDetail(){
 const {id}=useParams();
 const [params]=useSearchParams();
 const {data,role,verifyPayment,updateOrder,addCommissionPayment}=useCrm();
 const o=data.orders.find(x=>x.id===id);
 const [tab,setTab]=useState(params.get('tab')||(role==='fabrica'?'Fabricación':'Resumen'));
 const [payment,setPayment]=useState('');
 const [payMode,setPayMode]=useState<Order['paymentMode']>('Anticipo verificado');
 const [paymentChecked,setPaymentChecked]=useState(false);
 const [commission,setCommission]=useState('');
 const [note,setNote]=useState('');
 const [paymentError,setPaymentError]=useState('');
 if(!o)return <div className="page"><Back to="/pedidos" label="Volver a pedidos"/><Empty title="Pedido no encontrado" body="Consulta el listado de pedidos."/></div>;
 const paid=o.paymentMode!=='Pendiente'&&o.advanceReceived>0;
 const balance=Math.max(0,o.commission-o.commissionPaid);
 const payable=o.factory==='Entregado';
 const paymentAmount=Number(payment);
 const canVerify=!paid&&paymentChecked&&payment.trim()!==''&&Number.isFinite(paymentAmount)
   &&paymentAmount>0&&paymentAmount<=o.amount
   &&(payMode!=='Pago completo verificado'||Math.abs(paymentAmount-o.amount)<0.01);
 const tabs=role==='fabrica'?['Resumen','Formalización','Fabricación','Actividad']:['Resumen','Formalización','Fabricación','Comisiones','Actividad'];
 const selected=tabs.includes(tab)?tab:'Resumen';
 const confirmPayment=()=>{
   if(!canVerify)return;
   if(!window.confirm('¿Has comprobado realmente el ingreso de '+money(paymentAmount)+' y quieres dejar constancia?'))return;
   verifyPayment(o.id,payMode,paymentAmount,role==='fabrica'?'Oficina':'Dirección');
   setPaymentError('');setPaymentChecked(false);setPayment('');
 };
 return <div className="page page-crm-record crm-order-office">
  <Back to="/pedidos" label="Volver a pedidos"/>
  <div className="record-hero"><div><div className="eyebrow">{o.id} · {dateText(o.createdAt)}</div>
   <h1>{o.buyerName}</h1><p>{o.product} · {o.capacity}</p>
   <div className="record-meta"><Status value={o.factory}/><span>·</span>
     <span className={'crm-order-payment-chip'+(paid?' is-paid':'')}>{paid?<CheckCircle2 size={14}/>:<Clock3 size={14}/>} {paid?'Primer pago verificado':'Primer pago pendiente'}</span>
   </div></div><Pill>{role==='fabrica'?'Gestión de oficina':'Ficha de pedido'}</Pill>
  </div>
  <div className="detail-tabs">{tabs.map(t=><button className={selected===t?'selected':''} key={t} type="button" onClick={()=>setTab(t)}>{t}</button>)}</div>
  {selected==='Resumen'&&<div className="detail-grid">
   <Panel title="Información general"><div className="info-grid">
    <Info label="Referencia" value={o.id}/><Info label="Producto" value={o.product}/>
    <Info label="Capacidad" value={o.capacity}/><Info label="Fase" value={o.factory}/>
    <Info label="Cliente" value={o.buyerName}/><Info label="Entrega prevista" value={dateText(o.deliveryDate)}/>
    <Info label="Primer pago" value={paid?'Verificado':'Pendiente'}/><Info label="Entrega efectiva" value={o.factory==='Entregado'?(o.deliveredAt?dateText(o.deliveredAt.slice(0,10)):'Fecha no registrada'):'Pendiente'}/>
   </div><h4 className="minor-title">Anotaciones</h4><div className="note-area">{o.notes||'Sin observaciones registradas.'}</div></Panel>
   <div className="right-stack"><Panel title="Siguiente paso">
     <div className="crm-office-summary-status"><span className={paid?'is-paid':'is-pending'}>{paid?<CheckCircle2 size={18}/>:<Clock3 size={18}/>}</span>
      <div><strong>{paid?'Primer pago comprobado':'Pendiente de comprobar pago'}</strong>
       <p>{!paid?'La oficina o Dirección debe confirmar el ingreso antes de definir el depósito.'
         :o.factory==='Entregado'?'Entrega completada. Revisar comisión pendiente.'
         :o.factory==='En tránsito'?'Confirmar la entrega con el cliente o transportista.'
         :o.factory==='Preparado'?'Coordinar y confirmar el transportista.'
         :o.factory==='En fabricación'?'Esperar confirmación de fabricación terminada.'
         :'Hablar con el cliente y fijar características y fecha estimada.'}</p></div></div>
     <button type="button" className="crm-office-link" onClick={()=>setTab(!paid?'Formalización':'Fabricación')}>Abrir siguiente paso <ChevronRight size={16}/></button>
   </Panel>
   {role==='direccion'&&<Panel title="Control económico privado"><div className="money-summary"><span>Importe de operación</span><strong>{money(o.amount)}</strong></div>
    <div className="summary-line"><span>Ingreso inicial comprobado</span><strong>{money(o.advanceReceived)}</strong></div>
    <div className="summary-line"><span>Comisión</span><strong>{payable?money(balance)+' · pendiente de cobro':'No exigible hasta la entrega'}</strong></div>
   </Panel>}</div>
  </div>}
  {selected==='Formalización'&&<div className="detail-grid">
   <Panel title="Comprobación del primer pago">
    {paid?<div className="crm-payment-success" role="status">
      <CheckCircle2 size={24}/><div><strong>Primer pago verificado</strong>
      <p>Ingreso anotado: <b>{money(o.advanceReceived)}</b> · {o.paymentMode}</p>
      <small>{o.paymentVerifiedAt?'Registrado el '+dateText(o.paymentVerifiedAt.slice(0,10)):'Verificación histórica sin fecha exacta registrada'}{o.paymentVerifiedBy?' · '+o.paymentVerifiedBy:''}</small>
      </div></div>:
     <div className="crm-payment-form">
      <p className="muted">Confirma aquí únicamente un ingreso realmente comprobado. No se verifica con el banco automáticamente.</p>
      <div className="form-grid">
       <Field label="Tipo de pago"><select value={payMode} onChange={e=>{setPayMode(e.target.value as Order['paymentMode']);setPaymentError('')}}>
         <option value="Anticipo verificado">Anticipo verificado</option><option value="Pago completo verificado">Pago completo verificado</option>
       </select></Field>
       <Field label="Importe realmente comprobado (€)"><input type="number" required inputMode="decimal" min=".01" max={o.amount} step=".01" value={payment}
        onChange={e=>{setPayment(e.target.value);setPaymentError('')}} placeholder="Introduce el importe confirmado"/></Field>
      </div>
      <label className="crm-payment-assertion"><input type="checkbox" checked={paymentChecked} onChange={e=>setPaymentChecked(e.target.checked)}/>
       He comprobado el ingreso con el medio de pago correspondiente.</label>
      {paymentError&&<p role="alert" className="crm-office-error">{paymentError}</p>}
      <button type="button" className="crm-office-primary" disabled={!canVerify} onClick={confirmPayment}><CheckCircle2 size={16}/>Confirmar primer pago</button>
      <p className="crm-inline-help">Al guardar, se desbloqueará la preparación del depósito. No se volverá a registrar el mismo primer pago.</p>
     </div>}
   </Panel>
   <Panel title="Documentación gestionada por oficina"><div className="info-grid">
     <Info label="Presupuesto" value={o.quoteId||'Sin presupuesto vinculado'}/>
     <Info label="Proforma" value="Oficina del fabricante"/>
     <Info label="Factura" value="Oficina del fabricante"/>
     <Info label="PDF" value="Almacenamiento privado pendiente"/>
   </div><p className="crm-inline-help">Los documentos oficiales son externos al CRM y sus archivos aún no están almacenados aquí.</p>
   </Panel>
  </div>}
  {selected==='Fabricación'&&<div className="detail-grid crm-order-factory-grid">
   <Panel title="Seguimiento de fabricación y entrega">
     <FactoryWorkflow key={o.id} order={o} updateOrder={updateOrder} onPayment={()=>setTab('Formalización')}/>
   </Panel>
   <Panel title="Anotaciones e incidencias de oficina">
     <form className="form-stack" onSubmit={(e:FormEvent)=>{e.preventDefault();if(note.trim()){
       updateOrder(o.id,{notes:note.trim()},'Nueva anotación de oficina: '+note.trim());setNote('');
     }}}>
      <Field label="Comentario de seguimiento"><textarea rows={5} value={note} onChange={e=>setNote(e.target.value)}
        placeholder="Incidencias, detalles acordados o cambios comunicados por fábrica..."/></Field>
      <Button type="submit" disabled={!note.trim()}><Plus size={16}/>Guardar anotación</Button>
     </form>
     <div className="crm-office-lastnotes"><strong>Última anotación</strong><p>{o.notes||'No hay anotaciones.'}</p></div>
     <div className="crm-office-disclaimer">El histórico identifica cambios hechos en la interfaz, pero no constituye auditoría de usuarios autenticados.</div>
   </Panel>
  </div>}
  {selected==='Comisiones'&&role==='direccion'&&<div className="detail-grid">
   <Panel title="Liquidación comercial"><div className="big-balance">{money(balance)}
     <span>{payable?'pendiente de liquidar tras la entrega':'no exigible hasta la entrega'}</span></div>
     <div className="summary-line"><span>Comisión acordada</span><strong>{money(o.commission)}</strong></div>
     <div className="summary-line"><span>Comisión registrada como cobrada</span><strong>{money(o.commissionPaid)}</strong></div>
     <div className="commission-meter"><span style={{width:(o.commission?100*o.commissionPaid/o.commission:0)+'%'}}/></div>
     <Pill tone={balance<=0?'green':payable?'amber':'neutral'}>{balance<=0?'Pagada':payable?'Pendiente de cobro':'Esperando entrega'}</Pill>
   </Panel>
   <Panel title="Registrar cobro de comisión">
    {payable?<div className="form-stack"><p className="muted">Registra únicamente comisiones cobradas después de confirmar la entrega.</p>
      <Field label="Importe recibido (€)"><input type="number" min=".01" step=".01" max={balance} value={commission} onChange={e=>setCommission(e.target.value)}/></Field>
      <Button disabled={!(Number(commission)>0&&Number(commission)<=balance)} onClick={()=>{addCommissionPayment(o.id,Number(commission));setCommission('')}}><CreditCard size={16}/>Registrar cobro</Button>
    </div>:<div className="crm-office-gate"><Clock3 size={20}/><p>La comisión se cobrará cuando el pedido figure como entregado. Hasta entonces no se puede anotar un nuevo cobro.</p></div>}
   </Panel>
  </div>}
  {selected==='Actividad'&&<div className="detail-grid">
   <Panel title="Cronología del pedido"><Timeline items={o.activity}/></Panel>
   <Panel title="Seguimiento posventa"><div className="note-area">Después de la entrega se conserva el historial para coordinar el cobro de la comisión y la atención posventa.</div>
     <Link to="/agenda" className="btn btn-outline"><CalendarPlus size={16}/>Abrir agenda</Link></Panel>
  </div>}
 </div>;
}

export function Commissions(){
 const {data,addCommissionPayment,updateOrder}=useCrm();
 const navigate=useNavigate();
 const [filter,setFilter]=useState('Pendientes');
 const [search,setSearch]=useState('');
 const [quickModal,setQuickModal]=useState(false);
 const [selectedOrder,setSelectedOrder]=useState('');
 const [quickMode,setQuickMode]=useState<'payment'|'agreed'>('payment');
 const [quickAmount,setQuickAmount]=useState('');
 const [quickError,setQuickError]=useState('');
 const openQuick=()=>{
   const first=data.orders.find(o=>o.commission>o.commissionPaid);
   setQuickMode(first?'payment':'agreed');setSelectedOrder(first?.id||data.orders[0]?.id||'');
   setQuickAmount('');setQuickError('');setQuickModal(true);
 };
 const quickOrder=data.orders.find(o=>o.id===selectedOrder);
 const quickBalance=quickOrder?Math.max(0,quickOrder.commission-quickOrder.commissionPaid):0;
 const quickValue=Number(quickAmount);
 const quickValid=Boolean(quickOrder&&quickAmount.trim()!==''&&Number.isFinite(quickValue)&&quickValue>=0&&
   (quickMode==='payment'?(quickValue>0&&quickValue<=quickBalance):(quickValue>=quickOrder.commissionPaid)));
 const saveQuick=(event:FormEvent)=>{
   event.preventDefault();setQuickError('');
   if(!quickOrder||!quickValid){setQuickError('Comprueba el pedido y el importe indicado.');return;}
   if(quickMode==='payment')addCommissionPayment(quickOrder.id,quickValue);
   else updateOrder(quickOrder.id,{commission:quickValue});
   setQuickModal(false);setQuickAmount('');
 };
 // Mantener exactamente la clasificación y los cálculos existentes del store.
 const matchesStatus=(o:Order,status:string)=>
   status==='Todas'
   ||(status==='Pendientes'&&o.commissionPaid===0)
   ||(status==='Parciales'&&o.commissionPaid>0&&o.commissionPaid<o.commission)
   ||(status==='Pagadas'&&o.commissionPaid>=o.commission);
 const tabs=['Pendientes','Parciales','Pagadas','Todas'];
 const term=search.trim().toLocaleLowerCase('es-ES');
 const list=data.orders.filter(o=>matchesStatus(o,filter)
   &&[o.buyerName,o.id,o.product,o.capacity].join(' ').toLocaleLowerCase('es-ES').includes(term));
 const earned=data.orders.reduce((a,o)=>a+o.commission,0);
 const paid=data.orders.reduce((a,o)=>a+o.commissionPaid,0);
 return <div className="page page-opportunities page-commissions">
   <div className="op-screen-heading">
     <div className="op-heading-copy">
       <h1 id="commissions-title">Mis comisiones</h1>
       <p>Control privado de las comisiones acordadas, cobradas y pendientes de liquidar.</p>
     </div>
     <div className="op-heading-actions">
       <button type="button" className="op-new-button" onClick={openQuick}><Plus size={17}/>Registrar comisión</button>
       <Link to="/pedidos" className="op-export-button"><Package size={16}/>Ver pedidos</Link>
     </div>
   </div>
   <section className="commission-banners" aria-label="Resumen de comisiones">
     <article className="commission-banner is-generated">
       <div className="commission-banner-heading"><span>Comisiones generadas</span><span className="commission-banner-icon"><Wallet size={19}/></span></div>
       <strong className="commission-banner-value">{money(earned)}</strong>
       <span className="commission-banner-caption">Total acordado en los pedidos registrados</span>
     </article>
     <article className="commission-banner is-collected">
       <div className="commission-banner-heading"><span>Comisiones cobradas</span><span className="commission-banner-icon"><CheckCircle2 size={19}/></span></div>
       <strong className="commission-banner-value">{money(paid)}</strong>
       <span className="commission-banner-caption">Importes efectivamente registrados como liquidados</span>
     </article>
     <article className="commission-banner is-outstanding">
       <div className="commission-banner-heading"><span>Pendiente de cobro</span><span className="commission-banner-icon"><Clock3 size={19}/></span></div>
       <strong className="commission-banner-value">{money(earned-paid)}</strong>
       <span className="commission-banner-caption">Saldo de comisión · No equivale a beneficio neto</span>
     </article>
   </section>
   <nav className="op-phase-tabs commission-tabs" aria-label="Filtrar por estado de comisión">
     {tabs.map(tab=><button key={tab} type="button" className={'op-phase-tab'+(filter===tab?' is-active':'')}
       aria-pressed={filter===tab} onClick={()=>setFilter(tab)}>
       <span>{tab}</span><strong>{data.orders.filter(o=>matchesStatus(o,tab)).length}</strong>
     </button>)}
   </nav>
   <div className="commission-toolbar">
     <label className="op-search">
       <Search size={18} aria-hidden="true"/>
       <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
         aria-label="Buscar comisión por cliente, pedido o producto"
         placeholder="Buscar cliente, pedido o producto"/>
       {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
     </label>
     <span className="commission-toolbar-meta">{list.length} {list.length===1?'registro':'registros'}</span>
   </div>
   <section className="op-table-panel commissions-table-panel" aria-labelledby="commissions-title">
     <div className="op-table-scroll" role="region" tabIndex={0} aria-label="Comisiones con desplazamiento vertical">
       <table className="op-data-table commissions-data-table">
         <thead><tr>
           <th scope="col" className="commission-col-client">Cliente / pedido</th>
           <th scope="col" className="commission-col-agreed">Comisión acordada</th>
           <th scope="col" className="commission-col-paid">Cobrado</th>
           <th scope="col" className="commission-col-due">Pendiente</th>
           <th scope="col" className="commission-col-status">Estado</th>
           <th scope="col" className="commission-col-open" aria-label="Acceso a la ficha"></th>
         </tr></thead>
         <tbody>{list.map(o=>{
           const balance=o.commission-o.commissionPaid;
           const state=o.commissionPaid===0?'Pendiente':o.commissionPaid<o.commission?'Parcialmente cobrada':'Pagada';
           const tone=state==='Pendiente'?'is-due':state==='Pagada'?'is-paid':'is-partial';
           const orderUrl='/pedidos/'+o.id+'?tab=Comisiones';
           const customerUrl='/clientes/'+o.customerId;
           return <tr key={o.id} className="op-clickable-row" onClick={()=>navigate(orderUrl)}>
             <td className="commission-col-client"><div className="op-client-cell">
               <Initials name={o.buyerName}/>
               <div className="op-client-copy">
                 <Link to={customerUrl} className="op-client-name commission-client-link"
                   title={'Ver ficha del cliente: '+o.buyerName} onClick={e=>e.stopPropagation()}>{o.buyerName}</Link>
                 <span className="op-client-sub">{o.id}</span>
               </div>
             </div></td>
             <td className="commission-col-agreed"><span className="commission-amount">{money(o.commission)}</span></td>
             <td className="commission-col-paid"><span className="commission-amount">{money(o.commissionPaid)}</span></td>
             <td className="commission-col-due"><strong className={'commission-amount'+(balance>0?' has-balance':'')}>{money(balance)}</strong></td>
             <td className="commission-col-status"><span className={'commission-state '+tone}>{state}</span></td>
             <td className="commission-col-open"><Link to={orderUrl} className="op-row-open"
               aria-label={'Abrir comisiones del pedido '+o.id} onClick={e=>e.stopPropagation()}><ChevronRight size={18}/></Link></td>
           </tr>;
         })}</tbody>
       </table>
       {!list.length&&<Empty title="Sin registros" body="Prueba otra pestaña o modifica la búsqueda."/>}
     </div>
     <footer className="op-table-footer">
       Mostrando <strong>{list.length}</strong> de <strong>{data.orders.length}</strong> pedidos
       <span className="commission-footer-note">Comisiones anotadas · Confirmar los cobros con sus justificantes</span>
     </footer>
   </section>
   {quickModal&&<Modal title="Registrar comisión de un pedido" onClose={()=>setQuickModal(false)}>
     <form className="modal-form commission-quick-form" onSubmit={saveQuick}>
       <Field label="Operación"><select required value={selectedOrder} onChange={e=>{setSelectedOrder(e.target.value);setQuickAmount('');setQuickError('')}}>
         <option value="">Selecciona un pedido</option>
         {data.orders.map(o=><option key={o.id} value={o.id}>{o.id} · {o.buyerName} · {o.product}</option>)}
       </select></Field>
       <div className="commission-quick-modes" role="group" aria-label="Operación de comisión">
         <button type="button" className={quickMode==='payment'?'active':''} aria-pressed={quickMode==='payment'} onClick={()=>{setQuickMode('payment');setQuickAmount('')}}>Registrar cobro</button>
         <button type="button" className={quickMode==='agreed'?'active':''} aria-pressed={quickMode==='agreed'} onClick={()=>{setQuickMode('agreed');setQuickAmount('')}}>Comisión acordada</button>
       </div>
       {quickOrder&&<div className="commission-quick-facts"><div><span>Acordada</span><strong>{money(quickOrder.commission)}</strong></div><div><span>Registrada como cobrada</span><strong>{money(quickOrder.commissionPaid)}</strong></div><div><span>Pendiente</span><strong>{money(quickBalance)}</strong></div></div>}
       <Field label={quickMode==='payment'?'Cobro recibido (€)':'Importe acordado total (€)'}><input type="number" required min={quickMode==='payment'?'0.01':String(quickOrder?.commissionPaid||0)} max={quickMode==='payment'?String(quickBalance):undefined} step="0.01" value={quickAmount} onChange={e=>setQuickAmount(e.target.value)} placeholder="0,00"/></Field>
       <p className="commission-quick-hint">{quickMode==='payment'?'Registra únicamente importes realmente recibidos; el saldo se actualiza sin superar la comisión acordada.':'Edita la comisión pactada para este pedido. No se modifican cobros anteriores; el total no puede ser inferior a lo ya cobrado.'}</p>
       {quickError&&<p className="commission-quick-error" role="alert">{quickError}</p>}
       <div className="modal-actions"><Button variant="outline" onClick={()=>setQuickModal(false)}>Cancelar</Button><Button type="submit" disabled={!quickValid}><Check size={16}/>Guardar</Button></div>
     </form>
   </Modal>}
 </div>;
}
export function FactoryHome(){
 const {data}=useCrm();const active=data.orders.filter(o=>o.factory!=='Entregado');
 return <div className="page page-opportunities crm-workspace page-factory">
   <header className="op-screen-heading">
     <div className="op-heading-copy"><h1>Pedidos asignados</h1><p>Consulta el estado de preparación y entrega de los pedidos.</p></div>
     <div className="op-heading-actions"><Link to="/pedidos" className="op-new-button"><Package size={16}/>Ver pedidos</Link></div>
   </header>
   <div className="kpi-grid three crm-workspace-kpis">
     <div className="kpi"><div className="kpi-top">Por revisar<Package size={20}/></div><div className="kpi-value">{active.filter(o=>o.factory==='Pendiente'||o.factory==='Confirmando detalles').length}</div><div className="kpi-foot">Esperando confirmación</div></div>
     <div className="kpi"><div className="kpi-top">En fabricación<Factory size={20}/></div><div className="kpi-value">{active.filter(o=>o.factory==='En fabricación').length}</div><div className="kpi-foot">Preparación registrada</div></div>
     <div className="kpi"><div className="kpi-top">Preparado / en tránsito<Truck size={20}/></div><div className="kpi-value">{active.filter(o=>o.factory==='Preparado'||o.factory==='En tránsito').length}</div><div className="kpi-foot">Seguimiento de salida y entrega</div></div>
   </div>
   <Panel title="Operaciones a cargo" className="factory-orders-panel" extra={<ActionLink to="/pedidos">Ver listado</ActionLink>}>
     <div className="simple-list">{active.map(o=><Link className="simple-item" to={'/pedidos/'+o.id} key={o.id}>
       <Package size={19}/><div><strong>{o.buyerName}</strong><small>{o.id} · {o.capacity}</small></div>
       <Status value={o.factory}/><ChevronRight size={16}/>
     </Link>)}{!active.length&&<Empty title="Sin pedidos en curso" body="No hay operaciones pendientes de preparación en esta vista."/>}</div>
   </Panel>
   <div className="inline-tip top-gap factory-demo-note"><Shield size={16}/> El control de acceso por usuario aún no está activado. No compartas información privada en este entorno.</div>
 </div>;
}
