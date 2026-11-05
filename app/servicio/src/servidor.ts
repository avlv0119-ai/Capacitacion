// Punto de entrada: node --experimental-strip-types src/servidor.ts
import { cargarConfig } from './config.ts';
import { crearPool } from './db.ts';
import { construirApp } from './app.ts';

const cfg = cargarConfig();
const pool = crearPool(cfg.databaseUrl);
const app = await construirApp(cfg, pool);
await app.listen({ port: cfg.puerto, host: '0.0.0.0' });

for (const senal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(senal, async () => { await app.close(); await pool.end(); process.exit(0); });
}
