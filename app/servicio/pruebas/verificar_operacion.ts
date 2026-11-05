// Recorrido completo de operación sobre la base con los datos de demostración, a través del servicio:
// asignar → aprender → evaluar → validar la práctica → acreditar y emitir constancia → confirmar → reemitir,
// más excepciones, exportaciones, ranking y controles de permiso. Lo usa app/db/demo/probar_demo.sh.
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
const E = (await app.inject({ method: 'GET', url: '/api/acceso/empresas' })).json().empresas[0].id;
let ok = 0;
const comprobar = (nombre: string, cond: boolean, detalle = '') => { assert.ok(cond, nombre + ' ' + detalle); ok++; console.log('OK · ' + nombre + (detalle ? ' · ' + detalle : '')); };

const galletas = new Map<string, string>();
async function sesion(numero: string) {
  if (galletas.has(numero)) return galletas.get(numero)!;
  const r = await app.inject({ method: 'POST', url: '/api/acceso/entrar', headers: { 'x-nexo': '1' }, payload: { empresaId: E, numero, frase: frase(numero) } });
  assert.equal(r.statusCode, 200, 'entrar ' + numero);
  const c = String([r.headers['set-cookie']].flat()[0]).split(';')[0];
  galletas.set(numero, c); return c;
}
async function get(numero: string, url: string) { return app.inject({ method: 'GET', url, headers: { cookie: await sesion(numero) } }); }
async function post(numero: string, url: string, payload: object) { return app.inject({ method: 'POST', url, headers: { cookie: await sesion(numero), 'x-nexo': '1' }, payload }); }

// ---------- Estado por rol ----------
const eRosa = (await get('004817', '/api/estado')).json();
comprobar('La trabajadora recibe solo sus datos', eRosa.personas.length === 1 && eRosa.alcance.nivel === 'propio', eRosa.personas[0].nombre);
comprobar('Las preguntas de evaluación llegan sin la respuesta correcta', Object.values(eRosa.CURSOS).every((c: any) => c.banco.every((q: any) => !('ok' in q))));
comprobar('Los 5 cursos tienen lecciones navegables', Object.values(eRosa.CURSOS).every((c: any) => c.niveles.length > 0), Object.keys(eRosa.CURSOS).join(', '));
comprobar('El ranking del equipo respeta la participación voluntaria', eRosa.ranking.filter((x: any) => x.participa).length >= 5 && eRosa.ranking.every((x: any) => x.participa || x.yo));
const eLaura = (await get('001920', '/api/estado')).json();
comprobar('La supervisora ve a su equipo y valida sus cursos', eLaura.alcance.nivel === 'equipo' && eLaura.yo.valida.includes('C2') && eLaura.alcance.personas.length > 10, eLaura.alcance.etiqueta);
const eAna = (await get('000412', '/api/estado')).json();
comprobar('RH ve toda la empresa y la bitácora', eAna.alcance.personas.length === 116 && eAna.bit.length > 0);
const eIn = (await get('001377', '/api/estado')).json();
comprobar('La instructora ve solo sus cursos a cargo', eIn.alcance.nivel === 'cursos' && eIn.alcance.cursos.join() === 'C2');

// ---------- Asignar: RH crea la regla de «Orden y limpieza del área» para Ensamble ----------
const ens = eAna.org.areas.find((a: any) => a.nombre === 'Ensamble').id;
const sinPermiso = await post('004817', '/api/reglas', { curso: 'C2', areas: [ens], turnos: ['T1', 'T2', 'T3'], dias: 30 });
comprobar('Una trabajadora no puede crear reglas', sinPermiso.statusCode === 403);
const regla = await post('000412', '/api/reglas', { curso: 'C2', areas: [ens], turnos: ['T1', 'T2', 'T3'], dias: 30, contratistas: true });
comprobar('RH crea la regla y asigna el curso a Ensamble', regla.statusCode === 200 && regla.json().creadas === 36, String(regla.json().creadas));
const repetida = await post('000412', '/api/reglas', { curso: 'C2', areas: [ens], turnos: ['T1', 'T2', 'T3'], dias: 30 });
comprobar('Una segunda regla igual no duplica asignaciones', repetida.json().creadas === 0);

