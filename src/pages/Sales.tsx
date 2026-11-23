import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Download, FileText, Filter, MapPin, MessageCircle, Plus, Search, Shield, Sparkles, Truck, ExternalLink, X } from 'lucide-react';
import { useCrm } from '../store';
import { type OpportunityStatus, type Channel, type QuoteStatus, decimal, money, dateText, today } from '../domain';
import { ActionLink, Back, Button, CopyButton, Empty, Field, Info, Initials, Modal, NoteDemo, PageHeader, Panel, Pill, Status, Timeline } from '../ui';

const statuses: OpportunityStatus[]=['Nueva','Cualificación','Por presupuestar','Presupuesto enviado','Seguimiento','Aceptada','Perdida'];
const channels: Channel[]=['Web','WhatsApp','Wallapop','Facebook','Teléfono','Otro'];
const quoteStatuses:QuoteStatus[]=['Borrador','Enviado','Aceptado','Rechazado'];

type OpportunityQuickFilter = 'Todas'|'Nueva'|'En gestión'|'Por presupuestar'|'Presupuesto enviado'|'Aceptada'|'Perdida';
type OpportunitySort = 'Recientes'|'Antiguas'|'Próximo seguimiento';
const formatRangeDate=(iso:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso+'T12:00:00'));

export function Opportunities(){
 const {data,addOpportunity}=useCrm();
 const nav=useNavigate();
 const [search,setSearch]=useState('');
 const [quick,setQuick]=useState<OpportunityQuickFilter>('Todas');
 const [status,setStatus]=useState('Todos los estados');
 const [channel,setChannel]=useState('Todos los canales');
 const [sort,setSort]=useState<OpportunitySort>('Recientes');
 const [overdueOnly,setOverdueOnly]=useState(false);
 const [dateFrom,setDateFrom]=useState('');
 const [dateTo,setDateTo]=useState('');
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [datesOpen,setDatesOpen]=useState(false);
 const [modal,setModal]=useState(false);
 const [form,setForm]=useState({name:'',channel:'WhatsApp' as Channel,contact:'',alias:'',conversation:'',product:'Depósito vertical base plana',capacity:'',destination:'',message:'',nextDate:today()});
 const isClosed=(s:OpportunityStatus)=>s==='Aceptada'||s==='Perdida';
 const isOverdue=(o:{status:OpportunityStatus;nextDate:string})=>Boolean(o.nextDate&&o.nextDate<today()&&!isClosed(o.status));
 const quickMatch=(s:OpportunityStatus,k:OpportunityQuickFilter)=>k==='Todas'||(k==='En gestión'?(s==='Cualificación'||s==='Seguimiento'):s===k);
 const groups:{id:OpportunityQuickFilter;label:string;tone:string}[]=[
   {id:'Todas',label:'Todas',tone:'all'},
   {id:'Nueva',label:'Nuevas',tone:'new'},
   {id:'En gestión',label:'En gestión',tone:'working'},
   {id:'Por presupuestar',label:'Por presupuestar',tone:'quote'},
   {id:'Presupuesto enviado',label:'Presupuestadas',tone:'sent'},
   {id:'Aceptada',label:'Aceptadas',tone:'won'},
   {id:'Perdida',label:'Perdidas',tone:'lost'}
 ];
 const query=search.trim().toLocaleLowerCase('es-ES');
 const list=data.opportunities.filter(o=>
   quickMatch(o.status,quick)
   &&(status==='Todos los estados'||o.status===status)
   &&(channel==='Todos los canales'||o.channel===channel)
   &&(!overdueOnly||isOverdue(o))
   &&(!dateFrom||(o.receivedAt||o.createdAt).slice(0,10)>=dateFrom)
   &&(!dateTo||(o.receivedAt||o.createdAt).slice(0,10)<=dateTo)
   &&[o.id,o.name,o.product,o.capacity,o.destination,o.alias,o.channel,o.contact,o.nextAction]
       .join(' ').toLocaleLowerCase('es-ES').includes(query)
 ).sort((a,b)=>{
   if(sort==='Próximo seguimiento')return (a.nextDate||'9999-12-31').localeCompare(b.nextDate||'9999-12-31')
     ||(b.receivedAt||b.createdAt).localeCompare(a.receivedAt||a.createdAt);
   const diff=(b.receivedAt||b.createdAt).localeCompare(a.receivedAt||a.createdAt);
   return sort==='Antiguas'?-diff:diff;
 });
 const hasFilters=Boolean(search.trim()||quick!=='Todas'||status!=='Todos los estados'||channel!=='Todos los canales'||sort!=='Recientes'||overdueOnly||dateFrom||dateTo);
 const dateRangeLabel=dateFrom&&dateTo?formatRangeDate(dateFrom)+' – '+formatRangeDate(dateTo):dateFrom?'Desde '+formatRangeDate(dateFrom):dateTo?'Hasta '+formatRangeDate(dateTo):'Todas las fechas';
 const exportFilteredCsv=()=>{
   if(!list.length)return;
   const headers=['Referencia','Cliente','Producto','Capacidad','Localidad','Canal','Recibida','Estado','Próxima acción','Fecha de seguimiento'];
   const safeCell=(value:string)=>{
     const normalized=String(value??'');
     const safe=/^\s*[=+@-]/.test(normalized)?"'"+normalized:normalized;
     return '"'+safe.replace(/"/g,'""')+'"';
   };
   const rows=list.map(o=>[o.id,o.name,o.product,o.capacity,o.destination,o.channel,(o.receivedAt||o.createdAt).slice(0,10),o.status,o.nextAction,o.nextDate]);
   const csv='\uFEFF'+[headers,...rows].map(row=>row.map(safeCell).join(';')).join('\r\n');
   const file=new Blob([csv],{type:'text/csv;charset=utf-8;'});
   const url=URL.createObjectURL(file);
   const anchor=document.createElement('a');
   anchor.href=url;
   anchor.download='depofibra-oportunidades-'+today()+'.csv';
   document.body.appendChild(anchor);
   anchor.click();
   anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const clearFilters=()=>{setSearch('');setQuick('Todas');setStatus('Todos los estados');setChannel('Todos los canales');setSort('Recientes');setOverdueOnly(false);setDateFrom('');setDateTo('')};
 const save=(e:FormEvent)=>{e.preventDefault();if(!form.name.trim()||!form.product.trim())return;addOpportunity({...form,name:form.name.trim(),status:'Nueva',nextAction:'Responder consulta inicial'});setModal(false);setForm({...form,name:'',contact:'',alias:'',capacity:'',destination:'',message:''})};
 return <div className="page page-opportunities">
   <div className="op-screen-heading">
     <div className="op-heading-copy">
       <h1 id="op-title">Oportunidades</h1>
       <p>Solicitudes de clientes potenciales que entran para informarse o pedir precio.</p>
     </div>
     <div className="op-heading-actions">
       <button type="button" className="op-export-button" onClick={exportFilteredCsv} disabled={!list.length}
         title="Exportar las solicitudes que coinciden con los filtros en un archivo CSV"><Download size={16}/>Exportar</button>
       <button type="button" className="op-new-button" onClick={()=>setModal(true)}><Plus size={17}/>Nueva solicitud</button>
     </div>
   </div>
   <nav className="op-phase-tabs" aria-label="Filtrar oportunidades por estado">
     {groups.map(g=><button type="button" key={g.id}
       className={'op-phase-tab op-phase-'+g.tone+(quick===g.id?' is-active':'')}
       aria-pressed={quick===g.id}
       onClick={()=>{setQuick(g.id);setStatus('Todos los estados')}}>
       <span>{g.label}</span>
       <strong>{data.opportunities.filter(o=>quickMatch(o.status,g.id)).length}</strong>
     </button>)}
   </nav>
   <div className="op-searchbar">
     <label className="op-search">
       <Search size={18} aria-hidden="true"/>
       <input type="search" value={search} aria-label="Buscar por cliente, producto, localidad o número"
         onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, producto o localidad"/>
       {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
     </label>
     <div className="op-searchbar-actions">
       <div className="op-date-range-control">
         <button type="button" className={'op-date-range-trigger'+(dateFrom||dateTo?' has-range':'')} aria-expanded={datesOpen}
           aria-controls="op-date-range-panel" onClick={()=>{setDatesOpen(v=>!v);setFiltersOpen(false);}}>
           <CalendarDays size={17}/><span>{dateRangeLabel}</span><ChevronDown size={15}/>
         </button>
         {datesOpen&&<div className="op-date-popover" id="op-date-range-panel" role="group" aria-label="Filtrar solicitudes por fecha de entrada">
           <strong>Fecha de entrada</strong>
           <div className="op-date-fields">
             <label><span>Desde</span><input type="date" aria-label="Entrada desde" value={dateFrom} max={dateTo||undefined} onChange={e=>setDateFrom(e.target.value)}/></label>
             <label><span>Hasta</span><input type="date" aria-label="Entrada hasta" value={dateTo} min={dateFrom||undefined} onChange={e=>setDateTo(e.target.value)}/></label>
           </div>
           <div className="op-date-buttons">
             <button type="button" onClick={()=>{setDateFrom('');setDateTo('');}}>Borrar fechas</button>
             <button type="button" onClick={()=>setDatesOpen(false)}>Listo</button>
           </div>
         </div>}
       </div>
       <button type="button" className={'op-filter-toggle'+(filtersOpen?' is-active':'')} aria-expanded={filtersOpen}
         aria-controls="op-advanced-filters" onClick={()=>{setFiltersOpen(v=>!v);setDatesOpen(false);}}>
         <Filter size={16}/>Filtros
       </button>
       {hasFilters&&<button type="button" className="op-reset-filters" onClick={clearFilters}>Limpiar</button>}
     </div>
   </div>
   {filtersOpen&&<div className="op-advanced-filters" id="op-advanced-filters">
     <label><span>Canal</span><select aria-label="Filtrar por canal" value={channel} onChange={e=>setChannel(e.target.value)}>
       <option>Todos los canales</option>{channels.map(ch=><option key={ch}>{ch}</option>)}
     </select></label>
     <label><span>Estado exacto</span><select aria-label="Filtrar por estado exacto" value={status} onChange={e=>setStatus(e.target.value)}>
       <option>Todos los estados</option>{statuses.map(s=><option key={s}>{s}</option>)}
     </select></label>
     <label><span>Orden</span><select aria-label="Ordenar solicitudes" value={sort} onChange={e=>setSort(e.target.value as OpportunitySort)}>
       <option>Recientes</option><option>Antiguas</option><option>Próximo seguimiento</option>
     </select></label>
     <button type="button" className={'op-overdue-toggle'+(overdueOnly?' is-active':'')}
       aria-pressed={overdueOnly} onClick={()=>setOverdueOnly(x=>!x)}>Solo seguimientos vencidos</button>
   </div>}
   <section className="op-table-panel" aria-labelledby="op-title">
     <div className="op-table-scroll" tabIndex={0} role="region" aria-label="Lista de oportunidades; desplazar verticalmente si hay más solicitudes">
       <table className="op-data-table">
         <thead><tr>
           <th className="op-col-id" scope="col">N.º</th>
           <th className="op-col-client" scope="col">Cliente</th>
           <th className="op-col-product" scope="col">Producto solicitado</th>
           <th className="op-col-city" scope="col">Localidad</th>
           <th className="op-col-date" scope="col">Recibida</th>
           <th className="op-col-status" scope="col">Estado</th>
           <th className="op-col-open" scope="col"><span className="sr-only">Abrir ficha</span></th>
         </tr></thead>
         <tbody>{list.map(o=>{
           const tone=o.status==='Nueva'?'new':o.status==='Aceptada'?'won':o.status==='Perdida'?'lost':o.status==='Por presupuestar'?'quote':o.status==='Presupuesto enviado'?'sent':'working';
           const badge=o.status==='Presupuesto enviado'?'Presupuestada':o.status;
           const received=(o.receivedAt||o.createdAt).slice(0,10);
           return <tr key={o.id} className="op-clickable-row" onClick={()=>nav('/oportunidades/'+o.id)}>
             <td className="op-col-id"><span className="op-reference" title={o.id}>{o.id}</span></td>
             <td className="op-col-client"><div className="op-client-cell">
               <Initials name={o.name}/>
               <div className="op-client-copy"><Link to={'/oportunidades/'+o.id} onClick={e=>e.stopPropagation()} className="op-client-name">{o.name}</Link>
                 <span className="op-client-sub">{o.channel}</span></div>
             </div></td>
             <td className="op-col-product"><div className="op-product" title={o.product}>{o.product}</div><span className="op-product-sub">{o.capacity||'Capacidad por concretar'}</span></td>
             <td className="op-col-city"><span className="op-location" title={o.destination}>{o.destination||'Por concretar'}</span></td>
             <td className="op-col-date"><time dateTime={received}>{dateText(received)}</time></td>
             <td className="op-col-status"><span className={'op-status-pill is-'+tone} title={o.status}>{badge}</span></td>
             <td className="op-col-open"><Link className="op-row-open" to={'/oportunidades/'+o.id} onClick={e=>e.stopPropagation()} aria-label={'Abrir ficha de '+o.name}><ChevronRight size={17}/></Link></td>
           </tr>;
         })}</tbody>
       </table>
       {!list.length&&<Empty title="No hay solicitudes" body="Prueba otra búsqueda o cambia los filtros."/>}
     </div>
     <footer className="op-table-footer">Mostrando <strong>{list.length}</strong> de <strong>{data.opportunities.length}</strong> solicitudes</footer>
   </section>
 {modal&&<Modal title="Registrar solicitud" subtitle="Solo datos de prueba durante el desarrollo público" onClose={()=>setModal(false)}><form className="modal-form" onSubmit={save}>
   <div className="form-grid"><Field label="Nombre o identificador *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Consulta agrícola ficticia"/></Field><Field label="Canal de entrada"><select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value as Channel})}>{channels.map(c=><option key={c}>{c}</option>)}</select></Field>
   <Field label="Contacto"><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Identificador de ejemplo"/></Field><Field label="Alias"><input value={form.alias} onChange={e=>setForm({...form,alias:e.target.value})} placeholder="@alias"/></Field>
   <Field label="Producto *"><input required value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/></Field><Field label="Capacidad"><input value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="Ej. 10.000 L"/></Field>
   <Field label="Localidad de destino"><input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/></Field><Field label="Fecha de seguimiento"><input type="date" value={form.nextDate} onChange={e=>setForm({...form,nextDate:e.target.value})}/></Field></div>
   <Field label="Enlace a la conversación"><input value={form.conversation} onChange={e=>setForm({...form,conversation:e.target.value})} placeholder="https://... (opcional)"/></Field><Field label="Necesidad del comprador"><textarea rows={3} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></Field>
   <div className="modal-actions"><Button variant="outline" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar solicitud</Button></div><NoteDemo/>
 </form></Modal>}

 </div>;
}

