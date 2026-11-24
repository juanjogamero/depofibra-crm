/* Mapa de resultados. Las ubicaciones son agrupaciones por provincias/distritos
   reconocibles, y sus puntos señalan capitales de referencia, nunca domicilios. */
import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,MapPin,Minus,Plus,RotateCcw,Search} from 'lucide-react';
import {IBERIA_BOUNDARIES,MAP_VIEW} from './ResultsMapBoundaries';
type Input={destination:string};
type Place={name:string;lon:number;lat:number;aliases:string[];country:'ES'|'PT'};
type Location={name:string;country:'ES'|'PT';x:number;y:number;count:number;examples:string[]};
const sourcePlaces:[string,number,number,string[]][]=[
 ['Sevilla',-5.99,37.39,['sevilla','seville']],['Córdoba',-4.78,37.89,['cordoba']],
 ['Jaén',-3.79,37.78,['jaen']],['Granada',-3.60,37.18,['granada']],
 ['Málaga',-4.42,36.72,['malaga']],['Almería',-2.46,36.84,['almeria']],
 ['Cádiz',-6.29,36.53,['cadiz']],['Huelva',-6.94,37.26,['huelva']],
 ['Madrid',-3.70,40.42,['madrid']],['Barcelona',2.17,41.39,['barcelona']],
 ['Girona',2.82,41.98,['girona','gerona']],['Lleida',0.62,41.61,['lleida','lerida']],
 ['Tarragona',1.24,41.11,['tarragona']],['Valencia',-0.38,39.47,['valencia']],
 ['Castellón',-0.06,39.98,['castellon','castello']],['Alicante',-0.48,38.35,['alicante','alacant']],
 ['Murcia',-1.13,37.99,['murcia']],['Albacete',-1.86,39.00,['albacete']],
 ['Cuenca',-2.13,40.07,['cuenca']],['Toledo',-4.02,39.86,['toledo']],
 ['Ciudad Real',-3.93,38.99,['ciudad real']],['Guadalajara',-3.16,40.63,['guadalajara']],
 ['Badajoz',-6.97,38.88,['badajoz']],['Cáceres',-6.37,39.47,['caceres']],
 ['Salamanca',-5.66,40.97,['salamanca']],['Zamora',-5.74,41.50,['zamora']],
 ['Ávila',-4.70,40.66,['avila']],['Segovia',-4.12,40.95,['segovia']],
 ['Valladolid',-4.73,41.65,['valladolid']],['Soria',-2.47,41.77,['soria']],
 ['Burgos',-3.70,42.34,['burgos']],['Palencia',-4.53,42.01,['palencia']],
 ['León',-5.57,42.60,['leon']],['La Rioja',-2.45,42.47,['la rioja','logrono']],
 ['Navarra',-1.64,42.81,['navarra','pamplona']],
 ['Álava',-2.67,42.85,['alava','araba','vitoria']],
 ['Bizkaia',-2.94,43.26,['bizkaia','vizcaya','bilbao']],
 ['Gipuzkoa',-1.98,43.32,['gipuzkoa','guipuzcoa','donostia','san sebastian']],
 ['Cantabria',-3.81,43.46,['cantabria','santander']],
 ['Asturias',-5.85,43.36,['asturias','oviedo','gijon']],
 ['A Coruña',-8.41,43.36,['a coruna','la coruna','coruna']],
 ['Lugo',-7.56,43.01,['lugo']],['Ourense',-7.86,42.34,['ourense','orense']],
 ['Pontevedra',-8.64,42.43,['pontevedra','vigo']],
 ['Huesca',-0.41,42.14,['huesca']],['Zaragoza',-0.88,41.65,['zaragoza']],
 ['Teruel',-1.10,40.34,['teruel']],
 ['Lisboa',-9.14,38.72,['lisboa','lisbon']],['Porto',-8.61,41.15,['porto','oporto']],
 ['Braga',-8.43,41.55,['braga']],['Faro',-7.93,37.02,['faro']],
 ['Coimbra',-8.43,40.21,['coimbra']],['Aveiro',-8.65,40.64,['aveiro']],
 ['Santarém',-8.69,39.24,['santarem']],['Setúbal',-8.89,38.52,['setubal']],
 ['Évora',-7.91,38.57,['evora']],['Beja',-7.86,38.02,['beja']],
 ['Viseu',-7.91,40.66,['viseu']],['Leiria',-8.81,39.74,['leiria']],
 ['Bragança',-6.76,41.80,['braganca']],['Guarda',-7.26,40.54,['guarda']],
 ['Vila Real',-7.74,41.30,['vila real']],['Viana do Castelo',-8.84,41.69,['viana do castelo']],
 ['Portalegre',-7.43,39.30,['portalegre']],
 ['Castelo Branco',-7.49,39.82,['castelo branco']]
];
const firstPortuguese=sourcePlaces.findIndex(x=>x[0]==='Lisboa');
const places:Place[]=sourcePlaces.map(([name,lon,lat,aliases],index)=>({name,lon,lat,aliases,country:(index<firstPortuguese?'ES':'PT') as 'ES'|'PT'}));
function normalize(value:string){
 return ' '+value.toLocaleLowerCase('es-ES').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()+' ';
}
function resolve(destination:string){
 const normalized=normalize(destination);
 if(!normalized.trim()||/^(sin|pendiente|a determinar|desconocido|no indicado)/.test(normalized.trim()))return undefined;
 const parts=destination.split(',').map(normalize).reverse();
 for(const part of [...parts,normalized]){
  const hits=places.filter(place=>place.aliases.some(alias=>part.includes(' '+alias+' ')));
  if(hits.length)return hits[0];
 }
 return undefined;
}
/** Only a recognisable province/district label; never export a raw destination/address. */
export function resolveDestinationArea(destination:string):string {
 const point=resolve(destination);
 return point ? point.name : 'Sin ubicar';
}
function group(destinations:Input[]){
 const points=new Map<string,Location>();
 let unplaced=0;
 destinations.forEach(({destination})=>{
  const found=resolve(destination||'');
  if(!found){unplaced++;return;}
  const existing=points.get(found.name);
  if(existing){existing.count++;if(existing.examples.length<3&&!existing.examples.includes(destination))existing.examples.push(destination);}
  else points.set(found.name,{name:found.name,country:found.country,x:(found.lon-MAP_VIEW.minLon)/(MAP_VIEW.maxLon-MAP_VIEW.minLon)*MAP_VIEW.width,y:(MAP_VIEW.maxLat-found.lat)/(MAP_VIEW.maxLat-MAP_VIEW.minLat)*MAP_VIEW.height,count:1,examples:[destination]});
 });
 return {points:[...points.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es')),unplaced};
}


export default function ResultsIberiaMap({leads,orders}:{leads:Input[];orders:Input[]}){
 const [mode,setMode]=useState<'consultas'|'pedidos'>('consultas');
 const [chosen,setChosen]=useState<string|null>(null);
 const [zoom,setZoom]=useState(1);
 const [term,setTerm]=useState('');
 const [showAll,setShowAll]=useState(false);
 const {points,unplaced}=useMemo(()=>group(mode==='consultas'?leads:orders),[leads,orders,mode]);
 const selected=points.find(p=>p.name===chosen)||points[0];
 const placed=points.reduce((n,p)=>n+p.count,0),total=placed+unplaced;
 const label=mode==='consultas'?'consultas':'pedidos',maximum=Math.max(1,...points.map(p=>p.count));
 const display=points.filter(p=>normalize(p.name).includes(normalize(term).trim())).slice(0,showAll?undefined:9);
 const countryCount={ES:points.filter(x=>x.country==='ES').reduce((a,b)=>a+b.count,0),PT:points.filter(x=>x.country==='PT').reduce((a,b)=>a+b.count,0)};
 const setDataMode=(next:'consultas'|'pedidos')=>{setMode(next);setChosen(null);setShowAll(false)};
 const xcenter=(1-zoom)*MAP_VIEW.width/2,ycenter=(1-zoom)*MAP_VIEW.height/2;
 return <section className="ri-geo-card ri-geo-pro" aria-labelledby="ri-geo-title">
   <header className="ri-geo-head">
    <div className="ri-geo-title"><div><h2 id="ri-geo-title">Mapa comercial · España y Portugal</h2>
      <p>Distribución territorial aproximada a partir de los destinos anotados en el CRM</p></div></div>
    <div className="ri-geo-switch" role="group" aria-label="Visualizar ubicaciones de">
     <button type="button" className={mode==='consultas'?'is-active':''} aria-pressed={mode==='consultas'} onClick={()=>setDataMode('consultas')}>Consultas</button>
     <button type="button" className={mode==='pedidos'?'is-active':''} aria-pressed={mode==='pedidos'} onClick={()=>setDataMode('pedidos')}>Pedidos</button>
    </div>
   </header>
   <div className="ri-geo-pro-strip" aria-label="Indicadores territoriales">
     <div><span>Total {label}</span><strong>{total}</strong></div>
     <div><span>Con provincia o distrito</span><strong>{placed}</strong></div>
     <div><span>Zonas distintas</span><strong>{points.length}</strong></div>
     <div><span>Sin ubicar</span><strong>{unplaced}</strong></div>
   </div>
   <div className="ri-geo-body">
    <div className="ri-geo-maparea">
     <svg className="ri-geo-svg" viewBox={'0 0 '+MAP_VIEW.width+' '+MAP_VIEW.height} role="img"
      aria-label={'Mapa detallado de provincias españolas y distritos portugueses con '+placed+' '+label+' clasificados por zona'}>
       <defs><clipPath id="ri-iberia-clip"><rect x="0" y="0" width={MAP_VIEW.width} height={MAP_VIEW.height}/></clipPath></defs>
       <rect x="0" y="0" width={MAP_VIEW.width} height={MAP_VIEW.height} fill="#f8fbfd"/>
       <g clipPath="url(#ri-iberia-clip)">
        <g className="ri-map-graticule" aria-hidden="true">
         {[100,240,380,520,660,800].map(v=><line key={'v'+v} x1={v} y1={0} x2={v} y2={MAP_VIEW.height}/>)}
         {[90,220,350,480].map(v=><line key={'h'+v} x1={0} y1={v} x2={MAP_VIEW.width} y2={v}/>)}
        </g>
        <g transform={'translate('+xcenter+' '+ycenter+') scale('+zoom+')'}>
         <g className="ri-map-boundaries">
          {IBERIA_BOUNDARIES.map((place,i)=><path key={place.country+place.name+i} className={place.country==='ES'?'ri-map-province-es':'ri-map-district-pt'}
           d={place.d} strokeLinejoin="round"><title>{place.name}</title></path>)}
         </g>
         <g className="ri-map-country-labels" aria-hidden="true">
          <text x="365" y="258" textAnchor="middle">ESPAÑA</text>
          <text x="119" y="316" textAnchor="middle">PORTUGAL</text>
         </g>
         <g className="ri-map-pins">
          {points.map(p=>{
           const radius=6.5+Math.sqrt(p.count/maximum)*8.5,isActive=selected?.name===p.name;
           return <g key={p.name} className={'ri-geo-marker'+(isActive?' is-selected':'')} role="button" tabIndex={0}
            aria-label={p.name+': '+p.count+' '+label} aria-pressed={isActive}
            onPointerEnter={()=>setChosen(p.name)} onFocus={()=>setChosen(p.name)}
            onClick={()=>setChosen(p.name)}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setChosen(p.name)}}}>
            {isActive&&<circle cx={p.x} cy={p.y} r={radius+9} className="ri-map-pin-halo"/>}
            <circle cx={p.x} cy={p.y} r={radius} className={mode==='pedidos'?'ri-map-pin-pedidos':'ri-map-pin-consultas'}/>
            <text x={p.x} y={p.y+4} textAnchor="middle" className="ri-map-pin-count" pointerEvents="none">{p.count}</text>
            <title>{p.name} · {p.count} {label}</title>
           </g>;
          })}
         </g>
        </g>
       </g>
     </svg>
     <div className="ri-geo-zoom" role="group" aria-label="Zoom del mapa">
      <button type="button" aria-label="Acercar mapa" title="Acercar" disabled={zoom>=2.4} onClick={()=>setZoom(v=>Math.min(2.4,Math.round((v+.2)*10)/10))}><Plus size={16}/></button>
      <button type="button" aria-label="Alejar mapa" title="Alejar" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,Math.round((v-.2)*10)/10))}><Minus size={16}/></button>
      <button type="button" aria-label="Restablecer vista del mapa" title="Restablecer" disabled={zoom===1} onClick={()=>setZoom(1)}><RotateCcw size={15}/></button>
     </div>
     {!points.length&&<div className="ri-geo-no-points">No hay destinos reconocibles en este periodo.</div>}
     <div className="ri-map-countries" aria-label="Desglose por país reconocible">
      <span>ES · {countryCount.ES}</span><span>PT · {countryCount.PT}</span>
     </div>
    </div>
    <aside className="ri-geo-sidebar">
     <div className="ri-map-selection">
      <span className="ri-map-selection-label">ZONA SELECCIONADA</span>
      {selected?<><strong>{selected.name}</strong>
       <p><b>{selected.count}</b> {label} · {total?Math.round(selected.count/total*100):0}% del total del periodo</p>
       <small>Marcador situado en capital provincial o distrital aproximada, nunca en la dirección del cliente.</small>
      </>:<><strong>Sin zona seleccionable</strong><p>Los destinos no contienen una provincia o distrito identificable.</p></>}
     </div>
     <div className="ri-geo-zones">
      <div className="ri-map-list-head"><h3>Distribución por zonas</h3><span>{points.length} zonas</span></div>
      {points.length>8&&<label className="ri-map-filter"><Search size={14}/><input type="search" placeholder="Filtrar provincia o distrito" aria-label="Filtrar zonas" value={term} onChange={e=>{setTerm(e.target.value);setShowAll(true)}}/></label>}
      <div className="ri-map-zones-table" role="group" aria-label="Seleccionar zona">
       {display.map(p=><button type="button" key={p.name} className={p.name===selected?.name?'is-active':''}
        aria-pressed={p.name===selected?.name} onClick={()=>setChosen(p.name)}>
        <span>{p.name}</span><strong>{p.count}</strong><small>{total?Math.round(p.count/total*100):0}%</small>
       </button>)}
       {points.length===0&&<div className="ri-geo-empty">No hay datos de zonas reconocibles.</div>}
       {points.length>0&&display.length===0&&<div className="ri-geo-empty">Sin coincidencias.</div>}
       {unplaced>0&&<div className="ri-geo-unplaced"><span>Destino sin identificar</span><b>{unplaced}</b></div>}
      </div>
      {points.length>9&&!term&&<button type="button" className="ri-map-showall" onClick={()=>setShowAll(v=>!v)}>
       {showAll?'Ver menos':'Ver todas las zonas ('+points.length+')'}
      </button>}
     </div>
     <Link to={mode==='consultas'?'/oportunidades':'/pedidos'} className="ri-geo-link">Consultar registros <ArrowRight size={15}/></Link>
    </aside>
   </div>
   <footer className="ri-geo-foot">Cartografía territorial generalizada: CartoDB Common Data (provincias españolas) y OpenStreetMap (distritos portugueses). No constituye cartografía oficial. Marcadores de referencia provincial/distrital; no se geolocalizan personas ni visitantes de la web.</footer>
 </section>;
}
