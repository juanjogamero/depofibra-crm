import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, FileText, UsersRound, PackageCheck, Wallet,
  CalendarDays, BarChart3, ChartPie, Boxes, Settings2, Search, Bell,
  ChevronDown, Menu, X, ArrowRight, Plus, Factory,
  Command, HelpCircle, CheckCheck, BellRing, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useCrm } from './store';
import { AppRoutes } from './views';

type IconType = typeof LayoutDashboard;
type NavItem = { label: string; path: string; icon: IconType; badge?: number };
type Group = { caption: string; links: NavItem[] };

function Brand() {
  return <NavLink className="brand" to="/" aria-label="Depofibra CRM — Ir al inicio">
    <img className="brand-logo" src="https://depofibra.com/images/depofibra_brand_assets/depofibra-logo-horizontal.png?v=20261113" srcSet="https://depofibra.com/images/depofibra_brand_assets/depofibra-logo-horizontal@2x.png?v=20261113 2x" width={512} height={84} alt="Depofibra" decoding="async" />
    <img className="brand-compact-logo" src="https://depofibra.com/images/depofibra_brand_assets/favicon-depofibra-humo-v6-192.png" alt="" width={36} height={36} decoding="async" />
  </NavLink>;
}
function Sidebar({ mobileOpen, onClose, collapsed, onToggle }: { mobileOpen: boolean; onClose: () => void; collapsed: boolean; onToggle: () => void }) {
  const { role, data } = useCrm();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [activePosition, setActivePosition] = useState<{ y: number; height: number } | null>(null);
  const [resultsExpanded,setResultsExpanded] = useState(location.pathname.startsWith('/resultados'));
  useEffect(()=>{if(location.pathname.startsWith('/resultados'))setResultsExpanded(true)},[location.pathname]);

  // Medimos la opción seleccionada y movemos una única pastilla entre enlaces.
  // Esto evita el parpadeo de dos fondos al cambiar de página.
  useLayoutEffect(() => {
    const container = navRef.current;
    const activeLink = container?.querySelector<HTMLElement>('.nav-link.active');
    if (!container || !activeLink) {
      setActivePosition(null);
      return;
    }
    const update = () => {
      const linkRect = activeLink.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const next = {
        y: Math.round(linkRect.top - containerRect.top + container.scrollTop),
        height: Math.round(linkRect.height),
      };
      setActivePosition(previous =>
        previous?.y === next.y && previous.height === next.height ? previous : next
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(activeLink);
    return () => observer.disconnect();
  }, [location.pathname, collapsed, role, resultsExpanded]);
  const pending = data.opportunities.filter(o => !['Aceptada','Perdida'].includes(o.status)).length;
  const groups: Group[] = role === 'fabrica'
    ? [{ caption:'ÁREA DEL FABRICANTE', links:[{label:'Mis pedidos',path:'/fabrica',icon:Factory},{label:'Pedidos',path:'/pedidos',icon:PackageCheck}] }]
    : [
      { caption:'ESPACIO DE TRABAJO', links:[
        {label:'Inicio',path:'/',icon:LayoutDashboard},
        {label:'Oportunidades',path:'/oportunidades',icon:Inbox,badge:pending},
        {label:'Presupuestos',path:'/presupuestos',icon:FileText}
      ]},
      { caption:'VENTAS CONFIRMADAS', links:[
        {label:'Clientes',path:'/clientes',icon:UsersRound},
        {label:'Pedidos',path:'/pedidos',icon:PackageCheck},
        {label:'Mis comisiones',path:'/comisiones',icon:Wallet}
      ]},
      { caption:'ORGANIZACIÓN', links:[
        {label:'Agenda y notas',path:'/agenda',icon:CalendarDays},
        {label:'Resultados',path:'/resultados',icon:BarChart3},
        {label:'Finanzas',path:'/finanzas',icon:ChartPie},
        {label:'Catálogo',path:'/catalogo',icon:Boxes},
        {label:'Configuración',path:'/configuracion',icon:Settings2}
      ]}
    ];
  return <>
    <button
      type="button"
      className={'nav-backdrop '+(mobileOpen?'is-visible':'')}
      aria-label="Cerrar navegación"
      aria-hidden={!mobileOpen}
      tabIndex={mobileOpen?0:-1}
      onClick={onClose}
    />
    <aside className={'sidebar sidebar-reference '+(mobileOpen?'is-open ':'')+(collapsed?'is-collapsed':'')}>
      <div className="sidebar-top"><Brand/><button type="button" className="sidebar-toggle" aria-label={collapsed?'Expandir menú lateral':'Contraer menú lateral'} title={collapsed?'Expandir menú':'Contraer menú'} onClick={onToggle}>{collapsed?<ChevronsRight size={17}/>:<ChevronsLeft size={17}/>}</button><button type="button" className="sidebar-close" aria-label="Cerrar menú" onClick={onClose}><X size={19}/></button></div>
      <div ref={navRef} className={'nav-scroll '+(activePosition?'has-active-indicator':'')}>
        <div
          className="nav-selection-indicator"
          aria-hidden="true"
          style={activePosition?{
            transform:'translate3d(0, '+activePosition.y+'px, 0)',
            height:activePosition.height
          }:undefined}
        />
        {groups.map(g=><div className="nav-group" key={g.caption} role="group" aria-label={g.caption}>
          <div className="nav-caption">{g.caption}</div>
          {g.links.map(n=>n.path==='/resultados'?<div className="ri-sidebar-results" key={n.path}>
            <div className="ri-sidebar-results-parent">
              <NavLink to="/resultados" end title="Resultados" aria-label="Abrir Resumen y mapa" onClick={()=>{setResultsExpanded(true);onClose()}}
                className={({isActive})=>'nav-link '+(isActive?'active':location.pathname.startsWith('/resultados')?'is-section-current':'')}>
                <n.icon size={18} strokeWidth={1.9}/><span>{n.label}</span>
              </NavLink>
              <button type="button" className="ri-sidebar-toggle" aria-label={resultsExpanded?'Contraer submenú de Resultados':'Expandir submenú de Resultados'}
                aria-expanded={resultsExpanded} aria-controls="ri-sidebar-reports"
                onClick={()=>setResultsExpanded(v=>!v)} title="Mostrar informes de Resultados"><ChevronDown size={15}/></button>
            </div>
            {resultsExpanded&&!collapsed&&<nav id="ri-sidebar-reports" className="ri-sidebar-subnav" aria-label="Informes de Resultados">
              {[
                ['','Resumen y mapa'],['activity','Evolución'],['products','Productos'],
                ['channels','Canales'],['zones','Zonas'],['quotes','Presupuestos'],
                ['orders','Pedidos'],['conversion','Conversión'],['sources','Web y SEO']
              ].map(([path,label])=><NavLink key={path} to={path?'/resultados/'+path:'/resultados'} end
                onClick={onClose} className={({isActive})=>'nav-link ri-sidebar-sublink'+(isActive?' active':'')}>
                <span>{label}</span>
              </NavLink>)}
            </nav>}
          </div>:<NavLink key={n.path} to={n.path} end={n.path==='/'} onClick={onClose} title={n.label} aria-label={n.label} className={({isActive})=>'nav-link '+(isActive?'active':'')}>
            <n.icon size={18} strokeWidth={1.9}/><span>{n.label}</span>
            {n.badge !== undefined && n.badge>0 && <span className="nav-count">{n.badge}</span>}
          </NavLink>)}
        </div>)}
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="status-light"/><div><strong>En desarrollo</strong><small>Datos locales · VPS pendiente</small></div></div>
        
      </div>
    </aside>
  </>;
}
function pageLabel(path: string) {
  if(path==='/') return 'Panel de trabajo';
  const dictionary: Record<string,string> = {'oportunidades':'Oportunidades','presupuestos':'Presupuestos','clientes':'Clientes','pedidos':'Pedidos','comisiones':'Mis comisiones','agenda':'Agenda y notas','resultados':'Resultados comerciales','finanzas':'Finanzas','catalogo':'Catálogo de productos','configuracion':'Configuración','fabrica':'Área de Fábrica'};
  return dictionary[path.split('/')[1]]||'Depofibra CRM';
}
function Header({ onMenu }: { onMenu: () => void }) {
  const {data,role,setRole}=useCrm();
  const location=useLocation();
  const navigate=useNavigate();
  const [q,setQ]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [noticeOpen,setNoticeOpen]=useState(false);
  const urgent=data.tasks.filter(t=>!t.done && t.due<=new Date().toISOString().slice(0,10)).length;
  const results=useMemo(()=>{
    const term=q.toLocaleLowerCase('es').trim();
    if(!term) return [];
    const matches=[
      ...data.opportunities.map(o=>({name:o.name,sub:o.product+' · '+o.id,to:'/oportunidades/'+o.id,type:'Oportunidad'})),
      ...data.orders.map(o=>({name:o.buyerName,sub:o.product+' · '+o.id,to:'/pedidos/'+o.id,type:'Pedido'})),
      ...data.customers.map(c=>({name:c.name,sub:c.destination+' · '+c.id,to:'/clientes/'+c.id,type:'Cliente'}))
    ];
    return matches.filter(x=>(x.name+' '+x.sub).toLocaleLowerCase('es').includes(term)).slice(0,7);
  },[q,data]);
  useEffect(()=>{setQ('');setSearchOpen(false);setNoticeOpen(false);},[location.pathname]);
  return <header className="topbar">
    <div className="topbar-start">
      <button className="icon-button menu-trigger" aria-label="Abrir menú" onClick={onMenu}><Menu size={21}/></button>
      <div className="breadcrumb">{location.pathname==='/' ? <strong className="vek-topbar-title">Dashboard</strong> : <><span>Depofibra CRM</span><span className="crumb-slash">/</span><strong>{pageLabel(location.pathname)}</strong></>}</div>
    </div>
    <div className="topbar-end">
      <div className="global-search">
        <Search size={17}/>
        <input aria-label="Buscar en el CRM" value={q} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQ(e.target.value);setSearchOpen(true)}} placeholder="Buscar clientes, pedidos, solicitudes..."/>
        <span className="search-key"><Command size={12}/> K</span>
        {searchOpen && q.trim() && <div className="search-dropdown">
          <div className="dropdown-title">Resultados de búsqueda</div>
          {results.length ? results.map(r=><button key={r.to} onClick={()=>{navigate(r.to);setSearchOpen(false);setQ('')}} className="search-result">
            <span className="search-result-icon"><Search size={15}/></span><span><b>{r.name}</b><small>{r.type} · {r.sub}</small></span><ArrowRight size={15}/>
          </button>) : <p className="dropdown-empty">No hay resultados.</p>}
        </div>}
      </div>
      <div className="notice-wrapper">
        <button onClick={()=>setNoticeOpen(o=>!o)} className="icon-button notification-button" aria-label="Notificaciones" aria-expanded={noticeOpen}><Bell size={19}/>{urgent>0&&<span className="notice-dot"/>}</button>
        {noticeOpen&&<div className="notice-panel">
          <div className="dropdown-title"><BellRing size={17}/> Avisos de trabajo</div>
          <p>Tienes <strong>{urgent}</strong> tareas vencidas o para hoy.</p>
          <button onClick={()=>{navigate('/agenda');setNoticeOpen(false)}} className="text-action">Abrir agenda <ArrowRight size={15}/></button>
        </div>}
      </div>
      <span className="topbar-divider"/>
      <div className="profile-menu"><span className={'avatar '+(role==='fabrica'?'avatar-factory':'')}>{role==='fabrica'?'F':'D'}</span><div className="profile-copy"><strong>{role==='fabrica'?'Oficina de Fábrica':'Dirección'}</strong><small>Vista en desarrollo</small></div><ChevronDown size={15}/>
        <select aria-label="Cambiar vista de perfil (simulada)" value={role} onChange={e=>{setRole(e.target.value as 'direccion'|'fabrica');navigate(e.target.value==='fabrica'?'/fabrica':'/')}}><option value="direccion">Dirección</option><option value="fabrica">Oficina de Fábrica</option></select>
      </div>
    </div>
  </header>;
}
function BottomBar() {
  const {role}=useCrm();
  const items=role==='fabrica'?[
    {to:'/fabrica',label:'Fábrica',icon:Factory},
    {to:'/pedidos',label:'Pedidos',icon:PackageCheck}
  ]:[
    {to:'/',label:'Inicio',icon:LayoutDashboard},
    {to:'/oportunidades',label:'Consultas',icon:Inbox},
    {to:'/presupuestos',label:'Precios',icon:FileText},
    {to:'/pedidos',label:'Pedidos',icon:PackageCheck},
    {to:'/agenda',label:'Agenda',icon:CalendarDays}
  ];
  return <nav className="bottom-bar">{items.map(x=><NavLink to={x.to} end={x.to==='/'} key={x.to} className={({isActive})=>isActive?'bottom-active':''}><x.icon size={20}/><span>{x.label}</span></NavLink>)}</nav>;
}
export default function App() {
  const [open,setOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const location=useLocation();
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.querySelector('.app-main')?.scrollTo({top:0,behavior:'instant'});},[location.pathname]);
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector<HTMLInputElement>('.global-search input')?.focus();}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[]);
  const onDashboard = location.pathname === '/';
  const onOpportunities = location.pathname === '/oportunidades';
  const onQuotesList = location.pathname === '/presupuestos';
  const onClientsList = location.pathname === '/clientes';
  const onOrdersList = location.pathname === '/pedidos';
  const onCommissionsList = location.pathname === '/comisiones';
  const onAgendaList = location.pathname === '/agenda';
  const onResultsList = location.pathname.startsWith('/resultados');
  const onFinance = location.pathname === '/finanzas';
  const onCatalog = location.pathname === '/catalogo';
  const onConfiguration = location.pathname === '/configuracion';
  const onFactory = location.pathname === '/fabrica';
  const isCompactList = onOpportunities || onQuotesList || onClientsList || onOrdersList || onCommissionsList || onAgendaList || onResultsList || onFinance || onCatalog || onConfiguration || onFactory;
  return <div className="app-root">
    <Sidebar mobileOpen={open} onClose={()=>setOpen(false)} collapsed={collapsed} onToggle={()=>setCollapsed(x=>!x)}/>
    <div className={'app-body' + (onDashboard ? ' is-dashboard' : '') + (isCompactList ? ' is-opportunities' : '') + (onQuotesList ? ' is-quotes' : '') + (onClientsList ? ' is-clients' : '') + (onOrdersList ? ' is-orders' : '') + (onCommissionsList ? ' is-commissions' : '') + (onAgendaList ? ' is-agenda' : '') + (onResultsList ? ' is-results' : '') + (onFinance ? ' is-finance' : '') + (onCatalog ? ' is-catalog' : '') + (onConfiguration ? ' is-configuration' : '') + (onFactory ? ' is-factory' : '')}>
      {!onDashboard && !isCompactList && <Header onMenu={()=>setOpen(true)}/>}
      {(onDashboard || isCompactList) && <button type="button" className="dashboard-mobile-menu" aria-label="Abrir menú lateral" onClick={()=>setOpen(true)}><Menu size={21}/></button>}
      <main className="app-main" id="main-content"><AppRoutes/></main>
    </div>
    <BottomBar/>
    <div className="help-chip" title="Interfaz en desarrollo · conexión al VPS pendiente"><HelpCircle size={16}/></div>
  </div>;
}
