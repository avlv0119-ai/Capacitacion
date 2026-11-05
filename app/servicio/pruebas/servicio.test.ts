// Pruebas de integración del servicio contra PostgreSQL real (base temporal creada por ejecutar.sh).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import { cargarConfig } from '../src/config.ts';
import { crearPool } from '../src/db.ts';
import { construirApp } from '../src/app.ts';
import { hashFrase } from '../src/seguridad.ts';

const E1 = 'b0000000-0000-0000-0000-000000000001', E3 = 'b0000000-0000-0000-0000-000000000003';
const ID = { admin: '10000000-0000-0000-0000-000000000001', rh: '10000000-0000-0000-0000-000000000002', sup: '10000000-0000-0000-0000-000000000003',
  ins: '10000000-0000-0000-0000-000000000004', aud: '10000000-0000-0000-0000-000000000005', rosa: '10000000-0000-0000-0000-000000000006',
  marisol: '10000000-0000-0000-0000-000000000007', jorge: '10000000-0000-0000-0000-000000000008', pedro: '10000000-0000-0000-0000-000000000009' };
const NUM = { admin: '000215', rh: '000412', sup: '001920', ins: '001377', aud: '000533', rosa: '004817', marisol: '005530', pedro: 'C-000123' };
const FRASE = 'mesa verde cuarto turno';

let app: FastifyInstance, pool: pg.Pool, sa: pg.Client;

before(async () => {
  const cfg = cargarConfig();
  pool = crearPool(cfg.databaseUrl);
  app = await construirApp(cfg, pool);
  sa = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
  await sa.connect();
  const h = await hashFrase(FRASE);
  for (const k of ['admin', 'rh', 'sup', 'ins', 'aud', 'marisol', 'pedro'] as const) {
    await sa.query(`INSERT INTO nexo.cuentas (persona_id, grupo_id, estado, hash_frase) VALUES ($1, 'a0000000-0000-0000-0000-000000000001', 'activa', $2)`, [ID[k], h]);
  }
});
after(async () => { await app.close(); await pool.end(); await sa.end(); });

type Resp = { status: number; json: any; cookie: string | undefined; setCookie: string | undefined; headers: Record<string, unknown> };
async function pedir(metodo: 'GET' | 'POST', url: string, cuerpo?: object, cookie?: string, sinCabecera = false): Promise<Resp> {
  const r = await app.inject({ method: metodo, url, payload: cuerpo, headers: { ...(sinCabecera ? {} : { 'x-nexo': '1' }), ...(cookie ? { cookie } : {}) } });
  const sc = r.headers['set-cookie'];
  const setCookie = Array.isArray(sc) ? sc[0] : sc;
  return { status: r.statusCode, json: r.body ? JSON.parse(r.body) : null, setCookie, cookie: setCookie?.split(';')[0], headers: r.headers };
}
const entrar = (numero: string, frase = FRASE, extra: object = {}, empresaId = E1) => pedir('POST', '/api/acceso/entrar', { empresaId, numero, frase, ...extra });

test('Inicio de sesión del administrador en equipo compartido: cookie segura y de sesión', async () => {
  const r = await entrar(NUM.admin);
  assert.equal(r.status, 200);
  assert.equal(r.json.espacio, 'administrar');
  assert.match(r.setCookie!, /HttpOnly/);
  assert.match(r.setCookie!, /Secure/);
  assert.match(r.setCookie!, /SameSite=Strict/);
  assert.doesNotMatch(r.setCookie!, /Max-Age/, 'en equipo compartido la cookie no persiste');
  assert.equal(r.json.inactividadMinutos, 5);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
});

test('Mismo mensaje para número inexistente y frase incorrecta (no revela números válidos)', async () => {
  const a = await entrar('999999');
  const b = await entrar(NUM.rh, 'frase equivocada larga');
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.deepEqual(a.json, b.json);
});

test('Cuenta sin activar y contratista con acceso vencido no entran', async () => {
  assert.equal((await entrar(NUM.rosa)).status, 401);
  assert.equal((await entrar(NUM.pedro)).status, 401, 'acceso de contratista vencido (RF-ACC-09)');
});

test('Escrituras sin el encabezado propio se rechazan (protección contra otros sitios)', async () => {
  const r = await pedir('POST', '/api/acceso/entrar', { empresaId: E1, numero: NUM.admin, frase: FRASE }, undefined, true);
  assert.equal(r.status, 403);
});

