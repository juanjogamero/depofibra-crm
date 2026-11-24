/* Evolución del CRM con lenguaje visual de informe, sin datos de Search Console externos. */
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Info} from 'lucide-react';
type Point={label:string;leads:number;quotes:number};
const nf=new Intl.NumberFormat('es-ES');
export default function ResultsTrendReport({points,caption,period}:{points:Point[];caption:string;period:'all'|'30'|'90'|'365'}){
 const [leadsOn,setLeadsOn]=useState(true),[quotesOn,setQuotesOn]=useState(true);
 const [selected,setSelected]=useState<number|null>(null);
 const idx=selected===null||selected>=points.length?Math.max(0,points.length-1):selected;
 const chosen=points[idx];
 const sumLeads=points.reduce((a,b)=>a+b.leads,0),sumQuotes=points.reduce((a,b)=>a+b.quotes,0);
 const maxima=Math.max(1,...points.flatMap(x=>[x.leads,x.quotes]));
 const maxTick=Math.max(1,Math.ceil(maxima/4)*4);
 const w=950,h=286,top=22,bottom=241,left=46,right=25,plotWidth=w-left-right,plotHeight=bottom-top;
 const xy=(i:number,value:number)=>[left+(points.length>1?i/(points.length-1)*plotWidth:plotWidth/2),bottom-value/maxTick*plotHeight];
 const path=(metric:'leads'|'quotes')=>points.map((p,i)=>{
  const [x,y]=xy(i,p[metric]);return (i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);
 }).join(' ');
 const n=points.length;
 const comparisonLength=period==='30'?2:period==='365'?4:4;
 const recent=points.slice(-comparisonLength).reduce((a,p)=>a+p.leads,0);
 const earlier=points.slice(-comparisonLength*2,-comparisonLength).reduce((a,p)=>a+p.leads,0);
 const change=earlier?Math.round((recent-earlier)/earlier*100):null;
 return <section className="ri-trend-report" aria-label="Evolución de consultas y presupuestos">
  <header className="ri-study-head"><div><h2>Evolución de la actividad comercial</h2><p>{caption}</p></div><Link to="/oportunidades" className="ri-study-link">Ver consultas <ArrowRight size={14}/></Link></header>
  <div className="ri-trend-metrics" role="group" aria-label="Seleccionar series a mostrar en gráfica">
   <button type="button" aria-pressed={leadsOn} className={'ri-trend-metric ri-trend-blue'+(leadsOn?' is-on':'')}
    onClick={()=>{if(!leadsOn||quotesOn)setLeadsOn(x=>!x)}}>
    <span><i aria-hidden="true" className="ri-trend-check"/>{' '}Consultas recibidas</span><strong>{nf.format(sumLeads)}</strong><small>Según fecha de oportunidad</small>
   </button>
   <button type="button" aria-pressed={quotesOn} className={'ri-trend-metric ri-trend-purple'+(quotesOn?' is-on':'')}
    onClick={()=>{if(!quotesOn||leadsOn)setQuotesOn(x=>!x)}}>
    <span><i aria-hidden="true" className="ri-trend-check"/>{' '}Presupuestos creados</span><strong>{nf.format(sumQuotes)}</strong><small>Según fecha del presupuesto</small>
   </button>
   <div className="ri-trend-info"><strong>{n} intervalos</strong><span>Selecciona un punto del gráfico para consultar sus cifras.</span></div>
  </div>
  <div className="ri-trend-chart-scroll">
   <svg viewBox={'0 0 '+w+' '+h} className="ri-trend-chart" role="img" aria-label="Evolución temporal de consultas y presupuestos registrados en el CRM">
    {[0,1,2,3,4].map(i=>{
     const value=i/4*maxTick,y=bottom-i/4*plotHeight;
     return <g key={i}><line x1={left} y1={y} x2={w-right} y2={y} className="ri-trend-gridline"/>
      <text x={left-13} y={y+4} textAnchor="end" className="ri-trend-axis-label">{nf.format(value)}</text></g>;
    })}
    {chosen&&<line x1={xy(idx,0)[0]} y1={top} x2={xy(idx,0)[0]} y2={bottom} className="ri-trend-crosshair"/>}
    {leadsOn&&<path d={path('leads')} className="ri-trend-line ri-trend-line-blue"/>}
    {quotesOn&&<path d={path('quotes')} className="ri-trend-line ri-trend-line-purple"/>}
    {points.map((p,i)=>{
      const [x,y1]=xy(i,p.leads),[,y2]=xy(i,p.quotes),active=i===idx;
      return <g key={p.label+'-'+i}>
       {leadsOn&&<circle className={'ri-trend-dot ri-trend-dot-blue'+(active?' active':'')} cx={x} cy={y1} r={active?5.5:3.2}
        role="button" tabIndex={0} onClick={()=>setSelected(i)} onFocus={()=>setSelected(i)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i)}}}
        aria-label={p.label+': '+p.leads+' consultas'}><title>{p.label}: {p.leads} consultas</title></circle>}
       {quotesOn&&<circle className={'ri-trend-dot ri-trend-dot-purple'+(active?' active':'')} cx={x} cy={y2} r={active?5.5:3.2}
        role="button" tabIndex={0} onClick={()=>setSelected(i)} onFocus={()=>setSelected(i)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i)}}}
        aria-label={p.label+': '+p.quotes+' presupuestos'}><title>{p.label}: {p.quotes} presupuestos</title></circle>}
       <text x={x} y={bottom+22} textAnchor="middle" className="ri-trend-axis-label">{p.label}</text>
      </g>;
    })}
   </svg>
  </div>
  <div className="ri-trend-inspector" aria-live="polite">
   <span className="ri-trend-inspector-period">{chosen?.label||'—'} · intervalo seleccionado</span>
   <strong><i className="ri-trend-blue-dot"/>{nf.format(chosen?.leads||0)} consultas</strong>
   <strong><i className="ri-trend-purple-dot"/>{nf.format(chosen?.quotes||0)} presupuestos</strong>
   <span className="ri-trend-comparison">{change===null?'Sin base comparativa suficiente':(change>0?'+':'')+change+'% de consultas en el tramo reciente frente al tramo anterior'}</span>
  </div>
  <div className="ri-trend-breakdown">
   <h3>Detalle por intervalo</h3>
   <div className="ri-study-table-scroll"><table className="ri-study-table">
    <thead><tr><th>Periodo</th><th>Consultas</th><th>Presupuestos</th><th>Presupuestos / consultas</th></tr></thead>
    <tbody>{points.map((p,i)=><tr key={p.label+i} className={idx===i?'ri-study-highlight':''}>
     <th scope="row"><button type="button" onClick={()=>setSelected(i)}>{p.label}</button></th><td>{nf.format(p.leads)}</td><td>{nf.format(p.quotes)}</td><td>{p.leads?Math.round(p.quotes/p.leads*100)+'%':'—'}</td>
    </tr>)}</tbody></table></div>
  </div>
  <p className="ri-study-footnote"><Info size={14}/>Las series son recuentos de registros creados, no tráfico web ni conversiones atribuibles; la relación entre presupuestos y consultas del mismo intervalo no necesariamente corresponde a los mismos clientes. {period==='all'?'El gráfico enseña las últimas ocho semanas, aunque otros informes pueden usar todo el historial.':''}</p>
 </section>;
}
