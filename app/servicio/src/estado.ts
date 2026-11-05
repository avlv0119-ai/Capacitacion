// Estado de la aplicación para la interfaz: todo lo que la persona puede ver, ya filtrado por la
// seguridad por fila (grupo y empresa) y por el alcance fino de sus roles (área y turno, cursos, propio).
// La interfaz calcula estados de cumplimiento e indicadores sobre estos datos; nunca recibe datos fuera de su alcance
// ni las respuestas correctas de las evaluaciones.
import type { Cliente } from './db.ts';
import type { Contexto } from './permisos.ts';
import { puede } from './permisos.ts';

const ROL_UI: Record<string, string> = { administrador: 'admin', rh: 'rh', instructor: 'instructor', supervisor: 'supervisor', auditor: 'auditor', trabajador: 'trabajador' };
const CLASIF: Record<string, string> = { interno: 'Interno', seguridad: 'Seguridad', calidad: 'Calidad', normativo: 'Normativo' };
const TABLA: Record<string, string> = {
  personas: 'Persona', numeros_empleado: 'Número de empleado', adscripciones: 'Adscripción', cuentas: 'Cuenta', codigos_acceso: 'Código de acceso',
  asignaciones_rol: 'Rol', cursos: 'Curso', versiones_curso: 'Versión de curso', reglas_asignacion: 'Regla de asignación', asignaciones: 'Asignación',
  excepciones: 'Excepción', participaciones: 'Participación', intentos: 'Intento de evaluación', validaciones: 'Validación práctica', evidencias: 'Evidencia',
  acreditaciones: 'Acreditación', constancias: 'Constancia', plantillas_constancia: 'Plantilla de constancia', exportaciones: 'Exportación',
  empresas: 'Empresa', plantas: 'Planta', areas: 'Área', turnos: 'Turno', puestos: 'Puesto', demo: 'Datos de demostración', evento: 'Evento',
};

export const fecha = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Fecha de hoy en la planta (la base es la referencia oficial). */
export async function hoyPlanta(c: Cliente): Promise<string> {
  const r = await c.query("SELECT to_char(nexo.hoy(), 'YYYY-MM-DD') AS h");
  return r.rows[0].h;
}

export interface CursoVersion { cursoId: string; clave: string; nombre: string; versionId: string; numero: number; contenido: any; criterios: any; clasificacion: string }

/** Versión publicada más reciente de cada curso visible. */
export async function cursosPublicados(c: Cliente): Promise<CursoVersion[]> {
  const r = await c.query(
    `SELECT DISTINCT ON (c.id) c.id AS curso_id, c.clave, c.nombre, c.clasificacion, v.id AS version_id, v.numero, v.contenido, v.criterios
       FROM nexo.cursos c JOIN nexo.versiones_curso v ON v.curso_id = c.id AND v.estado = 'publicada'
      ORDER BY c.id, v.numero DESC`);
  return r.rows.map(x => ({ cursoId: x.curso_id, clave: x.clave, nombre: x.nombre, versionId: x.version_id, numero: x.numero, contenido: x.contenido, criterios: x.criterios, clasificacion: x.clasificacion }));
}

export function leccionesDe(contenido: any): string[] {
  if (Array.isArray(contenido?.niveles)) return contenido.niveles.flatMap((n: any) => (n.lecciones ?? []).map((l: any) => String(l.id)));
  return Array.isArray(contenido?.lecciones) ? contenido.lecciones.map(String) : [];
}

