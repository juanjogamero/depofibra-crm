import { Navigate, Route, Routes } from 'react-router-dom';
import { useCrm } from './store';
import Dashboard from './pages/Dashboard';
import { Opportunities, OpportunityNew, OpportunityDetail, Quotes, QuoteNew, QuoteDetail } from './pages/Sales';
import { Clients, ClientDetail, Orders, OrderDetail, Commissions, FactoryHome } from './pages/Operations';
import { Agenda, Results, Finance, Catalog, Configuration, TransportCalculator } from './pages/Management';

export function AppRoutes() {
  const {role}=useCrm();
  if(role==='fabrica')return <Routes>
    <Route path="/fabrica" element={<FactoryHome/>}/>
    <Route path="/pedidos" element={<Orders/>}/>
    <Route path="/pedidos/:id" element={<OrderDetail/>}/>
    <Route path="/configuracion/*" element={<Configuration/>}/>
    <Route path="*" element={<Navigate replace to="/fabrica"/>}/>
  </Routes>;
  return <Routes>
    <Route path="/" element={<Dashboard/>}/>
    <Route path="/oportunidades" element={<Opportunities/>}/>
    <Route path="/oportunidades/nueva" element={<OpportunityNew/>}/>
    <Route path="/oportunidades/:id" element={<OpportunityDetail/>}/>
    <Route path="/presupuestos" element={<Quotes/>}/>
    <Route path="/presupuestos/nuevo" element={<QuoteNew/>}/>
    <Route path="/presupuestos/:id" element={<QuoteDetail/>}/>
    <Route path="/clientes" element={<Clients/>}/>
    <Route path="/clientes/:id" element={<ClientDetail/>}/>
    <Route path="/pedidos" element={<Orders/>}/>
    <Route path="/pedidos/:id" element={<OrderDetail/>}/>
    <Route path="/comisiones" element={<Commissions/>}/>
    <Route path="/agenda" element={<Agenda/>}/>
    <Route path="/resultados/*" element={<Results/>}/>
    <Route path="/finanzas" element={<Finance/>}/>
    <Route path="/catalogo" element={<Catalog/>}/>
    <Route path="/transporte" element={<TransportCalculator/>}/>
    <Route path="/configuracion/*" element={<Configuration/>}/>
    <Route path="*" element={<Navigate replace to="/"/>}/>
  </Routes>;
}
