# DEPOFIBRA CRM v2 — versión operativa sobre la interfaz original

**Estado 27/11/2026:** implementación inicial en rama; NO desplegada ni aprobada para datos reales.

## Objetivo aprobado
Conservar el diseño, navegación, formularios y operaciones del CRM original `src/`.
Convertirlo en herramienta real para Depofibra con PostgreSQL, sesiones seguras y
versiones incrementales. No sustituirlo por la UI mínima de la rama `secure/`.

## Integración realizada en esta rama
- UI original sin reconstrucción visual, compilación separada `npm run build:real`
  en `dist-real`. No modifica GitHub Pages ni `main`.
- Acceso de Dirección mediante `/api/login`, `/api/me` y `/api/logout`;
  sin selector de roles simulado.
- Carga de datos desde `GET /api/workspace`, datos iniciales vacíos y
  sin carga de `mockData` ni almacenamiento `localStorage` comercial en modo real.
- Guardado de operaciones del CRM mediante `PUT /api/workspace` con revisión
  anterior y control de cambios concurrentes. Ante fallo se bloquea
  seguir guardando y se muestra aviso; no sobrescribir cambios de otra sesión.
- Persistencia PostgreSQL en `crm.business_workspace` y auditoría por revisión
  en `crm.business_workspace_events` (migración 004).
- A diferencia de la demo, el usuario de Oficina todavía NO tiene acceso
  al espacio completo: solo `direccion`, validado por servidor.

## Limitaciones que exigen validación antes del uso
- La persistencia JSONB versionada es un puente para empezar a trabajar sobre
  todas las pantallas sin reescribirlas. No es todavía un modelo relacional
  separado de clientes/presupuestos/pedidos. Probar completamente referencias,
  cálculos e integridad de cada flujo.
- No existe sincronización offline. Una escritura sin respuesta del servidor
  se considera NO CONFIRMADA. No cerrar la pestaña con cambios pendientes.
- La bitácora guarda revisión, autor y hash del conjunto; no un diff de cada
  campo. Auditoría detallada por acción y control de roles Oficina pendientes.
- Límite inicial de estado: ~1 MiB. Hay que migrar a tablas por entidad
  antes de que aumente el volumen operativo.
- No enviar/registrar clientes reales ni datos privados hasta probar respaldo,
  restauración y QA en navegador. Las tarifas iniciales son 0/no configuradas,
  no precios de transporte garantizados.
- Los documentos generados o enlaces a fabricantes de la demo no significan
  automatización real de envío, factura o logística. Verificar cada proceso.

## Secuencia de despliegue técnico (solo después de revisar y respaldar)
1. Checkout aislado de esta rama; `npm install` y `npm run build:real`.
2. Verificar base destino `depofibra_crm_v2` y backup restaurable previo.
3. Inspeccionar y ejecutar exclusivamente `server/sql/004_business_workspace.sql`
   como `postgres`, nunca contra la base heredada.
4. Probar transacción inicial/lectura/guardado/control de versión y doble
   pestaña con datos ficticios no personales, después BORRAR LAS PRUEBAS
   mediante restauración verificada de snapshot limpio; no importar demo.
5. Copiar `dist-real` a nuevo staging root-owned, verificar hash/diff;
   cambio de Nginx IP-restringido solo con respaldo y rollback automático.
6. E2E en navegador: login real → oportunidad → presupuesto con partidas →
   aceptación → cliente/pedido → agenda → informe → logout → reingreso →
   persistencia confirmada. Revisión comercial de importes, permisos y
   descarga de información.
7. Comprobar copia nocturna, recuperación y respuesta a pérdida de sesión.
8. Aprobar visualmente con Dirección y documentar release + etiqueta Git
   inmutable; solo entonces habilitar uso real de negocio.

**No cambiar** `admin.depofibra.com`, la BD `depofibra_crm` ni la web pública.
La UI mínima `secure/` sirve de referencia técnica, no es la interfaz final.

## Política de versiones
- Rama de integración: `feat/crm-original-ui-persistencia-real-20261127`.
- Primer candidato: `v2.0-rc` únicamente después de migración/QA; NO
  crear etiqueta o publicar sin pruebas.
- Posteriores `v2.1`, `v2.2` por funcionalidades, con backup,
  migraciones reversibles, pruebas y decisión documentada.
