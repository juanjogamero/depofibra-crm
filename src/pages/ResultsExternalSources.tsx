/* Vistas preparadas para futura integración segura de GSC, GA4 y GTM.
   Sin conexión externa ni valores simulados. */
import {useState} from 'react';
import {Info} from 'lucide-react';
type Source='gsc'|'ga4'|'gtm';
const details:{
 [K in Source]:{label:string;status:string;subtitle:string;metrics:string[];dimensions:{label:string;columns:string[]}[];note:string}
}={
 gsc:{
  label:'Search Console',status:'Sin conectar',
  subtitle:'Rendimiento orgánico en Búsqueda de Google',
  metrics:['Clics orgánicos','Impresiones','CTR medio','Posición media'],
  dimensions:[
   {label:'Consultas',columns:['Consulta','Clics','Impresiones','CTR','Posición']},
   {label:'Páginas',columns:['Página','Clics','Impresiones','CTR','Posición']},
   {label:'Países',columns:['País','Clics','Impresiones','CTR']},
   {label:'Dispositivos',columns:['Dispositivo','Clics','Impresiones','CTR']},
   {label:'Fechas',columns:['Día','Clics','Impresiones','CTR','Posición']}
  ],
  note:'Search Console permite analizar rendimiento de búsqueda, no identifica directamente clientes ni ventas. Los datos de la captura proporcionada no se importan a la demo.'
 },
 ga4:{
  label:'Google Analytics 4',status:'Sin conectar',
  subtitle:'Audiencia y eventos de la web comercial',
  metrics:['Usuarios','Sesiones','Eventos clave','Consultas web atribuibles'],
  dimensions:[
   {label:'Adquisición',columns:['Canal','Sesiones','Usuarios','Eventos clave']},
   {label:'Landing pages',columns:['Página de entrada','Sesiones','Usuarios','Eventos clave']},
   {label:'Dispositivos',columns:['Dispositivo','Sesiones','Eventos clave']},
   {label:'Países',columns:['País','Sesiones','Eventos clave']},
   {label:'Eventos',columns:['Evento','Recuento','Usuarios','Fecha']}
  ],
  note:'Las conversiones de formularios/WhatsApp solo podrán atribuirse cuando se verifique su recepción real, la medición, los permisos y el consentimiento. No deducir edades personales.'
 },
 gtm:{
  label:'Google Tag Manager',status:'Por verificar',
  subtitle:'Control de etiquetado y eventos, no fuente de métricas',
  metrics:['Contenedor','Etiquetas','Eventos comprobados','Estado de consentimiento'],
  dimensions:[
   {label:'Verificaciones',columns:['Elemento','Estado','Origen de prueba','Última verificación']},
   {label:'Eventos',columns:['Evento previsto','Disparador','Destino','Validación']}
  ],
  note:'Tag Manager gestiona etiquetas, pero no genera por sí mismo estadísticas de negocio. Primero habrá que verificar contenedor, reglas de consentimiento y que los eventos llegan al destino esperado.'
 }
};
export default function ResultsExternalSources(){
 const [source,setSource]=useState<Source>('gsc');
 const [dimension,setDimension]=useState('Consultas');
 const item=details[source],active=item.dimensions.find(d=>d.label===dimension)||item.dimensions[0];
 const switchSource=(next:Source)=>{setSource(next);setDimension(details[next].dimensions[0].label)};
 return <section className="ri-digital-report">
  <nav className="ri-digital-source-nav" aria-label="Fuentes analíticas futuras">
   {(Object.keys(details) as Source[]).map(key=><button type="button" key={key} className={source===key?'is-active':''} aria-pressed={source===key}
    onClick={()=>switchSource(key)}>{details[key].label}<small>{details[key].status}</small></button>)}
  </nav>
  <div className="ri-digital-head"><h2>{item.label}</h2><p>{item.subtitle}</p><span>{item.status}</span></div>
  <div className="ri-digital-metrics" aria-label="Indicadores aún no conectados">
   {item.metrics.map(name=><div key={name}><span>{name}</span><strong>—</strong><small>Dato no disponible</small></div>)}
  </div>
  <nav className="ri-digital-dimensions" aria-label="Desgloses posibles de la fuente">
   {item.dimensions.map(d=><button type="button" key={d.label} className={d.label===active.label?'is-active':''} aria-pressed={d.label===active.label}
    onClick={()=>setDimension(d.label)}>{d.label}</button>)}
  </nav>
  <div className="ri-study-table-scroll"><table className="ri-study-table">
   <thead><tr>{active.columns.map(c=><th key={c}>{c}</th>)}</tr></thead>
   <tbody><tr><td colSpan={active.columns.length} className="ri-digital-empty">Sin conexión autorizada: no se muestran métricas externas.</td></tr></tbody>
  </table></div>
  <p className="ri-study-footnote"><Info size={14}/>{item.note}</p>
  <div className="ri-digital-integration">
   <strong>Integración futura</strong>
   <p>Conectar las fuentes a un servicio autorizado y protegido, validar propiedades, fechas, permisos y consentimiento, y después incorporar estadísticas verificadas. Los eventos web y las oportunidades del CRM deberán relacionarse mediante identificadores fiables; una coincidencia por fecha o nombre no basta para atribuir ventas.</p>
  </div>
 </section>;
}
