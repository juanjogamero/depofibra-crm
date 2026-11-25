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

test('Catálogo: regreso intuitivo desde atributos a productos y categorías',async({page})=>{
 await open(page,'/catalogo');
 const tabs=page.getByRole('navigation',{name:'Secciones del catálogo'});
 await tabs.getByRole('button',{name:'Atributos'}).click();
 await expect(page.getByRole('button',{name:'Volver a productos'})).toBeVisible();
 await page.getByRole('button',{name:'Volver a productos'}).click();
 await expect(page.getByRole('button',{name:'Ver y editar atributos'})).toBeVisible();
 await tabs.getByRole('button',{name:'Categorías'}).click();
 await expect(page.getByRole('heading',{name:'Categorías',exact:true})).toBeVisible();
 await page.locator('.catalog3-overview-row').first().click();
 await tabs.getByRole('button',{name:'Atributos'}).click();
 await page.getByRole('navigation',{name:'Ruta en el catálogo'}).getByRole('button',{name:'Categorías'}).click();
 await expect(page.getByRole('heading',{name:'Categorías',exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await expect(tabs.getByRole('button',{name:'Categorías'})).toBeVisible();
 await expect(tabs.getByRole('button',{name:'Productos'})).toBeVisible();
 await expect(tabs.getByRole('button',{name:'Atributos'})).toBeVisible();
});

test('Dirección: Google Maps plegado, pedidos, agenda, resultados y perfil de comprador',async({page})=>{
 test.setTimeout(100000);
 await page.setViewportSize({width:1366,height:900});
 await open(page,'/transporte');
 const mapsSection=page.getByRole('region',{name:'Configuración de Google Maps'});
 const calculator=page.getByRole('region',{name:'Calculadora rápida de portes'});
 await expect(mapsSection).toBeVisible();
 await expect(calculator.locator('.transport-fast-key-trigger')).toHaveCount(0);
 const headerBox=await page.locator('.page-transport .op-screen-heading').boundingBox();
 const mapsBox=await mapsSection.boundingBox();
 const calculatorBox=await calculator.boundingBox();
 expect(headerBox&&mapsBox&&calculatorBox).toBeTruthy();
 expect(mapsBox.y).toBeGreaterThanOrEqual(headerBox.y+headerBox.height-1);
 expect(calculatorBox.y).toBeGreaterThanOrEqual(mapsBox.y+mapsBox.height-1);
 expect(await mapsSection.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 const mapsToggle=mapsSection.getByRole('button',{name:'Configurar Google Maps'});
 await expect(mapsToggle).toHaveAttribute('aria-expanded','false');
 await expect(page.getByLabel('Clave API de Google Maps para navegador')).toHaveCount(0);
 await expect(page.locator('.transport-fast-attribution')).toHaveCount(0);
 await mapsToggle.click();
 await expect(mapsToggle).toHaveAttribute('aria-expanded','true');
 await expect(page.getByLabel('Clave API de Google Maps para navegador')).toBeVisible();
 await expect(page.locator('.transport-fast-attribution')).toBeVisible();
 await mapsToggle.click();
 await expect(page.locator('.transport-fast-attribution')).toHaveCount(0);
 await open(page,'/pedidos/PED-203');
 await expect(page.locator('.crm-order-overview-grid')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Información general'})).toBeVisible();
 await open(page,'/agenda');
 await expect(page.getByRole('heading',{name:'Agenda y notas'})).toBeVisible();
 const calendar=page.locator('.agenda-pro-calendar');
 await expect(calendar).toBeVisible();
 expect((await calendar.boundingBox()).width).toBeLessThanOrEqual(425);
 await open(page,'/resultados');
 await expect(page.getByRole('heading',{name:'Resumen y mapa'})).toBeVisible();
 await page.getByRole('button',{name:'Informe siguiente'}).click();
 await expect(page).toHaveURL(/#\/resultados\/activity/);
 await expect(page.getByRole('heading',{name:'Evolución',exact:true})).toBeVisible();
 await open(page,'/configuracion/perfil');
 await page.getByLabel('Cambiar vista simulada del CRM').selectOption('fabrica');
 await open(page,'/fabrica');
 await expect(page.locator('.factory-orders-panel .simple-item .initials').first()).toBeVisible();
 await expect(page.locator('.factory-orders-panel .simple-item .initials').first()).not.toBeEmpty();
 await expect(page.locator('.factory-orders-panel .simple-item').first().locator('svg').first()).toHaveCount(1);
});

test('Acciones al final de tablas: separación del borde en cinco áreas y papelera',async({page})=>{
 test.setTimeout(120000);
 const checkSpacing=async(route,minimumGap)=>{
  await open(page,route);
  if(route==='/comisiones')await page.getByRole('navigation',{name:'Filtrar por estado de comisión'}).getByRole('button',{name:/Todas/}).click();
  const panel=page.locator('.op-table-panel').first();
  await expect(panel).toBeVisible();
  const action=panel.locator('tbody td.op-col-open > :is(.op-row-open,.crm-trash-restore), tbody td.commission-col-open > .op-row-open').first();
  await expect(action,route+' debe tener una acción accesible').toBeVisible();
  const panelBox=await panel.boundingBox();
  const actionBox=await action.boundingBox();
  expect(panelBox&&actionBox).toBeTruthy();
  expect(panelBox.x+panelBox.width-(actionBox.x+actionBox.width),
   route+' debe dejar margen real a la derecha').toBeGreaterThanOrEqual(minimumGap);
 };
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/oportunidades','/presupuestos','/clientes','/pedidos','/comisiones']){
   await checkSpacing(route,width===390?6:9);
  }
  await open(page,'/presupuestos');
  await page.getByRole('button',{name:/Papelera/}).click();
  const restore=page.getByRole('button',{name:'Recuperar presupuesto PRE-021'});
  await expect(restore).toBeVisible();
  const panelBox=await page.locator('.op-table-panel').boundingBox();
  const actionBox=await restore.boundingBox();
  expect(panelBox.x+panelBox.width-(actionBox.x+actionBox.width),
   'El botón de recuperar de la captura debe tener margen lateral').toBeGreaterThanOrEqual(width===390?6:9);
 }
});

test('Fondo Depofibra: degradado tenue sin alterar módulos ni legibilidad',async({page})=>{
  test.setTimeout(120000);
  for(const width of [1366,390]){
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/oportunidades','/presupuestos','/pedidos/PED-203','/agenda','/resultados','/catalogo','/transporte']){
      await open(page,route);
      const surfaces=await page.evaluate(()=>{
        const main=document.querySelector('.app-main');
        const screen=document.querySelector('.app-main > .page');
        if(!main||!screen)return null;
        return {
          backdrop:getComputedStyle(main).backgroundImage,
          screenColor:getComputedStyle(screen).backgroundColor,
          screenImage:getComputedStyle(screen).backgroundImage
        };
      });
      expect(surfaces,route+' debe tener superficie principal').not.toBeNull();
      expect(surfaces.backdrop,route+' debe mostrar el degradado azul').toContain('linear-gradient');
      expect(surfaces.screenColor,route+' no debe ocultar el fondo').toBe('rgba(0, 0, 0, 0)');
      expect(surfaces.screenImage).toBe('none');
      await expect(page.locator('.app-main h1').first(),route+' mantiene el título legible').toBeVisible();
    }
  }
});

test('Tablas: cabecera y franja inferior minimalistas, sin cambiar datos',async({page})=>{
 test.setTimeout(120000);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/oportunidades','/presupuestos','/clientes','/pedidos','/comisiones']){
   await open(page,route);
   const panel=page.locator('.op-table-panel').first();
   const th=panel.locator('.op-data-table thead th').first();
   const footer=panel.locator('.op-table-footer');
   await expect(th,route+' conserva su cabecera').toBeVisible();
   await expect(footer,route+' conserva el resumen').toBeVisible();
   await expect(footer).toContainText('Mostrando');
   const visual=await page.evaluate(()=>{
    const panel=document.querySelector('.op-table-panel');
    const th=panel?.querySelector('.op-data-table thead th');
    const footer=panel?.querySelector('.op-table-footer');
    if(!th||!footer)return null;
    return {
     headerGradient:getComputedStyle(th).backgroundImage,
     footerGradient:getComputedStyle(footer).backgroundImage,
     footerFontSize:parseFloat(getComputedStyle(footer).fontSize),
     footerMinHeight:parseFloat(getComputedStyle(footer).minHeight)
    };
   });
   expect(visual,route).not.toBeNull();
   expect(visual.headerGradient).toContain('linear-gradient');
   expect(visual.footerGradient).toContain('linear-gradient');
   expect(visual.footerFontSize).toBeGreaterThanOrEqual(10);
   expect(visual.footerMinHeight).toBeGreaterThanOrEqual(36);
   if(route==='/oportunidades'||route==='/presupuestos'){
    const archiveButton=footer.locator('.crm-trash-link');
    await expect(archiveButton).toBeVisible();
    expect(await archiveButton.evaluate(e=>getComputedStyle(e).borderRadius)).toBe('7px');
   }
  }
 }
});

test('Detalle de pedidos: resumen panorámico legible y sin scroll en escritorio habitual',async({page})=>{
 test.setTimeout(90000);
 for(const {width,height} of [{width:1664,height:900},{width:1440,height:900},{width:1366,height:900}]){
  await page.setViewportSize({width,height});
  await open(page,'/pedidos/PED-203');
  const overview=page.locator('.crm-order-overview-grid');
  await expect(overview).toBeVisible();
  for(const name of ['Productos y conceptos incluidos · presupuesto aceptado','Información general','Siguiente paso','Control económico privado']){
   await expect(overview.getByRole('heading',{name})).toBeVisible();
  }
  const v=await page.evaluate(()=>{
   const root=document.querySelector('.app-main');
   const grid=document.querySelector('.crm-order-overview-grid');
   const quote=grid?.querySelector('.crm-order-itemized-panel');
   const info=grid?.querySelector('.crm-order-overview-primary>.panel');
   const side=grid?.querySelector('.right-stack');
   if(!root||!grid||!quote||!info||!side)return null;
   const rect=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
   return {mainWidth:root.clientWidth,overflow:root.scrollHeight-root.clientHeight,
    scrollAreaHeight:root.clientHeight,scrollContentHeight:root.scrollHeight,
    quote:rect(quote),info:rect(info),side:rect(side),infoFont:parseFloat(getComputedStyle(info.querySelector('.info-item strong')).fontSize)};
  });
  expect(v,'La estructura debe mantener todas las secciones').not.toBeNull();
  expect(v.infoFont,'No encoger valores para hacerlos caber').toBeGreaterThanOrEqual(12.5);
  expect(v.overflow,'El resumen debe caber a '+width+'x'+height+' si no hay texto extenso').toBeLessThanOrEqual(3);
  expect(Math.abs(v.quote.y-v.info.y),'El desglose y la información deben ir en paralelo').toBeLessThanOrEqual(2);
  if(v.mainWidth>1390){
   expect(Math.abs(v.quote.y-v.side.y),'En escritorio ancho deben verse los tres grupos juntos').toBeLessThanOrEqual(2);
   expect(v.quote.x).toBeLessThan(v.info.x);
   expect(v.info.x).toBeLessThan(v.side.x);
  }else{
   expect(v.side.y).toBeGreaterThanOrEqual(v.quote.y+v.quote.height-2);
  }
 }
 await page.setViewportSize({width:390,height:750});
 await open(page,'/pedidos/PED-203');
 for(const name of ['Productos y conceptos incluidos · presupuesto aceptado','Información general','Siguiente paso','Control económico privado']){
  await expect(page.locator('.crm-order-overview-grid').getByRole('heading',{name})).toBeVisible();
 }
 expect(await page.locator('.crm-order-overview-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(1);
});

test('Agenda: solo calendario compacto, notas y tareas legibles en pantalla',async({page})=>{
 test.setTimeout(110000);
 for(const {width,height} of [{width:1440,height:900},{width:1024,height:850},{width:390,height:750}]){
  await page.setViewportSize({width,height});
  await open(page,'/agenda');
  await expect(page.getByRole('heading',{name:'Agenda y notas'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Calendario'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Notas internas'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Tareas de trabajo'})).toBeVisible();
  const v=await page.evaluate(()=>{
    const p=document.querySelector('.page-agenda.agenda-pro');
    const cal=p?.querySelector('.agenda-pro-calendar');
    const notes=p?.querySelector('.agenda-pro-notes');
    const tasks=p?.querySelector('.agenda-pro-tasks');
    const taskTitle=p?.querySelector('.agenda-pro-task-text strong');
    const notesLabel=p?.querySelector('.agenda-pro-notes .agenda-pro-heading h2');
    const noteDescription=p?.querySelector('.agenda-pro-notes .agenda-pro-heading p');
    const taskSearch=p?.querySelector('.agenda-pro-task-search input');
    const day=p?.querySelector('.agenda-pro-day');
    if(!p||!cal||!notes||!tasks||!notesLabel||!noteDescription||!taskSearch||!day)return null;
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
    return {cal:rect(cal),notes:rect(notes),tasks:rect(tasks),
      noteHeadingFont:parseFloat(getComputedStyle(notesLabel).fontSize),
      noteDescriptionFont:parseFloat(getComputedStyle(noteDescription).fontSize),
      taskFont:taskTitle?parseFloat(getComputedStyle(taskTitle).fontSize):null,
      searchFont:parseFloat(getComputedStyle(taskSearch).fontSize),
      dayHeight:day.getBoundingClientRect().height,
      pageScroll:getComputedStyle(p).overflowY,
      workspaceExists:!!p.querySelector('.agenda-pro-layout')
    };
  });
  expect(v,'La página contiene los tres módulos').not.toBeNull();
  expect(v.workspaceExists).toBeTruthy();
  expect(v.cal.width,'Solo calendario reducido').toBeLessThanOrEqual(350);
  expect(v.dayHeight,'Celda del calendario compacta').toBeLessThanOrEqual(35);
  expect(v.noteHeadingFont,'Título como resto de CRM').toBeGreaterThanOrEqual(15);
  expect(v.noteDescriptionFont,'Texto de los paneles legible').toBeGreaterThanOrEqual(12.8);
  expect(v.searchFont,'Búsqueda a tamaño normal').toBeGreaterThanOrEqual(13);
  if(v.taskFont!==null) expect(v.taskFont,'No encoger tareas').toBeGreaterThanOrEqual(13.8);
  if(width>=1200){
   expect(v.cal.x).toBeLessThan(v.notes.x);
   expect(v.notes.y,'Calendario y notas en la misma fila').toBeGreaterThanOrEqual(v.cal.y-2);
   expect(v.tasks.y,'Tareas bajo calendario y notas').toBeGreaterThanOrEqual(Math.max(v.notes.bottom,v.cal.bottom)-2);
   expect(v.tasks.bottom,'Los módulos habituales caben en pantalla: '+JSON.stringify(v)).toBeLessThanOrEqual(height+2);
  }else{
   expect(v.notes.y,'Las notas se colocan bajo el calendario en móvil/portátil').toBeGreaterThanOrEqual(v.cal.bottom-2);
   expect(v.tasks.y).toBeGreaterThanOrEqual(v.notes.bottom-2);
  }
 }
});
