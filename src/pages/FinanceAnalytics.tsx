import {useMemo,useState,type ReactNode,type CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,BarChart3,CalendarDays,CheckCircle2,Clock3,Download,FileText,Info,Landmark,TrendingUp,Wallet} from 'lucide-react';
import {useCrm} from '../store';
import {money,today,type Order,type CommissionPayment} from '../domain';

type Period='month'|'six'|'twelve'|'year'|'custom'|'all';
type Status='all'|'unpaid'|'partial'|'paid';
type MonthRow={month:string;generated:number;collected:number;orders:number;volume:number};
const numerals=new Intl.NumberFormat('es-ES');
const currency=(v:number)=>money(Number.isFinite(v)?v:0);
const positive=(v:number)=>Number.isFinite(v)?Math.max(0,v):0;
function plusMonths(key:string,n:number):string{
 const [year,month]=key.split('-').map(Number);
 const d=new Date(year,month-1+n,1,12);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function monthLabel(key:string,full=false){
 const [year,month]=key.split('-').map(Number);
 return new Date(year,month-1,1,12).toLocaleDateString('es-ES',
  full?{month:'long',year:'numeric'}:{month:'short',year:'2-digit'}).replace('.','');
}
function listMonths(first:string,last:string):string[]{
 const out:string[]=[];
 if(first>last)return out;
 for(let cursor=first;cursor<=last&&out.length<240;cursor=plusMonths(cursor,1))out.push(cursor);
 return out;
}
function orderStatus(order:Order):Status{
 const paid=positive(order.commissionPaid),due=positive(order.commission);
 return due<=0||paid>=due?'paid':paid===0?'unpaid':'partial';
}
function csvEscape(value:unknown){
 const valueText=value===null||value===undefined?'':String(value);
 const safe=typeof value==='string'&&/^[\t\r\n ]*[=+@-]/.test(valueText)?"'"+valueText:valueText;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function exportFinance(rows:MonthRow[],orders:Order[],periodLabel:string){
 const records=[
  ['Resumen mensual ('+periodLabel+')'],['Mes','Comisiones generadas (€)','Cobros con fecha (€)','Pedidos','Importe de pedidos (€)'],
  ...rows.map(r=>[r.month,r.generated,r.collected,r.orders,r.volume]),
  [],['Detalle de pedidos del periodo (datos internos de demostración)'],
  ['Pedido','Fecha del pedido','Producto','Comisión generada (€)','Cobrado acumulado de este pedido (€)','Pendiente actual (€)','Estado de cobro'],
  ...orders.map(o=>[o.id,o.createdAt,o.product+' · '+o.capacity,o.commission,o.commissionPaid,Math.max(0,o.commission-o.commissionPaid),orderStatus(o)])
 ];
 const content='\uFEFF'+records.map(row=>row.map(csvEscape).join(';')).join('\r\n')+'\r\n';
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='depofibra-finanzas-'+today()+'.csv';
 document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Metric({title,amount,caption,icon,tone}:{title:string;amount:string;caption:string;icon:ReactNode;tone?:string}){
 return <article className={'fin-metric '+(tone?'is-'+tone:'')}>
  <div className="fin-metric-head"><span>{title}</span>{icon}</div>
  <strong>{amount}</strong><small>{caption}</small>
 </article>;
}
function MonthChart({rows,selected,onSelected}:{rows:MonthRow[];selected:string;onSelected:(m:string)=>void}){
 const [showGenerated,setGenerated]=useState(true);
 const [showCollected,setCollected]=useState(true);
 const max=Math.max(1,...rows.flatMap(r=>[r.generated,r.collected]));
 const current=rows.find(r=>r.month===selected)||rows.at(-1);
 return <section className="fin-panel fin-trend" aria-labelledby="fin-trend-title">
  <header className="fin-panel-head">
   <div><span className="fin-eyebrow">EVOLUCIÓN</span><h2 id="fin-trend-title">Comisiones por mes</h2>
    <p>Generadas por fecha del pedido · cobros por fecha registrada</p></div>
   <div className="fin-series" aria-label="Mostrar series">
    <button type="button" className={showGenerated?'is-on':''} aria-pressed={showGenerated}
      onClick={()=>{if(!showGenerated||showCollected)setGenerated(!showGenerated)}}><i className="fin-dot-generated"/>Generadas</button>
    <button type="button" className={showCollected?'is-on':''} aria-pressed={showCollected}
      onClick={()=>{if(!showCollected||showGenerated)setCollected(!showCollected)}}><i className="fin-dot-collected"/>Cobros fechados</button>
   </div>
  </header>
  <div className="fin-chart-area">
   <div className="fin-chart-scroll" role="region" aria-label="Gráfica de comisiones con desplazamiento horizontal" tabIndex={0}>
    <div className="fin-chart-bars" style={{minWidth:Math.max(400,rows.length*76)+'px'}}>
     <div className="fin-chart-gridlines" aria-hidden="true"/>
     {rows.map(r=><button key={r.month} type="button" onClick={()=>onSelected(r.month)}
      onFocus={()=>onSelected(r.month)} className={'fin-month-bar'+(current?.month===r.month?' is-active':'')}
      aria-pressed={current?.month===r.month}
      aria-label={monthLabel(r.month,true)+': '+currency(r.generated)+' generados, '+currency(r.collected)+' cobros fechados'}>
      <span className="fin-month-bars">
       {showGenerated&&<span className="fin-bar fin-bar-generated" style={{height:r.generated?Math.max(3,r.generated/max*100)+'%':'0%'}} title={'Generado: '+currency(r.generated)}/>}
       {showCollected&&<span className="fin-bar fin-bar-collected" style={{height:r.collected?Math.max(3,r.collected/max*100)+'%':'0%'}} title={'Cobrado con fecha: '+currency(r.collected)}/>}
      </span><span className="fin-month-label">{monthLabel(r.month)}</span>
     </button>)}
    </div>
   </div>
   <div className="fin-month-detail" aria-live="polite">
    <div><span>MES SELECCIONADO</span><strong>{current?monthLabel(current.month,true):'Sin periodo'}</strong></div>
    <div><span>GENERADO</span><strong>{currency(current?.generated||0)}</strong></div>
    <div><span>COBROS FECHADOS</span><strong>{currency(current?.collected||0)}</strong></div>
    <div><span>PEDIDOS</span><strong>{current?.orders||0}</strong></div>
   </div>
   <p className="fin-chart-note">Los cobros antiguos sin fecha no se asignan artificialmente a ningún mes. Selecciona una columna para consultar su detalle.</p>
  </div>
 </section>;
}
function Settlement({generated,paid,undated,dated,orders}:{generated:number;paid:number;undated:number;dated:number;orders:number}){
 const share=generated?Math.min(100,Math.round(paid/generated*100)):0;
 return <section className="fin-panel fin-settlement" aria-labelledby="fin-settlement-title">
  <header className="fin-panel-head"><div><span className="fin-eyebrow">ESTADO ACTUAL</span>
   <h2 id="fin-settlement-title">Liquidación de comisiones</h2><p>Comisiones de los pedidos creados en el periodo</p></div></header>
  <div className="fin-settlement-overview">
   <div className="fin-ring" role="img" aria-label={share+' por ciento cobrado de comisiones generadas'}
    style={{'--fin-share':share+'%'} as CSSProperties}>
    <span><strong>{share}%</strong><small>cobrado</small></span>
   </div>
   <div className="fin-settlement-legend">
    <div><span><i className="fin-dot-collected"/>Cobradas acumuladas</span><strong>{currency(paid)}</strong></div>
    <div><span><i className="fin-dot-pending"/>Pendientes actuales</span><strong>{currency(Math.max(0,generated-paid))}</strong></div>
    <div><span>Pedidos del periodo</span><strong>{orders}</strong></div>
   </div>
  </div>
  <div className="fin-cash-context">
   <div><span>Cobros de estos pedidos sin fecha individual</span><strong>{currency(undated)}</strong></div>
   <div><span>Cobros con fecha, realizados en el periodo</span><strong>{currency(dated)}</strong></div>
  </div>
  <p className="fin-settlement-foot">El porcentaje compara comisiones generadas y cobradas acumuladas de los <b>mismos pedidos</b>. Los cobros pueden haberse realizado después del periodo seleccionado.</p>
 </section>;
}
export default function FinanceAnalytics(){
 const {data}=useCrm();
 const now=today().slice(0,7);
 const [period,setPeriod]=useState<Period>('six');
 const [customMonth,setCustomMonth]=useState(now);
 const [year,setYear]=useState(Number(now.slice(0,4)));
 const [status,setStatus]=useState<Status>('all');
 const payments=data.commissionPayments||[];
 const years=useMemo(()=>{
  const all=[Number(now.slice(0,4)),...data.orders.map(o=>Number(o.createdAt.slice(0,4))),...payments.map(p=>Number(p.paidAt.slice(0,4)))];
  return [...new Set(all.filter(Number.isFinite))].sort((a,b)=>b-a);
 },[data.orders,payments,now]);
 const {months,label}=useMemo(()=>{
  const oldest=[now,...data.orders.map(o=>o.createdAt.slice(0,7)),...payments.map(p=>p.paidAt.slice(0,7))].filter(v=>/^\d{4}-\d{2}$/.test(v)).sort()[0]||now;
  const first=period==='month'?now:period==='six'?plusMonths(now,-5):period==='twelve'?plusMonths(now,-11):
    period==='year'?year+'-01':period==='custom'?customMonth:oldest;
  const last=period==='year'?year+'-12':period==='custom'?customMonth:now;
  const labels:{[P in Period]:string}={month:'Este mes',six:'Últimos 6 meses',twelve:'Últimos 12 meses',
    year:'Año '+year,custom:monthLabel(customMonth,true),all:'Todo el historial'};
  return {months:listMonths(first,last),label:labels[period]};
 },[period,customMonth,year,now,data.orders,payments]);
 const beginning=months[0]||now,ending=months.at(-1)||now;
 const selectedOrders=useMemo(()=>data.orders.filter(o=>o.createdAt.slice(0,7)>=beginning&&o.createdAt.slice(0,7)<=ending),
  [data.orders,beginning,ending]);
 const datedPayments=useMemo(()=>payments.filter(p=>p.paidAt.slice(0,7)>=beginning&&p.paidAt.slice(0,7)<=ending),
  [payments,beginning,ending]);
 const sum=(orders:Order[],key:'commission'|'commissionPaid'|'amount')=>orders.reduce((n,o)=>n+positive(o[key]),0);
 const generated=sum(selectedOrders,'commission'),paidOnCohort=sum(selectedOrders,'commissionPaid'),volume=sum(selectedOrders,'amount');
 const pending=selectedOrders.reduce((n,o)=>n+Math.max(0,positive(o.commission)-positive(o.commissionPaid)),0);
 const datedCash=datedPayments.reduce((n,p)=>n+positive(p.amount),0);
 const datedByOrder=new Map<string,number>();
 payments.forEach(p=>datedByOrder.set(p.orderId,(datedByOrder.get(p.orderId)||0)+positive(p.amount)));
 const undated=selectedOrders.reduce((n,o)=>n+Math.max(0,positive(o.commissionPaid)-(datedByOrder.get(o.id)||0)),0);
 const historicalUndated=data.orders.reduce((n,o)=>n+Math.max(0,positive(o.commissionPaid)-(datedByOrder.get(o.id)||0)),0);
 const rows=useMemo<MonthRow[]>(()=>months.map(month=>({
   month,
   generated:data.orders.filter(o=>o.createdAt.slice(0,7)===month).reduce((n,o)=>n+positive(o.commission),0),
   collected:payments.filter(p=>p.paidAt.slice(0,7)===month).reduce((n,p)=>n+positive(p.amount),0),
   orders:data.orders.filter(o=>o.createdAt.slice(0,7)===month).length,
   volume:data.orders.filter(o=>o.createdAt.slice(0,7)===month).reduce((n,o)=>n+positive(o.amount),0)
 })),[months,data.orders,payments]);
 const [chosen,setChosen]=useState<string|null>(null);
 const current=chosen&&months.includes(chosen)?chosen:ending;
 const lastPeriod=period==='all'?null:{
   first:plusMonths(beginning,-months.length),last:plusMonths(beginning,-1)
 };
 const previousGenerated=lastPeriod?data.orders.filter(o=>o.createdAt.slice(0,7)>=lastPeriod.first&&o.createdAt.slice(0,7)<=lastPeriod.last)
  .reduce((n,o)=>n+positive(o.commission),0):null;
 const difference=previousGenerated!==null&&previousGenerated>0?Math.round((generated-previousGenerated)/previousGenerated*100):null;
 const filteredOrders=selectedOrders.filter(o=>status==='all'||orderStatus(o)===status)
  .slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const pendingCount=selectedOrders.filter(o=>orderStatus(o)!=='paid').length;
 const avg=selectedOrders.length?generated/selectedOrders.length:0;
 return <div className="page page-opportunities crm-workspace page-finance finance-analytics">
  <header className="op-screen-heading fin-heading">
   <div className="op-heading-copy"><span className="fin-eyebrow">CONTROL PRIVADO DE DIRECCIÓN</span>
    <h1>Finanzas</h1>
    <p>Comisiones por periodos, cobros y pendientes. Datos locales de demostración.</p>
   </div>
   <div className="op-heading-actions"><Link to="/comisiones" className="op-new-button"><Wallet size={16}/>Mis comisiones</Link></div>
  </header>
  <div className="fin-toolbar" role="group" aria-label="Filtros de periodo de Finanzas">
   <div className="fin-period-tabs">
    {([['month','Este mes'],['six','6 meses'],['twelve','12 meses'],['year','Año'],['all','Histórico']] as const).map(([v,caption])=>
      <button type="button" key={v} onClick={()=>{setPeriod(v);setChosen(null)}} aria-pressed={period===v}
       className={period===v?'is-active':''}>{caption}</button>)}
   </div>
   <div className="fin-period-utilities">
    <label>Año <select aria-label="Seleccionar año" value={year} onChange={e=>{setYear(Number(e.target.value));setPeriod('year');setChosen(null)}}>
      {years.map(y=><option value={y} key={y}>{y}</option>)}
    </select></label>
    <label>Mes <input type="month" aria-label="Seleccionar mes concreto" value={customMonth}
      onChange={e=>{setCustomMonth(e.target.value);setPeriod('custom');setChosen(null)}}/></label>
    <button type="button" className="fin-export" onClick={()=>exportFinance(rows,selectedOrders,label)}
      title="Descargar datos de comisiones filtrados sin nombres ni teléfonos"><Download size={16}/>CSV</button>
   </div>
  </div>
  <div className="fin-period-summary"><CalendarDays size={15}/><span>Periodo: <b>{label}</b></span>
   <span>{numerals.format(selectedOrders.length)} {selectedOrders.length===1?'pedido':'pedidos'} registrados</span>
   {previousGenerated!==null&&<span className="fin-compare">Vs periodo anterior de igual duración:
    <b>{difference===null?(generated>0?'sin base comparable':'sin movimiento'):(difference>0?'+':'')+difference+'%'}</b></span>}
  </div>
  <div className="fin-metrics">
   <Metric title="Comisiones generadas" amount={currency(generated)} icon={<Wallet size={19}/>}
    caption="Por fecha de creación del pedido" tone="featured"/>
   <Metric title="Cobradas de esos pedidos" amount={currency(paidOnCohort)} icon={<CheckCircle2 size={19}/>}
    caption="Acumuladas hasta hoy; no necesariamente cobradas en el periodo"/>
   <Metric title="Pendiente de esos pedidos" amount={currency(pending)} icon={<Clock3 size={19}/>}
    caption={pendingCount+' pedidos pendientes o parciales'}/>
   <Metric title="Cobros fechados en el periodo" amount={currency(datedCash)} icon={<CalendarDays size={19}/>}
    caption="Solo liquidaciones con fecha registrada"/>
  </div>
  <div className="fin-secondary-line">
   <span><Landmark size={16}/><b>{currency(volume)}</b> importe de pedidos del periodo (no facturación propia)</span>
   <span><BarChart3 size={16}/><b>{currency(avg)}</b> comisión media por pedido</span>
   {historicalUndated>0&&<span className="fin-warning-inline"><Info size={16}/>Hay <b>{currency(historicalUndated)}</b> cobrados históricamente sin fecha individual</span>}
  </div>
  <div className="fin-analytics-grid">
   <MonthChart rows={rows} selected={current} onSelected={setChosen}/>
   <Settlement generated={generated} paid={paidOnCohort} orders={selectedOrders.length} undated={undated} dated={datedCash}/>
  </div>
  <section className="fin-panel fin-order-list" aria-labelledby="fin-orders-heading">
   <header className="fin-panel-head fin-orders-head"><div><span className="fin-eyebrow">DETALLE DE OPERACIONES</span>
    <h2 id="fin-orders-heading">Pedidos y comisiones</h2>
    <p>Estado actual de los pedidos creados en el periodo. Selecciona uno para ver su ficha.</p></div>
    <div className="fin-order-filters" role="group" aria-label="Filtrar estado de cobro de los pedidos">
     {([['all','Todos'],['unpaid','Pendientes'],['partial','Parciales'],['paid','Cobrados']] as const).map(([key,text])=>
       <button key={key} type="button" onClick={()=>setStatus(key)} aria-pressed={status===key}
        className={status===key?'is-active':''}>{text}</button>)}
    </div>
   </header>
   <div className="fin-order-scroll" role="region" tabIndex={0} aria-label="Listado de pedidos y comisiones">
    <table className="fin-order-table">
     <thead><tr><th>Pedido</th><th>Fecha</th><th>Producto</th><th>Generada</th><th>Cobrada</th><th>Pendiente</th><th>Estado</th><th></th></tr></thead>
     <tbody>{filteredOrders.map(o=>{
      const state=orderStatus(o);
      return <tr key={o.id}>
       <td><Link to={'/pedidos/'+encodeURIComponent(o.id)}>{o.id}</Link></td>
       <td>{new Date(o.createdAt+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</td>
       <td title={o.product+' '+o.capacity}>{o.product}<small>{o.capacity}</small></td>
       <td>{currency(o.commission)}</td><td>{currency(o.commissionPaid)}</td><td>{currency(Math.max(0,o.commission-o.commissionPaid))}</td>
       <td><span className={'fin-status fin-status-'+state}>{state==='paid'?'Cobrado':state==='partial'?'Parcial':'Pendiente'}</span></td>
       <td><Link to={'/pedidos/'+encodeURIComponent(o.id)} aria-label={'Abrir '+o.id}><ArrowRight size={16}/></Link></td>
      </tr>;
     })}</tbody>
    </table>
    {!filteredOrders.length&&<p className="fin-empty">No hay pedidos con estos filtros. Prueba otro periodo o estado de cobro.</p>}
   </div>
   <footer className="fin-order-foot">{filteredOrders.length} de {selectedOrders.length} pedidos del periodo · Los importes son de demostración y privados.</footer>
  </section>
  <div className="fin-data-note"><Info size={18}/><p>
   <strong>Cómo interpretar estas cifras:</strong> las comisiones generadas se atribuyen al mes del pedido, no al de su cobro.
   Los cobros fechados se registran para nuevas liquidaciones; las anteriores mantienen su importe, pero no se reparten por meses sin justificante.
   Las comisiones no son beneficio neto; faltan costes y gastos verificados. Los importes de pedidos no constituyen facturación propia.
  </p><Link to="/comisiones">Ver comisiones <ArrowRight size={15}/></Link></div>
 </div>;
}