// ---------- Aprender: Rosa completa las 4 lecciones en orden ----------
let est = (await get('004817', '/api/estado')).json();
const asig = est.asigs.find((a: any) => a.curso === 'C2');
let part = est.parts.find((p: any) => p.asig === asig.id);
const fuera = await post('004817', '/api/aprender/leccion', { participacion: part.id, leccion: 'L3', correctas: 2 });
comprobar('Las lecciones se completan en orden', fuera.statusCode === 400);
let puntos = 0;
for (const l of ['L1', 'L2', 'L3', 'L4']) {
  const r = await post('004817', '/api/aprender/leccion', { participacion: part.id, leccion: l, correctas: 9, perfecta: true });
  assert.equal(r.statusCode, 200, r.body); puntos += r.json().puntos;
}
est = (await get('004817', '/api/estado')).json();
part = est.parts.find((p: any) => p.id === part.id);
comprobar('Las lecciones quedan guardadas y la participación se liga a la versión vigente', part.hechas.length === 4 && part.version === 3 && !!part.inicio);
comprobar('Los puntos respetan el tope diario de 200', puntos <= 200 && puntos > 0, puntos + ' puntos');
const ajena = await post('001920', '/api/aprender/leccion', { participacion: part.id, leccion: 'L1' });
comprobar('Nadie avanza en el curso de otra persona', ajena.statusCode === 403 || ajena.statusCode === 404);

// ---------- Evaluar: el servidor elige preguntas y califica ----------
const ex = await post('004817', '/api/aprender/examen', { participacion: part.id });
part = ex.json().estado.parts.find((p: any) => p.id === part.id);
const intento = part.intentos.find((i: any) => !i.fecha);
comprobar('El servidor abre un intento con 5 preguntas', ex.statusCode === 200 && intento.qs.length === 5);
const reabrir = await post('004817', '/api/aprender/examen', { participacion: part.id });
comprobar('Reabrir la evaluación retoma el mismo intento', reabrir.json().estado.parts.find((p: any) => p.id === part.id).intentos.length === 1);
const banco = (await sa.query(`SELECT v.contenido->'banco' AS b FROM nexo.versiones_curso v JOIN nexo.cursos c ON c.id = v.curso_id WHERE c.clave = 'C2'`)).rows[0].b;
for (const [k, q] of intento.qs.entries()) {
  const r = await post('004817', '/api/aprender/examen/respuesta', { intento: intento.id, indice: k, valor: banco[q].ok });
  assert.equal(r.statusCode, 200, r.body);
}
const env = await post('004817', '/api/aprender/examen/enviar', { intento: intento.id });
comprobar('La calificación la calcula el servidor', env.statusCode === 200 && env.json().resultado.calificacion === 100 && env.json().resultado.aprobado);
comprobar('Sin práctica validada todavía no se acredita', env.json().resultado.acreditado === false);
const otraVez = await post('004817', '/api/aprender/examen/enviar', { intento: intento.id });
comprobar('Un intento enviado no se puede reenviar', otraVez.statusCode === 400);

// ---------- Validar la práctica: Laura, con su frase de acceso ----------
const criterios = ['cumple', 'cumple', 'cumple', 'cumple'];
const malaFrase = await post('001920', '/api/validaciones', { participacion: part.id, criterios, resultado: 'competente', fecha: est.hoy, frase: 'no es mi frase de acceso' });
comprobar('Validar exige la frase de acceso de quien valida', malaFrase.statusCode === 400);
const noValida = await post('000412', '/api/validaciones', { participacion: part.id, criterios, resultado: 'competente', fecha: est.hoy, frase: frase('000412') });
comprobar('Solo un validador autorizado del curso registra la práctica', noValida.statusCode === 403);
const val = await post('001920', '/api/validaciones', { participacion: part.id, criterios, resultado: 'competente', fecha: est.hoy, frase: frase('001920') });
comprobar('La validación competente acredita el curso', val.statusCode === 200 && val.json().acreditado === true, val.body.slice(0, 80));

