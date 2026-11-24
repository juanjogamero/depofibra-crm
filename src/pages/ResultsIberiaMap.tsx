/* Contornos peninsulares simplificados: Natural Earth (dominio público)
   vía johan/world.geo.json/countries. Puntos = referencias aproximadas
   de capitales de provincia/distrito, NO direcciones de compradores. */
import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,MapPin,Minus,Plus,RotateCcw} from 'lucide-react';
type Input={destination:string};
type Place={name:string;lon:number;lat:number;aliases:string[];country:'ES'|'PT'};
type Location={name:string;country:'ES'|'PT';x:number;y:number;count:number;examples:string[]};
const COUNTRY_ES="M43.4 125.0 L45.7 83.0 L27.3 57.4 L91.0 14.8 L146.0 25.5 L206.5 25.1 L254.3 35.2 L291.7 32.1 L364.4 34.1 L382.4 57.0 L465.2 83.8 L481.6 71.1 L532.2 97.7 L584.4 90.1 L586.8 124.4 L544.1 163.7 L486.5 176.1 L482.5 196.0 L454.8 228.7 L437.5 276.7 L455.0 310.4 L429.0 336.8 L419.2 375.1 L385.3 386.9 L353.4 432.2 L296.3 433.1 L253.4 432.0 L225.2 452.8 L208.0 475.1 L186.0 470.2 L169.3 450.3 L156.6 416.4 L114.6 407.2 L110.8 387.7 L127.5 365.6 L133.7 349.5 L118.2 332.0 L130.6 293.2 L112.6 257.9 L132.0 253.0 L133.8 225.1 L141.1 216.5 L141.7 170.4 L162.5 154.5 L149.9 124.9 L123.7 122.8 L116.0 130.3 L89.4 130.3 L78.1 101.5 L59.8 110.1 L43.4 125.0 Z";
const COUNTRY_PT="M43.4 125.0 L59.8 110.1 L78.1 101.5 L89.4 130.3 L116.0 130.3 L123.7 122.8 L149.9 124.9 L162.5 154.5 L141.7 170.4 L141.1 216.5 L133.8 225.1 L132.0 253.0 L112.6 257.9 L130.6 293.2 L118.2 332.0 L133.7 349.5 L127.5 365.6 L110.8 387.7 L114.6 407.2 L96.5 422.5 L72.8 414.2 L49.6 420.7 L56.4 374.6 L52.2 338.3 L32.1 332.8 L21.3 310.5 L24.9 271.9 L42.8 250.4 L46.0 226.6 L55.4 191.1 L54.4 166.1 L45.4 144.9 L43.4 125.0 Z";
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
const places:Place[]=sourcePlaces.map(([name,lon,lat,aliases],index)=>({name,lon,lat,aliases,country:index<firstPortuguese?'ES':'PT'}));
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
function group(destinations:Input[]){
 const points=new Map<string,Location>();
 let unplaced=0;
 destinations.forEach(({destination})=>{
  const found=resolve(destination||'');
  if(!found){unplaced++;return;}
  const existing=points.get(found.name);
  if(existing){existing.count++;if(existing.examples.length<3&&!existing.examples.includes(destination))existing.examples.push(destination);}
  else points.set(found.name,{name:found.name,country:found.country,x:(found.lon+10)*45,y:(44-found.lat)*59,count:1,examples:[destination]});
 });
 return {points:[...points.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es')),unplaced};
}
export default function ResultsIberiaMap({leads,orders}:{leads:Input[];orders:Input[]}){
 const [mode,setMode]=useState<'consultas'|'pedidos'>('consultas');
 const [chosen,setChosen]=useState<string|null>(null);
 const [zoom,setZoom]=useState(1);
 const {points,unplaced}=useMemo(()=>group(mode==='consultas'?leads:orders),[leads,orders,mode]);
 const selected=points.find(p=>p.name===chosen)||points[0];
 const located=points.reduce((n,p)=>n+p.count,0),total=located+unplaced;
 const label=mode==='consultas'?'consultas':'pedidos',maximum=Math.max(1,...points.map(p=>p.count));
 return <section className="ri-geo-card" aria-labelledby="ri-geo-title">
  <header className="ri-geo-head">
   <div className="ri-geo-title"><span className="ri-geo-icon"><MapPin size={22}/></span>
    <div><h2 id="ri-geo-title">Mapa comercial de la Península Ibérica</h2>
     <p>Destinos agrupados por provincia o distrito reconocible en el CRM</p></div></div>
   <div className="ri-geo-switch" role="group" aria-label="Visualizar ubicaciones de">
    <button type="button" className={mode==='consultas'?'is-active':''} aria-pressed={mode==='consultas'} onClick={()=>{setMode('consultas');setChosen(null);}}>Consultas</button>
    <button type="button" className={mode==='pedidos'?'is-active':''} aria-pressed={mode==='pedidos'} onClick={()=>{setMode('pedidos');setChosen(null);}}>Pedidos</button>
   </div>
  </header>
  <div className="ri-geo-body">
   <div className="ri-geo-maparea">
    <svg className="ri-geo-svg" viewBox="0 0 660 520" role="img" aria-label={'Mapa peninsular aproximado con '+located+' '+label+' ubicados'}>
     <rect x="0" y="0" width="660" height="520" rx="15" fill="#f2f8fc"/>
     <g transform={'translate('+((1-zoom)*330)+' '+((1-zoom)*260)+') scale('+zoom+')'}>
      <path d={COUNTRY_ES} fill="#d8eaf7" stroke="#a4c6df" strokeWidth="2.1" strokeLinejoin="round"/>
      <path d={COUNTRY_PT} fill="#bfdbf0" stroke="#9abed7" strokeWidth="2.1" strokeLinejoin="round"/>
      <text x="395" y="267" textAnchor="middle" className="ri-geo-country">ESPAÑA</text>
      <text x="95" y="320" textAnchor="middle" className="ri-geo-country">PORTUGAL</text>
      {points.map(point=>{
       const radius=7+Math.sqrt(point.count/maximum)*11,isActive=selected?.name===point.name;
       return <g key={point.name} className={'ri-geo-marker'+(isActive?' is-selected':'')}
        role="button" tabIndex={0} aria-label={point.name+': '+point.count+' '+label}
        onPointerEnter={()=>setChosen(point.name)} onFocus={()=>setChosen(point.name)}
        onClick={()=>setChosen(point.name)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setChosen(point.name);}}}>
        <circle cx={point.x} cy={point.y} r={radius+8} fill="#01488e" opacity={isActive?0.14:0}/>
        <circle cx={point.x} cy={point.y} r={radius} fill={mode==='consultas'?'#01488e':'#178f92'} stroke="#fff" strokeWidth="3" opacity={isActive?1:.84}/>
        <text x={point.x} y={point.y+4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800" pointerEvents="none">{point.count}</text>
        <title>{point.name}: {point.count} {label}</title>
       </g>;
      })}
     </g>
    </svg>
    <div className="ri-geo-zoom" role="group" aria-label="Zoom del mapa">
     <button type="button" title="Acercar" aria-label="Acercar" disabled={zoom>=1.8} onClick={()=>setZoom(v=>Math.min(1.8,Math.round((v+.2)*10)/10))}><Plus size={16}/></button>
     <button type="button" title="Alejar" aria-label="Alejar" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,Math.round((v-.2)*10)/10))}><Minus size={16}/></button>
     <button type="button" title="Restablecer zoom" aria-label="Restablecer zoom" disabled={zoom===1} onClick={()=>setZoom(1)}><RotateCcw size={15}/></button>
    </div>
    {!points.length&&<div className="ri-geo-no-points">Sin destinos localizables en el periodo.</div>}
   </div>
   <aside className="ri-geo-sidebar">
    <div className="ri-geo-summary"><span>Total de {label}</span><strong>{total}</strong><small>{located} ubicados · {unplaced} sin ubicar</small></div>
    {selected?<div className="ri-geo-selected" aria-live="polite">
     <span>ZONA SELECCIONADA</span><strong>{selected.name}</strong>
     <div><b>{selected.count}</b><span>{label} · {total?Math.round(selected.count/total*100):0}% del total</span></div>
     <small>Referencia provincial/distrital aproximada, no dirección exacta.</small>
     <p title={selected.examples.join(' · ')}>{selected.examples.join(' · ')}</p>
    </div>:<div className="ri-geo-empty">No hay destinos reconocibles para mostrar.</div>}
    <div className="ri-geo-zones"><h3>Zonas registradas</h3>
     {points.slice(0,7).map(p=><button type="button" key={p.name} aria-pressed={p.name===selected?.name}
      className={p.name===selected?.name?'is-active':''} onClick={()=>setChosen(p.name)}><span>{p.name}</span><strong>{p.count}</strong></button>)}
     {unplaced>0&&<div className="ri-geo-unplaced"><span>Sin zona reconocible</span><b>{unplaced}</b></div>}
    </div>
    <Link to={mode==='consultas'?'/oportunidades':'/pedidos'} className="ri-geo-link">Ver {label}<ArrowRight size={16}/></Link>
   </aside>
  </div>
  <footer className="ri-geo-foot">Base cartográfica: Natural Earth (dominio público). Marcadores aproximados por provincia/distrito según el destino registrado; no localización exacta de personas ni geolocalización de visitantes.</footer>
 </section>;
}