export function OpportunityNew(){
 const nav=useNavigate();const {addOpportunity}=useCrm(); const [name,setName]=useState(''),[product,setProduct]=useState('Depósito vertical base plana'),[channel,setChannel]=useState<Channel>('WhatsApp'),[cap,setCap]=useState(''),[dest,setDest]=useState('');
 return <div className="page"><Back to="/oportunidades" label="Volver a oportunidades"/><PageHeader title="Nueva solicitud" subtitle="Registro rápido de una oportunidad de demostración."/><Panel title="Datos iniciales" className="limited-panel"><form className="form-stack" onSubmit={e=>{e.preventDefault();if(name.trim()){addOpportunity({name,channel,contact:'',alias:'',conversation:'',product,capacity:cap,destination:dest,status:'Nueva',nextAction:'Responder consulta inicial',nextDate:today(),message:''});nav('/oportunidades')}}}><Field label="Nombre o identificador"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre ficticio"/></Field><div className="form-grid"><Field label="Canal"><select value={channel} onChange={e=>setChannel(e.target.value as Channel)}>{channels.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Producto"><input value={product} onChange={e=>setProduct(e.target.value)}/></Field><Field label="Capacidad"><input value={cap} onChange={e=>setCap(e.target.value)}/></Field><Field label="Localidad"><input value={dest} onChange={e=>setDest(e.target.value)}/></Field></div><Button type="submit"><Plus size={17}/>Registrar solicitud</Button><NoteDemo/></form></Panel></div>;
}

