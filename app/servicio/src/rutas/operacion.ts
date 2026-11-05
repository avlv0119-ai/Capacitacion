// Operación diaria: estado para la interfaz y acciones de aprendizaje, evaluación, validación práctica,
// asignación, excepciones, constancias y exportaciones. Toda regla se verifica aquí (permisos por rol y alcance)
// y en la base (seguridad por fila, reglas protegidas y funciones acotadas de la migración 004).
import { randomInt } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Servicio } from '../sesion.ts';
import { requerirSesion } from '../sesion.ts';
import { conUsuario, sinUsuario, type Cliente } from '../db.ts';
import type { Contexto } from '../permisos.ts';
import { puede } from '../permisos.ts';
import { verificarFrase } from '../seguridad.ts';
import { construirEstado, cursosPublicados, fecha, hoyPlanta, leccionesDe } from '../estado.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOPE_DIARIO = 200;   // D-52

class ErrorNegocio extends Error {
  codigo: number;
  constructor(codigo: number, mensaje: string) { super(mensaje); this.codigo = codigo; }
}
const falla = (mensaje: string, codigo = 400): never => { throw new ErrorNegocio(codigo, mensaje); };

const txt = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const id = (v: unknown, nombre = 'registro') => (typeof v === 'string' && UUID.test(v) ? v : falla(`Falta indicar el ${nombre}.`));
const sumarDias = (f: string, n: number) => new Date(Date.parse(f + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

async function evento(c: Cliente, accion: string, tabla: string, registro: string | null, detalle: string, empresa: string | null = null) {
  await c.query('SELECT nexo.registrar_evento($1, $2, $3, $4::jsonb, $5)', [accion, tabla, registro, JSON.stringify({ detalle }), empresa]);
}

/** Participación con su asignación, curso, versión y adscripción vigente de la persona. */
async function participacion(c: Cliente, pid: string) {
  const r = await c.query(
    `SELECT p.*, a.fecha_limite, a.estado AS asig_estado, cu.clave, cu.nombre AS curso_nombre, pe.nombre_completo AS persona_nombre,
            ad.empresa_id AS ad_empresa, ad.planta_id, ad.area_id, ad.turno_id, v.contenido, v.criterios, v.numero AS version_num,
            (SELECT id FROM nexo.acreditaciones x WHERE x.participacion_id = p.id) AS acreditacion_id
       FROM nexo.participaciones p
       JOIN nexo.asignaciones a ON a.id = p.asignacion_id
       JOIN nexo.cursos cu ON cu.id = p.curso_id
       JOIN nexo.personas pe ON pe.id = p.persona_id
       LEFT JOIN nexo.adscripciones ad ON ad.persona_id = p.persona_id AND ad.vigencia @> nexo.hoy()
       LEFT JOIN nexo.versiones_curso v ON v.id = p.version_id
      WHERE p.id = $1`, [pid]);
  return r.rows[0] ?? falla('No encontramos ese curso en tu alcance.', 404);
}

function objetivo(p: any) {
  return { personaId: p.persona_id, empresaId: p.ad_empresa ?? p.empresa_id, plantaId: p.planta_id, areaId: p.area_id, turnoId: p.turno_id, cursoId: p.curso_id };
}

async function resumenIntentos(c: Cliente, partId: string) {
  const r = await c.query('SELECT numero, enviado_en, aprobado FROM nexo.intentos WHERE participacion_id = $1 AND NOT anulado ORDER BY numero', [partId]);
  const cerrados = r.rows.filter(i => i.enviado_en);
  return { total: r.rows.length, cerrados: cerrados.length, aprobado: cerrados.some(i => i.aprobado), abierto: r.rows.some(i => !i.enviado_en) };
}

async function darPuntos(c: Cliente, ctx: Contexto, hoy: string, pts: number, motivo: string): Promise<number> {
  const r = await c.query('SELECT coalesce(sum(puntos), 0)::int AS s FROM nexo.puntos WHERE persona_id = $1 AND fecha = $2', [ctx.personaId, hoy]);
  const dar = Math.max(0, Math.min(pts, TOPE_DIARIO - r.rows[0].s));
  if (dar > 0) await c.query('INSERT INTO nexo.puntos (grupo_id, persona_id, fecha, puntos, motivo) VALUES ($1, $2, $3, $4, $5)', [ctx.grupoId, ctx.personaId, hoy, dar, motivo]);
  return dar;
}

export async function rutasOperacion(s: Servicio): Promise<void> {
  const { app, pool } = s;

  /** Ejecuta una acción en una transacción con el usuario y responde con el estado actualizado. */
  async function accion(req: FastifyRequest, rep: FastifyReply, fn: (c: Cliente, ctx: Contexto, hoy: string, b: Record<string, unknown>) => Promise<Record<string, unknown> | void>) {
    if (!(await requerirSesion(s, req, rep))) return rep;
    const ctx = req.ctx!;
    const b = (req.body ?? {}) as Record<string, unknown>;
    try {
      const res = await conUsuario(pool, ctx.personaId, async c => {
        const extra = (await fn(c, ctx, await hoyPlanta(c), b)) ?? {};
        return { ...extra, estado: await construirEstado(c, ctx, req.sesion!.equipoCompartido) };
      });
      return rep.send(res);
    } catch (e) {
      if (e instanceof ErrorNegocio) return rep.code(e.codigo).send({ error: e.message });
      const pgE = e as { code?: string; message?: string };
      if (pgE.code === '23505') return rep.code(409).send({ error: 'Ese registro ya existe. Actualiza la pantalla.' });
      if (pgE.code === 'P0001' || pgE.code === '42501' || (pgE.code === '23514' && !/violates/.test(pgE.message ?? ''))) {
        return rep.code(pgE.code === '42501' ? 403 : 400).send({ error: pgE.message });
      }
      if (pgE.code === '23514' || pgE.code === '23P01') return rep.code(400).send({ error: 'La operación no cumple las reglas del registro.' });
      throw e;
    }
  }

  /** Confirmación con la frase de acceso para acciones sensibles (con demora progresiva ante fallos). */
  async function confirmarFrase(req: FastifyRequest, ctx: Contexto, frase: unknown) {
    if (typeof frase !== 'string' || !frase) falla('Confirma con tu frase de acceso.');
    const clave = 'reautenticar:' + ctx.personaId;
    const espera = (await sinUsuario(pool, c => c.query('SELECT nexo.espera_acceso($1, $2) AS s', [clave, req.ip]))).rows[0].s;
    if (espera > 0) falla(`Espera ${espera} segundos para intentar de nuevo.`, 429);
    const h = (await conUsuario(pool, ctx.personaId, c => c.query('SELECT hash_frase FROM nexo.cuentas WHERE persona_id = $1', [ctx.personaId]))).rows[0]?.hash_frase;
    const ok = !!h && await verificarFrase(h, frase as string);
    await sinUsuario(pool, c => c.query('SELECT nexo.registrar_intento_acceso($1, $2, $3)', [clave, req.ip, ok]));
    if (!ok) falla('Tu frase de acceso no coincide.');
  }
  async function conFrase(req: FastifyRequest, rep: FastifyReply, fn: Parameters<typeof accion>[2]) {
    if (!(await requerirSesion(s, req, rep))) return rep;
    try { await confirmarFrase(req, req.ctx!, (req.body as Record<string, unknown> | undefined)?.frase); }
    catch (e) { if (e instanceof ErrorNegocio) return rep.code(e.codigo).send({ error: e.message }); throw e; }
    return accion(req, rep, fn);
  }

  // ---------- Estado ----------
  app.get('/api/estado', async (req, rep) => {
    if (!(await requerirSesion(s, req, rep))) return rep;
    const ctx = req.ctx!;
    return rep.send(await conUsuario(pool, ctx.personaId, c => construirEstado(c, ctx, req.sesion!.equipoCompartido)));
  });

  // ---------- Aprender ----------
  async function propia(c: Cliente, ctx: Contexto, pid: string) {
    const p = await participacion(c, pid);
    if (p.persona_id !== ctx.personaId) falla('Solo puedes avanzar en tus propios cursos.', 403);
    if (p.cancelada_en || p.asig_estado !== 'activa') falla('Esta asignación ya no está activa.');
    if (p.acreditacion_id) falla('Ya acreditaste este curso.');
    return p;
  }
  async function iniciar(c: Cliente, p: any) {
    if (p.version_id) return p;
    const v = (await cursosPublicados(c)).find(x => x.cursoId === p.curso_id) ?? falla('El curso no tiene una versión publicada.');
    await c.query('UPDATE nexo.participaciones SET version_id = $2, iniciada_en = now() WHERE id = $1 AND version_id IS NULL', [p.id, v.versionId]);
    await evento(c, 'Iniciar curso', 'participaciones', p.id, `${p.persona_nombre} · ${p.curso_nombre} · versión ${v.numero}`, p.empresa_id);
    return { ...p, version_id: v.versionId, contenido: v.contenido, criterios: v.criterios, version_num: v.numero };
  }

  app.post('/api/aprender/iniciar', (req, rep) => accion(req, rep, async (c, ctx, _hoy, b) => {
    await iniciar(c, await propia(c, ctx, id(b.participacion, 'curso')));
  }));

  app.post('/api/aprender/leccion', (req, rep) => accion(req, rep, async (c, ctx, hoy, b) => {
    let p = await iniciar(c, await propia(c, ctx, id(b.participacion, 'curso')));
    const leccion = txt(b.leccion, 20);
    const lecciones = leccionesDe(p.contenido);
    const i = lecciones.indexOf(leccion);
    if (i < 0) falla('Esa lección no existe en tu versión del curso.');
    const hechas: string[] = p.lecciones_completadas ?? [];
    if (lecciones.slice(0, i).some(l => !hechas.includes(l))) falla('Completa primero las lecciones anteriores.');
    let puntos = 0;
    if (!hechas.includes(leccion)) {
      await c.query('UPDATE nexo.participaciones SET lecciones_completadas = array_append(lecciones_completadas, $2) WHERE id = $1 AND NOT ($2 = ANY (lecciones_completadas))', [p.id, leccion]);
      const datos = p.contenido.niveles.flatMap((n: any) => n.lecciones).find((l: any) => l.id === leccion);
      const actividades = datos?.acts?.length ?? 0;
      const correctas = Math.max(0, Math.min(actividades, Math.floor(Number(b.correctas) || 0)));
      puntos = await darPuntos(c, ctx, hoy, 20 + 10 * correctas, `Lección «${datos?.titulo ?? leccion}» · ${p.curso_nombre}`);
      if (b.perfecta === true && correctas === actividades) await c.query('INSERT INTO nexo.puntos (grupo_id, persona_id, fecha, puntos, motivo) VALUES ($1, $2, $3, 0, $4)', [ctx.grupoId, ctx.personaId, hoy, `Lección perfecta · ${datos?.titulo ?? leccion}`]);
      await evento(c, 'Completar lección', 'participaciones', p.id, `${p.persona_nombre} · ${p.curso_nombre} · ${datos?.titulo ?? leccion}`, p.empresa_id);
      p = await participacion(c, p.id);
      const it = await resumenIntentos(c, p.id);
      if (lecciones.every(l => p.lecciones_completadas.includes(l)) && it.aprobado && p.criterios?.requiere_practica && !p.pendiente_validacion_desde) {
        await c.query('UPDATE nexo.participaciones SET pendiente_validacion_desde = $2 WHERE id = $1', [p.id, hoy]);
      }
      await c.query('SELECT nexo.acreditar_si_cumple($1)', [p.id]);
    }
    return { puntos };
  }));

  app.post('/api/aprender/examen', (req, rep) => accion(req, rep, async (c, ctx, _hoy, b) => {
    const p = await iniciar(c, await propia(c, ctx, id(b.participacion, 'curso')));
    const k = p.criterios ?? {};
    if (!k.requiere_evaluacion) falla('Este curso no tiene evaluación.');
    const lecciones = leccionesDe(p.contenido);
    if (lecciones.some(l => !(p.lecciones_completadas ?? []).includes(l))) falla('Termina las lecciones para presentar la evaluación.');
    const it = await resumenIntentos(c, p.id);
    if (it.aprobado) falla('Ya aprobaste la evaluación.');
    if (it.abierto) return {};
    if (it.cerrados >= Number(k.intentos) + p.intentos_extra) falla('Agotaste tus intentos. Tu instructor revisará tu caso.');
    const banco: any[] = p.contenido.banco ?? [];
    const n = Math.min(Number(k.preguntas ?? 5), banco.length);
    const pool = banco.map((_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) { const j = randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    await c.query('INSERT INTO nexo.intentos (grupo_id, empresa_id, participacion_id, numero, respuestas) VALUES ($1, $2, $3, $4, $5)',
      [p.grupo_id, p.empresa_id, p.id, it.total + 1, JSON.stringify({ qs: pool.slice(0, n), ans: {} })]);
    await evento(c, 'Iniciar intento', 'intentos', p.id, `${p.persona_nombre} · ${p.curso_nombre} · intento ${it.total + 1}`, p.empresa_id);
  }));

  async function intentoAbierto(c: Cliente, ctx: Contexto, iid: string) {
    const r = await c.query(
      `SELECT i.*, p.persona_id FROM nexo.intentos i JOIN nexo.participaciones p ON p.id = i.participacion_id WHERE i.id = $1`, [iid]);
    const i = r.rows[0] ?? falla('No encontramos ese intento.', 404);
    if (i.persona_id !== ctx.personaId) falla('Solo puedes responder tus propias evaluaciones.', 403);
    if (i.enviado_en || i.anulado) falla('Ese intento ya fue enviado.');
    return i;
  }

  // Guarda una respuesta (sin devolver todo el estado, para que sea inmediato)
  app.post('/api/aprender/examen/respuesta', async (req, rep) => {
    if (!(await requerirSesion(s, req, rep))) return rep;
    const ctx = req.ctx!; const b = (req.body ?? {}) as Record<string, unknown>;
    try {
      await conUsuario(pool, ctx.personaId, async c => {
        const i = await intentoAbierto(c, ctx, id(b.intento, 'intento'));
        const idx = Number(b.indice);
        if (!Number.isInteger(idx) || idx < 0 || idx >= (i.respuestas?.qs ?? []).length) falla('Pregunta inválida.');
        if (typeof b.valor !== 'boolean' && !(Number.isInteger(b.valor) && (b.valor as number) >= 0 && (b.valor as number) < 6)) falla('Respuesta inválida.');
        await c.query(`UPDATE nexo.intentos SET respuestas = jsonb_set(respuestas, ARRAY['ans', $2::text], $3::jsonb, true) WHERE id = $1`, [i.id, String(idx), JSON.stringify(b.valor)]);
      });
      return rep.send({ guardada: true });
    } catch (e) {
      if (e instanceof ErrorNegocio) return rep.code(e.codigo).send({ error: e.message });
      throw e;
    }
  });

  app.post('/api/aprender/examen/enviar', (req, rep) => accion(req, rep, async (c, ctx, hoy, b) => {
    const i = await intentoAbierto(c, ctx, id(b.intento, 'intento'));
    const p = await participacion(c, i.participacion_id);
    const banco: any[] = p.contenido.banco ?? [];
    const qs: number[] = i.respuestas?.qs ?? []; const ans = i.respuestas?.ans ?? {};
    const resp = qs.map((q, k) => ({ q, r: ans[k] ?? null, ok: ans[k] !== undefined && ans[k] === banco[q]?.ok, tema: banco[q]?.tema ?? '' }));
    const calif = qs.length ? Math.round(resp.filter(r => r.ok).length / qs.length * 100 * 10000) / 10000 : 0;
    const aprobado = calif >= Number(p.criterios.calificacion_minima);
    await c.query('UPDATE nexo.intentos SET enviado_en = now(), calificacion = $2, aprobado = $3, respuestas = $4 WHERE id = $1',
      [i.id, calif, aprobado, JSON.stringify({ qs, ans, resp })]);
    if (aprobado && p.criterios.requiere_practica && !p.pendiente_validacion_desde) {
      await c.query('UPDATE nexo.participaciones SET pendiente_validacion_desde = $2 WHERE id = $1', [p.id, hoy]);
    }
    const acred = (await c.query('SELECT nexo.acreditar_si_cumple($1) AS a', [p.id])).rows[0].a;
    await evento(c, 'Enviar intento', 'intentos', i.id, `${p.persona_nombre} · ${p.curso_nombre} · intento ${i.numero} · calificación ${Math.round(calif)} (${aprobado ? 'aprobado' : 'no aprobado'})`, p.empresa_id);
    return { resultado: { participacion: p.id, calificacion: calif, aprobado, acreditado: !!acred } };
  }));

  app.post('/api/aprender/practica', (req, rep) => accion(req, rep, async (c, _ctx, _hoy, b) => {
    const vid = id(b.validacion, 'registro de práctica');
    const reconoce = b.reconoce === true;
    await c.query('SELECT nexo.confirmar_validacion($1, $2)', [vid, reconoce]);
    await evento(c, reconoce ? 'Confirmar práctica' : 'Práctica no reconocida · aviso a RH', 'validaciones', vid,
      reconoce ? 'La persona confirmó su práctica' : 'La persona no reconoce el registro de su práctica; RH debe revisarlo');
  }));

  app.post('/api/perfil/ranking', (req, rep) => accion(req, rep, async (c, ctx, _hoy, b) => {
    const participa = b.participa === true;
    await c.query('UPDATE nexo.cuentas SET participa_ranking = $2 WHERE persona_id = $1', [ctx.personaId, participa]);
    await evento(c, 'Cambiar preferencia de ranking', 'cuentas', ctx.personaId, participa ? 'Participa en el ranking' : 'Progreso privado');
  }));

  // ---------- Validación práctica ----------
  app.post('/api/validaciones', (req, rep) => conFrase(req, rep, async (c, ctx, hoy, b) => {
    const p = await participacion(c, id(b.participacion, 'curso'));
    const d = puede(ctx, 'validacion.registrar', objetivo(p));
    if (!d.ok) falla(d.motivo!, 403);
    if (p.acreditacion_id || p.cancelada_en) falla('Este curso ya no está pendiente de validación.');
    if (!p.criterios?.requiere_practica) falla('Este curso no requiere validación práctica.');
    const lecciones = leccionesDe(p.contenido);
    const it = await resumenIntentos(c, p.id);
    if (lecciones.some(l => !(p.lecciones_completadas ?? []).includes(l)) || (p.criterios.requiere_evaluacion && !it.aprobado)) {
      falla('La persona aún no termina las lecciones y la evaluación.');
    }
    const previa = (await c.query(`SELECT 1 FROM nexo.validaciones WHERE participacion_id = $1 AND resultado = 'competente' AND anulada_en IS NULL`, [p.id])).rows.length;
    if (previa) falla('La práctica ya fue validada.');
    const criterios = Array.isArray(b.criterios) ? b.criterios : [];
    const esperados = (p.criterios.criterios_practica ?? []).length;
    if (criterios.length !== esperados || criterios.some(x => !['cumple', 'no', 'na'].includes(x as string))) falla('Marca todos los criterios.');
    const resultado = b.resultado === 'competente' ? 'competente' : b.resultado === 'aun_no' ? 'aun_no_competente' : falla('Elige el resultado general.');
    if (resultado === 'competente' && criterios.includes('no')) falla('Si un criterio no se cumple, el resultado es «Aún no competente».');
    const obs = txt(b.observaciones, 1000);
    if (resultado !== 'competente' && !obs) falla('Escribe las observaciones: son obligatorias si aún no es competente.');
    const f = txt(b.fecha, 10) || hoy;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || f > hoy || f < sumarDias(hoy, -7)) falla('La fecha de la práctica no puede ser futura ni de hace más de 7 días.');
    await c.query(
      `INSERT INTO nexo.validaciones (grupo_id, empresa_id, participacion_id, validador_id, fecha_practica, criterios, resultado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [p.grupo_id, p.empresa_id, p.id, ctx.personaId, f, JSON.stringify(criterios), resultado, obs || null]);
    const acred = (await c.query('SELECT nexo.acreditar_si_cumple($1) AS a', [p.id])).rows[0].a;
    await evento(c, 'Registrar validación práctica', 'validaciones', p.id,
      `${p.persona_nombre} · ${p.curso_nombre} v${p.version_num} · ${resultado === 'competente' ? 'Competente' : 'Aún no competente'}`, p.empresa_id);
    return { acreditado: !!acred, persona: p.persona_nombre };
  }));

  // ---------- Reglas de asignación ----------
  app.post('/api/reglas', (req, rep) => accion(req, rep, async (c, ctx, hoy, b) => {
    const d0 = puede(ctx, 'reglas.crear');
    if (!d0.ok) falla(d0.motivo!, 403);
    const curso = (await cursosPublicados(c)).find(x => x.clave === txt(b.curso, 20)) ?? falla('Elige un curso publicado.');
    const empresas = (await c.query('SELECT id FROM nexo.empresas ORDER BY nombre')).rows.map(x => x.id);
    const empresa = (typeof b.empresa === 'string' && empresas.includes(b.empresa) ? b.empresa : null)
      ?? ctx.roles.find(r => ['administrador', 'rh'].includes(r.rol) && r.empresaId)?.empresaId ?? empresas[0] ?? falla('No tienes una empresa en tu alcance.');
    const d = puede(ctx, 'reglas.crear', { empresaId: empresa });
    if (!d.ok) falla(d.motivo!, 403);
    const areas = (await c.query('SELECT id, nombre FROM nexo.areas WHERE empresa_id = $1 AND id = ANY ($2::uuid[])', [empresa, (Array.isArray(b.areas) ? b.areas : []).filter(x => typeof x === 'string' && UUID.test(x))])).rows;
    const turnos = (await c.query('SELECT id, clave FROM nexo.turnos WHERE empresa_id = $1 AND clave = ANY ($2::text[])', [empresa, (Array.isArray(b.turnos) ? b.turnos : []).map(String)])).rows;
    if (!areas.length || !turnos.length) falla('Elige al menos un área y un turno.');
    const dias = Math.floor(Number(b.dias));
    if (!(dias >= 1 && dias <= 365)) falla('La fecha límite debe estar entre 1 y 365 días.');
    const contratistas = b.contratistas !== false;
    const regla = (await c.query(
      `INSERT INTO nexo.reglas_asignacion (grupo_id, empresa_id, curso_id, filtro, tipo, dias_limite, creada_por)
       VALUES ($1, $2, $3, $4, 'obligatorio', $5, $6) RETURNING id`,
      [ctx.grupoId, empresa, curso.cursoId, JSON.stringify({ areas: areas.map(a => a.id), turnos: turnos.map(t => t.id), contratistas }), dias, ctx.personaId])).rows[0].id;
    const candidatos = (await c.query(
      `SELECT p.id FROM nexo.personas p JOIN nexo.adscripciones ad ON ad.persona_id = p.id AND ad.vigencia @> nexo.hoy()
        WHERE ad.empresa_id = $1 AND ad.area_id = ANY ($2::uuid[]) AND ad.turno_id = ANY ($3::uuid[])
          AND ($4 OR p.tipo = 'empleado') AND (p.tipo = 'empleado' OR p.acceso_vence >= nexo.hoy())
          AND NOT EXISTS (SELECT 1 FROM nexo.asignaciones a WHERE a.persona_id = p.id AND a.curso_id = $5 AND a.estado = 'activa')`,
      [empresa, areas.map(a => a.id), turnos.map(t => t.id), contratistas, curso.cursoId])).rows.map(x => x.id);
    const vigentes = new Set((await c.query(
      `SELECT DISTINCT persona_id FROM nexo.acreditaciones WHERE curso_id = $1 AND estado = 'vigente' AND fecha <= nexo.hoy() AND (vence IS NULL OR vence >= nexo.hoy())`,
      [curso.cursoId])).rows.map(x => x.persona_id));
    const limite = sumarDias(hoy, dias);
    for (const pid of candidatos) {
      const a = (await c.query(
        `INSERT INTO nexo.asignaciones (grupo_id, empresa_id, persona_id, curso_id, regla_id, tipo, fecha_limite) VALUES ($1, $2, $3, $4, $5, 'obligatorio', $6) RETURNING id`,
        [ctx.grupoId, empresa, pid, curso.cursoId, regla, limite])).rows[0].id;
      if (!vigentes.has(pid)) {
        await c.query('INSERT INTO nexo.participaciones (grupo_id, empresa_id, asignacion_id, persona_id, curso_id) VALUES ($1, $2, $3, $4, $5)', [ctx.grupoId, empresa, a, pid, curso.cursoId]);
      }
    }
    const yaVigentes = candidatos.filter(x => vigentes.has(x)).length;
    await evento(c, 'Crear regla de asignación', 'reglas_asignacion', regla,
      `${curso.nombre} · ${areas.map(a => a.nombre).join(', ')} · ${turnos.map(t => t.clave).join(', ')} · ${candidatos.length} asignaciones (${yaVigentes} ya vigentes)`, empresa);
    return { creadas: candidatos.length, vigentes: yaVigentes };
  }));

  // ---------- Excepciones ----------
  app.post('/api/excepciones', (req, rep) => accion(req, rep, async (c, ctx, hoy, b) => {
    const r = await c.query(
      `SELECT a.*, cu.nombre AS curso_nombre, pe.nombre_completo AS persona_nombre, ad.empresa_id AS ad_empresa, ad.planta_id, ad.area_id, ad.turno_id
         FROM nexo.asignaciones a JOIN nexo.cursos cu ON cu.id = a.curso_id JOIN nexo.personas pe ON pe.id = a.persona_id
         LEFT JOIN nexo.adscripciones ad ON ad.persona_id = a.persona_id AND ad.vigencia @> nexo.hoy()
        WHERE a.id = $1`, [id(b.asignacion, 'asignación')]);
    const a = r.rows[0] ?? falla('No encontramos esa asignación en tu alcance.', 404);
    if (a.estado !== 'activa') falla('La asignación no está activa.');
    const tipo = String(b.tipo); const motivo = txt(b.motivo, 300);
    if (!motivo) falla('El motivo es obligatorio.');
    const d = puede(ctx, tipo === 'intentos' ? 'excepciones.intentos' : 'excepciones.aprobar', objetivo(a));
    if (!d.ok) falla(d.motivo!, 403);
    let detalle = '';
    if (tipo === 'intentos') {
      const p = (await c.query(`SELECT p.id, p.intentos_extra, v.criterios FROM nexo.participaciones p JOIN nexo.versiones_curso v ON v.id = p.version_id
        WHERE p.asignacion_id = $1 AND p.cancelada_en IS NULL AND NOT EXISTS (SELECT 1 FROM nexo.acreditaciones x WHERE x.participacion_id = p.id)
        ORDER BY p.iniciada_en DESC NULLS LAST LIMIT 1`, [a.id])).rows[0] ?? falla('No hay una evaluación en curso para esta asignación.');
      const it = await resumenIntentos(c, p.id);
      if (it.aprobado || it.cerrados < Number(p.criterios.intentos) + p.intentos_extra) falla('Solo se autorizan intentos adicionales cuando se agotaron los intentos.');
      await c.query('UPDATE nexo.participaciones SET intentos_extra = intentos_extra + 2 WHERE id = $1', [p.id]);
      await c.query(`INSERT INTO nexo.excepciones (grupo_id, empresa_id, asignacion_id, tipo, motivo, valor, aprobada_por) VALUES ($1, $2, $3, 'intentos_adicionales', $4, 2, $5)`,
        [a.grupo_id, a.empresa_id, a.id, motivo, ctx.personaId]);
      detalle = '+2 intentos';
    } else if (tipo === 'prorroga') {
      const base = fecha(a.fecha_limite)! < hoy ? hoy : fecha(a.fecha_limite)!;
      const nueva = sumarDias(base, 15);
      await c.query('UPDATE nexo.asignaciones SET fecha_limite = $2 WHERE id = $1', [a.id, nueva]);
      await c.query(`INSERT INTO nexo.excepciones (grupo_id, empresa_id, asignacion_id, tipo, motivo, vigente_hasta, aprobada_por) VALUES ($1, $2, $3, 'prorroga', $4, $5, $6)`,
        [a.grupo_id, a.empresa_id, a.id, motivo, nueva, ctx.personaId]);
      detalle = `${fecha(a.fecha_limite)} → ${nueva}`;
    } else if (tipo === 'exencion') {
      const hasta = sumarDias(hoy, 90);
      await c.query(`INSERT INTO nexo.excepciones (grupo_id, empresa_id, asignacion_id, tipo, motivo, vigente_hasta, aprobada_por) VALUES ($1, $2, $3, 'exencion', $4, $5, $6)`,
        [a.grupo_id, a.empresa_id, a.id, motivo, hasta, ctx.personaId]);
      detalle = `hasta ${hasta}`;
    } else falla('Tipo de excepción no válido.');
    await evento(c, 'Excepción: ' + ({ intentos: 'intentos adicionales', prorroga: 'prórroga', exencion: 'exención' } as Record<string, string>)[tipo], 'excepciones', a.id,
      `${a.persona_nombre} · ${a.curso_nombre} · ${detalle} · motivo: ${motivo}`, a.empresa_id);
  }));

  // ---------- Constancias: reemitir y revocar (con frase de acceso) ----------
  async function constancia(c: Cliente, kid: string) {
    const r = await c.query(
      `SELECT k.*, a.persona_id, a.curso_id, a.participacion_id, a.empresa_id AS acred_empresa, pe.nombre_completo AS persona_nombre, cu.nombre AS curso_nombre,
              ad.empresa_id AS ad_empresa, ad.planta_id, ad.area_id, ad.turno_id
         FROM nexo.constancias k JOIN nexo.acreditaciones a ON a.id = k.acreditacion_id JOIN nexo.personas pe ON pe.id = a.persona_id JOIN nexo.cursos cu ON cu.id = a.curso_id
         LEFT JOIN nexo.adscripciones ad ON ad.persona_id = a.persona_id AND ad.vigencia @> nexo.hoy()
        WHERE k.id = $1`, [kid]);
    const k = r.rows[0] ?? falla('No encontramos esa constancia en tu alcance.', 404);
    if (k.estado !== 'vigente') falla('Solo se pueden reemitir o revocar constancias vigentes.');
    return k;
  }
  app.post('/api/constancias/:id/reemitir', (req, rep) => conFrase(req, rep, async (c, ctx, _hoy, b) => {
    const k = await constancia(c, id((req.params as { id: string }).id, 'constancia'));
    const d = puede(ctx, 'constancias.reemitir', objetivo(k)); if (!d.ok) falla(d.motivo!, 403);
    const motivo = txt(b.motivo); if (!motivo) falla('El motivo es obligatorio.');
    await c.query(`UPDATE nexo.constancias SET estado = 'sustituida' WHERE id = $1`, [k.id]);
    const nueva = (await c.query('SELECT nexo.emitir_constancia($1, $2, $3) AS n', [k.acreditacion_id, k.id, motivo])).rows[0].n;
    const folio = (await c.query('SELECT folio FROM nexo.constancias WHERE id = $1', [nueva])).rows[0].folio;
    await evento(c, 'Reemitir constancia', 'constancias', nueva, `Constancia ${k.folio} → ${folio} · ${k.persona_nombre} · motivo: ${motivo}`, k.empresa_id);
    return { folio };
  }));
  app.post('/api/constancias/:id/revocar', (req, rep) => conFrase(req, rep, async (c, ctx, hoy, b) => {
    const k = await constancia(c, id((req.params as { id: string }).id, 'constancia'));
    const d = puede(ctx, 'constancias.revocar', objetivo(k)); if (!d.ok) falla(d.motivo!, 403);
    const motivo = txt(b.motivo); if (!motivo) falla('El motivo es obligatorio.');
    await c.query(`UPDATE nexo.constancias SET estado = 'revocada', motivo = $2 WHERE id = $1`, [k.id, motivo]);
    await c.query(`UPDATE nexo.acreditaciones SET estado = 'revocada', revocada_en = now(), revocada_por = $2, revocada_motivo = $3 WHERE id = $1`, [k.acreditacion_id, ctx.personaId, motivo]);
    const a = (await c.query(`SELECT id, grupo_id, empresa_id FROM nexo.asignaciones WHERE persona_id = $1 AND curso_id = $2 AND estado = 'activa'`, [k.persona_id, k.curso_id])).rows[0];
    const limite = sumarDias(hoy, 30);
    if (a) {
      await c.query('UPDATE nexo.asignaciones SET fecha_limite = $2 WHERE id = $1', [a.id, limite]);
      await c.query('INSERT INTO nexo.participaciones (grupo_id, empresa_id, asignacion_id, persona_id, curso_id) VALUES ($1, $2, $3, $4, $5)', [a.grupo_id, a.empresa_id, a.id, k.persona_id, k.curso_id]);
    }
    await evento(c, 'Revocar constancia y acreditación', 'constancias', k.id,
      `Constancia ${k.folio} · ${k.persona_nombre} · ${k.curso_nombre} · motivo: ${motivo}${a ? ' · nueva participación con límite ' + limite : ''}`, k.empresa_id);
  }));

  // ---------- Exportaciones (el archivo se genera en el navegador con los datos del alcance; aquí queda el registro) ----------
  app.post('/api/exportaciones', (req, rep) => accion(req, rep, async (c, ctx, _hoy, b) => {
    const reporte = txt(b.reporte, 40); const formato = b.formato === 'pdf' ? 'pdf' : b.formato === 'xlsx' ? 'xlsx' : falla('Formato no válido.');
    const persona = typeof b.persona === 'string' && UUID.test(b.persona) ? b.persona : undefined;
    const d = puede(ctx, 'reportes.exportar', persona ? { personaId: persona } : {});
    if (!d.ok) falla(d.motivo!, 403);
    const empresa = ctx.roles.find(r => r.empresaId)?.empresaId ?? null;
    const registros = Math.max(0, Math.floor(Number(b.registros) || 0));
    const titulo = txt(b.titulo, 120) || reporte;
    const e = (await c.query(
      `INSERT INTO nexo.exportaciones (grupo_id, empresa_id, solicitada_por, reporte, formato, filtros, alcance, estado, registros)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'lista', $8) RETURNING id`,
      [ctx.grupoId, empresa, ctx.personaId, reporte, formato, JSON.stringify({ titulo, filtros: txt(b.filtros, 300), persona: persona ?? null }), JSON.stringify({ alcance: txt(b.alcance, 200) }), registros])).rows[0].id;
    await evento(c, 'Exportar', 'exportaciones', e, `${titulo} · ${formato.toUpperCase()} · ${registros} registros · ${txt(b.alcance, 200)}`, empresa);
  }));
}
