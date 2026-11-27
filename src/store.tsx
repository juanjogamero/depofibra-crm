import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ApiError } from '../secure/api';
import { emptyRealState, loadRealWorkspace, saveRealWorkspace, type RealIdentity } from './real-workspace';
import { type CrmState, type Opportunity, type Quote, type Order, type Task, type Product, type ProductCategory, type TransportSettings, type InternalNote, quoteItemsSubtotal, roundEuros, validQuoteLines, validInitialPayment, commissionOutstanding, mockData, today, uid } from './domain';

type Role = 'direccion' | 'fabrica';
type ContextValue = {
  data: CrmState;
  storageError:string;
  savePending:boolean;
  role: Role; setRole: (role: Role) => void;
  addOpportunity: (item: Omit<Opportunity, 'id' | 'createdAt' | 'activity'>) => void;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  restoreOpportunity: (id: string) => void;
  addActivity: (id: string, text: string) => void;
  addQuote: (item: Omit<Quote, 'id' | 'createdAt'>) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  archiveQuote: (id:string) => void;
  restoreQuote: (id:string) => void;
  acceptQuote: (id: string) => void;
  verifyPayment: (id: string, mode: Order['paymentMode'], amount: number, by?:'Dirección'|'Oficina') => void;
  markOrderAlertRead: (id:string) => void;
  updateOrder: (id: string, patch: Partial<Order>, eventText?: string) => void;
  addCommissionPayment: (id: string, amount: number) => void;
  addTask: (title: string, due: string, context: string, schedule?: { atTime?: string; reminderMinutes?: number | null }) => void;
  toggleTask: (id: string) => void;
  addInternalNote: (item: Pick<InternalNote, 'title'|'body'|'category'>) => void;
  updateInternalNote: (id:string, patch:Partial<Pick<InternalNote,'title'|'body'|'category'|'pinned'>>) => void;
  deleteInternalNote: (id:string) => void;
  addProduct: (item: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, patch: Partial<Omit<Product, 'id'>>) => void;
  addProductCategory: (category: ProductCategory) => void;
  updateProductCategory: (id: string, patch: Partial<Omit<ProductCategory, 'id'>>) => void;
  updateTransport: (p: Partial<TransportSettings>) => void;
  addDocumentName: (customerId: string, name: string) => void;
  resetDemo: () => void;
};

