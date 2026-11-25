import { type QuoteLineItem, quoteItemTotal, quoteItemsSubtotal, decimal } from './domain';
const kindNames:{[key:string]:string}={product:'Producto',shipping:'Transporte',service:'Servicio',other:'Otro'};
/** Visualiza el desglose comercial sin confundir el precio de venta con coste o comisión. */
export default function QuoteLineItems({items,total,legacyProduct}:{items?:QuoteLineItem[];total:number;legacyProduct?:string}){
 if(!items?.length)return <div className="crm-quote-legacy">
  <strong>Importe global registrado: {decimal(total)}</strong>
  <p>{legacyProduct||'Conceptos no detallados'}. Este registro anterior no incluye precios por partida ni permite acreditar cómo se calculó el IVA.</p>
 </div>;
 const calculated=quoteItemsSubtotal(items);
 const difference=Math.abs(calculated-total)>0.009;
 return <div className="crm-quote-breakdown">
  <div className="crm-quote-breakdown-scroll" role="region" tabIndex={0} aria-label="Partidas de productos y servicios presupuestados">
   <table>
    <thead><tr><th scope="col">Concepto</th><th scope="col" className="align-right">Cantidad</th>
      <th scope="col" className="align-right">P. unitario sin IVA</th><th scope="col" className="align-right">Importe</th></tr></thead>
    <tbody>{items.map((item,i)=><tr key={item.id||i}>
      <td><span className="crm-quote-kind">{kindNames[item.kind]||'Concepto'}</span><strong>{item.description}</strong></td>
      <td className="align-right">{item.quantity.toLocaleString('es-ES',{maximumFractionDigits:2})}</td>
      <td className="align-right">{decimal(item.unitPrice)}</td>
      <td className="align-right"><b>{decimal(quoteItemTotal(item))}</b></td>
    </tr>)}</tbody>
    <tfoot><tr><td colSpan={3}>TOTAL SIN IVA</td><td className="align-right">{decimal(calculated)}</td></tr></tfoot>
   </table>
  </div>
  {difference&&<p className="crm-quote-mismatch" role="alert">Revisar el presupuesto: el total guardado ({decimal(total)}) no coincide con la suma de sus partidas ({decimal(calculated)}).</p>}
 </div>;
}
