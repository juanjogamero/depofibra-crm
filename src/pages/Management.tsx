import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, CircleAlert, Clock3, CreditCard, Factory, FileText, Inbox, Landmark, Layers3, Package, Plus, Search, Shield, X, TrendingUp, Truck, Wallet } from 'lucide-react';
import { useCrm } from '../store';
import { type Channel, dt, money, decimal, dateText, today } from '../domain';
import { ActionLink, Button, DataBar, Empty, Field, Modal, NoteDemo, PageHeader, Panel, Pill } from '../ui';

const CHANNELS:Channel[]=['Web','WhatsApp','Wallapop','Facebook','Teléfono','Otro'];
export function Agenda(){
  const {data,addTask,toggleTask}=useCrm();
  const [searchParams,setSearchParams]=useSearchParams();
  const requestedDay=searchParams.get('fecha');
  const isValidDate=(value:string|null): value is string => {
    if(!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const check=new Date(value+'T12:00:00');
    return !Number.isNaN(check.getTime()) && check.getFullYear()===Number(value.slice(0,4))
      && check.getMonth()+1===Number(value.slice(5,7)) && check.getDate()===Number(value.slice(8,10));
  };
  const selectedDay=isValidDate(requestedDay)?requestedDay:null;
  const [modal,setModal]=useState(()=>searchParams.get('nueva')==='1' && Boolean(selectedDay));
  const [filter,setFilter]=useState('Pendientes');
  const [search,setSearch]=useState('');
  const [title,setTitle]=useState('');
  const [due,setDue]=useState(selectedDay||today());
  const [context,setContext]=useState('');
  const tasksForDay=data.tasks.filter(t=>!selectedDay || t.due===selectedDay);
  const tabs=['Pendientes','Hechas','Todas'];
  const matchesTab=(done:boolean,tab:string)=>tab==='Todas'||(tab==='Pendientes'?!done:done);
  const query=search.trim().toLocaleLowerCase('es-ES');
  const tasks=tasksForDay.filter(t=>
    matchesTab(t.done,filter)
    &&(t.title+' '+t.context+' '+t.due).toLocaleLowerCase('es-ES').includes(query)
  );
  const closeModal=()=>{
    setModal(false);
    if(searchParams.get('nueva')==='1' && selectedDay) setSearchParams({fecha:selectedDay},{replace:true});
  };
  const save=(e:FormEvent)=>{
    e.preventDefault();
    if(title.trim()){
      addTask(title.trim(),due,context);
      closeModal();
      setTitle('');
      setContext('');
    }
  };
  return <div className="page page-opportunities page-agenda">
    <div className="op-screen-heading">
      <div className="op-heading-copy">
        <h1 id="agenda-title">Agenda y notas</h1>
        <p>Organiza llamadas, seguimientos, tareas y anotaciones comerciales.</p>
      </div>
      <div className="op-heading-actions">
        <button type="button" className="op-new-button"
          onClick={()=>{setDue(selectedDay||today());setModal(true)}}>
          <Plus size={17}/>Nueva tarea
        </button>
      </div>
    </div>
    {selectedDay&&<div className="agenda-selected-day agenda-active-date" role="status">
      <div><CalendarDays size={17} aria-hidden="true"/><span>Mostrando tareas del <strong>{dateText(selectedDay)}</strong></span></div>
      <button type="button" onClick={()=>setSearchParams({},{replace:true})}>Ver todas las fechas</button>
    </div>}
    <nav className="op-phase-tabs agenda-phase-tabs" aria-label="Filtrar tareas por estado">
      {tabs.map(tab=><button key={tab} type="button" className={'op-phase-tab'+(filter===tab?' is-active':'')}
        aria-pressed={filter===tab} onClick={()=>setFilter(tab)}>
        <span>{tab}</span><strong>{tasksForDay.filter(t=>matchesTab(t.done,tab)).length}</strong>
      </button>)}
    </nav>
    <div className="op-searchbar agenda-searchbar">
      <label className="op-search">
        <Search size={18} aria-hidden="true"/>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
          aria-label="Buscar tareas por título, contexto o fecha" placeholder="Buscar tarea, cliente o pedido"/>
        {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
      </label>
      <span className="agenda-toolbar-meta">{tasks.length} {tasks.length===1?'tarea':'tareas'} en esta vista</span>
    </div>
    <div className="agenda-content-grid">
      <section className="agenda-tasks-card" aria-labelledby="agenda-list-title">
        <div className="agenda-card-heading">
          <div><h2 id="agenda-list-title">{selectedDay?'Tareas del día':'Tareas de trabajo'}</h2>
            <p>{selectedDay?'Seguimientos previstos para esta fecha':'Pendientes y seguimientos de tu actividad comercial'}</p></div>
          <span className="agenda-task-counter">{tasksForDay.length} {tasksForDay.length===1?'registrada':'registradas'}</span>
        </div>
        <div className="agenda-list-columns" aria-hidden="true">
          <span>TAREA / CONTEXTO</span><span>FECHA</span><span>ESTADO</span>
        </div>
        <div className="agenda-list-scroll" tabIndex={0} role="region" aria-label="Listado de tareas con desplazamiento vertical">
          {tasks.map(t=>{
            const overdue=!t.done&&t.due<today();
            return <label className={'agenda-task-row'+(t.done?' is-complete':'')+(overdue?' is-overdue':'')} key={t.id}>
              <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)}
                aria-label={(t.done?'Marcar como pendiente: ':'Marcar como hecha: ')+t.title}/>
              <span className="agenda-task-copy">
                <strong title={t.title}>{t.title}</strong>
                <small title={t.context}>{t.context||'Sin contexto adicional'}</small>
              </span>
              <time dateTime={t.due} className={overdue?'overdue':''}>{dateText(t.due)}</time>
              <span className={'agenda-task-state'+(t.done?' is-done':overdue?' is-late':' is-pending')}>
                {t.done?'Hecha':overdue?'Vencida':'Pendiente'}
              </span>
            </label>;
          })}
          {!tasks.length&&<Empty title="Sin tareas en esta vista"
            body={search?'Prueba otra búsqueda o cambia el filtro.':selectedDay?'Este día no tiene tareas para el filtro seleccionado. Puedes crear una nueva.':'Registra una llamada o un seguimiento con fecha.'}/>}
        </div>
        <footer className="agenda-list-footer">Mostrando <strong>{tasks.length}</strong> de <strong>{tasksForDay.length}</strong> tareas</footer>
      </section>
      <aside className="agenda-side-stack" aria-label="Calendario y notas">
        <section className="agenda-side-card agenda-week-card" aria-labelledby="agenda-week-title">
          <div className="agenda-side-heading"><h2 id="agenda-week-title">Próximos siete días</h2><CalendarDays size={17} aria-hidden="true"/></div>
          <div className="calendar-strip agenda-calendar-strip">
            {Array.from({length:7},(_,i)=>{
              const day=dt(i);
              return <button type="button" className={'calendar-day agenda-strip-day'+(selectedDay===day?' is-selected':'')+(day===today()?' is-today':'')}
                key={day} aria-pressed={selectedDay===day}
                aria-label={'Ver tareas del '+dateText(day)}
                onClick={()=>setSearchParams({fecha:day})}>
                <small>{new Date(day+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short'})}</small>
                <strong>{new Date(day+'T12:00:00').getDate()}</strong>
                <i className={data.tasks.some(t=>t.due===day&&!t.done)?'has-event':''}/>
              </button>;
            })}
          </div>
          <p className="agenda-week-help">Selecciona un día para consultar sus tareas. El punto azul indica tareas pendientes.</p>
        </section>
        <section className="agenda-side-card agenda-notes-card" aria-labelledby="agenda-notes-title">
          <div className="agenda-side-heading"><h2 id="agenda-notes-title">Notas y condiciones</h2></div>
          <div className="knowledge-note agenda-knowledge-note"><CircleAlert size={19}/><div>
            <strong>Comprobaciones pendientes</strong>
            <p>Suplementos, garantías, precios o accesorios comunicados verbalmente deben verificarse con proveedor antes de ofertar.</p>
          </div></div>
          <Link to="/oportunidades" className="link-action agenda-notes-link">Consultar oportunidades <ChevronRight size={15}/></Link>
        </section>
      </aside>
    </div>
    {modal&&<Modal title="Nueva tarea o llamada" onClose={closeModal}>
      <form className="modal-form" onSubmit={save}>
        <Field label="Qué tienes que hacer"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Llamar para seguimiento"/></Field>
        <div className="form-grid">
          <Field label="Fecha"><input type="date" required value={due} onChange={e=>setDue(e.target.value)}/></Field>
          <Field label="Cliente / operación asociada"><input value={context} onChange={e=>setContext(e.target.value)} placeholder="OP, cliente o pedido"/></Field>
        </div>
        <div className="modal-actions"><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar tarea</Button></div>
      </form>
    </Modal>}
  </div>;
}

export function Results(){
  const {data}=useCrm();
  const n=data.opportunities.length,won=data.opportunities.filter(o=>o.status==='Aceptada').length,lost=data.opportunities.filter(o=>o.status==='Perdida').length;
  const channels=CHANNELS.map(c=>({name:c,value:data.opportunities.filter(o=>o.channel===c).length})).filter(x=>x.value);
  const reasons=[...new Set(data.opportunities.map(o=>o.lostReason).filter(Boolean))];
  const maxChannel=Math.max(1,...channels.map(x=>x.value));
  return <div className="page page-opportunities page-results">
    <header className="op-screen-heading">
      <div className="op-heading-copy">
        <h1 id="results-title">Resultados</h1>
        <p>Consulta el origen de las solicitudes, las oportunidades aceptadas y los motivos de pérdida.</p>
      </div>
      <div className="op-heading-actions">
        <Link to="/oportunidades" className="op-new-button"><Inbox size={16}/>Ver oportunidades</Link>
      </div>
    </header>
    <section className="results-kpi-grid" aria-label="Indicadores comerciales de la demo">
      <article className="results-kpi">
        <div className="results-kpi-top"><span>Consultas</span><span className="results-kpi-icon"><Inbox size={19}/></span></div>
        <strong className="results-kpi-value">{n}</strong>
        <span className="results-kpi-foot">Registradas en la demo</span>
      </article>
      <article className="results-kpi">
        <div className="results-kpi-top"><span>Presupuestos</span><span className="results-kpi-icon"><FileText size={19}/></span></div>
        <strong className="results-kpi-value">{data.quotes.length}</strong>
        <span className="results-kpi-foot">Propuestas comerciales</span>
      </article>
      <article className="results-kpi">
        <div className="results-kpi-top"><span>Aceptadas</span><span className="results-kpi-icon is-positive"><CheckCircle2 size={19}/></span></div>
        <strong className="results-kpi-value">{won}</strong>
        <span className="results-kpi-foot">Oportunidades ganadas</span>
      </article>
      <article className="results-kpi">
        <div className="results-kpi-top"><span>Perdidas</span><span className="results-kpi-icon is-negative"><TrendingUp size={19}/></span></div>
        <strong className="results-kpi-value">{lost}</strong>
        <span className="results-kpi-foot">{n?Math.round(lost/n*100):0}% del total de consultas</span>
      </article>
    </section>
    <div className="results-analysis-grid">
      <section className="results-panel" aria-labelledby="results-channel-title">
        <div className="results-panel-heading">
          <div><h2 id="results-channel-title">Solicitudes por canal</h2><p>Distribución de las oportunidades según su procedencia</p></div>
          <span className="results-tag">Datos de demostración</span>
        </div>
        <div className="results-panel-body">
          {channels.length?<div className="bar-list results-bar-list">
            {channels.map((x,i)=><DataBar key={x.name} label={x.name} value={x.value} max={maxChannel} color={i%3===0?'blue':i%3===1?'teal':'amber'}/>)}
          </div>:<Empty title="Sin solicitudes registradas" body="Los canales aparecerán cuando existan oportunidades en esta demo."/>}
        </div>
        <footer className="results-panel-footer">Origen comercial anotado en las oportunidades</footer>
      </section>
      <section className="results-panel" aria-labelledby="results-loss-title">
        <div className="results-panel-heading">
          <div><h2 id="results-loss-title">Motivos de pérdida</h2><p>Razones anotadas en el seguimiento comercial</p></div>
        </div>
        <div className="results-panel-body">
          {reasons.length?<div className="bar-list results-bar-list">
            {reasons.map(reason=><DataBar key={reason} label={reason||'No indicado'} value={data.opportunities.filter(o=>o.lostReason===reason).length} max={Math.max(1,lost)} color="amber"/>)}
          </div>:<Empty title="Sin pérdidas categorizadas" body="Se completará cuando registres motivos en las oportunidades."/>}
        </div>
        <div className="results-context-note"><CircleAlert size={16}/><span>El motivo «precio» no demuestra por sí solo un precio inferior al de la competencia.</span></div>
      </section>
    </div>
    <section className="results-integrations" aria-labelledby="results-integrations-title">
      <div className="results-integrations-head">
        <div><h2 id="results-integrations-title">Fuentes externas</h2><p>Datos pendientes de sincronización con este CRM. No forman parte de los indicadores anteriores.</p></div>
        <span className="results-tag is-muted">Integración posterior</span>
      </div>
      <div className="results-integrations-list">
        <div className="results-integration"><span className="results-integration-icon"><BarChart3 size={18}/></span><div><strong>Google Analytics 4</strong><small>Sesiones, canales y contactos reales</small></div><span className="results-integration-state">Sin sincronizar</span></div>
        <div className="results-integration"><span className="results-integration-icon"><Search size={18}/></span><div><strong>Search Console</strong><small>Consultas, clics, impresiones y páginas</small></div><span className="results-integration-state">Sin sincronizar</span></div>
        <div className="results-integration"><span className="results-integration-icon"><Layers3 size={18}/></span><div><strong>Tag Manager</strong><small>Etiquetas, activadores y consentimiento</small></div><span className="results-integration-state">Sin sincronizar</span></div>
      </div>
    </section>
  </div>;
}

export function Finance(){
  const {data}=useCrm();
  const volume=data.orders.reduce((a,o)=>a+o.amount,0),earned=data.orders.reduce((a,o)=>a+o.commission,0),paid=data.orders.reduce((a,o)=>a+o.commissionPaid,0);
  const ratio=earned?Math.round(paid/earned*100):0;
  return <div className="page page-opportunities crm-workspace page-finance">
    <header className="op-screen-heading"><div className="op-heading-copy">
      <h1>Finanzas</h1><p>Control interno de operaciones, comisiones generadas y cobros registrados en la demo.</p>
    </div><div className="op-heading-actions"><Link to="/comisiones" className="op-new-button"><Wallet size={16}/>Mis comisiones</Link></div></header>
    <div className="kpi-grid crm-workspace-kpis finance-kpis"><div className="kpi"><div className="kpi-top">Importe de pedidos<Landmark size={19}/></div><div className="kpi-value">{money(volume)}</div><div className="kpi-foot">No equivale a facturación propia</div></div><div className="kpi"><div className="kpi-top">Comisiones generadas<Wallet size={19}/></div><div className="kpi-value">{money(earned)}</div><div className="kpi-foot">Por ventas registradas</div></div><div className="kpi"><div className="kpi-top">Comisiones cobradas<CheckCircle2 size={19}/></div><div className="kpi-value">{money(paid)}</div><div className="kpi-foot">Importes recibidos en demo</div></div><div className="kpi"><div className="kpi-top">Pendiente de cobro<Clock3 size={19}/></div><div className="kpi-value">{money(earned-paid)}</div><div className="kpi-foot">Saldo aún por liquidar</div></div></div>
    <div className="detail-grid finance-content-grid"><Panel title="Situación de cobro"><div className="finance-visual"><div className="finance-donut" style={{'--pct':ratio+'%'} as CSSProperties}><span>{ratio}%<small>Cobrado</small></span></div><div className="finance-legend"><div><i className="legend-blue"/><span>Cobrado</span><strong>{money(paid)}</strong></div><div><i className="legend-pale"/><span>Por cobrar</span><strong>{money(earned-paid)}</strong></div></div></div><div className="hint-row">La comisión generada se atribuye a la venta; la cobrada, a la liquidación efectiva.</div></Panel><Panel title="Indicadores pendientes de integración"><div className="insight-list"><div><CircleAlert size={18}/><span>Beneficio neto: necesita costes y gastos directos verificados.</span></div><div><CircleAlert size={18}/><span>Publicidad: inversión y atribución a consultas/ventas reales.</span></div><div><CircleAlert size={18}/><span>Facturación: los documentos los emite la empresa del fabricante.</span></div></div></Panel></div>
  </div>;
}
export function Catalog(){
  const {data,addProduct}=useCrm();const [modal,setModal]=useState(false),[name,setName]=useState(''),[family,setFamily]=useState('Depósitos PRFV'),[capacity,setCapacity]=useState(''),[price,setPrice]=useState('0');
  const save=(e:FormEvent)=>{e.preventDefault();if(name.trim()){addProduct({name,family,capacity,price:Number(price)||0,active:true});setModal(false);setName('');setCapacity('');setPrice('0')}};
  const [query,setQuery]=useState('');
  const [selectedFamily,setSelectedFamily]=useState('Todas');
  const families=[...new Set(data.products.map(p=>p.family))].sort((a,b)=>a.localeCompare(b,'es'));
  const term=query.trim().toLocaleLowerCase('es-ES');
  const visible=data.products.filter(p=>
    (selectedFamily==='Todas'||p.family===selectedFamily)
    &&[p.id,p.name,p.family,p.capacity].join(' ').toLocaleLowerCase('es-ES').includes(term)
  );
  return <div className="page page-opportunities crm-workspace page-catalog">
    <header className="op-screen-heading">
      <div className="op-heading-copy"><h1>Catálogo</h1><p>Referencias internas de la demo para preparar presupuestos. Verifica cada producto y condición antes de ofertar.</p></div>
      <div className="op-heading-actions"><button type="button" className="op-new-button" onClick={()=>setModal(true)}><Plus size={17}/>Añadir producto</button></div>
    </header>
    <nav className="op-phase-tabs catalog-phase-tabs" aria-label="Filtrar catálogo por familia">
      {['Todas',...families].map(familyName=><button key={familyName} type="button" className={'op-phase-tab'+(selectedFamily===familyName?' is-active':'')} aria-pressed={selectedFamily===familyName} onClick={()=>setSelectedFamily(familyName)}>
        <span>{familyName}</span><strong>{familyName==='Todas'?data.products.length:data.products.filter(p=>p.family===familyName).length}</strong>
      </button>)}
    </nav>
    <div className="op-searchbar catalog-searchbar">
      <label className="op-search"><Search size={18} aria-hidden="true"/>
        <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto, capacidad o referencia" aria-label="Buscar en el catálogo"/>
        {query&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setQuery('')}><X size={15}/></button>}
      </label>
      <span className="catalog-list-meta">{visible.length} {visible.length===1?'referencia':'referencias'}</span>
    </div>
    <section className="catalog-records" aria-label="Productos de la demo">
      <div className="catalog-record-heading" aria-hidden="true"><span>PRODUCTO / REFERENCIA</span><span>ESTADO</span><span>REFERENCIA ECONÓMICA</span></div>
      <div className="catalog-list">{visible.map(p=><div className="catalog-list-item" key={p.id}>
        <span className="catalog-product-icon"><Package size={21}/></span>
        <div className="catalog-product-copy"><small>{p.family}</small><strong title={p.name}>{p.name}</strong><span>{p.capacity} · {p.id}</span></div>
        <span className={'catalog-status'+(p.active?' is-active':'')}>{p.active?'Activo':'Inactivo'}</span>
        <div className="catalog-private-value"><strong>{p.price?money(p.price):'Por verificar'}</strong><small>Referencia privada</small></div>
      </div>)}
      {!visible.length&&<Empty title="No hay referencias" body="Prueba otra búsqueda o selecciona una familia diferente."/>}</div>
      <footer className="catalog-list-footer">Mostrando <strong>{visible.length}</strong> de <strong>{data.products.length}</strong> referencias de demostración</footer>
    </section>
    <div className="inline-tip catalog-security-note"><Shield size={17}/> No se han importado tarifas privadas históricas ni se presentan costes actuales no confirmados.</div>
    {modal&&<Modal title="Añadir producto" onClose={()=>setModal(false)}>
      <form className="modal-form" onSubmit={save}>
        <Field label="Nombre"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Depósito horizontal con cunas"/></Field>
        <div className="form-grid">
          <Field label="Familia"><select value={family} onChange={e=>setFamily(e.target.value)}>{['Depósitos PRFV','Fosas sépticas','Piscinas','Cubas y cisternas','Otros'].map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Capacidad"><input value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="Ej. 10.000 L"/></Field>
        </div>
        <Field label="Precio de referencia privado (€)"><input type="number" min="0" step=".01" value={price} onChange={e=>setPrice(e.target.value)}/></Field>
        <div className="modal-actions"><Button variant="outline" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit"><Check size={16}/>Añadir producto</Button></div>
      </form>
    </Modal>}
  </div>;
}
export function Configuration(){
  const {data,updateTransport,resetDemo}=useCrm();const t=data.transport;const [edit,setEdit]=useState({...t});
  const [km,setKm]=useState('120'),[size,setSize]=useState('small'),[special,setSpecial]=useState(false),[province,setProvince]=useState('');
  const distance=Math.max(0,Number(km)||0),rate=size==='small'?t.smallRate:t.largeRate,estimate=distance*rate+t.buffer+(special?t.specialExtra:0),far=distance>t.distanceLimit,unconfigured=rate<=0;
  return <div className="page page-opportunities crm-workspace page-configuration">
    <header className="op-screen-heading"><div className="op-heading-copy">
      <h1>Configuración</h1><p>Parámetros privados de transporte, calculadora orientativa y opciones de demostración del CRM.</p>
    </div></header>
    <div className="detail-grid configuration-content-grid"><Panel title="Precios de transporte configurables"><div className="form-stack"><div className="form-grid"><Field label="Hasta Ø 2,45 m · €/km"><input type="number" min="0" step=".05" value={edit.smallRate} onChange={e=>setEdit({...edit,smallRate:Number(e.target.value)})}/></Field><Field label="Desde Ø 3,00 m · €/km"><input type="number" min="0" step=".05" value={edit.largeRate} onChange={e=>setEdit({...edit,largeRate:Number(e.target.value)})}/></Field><Field label="Margen de seguridad (€)"><input type="number" min="0" step="1" value={edit.buffer} onChange={e=>setEdit({...edit,buffer:Number(e.target.value)})}/></Field><Field label="Límite de kilómetros"><input type="number" min="1" step="1" value={edit.distanceLimit} onChange={e=>setEdit({...edit,distanceLimit:Number(e.target.value)})}/></Field><Field label="Recargo especial (€)"><input type="number" min="0" step="1" value={edit.specialExtra} onChange={e=>setEdit({...edit,specialExtra:Number(e.target.value)})}/></Field></div><Button onClick={()=>updateTransport(edit)}><Check size={16}/>Guardar tarifas en esta demo</Button><div className="inline-tip"><Shield size={17}/> Los importes anteriores de presupuestos ya guardados no cambian al modificar tarifas.</div></div></Panel>
    <Panel title="Calculadora interna de portes" extra={<Pill tone="blue">Herramienta privada</Pill>}><div className="form-stack"><div className="form-grid"><Field label="Distancia de referencia desde Casariche (km)"><input type="number" min="0" value={km} onChange={e=>setKm(e.target.value)}/></Field><Field label="Diámetro de producto"><select value={size} onChange={e=>setSize(e.target.value)}><option value="small">Hasta 2,45 m</option><option value="large">3,00 m o más</option></select></Field></div><Field label="Provincia de destino (referencia)"><input value={province} onChange={e=>setProvince(e.target.value)} placeholder="Provincia, sin dirección real"/></Field><label className="radio-like"><input type="checkbox" checked={special} onChange={e=>setSpecial(e.target.checked)}/><span><strong>Transporte especial</strong><small>Aplicar solo si las condiciones de carga lo requieren.</small></span></label></div>
    <div className="estimate-result"><small>{far?'Consultar tabla provincial y metros de tráiler':unconfigured?'Introducir una tarifa privada ficticia':'Estimación interna · NO confirmada'}</small><strong>{far?'Por consultar':unconfigured?'Sin tarifa':decimal(estimate)}</strong><span>{far?'Superado el límite de km. Se requiere tabla por provincia/longitud, pendiente de digitalizar.':unconfigured?'Los importes reales no están en este repositorio público. Edita las tarifas solo con valores ficticios para probar.':distance+' km × '+decimal(rate)+'/km + '+decimal(t.buffer)+' de seguridad'+(special?' + '+decimal(t.specialExtra)+' especial':'')}</span></div><div className="inline-tip"><Truck size={17}/> Casariche es la referencia comercial, no necesariamente el origen real del fabricante. Verificar transportista y descarga.</div></Panel></div>
    <Panel title="Información de la demo" className="configuration-reset-panel"><div className="settings-reset"><div><strong>Restablecer datos ficticios</strong><p>Recupera los contactos, presupuestos, pedidos y tareas iniciales en este navegador.</p></div><Button variant="outline" onClick={()=>{if(window.confirm('¿Reiniciar todos los datos de demostración?'))resetDemo()}}>Restablecer demo</Button></div></Panel>
  </div>;
}
