import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const root='http://127.0.0.1:4173/depofibra-crm/';
const open=(page,route)=>page.goto(root+'#'+route);
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('depofibra-crm-demo-v1')||'null'));
const today=()=>{
 const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const inDays=(days)=>{
 const d=new Date();d.setDate(d.getDate()+days);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
test('Navegación de todas las áreas e informes, sin fallos JS',async({page})=>{
 test.setTimeout(160000);
 const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 const routes=[
  '/','/oportunidades','/oportunidades/nueva','/oportunidades/OP-104',
  '/presupuestos','/presupuestos/nuevo','/presupuestos/PRE-024',
  '/clientes','/clientes/CLI-001','/pedidos','/pedidos/PED-203',
  '/comisiones','/agenda','/resultados','/resultados/activity',
  '/resultados/products','/resultados/channels','/resultados/zones',
  '/resultados/quotes','/resultados/orders','/resultados/conversion',
  '/resultados/sources','/finanzas','/catalogo','/transporte',
  '/configuracion/perfil','/configuracion/seguridad','/configuracion/actividad',
  '/configuracion/transporte','/configuracion/datos'
 ];
 for(const route of routes){
  await open(page,route);
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('h1').first(),route).toBeVisible();
  await expect(page.locator('#root'),route).not.toBeEmpty();
  await expect(page.locator('header.topbar'),route+' no debe mostrar barra superior').toHaveCount(0);
 }
 expect(jsErrors,JSON.stringify(jsErrors)).toEqual([]);
});
test('Oportunidad perdida a papelera recuperable y presupuestos antiguos recuperables',async({page})=>{
 const dialogs=[];page.on('dialog',async d=>{dialogs.push(d.type());await d.accept(d.type()==='prompt'?'Precio':'')});
 await open(page,'/oportunidades/OP-104');
 await page.getByLabel('Estado comercial').selectOption('Perdida');
 await expect.poll(async()=>((await state(page)).opportunities.find(o=>o.id==='OP-104')?.deletedAt||'')).not.toBe('');
 await open(page,'/oportunidades');
 await page.getByRole('button',{name:/Apartadas/}).click();
 await expect(page.getByRole('button',{name:/Recuperar Agro Sierra/})).toBeVisible();
 await page.getByRole('button',{name:/Recuperar Agro Sierra/}).click();
 await expect.poll(async()=>((await state(page)).opportunities.find(o=>o.id==='OP-104')?.status)).toBe('Seguimiento');
 await open(page,'/presupuestos');
 const old=(await state(page)).quotes.find(q=>q.id==='PRE-021');
 expect(old.archivedAt).toBeTruthy();
 await page.getByRole('button',{name:/Papelera/}).click();
 await expect(page.getByRole('button',{name:'Recuperar presupuesto PRE-021'})).toBeVisible();
 await page.getByRole('button',{name:'Recuperar presupuesto PRE-021'}).click();
 await expect.poll(async()=>((await state(page)).quotes.find(q=>q.id==='PRE-021')?.retainedUntil||'')).not.toBe('');
 expect(dialogs).toContain('confirm');
});
test('Presupuesto multiproducto completo -> aceptación, pago, fabricación, porte, entrega, comisión',async({page})=>{
 test.setTimeout(160000);
 page.on('dialog',async d=>{await d.accept()});
 await open(page,'/presupuestos/nuevo?op=OP-104');
 await expect(page.locator('.crm-quote-line')).toHaveCount(1);
 let first=page.locator('.crm-quote-line').nth(0);
 await first.getByLabel('Cantidad').fill('1');
 await first.getByLabel('Precio unitario (€)').fill('1000.50');
 await page.getByRole('button',{name:'Añadir producto'}).click();
 const second=page.locator('.crm-quote-line').nth(1);
 await second.getByLabel('Descripción').fill('Depósito horizontal 5.000 L');
 await second.getByLabel('Cantidad').fill('2');
 await second.getByLabel('Precio unitario (€)').fill('300');
 await page.getByRole('button',{name:'Añadir transporte'}).click();
 const shipping=page.locator('.crm-quote-line').nth(2);
 await shipping.getByLabel('Precio unitario (€)').fill('190.25');
 await page.getByRole('button',{name:'Añadir servicio'}).click();
 const service=page.locator('.crm-quote-line').nth(3);
 await service.getByLabel('Descripción').fill('Revestimiento alimentario');
 await service.getByLabel('Precio unitario (€)').fill('98');
 await page.getByLabel(/Comisión acordada.*uso interno/).fill('120.25');
 await expect(page.locator('.crm-quote-subtotal')).toContainText('1888,75');
 await page.getByRole('button',{name:'Guardar presupuesto'}).click();
 await expect.poll(async()=>(await state(page)).quotes.length).toBe(5);
 const newQuote=(await state(page)).quotes.find(q=>q.opportunityId==='OP-104');
 expect(newQuote.amount).toBe(1888.75);
 expect(newQuote.items).toHaveLength(4);
 expect(newQuote.commission).toBe(120.25);
 await open(page,'/presupuestos/'+newQuote.id);
 await expect(page.locator('.crm-quote-breakdown tbody tr')).toHaveCount(4);
 await page.getByLabel('Estado del presupuesto').selectOption('Aceptado');
 await expect(page.getByRole('button',{name:'Guardar aceptación'})).toBeVisible();
 await page.getByRole('button',{name:'Guardar aceptación'}).click();
 await expect.poll(async()=>(await state(page)).orders.some(o=>o.quoteId===newQuote.id)).toBe(true);
 const accepted=(await state(page)).orders.find(o=>o.quoteId===newQuote.id);
 expect(accepted.amount).toBe(1888.75);
 expect(accepted.commissionPaid).toBe(0);
 expect(accepted.paymentMode).toBe('Pendiente');
 expect(accepted.items).toHaveLength(4);
 await open(page,'/pedidos/'+accepted.id);
 await expect(page.locator('.crm-quote-breakdown tbody tr')).toHaveCount(4);
 await page.getByRole('button',{name:'Formalización'}).click();
 await page.getByLabel('Importe realmente comprobado (€)').fill('500.45');
 await page.getByLabel(/He comprobado el ingreso/).check();
 await page.getByRole('button',{name:'Confirmar primer pago'}).click();
 await expect(page.locator('.crm-payment-success')).toContainText('500,45');
 await expect(page.getByRole('button',{name:'Confirmar primer pago'})).toHaveCount(0);
 await expect.poll(async()=>(await state(page)).orders.find(o=>o.id===accepted.id).factory).toBe('Confirmando detalles');
 await page.getByRole('button',{name:'Fabricación',exact:true}).click();
 await expect(page.locator('.crm-office-product')).toHaveCount(2);
 await page.getByLabel('Entrega estimada del pedido').fill(inDays(10));
 for(let i=0;i<2;i++){
   const product=page.locator('.crm-office-product').nth(i);
   await product.getByLabel('Color / acabado').fill(i===0?'Blanco':'Azul');
   await product.getByLabel('Número de entradas').fill('1');
   await product.getByLabel('Diámetro entradas (mm)').fill('63');
   await product.getByLabel('Altura entradas desde base (mm)').fill('250');
   await product.getByLabel('Número de salidas').fill('1');
   await product.getByLabel('Diámetro salidas (mm)').fill('50');
   await product.getByLabel('Altura salidas desde base (mm)').fill('150');
 }
 await page.getByLabel(/He hablado con el cliente/).check();
 const start=page.getByRole('button',{name:/Confirmar e iniciar fabricación/});
 await expect(start).toBeEnabled();
 await start.click();
 await expect.poll(async()=>(await state(page)).orders.find(o=>o.id===accepted.id).factory).toBe('En fabricación');
 await page.getByRole('button',{name:/Fabricación terminada/}).click();
 await expect.poll(async()=>(await state(page)).orders.find(o=>o.id===accepted.id).factory).toBe('Preparado');
 await page.getByLabel('Transportista confirmado').fill('Transportista QA');
 await page.getByLabel('Fecha prevista de salida').fill(inDays(1));
 await page.getByLabel(/He hablado con el transportista/).check();
 await page.getByRole('button',{name:/Confirmar transporte y marcar enviado/}).click();
 await expect.poll(async()=>(await state(page)).orders.find(o=>o.id===accepted.id).factory).toBe('En tránsito');
 await page.getByLabel('Fecha real de entrega').fill(today());
 await page.getByLabel(/Entrega confirmada por cliente/).check();
 await page.getByRole('button',{name:'Marcar entregado'}).click();
 await expect.poll(async()=>(await state(page)).orders.find(o=>o.id===accepted.id).factory).toBe('Entregado');
 await page.getByRole('button',{name:'Comisiones',exact:true}).click();
 await page.getByLabel('Importe recibido (€)').fill('120.25');
 await page.getByRole('button',{name:'Registrar cobro'}).click();
 await expect.poll(async()=>(await state(page)).orders.find(o=>o.id===accepted.id).commissionPaid).toBe(120.25);
 const stored=await state(page);
 expect(stored.orders.find(o=>o.id===accepted.id).itemConfigurations).toBeTruthy();
 expect(stored.orderAlerts.filter(a=>a.orderId===accepted.id)).toHaveLength(3);
 await open(page,'/pedidos');
 await expect(page.getByText('Actualizaciones de Fábrica')).toBeVisible();
});
test('Agenda, notas, filtros, catálogo, resultados y calculadora operativos en navegador',async({page})=>{
 test.setTimeout(120000);
 await open(page,'/agenda');
 await page.getByRole('button',{name:'Nueva tarea'}).click();
 await page.getByLabel('Tarea',{exact:true}).fill('Revisión E2E');
 await page.getByLabel('Fecha').fill(inDays(1));
 await page.getByLabel('Hora',{exact:true}).fill('10:30');
 await page.getByRole('button',{name:'Guardar tarea'}).click();
 await expect.poll(async()=>(await state(page)).tasks.some(t=>t.title==='Revisión E2E')).toBe(true);
 await page.getByRole('button',{name:'Nueva nota'}).click();
 await page.getByLabel('Título').fill('Condiciones de proveedor QA');
 await page.getByLabel('Contenido').fill('Anotación de prueba de navegación, no condición real.');
 await page.getByRole('button',{name:'Guardar nota'}).click();
 await expect.poll(async()=>(await state(page)).internalNotes.some(n=>n.title==='Condiciones de proveedor QA')).toBe(true);
 await open(page,'/oportunidades');
 await page.getByRole('button',{name:'Filtros'}).click();
 await expect(page.getByRole('button',{name:'Filtros'})).toHaveAttribute('aria-expanded','true');
 await open(page,'/catalogo');
 await expect(page.getByRole('heading',{name:'Catálogo'})).toBeVisible();
 await page.getByRole('button',{name:/Ver y editar atributos/}).click();
 await expect(page.getByRole('button',{name:/Añadir atributo/}).first()).toBeVisible();
 // Portes: guardar parámetros desde la interfaz sin consumir APIs ni inventar tarifas vigentes.
 await open(page,'/configuracion/transporte');
 await page.getByLabel('Hasta Ø 2,45 m · €/km').fill('2');
 await page.getByLabel('Desde Ø 3,00 m · €/km').fill('3');
 await page.getByLabel('Ajuste fijo · €').fill('10');
 await page.getByLabel('Límite de kilómetros').fill('500');
 await page.getByRole('button',{name:'Guardar parámetros locales'}).click();
 await expect(page.getByRole('status')).toContainText('Tarifas guardadas localmente');
 await open(page,'/transporte');
 await page.getByLabel('Kilómetros de ida').fill('50');
 await expect(page.locator('.transport-fast-total')).toContainText('110,00');
 await open(page,'/resultados');
 await page.getByRole('button',{name:'Exportar datos'}).click();
 const downloadEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar informe JSON'}).click();
 const download=await downloadEvent;
 const obj=JSON.parse(await fs.readFile(await download.path(),'utf8'));
 expect(obj.registros_anonimizados).toHaveProperty('oportunidades');
 expect(obj.metadata.privacidad).toBeTruthy();
});
test('Diseño responsive: rutas esenciales sin desbordamiento general ni JS fatal',async({page})=>{
 test.setTimeout(130000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const viewport of [{width:390,height:844},{width:768,height:850},{width:1366,height:768}]){
  await page.setViewportSize(viewport);
  for(const route of ['/','/oportunidades','/presupuestos/nuevo','/pedidos/PED-203','/agenda','/catalogo','/resultados','/transporte','/configuracion/perfil']){
   await open(page,route);
   await expect(page.locator('h1').first(),route+' @'+viewport.width).toBeVisible();
   const state=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
   expect(state.scroll,route+' ancho '+viewport.width+' scroll='+state.scroll).toBeLessThanOrEqual(state.width+4);
  }
 }
 expect(errors).toEqual([]);
});

test('Copia de seguridad íntegra, persistencia local y controles visibles de perfil',async({page})=>{
 page.on('dialog',async dialog=>dialog.accept());
 await open(page,'/configuracion/perfil');
 await page.getByLabel('Nombre visible').fill('Dirección QA');
 await page.getByRole('button',{name:/Guardar perfil/}).click();
 await expect(page.getByText(/Perfil guardado en este navegador/)).toBeVisible();
 await page.reload();
 const name=await page.evaluate(()=>JSON.parse(localStorage.getItem('depofibra-crm-profile-demo-v1-direccion')||'{}').displayName);
 expect(name).toBe('Dirección QA');
 await open(page,'/configuracion/datos');
 const requested=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar copia JSON'}).click();
 const download=await requested;
 expect(download.suggestedFilename()).toMatch(/depofibra-crm-copia-local-.*\.json/);
 const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));
 expect(backup.schema).toBe('depofibra-crm-backup-local-v1');
 expect(backup.data).toHaveProperty('orders');
 expect(backup.data).toHaveProperty('quotes');
 expect(backup.data).toHaveProperty('internalNotes');
 expect(backup.data).toHaveProperty('transport');
 expect(backup).not.toHaveProperty('password');
});
test('Vista de oficina: rutas acotadas sin simular permisos de servidor',async({page})=>{
 await open(page,'/configuracion/perfil');
 await page.getByLabel('Cambiar vista simulada del CRM').selectOption('fabrica');
 await open(page,'/fabrica');
 await expect(page.locator('h1').first()).toBeVisible();
 await open(page,'/comisiones');
 await expect(page).toHaveURL(/#\/fabrica$/);
 await open(page,'/configuracion/seguridad');
 await expect(page.getByRole('heading',{name:'Acceso y seguridad'})).toBeVisible();
 // Los roles de la interfaz NO equivalen a autenticación en servidor.
 await expect(page.getByText(/sistema de cuentas seguro/)).toBeVisible();
});


test('Sin barra superior en fichas y formularios; menú móvil accesible en todas',async({page})=>{
 const detailRoutes=['/oportunidades/OP-104','/oportunidades/nueva','/presupuestos/PRE-024','/presupuestos/nuevo','/clientes/CLI-001','/pedidos/PED-203'];
 for(const route of detailRoutes){
  await page.setViewportSize({width:1366,height:850});
  await open(page,route);
  await expect(page.locator('header.topbar'),route).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Abrir menú lateral'}),route+' escritorio').toBeHidden();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Abrir menú lateral'}),route+' móvil').toBeVisible();
  await page.getByRole('button',{name:'Abrir menú lateral'}).click();
  await expect(page.locator('.sidebar')).toHaveClass(/is-open/);
  await page.getByRole('button',{name:'Cerrar menú'}).click();
  await expect(page.locator('.sidebar')).not.toHaveClass(/is-open/);
 }
});


