import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, FileText, UsersRound, PackageCheck, Wallet,
  CalendarDays, BarChart3, ChartPie, Boxes, Settings2, Truck, Search, Bell,
  ChevronDown, Menu, X, ArrowRight, Plus, Factory,
  Command, HelpCircle, CheckCheck, BellRing, ChevronsLeft, ChevronsRight,
  UserRound, LogOut, ShieldCheck
} from 'lucide-react';
import { useCrm } from './store';
import { AppRoutes } from './views';

type IconType = typeof LayoutDashboard;
type NavItem = { label: string; path: string; icon: IconType; badge?: number };
type Group = { caption: string; links: NavItem[] };

type SidebarProfile = { displayName: string; photo: string };
const PROFILE_UPDATE_EVENT = 'depofibra-crm-profile-updated';
const PREVIEW_EXIT_KEY = 'depofibra-crm-preview-closed-v1';
function sidebarProfile(role: 'direccion' | 'fabrica'): SidebarProfile {
  const fallback = role === 'direccion' ? 'Dirección' : 'Oficina de Fábrica';
  try {
    const value = JSON.parse(localStorage.getItem('depofibra-crm-profile-demo-v1-' + role) || 'null');
    return {
      displayName: typeof value?.displayName === 'string' && value.displayName.trim() ? value.displayName.trim() : fallback,
      photo: typeof value?.photo === 'string' && value.photo.startsWith('data:image/') ? value.photo : ''
    };
  } catch { return { displayName: fallback, photo: '' }; }
}

