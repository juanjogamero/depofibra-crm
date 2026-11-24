import {useEffect,useMemo,useState} from 'react';
import {Download,FileJson2,FileSpreadsheet,ShieldCheck,X} from 'lucide-react';
import type {CrmState,Opportunity,Quote,Order} from '../domain';
import {resolveDestinationArea} from './ResultsIberiaMap';
import {buildProducts,buildChannelMetrics} from './ResultsResearchPanels';

type Period='all'|'30'|'90'|'365';
type Group={label:string;count:number};
type Snapshot={
 leads:Opportunity[];quotes:Quote[];orders:Order[];accepted:Opportunity[];lost:Opportunity[];
 open:Opportunity[];overdue:number;amount:number;delivered:number;
 channels:{channel:string;total:number;wins:number}[];
 familyDemand:Group[];capacityDemand:Group[];orderTypes:Group[];
 orderStatuses:Group[];lossReasons:Group[];stageCounts:Group[];
};
type Point={label:string;leads:number;quotes:number};
type Dataset='oportunidades'|'presupuestos'|'pedidos'|'canales'|'productos'|'zonas'|'actividad'|'rendimiento_productos'|'rendimiento_canales'|'estados_presupuestos'|'estados_pedidos';
const tables:Record<Dataset,string>={
 oportunidades:'Oportunidades anonimizadas',presupuestos:'Presupuestos',pedidos:'Pedidos',
 canales:'Canales',productos:'Productos consultados',zonas:'Zonas agrupadas',actividad:'Evolución comercial',
 rendimiento_productos:'Rendimiento completo por producto',rendimiento_canales:'Consultas a pedidos por plataforma',
 estados_presupuestos:'Estados de presupuestos',estados_pedidos:'Estados de pedidos'
};
function aliases(ids:string[],prefix:string){
 const entries=new Map<string,string>();
 ids.forEach((id,i)=>entries.set(id,prefix+'-'+String(i+1).padStart(3,'0')));
 return entries;
}
/** Collapse arbitrary user-entered reasons into safe commercial categories. */
function lossCategory(value?:string):string{
 const label=(value||'').toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(!label.trim())return 'Sin motivo registrado';
 if(label.includes('precio'))return 'Precio';
 if(label.includes('plazo')||label.includes('demora'))return 'Plazo';
 if(label.includes('transporte')||label.includes('envio'))return 'Transporte';
 if(label.includes('competencia'))return 'Competencia';
 if(label.includes('sin respuesta')||label.includes('no contesta'))return 'Sin respuesta';
 if(label.includes('capacidad'))return 'Capacidad';
 if(label.includes('cancel'))return 'Cancelación';
 return 'Otro motivo';
}
function groups(values:string[]):Group[]{
 const counts=new Map<string,number>();
 values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
 return [...counts].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);
}
function report(data:CrmState,s:Snapshot,period:Period,series:Point[]){
 const leads=aliases(data.opportunities.map(o=>o.id),'OP');
 const quotes=aliases(data.quotes.map(q=>q.id),'PRE');
 const orders=aliases(data.orders.map(o=>o.id),'PED');
 const customers=aliases(data.customers.map(c=>c.id),'CLI');
 const performanceProducts=buildProducts({data,leads:s.leads,quotes:s.quotes,orders:s.orders});
 const performanceChannels=buildChannelMetrics(data,s.leads);
 const quoteStates=groups(s.quotes.map(q=>q.status));
 const orderStates=groups(s.orders.map(o=>o.factory));
 const areasLead=groups(s.leads.map(o=>resolveDestinationArea(o.destination)));
 const areasOrder=groups(s.orders.map(o=>{
  const q=data.quotes.find(q=>q.id===o.quoteId);
  const p=data.opportunities.find(p=>p.id===q?.opportunityId);
  const c=data.customers.find(c=>c.id===o.customerId);
  return resolveDestinationArea(c?.destination||p?.destination||'');
 }));
 const leadRows=s.leads.map(o=>({
  referencia:leads.get(o.id),fecha:o.createdAt,canal:o.channel,producto:o.product,
  capacidad:o.capacity,zona:resolveDestinationArea(o.destination),estado_actual:o.status,
  fecha_siguiente_accion:o.nextDate||null,motivo_perdida_categoria:lossCategory(o.lostReason)
 }));
 const quoteRows=s.quotes.map(q=>({
  referencia:quotes.get(q.id),oportunidad:leads.get(q.opportunityId)||null,
  fecha:q.createdAt,producto:q.product,estado_actual:q.status,importe_eur:q.amount
 }));
 const orderRows=s.orders.map(o=>{
  const q=data.quotes.find(q=>q.id===o.quoteId);
  const p=data.opportunities.find(p=>p.id===q?.opportunityId);
  const c=data.customers.find(c=>c.id===o.customerId);
  return {
   referencia:orders.get(o.id),presupuesto:quotes.get(o.quoteId)||null,
   oportunidad:leads.get(q?.opportunityId||'')||null,cliente:customers.get(o.customerId||'')||null,
   fecha:o.createdAt,producto:o.product,capacidad:o.capacity,
   zona:resolveDestinationArea(c?.destination||p?.destination||''),
   estado_actual:o.factory,estado_pago:o.paymentMode,importe_pedido_eur:o.amount
  };
 });
 return {
  metadata:{
   esquema:'depofibra-analitica-anonimizada-v2',generado:new Date().toISOString(),
   periodo:period==='all'?'Historial completo':'Últimos '+period+' días',
   fuente:'CRM local de DEMOSTRACIÓN, sin backend ni analítica web sincronizada',
   privacidad:'Identificadores seudonimizados. Sin nombres, alias, contactos, conversaciones, notas ni direcciones exactas.',
   advertencias:[
    'Uso interno. Contiene importes comerciales; revisar antes de compartir con terceros.',
    'No equivale a ventas reales, facturación propia o beneficio neto.',
    'Los estados de oportunidades y pedidos son actuales y pueden ser posteriores a su fecha de registro.',
    'Las zonas son provincias/distritos reconocibles por su texto; ubicación aproximada, nunca domicilio.',
    'Con periodo historial completo, la gráfica solo recoge las últimas ocho semanas.',
    'No incluye visitas GA4, Search Console, campañas ni edades; fuentes no conectadas.'
   ]
  },
  indicadores:{
   consultas:s.leads.length,presupuestos:s.quotes.length,aceptadas_estado_actual:s.accepted.length,
   perdidas_estado_actual:s.lost.length,abiertas_estado_actual:s.open.length,
   seguimientos_vencidos:s.overdue,pedidos:s.orders.length,entregados:s.delivered,
   importe_pedidos_eur:s.amount,
   importe_medio_pedido_eur:s.orders.length?s.amount/s.orders.length:null,
   tasa_aceptacion_pct:s.leads.length?Math.round(s.accepted.length/s.leads.length*100):null,
   tareas_pendientes_globales:data.tasks.filter(t=>!t.done).length,
   tareas_vencidas_globales:data.tasks.filter(t=>!t.done&&t.due<new Date().toISOString().slice(0,10)).length
  },
  estadisticas:{
   canales:s.channels,productos_consultados:s.familyDemand,capacidades:s.capacityDemand,
   productos_con_pedidos:s.orderTypes,estados_pedidos:s.orderStatuses,
   motivos_perdida:groups(s.lost.map(o=>lossCategory(o.lostReason))),embudo:s.stageCounts,
   zonas_consultas:areasLead,zonas_pedidos:areasOrder,evolucion:series,
   rendimiento_por_producto:performanceProducts,rendimiento_por_canal:performanceChannels,
   estados_presupuestos:quoteStates,estados_pedidos_agrupados:orderStates
  },
  registros_anonimizados:{oportunidades:leadRows,presupuestos:quoteRows,pedidos:orderRows},
  preguntas_para_analisis:[
   '¿Qué productos y capacidades tienen más demanda y dónde existen oportunidades?',
   '¿Qué canales generan aceptación y cuáles necesitan mejoras?',
   '¿Qué seguimientos o presupuestos requieren atención?',
   '¿Qué zonas muestran consultas y pedidos descompensados?',
   '¿Qué datos faltan para decidir campañas con rentabilidad real?'
  ]
 };
}
function csv(rows:Record<string,unknown>[]):string{
 if(!rows.length)return '\uFEFFSin registros\r\n';
 const fields=Object.keys(rows[0]);
 const cell=(value:unknown)=>{
  const s=value===null||value===undefined?'':String(value);
  const safe=typeof value==='string'&&/^[\s]*[=+@-]/.test(s)?"'"+s:s;
  return '"'+safe.replace(/"/g,'""')+'"';
 };
 return '\uFEFF'+fields.map(cell).join(';')+'\r\n'+rows.map(r=>fields.map(k=>cell(r[k])).join(';')).join('\r\n')+'\r\n';
}
function save(contents:string,name:string,type:string){
 const url=URL.createObjectURL(new Blob([contents],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function ResultsExport({data,snapshot,period,series}:{
 data:CrmState;snapshot:Snapshot;period:Period;series:Point[]
}){
 const [open,setOpen]=useState(false);
 const [dataset,setDataset]=useState<Dataset>('oportunidades');
 const [message,setMessage]=useState('');
 const content=useMemo(()=>report(data,snapshot,period,series),[data,snapshot,period,series]);
 useEffect(()=>{
  if(!open)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  document.addEventListener('keydown',onKey);
  return ()=>document.removeEventListener('keydown',onKey);
 },[open]);
 const date=new Date().toISOString().slice(0,10);
 const downloadJson=()=>{
  try{save(JSON.stringify(content,null,2),'depofibra-para-ia-'+date+'.json','application/json;charset=utf-8');
   setMessage('Informe JSON descargado localmente.');
  }catch{setMessage('No se ha podido descargar. Comprueba los permisos del navegador.')}
 };
 const downloadCsv=()=>{
  const rows:Record<string,unknown>[]={
   oportunidades:content.registros_anonimizados.oportunidades,
   presupuestos:content.registros_anonimizados.presupuestos,
   pedidos:content.registros_anonimizados.pedidos,
   canales:content.estadisticas.canales,productos:[...content.estadisticas.productos_consultados.map(r=>({tipo:'Consulta',...r})),...content.estadisticas.productos_con_pedidos.map(r=>({tipo:'Pedido',...r}))],
   zonas:[...content.estadisticas.zonas_consultas.map(r=>({tipo:'Consulta',...r})),...content.estadisticas.zonas_pedidos.map(r=>({tipo:'Pedido',...r}))],actividad:content.estadisticas.evolucion,
   rendimiento_productos:content.estadisticas.rendimiento_por_producto,
   rendimiento_canales:content.estadisticas.rendimiento_por_canal,
   estados_presupuestos:content.estadisticas.estados_presupuestos,
   estados_pedidos:content.estadisticas.estados_pedidos_agrupados
  }[dataset];
  try{save(csv(rows),'depofibra-'+dataset+'-'+date+'.csv','text/csv;charset=utf-8');
   setMessage('CSV descargado localmente.');
  }catch{setMessage('No se ha podido descargar. Comprueba los permisos del navegador.')}
 };
 return <>
  <button type="button" className="ri-export-button" onClick={()=>{setMessage('');setOpen(true)}}><Download size={17}/>Exportar datos</button>
  {open&&<div className="ri-export-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <div role="dialog" aria-modal="true" aria-labelledby="ri-export-title" className="ri-export-dialog">
    <div className="ri-export-head">
     <div><span>EXPORTACIÓN LOCAL · DIRECCIÓN</span><h2 id="ri-export-title">Exportar Resultados</h2>
      <p>Archivos preparados para analizar tus datos o pasarlos a una IA.</p></div>
     <button type="button" className="ri-export-close" onClick={()=>setOpen(false)} aria-label="Cerrar"><X size={20}/></button>
    </div>
    <p className="ri-export-period">Se exporta el periodo seleccionado: <strong>{period==='all'?'Todo el historial':'Últimos '+period+' días'}</strong>.</p>
    <div className="ri-export-options">
     <section>
      <FileJson2 size={24}/><h3>Informe para IA · JSON</h3>
      <p>Indicadores, análisis de productos y plataformas hasta pedidos, zonas, evolución y registros vinculados con referencias seudonimizadas. Incluye advertencias y preguntas de análisis.</p>
      <button type="button" className="ri-export-primary" onClick={downloadJson}>Descargar informe JSON</button>
     </section>
     <section>
      <FileSpreadsheet size={24}/><h3>Datos para Excel · CSV</h3>
      <p>Elige la tabla que quieres analizar con hojas de cálculo.</p>
      <label htmlFor="ri-export-dataset">Tabla a descargar</label>
      <select id="ri-export-dataset" value={dataset} onChange={e=>setDataset(e.target.value as Dataset)}>
       {(Object.keys(tables) as Dataset[]).map(key=><option value={key} key={key}>{tables[key]}</option>)}
      </select>
      <button type="button" className="ri-export-secondary" onClick={downloadCsv}>Descargar CSV</button>
     </section>
    </div>
    <div className="ri-export-privacy"><ShieldCheck size={20}/><p>Los archivos se generan en tu navegador; no se envían automáticamente a ninguna IA. Se excluyen datos personales directos, direcciones precisas, notas, conversaciones, márgenes y comisiones. Los importes comerciales siguen siendo confidenciales.</p></div>
    {message&&<p className="ri-export-feedback" role="status">{message}</p>}
   </div>
  </div>}
 </>;
}
