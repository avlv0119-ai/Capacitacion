// Sesión y contexto del usuario, compartidos por las rutas.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import type { Config } from './config.ts';
import { conUsuario, sinUsuario } from './db.ts';
import { huellaToken } from './seguridad.ts';
import type { AsignacionRol, Contexto, PermisoEspecial } from './permisos.ts';

export const COOKIE_SESION = 'nexo_sesion';

export interface Sesion { sesionId: string; personaId: string; grupoId: string; equipoCompartido: boolean }

declare module 'fastify' {
  interface FastifyRequest { sesion: Sesion | null; ctx: Contexto | null }
}

export interface Servicio { app: FastifyInstance; cfg: Config; pool: pg.Pool }

/** Roles y permisos especiales vigentes de la persona, leídos en su propio contexto. */
export async function cargarContexto(pool: pg.Pool, personaId: string, grupoId: string): Promise<Contexto> {
  return conUsuario(pool, personaId, async c => {
    const r = await c.query(
      `SELECT rol, alcance, empresa_id, planta_id, area_id, turno_id FROM nexo.asignaciones_rol
        WHERE persona_id = $1 AND vigente_desde <= current_date AND (vigente_hasta IS NULL OR vigente_hasta >= current_date)`, [personaId]);
    const e = await c.query(
      `SELECT tipo, curso_id FROM nexo.permisos_especiales
        WHERE persona_id = $1 AND vigente_desde <= current_date AND (vigente_hasta IS NULL OR vigente_hasta >= current_date)`, [personaId]);
    const roles: AsignacionRol[] = r.rows.map(x => ({ rol: x.rol, alcance: x.alcance, empresaId: x.empresa_id, plantaId: x.planta_id, areaId: x.area_id, turnoId: x.turno_id }));
    const especiales: PermisoEspecial[] = e.rows.map(x => ({ tipo: x.tipo, cursoId: x.curso_id }));
    return { personaId, grupoId, roles, especiales };
  });
}

/** Exige una sesión válida; si venció por inactividad o fue cerrada, responde 401 y borra la cookie. */
export async function requerirSesion(s: Servicio, req: FastifyRequest, rep: FastifyReply): Promise<boolean> {
  const token = req.cookies[COOKIE_SESION];
  if (token) {
    const r = await sinUsuario(s.pool, c => c.query('SELECT * FROM nexo.sesion_valida($1)', [huellaToken(token)]));
    const fila = r.rows[0];
    if (fila) {
      req.sesion = { sesionId: fila.sesion_id, personaId: fila.persona_id, grupoId: fila.grupo_id, equipoCompartido: fila.equipo_compartido };
      req.ctx = await cargarContexto(s.pool, fila.persona_id, fila.grupo_id);
      return true;
    }
  }
  rep.clearCookie(COOKIE_SESION, { path: '/' });
  rep.code(401).send({ error: 'Tu sesión terminó. Vuelve a entrar.' });
  return false;
}