export function OpportunityDetail(){
 const {id}=useParams();const {data,updateOpportunity,addActivity}=useCrm();const o=data.opportunities.find(x=>x.id===id);
 const [tab,setTab]=useState('Resumen'),[note,setNote]=useState(''); if(!o)return <Missing to="/oportunidades"/>;
 const quotes=data.quotes.filter(q=>q.opportunityId===o.id);
 return <div className="page"><Back to="/oportunidades" label="Volver a oportunidades"/><div className="record-hero"><div className="record-identity"><Initials name={o.name}/><div><div className="eyebrow">{o.id} · {o.channel}</div><h1>{o.name}</h1><div className="record-meta"><MapPin size={14}/>{o.destination||'Por confirmar'}<span>·</span><Status value={o.status}/></div></div></div><Link className="btn btn-primary" to={'/presupuestos/nuevo?op='+o.id}><Plus size={16}/>Preparar presupuesto</Link></div>
 <div className="detail-tabs">{['Resumen','Presupuestos','Actividad'].map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t}{t==='Presupuestos'&&<span className="tab-count">{quotes.length}</span>}</button>)}</div>
 {tab==='Resumen'&&<div className="detail-grid"><Panel title="Datos de la consulta"><div className="info-grid"><Info label="Producto" value={o.product}/><Info label="Capacidad" value={o.capacity||'Sin concretar'}/><Info label="Localidad" value={o.destination||'Pendiente'}/><Info label="Canal" value={o.channel}/><Info label="Contacto" value={o.contact||'Sin datos'}/><Info label="Alias" value={o.alias||'No disponible'}/><Info label="Registrado" value={dateText(o.createdAt)}/><Info label="Referencia" value={o.id}/></div><h4 className="minor-title">Necesidad del comprador</h4><div className="note-area">{o.message||'No hay notas todavía.'}</div>{o.conversation&&/^https?:\/\//.test(o.conversation)&&<a className="link-action" target="_blank" rel="noopener noreferrer" href={o.conversation}>Abrir conversación <ExternalLink size={14}/></a>}</Panel>
 <div className="right-stack"><Panel title="Seguimiento comercial"><div className="form-stack"><Field label="Estado comercial"><select value={o.status} onChange={e=>updateOpportunity(o.id,{status:e.target.value as OpportunityStatus})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></Field>{o.status==='Perdida'&&<Field label="Motivo de pérdida"><select value={o.lostReason||''} onChange={e=>updateOpportunity(o.id,{lostReason:e.target.value})}><option value="">Seleccionar motivo</option>{['Precio','Transporte','Plazo','Competencia','Producto no adecuado','Sin respuesta','Otro'].map(s=><option key={s}>{s}</option>)}</select></Field>}<Field label="Próxima acción"><input value={o.nextAction} onChange={e=>updateOpportunity(o.id,{nextAction:e.target.value})}/></Field><Field label="Fecha"><input type="date" value={o.nextDate} onChange={e=>updateOpportunity(o.id,{nextDate:e.target.value})}/></Field></div></Panel><Panel title="Actividad reciente" extra={<button className="text-button" onClick={()=>setTab('Actividad')}>Ver todo <ArrowRight size={15}/></button>}><Timeline items={o.activity.slice(0,3)}/></Panel></div></div>}
 {tab==='Presupuestos'&&<Panel title="Presupuestos asociados" extra={<ActionLink to={'/presupuestos/nuevo?op='+o.id}>Nuevo presupuesto</ActionLink>}><div className="simple-list">{quotes.map(q=><Link className="simple-item" to={'/presupuestos/'+q.id} key={q.id}><FileText size={20}/><div><strong>{q.product}</strong><small>{q.id} · {dateText(q.createdAt)}</small></div><b>{money(q.amount)}</b><Status value={q.status}/><ChevronRight size={16}/></Link>)}{!quotes.length&&<Empty title="Sin presupuestos" body="Prepara el primer mensaje comercial de esta consulta."/>}</div></Panel>}
 {tab==='Actividad'&&<div className="detail-grid"><Panel title="Historial de interacciones"><Timeline items={o.activity}/></Panel><Panel title="Registrar seguimiento"><form onSubmit={e=>{e.preventDefault();if(note.trim()){addActivity(o.id,note.trim());setNote('')}}} className="form-stack"><Field label="Nota de la conversación"><textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} placeholder="Llamada, respuesta, comentario..."/></Field><Button type="submit"><Plus size={16}/>Añadir nota</Button></form></Panel></div>}
 </div>;
}

