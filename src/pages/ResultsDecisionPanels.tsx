import {useMemo,useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, ClipboardList,
  Clock3, FileText, PackageCheck, TrendingUp, Wallet
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
export function ResultsExecutiveOverview({data,period,summary,mode='summary'}:{data:CrmState;period:InsightsPeriod;summary:CommercialPeriod;mode?:'summary'|'detail'}){
  const total=summary.leads.length;
  const accepted=summary.accepted.length;
  const quoteLeadIds=useMemo(()=>new Set(data.quotes.map(q=>q.opportunityId).filter(Boolean)),[data.quotes]);
  const quoted=summary.leads.filter(lead=>quoteLeadIds.has(lead.id)).length;
  const firstResponse=summary.leads.filter(o=>o.status==='Nueva').length;
  const notQuoted=summary.leads.filter(o=>o.status==='Por presupuestar').length;
  const awaitingQuote=summary.quotes.filter(q=>q.status==='Enviado').length;
  const average=summary.orders.length?summary.amount/summary.orders.length:0;
  const previous=previousCount(data.opportunities.filter(o=>!o.deletedAt),period);
  const todayTasks=data.tasks.filter(t=>!t.done&&t.due<today()).length;
  const pending=firstResponse+notQuoted+summary.overdue;
  const priority=summary.overdue>0?'Revisa primero los seguimientos vencidos':
    firstResponse>0?'Atiende las consultas nuevas antes de ampliar captación':
    notQuoted>0?'Prepara los presupuestos que siguen pendientes':
    'Sin urgencias comerciales detectadas en el periodo';
  return <section className={"ri-focus-overview ri-focus-overview-"+mode} aria-labelledby="ri-focus-title">
    <header className="ri-focus-head">
      <div><h2 id="ri-focus-title">{mode==='summary'?'Panorama comercial':'Actividad y seguimiento'}</h2><p>{mode==='summary'?'Indicadores principales del periodo':'Prioridades, conversión y métricas comerciales completas'}</p></div>
      <small>{periodText(period)}</small>
    </header>
    {mode==='summary'&&<>
    <div className="ri-focus-stats">
      <Link to="/oportunidades" className="ri-focus-stat"><span>Consultas</span><strong>{num.format(total)}</strong><small>Entradas del periodo</small></Link>
      <Link to="/presupuestos" className="ri-focus-stat"><span>Presupuestos</span><strong>{num.format(summary.quotes.length)}</strong><small>Propuestas creadas</small></Link>
      <Link to="/oportunidades" className="ri-focus-stat"><span>Aceptadas</span><strong>{num.format(accepted)}</strong><small>{pct(accepted,total)}% de las consultas</small></Link>
      <Link to="/pedidos" className="ri-focus-stat"><span>Pedidos</span><strong>{num.format(summary.orders.length)}</strong><small>{summary.delivered} entregados</small></Link>
    </div>
    <div className="ri-focus-signal">
      <span><TrendingUp size={16}/> Evolución de consultas</span>
      <Comparison now={total} previous={previous}/>
    </div>
    </>}
    {mode==='detail'&&<>
    <div className="ri-focus-lower">
      <div className="ri-focus-priority">
        <div className="ri-focus-priority-title"><div><h3>Por atender</h3><p>{priority}</p></div><strong>{pending}</strong></div>
        <div className="ri-focus-priority-list">
          <Link to="/oportunidades"><span>Nuevas sin responder</span><strong>{firstResponse}</strong></Link>
          <Link to="/oportunidades"><span>Por presupuestar</span><strong>{notQuoted}</strong></Link>
          <Link to="/agenda" className={summary.overdue?'is-warning':''}><span>Seguimientos vencidos</span><strong>{summary.overdue}</strong></Link>
        </div>
      </div>
      <div className="ri-focus-conversion">
        <div><h3>Estado de las consultas</h3><p>Situación actual de las oportunidades del periodo</p></div>
        <div className="ri-focus-conversion-main">
          <svg viewBox="0 0 170 170" role="img" aria-label={pct(accepted,total)+'% de consultas aceptadas'}>
            <circle cx="85" cy="85" r="62" fill="none" stroke="#e8f0f7" strokeWidth="18"/>
            <circle cx="85" cy="85" r="62" fill="none" stroke="#1475bf" strokeWidth="18"
              strokeDasharray={(pct(accepted,total)/100*389.56)+' 389.56'} transform="rotate(-90 85 85)" strokeLinecap="round"/>
            <text x="85" y="83" textAnchor="middle" className="ri-cmd-conv-percent">{pct(accepted,total)}%</text>
            <text x="85" y="106" textAnchor="middle" className="ri-cmd-conv-label">aceptadas</text>
          </svg>
          <div className="ri-focus-conversion-legend">
            <div><CheckCircle2 size={15}/><span>Aceptadas</span><strong>{accepted}</strong></div>
            <div><Clock3 size={15}/><span>Abiertas</span><strong>{summary.open.length}</strong></div>
            <div><CircleAlert size={15}/><span>Perdidas</span><strong>{summary.lost.length}</strong></div>
          </div>
        </div>
      </div>
    </div>
    <div className="ri-focus-details ri-focus-details-static">
      <h3>Otros indicadores comerciales</h3>
      <div className="ri-command-values" aria-label="Indicadores complementarios">
        <Value label="Presupuestos creados" value={num.format(summary.quotes.length)}
          note="Por fecha de creación" icon={<FileText size={17}/>} href="/presupuestos"/>
        <Value label="Cobertura presupuestada" value={pct(quoted,total)+'%'}
          note={quoted+' de '+total+' consultas con propuesta vinculada, aunque sea posterior'} icon={<ClipboardList size={17}/>} href="/oportunidades"/>
        <Value label="Presupuestos enviados" value={num.format(awaitingQuote)}
          note="Estado actual de los creados en el periodo" icon={<ArrowUpRight size={17}/>} href="/presupuestos"/>
        <Value label="Pedidos registrados" value={num.format(summary.orders.length)}
          note={summary.delivered+' entregados'} icon={<PackageCheck size={17}/>} href="/pedidos"/>
        <Value label="Importe de pedidos" value={money(summary.amount)}
          note="Volumen registrado; no facturación propia" icon={<Wallet size={17}/>} href="/pedidos"/>
        <Value label="Importe medio/pedido" value={summary.orders.length?money(average):'—'}
          note={summary.orders.length+' pedidos como base'} icon={<TrendingUp size={17}/>} href="/pedidos"/>
      </div>
    </div>
    <footer className="ri-focus-foot"><span>Datos locales de demostración; no representan facturación ni rentabilidad real.</span>
      {todayTasks>0&&<Link to="/agenda">{todayTasks} {todayTasks===1?'tarea vencida':'tareas vencidas'} en agenda <ArrowRight size={14}/></Link>}
    </footer>
    </>}
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
