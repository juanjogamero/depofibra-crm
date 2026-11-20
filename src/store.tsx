import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type CrmState, type Opportunity, type Quote, type Order, type Task, type Product, type TransportSettings, mockData, today, uid } from './domain';

type Role = 'direccion' | 'fabrica';
type ContextValue = {
  data: CrmState;
  role: Role; setRole: (role: Role) => void;
  addOpportunity: (item: Omit<Opportunity, 'id' | 'createdAt' | 'activity'>) => void;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  addActivity: (id: string, text: string) => void;
  addQuote: (item: Omit<Quote, 'id' | 'createdAt'>) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  acceptQuote: (id: string) => void;
  verifyPayment: (id: string, mode: Order['paymentMode'], amount: number) => void;
  updateOrder: (id: string, patch: Partial<Order>, eventText?: string) => void;
  addCommissionPayment: (id: string, amount: number) => void;
  addTask: (title: string, due: string, context: string) => void;
  toggleTask: (id: string) => void;
  addProduct: (item: Omit<Product, 'id'>) => void;
  updateTransport: (p: Partial<TransportSettings>) => void;
  addDocumentName: (customerId: string, name: string) => void;
  resetDemo: () => void;
};

const STORAGE_KEY = 'depofibra-crm-demo-v1';
function initialData(): CrmState {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) {
      const parsed = JSON.parse(json) as CrmState;
      if (Array.isArray(parsed.opportunities) && Array.isArray(parsed.orders) && parsed.transport) return parsed;
    }
  } catch { /* demo storage unavailable */ }
  return mockData;
}
const Ctx = createContext<ContextValue | null>(null);
export function CrmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CrmState>(initialData);
  const [role, setRole] = useState<Role>('direccion');
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* private browser */ } }, [data]);
  const actions = useMemo(() => ({
    addOpportunity: (item: Omit<Opportunity, 'id' | 'createdAt' | 'activity'>) => setData(d => ({
      ...d, opportunities: [{ ...item, id: uid('OP'), createdAt: today(), activity: [{ at: today(), text: 'Solicitud introducida manualmente (demo)', by: 'Dirección' }] }, ...d.opportunities]
    })),
    updateOpportunity: (id: string, patch: Partial<Opportunity>) => setData(d => ({ ...d, opportunities: d.opportunities.map(o => o.id === id ? { ...o, ...patch } : o) })),
    addActivity: (id: string, text: string) => setData(d => ({ ...d, opportunities: d.opportunities.map(o => o.id === id ? { ...o, activity: [{ at: today(), text, by: 'Dirección' }, ...o.activity] } : o) })),
    addQuote: (item: Omit<Quote, 'id' | 'createdAt'>) => setData(d => ({
      ...d,
      quotes: [{ ...item, id: uid('PRE'), createdAt: today() }, ...d.quotes],
      opportunities: d.opportunities.map(o => o.id === item.opportunityId ? { ...o, status: item.status === 'Enviado' ? 'Presupuesto enviado' : 'Por presupuestar', activity: [{ at: today(), text: 'Presupuesto preparado (demo)', by: 'Dirección' }, ...o.activity] } : o)
    })),
    updateQuote: (id: string, patch: Partial<Quote>) => setData(d => ({
      ...d, quotes: d.quotes.map(q => q.id === id ? { ...q, ...patch } : q),
      opportunities: d.opportunities.map(o => d.quotes.some(q => q.id === id && q.opportunityId === o.id) && patch.status === 'Enviado' ? { ...o, status: 'Presupuesto enviado' } : o)
    })),
    acceptQuote: (id: string) => setData(d => {
      const q = d.quotes.find(x => x.id === id);
      if (!q || d.orders.some(o => o.quoteId === id)) return d;
      const lead = d.opportunities.find(x => x.id === q.opportunityId);
      const order: Order = {
        id: uid('PED'), quoteId: id, buyerName: q.name, product: q.product,
        capacity: lead?.capacity ?? 'Por confirmar', amount: q.amount, commission: q.commission, commissionPaid: 0,
        advanceReceived: 0, paymentMode: 'Pendiente', factory: 'Pendiente', createdAt: today(),
        deliveryDate: '', notes: 'Esperando ingreso verificado y documentación de la oficina.', color: 'Por confirmar',
        connections: 'Fábrica confirmará con el comprador',
        activity: [{ at: today(), by: 'Dirección', text: 'Presupuesto aceptado. Pendiente formalización y anticipo.' }]
      };
      return { ...d,
        orders: [order, ...d.orders],
        quotes: d.quotes.map(x => x.id === id ? { ...x, status: 'Aceptado' } : x),
        opportunities: d.opportunities.map(o => o.id === q.opportunityId ? { ...o, status: 'Aceptada', activity: [{ at: today(), by: 'Dirección', text: 'Presupuesto aceptado, pendiente de ingreso.' }, ...o.activity] } : o)
      };
    }),
    verifyPayment: (id: string, mode: Order['paymentMode'], amount: number) => setData(d => {
      const order = d.orders.find(o => o.id === id);
      if (!order || mode === 'Pendiente') return d;
      const customerId = order.customerId || uid('CLI');
      const alreadyCustomer = d.customers.some(c => c.id === customerId);
      const newCustomer = { id: customerId, name: order.buyerName, contact: 'Por completar', destination: d.opportunities.find(o => o.id === d.quotes.find(q => q.id === order.quoteId)?.opportunityId)?.destination ?? 'Pendiente', createdAt: today(), notes: '', documentNames: [] as string[] };
      return { ...d, customers: alreadyCustomer ? d.customers : [newCustomer, ...d.customers],
        orders: d.orders.map(o => o.id === id ? { ...o, customerId, paymentMode: mode, advanceReceived: Math.max(0, amount), activity: [{ at: today(), text: mode + ' (registro de demostración)', by: 'Dirección' }, ...o.activity] } : o) };
    }),
    updateOrder: (id: string, patch: Partial<Order>, eventText?: string) => setData(d => ({ ...d, orders: d.orders.map(o => o.id === id ? { ...o, ...patch, activity: eventText ? [{ at: today(), text: eventText, by: 'Fábrica' }, ...o.activity] : o.activity } : o) })),
    addCommissionPayment: (id: string, amount: number) => setData(d => ({ ...d, orders: d.orders.map(o => o.id === id ? { ...o, commissionPaid: Math.min(o.commission, o.commissionPaid + Math.max(0, amount)), activity: [{ at: today(), text: 'Pago de comisión registrado: ' + amount.toFixed(2) + ' € (demo)', by: 'Dirección' }, ...o.activity] } : o) })),
    addTask: (title: string, due: string, context: string) => setData(d => ({ ...d, tasks: [{ id: uid('TA'), title, due, context, done: false }, ...d.tasks] })),
    toggleTask: (id: string) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),
    addProduct: (item: Omit<Product, 'id'>) => setData(d => ({ ...d, products: [{ ...item, id: uid('PR') }, ...d.products] })),
    updateTransport: (p: Partial<TransportSettings>) => setData(d => ({ ...d, transport: { ...d.transport, ...p } })),
    addDocumentName: (customerId: string, name: string) => setData(d => ({ ...d, customers: d.customers.map(c => c.id === customerId ? { ...c, documentNames: [...c.documentNames, name] } : c) })),
    resetDemo: () => setData(structuredClone(mockData)),
  }), []);
  return <Ctx.Provider value={{ data, role, setRole, ...actions }}>{children}</Ctx.Provider>;
}
export function useCrm(): ContextValue { const value = useContext(Ctx); if (!value) throw new Error('CrmProvider requerido'); return value; }
