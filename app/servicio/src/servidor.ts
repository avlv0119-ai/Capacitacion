// Punto de entrada: node --experimental-strip-types src/servidor.ts
import { cargarConfig } from './config.ts';
import { crearPool, sinUsuario } from './db.ts';
import { construirApp } from './app.ts';

const cfg = cargarConfig();
const pool = crearPool(cfg.databaseUrl);
const app = await construirApp(cfg, pool);
await app.listen({ port: cfg.puerto, host: '0.0.0.0' });

// Proceso diario (renovaciones dentro de la ventana de aviso): al arrancar y cada hora; es idempotente.
async function procesoDiario() {
  try { await sinUsuario(pool, c => c.query('SELECT nexo.proceso_diario()')); }
  catch (e) { console.error('Proceso diario: ' + (e as Error).message); }
}
await procesoDiario();
const reloj = setInterval(procesoDiario, 60 * 60 * 1000);

for (const senal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(senal, async () => { clearInterval(reloj); await app.close(); await pool.end(); process.exit(0); });
}