let codigoRosa = '';
test('Permisos para generar códigos: solo el Administrador, dentro de su alcance y nunca para sí mismo', async () => {
  const adm = (await entrar(NUM.admin)).cookie!;
  const rh = (await entrar(NUM.rh)).cookie!;
  const sup = (await entrar(NUM.sup)).cookie!;
  assert.equal((await pedir('POST', `/api/admin/personas/${ID.rosa}/codigo`, { tipo: 'activacion' }, rh)).status, 403, 'RH no');
  assert.equal((await pedir('POST', `/api/admin/personas/${ID.rosa}/codigo`, { tipo: 'activacion' }, sup)).status, 403, 'supervisora no');
  assert.equal((await pedir('POST', `/api/admin/personas/${ID.admin}/codigo`, { tipo: 'restablecimiento', motivo: 'x', identidadVerificada: true }, adm)).status, 403, 'a sí mismo no');
  assert.equal((await pedir('POST', `/api/admin/personas/${ID.jorge}/codigo`, { tipo: 'activacion' }, adm)).status, 404, 'otra empresa: no la ve');
  const r = await pedir('POST', `/api/admin/personas/${ID.rosa}/codigo`, { tipo: 'activacion' }, adm);
  assert.equal(r.status, 201);
  assert.match(r.json.codigo, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  codigoRosa = r.json.codigo;
  const db = await sa.query(`SELECT hash_codigo FROM nexo.codigos_acceso WHERE persona_id = $1`, [ID.rosa]);
  assert.match(db.rows[0].hash_codigo, /^[0-9a-f]{64}$/);
  assert.notEqual(db.rows[0].hash_codigo, codigoRosa, 'la base guarda solo la huella del código');
});

test('Activación con la ficha: frase débil rechazada, código de un solo uso, huella Argon2id', async () => {
  const debil = await pedir('POST', '/api/acceso/activar', { empresaId: E1, numero: NUM.rosa, codigo: codigoRosa, frase: 'corta' });
  assert.equal(debil.status, 400); assert.match(debil.json.error, /al menos 12/);
  const conNumero = await pedir('POST', '/api/acceso/activar', { empresaId: E1, numero: NUM.rosa, codigo: codigoRosa, frase: 'rosa 004817 fuerte' });
  assert.equal(conNumero.status, 400); assert.match(conNumero.json.error, /número de empleado/);
  const ok = await pedir('POST', '/api/acceso/activar', { empresaId: E1, numero: NUM.rosa, codigo: codigoRosa.toLowerCase(), frase: 'cielo naranja en la línea' });
  assert.equal(ok.status, 204);
  const reuso = await pedir('POST', '/api/acceso/activar', { empresaId: E1, numero: NUM.rosa, codigo: codigoRosa, frase: 'otra frase muy distinta' });
  assert.equal(reuso.status, 400, 'el código no se puede reutilizar');
  const h = await sa.query('SELECT hash_frase FROM nexo.cuentas WHERE persona_id = $1', [ID.rosa]);
  assert.match(h.rows[0].hash_frase, /^\$argon2id\$/);
  const r = await entrar(NUM.rosa, 'cielo naranja en la línea');
  assert.equal(r.status, 200); assert.equal(r.json.espacio, 'aprender');
});

test('El número de empleado se resuelve por empresa: el mismo número en otra empresa es otra cuenta', async () => {
  assert.equal((await entrar(NUM.rosa, 'cielo naranja en la línea', {}, E3)).status, 401);
});

test('Demora progresiva tras fallos, sin bloqueo permanente', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await entrar(NUM.marisol, 'equivocada número ' + i)).status, 401);
  const bloqueado = await entrar(NUM.marisol);
  assert.equal(bloqueado.status, 429);
  assert.ok(Number(bloqueado.headers['retry-after']) > 0);
  await sa.query(`UPDATE nexo.intentos_acceso SET ocurrido_en = ocurrido_en - interval '2 minutes'`);
  assert.equal((await entrar(NUM.marisol)).status, 200, 'pasada la espera vuelve a poder entrar');
});

test('Equipo compartido: la sesión se cierra tras 5 minutos sin actividad', async () => {
  const c = (await entrar(NUM.rosa, 'cielo naranja en la línea')).cookie!;
  assert.equal((await pedir('GET', '/api/yo', undefined, c)).status, 200);
  await sa.query(`UPDATE nexo.sesiones SET ultimo_uso = now() - interval '6 minutes' WHERE persona_id = $1 AND revocada_en IS NULL`, [ID.rosa]);
  const r = await pedir('GET', '/api/yo', undefined, c);
  assert.equal(r.status, 401);
  assert.match(r.setCookie ?? '', /nexo_sesion=;/, 'se borra la cookie');
});

