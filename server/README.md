# Depofibra CRM v2 — API privada / primera fase de seguridad

**Estado: PROPUESTA EN PR, NO DESPLEGADA, NO APTA PARA PRODUCCIÓN.**
Este backend de primera fase añade solo inicio y cierre de sesión y verificación de cuenta. No sincroniza la interfaz React, no implementa las entidades comerciales ni sustituye `localStorage`. Quedan pendientes permisos sobre recursos, auditoría de negocio, persistencia CRM, alta/revocación de usuarios, copias cifradas fuera de VPS, tests de PostgreSQL real, RGPD y revisión de seguridad.

## Separación estricta
- BASE NUEVA: `depofibra_crm_v2` (ya creada vacía, propietario NOLOGIN `depofibra_v2_owner`).
- BASE ANTIGUA: `depofibra_crm` (**no tocar**).
- PROGRAMA ANTIGUO: `admin.depofibra.com` / 3000 (**no tocar**).
- API futura: escucha solamente en `127.0.0.1:3101`, detrás de Nginx HTTPS.
- En esta fase no hay cuentas precargadas; no se deben usar datos de clientes. La cadena CRM_DATABASE_URL se valida estrictamente: solo usuario depofibra_v2_api, BD depofibra_crm_v2 y localhost.

## Diseño de mínimos
- Contraseñas hasheadas con scrypt N=2^17,r=8,p=1 y sal aleatoria.
- Identidad real vía usuario/rol en PostgreSQL, no selector de rol de React.
- Sesiones aleatorias de 256 bits; SHA-256 de token en BD, cookie HttpOnly/Secure/SameSite=Strict con expiración de 8 horas.
- Origen HTTPS obligatorio para POST, sin CORS, respuestas sin caché y límite de cuerpo.
- Intentos de autenticación limitados globalmente en memoria (máx. 20/min por proceso) y bloqueos por cuenta en PostgreSQL; reforzar rate limit con Nginx y sistemas persistentes antes de publicar.
- Rol de aplicación SQL **sin propiedad de tablas** y con permisos de columnas mínimos.
- Audit trail de login; todavía NO auditoría completa comercial.

## Secuencia prevista (NO EJECUTAR AUTOMÁTICAMENTE)
1. Revisar PR, pruebas, configuración de restauración y permisos. Validar que el volumen real de datos de BD nueva es 0.
2. Ejecutar `sql/001_auth.sql` exclusivamente sobre `depofibra_crm_v2` con usuario postgres local y verificar tablas. El archivo falla si se repite y evita migraciones ambiguas.
3. Crear en PostgreSQL rol LOGIN de servicio `depofibra_v2_api` con contraseña fuerte y exclusiva, **sin pegarla en chat, script, historial ni repositorio**; ajustar acceso únicamente a localhost. Ejecutar `sql/002_runtime_grants.sql` después.
4. Configurar credenciales mediante archivo de entorno 0600 propiedad de cuenta de servicio aislada; no pasar secrets por argumentos ni permitir que usuario web vea archivos privados.
5. Ejecutar pruebas unitarias y de integración de GitHub Actions sobre PostgreSQL 18 EFÍMERO, con cuentas sintéticas solo en CI y prueba de denegación de escalada de rol SQL; ninguna cuenta de CI corresponde al VPS.
6. Instalar dependencia de backend desde `server/` y mantener `package-lock.json` verificado y versionado. Ejecutar pruebas `npm test`, migración y pruebas integradas en PostgreSQL.
7. Solo entonces arrancar API local `127.0.0.1:3101`; nunca exponer públicamente ese puerto. Acceso externo únicamente vía configuración Nginx HTTPS con /api proxy; verificar Origin y cabeceras reales.
8. Diseñar e integrar todas las pantallas React con API/DB y roles. **No habilitar todavía entrada de datos reales.**
9. Realizar backups cifrados externos, prueba de restauración aislada, revisión de seguridad, RGPD y aprobación de Dirección antes de producción.

No ejecutar ni instalar `compose.vps.yml` existente: Caddy intenta ocupar puertos 80/443 ya utilizados por Nginx. No usar el selector de roles de la demo como control de acceso.
