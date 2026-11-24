import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Layers3,Package,ShoppingCart,Truck} from 'lucide-react';
type Count={label:string;count:number};
const format=new Intl.NumberFormat('es-ES');
const percent=(value:number,total:number)=>total?format.format(Math.round(value/total*100))+'%':'0%';
export function ProductRankCard({items,title,subtitle,to,kind}:{
 items:Count[];title:string;subtitle:string;to:string;kind:'consultas'|'pedidos'
}){
 const [chosen,setChosen]=useState<string|null>(null);
 const total=items.reduce((s,i)=>s+i.count,0),active=items.find(i=>i.label===chosen)||items[0];
 const icon=kind==='consultas'?<Package size={23}/>:<ShoppingCart size={23}/>;
 const leader=items[0];
 return <section className={'ri-product-card ri-product-card-'+kind}>
  <header className="ri-rich-head"><span className="ri-rich-icon">{icon}</span>
   <div><h3>{title}</h3><p>{subtitle}</p></div>
   <Link to={to} className="ri-rich-header-link" aria-label={'Ver todos los '+kind}><ArrowRight size={19}/></Link>
  </header>
  <div className="ri-product-content">
   <div className="ri-product-hero">
    <span className="ri-rich-eyebrow">{kind==='consultas'?'CONSULTAS TOTALES':'PEDIDOS REGISTRADOS'}</span>
    <strong>{format.format(total)}</strong>
    <p>{kind==='consultas'?'Oportunidades del periodo':'No significa pedidos entregados'}</p>
    <div className="ri-product-hero-rule"/>
    <span className="ri-rich-eyebrow">MAYOR {kind==='consultas'?'INTERÉS':'VOLUMEN'}</span>
    <b title={leader?.label}>{leader?.label||'Sin registros'}</b>
    <small>{leader?percent(leader.count,total)+' del total':'Pendiente de registros'}</small>
   </div>
   <div className="ri-product-table">
    <div className="ri-product-columns"><span>PRODUCTO / REFERENCIA</span><span>{kind==='consultas'?'CONSULTAS':'PEDIDOS'}</span><span>% DEL TOTAL</span></div>
    {items.length?items.slice(0,6).map((item,i)=>(
     <button type="button" key={item.label} className={'ri-product-table-row'+(active?.label===item.label?' is-selected':'')}
      aria-pressed={active?.label===item.label} onClick={()=>setChosen(item.label)}>
      <span className="ri-product-name"><i>{String(i+1).padStart(2,'0')}</i><span title={item.label}>{item.label}</span></span>
      <strong>{format.format(item.count)}</strong>
      <span className="ri-product-share"><b>{percent(item.count,total)}</b>
       <span className="ri-product-track"><i style={{width:(item.count/Math.max(total,1)*100)+'%'}}/></span>
      </span>
     </button>
    )):<div className="ri-product-empty">No hay datos en el periodo seleccionado.</div>}
   </div>
  </div>
  {active&&<footer className="ri-product-foot" aria-live="polite">
   <span><b>{active.label}</b> · {format.format(active.count)} {kind} ({percent(active.count,total)})</span>
   <Link to={to}>Consultar {kind} <ArrowRight size={15}/></Link>
  </footer>}
 </section>;
}
const colors=['#01488e','#2077b6','#4398d0','#70b6d5','#72cfc5','#9ec8e5','#adbae0'];
function SelectableDonut({items,title,empty}:{items:Count[];title:string;empty:string}){
 const [chosen,setChosen]=useState<string|null>(null);
 const total=items.reduce((s,item)=>s+item.count,0);
 const active=items.find(x=>x.label===chosen)||items[0];
 const r=78,c=2*Math.PI*r;
 let offset=0;
 if(!items.length)return <div className="ri-rich-empty">{empty}</div>;
 return <div className="ri-rich-donut-layout">
  <svg className="ri-rich-donut" viewBox="0 0 235 235" role="img" aria-label={title}>
   <circle cx="117.5" cy="117.5" r={r} fill="none" stroke="#eaf2f8" strokeWidth="31"/>
   {items.map((item,i)=>{
    const length=item.count/total*c,previous=offset;offset+=length;
    return <circle key={item.label} cx="117.5" cy="117.5" r={r} fill="none"
     stroke={colors[i%colors.length]} strokeWidth={active.label===item.label?34:30}
     strokeDasharray={length+' '+(c-length)} strokeDashoffset={-previous}
     transform="rotate(-90 117.5 117.5)" role="button" tabIndex={0}
     aria-label={item.label+': '+item.count+' ('+percent(item.count,total)+')'}
     className="ri-rich-slice" onClick={()=>setChosen(item.label)}
     onPointerEnter={()=>setChosen(item.label)} onFocus={()=>setChosen(item.label)}
     onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setChosen(item.label)}}}>
     <title>{item.label} · {item.count}</title>
    </circle>;
   })}
   <text x="117.5" y="113" textAnchor="middle" className="ri-rich-donut-number">{format.format(total)}</text>
   <text x="117.5" y="134" textAnchor="middle" className="ri-rich-donut-caption">{title}</text>
  </svg>
  <div className="ri-rich-legend" role="group" aria-label={'Seleccionar '+title}>
   {items.slice(0,8).map((item,i)=><button type="button" key={item.label}
    className={active.label===item.label?'is-active':''} aria-pressed={active.label===item.label}
    onClick={()=>setChosen(item.label)}>
    <span><i style={{backgroundColor:colors[i%colors.length]}}/>{item.label}</span>
    <strong>{item.count} <small>({percent(item.count,total)})</small></strong>
   </button>)}
  </div>
 </div>;
}
export function DistributionCard({items,title,subtitle,kind,to}:{
 items:Count[];title:string;subtitle:string;kind:'capacidades'|'estados';to:string
}){
 const total=items.reduce((s,i)=>s+i.count,0);
 const leading=items[0];
 return <section className={'ri-distribution-card ri-distribution-'+kind}>
  <header className="ri-rich-head"><span className="ri-rich-icon">{kind==='capacidades'?<Layers3 size={22}/>:<Truck size={22}/>}</span>
   <div><h3>{title}</h3><p>{subtitle}</p></div>
  </header>
  <div className="ri-dist-metrics">
   <div><span>{kind==='capacidades'?'CAPACIDADES DISTINTAS':'PEDIDOS REGISTRADOS'}</span>
    <strong>{format.format(kind==='capacidades'?items.length:total)}</strong></div>
   <div><span>{kind==='capacidades'?'VOLUMEN MÁS SOLICITADO':'ESTADO PRINCIPAL'}</span>
    <strong title={leading?.label}>{leading?.label||'—'}</strong></div>
  </div>
  <div className="ri-distribution-content">
   <SelectableDonut items={items} title={kind==='capacidades'?'solicitudes':'pedidos'} empty="No hay datos de este periodo."/>
  </div>
  {items.length>0&&<div className="ri-dist-stacked" aria-label="Distribución porcentual por categoría">
   {items.map((item,i)=><span key={item.label} title={item.label+': '+percent(item.count,total)}
    style={{width:item.count/Math.max(total,1)*100+'%',backgroundColor:colors[i%colors.length]}}/>)}
  </div>}
  <footer className="ri-dist-foot"><span>{kind==='capacidades'?'Capacidades indicadas en las consultas':'Estados registrados; no todos están entregados'}</span>
   <Link to={to}>Ver detalle <ArrowRight size={15}/></Link>
  </footer>
 </section>;
}
