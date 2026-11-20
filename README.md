# Depofibra CRM · Frontend de desarrollo

Aplicación de gestión comercial de **Depofibra**, actualmente en fase de diseño y validación funcional.

**⚠️ Entorno público de demostración:** datos 100 % ficticios, almacenamiento local del navegador, perfiles simulados. No usar con datos personales reales, importes confidenciales, facturas reales o credenciales. No existe autenticación, base de datos, correo ni integración bancaria real.

## Tecnología

React + TypeScript + Vite, rutas por hash (compatibles con GitHub Pages), CSS modular con tokens corporativos, iconos Lucide.

## Desarrollo

Requisitos: Node.js 22 y npm.

\`\`\`bash
npm ci
npm run dev
npm run build
\`\`\`

## Publicación

La acción \`.github/workflows/deploy.yml\` compila el proyecto en cada PR y, al fusionar en \`main\`, publica \`dist\` en GitHub Pages. En **Settings > Pages**, elegir **GitHub Actions** como origen de despliegue.

URL esperada una vez activado Pages: https://juanjogamero.github.io/depofibra-crm/

## Límites actuales

- Formularios, interacciones, estados y cálculos utilizan exclusivamente datos ficticios y el almacenamiento local del navegador.
- Dirección y Fábrica son **vistas de demostración**, no permisos de seguridad. No hay login.
- La calculadora de transporte es una referencia interna orientativa; para cotizar, confirmar origen real, condiciones de carga/descarga y precio vigente.
- Facturas, proformas y documentos oficiales los emite la oficina del fabricante; en esta demo no se generan.
- Conexiones con VPS, API, PostgreSQL, GA4 y Search Console pertenecen a fases posteriores y necesitan autorización y revisión de seguridad.
- La web pública depofibra.com no se modifica desde este repositorio.

## Diseño

Inspiración visual proporcionada por Dirección: Aurex CRM (navegación y ficha), Skote y Rubick (paneles corporativos), Tradedoubler (informes limpios) y referencia de tablas profesionales. Identidad Depofibra: azul \`#01488e\`, azul oscuro \`#002d59\`, Plus Jakarta Sans + Inter.

## Proceso

Cambios mediante ramas y PR, revisión por Dirección y QA funcional antes de publicar.
