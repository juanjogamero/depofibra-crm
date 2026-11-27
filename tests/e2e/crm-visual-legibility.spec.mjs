import {test,expect} from '@playwright/test';

/* REG-CRM-UX · Cobertura visual transversal del frontend ORIGINAL.
   No escribe datos comerciales ni modifica el CRM real. Todas las rutas
   siguen siendo las existentes; aquí se comprueba que son accesibles. */
const root='http://127.0.0.1:4173/depofibra-crm/';
const routes=[
  '/','/oportunidades','/oportunidades/nueva','/oportunidades/OP-104',
  '/presupuestos','/presupuestos/nuevo','/presupuestos/PRE-022',
  '/clientes','/pedidos','/pedidos/PED-203','/comisiones','/agenda',
  '/resultados','/resultados/activity','/resultados/products',
  '/resultados/channels','/resultados/zones','/resultados/quotes',
  '/resultados/orders','/resultados/conversion','/resultados/sources',
  '/finanzas','/catalogo','/transporte',
  '/configuracion/perfil','/configuracion/actividad'
];

for(const viewport of [{width:1440,height:900},{width:390,height:750}]){
  test('Legibilidad y navegación en 26 rutas · '+viewport.width+'px',async({page})=>{
    test.setTimeout(180000);
    await page.setViewportSize(viewport);
    for(const route of routes){
      await page.goto(root+'#'+route);
      await expect(page.locator('.app-main .page').first(),route).toBeVisible();
      const metrics=await page.evaluate(()=>{
        const app=document.querySelector('.app-root');
        const pageEl=document.querySelector('.app-main .page');
        const heading=pageEl?.querySelector('h1');
        const field=pageEl?.querySelector('.form-field input,.form-field select,.op-search input');
        return {
          appFont:parseFloat(getComputedStyle(app).fontSize),
          headingSize:heading?parseFloat(getComputedStyle(heading).fontSize):null,
          horizontalOverflow:document.documentElement.scrollWidth-window.innerWidth,
          fieldFont:field?parseFloat(getComputedStyle(field).fontSize):null,
          hasVisualSystem:!!document.querySelector('link[href*="crm-global-legibility-20261127"]')
        };
      });
      expect(metrics.appFont,route+': texto base').toBeGreaterThanOrEqual(14);
      if(metrics.headingSize!==null){
        expect(metrics.headingSize,route+': titular legible').toBeGreaterThanOrEqual(20);
      }
      expect(metrics.horizontalOverflow,route+': no desbordar pantalla').toBeLessThanOrEqual(3);
      if(viewport.width<600&&metrics.fieldFont!==null){
        expect(metrics.fieldFont,route+': campos editables sin zoom en iOS').toBeGreaterThanOrEqual(16);
      }
    }
  });
}

test('Contraste y área clicable de navegación sin cambios de rutas',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(root+'#/');
  const dimensions=await page.locator('.sidebar-reference .nav-link').first().evaluate(el=>{
    const css=getComputedStyle(el);
    return {height:el.getBoundingClientRect().height,fontSize:parseFloat(css.fontSize)};
  });
  expect(dimensions.height).toBeGreaterThanOrEqual(42);
  expect(dimensions.fontSize).toBeGreaterThanOrEqual(13);
  await expect(page.locator('.sidebar-reference a[href="#/oportunidades"]')).toBeAttached();
  await expect(page.locator('.sidebar-reference a[href="#/catalogo"]')).toBeAttached();
});