export function Quotes(){
 const {data}=useCrm();const nav=useNavigate();const [search,setSearch]=useState('');
 const quotes=data.quotes.filter(q=>(q.id+q.name+q.product).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
 return <div className="page"><PageHeader eyebrow="VENTAS · PRECIOS" title="Presupuestos" subtitle="Mensajes comerciales rápidos, importe ofertado y seguimiento de aceptación." actions={<Link className="btn btn-primary" to="/presupuestos/nuevo"><Plus size={17}/>Nuevo presupuesto</Link>}/>
 <div className="section-metrics"><span><strong>{data.quotes.length}</strong> presupuestos</span><i/><span><strong>{data.quotes.filter(q=>q.status==='Enviado').length}</strong> esperando respuesta</span><i/><span><strong>{data.quotes.filter(q=>q.status==='Aceptado').length}</strong> aceptados</span></div>
 <Panel className="table-panel"><div className="table-toolbar"><div className="table-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar presupuesto, nombre o producto..."/></div><Pill tone="blue">Envío como mensaje</Pill></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Referencia</th><th>Consulta / comprador</th><th>Producto</th><th>Importe ofertado</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>{quotes.map(q=><tr className="clickable-row" key={q.id} onClick={()=>nav('/presupuestos/'+q.id)}><td><strong>{q.id}</strong></td><td>{q.name}</td><td>{q.product}</td><td className="price-cell">{money(q.amount)}</td><td><Status value={q.status}/></td><td>{dateText(q.createdAt)}</td><td><ChevronRight size={16}/></td></tr>)}</tbody></table></div><div className="table-footer">El importe de tu comisión se guarda de forma privada y no se incluye en el mensaje.</div></Panel></div>;
}

export function QuoteNew(){
 const {data,addQuote}=useCrm();const nav=useNavigate();const [params]=useSearchParams();
 const [opId,setOpId]=useState(params.get('op')||data.opportunities.find(o=>!['Aceptada','Perdida'].includes(o.status))?.id||'');
 const lead=data.opportunities.find(o=>o.id===opId);
 const [product,setProduct]=useState((lead?.product||'')+(lead?.capacity?' · '+lead.capacity:''));
 const [amount,setAmount]=useState(''),[transport,setTransport]=useState('0'),[commission,setCommission]=useState('0'),[details,setDetails]=useState(''),[text,setText]=useState(''),[sent,setSent]=useState(false);
 const generated=()=>{
  const greeting=(lead?.name||'').split(' ·')[0];
  return '¡Buenas tardes'+(greeting?', '+greeting:'')+'! 😊 Soy Juan, de Depofibra.\n\nYa tengo preparado el precio de la opción que nos consultaste:\n\n💧 '+(product||'Producto por definir')+'\n✅ PRECIO: '+decimal(Number(amount)||0)+'\n\n'+(details||'Podemos confirmar las características técnicas del modelo y las condiciones de entrega para dejarlo todo preparado.')+'\n\nSi te encaja, concretamos con la oficina las conexiones, el color y el resto de detalles.\n\n¿Qué te parece el presupuesto? ¡Muchas gracias! Un saludo.';
 };
 const save=(e:FormEvent)=>{e.preventDefault();if(!opId||!product.trim()||Number(amount)<=0)return;addQuote({opportunityId:opId,name:lead?.name||'Contacto ficticio',product,amount:Number(amount),commission:Number(commission)||0,transport:Number(transport)||0,status:sent?'Enviado':'Borrador',message:text||generated()});nav('/presupuestos')};
 return <div className="page"><Back to="/presupuestos" label="Volver a presupuestos"/><PageHeader eyebrow="NUEVO PRESUPUESTO" title="Preparar presupuesto" subtitle="Sin documentos: prepara un precio y un mensaje que puedas copiar y enviar."/>
 <form onSubmit={save} className="quote-builder"><div className="builder-main"><Panel title="Información de la oferta"><div className="form-grid"><Field label="Solicitud asociada"><select value={opId} required onChange={e=>{setOpId(e.target.value);const o=data.opportunities.find(x=>x.id===e.target.value);setProduct(o?o.product+' · '+o.capacity:'')}}><option value="">Elegir solicitud</option>{data.opportunities.filter(o=>o.status!=='Perdida').map(o=><option key={o.id} value={o.id}>{o.name} · {o.id}</option>)}</select></Field><Field label="Producto y capacidad"><input required value={product} onChange={e=>setProduct(e.target.value)}/></Field>
 <Field label="Precio comunicado (€)"><input type="number" required min="1" step=".01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></Field><Field label="Transporte interno estimado (€)"><input type="number" min="0" step=".01" value={transport} onChange={e=>setTransport(e.target.value)}/></Field></div>
 <Field label="Características y condiciones verificadas"><textarea rows={3} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Solo información técnica y logística confirmada..."/></Field>
 <div className="inline-tip"><Truck size={17}/> Consulta la calculadora privada en <Link to="/configuracion">Configuración</Link>. No prometas portes estimados.</div></Panel>
 <Panel title="Mensaje comercial" extra={<Button variant="subtle" onClick={()=>setText(generated())}><Sparkles size={16}/>Generar borrador</Button>}><Field label="Edita y revisa antes de copiar"><textarea rows={12} className="message-editor" value={text} onChange={e=>setText(e.target.value)} placeholder="Pulsa «Generar borrador» o escribe un mensaje personalizado."/></Field><div className="hint-row"><MessageCircle size={16}/> El CRM no genera proformas ni facturas oficiales.</div></Panel></div>
 <div className="builder-side"><Panel title="Resumen privado"><div className="money-summary"><span>Precio al comprador</span><strong>{money(Number(amount)||0)}</strong></div><div className="summary-line"><span>Porte orientativo</span><strong>{money(Number(transport)||0)}</strong></div><div className="summary-line"><span>Comisión acordada</span><strong>{money(Number(commission)||0)}</strong></div><Field label="Comisión interna (€)"><input type="number" min="0" step=".01" value={commission} onChange={e=>setCommission(e.target.value)}/></Field><div className="private-callout"><Shield size={17}/> La comisión nunca se incluye en el mensaje del cliente.</div></Panel>
 <Panel title="Guardar propuesta"><label className="radio-like"><input type="checkbox" checked={sent} onChange={e=>setSent(e.target.checked)}/><span><strong>Marcar como enviada</strong><small>Solo si ya has comunicado el precio (simulación).</small></span></label><Button type="submit" className="full-width"><Check size={16}/>Guardar presupuesto</Button><NoteDemo/></Panel></div></form></div>;
}

export function QuoteDetail(){
 const {id}=useParams();const {data,updateQuote,acceptQuote}=useCrm();const q=data.quotes.find(x=>x.id===id);
 const [text,setText]=useState(q?.message||'');const nav=useNavigate();if(!q)return <Missing to="/presupuestos"/>;
 const linked=data.orders.find(o=>o.quoteId===q.id);
 return <div className="page"><Back to="/presupuestos" label="Volver a presupuestos"/><div className="record-hero"><div><div className="eyebrow">{q.id} · {dateText(q.createdAt)}</div><h1>{q.name}</h1><p>{q.product}</p></div><Status value={q.status}/></div>
 <div className="detail-grid"><Panel title="Mensaje comercial"><textarea className="message-editor message-card" value={text} onChange={e=>setText(e.target.value)} rows={14}/><div className="action-line"><CopyButton text={text}/><Button variant="outline" onClick={()=>updateQuote(q.id,{message:text})}><Check size={16}/>Guardar texto</Button></div><div className="hint-row">Copiar no equivale a enviar. Cambia el estado únicamente cuando proceda.</div></Panel>
 <div className="right-stack"><Panel title="Control de presupuesto"><div className="money-summary"><span>Importe ofertado</span><strong>{money(q.amount)}</strong></div><div className="summary-line"><span>Comisión privada</span><strong>{money(q.commission)}</strong></div><div className="summary-line"><span>Transporte interno</span><strong>{money(q.transport)}</strong></div><Field label="Estado"><select value={q.status} onChange={e=>updateQuote(q.id,{status:e.target.value as QuoteStatus})}>{quoteStatuses.map(s=><option key={s}>{s}</option>)}</select></Field>{!linked&&q.status!=='Rechazado'&&<Button onClick={()=>{if(window.confirm('¿Crear pedido pendiente de formalización? (solo demo)')){acceptQuote(q.id);nav('/pedidos')}}}><CheckCircle2 size={17}/>Aceptado: crear pedido</Button>}{linked&&<Link className="btn btn-outline" to={'/pedidos/'+linked.id}>Abrir pedido {linked.id}<ArrowRight size={16}/></Link>}</Panel>
 <Panel title="Documentación de oficina"><div className="inline-tip"><CircleAlert size={17}/> La proforma y la factura las emite la oficina del fabricante, no el CRM.</div></Panel></div></div></div>;
}

function Missing({to}:{to:string}){return <div className="page"><Back to={to} label="Volver al listado"/><Empty title="Registro no encontrado" body="Puede que los datos de demostración se hayan reiniciado."/></div>}
