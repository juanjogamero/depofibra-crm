export type OpportunityStatus = 'Nueva' | 'Cualificación' | 'Por presupuestar' | 'Presupuesto enviado' | 'Seguimiento' | 'Aceptada' | 'Perdida';
export type QuoteStatus = 'Borrador' | 'Enviado' | 'Aceptado' | 'Rechazado';
export type FactoryStatus = 'Pendiente' | 'Confirmando detalles' | 'En fabricación' | 'Preparado' | 'En tránsito' | 'Entregado';
export type Channel = 'Web' | 'WhatsApp' | 'Wallapop' | 'Facebook' | 'Teléfono' | 'Otro';
export type TimelineItem = { at: string; text: string; by: string };
export type Opportunity = {
  id: string; name: string; channel: Channel; contact: string; alias: string; conversation: string;
  product: string; capacity: string; destination: string; status: OpportunityStatus;
  createdAt: string; receivedAt?: string; nextAction: string; nextDate: string; message: string; lostReason?: string; activity: TimelineItem[];
};
export type Quote = {
  id: string; opportunityId: string; name: string; product: string; amount: number;
  commission: number; transport: number; status: QuoteStatus; createdAt: string; message: string;
  /** Optional reference to chosen catalog variant; quoted amount and name stay as historical snapshot. */
  productId?: string;
};
export type Customer = { id: string; name: string; contact: string; destination: string; createdAt: string; notes: string; documentNames: string[] };
export type Order = {
  id: string; quoteId: string; customerId?: string; buyerName: string; product: string; capacity: string;
  amount: number; commission: number; commissionPaid: number; advanceReceived: number;
  paymentMode: 'Pendiente' | 'Anticipo verificado' | 'Pago completo verificado';
  factory: FactoryStatus; createdAt: string; deliveryDate: string; notes: string;
  color: string; connections: string; activity: TimelineItem[];
};
export type CommissionPayment = { id: string; orderId: string; amount: number; paidAt: string };
export type Task = { id: string; title: string; due: string; context: string; done: boolean };
export type CatalogAttribute = { id: string; label: string; value: string };
export type ProductCategory = {
  id: string; name: string; family: string; attributes: CatalogAttribute[];
};
export type Product = {
  id: string; name: string; family: string; capacity: string;
  /** Precio de venta interno configurado manualmente; 0 = sin precio. Nunca coste de compra. */
  price: number; active: boolean;
  /** True only after explicitly configuring a selling price in the new catalog UI. */
  salePriceConfigured?: boolean;
  /** Optional for legacy CRM products; populated by catalog migration without losing existing data. */
  categoryId?: string;
};
export type TransportSettings = { smallRate: number; largeRate: number; buffer: number; distanceLimit: number; specialExtra: number };
export type CrmState = {
  opportunities: Opportunity[]; quotes: Quote[]; customers: Customer[]; orders: Order[];
  tasks: Task[]; products: Product[]; transport: TransportSettings;
  /** Categorías editables con atributos comunes; opcional para demos anteriores. */
  productCategories?: ProductCategory[];
  /** Fechas verificadas para nuevas liquidaciones. Opcional para datos locales anteriores. */
  commissionPayments?: CommissionPayment[];
};

