import { Database } from './database.mjs';
import { createApiServer } from './http.mjs';

const port = Number(process.env.CRM_API_PORT || 3101);
const origin = process.env.CRM_ORIGIN;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto inválido');
if (!origin || !/^https:\/\/[^/]+$/.test(origin)) throw new Error('CRM_ORIGIN HTTPS requerido');

const store = new Database();
await store.health();
const server = createApiServer(store, origin);

// Nunca aceptar 0.0.0.0: el acceso externo debe pasar por Nginx/HTTPS.
server.listen(port, '127.0.0.1', () => console.log(`CRM API privada escuchando en 127.0.0.1:${port}`));
const shutdown = () => server.close(async () => { await store.close(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