est = (await get('004817', '/api/estado')).json();
const acred = est.acreds.find((a: any) => a.curso === 'C2');
const k = est.consts.find((x: any) => x.acred === acred.id);
comprobar('Se emite la constancia con folio consecutivo y huella', !!k && /^DN-\d{4}-\d{6}$/.test(k.folio) && /^[0-9a-f]{64}$/.test(k.huella), k?.folio);
comprobar('La acreditación vence según la vigencia del curso', acred.vence > acred.fecha && acred.calif === 100);
const v = est.parts.find((p: any) => p.id === part.id).vals[0];
const conf = await post('004817', '/api/aprender/practica', { validacion: v.id, reconoce: true });
comprobar('La trabajadora confirma su práctica', conf.json().estado.parts.find((p: any) => p.id === part.id).vals[0].conf === true);
const ajenaConf = await post('001920', '/api/aprender/practica', { validacion: v.id, reconoce: false });
comprobar('Nadie más confirma una práctica ajena', ajenaConf.statusCode === 403);

// ---------- Constancias: reemitir con nuevo folio ----------
const reem = await post('000412', `/api/constancias/${k.id}/reemitir`, { motivo: 'Corrección de prueba', frase: frase('000412') });
comprobar('RH reemite con nuevo folio y la anterior queda sustituida', reem.statusCode === 200 && reem.json().folio !== k.folio
  && reem.json().estado.consts.find((x: any) => x.id === k.id).estado === 'sustituida', reem.json().folio);
const auditor = await post('000533', `/api/constancias/${k.id}/revocar`, { motivo: 'x', frase: frase('000533') });
comprobar('El auditor no puede revocar', auditor.statusCode === 400 || auditor.statusCode === 403);

// ---------- Excepciones ----------
const eAna2 = (await get('000412', '/api/estado')).json();
const hector = eAna2.personas.find((p: any) => p.nombre === 'Héctor Salas');
const aHector = eAna2.asigs.find((a: any) => a.persona === hector.id && a.curso === 'C5');
const exc = await post('000412', '/api/excepciones', { asignacion: aHector.id, tipo: 'intentos', motivo: 'Repaso con su instructora' });
comprobar('RH autoriza intentos adicionales cuando se agotaron', exc.statusCode === 200 && exc.json().estado.parts.find((p: any) => p.asig === aHector.id && !p.acred).extra === 2);
const ana = eAna2.personas.find((p: any) => p.nombre === 'Ana Ruiz');
const aAna = eAna2.asigs.find((a: any) => a.persona === ana.id);
const propia = aAna ? await post('000412', '/api/excepciones', { asignacion: aAna.id, tipo: 'prorroga', motivo: 'a mi favor' }) : { statusCode: 403 };
comprobar('Nadie aprueba una excepción a su favor', propia.statusCode === 403);

// ---------- Exportaciones, bitácora y ranking ----------
const exp = await post('000412', '/api/exportaciones', { reporte: 'matriz', formato: 'xlsx', registros: 346, titulo: 'Matriz de capacitación', alcance: 'Empresa Demo Norte' });
comprobar('La exportación queda registrada', exp.statusCode === 200 && exp.json().estado.exports.length === 1);
const eCarlos = (await get('000215', '/api/estado')).json();
const acciones = eCarlos.bit.filter((b: any) => !b.tecnico).map((b: any) => b.accion);
comprobar('La bitácora registra cada paso del recorrido', ['Crear regla de asignación', 'Completar lección', 'Enviar intento', 'Registrar validación práctica', 'Reemitir constancia', 'Exportar'].every(a => acciones.includes(a)));
const rank = await post('004817', '/api/perfil/ranking', { participa: false });
comprobar('La trabajadora puede salir del ranking', rank.json().estado.personas[0].rankOptIn === false);
const yo = (await get('004817', '/api/estado')).json();
comprobar('Sus puntos siguen siendo suyos y no afectan la acreditación', yo.puntos.length > 2 && yo.acreds.some((a: any) => a.curso === 'C2' && a.estado === 'vigente'));

await app.close(); await pool.end(); await sa.end();
console.log(`\n${ok} comprobaciones de operación correctas`);