/** Curso con la forma que usa la interfaz. Las preguntas de evaluación van SIN la respuesta correcta. */
function cursoUI(v: CursoVersion) {
  const k = v.criterios ?? {};
  const pres = v.contenido?.presentacion ?? {};
  return {
    id: v.clave, uuid: v.cursoId, nombre: v.nombre, version: v.numero, color: pres.color ?? 'primary', icon: pres.icon ?? 'book',
    eval: k.requiere_evaluacion ? { min: Number(k.calificacion_minima), intentos: Number(k.intentos), preguntas: Number(k.preguntas ?? 5) } : null,
    practica: k.requiere_practica ? { criterios: k.criterios_practica ?? [] } : null,
    vigencia: Number(k.vigencia_meses ?? 0), clasif: CLASIF[v.clasificacion] ?? v.clasificacion, jugable: true,
    niveles: v.contenido?.niveles ?? [],
    banco: (v.contenido?.banco ?? []).map((q: any) => ({ t: q.t, q: q.q, ops: q.ops, tema: q.tema })),
    lecciones: leccionesDe(v.contenido).length,
    demo: !!v.contenido?.demo,
  };
}

export async function construirEstado(c: Cliente, ctx: Contexto, equipoCompartido: boolean) {
  const yo = ctx.personaId;
  const hoy = await hoyPlanta(c);

  // ---------- Catálogo ----------
  const cat = (await c.query('SELECT * FROM nexo.catalogo_organizacion()')).rows;
  const nombreDe = (tipo: string) => Object.fromEntries(cat.filter(x => x.tipo === tipo).map(x => [x.id, x.nombre]));
  const areas = cat.filter(x => x.tipo === 'area').map(x => ({ id: x.id, nombre: x.nombre, empresa: x.empresa_id })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const turnoClave = Object.fromEntries(cat.filter(x => x.tipo === 'turno').map(x => [x.id, x.clave]));
  const turnos = [...new Set(cat.filter(x => x.tipo === 'turno').map(x => x.clave as string))].sort();
  const puesto = nombreDe('puesto');
  const empresas = cat.filter(x => x.tipo === 'empresa').map(x => ({ id: x.id, nombre: x.nombre, prefijo: x.clave }));
  const plantas = cat.filter(x => x.tipo === 'planta').map(x => ({ id: x.id, nombre: x.nombre, empresa: x.empresa_id }));

  // ---------- Cursos ----------
  const versiones = await cursosPublicados(c);
  const claveCurso: Record<string, string> = Object.fromEntries(versiones.map(v => [v.cursoId, v.clave]));
  const numeroVersion: Record<string, number> = Object.fromEntries((await c.query('SELECT id, numero FROM nexo.versiones_curso')).rows.map(x => [x.id, x.numero]));
  const CURSOS = Object.fromEntries(versiones.sort((a, b) => a.clave.localeCompare(b.clave)).map(v => [v.clave, cursoUI(v)]));

  // ---------- Personas visibles (seguridad por fila) ----------
  const pr = await c.query(
    `SELECT p.id, p.nombre_completo, p.tipo, p.empresa_contratista, p.acceso_vence,
            n.numero, n.vigente_desde, n.empresa_id AS empresa_num, cu.estado AS cuenta, cu.participa_ranking, cu.ultimo_acceso,
            coalesce(json_agg(json_build_object('area', ad.area_id, 'turno', ad.turno_id, 'puesto', ad.puesto_id, 'empresa', ad.empresa_id,
                     'planta', ad.planta_id, 'desde', lower(ad.vigencia), 'hasta', upper(ad.vigencia) - 1) ORDER BY lower(ad.vigencia))
                     FILTER (WHERE ad.id IS NOT NULL), '[]') AS ads
       FROM nexo.personas p
       LEFT JOIN nexo.numeros_empleado n ON n.persona_id = p.id AND n.vigente_hasta IS NULL
       LEFT JOIN nexo.cuentas cu ON cu.persona_id = p.id
       LEFT JOIN nexo.adscripciones ad ON ad.persona_id = p.id
      GROUP BY p.id, n.numero, n.vigente_desde, n.empresa_id, cu.estado, cu.participa_ranking, cu.ultimo_acceso`);
  const actual = (ads: any[]) => ads.find(a => a.desde <= hoy && (a.hasta === null || a.hasta >= hoy)) ?? ads[ads.length - 1] ?? null;
  const personasDB = pr.rows.map(x => ({ ...x, ads: x.ads as any[], act: actual(x.ads as any[]) }));
  const objetivo = (x: any, cursoId?: string) => ({
    personaId: x.id, empresaId: x.act?.empresa ?? x.empresa_num ?? null, plantaId: x.act?.planta ?? null, areaId: x.act?.area ?? null, turnoId: x.act?.turno ?? null,
    ...(cursoId ? { cursoId } : {}),
  });
  const porId = new Map(personasDB.map(x => [x.id, x]));

  // ---------- Asignaciones visibles con alcance fino ----------
  const ar = await c.query(
    `SELECT a.id, a.persona_id, a.curso_id, a.regla_id, a.tipo, a.estado, a.fecha_limite, a.creada_en,
            (SELECT json_build_object('hasta', e.vigente_hasta, 'motivo', e.motivo, 'por', e.aprobada_por) FROM nexo.excepciones e
              WHERE e.asignacion_id = a.id AND e.tipo = 'exencion' ORDER BY e.creada_en DESC LIMIT 1) AS exencion
       FROM nexo.asignaciones a ORDER BY a.creada_en, a.id`);
  const rolesNoPropios = ctx.roles.filter(r => r.alcance !== 'propio');
  const ctxSinPropio: Contexto = { ...ctx, roles: rolesNoPropios };
  const asigVisibles = ar.rows.filter(a => {
    const p = porId.get(a.persona_id); if (!p) return false;
    return a.persona_id === yo || puede(ctx, 'asignaciones.ver', objetivo(p, a.curso_id)).ok;
  });

  // Alcance para la consola: personas que la persona ve por sus roles administrativos (no por ser trabajadora)
  const alcanceIds = new Set<string>();
  for (const p of personasDB) if (rolesNoPropios.length && puede(ctxSinPropio, 'personas.ver', objetivo(p)).ok) alcanceIds.add(p.id);
  const cursosACargo = ctx.especiales.filter(e => e.tipo === 'curso_a_cargo').map(e => e.cursoId).filter(Boolean) as string[];
  const soloCursos = rolesNoPropios.length > 0 && rolesNoPropios.every(r => r.alcance === 'cursos');
  if (soloCursos) for (const a of asigVisibles) if (cursosACargo.includes(a.curso_id) && a.persona_id !== yo) alcanceIds.add(a.persona_id);
  // El instructor también es trabajador: sus propias asignaciones de sus cursos no forman parte de su alcance de gestión
  const incluidos = new Set<string>([...alcanceIds, yo]);
  const asigs = asigVisibles.filter(a => incluidos.has(a.persona_id) && (a.persona_id === yo || !soloCursos || cursosACargo.includes(a.curso_id)));
  const asigIds = new Set(asigs.map(a => a.id));

  // ---------- Participaciones, intentos, validaciones, acreditaciones, constancias ----------
  const parts = (await c.query(
    `SELECT id, asignacion_id, persona_id, curso_id, version_id, es_renovacion, iniciada_en, lecciones_completadas, intentos_extra,
            pendiente_validacion_desde, cancelada_en FROM nexo.participaciones ORDER BY iniciada_en NULLS LAST, id`)).rows.filter(p => asigIds.has(p.asignacion_id));
  const partIds = new Set(parts.map(p => p.id));
  const intentos = (await c.query('SELECT * FROM nexo.intentos WHERE NOT anulado ORDER BY numero')).rows.filter(i => partIds.has(i.participacion_id));
  const vals = (await c.query('SELECT * FROM nexo.validaciones ORDER BY registrada_en')).rows.filter(v => partIds.has(v.participacion_id));
  const nombres = new Map<string, string>((await c.query('SELECT * FROM nexo.nombres_relacionados()')).rows.map(x => [x.id, x.nombre]));
  for (const p of personasDB) nombres.set(p.id, p.nombre_completo);
  const acredsDB = (await c.query('SELECT * FROM nexo.acreditaciones ORDER BY fecha, id')).rows
    .filter(a => incluidos.has(a.persona_id) && (a.persona_id === yo || !soloCursos || cursosACargo.includes(a.curso_id)));
  const acredIds = new Set(acredsDB.map(a => a.id));
  const constsDB = (await c.query('SELECT * FROM nexo.constancias ORDER BY emitida_en, folio')).rows.filter(k => acredIds.has(k.acreditacion_id));
  const acredPorPart = new Map(acredsDB.filter(a => a.participacion_id).map(a => [a.participacion_id, a.id]));
  const acredPorId = new Map(acredsDB.map(a => [a.id, a]));

  const S: any = {
    hoy, cfg: { aviso: 30 },
    personas: [...incluidos].map(id => porId.get(id)).filter(Boolean).map((x: any) => ({
      id: x.id, num: x.numero ?? '—', nombre: x.nombre_completo, tipo: x.tipo, contratista: x.empresa_contratista, vence: fecha(x.acceso_vence),
      area: x.act?.area ?? null, turno: x.act ? turnoClave[x.act.turno] : null, puesto: x.act ? puesto[x.act.puesto] ?? '' : '', ingreso: fecha(x.vigente_desde),
      cuenta: x.cuenta ?? 'sin_activar', rankOptIn: !!x.participa_ranking, ultimo: fecha(x.ultimo_acceso), empresa: x.act?.empresa ?? x.empresa_num,
      adscripciones: x.ads.map((a: any) => ({ area: a.area, turno: turnoClave[a.turno], puesto: puesto[a.puesto] ?? '', desde: fecha(a.desde), hasta: fecha(a.hasta) })),
    })),
    asigs: asigs.map(a => ({
      id: a.id, persona: a.persona_id, curso: claveCurso[a.curso_id], regla: a.regla_id, creada: fecha(a.creada_en), limite: fecha(a.fecha_limite),
      estado: a.estado, tipo: a.tipo,
      exencion: a.exencion ? { hasta: fecha(a.exencion.hasta), motivo: a.exencion.motivo, por: nombres.get(a.exencion.por) ?? '—' } : null,
    })),
    parts: parts.map(p => ({
      id: p.id, asig: p.asignacion_id, persona: p.persona_id, curso: claveCurso[p.curso_id], version: p.version_id ? numeroVersion[p.version_id] : null,
      inicio: fecha(p.iniciada_en), hechas: p.lecciones_completadas ?? [], extra: p.intentos_extra, cancelada: fecha(p.cancelada_en),
      acred: acredPorPart.get(p.id) ?? null, renov: p.es_renovacion, pvDesde: fecha(p.pendiente_validacion_desde),
      intentos: intentos.filter(i => i.participacion_id === p.id).map(i => ({
        id: i.id, n: i.numero, inicio: fecha(i.iniciado_en), fecha: fecha(i.enviado_en), calif: num(i.calificacion), aprobado: i.aprobado,
        qs: i.respuestas?.qs ?? [], ans: i.enviado_en ? {} : (i.respuestas?.ans ?? {}),
        resp: i.enviado_en && p.persona_id === yo ? (i.respuestas?.resp ?? []).map((r: any) => ({ ok: r.ok, tema: r.tema })) : null,
      })),
      vals: vals.filter(v => v.participacion_id === p.id).map(v => ({
        id: v.id, fecha: fecha(v.fecha_practica), registro: fecha(v.registrada_en), validador: nombres.get(v.validador_id) ?? 'Validador autorizado',
        crit: v.criterios, res: v.resultado === 'competente' ? 'competente' : 'aun_no', obs: v.observaciones ?? '', foto: false,
        conf: !!v.confirmada_en, disp: !!v.no_reconocida_en, anulada: !!v.anulada_en,
      })),
    })),
    acreds: acredsDB.map(a => ({
      id: a.id, part: a.participacion_id, persona: a.persona_id, curso: claveCurso[a.curso_id], version: a.version_id ? numeroVersion[a.version_id] : null,
      fecha: fecha(a.fecha), vence: fecha(a.vence), calif: a.calificacion === null ? null : Math.round(Number(a.calificacion)), estado: a.estado, tipo: a.tipo,
    })),
    consts: constsDB.map(k => {
      const a = acredPorId.get(k.acreditacion_id);
      return {
        id: k.id, folio: k.folio, acred: k.acreditacion_id, persona: a.persona_id, curso: claveCurso[a.curso_id], version: a.version_id ? numeroVersion[a.version_id] : null,
        emitida: fecha(k.emitida_en), estado: k.estado, anterior: k.sustituye_a, motivo: k.motivo, plantilla: 'v1', huella: k.sha256,
      };
    }),
  };

  // ---------- Reglas de asignación ----------
  const reglas = (await c.query('SELECT r.*, p.nombre_completo AS autor FROM nexo.reglas_asignacion r LEFT JOIN nexo.personas p ON p.id = r.creada_por ORDER BY r.creada_en, r.id')).rows;
  const conteo = new Map<string, number>(); for (const a of ar.rows) if (a.regla_id) conteo.set(a.regla_id, (conteo.get(a.regla_id) ?? 0) + 1);
  S.reglas = reglas.map((r, i) => ({
    id: r.id, clave: 'R' + (i + 1), curso: claveCurso[r.curso_id], areas: r.filtro.areas ?? [], turnos: (r.filtro.turnos ?? []).map((t: string) => turnoClave[t]),
    dias: r.dias_limite, contratistas: r.filtro.contratistas !== false, tipo: r.tipo, creada: fecha(r.creada_en), autor: r.autor ?? '—',
    estado: r.activa ? 'activa' : 'inactiva', asignaciones: conteo.get(r.id) ?? 0, nueva: fecha(r.creada_en) === hoy,
  }));

  // ---------- Motivación: mis puntos y ranking del equipo ----------
  S.puntos = (await c.query('SELECT fecha, puntos, motivo FROM nexo.puntos WHERE persona_id = $1 ORDER BY fecha, id', [yo])).rows
    .map(x => ({ persona: yo, fecha: fecha(x.fecha), pts: x.puntos, motivo: x.motivo }));
  const semana = new Date(Date.parse(hoy + 'T00:00:00Z') - 6 * 864e5).toISOString().slice(0, 10);
  S.ranking = (await c.query('SELECT * FROM nexo.ranking_equipo($1)', [semana])).rows.map(x => ({ nombre: x.nombre, pts: Number(x.puntos), yo: x.es_yo, participa: x.participa }));

  // ---------- Exportaciones propias ----------
  S.exports = (await c.query('SELECT * FROM nexo.exportaciones WHERE solicitada_por = $1 ORDER BY creada_en DESC LIMIT 20', [yo])).rows
    .map(e => ({ nombre: e.filtros?.titulo ?? e.reporte, formato: e.formato, fecha: e.creada_en.toISOString(), usuario: yo, registros: e.registros }));

  // ---------- Bitácora (solo roles con permiso) ----------
  S.bit = [];
  if (puede(ctx, 'bitacora.ver').ok) {
    const b = (await c.query(
      `SELECT b.id, b.ocurrido_en, b.actor_id, b.actor_rol, b.accion, b.tabla, b.registro_id, b.despues, b.antes, b.motivo, p.nombre_completo AS actor
         FROM nexo.bitacora b LEFT JOIN nexo.personas p ON p.id = b.actor_id
        ORDER BY b.ocurrido_en DESC, b.id DESC LIMIT 600`)).rows;
    const rolesActor = new Map<string, string>();
    for (const x of (await c.query(`SELECT persona_id, string_agg(DISTINCT rol, ', ') AS roles FROM nexo.asignaciones_rol WHERE rol <> 'trabajador' GROUP BY persona_id`)).rows) rolesActor.set(x.persona_id, x.roles);
    const ROLN: Record<string, string> = { administrador: 'Administrador', rh: 'RH', instructor: 'Instructora', supervisor: 'Supervisora', auditor: 'Auditor' };
    const nombrePersona = (id: unknown) => (typeof id === 'string' ? nombres.get(id) : undefined);
    const cursoN = (id: unknown) => (typeof id === 'string' && claveCurso[id] ? CURSOS[claveCurso[id]].nombre : undefined);
    S.bit = b.map(x => {
      const tecnico = ['INSERT', 'UPDATE', 'DELETE'].includes(x.accion);
      const d = x.despues ?? x.antes ?? {};
      const rol = x.actor_rol ?? (x.actor_id ? (rolesActor.get(x.actor_id) ?? 'Trabajador(a)').split(', ').map((r: string) => ROLN[r] ?? r).join(', ') : 'Proceso automático');
      const detalle = tecnico
        ? [nombrePersona(d.persona_id), cursoN(d.curso_id), d.folio, d.estado && x.accion === 'UPDATE' ? 'estado: ' + d.estado : null, x.motivo ? 'motivo: ' + x.motivo : null].filter(Boolean).join(' · ')
        : (d.detalle ?? Object.entries(d).filter(([, v]) => typeof v !== 'object').map(([k, v]) => k + ': ' + v).join(' · '));
      return {
        ts: x.ocurrido_en.toISOString(), actor: x.actor ?? (x.actor_id ? 'Persona fuera de tu alcance' : 'Sistema'), rol,
        accion: tecnico ? ({ INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' } as Record<string, string>)[x.accion] + ' de ' + (TABLA[x.tabla] ?? x.tabla).toLowerCase() : x.accion,
        entidad: d.entidad ?? TABLA[x.tabla] ?? x.tabla, detalle, tecnico,
      };
    });
  }

  // ---------- Quién soy y mi alcance ----------
  const p = porId.get(yo);
  const roles = [...new Set(ctx.roles.map(r => ROL_UI[r.rol]))];
  const valida = ctx.especiales.filter(e => e.tipo === 'validador_practico').map(e => claveCurso[e.cursoId ?? '']).filter(Boolean);
  const cursos = cursosACargo.map(id => claveCurso[id]).filter(Boolean);
  const empresaYo = p?.act?.empresa ?? p?.empresa_num;
  const empresaNombre = empresas.find(e => e.id === empresaYo)?.nombre ?? empresas[0]?.nombre ?? '';
  const sup = rolesNoPropios.find(r => r.alcance === 'area_turno');
  let alcance: any;
  if (rolesNoPropios.some(r => r.alcance === 'grupo')) alcance = { nivel: 'empresa', etiqueta: 'Todo el grupo', cursos: null };
  else if (rolesNoPropios.some(r => r.alcance === 'empresa' || r.alcance === 'planta')) alcance = { nivel: 'empresa', etiqueta: empresaNombre, cursos: null };
  else if (sup) alcance = { nivel: 'equipo', etiqueta: (nombreDe('area')[sup.areaId!] ?? 'Área') + ' · Turno ' + String(turnoClave[sup.turnoId!] ?? '').slice(1), cursos: null };
  else if (soloCursos) alcance = { nivel: 'cursos', etiqueta: 'Mis cursos: ' + cursos.map(k => CURSOS[k]?.nombre).join(', '), cursos };
  else alcance = { nivel: 'propio', etiqueta: 'Mis datos', cursos: null };
  alcance.personas = rolesNoPropios.length ? [...alcanceIds] : [yo];

  S.yo = {
    persona: yo, roles, valida, cursos, equipoCompartido,
    etiqueta: roles.filter(r => r !== 'trabajador').length ? roles.filter(r => r !== 'trabajador').join(' · ') : 'trabajador',
  };
  S.alcance = alcance;
  S.org = { empresas, plantas, areas, turnos, empresa: empresaNombre, grupo: (await c.query('SELECT nombre FROM nexo.grupos')).rows[0]?.nombre ?? '' };
  S.CURSOS = CURSOS;
  return S;
}
