import {useRef,useState,type FormEvent} from 'react';
import {CheckCircle2,ExternalLink,Info,KeyRound,LoaderCircle,MapPin,Route,Truck} from 'lucide-react';
import {decimal,type TransportSettings} from '../domain';
import {calculateGoogleRoute,googleRouteUrl,ORIGIN} from './googleTransportRoutes';

const KEY='depofibra-browser-maps-key';
const getKey=()=>{try{return window.sessionStorage.getItem(KEY)||''}catch{return ''}};
const saveKey=(key:string)=>{try{if(key)sessionStorage.setItem(KEY,key);else sessionStorage.removeItem(KEY)}catch{/* Browser storage disabled */}};
const kmText=(v:number)=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format(v);
type VerifiedRoute={km:number;minutes:number|null;destination:string};

export default function TransportRouteCalculator({tariffs}:{tariffs:TransportSettings}){
 const [place,setPlace]=useState('');
 const [country,setCountry]=useState<'España'|'Portugal'>('España');
 const [kmInput,setKmInput]=useState('');
 const [diameter,setDiameter]=useState<'small'|'large'>('small');
 const [special,setSpecial]=useState(false);
 const [key,setKey]=useState(getKey);
 const [showKey,setShowKey]=useState(false);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [route,setRoute]=useState<VerifiedRoute|null>(null);
 const requestId=useRef(0);
 const dest=place.trim()?place.trim()+', '+country:'';
 const km=kmInput.trim()===''?NaN:Number(kmInput.replace(',','.'));
 const validKm=Number.isFinite(km)&&km>0&&km<=20000;
 const tooFar=validKm&&km>tariffs.distanceLimit;
 const rate=diameter==='small'?tariffs.smallRate:tariffs.largeRate;
 const hasRate=Number.isFinite(rate)&&rate>0;
 const estimate=validKm?km*rate+tariffs.buffer+(special?tariffs.specialExtra:0):NaN;
 const canQuote=validKm&&!tooFar&&hasRate&&Number.isFinite(estimate);
 const reset=()=>{requestId.current++;setBusy(false);setError('');setRoute(null)};
 const calculate=async(e:FormEvent)=>{
  e.preventDefault();
  const sequence=++requestId.current;
  setError('');setRoute(null);
  if(place.trim().length<3){setError('Introduce al menos una localidad, preferiblemente con provincia o distrito.');return;}
  if(!key.trim()){setError('Para calcular automáticamente debes añadir una clave de navegador Google Maps. Puedes verificar el recorrido en Google Maps e introducir los kilómetros manualmente.');setShowKey(true);return;}
  setBusy(true);
  try{
   const answer=await calculateGoogleRoute(key.trim(),dest);
   if(sequence!==requestId.current)return;
   setKmInput(String(answer.km));
   setRoute({...answer,destination:dest});
  }catch(e){
   if(sequence!==requestId.current)return;
   const message=e instanceof Error?e.message:'No se ha podido consultar la distancia.';
   setError(/billing|REQUEST_DENIED|api key|ApiKey|referer/i.test(message)
    ?'Google Maps no ha autorizado la consulta. Revisa clave, restricciones del dominio, facturación y APIs Maps JavaScript + Routes.'
    :message);
  }finally{if(sequence===requestId.current)setBusy(false)}
 };
 const viewLink=googleRouteUrl(dest||'España');
 return <section className="transport3" aria-labelledby="transport3-title">
  <header className="transport3-head">
   <div className="transport3-title"><Route size={21}/><div>
    <h2 id="transport3-title">Calculadora de transporte</h2>
    <p>Distancia por carretera y coste orientativo a partir de parámetros internos.</p>
   </div></div><span>Herramienta privada</span>
  </header>
  <div className="transport3-origin"><MapPin size={17}/><div>
    <small>ORIGEN DE REFERENCIA</small><strong>{ORIGIN}</strong>
  </div></div>
  <form onSubmit={calculate} className="transport3-route-form">
   <label htmlFor="transport3-dest">Localidad de destino</label>
   <div className="transport3-location-inputs">
    <input id="transport3-dest" autoComplete="off" value={place} placeholder="Ej. Lucena, Córdoba"
     onChange={e=>{reset();setPlace(e.target.value)}}/>
    <select aria-label="País de destino" value={country} onChange={e=>{reset();setCountry(e.target.value as 'España'|'Portugal')}}>
     <option value="España">España</option><option value="Portugal">Portugal</option>
    </select>
   </div>
   <small className="transport3-hint">Municipio y provincia o distrito, sin datos personales ni domicilio de clientes.</small>
   <div className="transport3-actions">
    <button type="submit" className="transport3-search" disabled={busy||place.trim().length<3}>
     {busy?<LoaderCircle className="transport3-loader" size={17}/>:<Route size={17}/>}
     {busy?'Consultando kilómetros…':'Calcular kilómetros'}
    </button>
    <a href={viewLink} target="_blank" rel="noopener noreferrer" aria-disabled={place.trim().length<3}
      onClick={e=>{if(place.trim().length<3)e.preventDefault()}}>
      Revisar en Google Maps <ExternalLink size={15}/>
    </a>
   </div>
  </form>
  <div className="transport3-key">
   <button type="button" className="transport3-key-toggle" aria-expanded={showKey} onClick={()=>setShowKey(s=>!s)}>
    <KeyRound size={16}/><span>{key?'Acceso Google Maps configurado':'Configurar cálculo automático con Google Maps'}</span><b>{showKey?'−':'+'}</b>
   </button>
   {showKey&&<div className="transport3-key-content">
    <label htmlFor="transport3-api-key">Clave de API para navegador</label>
    <input type="password" id="transport3-api-key" autoComplete="off" value={key}
     placeholder="Pega tu clave restringida al dominio del CRM" onChange={e=>{reset();setKey(e.target.value);saveKey(e.target.value)}}/>
    <p>Necesita Google Maps JavaScript API y Routes API activadas. Google exige cuenta con facturación y puede aplicar cargos. Restringe la clave por HTTP referrer a https://juanjogamero.github.io/*. Se guarda solo en esta sesión del navegador, no en el repositorio ni en los datos comerciales.</p>
    <a href="https://developers.google.com/maps/documentation/javascript/routes/start"
     target="_blank" rel="noopener noreferrer">Instrucciones oficiales de Google Maps <ExternalLink size={13}/></a>
   </div>}
  </div>
  {error&&<div role="alert" className="transport3-alert"><Info size={17}/><span>{error}</span></div>}
  <div className="transport3-controls">
   <div className="transport3-two-fields">
    <label htmlFor="transport3-km">Kilómetros · solo ida
     <input id="transport3-km" type="number" min=".1" max="20000" step=".1" value={kmInput}
      placeholder="Pendientes de calcular" onChange={e=>{reset();setKmInput(e.target.value)}}/>
    </label>
    <label htmlFor="transport3-size">Diámetro del producto
     <select id="transport3-size" value={diameter} onChange={e=>setDiameter(e.target.value as 'small'|'large')}>
      <option value="small">Hasta Ø 2,45 m</option><option value="large">Desde Ø 3,00 m</option>
     </select>
    </label>
   </div>
   <label className="transport3-check"><input type="checkbox" checked={special}
     onChange={e=>setSpecial(e.target.checked)}/>
    <span>Transporte especial <small>Aplicar solo cuando se confirme el recargo.</small></span>
   </label>
   {route?<div className="transport3-ok" aria-live="polite"><CheckCircle2 size={18}/><div>
    <strong>{kmText(route.km)} km por carretera calculados</strong>
    <span className="transport3-google-credit" translate="no">Google Maps</span>
    <small>Casariche → {route.destination}{route.minutes!==null?' · tiempo aproximado sin tráfico: '+(route.minutes/60).toFixed(1).replace('.',',')+' h':''}</small>
   </div></div>:<p className="transport3-manual">Kilómetros sin verificación automática. Puedes escribir el recorrido comprobado manualmente.</p>}
  </div>
  <div className="transport3-result" aria-live="polite">
   <div><span>ESTIMACIÓN INTERNA</span>
    <strong>{!validKm?'Sin distancia':tooFar?'Solicitar presupuesto':!hasRate?'Sin tarifa':canQuote?decimal(estimate):'Por confirmar'}</strong>
    <small>{!validKm?'Consulta el recorrido o introduce los kilómetros.'
     :tooFar?'Supera el límite configurado de '+kmText(tariffs.distanceLimit)+' km. Revisar tarifa por destino y dimensiones.'
     :!hasRate?'No hay una tarifa €/km autorizada para este diámetro.'
     :kmText(km)+' km × '+decimal(rate)+'/km + '+decimal(tariffs.buffer)+' de ajuste'+(special?' + '+decimal(tariffs.specialExtra)+' de recargo':'')+'. No incluye IVA ni descarga.'}</small>
   </div>
   {validKm&&<div className="transport3-km"><strong>{kmText(km)}</strong><small>km ida</small></div>}
  </div>
  <div className="transport3-disclaimer"><Truck size={19}/><p>
   <b>Solo para estimar.</b> Casariche es la referencia comercial, no necesariamente el origen real del proveedor. Google calcula una ruta de coche, no comprueba altura, anchura o restricciones de camión. Confirma el recorrido, carga, accesos, peajes y descarga con el transportista antes de cotizar. El transporte estándar no incluye descarga.
  </p></div>
  <p className="transport3-attribution">Distancias automáticas proporcionadas por <span className="transport3-google-credit" translate="no">Google Maps</span>. Solo se consultan al pulsar «Calcular kilómetros».</p>
 </section>;
}
