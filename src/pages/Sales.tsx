import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Download, FileText, Filter, MapPin, Package, Plus, Search, Shield, Truck, ExternalLink, X, Pencil, Trash2, RotateCcw, Archive, ClipboardCheck } from 'lucide-react';
import { useCrm } from '../store';
import OpportunityAttributeFields from './OpportunityAttributeFields';
import { CHANNELS, sourceChannel, type OpportunityStatus, type Channel, type QuoteStatus, decimal, money, dateText, today } from '../domain';
import { ActionLink, Back, Button, Empty, Field, Info, Initials, Modal, NoteDemo, PageHeader, Panel, Pill, Status, Timeline } from '../ui';

const statuses: OpportunityStatus[]=['Nueva','Cualificación','Por presupuestar','Presupuesto enviado','Seguimiento','Aceptada','Perdida'];
const channels: Channel[]=CHANNELS;
const quoteStatuses:QuoteStatus[]=['Borrador','Enviado','Aceptado','Rechazado'];

type OpportunityQuickFilter = 'Todas'|'Nueva'|'En gestión'|'Por presupuestar'|'Presupuesto enviado'|'Aceptada'|'Perdida';
type OpportunitySort = 'Recientes'|'Antiguas'|'Próximo seguimiento';
const formatRangeDate=(iso:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso+'T12:00:00'));

