// Verifica la base con los datos de demostración: entra con cada cuenta de demostración
// y comprueba lo que cada rol puede ver. Lo usa app/db/demo/probar_demo.sh.
import assert from 'node:assert/strict';
import pg from 'pg';
import { cargarConfig } from '../src/config.ts';
import { crearPool } from '../src/db.ts';
import { construirApp } from '../src/app.ts';

const cuentas: { numero: string; frase: string }[] = JSON.parse(process.env.NEXO_DEMO_CUENTAS ?? '[]');
const frase = (n: string) => cuentas.find(c => c.numero === n)!.frase;
const cfg = cargarConfig();
const pool = crearPool(cfg.databaseUrl);
const app = await construirApp(cfg, pool);
const sa = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
await sa.connect();
const E = (await sa.query('SELECT id FROM nexo.empresas LIMIT 1')).rows[0].id;
let ok = 0;
const comprobar = (nombre: string, cond: boolean, detalle = '') => { assert.ok(cond, nombre + ' ' + detalle); ok++; console.log('OK · ' + nombre + (detalle ? ' · ' + detalle : '')); };

const salud = await app.inject({ method: 'GET', url: '/api/salud' });
comprobar('El servicio responde y llega a la base', salud.statusCode === 200 && salud.json().base === 'ok');

async function sesion(numero: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/acceso/entrar', headers: { 'x-nexo': '1' }, payload: { empresaId: E, numero, frase: frase(numero) } });
  assert.equal(r.statusCode, 200, 'entrar ' + numero);
  const c = r.headers['set-cookie'];
  return String(Array.isArray(c) ? c[0] : c).split(';')[0];
}
async function total(numero: string): Promise<number> {
  const r = await app.inject({ method: 'GET', url: '/api/asignaciones', headers: { cookie: await sesion(numero) } });
  return r.json().total;
}
const q = async (sql: string) => Number((await sa.query(sql)).rows[0].n);
const todas = await q(`SELECT count(*) n FROM nexo.asignaciones WHERE estado = 'activa'`);
const deRosa = await q(`SELECT count(*) n FROM nexo.asignaciones a JOIN nexo.numeros_empleado e ON e.persona_id = a.persona_id WHERE e.numero = '004817'`);
const equipo = await q(`SELECT count(*) n FROM nexo.asignaciones a JOIN nexo.adscripciones d ON d.persona_id = a.persona_id AND d.vigencia @> current_date
                        JOIN nexo.areas r ON r.id = d.area_id JOIN nexo.turnos t ON t.id = d.turno_id WHERE r.nombre = 'Ensamble' AND t.clave = 'T2'`);

comprobar('Las 7 cuentas de demostración entran con su frase', (await Promise.all(cuentas.map(c => sesion(c.numero)))).length === 7);
comprobar('Administrador ve todas las asignaciones de la empresa', await total('000215') === todas, String(todas));
comprobar('RH ve todas las asignaciones de la empresa', await total('000412') === todas);
comprobar('Auditor ve todas las asignaciones de la empresa', await total('000533') === todas);
comprobar('Supervisora ve solo a su equipo (Ensamble · Turno 2)', await total('001920') === equipo, String(equipo));
const deInes = await q(`SELECT count(*) n FROM nexo.asignaciones a JOIN nexo.numeros_empleado e ON e.persona_id = a.persona_id WHERE e.numero = '001377'`);
comprobar('Instructora ve solo las suyas como trabajadora; su curso aún no está asignado en la demo', await total('001377') === deInes, String(deInes));
comprobar('Trabajadora ve solo las suyas', await total('004817') === deRosa, String(deRosa));
comprobar('Contratista con acceso vigente entra y ve lo suyo', await total('C-000123') > 0);
const malas = await app.inject({ method: 'POST', url: '/api/acceso/entrar', headers: { 'x-nexo': '1' }, payload: { empresaId: E, numero: '005530', frase: 'una frase cualquiera larga' } });
comprobar('Una persona sin cuenta activada no entra', malas.statusCode === 401);
comprobar('La base tiene historial: acreditaciones, constancias y bitácora',
  await q('SELECT count(*) n FROM nexo.acreditaciones') > 200 && await q('SELECT count(*) n FROM nexo.constancias') > 200 && await q('SELECT count(*) n FROM nexo.bitacora') > 1000);
comprobar('Las frases no se guardan en claro', await q(`SELECT count(*) n FROM nexo.cuentas WHERE estado = 'activa' AND hash_frase NOT LIKE '$argon2id$%'`) === 0);

await app.close(); await pool.end(); await sa.end();
console.log(`\n${ok} comprobaciones correctas`);
