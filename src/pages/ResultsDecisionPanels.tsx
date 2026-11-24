import {useMemo,useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, CircleAlert, ClipboardList,
  Clock3, FileText, Inbox, PackageCheck, TrendingUp, Wallet
} from 'lucide-react';
import {money,today,type CrmState,type Opportunity,type Quote,type Order} from '../domain';

export type InsightsPeriod='all'|'30'|'90'|'365';
export type CommercialPeriod={
  leads:Opportunity[];
  quotes:Quote[];
  orders:Order[];
  accepted:Opportunity[];
  open:Opportunity[];
  lost:Opportunity[];
  overdue:number;
  amount:number;
  delivered:number;
};
export type ActivityBucket={label:string;leads:number;quotes:number};
const num=new Intl.NumberFormat('es-ES');
const pct=(amount:number,total:number)=>total?Math.round(amount/total*100):0;
const localDay=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const periodText=(period:InsightsPeriod)=>({all:'Todo el historial',30:'Últimos 30 días',90:'Últimos 90 días',365:'Últimos 12 meses'}[period]);
function previousCount<T extends {createdAt:string}>(items:T[],period:InsightsPeriod){
  if(period==='all')return null;
  const length=Number(period),start=new Date(today()+'T12:00:00');
  start.setDate(start.getDate()-(length-1));
  const previousEnd=new Date(start);previousEnd.setDate(previousEnd.getDate()-1);
  const previousStart=new Date(start);previousStart.setDate(previousStart.getDate()-length);
  const a=localDay(previousStart),b=localDay(previousEnd);
  return items.filter(item=>item.createdAt>=a&&item.createdAt<=b).length;
}
function Comparison({now,previous}:{now:number;previous:number|null}){
  if(previous===null)return <span className="ri-cmd-comparison-neutral">Histórico acumulado · sin periodo comparativo</span>;
  if(previous===0&&now===0)return <span className="ri-cmd-comparison-neutral">Sin actividad en ambos periodos</span>;
  if(previous===0)return <span className="ri-cmd-comparison-neutral">Periodo anterior: 0 consultas</span>;
  const change=Math.round((now-previous)/previous*100);
  return <span className={'ri-cmd-comparison '+(change<0?'is-down':change>0?'is-up':'is-flat')}>
    {change>0?'+':''}{change}% <small>frente al periodo anterior de igual duración ({previous})</small>
  </span>;
}
function Value({label,value,note,href,icon}:{label:string;value:string;note:string;href:string;icon:ReactNode}){
  return <Link to={href} className="ri-cmd-value">
    <div className="ri-cmd-value-heading"><span>{label}</span>{icon}</div>
    <strong>{value}</strong>
    <small>{note}</small>
  </Link>;
}
export function ResultsExecutiveOverview({data,period,summary}:{data:CrmState;period:InsightsPeriod;summary:CommercialPeriod}){
  const total=summary.leads.length;
  const accepted=summary.accepted.length;
  const quoteLeadIds=useMemo(()=>new Set(data.quotes.map(q=>q.opportunityId).filter(Boolean)),[data.quotes]);
  const quoted=summary.leads.filter(lead=>quoteLeadIds.has(lead.id)).length;
  const firstResponse=summary.leads.filter(o=>o.status==='Nueva').length;
  const notQuoted=summary.leads.filter(o=>o.status==='Por presupuestar').length;
  const awaitingQuote=summary.quotes.filter(q=>q.status==='Enviado').length;
  const average=summary.orders.length?summary.amount/summary.orders.length:0;
  const previous=previousCount(data.opportunities,period);
  const todayTasks=data.tasks.filter(t=>!t.done&&t.due<today()).length;
  const priority=summary.overdue>0?{
    title:summary.overdue===1?'Hay un seguimiento vencido':'Hay seguimientos vencidos',
    text:'Revisa estas oportunidades antes de valorar ampliar la inversión en campañas.'
  }:firstResponse>0?{
    title:'Hay consultas nuevas que atender',
    text:'Prioriza la respuesta y el seguimiento antes de impulsar nuevas campañas.'
  }:notQuoted>0?{
    title:'Hay oportunidades por presupuestar',
    text:'Completa las propuestas pendientes para avanzar hacia el cierre.'
  }:{
    title:'Sin alertas vencidas en este periodo',
    text:'El siguiente paso es revisar la calidad de las consultas, los cierres y los costes reales.'
  };
  return <section className="ri-command" aria-labelledby="ri-command-title">
    <div className="ri-command-head">
      <div><span className="ri-command-eyebrow">LECTURA DE DIRECCIÓN</span>
        <h2 id="ri-command-title">Pulso comercial</h2>
        <p>Un resumen para detectar oportunidades, trabajo pendiente y capacidad de cierre.</p>
      </div>
      <span className="ri-command-period">{periodText(period)} · CRM de demostración</span>
    </div>
    <div className="ri-command-featured">
      <article className="ri-cmd-leads">
        <span className="ri-cmd-leads-top"><Inbox size={18}/> ENTRADA DE OPORTUNIDADES</span>
        <div className="ri-cmd-main-number"><strong>{num.format(total)}</strong><span>{total===1?'consulta recibida':'consultas recibidas'}</span></div>
        <Comparison now={total} previous={previous}/>
        <span className="ri-cmd-source">Origen: oportunidades registradas en el periodo</span>
      </article>
      <article className="ri-cmd-conversion">
        <div className="ri-cmd-card-heading"><span>Conversión comercial</span><TrendingUp size={20}/></div>
        <div className="ri-cmd-conv-content">
          <svg viewBox="0 0 170 170" role="img" aria-label={pct(accepted,total)+'% de las oportunidades recibidas están aceptadas'}>
            <circle cx="85" cy="85" r="62" fill="none" stroke="#e8f0f7" strokeWidth="19"/>
            <circle cx="85" cy="85" r="62" fill="none" stroke="#1475bf" strokeWidth="19"
              strokeDasharray={(pct(accepted,total)/100*389.56)+' 389.56'} transform="rotate(-90 85 85)" strokeLinecap="round"/>
            <text x="85" y="83" textAnchor="middle" className="ri-cmd-conv-percent">{pct(accepted,total)}%</text>
            <text x="85" y="106" textAnchor="middle" className="ri-cmd-conv-label">aceptadas</text>
          </svg>
          <div className="ri-cmd-conv-summary">
            <div><CheckCircle2 size={17}/><span>Oportunidades aceptadas</span><strong>{accepted}</strong></div>
            <div><CircleAlert size={17}/><span>Oportunidades perdidas</span><strong>{summary.lost.length}</strong></div>
            <div><Clock3 size={17}/><span>Continúan abiertas</span><strong>{summary.open.length}</strong></div>
          </div>
        </div>
        <p>Estado actual de las oportunidades recibidas en el periodo, no porcentaje de pedidos entregados.</p>
      </article>
      <article className="ri-cmd-actions">
        <div className="ri-cmd-card-heading"><span>Necesita atención</span><CalendarClock size={20}/></div>
        <div className="ri-cmd-action-rows">
          <Link to="/oportunidades" className="ri-cmd-action-row"><span>Sin responder <small>Estado «Nueva»</small></span><strong>{firstResponse}</strong></Link>
          <Link to="/oportunidades" className="ri-cmd-action-row"><span>Por presupuestar <small>Estado actual</small></span><strong>{notQuoted}</strong></Link>
          <Link to="/agenda" className={'ri-cmd-action-row'+(summary.overdue?' is-warning':'')}><span>Seguimientos vencidos <small>Próxima acción anterior a hoy</small></span><strong>{summary.overdue}</strong></Link>
        </div>
        <div className="ri-cmd-advice"><b>{priority.title}</b><span>{priority.text}</span></div>
      </article>
    </div>
    <div className="ri-command-values" aria-label="Indicadores complementarios">
      <Value label="Presupuestos creados" value={num.format(summary.quotes.length)}
        note="Por fecha de creación" icon={<FileText size={17}/>} href="/presupuestos"/>
      <Value label="Cobertura presupuestada" value={pct(quoted,total)+'%'}
        note={quoted+' de '+total+' consultas con propuesta vinculada, aunque sea posterior'} icon={<ClipboardList size={17}/>} href="/oportunidades"/>
      <Value label="Presupuestos enviados" value={num.format(awaitingQuote)}
        note="Estado actual de los creados en el periodo" icon={<ArrowUpRight size={17}/>} href="/presupuestos"/>
      <Value label="Pedidos registrados" value={num.format(summary.orders.length)}
        note={summary.delivered+' entregados en el periodo'} icon={<PackageCheck size={17}/>} href="/pedidos"/>
      <Value label="Importe de pedidos" value={money(summary.amount)}
        note="Volumen registrado; no facturación propia" icon={<Wallet size={17}/>} href="/pedidos"/>
      <Value label="Importe medio/pedido" value={summary.orders.length?money(average):'—'}
        note={summary.orders.length+' pedidos como base'} icon={<TrendingUp size={17}/>} href="/pedidos"/>
    </div>
    <div className="ri-command-foot">
      <span><CircleAlert size={16}/> Datos locales de demostración. Las comparaciones y los estados no acreditan ingresos reales ni rentabilidad.</span>
      {todayTasks>0&&<Link to="/agenda">{todayTasks} {todayTasks===1?'tarea vencida':'tareas vencidas'} en agenda <ArrowRight size={15}/></Link>}
    </div>
  </section>;
}
export function ResultsActivityBoard({points,period,caption}:{points:ActivityBucket[];period:InsightsPeriod;caption:string}){
  const [selectedIndex,setSelectedIndex]=useState(-1);
  const [leadsOn,setLeadsOn]=useState(true);
  const [quotesOn,setQuotesOn]=useState(true);
  const index=selectedIndex<0||selectedIndex>=points.length?Math.max(0,points.length-1):selectedIndex;
  const chosen=points[index];
  const max=Math.max(1,...points.flatMap(point=>[point.leads,point.quotes]));
  const totalLeads=points.reduce((n,p)=>n+p.leads,0),totalQuotes=points.reduce((n,p)=>n+p.quotes,0);
  const best=points.reduce<ActivityBucket|null>((prev,p)=>!prev||p.leads>prev.leads?p:prev,null);
  const split=period==='30'?2:4;
  const latest=points.slice(-split).reduce((sum,p)=>sum+p.leads,0);
  const previous=points.slice(-2*split,-split).reduce((sum,p)=>sum+p.leads,0);
  const cadence=period==='365'?'meses':'semanas';
  const signal=previous===0?(latest>0?'Actividad reciente; tramo anterior sin consultas':'Sin consultas en ambos tramos'):
    latest===previous?'Ritmo estable entre tramos':
    latest>previous?'Más consultas que en el tramo anterior':'Menos consultas que en el tramo anterior';
  const comparison=previous>0?((latest-previous)/previous*100):null;
  return <section className="ri-activity-board" aria-labelledby="ri-activity-title">
    <header className="ri-activity-head">
      <div><span className="ri-activity-eyebrow">COMPORTAMIENTO DE LA DEMANDA</span>
        <h2 id="ri-activity-title">Ritmo de consultas y presupuestos</h2>
        <p>{caption}</p></div>
      <div className="ri-activity-controls" role="group" aria-label="Series del gráfico">
        <button type="button" aria-pressed={leadsOn} className={leadsOn?'is-on':''}
          onClick={()=>{if(!leadsOn||quotesOn)setLeadsOn(x=>!x)}}><i className="is-consultas"/>Consultas</button>
        <button type="button" aria-pressed={quotesOn} className={quotesOn?'is-on':''}
          onClick={()=>{if(!quotesOn||leadsOn)setQuotesOn(x=>!x)}}><i className="is-presupuestos"/>Presupuestos</button>
      </div>
    </header>
    <div className="ri-activity-body">
      <div className="ri-activity-plotwrap">
        <div className="ri-activity-totals"><span><b>{totalLeads}</b> consultas</span><span><b>{totalQuotes}</b> presupuestos</span><small>En el intervalo dibujado</small></div>
        <div className="ri-activity-scroll">
          <div className="ri-activity-plot" style={{minWidth:Math.max(420,points.length*51)+'px'}} role="group" aria-label="Seleccionar semana o mes">
            <div className="ri-activity-gridline" aria-hidden="true"/>
            {points.map((bucket,i)=><button type="button" key={bucket.label+i}
              className={'ri-activity-period'+(index===i?' is-selected':'')}
              aria-pressed={index===i}
              aria-label={bucket.label+': '+bucket.leads+' consultas y '+bucket.quotes+' presupuestos'}
              onClick={()=>setSelectedIndex(i)} onFocus={()=>setSelectedIndex(i)}>
              <span className="ri-activity-period-graph">
                {leadsOn&&<span className="ri-activity-bar ri-activity-bar-lead"
                  style={{height:(bucket.leads/max*100)+'%'}} title={bucket.leads+' consultas'}/>}
                {quotesOn&&<span className="ri-activity-bar ri-activity-bar-quote"
                  style={{height:(bucket.quotes/max*100)+'%'}} title={bucket.quotes+' presupuestos'}/>}
              </span>
              <span className="ri-activity-period-label">{bucket.label}</span>
            </button>)}
          </div>
        </div>
        <p className="ri-activity-hint">Selecciona una columna para explorar sus valores; puedes activar u ocultar cada serie.</p>
      </div>
      <aside className="ri-activity-inspector">
        <span className="ri-activity-inspector-label">INTERVALO SELECCIONADO</span>
        <strong className="ri-activity-inspector-date">{chosen?.label||'Sin datos'}</strong>
        <div className="ri-activity-selected-metrics">
          <div><span><i className="is-consultas"/>Consultas</span><strong>{chosen?.leads||0}</strong></div>
          <div><span><i className="is-presupuestos"/>Presupuestos</span><strong>{chosen?.quotes||0}</strong></div>
        </div>
        <div className="ri-activity-comparison">
          <span className="ri-activity-inspector-label">LECTURA DE LA ACTIVIDAD</span>
          <b>{signal}</b>
          <div className="ri-activity-comparison-values">
            <div><span>Últimos {split} {cadence}</span><strong>{latest}</strong></div>
            <div><span>{split} {cadence} anteriores</span><strong>{previous}</strong></div>
          </div>
          {comparison!==null&&<p>{comparison>0?'+':''}{Math.round(comparison)}% de variación en consultas entre ambos tramos.</p>}
        </div>
        <div className="ri-activity-best">
          <span>Mayor volumen de consultas</span>
          <strong>{best?.label||'—'} <small>· {best?.leads||0}</small></strong>
        </div>
      </aside>
    </div>
    <footer className="ri-activity-foot">La gráfica utiliza fechas de creación del CRM, no sesiones web. {period==='all'?'Muestra únicamente las últimas 8 semanas aunque el resumen superior incluye todo el historial.':'Agrupación limitada al periodo elegido.'} No permite atribuir campañas sin datos externos.</footer>
  </section>;
}
