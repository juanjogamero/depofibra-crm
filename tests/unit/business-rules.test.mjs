import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Ejecuta exactamente el dominio TypeScript de producción, no una copia del código.
const source=fs.readFileSync(new URL('../../src/domain.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const domain=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const {quoteItemTotal,quoteItemsSubtotal,validQuoteLines,roundEuros,
 money,decimal,dateText,dt,sourceChannel,commissionOutstanding,commissionDue,validInitialPayment}=domain;
const line=(id,kind,qty,price,description='Ejemplo verificado')=>({
 id,kind,description,quantity:qty,unitPrice:price
});
test('Presupuesto: dos depósitos, transporte y revestimiento se suman sin IVA y sin incluir comisión',()=>{
 const items=[
  line('a','product',1,1200.50,'Depósito 10.000L'),
  line('b','product',2,750.25,'Depósito 5.000L'),
  line('c','shipping',1,185.75,'Transporte'),
  line('d','service',2,100.05,'Revestimiento'),
 ];
 assert.equal(validQuoteLines(items),true);
 assert.equal(quoteItemsSubtotal(items),3086.85);
 assert.equal(quoteItemTotal(items[1]),1500.5);
});
test('Importes: precisión de céntimos y redondeo de línea',()=>{
 assert.equal(roundEuros(1.005),1.01);
 assert.equal(quoteItemsSubtotal([line('a','product',2,0.29)]),0.58);
 assert.match(decimal(0.25),/0,25/);
 assert.match(money(115.75),/115,75/);
});
test('Las líneas vacías, repetidas, negativas o sin producto se rechazan',()=>{
 assert.equal(validQuoteLines([]),false);
 assert.equal(validQuoteLines([line('t','shipping',1,10)]),false);
 assert.equal(validQuoteLines([line('a','product',0,10)]),false);
 assert.equal(validQuoteLines([line('a','product',1,-10)]),false);
 assert.equal(validQuoteLines([line('a','product',1,NaN)]),false);
 assert.equal(validQuoteLines([line('a','product',1,10,'' )]),false);
 assert.equal(validQuoteLines([line('a','product',1,10),line('a','service',1,5)]),false);
});
test('Comisión acordada no es exigible hasta entrega',()=>{
 const order={factory:'En fabricación',commission:120.25,commissionPaid:20.05,paymentMode:'Anticipo verificado'};
 assert.equal(commissionOutstanding(order),100.2);
 assert.equal(commissionDue(order),0);
 assert.equal(commissionDue({...order,factory:'Entregado'}),100.2);
 assert.equal(commissionDue({...order,factory:'Entregado',commissionPaid:120.25}),0);
});
test('Primera verificación manual: solo una vez y con valor positivo, sin confundir IVA',()=>{
 const order={paymentMode:'Pendiente',amount:1000};
 assert.equal(validInitialPayment(order,1210),true); // transferencia con IVA, sin inferir tipo impositivo
 assert.equal(validInitialPayment(order,0),false);
 assert.equal(validInitialPayment(order,-10),false);
 assert.equal(validInitialPayment(order,NaN),false);
 assert.equal(validInitialPayment({...order,paymentMode:'Anticipo verificado'},500),false);
});
test('Fechas y origen de captación: ISO completo y fallback transparente',()=>{
 assert.match(dt(),/^\d{4}-\d{2}-\d{2}$/);
 assert.notEqual(dateText('2026-11-25T09:42:30.000Z'),'Sin fecha');
 assert.equal(dateText('nonsense'),'Sin fecha');
 assert.equal(sourceChannel({channel:'Web',originChannel:'Wallapop'}),'Wallapop');
 assert.equal(sourceChannel({channel:'WhatsApp'}),'WhatsApp');
});