export const dt = (days = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
export const today = () => dt(0);
export const money = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
export const decimal = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
export const dateText = (s?: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha';
export const dayDiff = (s: string) => Math.round((new Date(today() + 'T12:00:00').getTime() - new Date(s + 'T12:00:00').getTime()) / 86400000);
export const uid = (prefix: string) => prefix + '-' + (Date.now() % 1000000).toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

const event = (text: string, days: number, by = 'Dirección'): TimelineItem => ({ text, at: dt(days), by });
export const mockData: CrmState = {
  opportunities: [
    { id: 'OP-104', name: 'Agro Sierra · ejemplo', channel: 'Wallapop', contact: 'Contacto por Wallapop', alias: '@agrosierra-demo', conversation: '', product: 'Depósito vertical base plana', capacity: '10.000 L', destination: 'Écija, Sevilla', status: 'Nueva', createdAt: dt(0), nextAction: 'Responder consulta inicial', nextDate: dt(0), message: 'Pregunta por depósito de riego y acceso de camión.', activity: [event('Consulta recibida por Wallapop', 0)] },
    { id: 'OP-103', name: 'Finca La Vega · ejemplo', channel: 'Web', contact: 'Formulario web (ficticio)', alias: '', conversation: '', product: 'Depósito vertical base plana', capacity: '15.000 L', destination: 'Carmona, Sevilla', status: 'Por presupuestar', createdAt: dt(-1), nextAction: 'Confirmar coste de transporte', nextDate: dt(0), message: 'Necesita comparar capacidades y llevar el depósito a parcela.', activity: [event('Solicitud web ficticia recibida', -1)] },
    { id: 'OP-102', name: 'Saneamientos Sur · ejemplo', channel: 'WhatsApp', contact: 'Contacto por WhatsApp', alias: 'Saneamientos Sur', conversation: '', product: 'Fosa séptica estanca', capacity: 'A determinar', destination: 'Lucena, Córdoba', status: 'Presupuesto enviado', createdAt: dt(-7), nextAction: 'Preguntar si necesita aclaraciones', nextDate: dt(1), message: 'Consulta de fosa y requisitos técnicos pendientes.', activity: [event('Presupuesto comunicado', -2), event('Solicitud registrada', -7)] },
    { id: 'OP-101', name: 'Riegos del Norte · ejemplo', channel: 'Teléfono', contact: 'Llamada de demostración', alias: '', conversation: '', product: 'Depósito horizontal con cunas', capacity: '5.000 L', destination: 'León', status: 'Seguimiento', createdAt: dt(-18), nextAction: 'Volver a llamar: oportunidad antigua', nextDate: dt(-3), message: 'Pendiente decisión del comprador; sin confirmación de transporte.', activity: [event('Último contacto sin respuesta', -10), event('Consulta telefónica', -18)] },
    { id: 'OP-100', name: 'Hermanos Campos · ejemplo', channel: 'Facebook', contact: 'Messenger (ficticio)', alias: 'HermanosCampos', conversation: '', product: 'Cuba PRFV suelta', capacity: '8.000 L', destination: 'Palencia', status: 'Cualificación', createdAt: dt(-2), nextAction: 'Solicitar medidas de instalación', nextDate: dt(2), message: 'Quieren adaptar cuba a un remolque propio.', activity: [event('Consulta por Messenger', -2)] },
    { id: 'OP-099', name: 'Granja Olivar · ejemplo', channel: 'Web', contact: 'Formulario web (ficticio)', alias: '', conversation: '', product: 'Depósito vertical base plana', capacity: '5.000 L', destination: 'Granada', status: 'Aceptada', createdAt: dt(-17), nextAction: 'Operación en pedidos', nextDate: dt(-9), message: 'Venta de muestra formalizada.', activity: [event('Anticipo ficticio verificado', -8), event('Presupuesto aceptado', -10)] },
    { id: 'OP-098', name: 'Huerta del Valle · ejemplo', channel: 'Wallapop', contact: 'Chat demo', alias: 'huertavalle', conversation: '', product: 'Depósito horizontal', capacity: '4.000 L', destination: 'Jaén', status: 'Perdida', createdAt: dt(-24), nextAction: 'Sin acción', nextDate: '', message: 'Oferta descartada.', lostReason: 'Precio', activity: [event('Cliente indica precio fuera de presupuesto', -19)] },
  ],
  quotes: [
    { id: 'PRE-024', opportunityId: 'OP-102', name: 'Saneamientos Sur · ejemplo', product: 'Fosa séptica estanca · configuración pendiente', amount: 1742, commission: 140, transport: 210, status: 'Enviado', createdAt: dt(-2), message: 'Buenas tardes. Tenemos preparada una propuesta orientativa para la fosa séptica que nos consultas. El importe sería 1.742 €, pendiente de confirmar condiciones técnicas y de entrega. Si te interesa, podemos concretar los detalles. ¡Gracias!' },
    { id: 'PRE-023', opportunityId: 'OP-101', name: 'Riegos del Norte · ejemplo', product: 'Depósito horizontal con cunas 5.000 L', amount: 1130, commission: 115, transport: 260, status: 'Enviado', createdAt: dt(-14), message: 'Buenas tardes. El depósito horizontal de 5.000 litros tendría un precio orientativo de 1.130 €, con transporte sujeto a confirmación. ¿Te encaja para tu instalación?' },
    { id: 'PRE-022', opportunityId: 'OP-099', name: 'Granja Olivar · ejemplo', product: 'Depósito vertical base plana 5.000 L', amount: 950, commission: 100, transport: 145, status: 'Aceptado', createdAt: dt(-10), message: 'Buenas tardes. El depósito vertical de 5.000 litros tiene un presupuesto de ejemplo de 950 € con las condiciones que hemos comentado.' },
    { id: 'PRE-021', opportunityId: 'OP-098', name: 'Huerta del Valle · ejemplo', product: 'Depósito horizontal 4.000 L', amount: 1190, commission: 120, transport: 180, status: 'Rechazado', createdAt: dt(-21), message: 'Presupuesto de demostración.' }
  ],
  customers: [
    { id: 'CLI-001', name: 'Granja Olivar · ejemplo', contact: 'Cliente ficticio', destination: 'Granada', createdAt: dt(-8), notes: 'Depósito de riego, pendiente seguimiento posventa.', documentNames: ['factura-ejemplo.pdf'] },
    { id: 'CLI-002', name: 'Agrícola Horizonte · ejemplo', contact: 'Cliente ficticio', destination: 'Córdoba', createdAt: dt(-31), notes: 'Cliente recurrente de demostración.', documentNames: [] },
    { id: 'CLI-003', name: 'Riego Campiña · ejemplo', contact: 'Cliente ficticio', destination: 'Osuna, Sevilla', createdAt: dt(-45), notes: 'Instalación completada.', documentNames: ['factura-ejemplo-2.pdf'] }
  ],
  orders: [
    { id: 'PED-203', quoteId: 'PRE-022', customerId: 'CLI-001', buyerName: 'Granja Olivar · ejemplo', product: 'Depósito vertical base plana', capacity: '5.000 L', amount: 950, commission: 100, commissionPaid: 0, advanceReceived: 345, paymentMode: 'Anticipo verificado', factory: 'En fabricación', createdAt: dt(-8), deliveryDate: '', notes: 'Comprobación de acceso pendiente por Fábrica.', color: 'Por confirmar', connections: 'Por concretar con el comprador', activity: [event('Anticipo de ejemplo verificado', -8), event('Pedido trasladado a Fábrica', -7)] },
    { id: 'PED-202', quoteId: '', customerId: 'CLI-002', buyerName: 'Agrícola Horizonte · ejemplo', product: 'Depósito vertical base plana', capacity: '10.000 L', amount: 1490, commission: 160, commissionPaid: 80, advanceReceived: 540, paymentMode: 'Anticipo verificado', factory: 'En tránsito', createdAt: dt(-31), deliveryDate: dt(1), notes: 'Entrega de muestra programada.', color: 'Verde', connections: 'Confirmadas por Fábrica', activity: [event('Salida de fábrica', -1, 'Fábrica'), event('Comisión parcial registrada', -6)] },
    { id: 'PED-201', quoteId: '', customerId: 'CLI-003', buyerName: 'Riego Campiña · ejemplo', product: 'Depósito horizontal con cunas', capacity: '8.000 L', amount: 1690, commission: 190, commissionPaid: 190, advanceReceived: 1690, paymentMode: 'Pago completo verificado', factory: 'Entregado', createdAt: dt(-45), deliveryDate: dt(-28), notes: 'Producto entregado y comisión liquidada.', color: 'Blanco', connections: 'Confirmadas', activity: [event('Entrega confirmada', -28, 'Fábrica'), event('Comisión liquidada', -18)] },
  ],
  tasks: [
    { id: 'TA-1', title: 'Responder a Agro Sierra', due: dt(0), context: 'OP-104 · Wallapop', done: false },
    { id: 'TA-2', title: 'Confirmar transporte de Finca La Vega', due: dt(0), context: 'OP-103 · Presupuesto', done: false },
    { id: 'TA-3', title: 'Recuperar presupuesto de Riegos del Norte', due: dt(-3), context: 'OP-101 · Seguimiento atrasado', done: false },
    { id: 'TA-4', title: 'Llamada posventa a Riego Campiña', due: dt(2), context: 'PED-201 · Posventa', done: false },
  ],
  products: [
    { id: 'PR-001', name: 'Depósito vertical base plana', family: 'Depósitos PRFV', capacity: '5.000 L', price: 0, active: true },
    { id: 'PR-002', name: 'Depósito vertical base plana', family: 'Depósitos PRFV', capacity: '10.000 L', price: 0, active: true },
    { id: 'PR-003', name: 'Depósito vertical base plana', family: 'Depósitos PRFV', capacity: '15.000 L', price: 0, active: true },
    { id: 'PR-004', name: 'Depósito horizontal con cunas', family: 'Depósitos PRFV', capacity: '8.000 L', price: 0, active: true },
    { id: 'PR-005', name: 'Fosa séptica estanca', family: 'Fosas sépticas', capacity: 'A determinar', price: 0, active: true },
    { id: 'PR-006', name: 'Cuba suelta para remolque', family: 'Cubas y cisternas', capacity: '8.000 L', price: 0, active: true },
  ],
  commissionPayments: [],
  transport: { smallRate: 0, largeRate: 0, buffer: 0, distanceLimit: 300, specialExtra: 0 }
};