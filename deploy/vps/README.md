# Depofibra CRM · despliegue VPS PRIVADO DE PRUEBAS

**Estado (26/11/2026): PREPARADO para instalación; NO INSTALADO en ningún VPS.**
No se han recibido credenciales/arquitectura ni se ha seleccionado dominio o proveedor de hosting.
Esta entrega **NO** activa una base de datos, usuarios, roles reales ni envío de avisos.

## Para qué sirve este paquete

Arrancar la aplicación actual en el VPS, desde la **rama/versión aprobada del código**,
mediante contenedor web estático, certificado HTTPS automático y una contraseña de
acceso general (HTTP Basic Auth) delante de **todas** las rutas. La aplicación se
compila para la ruta raíz `/` sin modificar GitHub Pages (que mantiene
`/depofibra-crm/`). El pie superior visible indica **VPS · entorno de pruebas**.

No constituye un sistema de usuarios. Dirección/Fábrica siguen siendo solo VISTAS
SIMULADAS, el botón «Salir» no revoca una sesión y los cambios continúan guardados
en `localStorage` del navegador. **Solo datos ficticios**, aunque tenga HTTPS
y Basic Auth.

## Requisitos previos de instalación

- VPS Linux de confianza y actualizado, con SSH mediante claves y acceso administrado.
- Docker Engine con el plugin `docker compose`, Git y un dominio/subdominio
  **aprobado por Dirección** que apunte mediante DNS A/AAAA a la IP pública del VPS.
- Puertos 80 y 443 (TCP; 443 UDP opcional) accesibles a Caddy y sin otro servicio
  que ya los ocupe. **Si hay otro proxy o web en ese VPS, NO arranques esta
  configuración de puertos:** integrar primero la ruta en el proxy existente,
  evitando interrumpir `depofibra.com`.
- Contraseña fuerte, única, guardada en un gestor de contraseñas, sin enviarla por chat.
- Aprobación del propietario del VPS/dominio para intervenir y comprobación de
  backups/puertos/otras aplicaciones. Sin cambiar DNS ni infraestructura sin autorización.

## Instalación (solo cuando se conozca el VPS y dominio)

```bash
git clone https://github.com/juanjogamero/depofibra-crm.git
cd depofibra-crm
# Fijar un commit probado, nunca confiar ciegamente en un HEAD futuro.
git checkout <SHA_VALIDADO_EN_EL_REGISTRO>
cp .env.vps.example .env.vps
chmod 600 .env.vps
```

Editar **solo en el servidor** los campos `CRM_DOMAIN`,
`CRM_ACME_EMAIL`, `CRM_GATE_USER` y
`CRM_GATE_PASSWORD_HASH`. Para generar el hash sin pasar la contraseña
en argumentos de proceso ni guardarla en el historial:

```bash
docker run --rm -it caddy:2.10-alpine caddy hash-password
```

El comando solicitará la contraseña sin mostrarla. Pegar el hash devuelto entre
**comillas simples** en `.env.vps`, conservando los caracteres `$`.
Comprobar y arrancar:

```bash
npm run vps:preflight           # o: node scripts/vps-preflight.mjs
docker compose --env-file .env.vps -f compose.vps.yml config --quiet
docker compose --env-file .env.vps -f compose.vps.yml build preview
docker compose --env-file .env.vps -f compose.vps.yml up -d
docker compose --env-file .env.vps -f compose.vps.yml ps
docker compose --env-file .env.vps -f compose.vps.yml logs --tail=50 caddy
```

Visitar `https://<CRM_DOMAIN>/`, comprobar que solicita usuario/contraseña,
que el navegador confirma el certificado, que aparece **VPS · entorno de pruebas**
y que las páginas funcionan con registros de ejemplo. Comprobar:
- HTTP 401 sin credenciales para `/` y para activos; HTTP 200 con acceso.
- HTTP a HTTPS y cabeceras `X-Robots-Tag: noindex`, HSTS, no-store.
- `/api/` muestra 503: **backend todavía no configurado**.
- No existen servicios internos publicados (`docker compose ps`).
- Vista Dirección/Fábrica simuladas, sin introducir información real.

### Actualizaciones y reversión

Registrar versión SHA e incidencias antes de cambiar nada. Para actualizar:
`git checkout <NUEVO_SHA_APROBADO>`, ejecutar QA y `docker compose ... up -d --build`.
Si falla, volver al SHA previo y repetir `up -d --build`.
La demo usa datos por navegador, no migración central; **no borrar el
almacenamiento local ni confundirlo con copia recuperable del servidor**.
Respaldar **fuera del servidor** el directorio/configuración privada y el
volumen de Caddy de certificados; probar su recuperación.

### Qué falta antes de la PRODUCCIÓN REAL (T-097 y tareas relacionadas)

1. Backend con API validada y PostgreSQL (datos centrales, transacciones,
   claves/IDs únicos y control de concurrencia).
2. Inicio/cierre de sesión real, recuperación de cuenta, cookies seguras,
   CSRF, límites de intentos, y permisos efectivos en servidor
   **Dirección/Oficina** para ocultar importes, comisiones, clientes y
   proveedores no autorizados. El selector local de rol debe eliminarse.
3. Registro de auditoría inalterable de acciones críticas, incluidos
   verificación de pagos, cambios de pedidos, tarifas y permisos (T-077).
4. Migración conservadora desde export JSON de cada navegador (T-085):
   reconciliar ejemplos frente a reales, deduplicar IDs y relaciones,
   no inferir importes históricos, importar **en staging**, comparar
   cantidades/totalizaciones y realizar copia+rollback antes de cortar.
5. Copias cifradas programadas de PostgreSQL y archivos, retención y
   restauración probada de extremo a extremo, monitoreo y alerta por fallos.
6. RGPD: información, contratos/proveedor, accesos, retención, derechos,
   incidentes y decisión sobre el alojamiento antes de usar datos personales.
7. Almacenamiento privado real de PDFs (T-089) con autorización y escaneo;
   notificaciones reales por correo/WhatsApp (T-084) solo tras aprobar
   proveedor, destinatarios y condiciones de consentimiento.
8. Pruebas de seguridad y regresión en VPS accesible bajo HTTPS, permisos
   entre cuentas, concurrencia, backups/restore y rollback. Firma de
   validación de Dirección antes del uso real. 
9. Regla de archivo de ofertas a 20 días en servidor (T-088), evitando
   archivar aceptadas/con pedido; jobs idempotentes y con auditoría.

**No hacer**: guardar claves en variables `VITE_*` del cliente, publicar
`.env.vps`, insertar datos reales en la demo, cargar documentos privados
por `index.html` o tomar Basic Auth como sustituto de permisos CRM.
No se modifica `depofibra.com` ni el flujo comercial público.

Criterio de cierre: se puede declarar **PREVIEW VPS ARRANCADA** solo tras
verificarlo en un servidor real. Se puede declarar **PRODUCCIÓN AUTORIZADA**
solo al superar los nueve controles anteriores y con aprobación expresa.