test('Agenda compacta: calendario proporcionado, día actual seleccionado y notas sin ocupar media pantalla',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:1440,height:850});
 await open(page,'/agenda');
 const calendar=page.locator('.agenda-pro-calendar');
 const notes=page.locator('.agenda-pro-notes');
 const tasks=page.locator('.agenda-pro-tasks');
 await expect(calendar).toBeVisible();
 await expect(notes).toBeVisible();
 await expect(tasks).toBeVisible();
 const [calBox,noteBox,taskBox]=await Promise.all([calendar.boundingBox(),notes.boundingBox(),tasks.boundingBox()]);
 expect(calBox).toBeTruthy();expect(noteBox).toBeTruthy();expect(taskBox).toBeTruthy();
 expect(calBox.width,'calendario no debe ocupar media pantalla').toBeLessThanOrEqual(445);
 expect(calBox.height,'las seis semanas y agenda del día deben caber compactas').toBeLessThanOrEqual(435);
 expect(noteBox.width,'notas aprovechan el ancho liberado').toBeGreaterThan(calBox.width);
 expect(taskBox.y,'tabla de tareas visible en primera pantalla').toBeLessThan(630);
 await expect(calendar.locator('.agenda-pro-day[aria-pressed=true]')).toHaveCount(1);
 await expect(calendar.locator('.agenda-pro-day')).toHaveCount(30);
 const month=await calendar.locator('.agenda-pro-month strong').textContent();
 await calendar.getByRole('button',{name:'Mes siguiente'}).click();
 expect(await calendar.locator('.agenda-pro-month strong').textContent()).not.toBe(month);
 await calendar.getByRole('button',{name:'Mes anterior'}).click();
 await expect(calendar.locator('.agenda-pro-month strong')).toHaveText(month);
 await calendar.locator('.agenda-pro-day').nth(14).click();
 await expect(calendar.locator('.agenda-pro-day[aria-pressed=true]')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Mostrar todas las fechas'})).toBeVisible();
 await page.getByRole('button',{name:'Mostrar todas las fechas'}).click();
 await expect(page.getByRole('button',{name:'Mostrar todas las fechas'})).toHaveCount(0);
});
test('Resultados: nueve informes mantienen contenidos y controles en diseño ligero y responsive',async({page})=>{
 test.setTimeout(125000);
 const routes=['','activity','products','channels','zones','quotes','orders','conversion','sources'];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1366,height:850});
 for(const route of routes){
  await open(page,'/resultados'+(route?'/'+route:''));
  await expect(page.getByRole('heading',{name:'Rendimiento',exact:true})).toBeVisible();
  await expect(page.getByRole('group',{name:'Periodo de análisis'})).toBeVisible();
  await expect(page.getByLabel('Seleccionar subapartado de Resultados')).toHaveValue(route||'overview');
  const length=await page.locator('.ri-active-content').evaluate(x=>x.textContent?.trim().length??0);
  expect(length,'el informe '+(route||'overview')+' conserva su información').toBeGreaterThan(40);
  const card=page.locator('.ri-active-content :is(.ri-study-section,.ri-panel,.ri-geo-card,.ri-trend-report,.ri-integration-panel,.ri-focus-overview,.ri-digital-source-panel,.ri-product-card,.ri-activity-board)').first();
  // No esperar indefinidamente a una tarjeta inexistente: algunos informes usan otros contenedores.
  if(await card.count())expect(await card.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
 }
 for(const viewport of [{width:390,height:844},{width:768,height:850}]){
  await page.setViewportSize(viewport);
  for(const route of ['','products','channels','quotes','sources']){
   await open(page,'/resultados'+(route?'/'+route:''));
   await expect(page.getByRole('heading',{name:'Rendimiento',exact:true})).toBeVisible();
   const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
   expect(scroll,'sin desbordamiento global en '+(route||'overview')+' a '+viewport.width).toBeLessThanOrEqual(viewport.width+4);
  }
 }
 expect(errors).toEqual([]);
});