function Brand() {
  return <NavLink className="brand" to="/" aria-label="Depofibra CRM — Ir al inicio">
    <img className="brand-logo" src="https://depofibra.com/images/depofibra_brand_assets/depofibra-logo-horizontal.png?v=20261113" srcSet="https://depofibra.com/images/depofibra_brand_assets/depofibra-logo-horizontal@2x.png?v=20261113 2x" width={512} height={84} alt="Depofibra" decoding="async" />
    <img className="brand-compact-logo" src="https://depofibra.com/images/depofibra_brand_assets/favicon-depofibra-humo-v6-192.png" alt="" width={36} height={36} decoding="async" />
  </NavLink>;
}
function Sidebar({ mobileOpen, onClose, collapsed, onToggle, onSignOut }: { mobileOpen: boolean; onClose: () => void; collapsed: boolean; onToggle: () => void; onSignOut: () => void }) {
  const { role, data } = useCrm();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [activePosition, setActivePosition] = useState<{ y: number; height: number; x: number; width: number; nested: boolean } | null>(null);
  const [resultsExpanded,setResultsExpanded] = useState(location.pathname.startsWith('/resultados'));
  const [accountOpen,setAccountOpen] = useState(false);
  const [profile,setProfile] = useState<SidebarProfile>(()=>sidebarProfile(role));
  const lastPath=useRef(location.pathname);
  useEffect(()=>{
    const isResults=location.pathname.startsWith('/resultados');
    const wasResults=lastPath.current.startsWith('/resultados');
    if(!isResults)setResultsExpanded(false);
    else if(!wasResults)setResultsExpanded(true);
    lastPath.current=location.pathname;
  },[location.pathname]);
  useEffect(()=>{
    if(!resultsExpanded)return;
    const closeOnOutside=(event:PointerEvent)=>{
      const menu=document.querySelector('.ri-sidebar-results');
      if(event.target instanceof Node && menu&&!menu.contains(event.target))setResultsExpanded(false);
    };
    document.addEventListener('pointerdown',closeOnOutside);
    return ()=>document.removeEventListener('pointerdown',closeOnOutside);
  },[resultsExpanded]);
  useEffect(()=>{
    const update=()=>setProfile(sidebarProfile(role));
    update();
    window.addEventListener(PROFILE_UPDATE_EVENT,update);
    window.addEventListener('storage',update);
    return ()=>{window.removeEventListener(PROFILE_UPDATE_EVENT,update);window.removeEventListener('storage',update)};
  },[role]);
  useEffect(()=>setAccountOpen(false),[location.pathname]);

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
        x: Math.round(linkRect.left - containerRect.left + container.scrollLeft),
        width: Math.round(linkRect.width),
        nested: activeLink.classList.contains('ri-sidebar-sublink'),
      };
      setActivePosition(previous =>
        previous?.y === next.y && previous.height === next.height && previous.x === next.x && previous.width === next.width && previous.nested === next.nested ? previous : next
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
        {label:'Calculadora de transporte',path:'/transporte',icon:Truck}
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
      <div ref={navRef} className={'nav-scroll '+(activePosition?'has-active-indicator':'')+(activePosition?.nested?' has-nested-active':'')}>
        <div
          className="nav-selection-indicator"
          aria-hidden="true"
          style={activePosition?{
            transform:'translate3d(0, '+activePosition.y+'px, 0)',
            height:activePosition.height,
            left:activePosition.x,
            width:activePosition.width
          }:undefined}
        />
        {groups.map(g=><div className="nav-group" key={g.caption} role="group" aria-label={g.caption}>
          <div className="nav-caption">{g.caption}</div>
          {g.links.map(n=>n.path==='/resultados'?<div className="ri-sidebar-results" key={n.path}>
            <div className="ri-sidebar-results-parent">
              <NavLink to="/resultados" end title="Resultados" aria-label="Abrir Resumen y mapa" onClick={()=>{setResultsExpanded(true);onClose()}}
                className={({isActive})=>'nav-link '+((collapsed&&location.pathname.startsWith('/resultados'))?'active':location.pathname.startsWith('/resultados')?'is-section-current':'')}>
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
      <div className="sidebar-bottom sidebar-account-bottom">
        {accountOpen&&<nav id="sidebar-account-menu" className="sidebar-account-menu" aria-label="Opciones de la cuenta">
          <NavLink to="/configuracion/perfil" onClick={()=>{setAccountOpen(false);onClose()}}><UserRound size={17}/> Mi perfil</NavLink>
          <NavLink to="/configuracion/seguridad" onClick={()=>{setAccountOpen(false);onClose()}}><ShieldCheck size={17}/> Acceso y seguridad</NavLink>
          <NavLink to="/configuracion/perfil" onClick={()=>{setAccountOpen(false);onClose()}}><Settings2 size={17}/> Configuración</NavLink>
        </nav>}
        <div className="sidebar-account-row">
          <button type="button" className="sidebar-account-trigger" title="Abrir opciones de cuenta"
            aria-label="Abrir opciones de cuenta" aria-expanded={accountOpen}
            aria-controls="sidebar-account-menu" onClick={()=>setAccountOpen(v=>!v)}>
            <span className="sidebar-account-avatar" aria-hidden="true">
              {profile.photo?<img src={profile.photo} alt=""/>:<UserRound size={21}/>}</span>
            <span className="sidebar-account-name"><strong>{profile.displayName}</strong>
              <small>{role==='direccion'?'Administrador':'Colaborador'}</small></span>
            <ChevronDown size={17} className={'sidebar-account-arrow'+(accountOpen?' is-open':'')}/>
          </button>
          <button type="button" className="sidebar-signout" title="Cerrar sesión" aria-label="Cerrar sesión"
            onClick={onSignOut}><LogOut size={19}/></button>
        </div>
      </div>
    </aside>
  </>;
}
function pageLabel(path: string) {
  if(path==='/') return 'Panel de trabajo';
  const dictionary: Record<string,string> = {'oportunidades':'Oportunidades','presupuestos':'Presupuestos','clientes':'Clientes','pedidos':'Pedidos','comisiones':'Mis comisiones','agenda':'Agenda y notas','resultados':'Resultados comerciales','finanzas':'Finanzas','catalogo':'Catálogo de productos','configuracion':'Cuenta y configuración','transporte':'Calculadora de transporte','fabrica':'Área de Fábrica'};
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
      <div className="profile-menu"><span className={'avatar '+(role==='fabrica'?'avatar-factory':'')}>{role==='fabrica'?'F':'D'}</span><div className="profile-copy"><strong>{role==='fabrica'?'Oficina de Fábrica':'Dirección'}</strong><small>Panel de trabajo</small></div><ChevronDown size={15}/>
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
  const [viewExited,setViewExited]=useState(()=>{try{return sessionStorage.getItem(PREVIEW_EXIT_KEY)==='1'}catch{return false}});
  const signOut=()=>{
    // No existen sesiones autenticadas en esta versión. No afirmar su revocación.
    if(!window.confirm('¿Salir de esta vista del CRM? No hay todavía inicio de sesión real; esta acción solo cierra la vista en este navegador, sin borrar tus datos.'))return;
    try{sessionStorage.setItem(PREVIEW_EXIT_KEY,'1')}catch{/* Almacenamiento de sesión no disponible */}
    setOpen(false);setViewExited(true);
  };
  const returnToCrm=()=>{
    try{sessionStorage.removeItem(PREVIEW_EXIT_KEY)}catch{/* Almacenamiento de sesión no disponible */}
    setViewExited(false);
  };
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
  const onConfiguration = location.pathname.startsWith('/configuracion');
  const onTransport = location.pathname === '/transporte';
  const onFactory = location.pathname === '/fabrica';
  const isCompactList = onOpportunities || onQuotesList || onClientsList || onOrdersList || onCommissionsList || onAgendaList || onResultsList || onFinance || onCatalog || onConfiguration || onTransport || onFactory;
  if(viewExited)return <div className="crm-exit-screen"><main className="crm-exit-card">
    <img className="crm-exit-brand" src="https://depofibra.com/images/depofibra_brand_assets/depofibra-logo-horizontal.png?v=20261113" alt="Depofibra"/>
    <h1>Has salido de esta vista</h1>
    <p>El CRM está oculto en esta pestaña. El cierre seguro de sesiones estará disponible cuando se active el acceso con usuarios y contraseñas.</p>
    <button type="button" onClick={returnToCrm}>Volver al CRM</button>
  </main></div>;
  return <div className="app-root">
    <Sidebar mobileOpen={open} onClose={()=>setOpen(false)} collapsed={collapsed} onToggle={()=>setCollapsed(x=>!x)} onSignOut={signOut}/>
    <div className={'app-body' + (onDashboard ? ' is-dashboard' : '') + (isCompactList ? ' is-opportunities' : '') + (onQuotesList ? ' is-quotes' : '') + (onClientsList ? ' is-clients' : '') + (onOrdersList ? ' is-orders' : '') + (onCommissionsList ? ' is-commissions' : '') + (onAgendaList ? ' is-agenda' : '') + (onResultsList ? ' is-results' : '') + (onFinance ? ' is-finance' : '') + (onCatalog ? ' is-catalog' : '') + (onConfiguration ? ' is-configuration' : '') + (onTransport ? ' is-transport' : '') + (onFactory ? ' is-factory' : '')}>
      {!onDashboard && !isCompactList && <Header onMenu={()=>setOpen(true)}/>}
      {(onDashboard || isCompactList) && <button type="button" className="dashboard-mobile-menu" aria-label="Abrir menú lateral" onClick={()=>setOpen(true)}><Menu size={21}/></button>}
      <main className="app-main" id="main-content"><AppRoutes/></main>
    </div>
    <BottomBar/>
    <div className="help-chip" title="Ayuda de la plataforma · Conexiones de servidor pendientes"><HelpCircle size={16}/></div>
  </div>;
}