test('Dispositivo personal: la sesión se recuerda 30 días; un rol administrativo no se recuerda', async () => {
  const p = await entrar(NUM.rosa, 'cielo naranja en la línea', { equipoPersonal: true });
  assert.match(p.setCookie!, /Max-Age=2592000/);
  const a = await entrar(NUM.admin, FRASE, { equipoPersonal: true });
  assert.doesNotMatch(a.setCookie!, /Max-Age/);
  assert.equal(a.json.inactividadMinutos, 30);
});

test('Salir cierra la sesión en el servidor', async () => {
  const c = (await entrar(NUM.aud)).cookie!;
  assert.equal((await pedir('POST', '/api/acceso/salir', {}, c)).status, 204);
  assert.equal((await pedir('GET', '/api/yo', undefined, c)).status, 401);
});

test('Restablecer acceso: motivo e identidad obligatorios, cierra sesiones y queda en bitácora', async () => {
  const adm = (await entrar(NUM.admin)).cookie!;
  const rosa = (await entrar(NUM.rosa, 'cielo naranja en la línea')).cookie!;
  assert.equal((await pedir('POST', `/api/admin/personas/${ID.rosa}/codigo`, { tipo: 'restablecimiento', identidadVerificada: true }, adm)).status, 400);
  assert.equal((await pedir('POST', `/api/admin/personas/${ID.rosa}/codigo`, { tipo: 'restablecimiento', motivo: 'Olvidó su frase' }, adm)).status, 400);
  const r = await pedir('POST', `/api/admin/personas/${ID.rosa}/codigo`, { tipo: 'restablecimiento', motivo: 'Olvidó su frase', identidadVerificada: true }, adm);
  assert.equal(r.status, 201);
  assert.equal((await pedir('GET', '/api/yo', undefined, rosa)).status, 401, 'sus sesiones abiertas se cerraron');
  assert.equal((await pedir('POST', '/api/acceso/activar', { empresaId: E1, numero: NUM.rosa, codigo: r.json.codigo, frase: 'nueva frase de rosa larga' })).status, 204);
  assert.equal((await entrar(NUM.rosa, 'cielo naranja en la línea')).status, 401, 'la frase anterior ya no sirve');
  assert.equal((await entrar(NUM.rosa, 'nueva frase de rosa larga')).status, 200);
  const b = await sa.query(`SELECT accion, actor_id, despues FROM nexo.bitacora WHERE tabla = 'codigos_acceso' AND motivo = 'Olvidó su frase' ORDER BY id`);
  assert.deepEqual(b.rows.map(x => x.accion), ['INSERT', 'UPDATE'], 'se registra la generación y el uso del código');
  assert.equal(b.rows[0].actor_id, ID.admin, 'quién lo generó');
  assert.ok(b.rows.every(x => x.despues.hash_codigo === undefined), 'la bitácora no guarda la huella del código');
  const n = await sa.query(`SELECT count(*)::int AS n FROM nexo.bitacora WHERE accion = 'Crear nueva frase tras restablecimiento' AND actor_id = $1`, [ID.rosa]);
  assert.equal(n.rows[0].n, 1);
});

test('Asignaciones visibles: la base limita a la empresa y el servicio aplica el alcance fino', async () => {
  const esperado: Record<string, number> = { admin: 5, rh: 5, aud: 5, sup: 4, ins: 3 };
  for (const [k, n] of Object.entries(esperado)) {
    const c = (await entrar(NUM[k as keyof typeof NUM])).cookie!;
    const r = await pedir('GET', '/api/asignaciones', undefined, c);
    assert.equal(r.json.total, n, k);
  }
  const rosa = (await entrar(NUM.rosa, 'nueva frase de rosa larga')).cookie!;
  const r = await pedir('GET', '/api/asignaciones', undefined, rosa);
  assert.equal(r.json.total, 2, 'la trabajadora ve solo las suyas');
  assert.ok(r.json.asignaciones.every((a: { personaId: string }) => a.personaId === ID.rosa));
});

test('Sin sesión no hay datos', async () => {
  assert.equal((await pedir('GET', '/api/asignaciones')).status, 401);
  assert.equal((await pedir('GET', '/api/yo')).status, 401);
});
