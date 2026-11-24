import {useRef,useState,type FormEvent} from 'react';
import {Check,CheckCircle2,ChevronDown,Copy,ExternalLink,Info,KeyRound,LoaderCircle,MapPin,RotateCcw,Route,Truck} from 'lucide-react';
import {decimal,type TransportSettings} from '../domain';
import {calculateGoogleRoute,googleRouteUrl,ORIGIN} from './googleTransportRoutes';

const STORAGE_KEY='depofibra-browser-maps-key';
const readKey=()=>{try{return sessionStorage.getItem(STORAGE_KEY)||''}catch{return ''}};
const saveKey=(key:string)=>{try{if(key)sessionStorage.setItem(STORAGE_KEY,key);else sessionStorage.removeItem(STORAGE_KEY)}catch{/* No storage available */}};
const formatKm=(value:number)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(value);
type CalculatedRoute={km:number;minutes:number|null;destination:string};

export default function TransportRouteCalculator({tariffs}:{tariffs:TransportSettings}){
 const [destination,setDestination]=useState('');
 const [country,setCountry]=useState<'España'|'Portugal'>('España');
 const [kilometres,setKilometres]=useState('');
 const [diameter,setDiameter]=useState<'small'|'large'>('small');
 const [special,setSpecial]=useState(false);
 const [apiKey,setApiKey]=useState(readKey);
 const [showApiKey,setShowApiKey]=useState(false);
 const [route,setRoute]=useState<CalculatedRoute|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const requestId=useRef(0);

 const target=destination.trim()?destination.trim()+', '+country:'';
 const km=kilometres.trim()?Number(kilometres.replace(',','.')):NaN;
 const validKm=Number.isFinite(km)&&km>0&&km<=20000;
 const tooFar=validKm&&km>tariffs.distanceLimit;
 const rate=diameter==='small'?tariffs.smallRate:tariffs.largeRate;
 const validRate=Number.isFinite(rate)&&rate>0;
 const adjustment=tariffs.buffer;
 const surcharge=special?tariffs.specialExtra:0;
 const estimate=validKm&&validRate?km*rate+adjustment+surcharge:NaN;
 const canEstimate=validKm&&!tooFar&&validRate&&Number.isFinite(estimate)&&estimate>=0;

 // Invalidar las rutas en curso y los kilómetros del destino anterior.
 const invalidate=(clearKilometres=false)=>{
  requestId.current++;
  setBusy(false);setRoute(null);setError('');setCopied(false);
  if(clearKilometres)setKilometres('');
 };
 const clear=()=>{
  invalidate(true);setDestination('');setCountry('España');setDiameter('small');setSpecial(false);
 };
 const calculate=async(e:FormEvent)=>{
  e.preventDefault();
  const seq=++requestId.current;setError('');setCopied(false);setRoute(null);
  if(destination.trim().length<3){setError('Indica el municipio y, si es posible, la provincia o distrito.');return}
  if(!apiKey.trim()){
   setError('Para obtener kilómetros automáticamente, añade primero la clave de Google Maps. También puedes introducir los km a mano.');
   setShowApiKey(true);return;
  }
  setBusy(true);
  try{
   const answer=await calculateGoogleRoute(apiKey.trim(),target);
   if(seq!==requestId.current)return;
   setKilometres(String(answer.km));
   setRoute({...answer,destination:target});
  }catch(e){
   if(seq!==requestId.current)return;
   const message=e instanceof Error?e.message:'No se ha podido calcular la ruta.';
   setError(/billing|REQUEST_DENIED|api key|ApiKey|referer/i.test(message)
    ?'Google Maps ha rechazado la consulta. Revisa las restricciones de la clave, las APIs activadas y la facturación.'
    :message);
  }finally{if(seq===requestId.current)setBusy(false)}
 };
 const copyEstimate=async()=>{
  if(!canEstimate)return;
  const body=[
   'DEPOFIBRA · Estimación interna de transporte',
   'Ruta de referencia: '+ORIGIN+' → '+target,
   'Distancia de ida: '+formatKm(km)+' km'+(route?' (Google Maps)':' (introducción manual)'),
   'Diámetro: '+(diameter==='small'?'hasta 2,45 m':'desde 3,00 m'),
   'Cálculo: '+formatKm(km)+' km × '+decimal(rate)+'/km',
   'Ajuste: '+decimal(adjustment),
   'Transporte especial: '+(special?decimal(surcharge):'No aplicado'),
   'TOTAL ORIENTATIVO: '+decimal(estimate),
   'Sin IVA ni descarga. Pendiente de validar con transportista y origen real de carga.'
  ].join('\n');
  try{await navigator.clipboard.writeText(body);setCopied(true);setError('')}
  catch{setError('No se ha podido copiar automáticamente. Revisa los permisos del portapapeles.')}
 };
 const result=!validKm?'—':tooFar?'Consultar porte':!validRate?'Sin tarifa':canEstimate?decimal(estimate):'Por confirmar';
 const link=googleRouteUrl(target||'España');

 return <section className="transport-fast" aria-label="Calculadora rápida de portes">
  <div className="transport-fast-main">
   <form className="transport-fast-form" onSubmit={calculate}>
    <div className="transport-fast-origin"><MapPin size={16} aria-hidden="true"/> <span>Origen de referencia</span><strong>{ORIGIN}</strong></div>
    <div className="transport-fast-row transport-fast-destination">
     <label className="transport-fast-field">
      <span>Destino</span>
      <input type="text" autoComplete="off" value={destination} placeholder="Ej. Lucena, Córdoba o 14900"
       onChange={e=>{invalidate(true);setDestination(e.target.value)}}/>
     </label>
     <label className="transport-fast-field transport-fast-country"><span>País</span>
      <select value={country} onChange={e=>{invalidate(true);setCountry(e.target.value as 'España'|'Portugal')}}>
       <option value="España">España</option><option value="Portugal">Portugal</option>
      </select>
     </label>
    </div>
    <div className="transport-fast-route-actions">
     <button type="submit" className="transport-fast-primary" disabled={busy||destination.trim().length<3}>
      {busy?<LoaderCircle size={16} className="transport-fast-spinner"/>:<Route size={16}/>}
      {busy?'Consultando ruta…':'Obtener kilómetros'}
     </button>
     <a href={link} target="_blank" rel="noopener noreferrer" aria-disabled={destination.trim().length<3}
      onClick={e=>{if(destination.trim().length<3)e.preventDefault()}}>Ver en Google Maps <ExternalLink size={14}/></a>
    </div>
    {error&&<p className="transport-fast-error" role="alert"><Info size={16}/>{error}</p>}
    <div className="transport-fast-divider"/>
    <div className="transport-fast-inputs">
     <label className="transport-fast-field transport-fast-km">
      <span>Kilómetros de ida</span>
      <input type="number" inputMode="decimal" min=".1" max="20000" step=".1" value={kilometres}
       placeholder="0" onChange={e=>{invalidate();setKilometres(e.target.value)}}/>
      <small>{route?'Distancia calculada por Google Maps':'Editable manualmente'}</small>
     </label>
     <fieldset className="transport-fast-diameter">
      <legend>Diámetro del producto</legend>
      <div className="transport-fast-choice" role="group" aria-label="Diámetro del transporte">
       <button type="button" aria-pressed={diameter==='small'} className={diameter==='small'?'selected':''}
        onClick={()=>{setDiameter('small');setCopied(false)}}>Hasta Ø 2,45 m</button>
       <button type="button" aria-pressed={diameter==='large'} className={diameter==='large'?'selected':''}
        onClick={()=>{setDiameter('large');setCopied(false)}}>Ø 3,00 m o más</button>
      </div>
     </fieldset>
    </div>
    <label className="transport-fast-special">
     <input type="checkbox" checked={special} onChange={e=>{setSpecial(e.target.checked);setCopied(false)}}/>
     <span>Añadir recargo de transporte especial</span>
    </label>
    {route&&<p className="transport-fast-route-ok" role="status"><CheckCircle2 size={15}/>
      Ruta calculada: {formatKm(route.km)} km <span translate="no">· Google Maps</span>
     </p>}
   </form>

   <aside className="transport-fast-estimate" aria-label="Resultado del transporte" aria-live="polite">
    <div className="transport-fast-estimate-header"><span>Estimación del porte</span><Truck size={19} aria-hidden="true"/></div>
    <strong className={'transport-fast-total'+(!canEstimate?' is-empty':'')}>{result}</strong>
    <p className="transport-fast-result-description">
     {!validKm?'Introduce un destino y obtén los kilómetros, o escríbelos manualmente.'
      :tooFar?'La distancia supera '+formatKm(tariffs.distanceLimit)+' km. Se necesita consultar la tarifa por destino y carga.'
      :!validRate?'Configura primero la tarifa correspondiente al diámetro seleccionado.'
      :'Coste calculado con los parámetros internos guardados.'}
    </p>
    <div className="transport-fast-breakdown">
     <div><span>Recorrido (ida)</span><strong>{validKm?formatKm(km)+' km':'—'}</strong></div>
     <div><span>Tarifa por km</span><strong>{validRate?decimal(rate)+'/km':'Sin configurar'}</strong></div>
     <div><span>Ajuste fijo</span><strong>{decimal(adjustment)}</strong></div>
     {special&&<div><span>Recargo especial</span><strong>{decimal(surcharge)}</strong></div>}
    </div>
    <div className="transport-fast-result-actions">
     <button type="button" disabled={!canEstimate} onClick={copyEstimate} className="transport-fast-copy">
      {copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar desglose'}
     </button>
     <button type="button" onClick={clear} className="transport-fast-clear"><RotateCcw size={15}/> Limpiar</button>
    </div>
    <p className="transport-fast-caution">Uso interno · Sin IVA ni descarga. Confirmar porte real, accesos y origen de carga antes de ofertar.</p>
   </aside>
  </div>
  <div className="transport-fast-bottom">
   <button type="button" className="transport-fast-key-trigger" aria-expanded={showApiKey}
    onClick={()=>setShowApiKey(v=>!v)}><KeyRound size={15}/>
    {apiKey?'Google Maps configurado':'Configurar Google Maps'} <ChevronDown size={15} className={showApiKey?'turned':''}/></button>
   <span>Casariche es solo la referencia comercial; la ruta para coche no garantiza acceso para camiones.</span>
  </div>
  {showApiKey&&<div className="transport-fast-key-panel">
   <label className="transport-fast-field" htmlFor="transport-fast-key"><span>Clave API de Google Maps para navegador</span>
    <input id="transport-fast-key" type="password" autoComplete="off" value={apiKey}
     placeholder="Clave restringida al dominio del CRM" onChange={e=>{invalidate(Boolean(route));setApiKey(e.target.value);saveKey(e.target.value)}}/>
   </label>
   <p>Se guarda únicamente en la sesión de esta pestaña. Para rutas automáticas se requieren Maps JavaScript API y Routes API, facturación habilitada y clave restringida por dominio. Google puede aplicar cargos.</p>
   <a href="https://developers.google.com/maps/documentation/javascript/routes/start" target="_blank" rel="noopener noreferrer">Documentación oficial <ExternalLink size={13}/></a>
  </div>}
  <p className="transport-fast-attribution">Las distancias automáticas se consultan con <span translate="no">Google Maps</span> exclusivamente al pulsar «Obtener kilómetros».</p>
 </section>;
}