const STORAGE_KEY = 'depofibra-crm-demo-v1';
export const QUOTE_ARCHIVE_DAYS=20;
const addDays=(iso:string,days:number)=>{
  const d=new Date(iso.slice(0,10)+'T12:00:00');
  if(Number.isNaN(d.getTime()))return '';
  d.setDate(d.getDate()+days);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
/** Solo al abrir/refrescar el CRM; GitHub Pages no ejecuta tareas en un servidor.
 * Se excluyen borradores, aceptados y cualquier presupuesto relacionado con pedido. */
export function archiveExpiredQuotes(source:CrmState,current=today()):CrmState {
  let modified=false;
  const quotes=source.quotes.map(q=>{
    if(q.archivedAt||q.status==='Aceptado'||q.status==='Borrador'
        ||source.orders.some(o=>o.quoteId===q.id))return q;
    const expires=q.retainedUntil||addDays(q.createdAt,QUOTE_ARCHIVE_DAYS);
    if(!expires||expires>current)return q;
    modified=true;
    return {...q,archivedAt:current};
  });
  return modified?{...source,quotes}:source;
}
/** On loading a legacy local demo, group existing references by family + name.
 * No prices, attributes, customers, quotes or orders are invented or overwritten. */
function normalizeCatalog(source: CrmState): CrmState {
  const categories:ProductCategory[] = Array.isArray(source.productCategories)
    ? source.productCategories.filter(c=>Boolean(c&&c.id&&c.name)).map(c=>({...c,attributes:Array.isArray(c.attributes)?c.attributes:[]}))
    : [];
  const byId=new Set(categories.map(c=>c.id));
  const byLegacyKey=new Map<string,string>();
  const key=(family:string,name:string)=>family.trim().toLocaleLowerCase('es-ES')+'|'+name.trim().toLocaleLowerCase('es-ES');
  for(const p of source.products||[]){
    if(p.categoryId&&byId.has(p.categoryId))byLegacyKey.set(key(p.family,p.name),p.categoryId);
  }
  const products=(source.products||[]).map(p=>{
    if(p.categoryId&&byId.has(p.categoryId))return p;
    const legacy=key(p.family,p.name);
    let id=byLegacyKey.get(legacy);
    if(!id){
      id=uid('CAT');
      const name=p.name.trim()==='Depósito vertical base plana'
        ? 'Depósitos de poliéster verticales de base plana'
        : p.name.trim()||'Categoría sin nombre';
      categories.push({id,name,family:p.family,attributes:[]});
      byLegacyKey.set(legacy,id);
      byId.add(id);
    }
    return {...p,categoryId:id};
  });
  return {...source,products,productCategories:categories,
    quotes:Array.isArray(source.quotes)?source.quotes:[],
    customers:Array.isArray(source.customers)?source.customers.map(customer=>({
      ...customer,documentNames:Array.isArray(customer.documentNames)?customer.documentNames:[]
    })):[],
    orders:Array.isArray(source.orders)?source.orders:[],
    tasks:Array.isArray(source.tasks)?source.tasks:[],
    opportunities:(source.opportunities||[]).map(o=>o.status==='Perdida'&&!o.deletedAt?{...o,deletedAt:today()}:o),
    internalNotes:Array.isArray(source.internalNotes)?source.internalNotes:[],
    orderAlerts:Array.isArray(source.orderAlerts)?source.orderAlerts:[]};
}
function initialData(): CrmState {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) {
      const parsed = JSON.parse(json) as CrmState;
      if (Array.isArray(parsed.opportunities) && Array.isArray(parsed.orders)
          && Array.isArray(parsed.products) && parsed.transport) return archiveExpiredQuotes(normalizeCatalog(parsed));
    }
  } catch { /* demo storage unavailable */ }
  return archiveExpiredQuotes(normalizeCatalog(mockData));
}
const Ctx = createContext<ContextValue | null>(null);
const localReadFailure=():string=>{
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return '';
    const value=JSON.parse(raw);
    if(Array.isArray(value.opportunities)&&Array.isArray(value.orders)
        &&Array.isArray(value.products)&&value.transport)return '';
    return 'El archivo local del CRM no tiene una estructura reconocible. NO se sobrescribirán sus datos.';
  }catch{
    return 'No se ha podido leer el almacenamiento local. NO se sobrescribirán los datos existentes.';
  }
};
export function CrmProvider({ children, realIdentity }: {
  children: ReactNode; realIdentity?: RealIdentity;
}) {
  const [readError,setReadError]=useState(() => realIdentity ? '' : localReadFailure());
  const [storageError,setStorageError]=useState(readError);
  const [data,setDataState] = useState<CrmState>(() => realIdentity ? emptyRealState() : initialData());
  const [role,setRoleState] = useState<Role>('direccion');
  const [hydrated,setHydrated] = useState(!realIdentity);
  const [loadError,setLoadError] = useState('');
  const [savePending,setSavePending] = useState(false);
  const versionRef = useRef(0);
  const savedRef = useRef<CrmState | null>(null);
  const lastQueuedRef = useRef<CrmState | null>(null);
  const pendingRef = useRef(0);
  const blockedRef = useRef(false);
  const hydratedRef = useRef(!realIdentity);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const setRole = (next: Role) => {
    // Solo el servidor controla los roles del CRM real.
    if (!realIdentity) setRoleState(next);
  };
  const setData: Dispatch<SetStateAction<CrmState>> = update => {
    if (realIdentity && (!hydratedRef.current || blockedRef.current)) {
      setStorageError('Sincronización bloqueada. Recarga la página después de revisar el error; no introduzcas más datos.');
      return;
    }
    setDataState(update);
  };

  useEffect(() => {
    if (!realIdentity) return;
    let active = true;
    loadRealWorkspace().then(({version,state}) => {
      if (!active) return;
      versionRef.current = version;
      savedRef.current = state;
      lastQueuedRef.current = state;
      hydratedRef.current = true;
      setDataState(state);
      setHydrated(true);
    }).catch(() => {
      if (active) setLoadError('No se ha podido cargar el CRM real desde PostgreSQL. No se han cargado datos ficticios.');
    });
    return () => { active = false; };
  }, [realIdentity?.username]);

  useEffect(() => {
    if (!realIdentity || !hydrated || data === lastQueuedRef.current) return;
    const snapshot = data;
    lastQueuedRef.current = snapshot;
    pendingRef.current++;
    setSavePending(true);
    queueRef.current = queueRef.current.then(async () => {
      if (blockedRef.current) {
        pendingRef.current--;
        if (pendingRef.current === 0) setSavePending(false);
        return;
      }
      try {
        versionRef.current = await saveRealWorkspace(versionRef.current, snapshot);
        savedRef.current = snapshot;
        setStorageError('');
      } catch (error) {
        blockedRef.current = true;
        setStorageError(error instanceof ApiError && error.status === 409
          ? 'Conflicto entre sesiones: no se ha sobrescrito el servidor. Detén el trabajo y revisa los cambios antes de recargar.'
          : 'No se ha guardado el último cambio en PostgreSQL. Detén el trabajo: revisa la conexión y contacta con soporte.');
      } finally {
        pendingRef.current--;
        if (pendingRef.current === 0) setSavePending(false);
      }
    });
  }, [data,hydrated,realIdentity?.username]);

  useEffect(() => {
    if (!realIdentity) return;
    const guard = (event: BeforeUnloadEvent) => {
      if (pendingRef.current > 0 || blockedRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload',guard);
    return () => window.removeEventListener('beforeunload',guard);
  }, [realIdentity?.username]);

  useEffect(() => {
    if (realIdentity || readError) return; // La producción nunca escribe en localStorage.
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));setStorageError('');}
    catch{setStorageError('No se han podido guardar los cambios en este navegador. Exporta lo que puedas y revisa el almacenamiento antes de seguir.');}
  }, [data,readError]);
  useEffect(()=>{
    if (realIdentity) return; // El archivado automático demo no altera la BD real.
    const review=()=>setData(old=>archiveExpiredQuotes(old));
    const timer=window.setInterval(review,3600000);
    window.addEventListener('focus',review);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',review)};
  },[]);
  const actions = useMemo(() => ({
    addOpportunity: (item: Omit<Opportunity, 'id' | 'createdAt' | 'activity'>) => setData(d => ({
      ...d, opportunities: [{ ...item, deletedAt:item.status==='Perdida'?today():item.deletedAt, id: uid('OP'), createdAt: today(), receivedAt: new Date().toISOString(), activity: [{ at: today(), text: 'Solicitud introducida manualmente', by: 'Dirección' }] }, ...d.opportunities]
    })),
    updateOpportunity: (id: string, patch: Partial<Opportunity>) => setData(d => ({
      ...d, opportunities: d.opportunities.map(o => {
        if(o.id!==id)return o;
        const status=patch.status??o.status;
        if(status==='Perdida'&&!o.deletedAt)
          return {...o,...patch,deletedAt:today(),nextAction:'Sin acción',
            activity:[{at:today(),text:'Oportunidad perdida y trasladada a papelera',by:'Dirección'},...o.activity]};
        return {...o,...patch};
      })
    })),
    deleteOpportunity: (id:string) => setData(d=>({...d,opportunities:d.opportunities.map(o=>o.id===id?{
      ...o,deletedAt:today(),activity:[{at:today(),text:'Oportunidad archivada por Dirección',by:'Dirección'},...o.activity]
    }:o)})),
    restoreOpportunity: (id:string) => setData(d=>({...d,opportunities:d.opportunities.map(o=>o.id===id?{
      ...o,deletedAt:undefined,status:o.status==='Perdida'?'Seguimiento':o.status,
      nextAction:o.status==='Perdida'?'Retomar contacto':o.nextAction,
      activity:[{at:today(),text:'Oportunidad recuperada para seguimiento',by:'Dirección'},...o.activity]
    }:o)})),
    addActivity: (id: string, text: string) => setData(d => ({ ...d, opportunities: d.opportunities.map(o => o.id === id ? { ...o, activity: [{ at: today(), text, by: 'Dirección' }, ...o.activity] } : o) })),
    addQuote: (item: Omit<Quote, 'id' | 'createdAt'>) => setData(d => {
      const items=item.items;
      const itemValid=Boolean(items&&validQuoteLines(items));
      const total=itemValid?quoteItemsSubtotal(items!):item.amount;
      if(!d.opportunities.some(o=>o.id===item.opportunityId&&!o.deletedAt)
        ||!Number.isFinite(total)||total<=0||!Number.isFinite(item.commission)||item.commission<0
        ||!Number.isFinite(item.transport)||item.transport<0
        ||(items!==undefined&&!itemValid))return d;
      return {...d,
        quotes:[{...item,amount:roundEuros(total),id:uid('PRE'),createdAt:today()},...d.quotes],
        opportunities:d.opportunities.map(o=>o.id===item.opportunityId?{
          ...o,status:item.status==='Enviado'?'Presupuesto enviado':'Por presupuestar',
          activity:[{at:today(),text:'Presupuesto preparado con importes sin IVA',by:'Dirección'},...o.activity]
        }:o)
      };
    }),
    archiveQuote: (id:string) => setData(d=>({...d,quotes:d.quotes.map(q=>q.id===id&&q.status!=='Aceptado'&&!d.orders.some(o=>o.quoteId===q.id)?{...q,archivedAt:today()}:q)})),
    restoreQuote: (id:string) => setData(d=>({...d,quotes:d.quotes.map(q=>q.id===id?{...q,archivedAt:undefined,retainedUntil:addDays(today(),QUOTE_ARCHIVE_DAYS)}:q)})),
    updateQuote: (id: string, patch: Partial<Quote>) => setData(d => ({
      ...d, quotes: d.quotes.map(q => q.id === id ? { ...q, ...patch } : q),
      opportunities: d.opportunities.map(o => d.quotes.some(q => q.id === id && q.opportunityId === o.id) && patch.status === 'Enviado' ? { ...o, status: 'Presupuesto enviado' } : o)
    })),
    acceptQuote: (id: string) => setData(d => {
      const q = d.quotes.find(x => x.id === id);
      if (!q || q.archivedAt || d.orders.some(o => o.quoteId === id)) return d;
      const lead = d.opportunities.find(x => x.id === q.opportunityId);
      const customerId=uid('CLI');
      const customer={
        id:customerId,name:lead?.name||q.name,contact:lead?.contact||'Por completar',
        destination:lead?.destination||'Pendiente',createdAt:today(),
        notes:'Cliente generado tras confirmar expresamente la aceptación del presupuesto '+q.id+'. Pago pendiente de comprobar.',
        documentNames:[] as string[]
      };
      const order: Order = {
        id: uid('PED'), quoteId: id, customerId, buyerName: q.name, product: q.product,
        capacity:q.items?.filter(x=>x.kind==='product').length&&q.items.filter(x=>x.kind==='product').length>1
          ?'Varios productos':lead?.capacity??'Por confirmar',
        items:q.items?.map(x=>({...x})),
        amount: q.amount, commission: q.commission, commissionPaid: 0,
        advanceReceived: 0, paymentMode: 'Pendiente', factory: 'Pendiente', createdAt: today(),
        deliveryDate: '', notes: 'Esperando ingreso verificado y documentación de la oficina.', color: 'Por confirmar',
        connections: 'Fábrica confirmará con el comprador',
        activity: [{ at: today(), by: 'Dirección', text: 'Presupuesto aceptado. Pendiente formalización y anticipo.' }]
      };
      return { ...d,
        orders: [order, ...d.orders],
        customers:[customer,...d.customers],
        quotes: d.quotes.map(x => x.id === id ? { ...x, status: 'Aceptado' } : x),
        opportunities: d.opportunities.map(o => o.id === q.opportunityId ? { ...o, status: 'Aceptada', activity: [{ at: today(), by: 'Dirección', text: 'Presupuesto aceptado, pendiente de ingreso.' }, ...o.activity] } : o)
      };
    }),
    verifyPayment: (id: string, mode: Order['paymentMode'], amount: number, by:'Dirección'|'Oficina'='Dirección') => setData(d => {
      const order=d.orders.find(o=>o.id===id);
      if(!order||mode==='Pendiente'||!validInitialPayment(order,amount))return d;
      const date=today(),timestamp=new Date().toISOString();
      const customerId=order.customerId||uid('CLI');
      const customerExists=d.customers.some(c=>c.id===customerId);
      const lead=d.opportunities.find(o=>o.id===d.quotes.find(q=>q.id===order.quoteId)?.opportunityId);
      const customer={id:customerId,name:order.buyerName,contact:lead?.contact||'Por completar',
        destination:lead?.destination||'Por confirmar',createdAt:date,notes:'',documentNames:[] as string[]};
      return {...d,
        customers:customerExists?d.customers:[customer,...d.customers],
        orders:d.orders.map(o=>o.id===id?{
          ...o,customerId,paymentMode:mode,advanceReceived:amount,paymentVerifiedAt:timestamp,paymentVerifiedBy:by,
          factory:o.factory==='Pendiente'?'Confirmando detalles':o.factory,
          activity:[{at:date,text:mode+' · '+amount.toFixed(2)+' € anotados tras comprobación manual',by},...o.activity]
        }:o)};
    }),
    updateOrder: (id:string,patch:Partial<Order>,eventText?:string) => setData(d=>{
      const current=d.orders.find(o=>o.id===id);
      if(!current)return d;
      const target=patch.factory;
      const stages:Order['factory'][]=['Pendiente','Confirmando detalles','En fabricación','Preparado','En tránsito','Entregado'];
      if(target&&target!==current.factory){
        const from=stages.indexOf(current.factory),to=stages.indexOf(target);
        if(to!==from+1)return d;
        if(target==='Confirmando detalles'&&current.paymentMode==='Pendiente')return d;
        if(target==='En fabricación'){
          const qtyOk=(value?:string)=>value!==undefined&&value.trim()!==''&&Number.isInteger(Number(value))&&Number(value)>=0;
          const diamOk=(qty?:string,diam?:string)=>Number(qty)===0||(Boolean(diam&&Number(diam)>0));
          const products=current.items?.filter(line=>line.kind==='product')||[];
          const specsValid=products.length>0?
            products.every(line=>{
              const spec=patch.itemConfigurations?.[line.id];
              const heightOk=(qty?:string,height?:string)=>Number(qty)===0||
                (Boolean(height?.trim())&&Number.isFinite(Number(height))&&Number(height)>=0);
              return Boolean(spec?.color.trim())&&qtyOk(spec?.inletCount)&&qtyOk(spec?.outletCount)
                &&diamOk(spec?.inletCount,spec?.inletDiameterMm)&&diamOk(spec?.outletCount,spec?.outletDiameterMm)
                &&heightOk(spec?.inletCount,spec?.inletHeightMm)&&heightOk(spec?.outletCount,spec?.outletHeightMm);
            })
            :Boolean(patch.color?.trim()&&qtyOk(patch.inletCount)&&qtyOk(patch.outletCount)
              &&diamOk(patch.inletCount,patch.inletDiameterMm)&&diamOk(patch.outletCount,patch.outletDiameterMm));
          if(current.paymentMode==='Pendiente'||!patch.configurationConfirmedAt||!patch.deliveryDate||!specsValid)return d;
        }
        if(target==='En tránsito'&&(!patch.transportConfirmedAt||!patch.transportCompany?.trim()||!patch.departureDate))return d;
        if(target==='Entregado'&&(!patch.deliveredAt||patch.deliveredAt.slice(0,10)>today()))return d;
      }
      const kind=target&&target!==current.factory
        ?target==='En fabricación'?'fabricacion':target==='En tránsito'?'envio':target==='Entregado'?'entrega':null
        :null;
      const title=kind==='fabricacion'?'Fabricación iniciada':kind==='envio'?'Transporte confirmado':kind==='entrega'?'Entrega confirmada':'';
      const description=kind==='fabricacion'?'La oficina ha confirmado con el cliente la configuración y ha iniciado la fabricación.'
        :kind==='envio'?'Transporte y salida registrados por la oficina.'
        :kind==='entrega'?'Pedido entregado. La comisión pendiente pasa a ser exigible.':'';
      return {...d,
        orders:d.orders.map(o=>o.id===id?{...o,...patch,
          activity:eventText?[{at:today(),text:eventText,by:'Oficina / Dirección'},...o.activity]:o.activity}:o),
        orderAlerts:kind?[{id:uid('AVI'),orderId:id,kind,title,description,createdAt:new Date().toISOString()},...(d.orderAlerts||[])]:d.orderAlerts
      };
    }),
    markOrderAlertRead: (id:string) => setData(d=>({...d,orderAlerts:(d.orderAlerts||[]).map(x=>x.id===id?{...x,readAt:x.readAt||new Date().toISOString()}:x)})),
    addCommissionPayment: (id: string, amount: number) => setData(d => {
      const order=d.orders.find(o=>o.id===id);
      const requested=Number.isFinite(amount)?Math.max(0,amount):0;
      if(!order||order.factory!=='Entregado'||requested<=0)return d;
      const previous=roundEuros(Math.max(0,order.commissionPaid));
      const applied=roundEuros(Math.min(commissionOutstanding(order),requested));
      if(applied<=0)return d;
      const date=today();
      return {
        ...d,
        commissionPayments:[...(d.commissionPayments||[]),{id:uid('COB'),orderId:id,amount:applied,paidAt:date}],
        orders:d.orders.map(o=>o.id===id?{
          ...o,commissionPaid:roundEuros(previous+applied),
          activity:[{at:date,text:'Pago de comisión registrado: '+applied.toFixed(2)+' €'+(realIdentity?'':' (demo)'),by:'Dirección'},...o.activity]
        }:o)
      };
    }),
    addTask: (title: string, due: string, context: string, schedule?: { atTime?: string; reminderMinutes?: number | null }) => setData(d =>
      !title.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(due)?d:{...d,tasks:[{
        id:uid('TA'),title:title.trim(),due,context:context.trim(),done:false,...schedule
      },...d.tasks]}),
    toggleTask: (id: string) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),
    addInternalNote: (item: Pick<InternalNote,'title'|'body'|'category'>) => setData(d => ({ ...d,
      internalNotes:[{...item,id:uid('NOT'),pinned:false,updatedAt:new Date().toISOString()},...(d.internalNotes||[])]
    })),
    updateInternalNote: (id:string, patch:Partial<Pick<InternalNote,'title'|'body'|'category'|'pinned'>>) => setData(d => ({...d,
      internalNotes:(d.internalNotes||[]).map(n=>n.id===id?{...n,...patch,updatedAt:new Date().toISOString()}:n)
    })),
    deleteInternalNote: (id:string) => setData(d => ({...d,internalNotes:(d.internalNotes||[]).filter(n=>n.id!==id)})),
    addProduct: (item: Omit<Product, 'id'>) => setData(d => ({ ...d,
      products: [{ ...item, id: uid('PR') }, ...d.products] })),
    updateProduct: (id: string, patch: Partial<Omit<Product, 'id'>>) => setData(d => ({
      ...d,products:d.products.map(p=>p.id===id?{...p,...patch}:p)
    })),
    addProductCategory: (category: ProductCategory) => setData(d => {
      if((d.productCategories||[]).some(c=>c.id===category.id))return d;
      return {...d,productCategories:[...(d.productCategories||[]),category]};
    }),
    updateProductCategory: (id: string, patch: Partial<Omit<ProductCategory, 'id'>>) => setData(d => {
      const oldCategory=(d.productCategories||[]).find(c=>c.id===id);
      return {
        ...d,
        productCategories:(d.productCategories||[]).map(c=>c.id===id?{...c,...patch}:c),
        products:d.products.map(p=>p.categoryId===id?{
          ...p,
          // Rename legacy variants named identically to the category, but preserve explicit product names.
          name:patch.name&&p.name===oldCategory?.name?patch.name:p.name,
          family:patch.family??p.family
        }:p)
      };
    }),
    updateTransport: (p: Partial<TransportSettings>) => setData(d => ({ ...d, transport: { ...d.transport, ...p } })),
    addDocumentName: (customerId: string, name: string) => setData(d => ({
      ...d, customers:d.customers.map(c=>c.id===customerId&&name.trim()&&!c.documentNames.includes(name.trim())
        ?{...c,documentNames:[...c.documentNames,name.trim()]}:c)
    })),
    resetDemo: () => {
      if (realIdentity) return; // Nunca borrar el espacio real desde un control de demo.
      setReadError('');setStorageError('');
      setData(normalizeCatalog(structuredClone(mockData)));
    },
  }), []);
  if (realIdentity && !hydrated) {
    return <main role="status" style={{padding:32,fontFamily:'Inter, sans-serif'}}>
      <h1>Depofibra CRM</h1>
      <p>{loadError || 'Cargando los datos reales desde el servidor…'}</p>
      {loadError && <button onClick={()=>window.location.reload()}>Reintentar</button>}
    </main>;
  }
  return <Ctx.Provider value={{ data, storageError, savePending, role, setRole, ...actions }}>{children}</Ctx.Provider>;
}
export function useCrm(): ContextValue { const value = useContext(Ctx); if (!value) throw new Error('CrmProvider requerido'); return value; }