export function Opportunities(){
 const {data,addOpportunity,restoreOpportunity}=useCrm();
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
 const [showDeleted,setShowDeleted]=useState(false);
 const [form,setForm]=useState({name:'',channel:'WhatsApp' as Channel,originChannel:'' as Channel|'',contact:'',alias:'',conversation:'',product:'Depósito vertical base plana',capacity:'',destination:'',message:'',nextDate:today()});
 const [quickCategoryId,setQuickCategoryId]=useState('');
 const [quickAnswers,setQuickAnswers]=useState<Record<string,string>>({});
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
   Boolean(o.deletedAt)===showDeleted && quickMatch(o.status,quick)
   &&(status==='Todos los estados'||o.status===status)
   &&(channel==='Todos los canales'||sourceChannel(o)===channel)
   &&(!overdueOnly||isOverdue(o))
   &&(!dateFrom||(o.receivedAt||o.createdAt).slice(0,10)>=dateFrom)
   &&(!dateTo||(o.receivedAt||o.createdAt).slice(0,10)<=dateTo)
   &&[o.id,o.name,o.product,o.capacity,o.destination,o.alias,o.channel,sourceChannel(o),o.contact,o.nextAction]
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
   const headers=['Referencia','Cliente','Producto','Capacidad','Localidad','Canal de contacto','Origen captación','Recibida','Estado','Próxima acción','Fecha de seguimiento'];
   const safeCell=(value:string)=>{
     const normalized=String(value??'');
     const safe=/^\s*[=+@-]/.test(normalized)?"'"+normalized:normalized;
     return '"'+safe.replace(/"/g,'""')+'"';
   };
   const rows=list.map(o=>[o.id,o.name,o.product,o.capacity,o.destination,o.channel,sourceChannel(o),(o.receivedAt||o.createdAt).slice(0,10),o.status,o.nextAction,o.nextDate]);
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
 const save=(e:FormEvent)=>{e.preventDefault();if(!form.name.trim()||!form.product.trim())return;const cat=data.productCategories?.find(c=>c.id===quickCategoryId);addOpportunity({...form,originChannel:form.originChannel||undefined,name:form.name.trim(),status:'Nueva',nextAction:'Responder consulta inicial',categoryId:cat?.id,attributeAnswers:cat?.attributes.filter(a=>a.responseType&&!a.hidden&&quickAnswers[a.id]?.trim()).map(a=>({attributeId:a.id,label:a.label,value:quickAnswers[a.id]}))});setModal(false);setQuickCategoryId('');setQuickAnswers({});setForm({...form,name:'',contact:'',alias:'',capacity:'',destination:'',message:''})};
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
   {showDeleted&&<div className="crm-trash-notice"><Archive size={16}/> Oportunidades apartadas: puedes recuperarlas sin afectar sus presupuestos.</div>}
   <nav className="op-phase-tabs" aria-label="Filtrar oportunidades por estado">
     {groups.filter(g=>showDeleted||g.id!=='Perdida').map(g=><button type="button" key={g.id}
       className={'op-phase-tab op-phase-'+g.tone+(quick===g.id?' is-active':'')}
       aria-pressed={quick===g.id}
       onClick={()=>{setQuick(g.id);setStatus('Todos los estados')}}>
       <span>{g.label}</span>
       <strong>{data.opportunities.filter(o=>Boolean(o.deletedAt)===showDeleted&&quickMatch(o.status,g.id)).length}</strong>
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
           <th className="op-col-open" scope="col" aria-label="Acceso a la ficha"></th>
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
             <td className="op-col-open">{showDeleted?<button type="button" className="crm-trash-restore" title="Recuperar oportunidad" aria-label={'Recuperar '+o.name} onClick={e=>{e.stopPropagation();restoreOpportunity(o.id)}}><RotateCcw size={17}/></button>:<Link className="op-row-open" to={'/oportunidades/'+o.id} onClick={e=>e.stopPropagation()} aria-label={'Abrir ficha de '+o.name}><ChevronRight size={17}/></Link>}</td>
           </tr>;
         })}</tbody>
       </table>
       {!list.length&&<Empty title="No hay solicitudes" body="Prueba otra búsqueda o cambia los filtros."/>}
     </div>
     <footer className="op-table-footer">Mostrando <strong>{list.length}</strong> de <strong>{data.opportunities.filter(o=>Boolean(o.deletedAt)===showDeleted).length}</strong> solicitudes
      <button className="crm-trash-link" type="button" onClick={()=>{setShowDeleted(!showDeleted);clearFilters();setQuick('Todas')}}>{showDeleted?'Volver a oportunidades':'Apartadas ('+data.opportunities.filter(o=>o.deletedAt).length+')'} <Archive size={15}/></button></footer>
   </section>
 {modal&&<Modal title="Registrar solicitud" subtitle="Se guarda en este navegador; no introduzcas información sensible" onClose={()=>setModal(false)}><form className="modal-form" onSubmit={save}>
   <div className="form-grid"><Field label="Nombre o identificador *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Empresa o referencia de consulta"/></Field><Field label="Canal de contacto"><select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value as Channel})}>{channels.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Origen de captación"><select value={form.originChannel} onChange={e=>setForm({...form,originChannel:e.target.value as Channel|''})}><option value="">No identificado · usar canal de contacto</option>{channels.map(c=><option key={c}>{c}</option>)}</select></Field>
   <Field label="Contacto"><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Identificador de ejemplo"/></Field><Field label="Alias"><input value={form.alias} onChange={e=>setForm({...form,alias:e.target.value})} placeholder="@alias"/></Field>
   <Field label="Categoría (opcional)"><select value={quickCategoryId} onChange={e=>{
    const id=e.target.value;const cat=data.productCategories?.find(c=>c.id===id);
    setQuickCategoryId(id);setQuickAnswers({});
    if(cat)setForm(old=>({...old,product:cat.name,capacity:''}));
   }}><option value="">Sin categoría · producto manual</option>
    {(data.productCategories||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
   </select></Field>
   <Field label="Producto *"><input required value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/></Field><Field label="Capacidad"><input value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="Ej. 10.000 L"/></Field>
   <Field label="Localidad de destino"><input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/></Field><Field label="Fecha de seguimiento"><input type="date" value={form.nextDate} onChange={e=>setForm({...form,nextDate:e.target.value})}/></Field></div>
   <OpportunityAttributeFields category={data.productCategories?.find(c=>c.id===quickCategoryId)}
     values={quickAnswers} onChange={(id,value)=>setQuickAnswers(old=>({...old,[id]:value}))}/>
   <Field label="Enlace a la conversación"><input value={form.conversation} onChange={e=>setForm({...form,conversation:e.target.value})} placeholder="https://... (opcional)"/></Field><Field label="Necesidad del comprador"><textarea rows={3} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></Field>
   <div className="modal-actions"><Button variant="outline" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar solicitud</Button></div><NoteDemo/>
 </form></Modal>}

 </div>;
}

export function OpportunityNew(){
 const nav=useNavigate();const {data,addOpportunity}=useCrm();
 const [name,setName]=useState(''),[product,setProduct]=useState('Depósito vertical base plana');
 const [channel,setChannel]=useState<Channel>('WhatsApp'),[originChannel,setOriginChannel]=useState<Channel|''>(''),[cap,setCap]=useState(''),[dest,setDest]=useState('');
 const [categoryId,setCategoryId]=useState(''),[answers,setAnswers]=useState<Record<string,string>>({});
 const category=data.productCategories?.find(c=>c.id===categoryId);
 return <div className="page page-crm-form">
  <Back to="/oportunidades" label="Volver a oportunidades"/>
  <PageHeader title="Nueva solicitud" subtitle="Registra una consulta manual en el CRM de este navegador."/>
  <Panel title="Datos iniciales" className="limited-panel">
   <form className="form-stack" onSubmit={e=>{
     e.preventDefault();if(!name.trim()||!product.trim())return;
     addOpportunity({name:name.trim(),channel,originChannel:originChannel||undefined,contact:'',alias:'',conversation:'',product,capacity:cap,
       destination:dest,status:'Nueva',nextAction:'Responder consulta inicial',nextDate:today(),message:'',
       categoryId:category?.id,
       attributeAnswers:category?.attributes.filter(a=>a.responseType&&!a.hidden&&answers[a.id]?.trim())
        .map(a=>({attributeId:a.id,label:a.label,value:answers[a.id]}))
     });nav('/oportunidades');
   }}>
    <Field label="Nombre o identificador"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la empresa o referencia"/></Field>
    <div className="form-grid">
     <Field label="Canal de contacto"><select value={channel} onChange={e=>setChannel(e.target.value as Channel)}>{channels.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Origen de captación"><select value={originChannel} onChange={e=>setOriginChannel(e.target.value as Channel|'')}><option value="">No identificado · usar canal de contacto</option>{channels.map(c=><option key={c}>{c}</option>)}</select></Field>
     <Field label="Categoría (opcional)"><select value={categoryId} onChange={e=>{
      const c=data.productCategories?.find(x=>x.id===e.target.value);
      setCategoryId(e.target.value);setAnswers({});
      if(c){setProduct(c.name);setCap('');}
     }}><option value="">Sin categoría</option>
      {(data.productCategories||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
     </select></Field>
     <Field label="Producto"><input required value={product} onChange={e=>setProduct(e.target.value)}/></Field>
     <Field label="Capacidad"><input value={cap} onChange={e=>setCap(e.target.value)}/></Field>
     <Field label="Localidad"><input value={dest} onChange={e=>setDest(e.target.value)}/></Field>
    </div>
    <OpportunityAttributeFields category={category} values={answers} onChange={(id,value)=>setAnswers(old=>({...old,[id]:value}))}/>
    <Button type="submit"><Plus size={17}/>Registrar solicitud</Button><NoteDemo/>
   </form>
  </Panel>
 </div>;
}

export function OpportunityDetail(){
 const {id}=useParams();const {data,updateOpportunity,deleteOpportunity,restoreOpportunity,addActivity}=useCrm();const nav=useNavigate();const o=data.opportunities.find(x=>x.id===id);
 const [tab,setTab]=useState('Resumen'),[note,setNote]=useState('');
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState({
   name:'',contact:'',alias:'',channel:'Web' as Channel,originChannel:'' as Channel|'',
   destination:'',product:'',capacity:'',conversation:'',message:'',status:'Nueva' as OpportunityStatus,
   nextAction:'',nextDate:'',lostReason:''
 });
 const beginEdit=()=>{if(!o)return;setDraft({
   name:o.name,contact:o.contact||'',alias:o.alias||'',channel:o.channel,originChannel:o.originChannel||'',
   destination:o.destination||'',product:o.product,capacity:o.capacity||'',conversation:o.conversation||'',
   message:o.message||'',status:o.status,nextAction:o.nextAction||'',nextDate:o.nextDate||'',lostReason:o.lostReason||''
 });setEditing(true)};
 const saveEdit=(event:FormEvent)=>{event.preventDefault();if(!o||!draft.name.trim()||!draft.product.trim())return;
   updateOpportunity(o.id,{...draft,name:draft.name.trim(),product:draft.product.trim(),originChannel:draft.originChannel||undefined});
   addActivity(o.id,draft.status==='Perdida'?'Oportunidad perdida · motivo: '+(draft.lostReason||'No indicado'):'Datos de oportunidad actualizados');
   setEditing(false);if(draft.status==='Perdida')nav('/oportunidades');
 };
 if(!o)return <Missing to="/oportunidades"/>;
 const quotes=data.quotes.filter(q=>q.opportunityId===o.id);
 return <div className="page page-crm-record"><Back to="/oportunidades" label="Volver a oportunidades"/><div className="record-hero"><div className="record-identity"><Initials name={o.name}/><div><div className="eyebrow">{o.id} · {o.channel}</div><h1>{o.name}</h1><div className="record-meta"><MapPin size={14}/>{o.destination||'Por confirmar'}<span>·</span><Status value={o.status}/></div></div></div><div className="crm-record-actions">
 {o.deletedAt?<button type="button" className="crm-record-secondary" onClick={()=>restoreOpportunity(o.id)}><RotateCcw size={16}/>Recuperar</button>:
 <><button type="button" className="crm-record-secondary" onClick={beginEdit}><Pencil size={16}/>Editar datos</button>
 <button type="button" className="crm-record-danger" onClick={()=>{
  if(window.confirm('¿Apartar esta oportunidad? No se borrarán los presupuestos ni pedidos relacionados y podrás recuperarla.')){
    deleteOpportunity(o.id);nav('/oportunidades');
  }
 }}><Trash2 size={16}/>Eliminar</button>
 <Link className="btn btn-primary" to={'/presupuestos/nuevo?op='+o.id}><Plus size={16}/>Preparar presupuesto</Link></>}
 </div></div>
 <div className="detail-tabs">{['Resumen','Presupuestos','Actividad'].map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t}{t==='Presupuestos'&&<span className="tab-count">{quotes.length}</span>}</button>)}</div>
 {tab==='Resumen'&&<div className="detail-grid"><Panel title="Datos de la consulta"><div className="info-grid"><Info label="Producto" value={o.product}/><Info label="Capacidad" value={o.capacity||'Sin concretar'}/><Info label="Localidad" value={o.destination||'Pendiente'}/><Info label="Canal contacto" value={o.channel}/><Info label="Origen captación" value={o.originChannel||'No identificado (informe usa canal de contacto)'}/><Info label="Contacto" value={o.contact||'Sin datos'}/><Info label="Alias" value={o.alias||'No disponible'}/><Info label="Registrado" value={dateText(o.createdAt)}/><Info label="Referencia" value={o.id}/></div>
 {o.attributeAnswers?.length&&<><h4 className="minor-title">Atributos indicados por el comprador</h4>
  <div className="info-grid">{o.attributeAnswers.map(a=><Info key={a.attributeId} label={a.label} value={a.value}/>)}</div>
 </>}
 <h4 className="minor-title">Necesidad del comprador</h4><div className="note-area">{o.message||'No hay notas todavía.'}</div>{o.conversation&&/^https?:\/\//.test(o.conversation)&&<a className="link-action" target="_blank" rel="noopener noreferrer" href={o.conversation}>Abrir conversación <ExternalLink size={14}/></a>}</Panel>
 <div className="right-stack"><Panel title="Seguimiento comercial"><div className="form-stack"><Field label="Estado comercial"><select disabled={Boolean(o.deletedAt)} value={o.status} onChange={e=>{
     const next=e.target.value as OpportunityStatus;
     if(next==='Perdida'){
       if(!window.confirm('¿Marcar esta oportunidad como perdida y enviarla directamente a la papelera recuperable?'))return;
       const reason=window.prompt('Motivo de pérdida (opcional):',o.lostReason||'');
       if(reason===null)return;
       updateOpportunity(o.id,{status:'Perdida',lostReason:reason.trim()||'No indicado'});
       nav('/oportunidades');
     }else updateOpportunity(o.id,{status:next});
    }}>{statuses.map(s=><option key={s}>{s}</option>)}</select></Field>{o.status==='Perdida'&&<Field label="Motivo de pérdida"><select value={o.lostReason||''} onChange={e=>updateOpportunity(o.id,{lostReason:e.target.value})}><option value="">Seleccionar motivo</option>{['Precio','Transporte','Plazo','Competencia','Producto no adecuado','Sin respuesta','Otro'].map(s=><option key={s}>{s}</option>)}</select></Field>}<Field label="Próxima acción"><input value={o.nextAction} onChange={e=>updateOpportunity(o.id,{nextAction:e.target.value})}/></Field><Field label="Fecha"><input type="date" value={o.nextDate} onChange={e=>updateOpportunity(o.id,{nextDate:e.target.value})}/></Field></div></Panel><Panel title="Actividad reciente" extra={<button type="button" className="crm-text-link" onClick={()=>setTab('Actividad')}>Ver todo <ArrowRight size={15}/></button>}><Timeline items={o.activity.slice(0,3)}/></Panel></div></div>}
 {tab==='Presupuestos'&&<Panel title="Presupuestos asociados" extra={<ActionLink to={'/presupuestos/nuevo?op='+o.id}>Nuevo presupuesto</ActionLink>}><div className="simple-list">{quotes.map(q=><Link className="simple-item" to={'/presupuestos/'+q.id} key={q.id}><FileText size={20}/><div><strong>{q.product}</strong><small>{q.id} · {dateText(q.createdAt)}</small></div><b>{money(q.amount)}</b><Status value={q.status}/><ChevronRight size={16}/></Link>)}{!quotes.length&&<Empty title="Sin presupuestos" body="Prepara el primer presupuesto para esta consulta."/>}</div></Panel>}
 {tab==='Actividad'&&<div className="detail-grid"><Panel title="Historial de interacciones"><Timeline items={o.activity}/></Panel><Panel title="Registrar seguimiento"><form onSubmit={e=>{e.preventDefault();if(note.trim()){addActivity(o.id,note.trim());setNote('')}}} className="form-stack"><Field label="Nota de la conversación"><textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} placeholder="Llamada, respuesta, comentario..."/></Field><Button type="submit"><Plus size={16}/>Añadir nota</Button></form></Panel></div>}
 {editing&&<Modal title="Editar oportunidad" subtitle={'Ficha '+o.id} onClose={()=>setEditing(false)}>
 <form className="modal-form crm-edit-opportunity" onSubmit={saveEdit}>
  <div className="form-grid">
   <Field label="Cliente o referencia"><input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></Field>
   <Field label="Canal de contacto"><select value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value as Channel})}>{channels.map(ch=><option key={ch}>{ch}</option>)}</select></Field>
   <Field label="Origen de captación"><select value={draft.originChannel} onChange={e=>setDraft({...draft,originChannel:e.target.value as Channel|''})}><option value="">Sin identificar</option>{channels.map(ch=><option key={ch}>{ch}</option>)}</select></Field>
   <Field label="Contacto"><input value={draft.contact} onChange={e=>setDraft({...draft,contact:e.target.value})}/></Field>
   <Field label="Alias"><input value={draft.alias} onChange={e=>setDraft({...draft,alias:e.target.value})}/></Field>
   <Field label="Producto"><input required value={draft.product} onChange={e=>setDraft({...draft,product:e.target.value})}/></Field>
   <Field label="Capacidad"><input value={draft.capacity} onChange={e=>setDraft({...draft,capacity:e.target.value})}/></Field>
   <Field label="Localidad"><input value={draft.destination} onChange={e=>setDraft({...draft,destination:e.target.value})}/></Field>
   <Field label="Estado"><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as OpportunityStatus})}>{statuses.map(st=><option key={st}>{st}</option>)}</select></Field>
   {draft.status==='Perdida'&&<Field label="Motivo de pérdida"><select value={draft.lostReason} onChange={e=>setDraft({...draft,lostReason:e.target.value})}>
    <option value="">Sin indicar</option>{['Precio','Transporte','Plazo','Competencia','Producto no adecuado','Sin respuesta','Otro'].map(x=><option key={x} value={x}>{x}</option>)}</select></Field>}
   <Field label="Seguimiento"><input type="date" value={draft.nextDate} onChange={e=>setDraft({...draft,nextDate:e.target.value})}/></Field>
  </div>
  <Field label="Próxima acción"><input value={draft.nextAction} onChange={e=>setDraft({...draft,nextAction:e.target.value})}/></Field>
  <Field label="Enlace de conversación"><input value={draft.conversation} onChange={e=>setDraft({...draft,conversation:e.target.value})}/></Field>
  <Field label="Información de la solicitud"><textarea rows={4} value={draft.message} onChange={e=>setDraft({...draft,message:e.target.value})}/></Field>
  <div className="modal-actions"><Button variant="outline" onClick={()=>setEditing(false)}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar cambios</Button></div>
 </form></Modal>}
 </div>;
}

type QuoteListFilter = 'Todos' | QuoteStatus;
type QuoteListSort = 'Recientes'|'Antiguos'|'Mayor importe'|'Menor importe';
export function Quotes(){
 const {data,restoreQuote}=useCrm();
 const nav=useNavigate();
 const [search,setSearch]=useState('');
 const [phase,setPhase]=useState<QuoteListFilter>('Todos');
 const [sort,setSort]=useState<QuoteListSort>('Recientes');
 const [opportunityFilter,setOpportunityFilter]=useState('Todas las solicitudes');
 const [dateFrom,setDateFrom]=useState('');
 const [dateTo,setDateTo]=useState('');
 const [datesOpen,setDatesOpen]=useState(false);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [showTrash,setShowTrash]=useState(false);
 const query=search.trim().toLocaleLowerCase('es-ES');
 const groups:{id:QuoteListFilter;label:string}[]=[
   {id:'Todos',label:'Todos'},
   {id:'Borrador',label:'Borradores'},
   {id:'Enviado',label:'Enviados'},
   {id:'Aceptado',label:'Aceptados'},
   {id:'Rechazado',label:'Rechazados'}
 ];
 const quotes=data.quotes.filter(q=>{
   const opportunity=data.opportunities.find(o=>o.id===q.opportunityId);
   return Boolean(q.archivedAt)===showTrash &&(phase==='Todos'||q.status===phase)
     &&(opportunityFilter==='Todas las solicitudes'||q.opportunityId===opportunityFilter)
     &&(!dateFrom||q.createdAt.slice(0,10)>=dateFrom)
     &&(!dateTo||q.createdAt.slice(0,10)<=dateTo)
     &&[q.id,q.name,q.product,q.opportunityId,opportunity?.destination||'',opportunity?.channel||'']
         .join(' ').toLocaleLowerCase('es-ES').includes(query);
 }).sort((a,b)=>{
   if(sort==='Mayor importe')return b.amount-a.amount||(b.createdAt.localeCompare(a.createdAt));
   if(sort==='Menor importe')return a.amount-b.amount||(b.createdAt.localeCompare(a.createdAt));
   const comparison=b.createdAt.localeCompare(a.createdAt);
   return sort==='Antiguos'?-comparison:comparison;
 });
 const activeFilters=Boolean(query||phase!=='Todos'||sort!=='Recientes'||opportunityFilter!=='Todas las solicitudes'||dateFrom||dateTo);
 const clearFilters=()=>{setSearch('');setPhase('Todos');setSort('Recientes');setOpportunityFilter('Todas las solicitudes');setDateFrom('');setDateTo('');};
 const dateLabel=dateFrom&&dateTo?formatRangeDate(dateFrom)+' – '+formatRangeDate(dateTo):dateFrom?'Desde '+formatRangeDate(dateFrom):dateTo?'Hasta '+formatRangeDate(dateTo):'Todas las fechas';
 const exportQuotes=()=>{
   if(!quotes.length)return;
   const headers=['Referencia','Solicitud vinculada','Cliente','Producto','Importe ofertado (EUR)','Estado','Fecha de registro'];
   const safeCell=(text:string)=>{
     const value=String(text??'');
     const safe=/^\s*[=+@-]/.test(value)?"'"+value:value;
     return '"'+safe.replace(/"/g,'""')+'"';
   };
   const rows=quotes.map(q=>[q.id,q.opportunityId,q.name,q.product,q.amount.toFixed(2).replace('.',','),q.status,q.createdAt.slice(0,10)]);
   const csv='\uFEFF'+[headers,...rows].map(row=>row.map(safeCell).join(';')).join('\r\n');
   const file=new Blob([csv],{type:'text/csv;charset=utf-8;'});
   const url=URL.createObjectURL(file);
   const link=document.createElement('a');
   link.href=url;link.download='depofibra-presupuestos-'+today()+'.csv';
   document.body.appendChild(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <div className="page page-opportunities page-quotes">
   <div className="op-screen-heading">
     <div className="op-heading-copy">
       <h1 id="quotes-title">Presupuestos</h1>
       <p>Ofertas económicas preparadas para las solicitudes recibidas. Consulta importes, estados y seguimiento comercial.</p>
     </div>
     <div className="op-heading-actions">
       <button type="button" className="op-export-button" disabled={!quotes.length} onClick={exportQuotes}
         title="Exportar únicamente los presupuestos filtrados, sin costes, comisiones ni transporte interno"><Download size={16}/>Exportar</button>
       <Link className="op-new-button" to="/presupuestos/nuevo"><Plus size={17}/>Nuevo presupuesto</Link>
     </div>
   </div>
   {showTrash&&<div className="crm-trash-notice"><Archive size={16}/> Papelera recuperable. Los presupuestos enviados o rechazados sin pedido pasan aquí tras 20 días. Los aceptados y vinculados permanecen visibles.</div>}
   <nav className="op-phase-tabs" aria-label="Filtrar presupuestos por estado">
     {groups.map(g=><button type="button" key={g.id}
       className={'op-phase-tab'+(phase===g.id?' is-active':'')}
       aria-pressed={phase===g.id} onClick={()=>setPhase(g.id)}>
       <span>{g.label}</span><strong>{g.id==='Todos'?data.quotes.filter(q=>Boolean(q.archivedAt)===showTrash).length:data.quotes.filter(q=>Boolean(q.archivedAt)===showTrash&&q.status===g.id).length}</strong>
     </button>)}
   </nav>
   <div className="op-searchbar">
     <label className="op-search">
       <Search size={18} aria-hidden="true"/>
       <input type="search" aria-label="Buscar presupuesto, cliente o producto" value={search}
         onChange={e=>setSearch(e.target.value)} placeholder="Buscar presupuesto, cliente o producto"/>
       {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
     </label>
     <div className="op-searchbar-actions">
       <div className="op-date-range-control">
         <button type="button" className={'op-date-range-trigger'+(dateFrom||dateTo?' has-range':'')}
           aria-expanded={datesOpen} aria-controls="quotes-date-range"
           onClick={()=>{setDatesOpen(v=>!v);setFiltersOpen(false)}}>
           <CalendarDays size={17}/><span>{dateLabel}</span><ChevronDown size={15}/>
         </button>
         {datesOpen&&<div className="op-date-popover" id="quotes-date-range" role="group" aria-label="Filtrar por fecha de presupuesto">
           <strong>Fecha del presupuesto</strong>
           <div className="op-date-fields">
             <label><span>Desde</span><input type="date" value={dateFrom} max={dateTo||undefined}
               aria-label="Presupuestos desde" onChange={e=>setDateFrom(e.target.value)}/></label>
             <label><span>Hasta</span><input type="date" value={dateTo} min={dateFrom||undefined}
               aria-label="Presupuestos hasta" onChange={e=>setDateTo(e.target.value)}/></label>
           </div>
           <div className="op-date-buttons">
             <button type="button" onClick={()=>{setDateFrom('');setDateTo('')}}>Borrar fechas</button>
             <button type="button" onClick={()=>setDatesOpen(false)}>Listo</button>
           </div>
         </div>}
       </div>
       <button type="button" className={'op-filter-toggle'+(filtersOpen?' is-active':'')}
         aria-expanded={filtersOpen} aria-controls="quotes-advanced-filters"
         onClick={()=>{setFiltersOpen(v=>!v);setDatesOpen(false)}}>
         <Filter size={16}/>Filtros
       </button>
       {activeFilters&&<button type="button" className="op-reset-filters" onClick={clearFilters}>Limpiar</button>}
     </div>
   </div>
   {filtersOpen&&<div className="op-advanced-filters" id="quotes-advanced-filters">
     <label><span>Solicitud vinculada</span>
       <select value={opportunityFilter} aria-label="Filtrar presupuestos por solicitud"
         onChange={e=>setOpportunityFilter(e.target.value)}>
         <option>Todas las solicitudes</option>
         {data.opportunities.filter(o=>data.quotes.some(q=>q.opportunityId===o.id)).map(o=>
           <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
       </select>
     </label>
     <label><span>Ordenar por</span>
       <select value={sort} aria-label="Ordenar presupuestos" onChange={e=>setSort(e.target.value as QuoteListSort)}>
         <option>Recientes</option><option>Antiguos</option><option>Mayor importe</option><option>Menor importe</option>
       </select>
     </label>
   </div>}
   <section className="op-table-panel" aria-labelledby="quotes-title">
     <div className="op-table-scroll" tabIndex={0} role="region" aria-label="Lista de presupuestos con desplazamiento vertical">
       <table className="op-data-table quote-data-table">
         <thead><tr>
           <th scope="col" className="op-col-id">Referencia</th>
           <th scope="col" className="op-col-client">Cliente</th>
           <th scope="col" className="op-col-product">Producto presupuestado</th>
           <th scope="col" className="quote-col-amount">Importe ofertado</th>
           <th scope="col" className="op-col-date">Fecha</th>
           <th scope="col" className="op-col-status">Estado</th>
           <th scope="col" className="op-col-open" aria-label="Acceso a la ficha"></th>
         </tr></thead>
         <tbody>{quotes.map(q=>{
           const tone=q.status==='Borrador'?'draft':q.status==='Enviado'?'sent':q.status==='Aceptado'?'won':'lost';
           const related=data.opportunities.find(o=>o.id===q.opportunityId);
           return <tr className="op-clickable-row" key={q.id} onClick={()=>nav('/presupuestos/'+q.id)}>
             <td className="op-col-id"><span className="op-reference">{q.id}</span></td>
             <td className="op-col-client"><div className="op-client-cell">
               <Initials name={q.name}/>
               <div className="op-client-copy">
                 <Link className="op-client-name" to={'/presupuestos/'+q.id} onClick={e=>e.stopPropagation()}>{q.name}</Link>
                 <span className="op-client-sub">{q.opportunityId}{related?.destination?' · '+related.destination:''}</span>
               </div>
             </div></td>
             <td className="op-col-product"><span className="op-product" title={q.product}>{q.product}</span></td>
             <td className="quote-col-amount"><strong className="quote-amount">{decimal(q.amount)}</strong></td>
             <td className="op-col-date"><time dateTime={q.createdAt}>{dateText(q.createdAt)}</time></td>
             <td className="op-col-status"><span className={'op-status-pill is-'+tone}>{q.status}</span></td>
             <td className="op-col-open">{showTrash?<button type="button" className="crm-trash-restore" aria-label={'Recuperar presupuesto '+q.id} title="Recuperar presupuesto" onClick={e=>{e.stopPropagation();restoreQuote(q.id)}}><RotateCcw size={17}/></button>:<Link className="op-row-open" to={'/presupuestos/'+q.id} onClick={e=>e.stopPropagation()} aria-label={'Abrir presupuesto '+q.id}><ChevronRight size={17}/></Link>}</td>
           </tr>;
         })}</tbody>
       </table>
       {!quotes.length&&<Empty title="No hay presupuestos" body="Prueba otra búsqueda o modifica los filtros."/>}
     </div>
     <footer className="op-table-footer">
       Mostrando <strong>{quotes.length}</strong> de <strong>{data.quotes.filter(q=>Boolean(q.archivedAt)===showTrash).length}</strong> presupuestos
       <button type="button" className="crm-trash-link" onClick={()=>{setShowTrash(v=>!v);clearFilters()}}>{showTrash?'Volver a activos':'Papelera ('+data.quotes.filter(q=>q.archivedAt).length+')'} <Archive size={15}/></button>
       <span className="quote-footer-note">Los registros archivados se conservan íntegros</span>
     </footer>
   </section>
 </div>;
}

export function QuoteNew(){
 const {data,addQuote}=useCrm();const nav=useNavigate();const [params]=useSearchParams();
 const [opId,setOpId]=useState(params.get('op')||data.opportunities.find(o=>!o.deletedAt&&!['Aceptada','Perdida'].includes(o.status))?.id||'');
 const lead=data.opportunities.find(o=>o.id===opId);
 const leadProduct=(o:typeof lead)=>o?(o.product+(o.capacity?' · '+o.capacity:'')):'';
 const [product,setProduct]=useState(leadProduct(lead));
 const [catalogId,setCatalogId]=useState('');
 const [amount,setAmount]=useState(''),[transport,setTransport]=useState('0'),[commission,setCommission]=useState('0'),[details,setDetails]=useState(''),[sent,setSent]=useState(false);
 const available=data.products.filter(p=>p.active).slice().sort((a,b)=>a.family.localeCompare(b.family,'es')||a.name.localeCompare(b.name,'es')||
  (Number(a.capacity.replace(/[^\d]/g,''))||0)-(Number(b.capacity.replace(/[^\d]/g,''))||0));
 const categories=(data.productCategories||[]).filter(c=>available.some(p=>p.categoryId===c.id));
 const catalogProduct=data.products.find(p=>p.id===catalogId);
 const selectedCategory=(data.productCategories||[]).find(c=>c.id===catalogProduct?.categoryId);
 const attributes=selectedCategory?.attributes.filter(a=>a.value.trim())||[];
 const chooseCatalog=(id:string)=>{
  if(id==='manual'){
   setCatalogId('');setAmount('');
   return;
  }
  const p=data.products.find(x=>x.id===id&&x.active);
  if(!p)return;
  setCatalogId(p.id);
  setProduct(p.name+' · '+p.capacity);
  setAmount(p.salePriceConfigured&&Number.isFinite(p.price)&&p.price>0?String(p.price):'');
  
 };

 const save=(e:FormEvent)=>{
  e.preventDefault();
  const value=Number(amount);
  if(!opId||!product.trim()||!Number.isFinite(value)||value<=0)return;
  addQuote({
   opportunityId:opId,name:lead?.name||'Contacto ficticio',product,
   productId:catalogId||undefined,amount:value,
   commission:Number(commission)||0,transport:Number(transport)||0,details:details.trim(),
   status:sent?'Enviado':'Borrador',message:''
  });
  nav('/presupuestos');
 };
 return <div className="page page-crm-form page-quote-catalog"><Back to="/presupuestos" label="Volver a presupuestos"/>
  <PageHeader eyebrow="NUEVO PRESUPUESTO" title="Preparar presupuesto" subtitle="Selecciona una referencia del catálogo para cargar su precio o introduce la oferta manualmente."/>
 <form onSubmit={save} className="quote-builder">
  <div className="builder-main">
   <Panel title="Información de la oferta">
    <div className="form-grid">
     <Field label="Solicitud asociada"><select value={opId} required onChange={e=>{
       setOpId(e.target.value);const o=data.opportunities.find(x=>x.id===e.target.value);
       setProduct(leadProduct(o));setCatalogId('');setAmount('');
     }}><option value="">Elegir solicitud</option>{data.opportunities.filter(o=>!o.deletedAt&&o.status!=='Perdida').map(o=><option key={o.id} value={o.id}>{o.name} · {o.id}</option>)}</select></Field>
     <Field label="Producto del catálogo o manual">
      <select aria-label="Seleccionar producto del catálogo o escribir manualmente" value={catalogId||'manual'} onChange={e=>chooseCatalog(e.target.value)}>
       <option value="manual">Escribir producto manualmente</option>
       {categories.map(c=><optgroup key={c.id} label={c.name}>
        {available.filter(p=>p.categoryId===c.id).map(p=><option key={p.id} value={p.id}>
          {p.name} · {p.capacity} · {p.salePriceConfigured&&p.price>0?decimal(p.price):'Precio por verificar'}
        </option>)}
       </optgroup>)}
       {available.filter(p=>!categories.some(c=>c.id===p.categoryId)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.capacity}</option>)}
      </select>
     </Field>
     <Field label="Producto y capacidad"><input required value={product} onChange={e=>{
       setProduct(e.target.value);if(catalogId){setCatalogId('');setAmount('');}
     }} placeholder="Ej. Depósito vertical base plana · 10.000 L"/></Field>
     <Field label="Precio comunicado (€)"><input type="number" required min=".01" step=".01"
      value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></Field>
     <Field label="Transporte interno estimado (€)"><input type="number" min="0" step=".01" value={transport} onChange={e=>setTransport(e.target.value)}/></Field>
    </div>
    {catalogProduct&&<div className={'quote-catalog-feedback'+(catalogProduct.salePriceConfigured&&catalogProduct.price>0?' is-priced':' is-unpriced')}>
     <div><Package size={17}/><strong>{catalogProduct.salePriceConfigured&&catalogProduct.price>0?'Precio de catálogo precargado':'Referencia sin precio de venta'}</strong></div>
     <p>{catalogProduct.salePriceConfigured&&catalogProduct.price>0?'Puedes ajustar el importe de esta oferta sin modificar el precio guardado en el catálogo.':
      'Introduce el precio manualmente antes de guardar la oferta; el catálogo no contiene un importe configurado para esta capacidad.'}</p>
     {attributes.length>0&&<div className="quote-catalog-attributes">
      <span>Atributos comunes de categoría (verifica su aplicación antes de ofertar):</span>
      {attributes.map(a=><span key={a.id}>{a.label}: <b>{a.value}</b></span>)}
     </div>}
    </div>}
    <Field label="Características y condiciones verificadas"><textarea rows={3} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Solo información técnica y logística confirmada..."/></Field>
    <div className="inline-tip"><Truck size={17}/> El precio de catálogo es una referencia comercial interna. Revisa impuestos, transporte y descarga. Calcula los portes en <Link to="/transporte">Calculadora de transporte</Link> antes de comunicar condiciones.</div>
   </Panel>

  </div>
  <div className="builder-side">
   <Panel title="Resumen privado"><div className="money-summary"><span>Precio al comprador</span><strong>{decimal(Number(amount)||0)}</strong></div>
    <div className="summary-line"><span>Porte orientativo</span><strong>{decimal(Number(transport)||0)}</strong></div>
    <div className="summary-line"><span>Comisión acordada</span><strong>{decimal(Number(commission)||0)}</strong></div>
    <Field label="Comisión interna (€)"><input type="number" min="0" step=".01" value={commission} onChange={e=>setCommission(e.target.value)}/></Field>
    <div className="private-callout"><Shield size={17}/> La comisión nunca se incluye en el mensaje del cliente.</div>
   </Panel>
   <Panel title="Guardar propuesta"><label className="radio-like"><input type="checkbox" checked={sent} onChange={e=>setSent(e.target.checked)}/>
     <span><strong>Marcar como enviada</strong><small>Solo si ya has enviado el presupuesto al cliente.</small></span></label>
    <Button type="submit" className="full-width"><Check size={16}/>Guardar presupuesto</Button><NoteDemo/>
   </Panel>
  </div>
 </form></div>;
}

export function QuoteDetail(){
 const {id}=useParams();
 const {data,updateQuote,acceptQuote,archiveQuote,restoreQuote}=useCrm();
 const nav=useNavigate();
 const q=data.quotes.find(x=>x.id===id);
 const [pendingStatus,setPendingStatus]=useState<QuoteStatus|''>('');
 if(!q)return <Missing to="/presupuestos"/>;
 const linked=data.orders.find(o=>o.quoteId===q.id);
 const currentStatus=pendingStatus||q.status;
 const changed=currentStatus!==q.status;
 const needsAcceptance=currentStatus==='Aceptado'&&!linked;
 const saveStatus=()=>{
   if(!changed&&!needsAcceptance)return;
   if(currentStatus==='Aceptado'){
     if(linked)return;
     if(!window.confirm('¿Confirmar que el cliente ha aceptado este presupuesto? Se creará su ficha y un pedido pendiente de formalización, sin registrar ningún cobro.'))return;
     acceptQuote(q.id);
     nav('/clientes');
     return;
   }
   if(linked){window.alert('El presupuesto tiene un pedido vinculado. No se puede revertir su aceptación desde esta pantalla.');return;}
   updateQuote(q.id,{status:currentStatus});setPendingStatus('');
 };
 return <div className="page page-crm-record crm-quote-detail">
   <Back to="/presupuestos" label="Volver a presupuestos"/>
   <div className="record-hero">
     <div><div className="eyebrow">{q.id} · {dateText(q.createdAt)}</div><h1>{q.name}</h1><p>{q.product}</p></div>
     <div className="crm-record-actions"><Status value={q.status}/>
       {!q.archivedAt&&!linked&&q.status!=='Aceptado'&&<button type="button" className="crm-record-secondary" onClick={()=>{
         if(window.confirm('¿Mover este presupuesto a la papelera recuperable?')){archiveQuote(q.id);nav('/presupuestos');}
       }}><Archive size={16}/>Archivar</button>}
       {q.archivedAt&&<button type="button" className="crm-record-secondary" onClick={()=>restoreQuote(q.id)}><RotateCcw size={16}/>Recuperar</button>}
     </div>
   </div>
   {q.archivedAt&&<div className="crm-trash-notice"><Archive size={17}/> Presupuesto en papelera desde {dateText(q.archivedAt)}. Recupéralo para continuar gestionándolo.</div>}
   <div className="detail-grid crm-quote-detail-grid">
     <Panel title="Resumen del presupuesto">
       <div className="crm-quote-summary">
         <div><span>Importe ofertado</span><strong>{decimal(q.amount)}</strong></div>
         <div><span>Producto</span><strong>{q.product}</strong></div>
         <div><span>Cliente</span><strong>{q.name}</strong></div>
         <div><span>Registrado</span><strong>{dateText(q.createdAt)}</strong></div>
       </div>
       {q.opportunityId&&<Link className="crm-text-link" to={'/oportunidades/'+q.opportunityId}>Abrir solicitud relacionada <ArrowRight size={16}/></Link>}
       {q.details&&<div className="crm-quote-details"><strong>Características y condiciones anotadas</strong><p>{q.details}</p></div>}
       <p className="crm-inline-help">Los mensajes comerciales se redactan fuera del CRM. Aquí se conserva exclusivamente el control del presupuesto.</p>
     </Panel>
     <div className="right-stack">
       <Panel title="Estado y formalización">
         <div className="summary-line"><span>Importe</span><strong>{money(q.amount)}</strong></div>
         <div className="summary-line"><span>Comisión privada</span><strong>{money(q.commission)}</strong></div>
         <div className="summary-line"><span>Transporte orientativo</span><strong>{money(q.transport)}</strong></div>
         <div className="crm-quote-status-control">
           <Field label="Estado del presupuesto">
             <select value={currentStatus} disabled={Boolean(q.archivedAt||linked)} onChange={e=>setPendingStatus(e.target.value as QuoteStatus)}>
               {quoteStatuses.map(s=><option key={s} value={s}>{s}</option>)}
             </select>
           </Field>
           {(changed||needsAcceptance)&&!q.archivedAt&&!linked&&<div className="crm-quote-save-row">
             <Button onClick={saveStatus}><Check size={16}/>{currentStatus==='Aceptado'?'Guardar aceptación':'Guardar estado'}</Button>
             <button type="button" className="crm-record-secondary" onClick={()=>setPendingStatus('')}>Cancelar</button>
           </div>}
           {currentStatus==='Aceptado'&&!linked&&!q.archivedAt&&<p className="crm-inline-help">Al guardar se creará el cliente y su pedido. El pago quedará pendiente de verificación.</p>}
           {!changed&&!linked&&!needsAcceptance&&<p className="crm-inline-help">Elige otro estado y pulsa «Guardar» para confirmar el cambio.</p>}
           {linked&&<Link className="crm-record-secondary crm-quote-order-link" to={'/pedidos/'+linked.id}>Abrir pedido {linked.id} <ArrowRight size={16}/></Link>}
         </div>
       </Panel>
       <Panel title="Documentación oficial"><p className="crm-inline-help"><CircleAlert size={16}/> Proformas y facturas se gestionan con la oficina del fabricante. No se generan automáticamente desde el CRM.</p></Panel>
     </div>
   </div>
 </div>;
}

function Missing({to}:{to:string}){return <div className="page"><Back to={to} label="Volver al listado"/><Empty title="Registro no encontrado" body="Puede que los datos de este navegador se hayan reiniciado."/></div>}
