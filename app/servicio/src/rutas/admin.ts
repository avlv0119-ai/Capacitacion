// Rutas administrativas del módulo M2: códigos de activación y restablecimiento (FD-01, FD-03)
// y una consulta con alcance fino (asignaciones) que combina la seguridad por fila con la matriz de permisos.
import type { Servicio } from '../sesion.ts';
import { requerirSesion } from '../sesion.ts';
import { conUsuario } from '../db.ts';
import { generarCodigo, huellaCodigo } from '../seguridad.ts';
import { puede } from '../permisos.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function rutasAdmin(s: Servicio): Promise<void> {
  const { app, cfg, pool } = s;

  // Genera un código de un solo uso. El código se muestra una sola vez; en la base queda solo su huella.
  app.post('/api/admin/personas/:id/codigo', async (req, rep) => {
    if (!(await requerirSesion(s, req, rep))) return rep;
    const ctx = req.ctx!;
    const personaId = (req.params as { id: string }).id;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const tipo = b.tipo === 'restablecimiento' ? 'restablecimiento' : b.tipo === 'activacion' ? 'activacion' : null;
    const motivo = typeof b.motivo === 'string' ? b.motivo.trim().slice(0, 300) : '';
    if (!UUID.test(personaId) || !tipo) return rep.code(400).send({ error: 'Indica la persona y el tipo de código.' });

    // La respuesta se envía solo después de confirmar la transacción.
    const res = await conUsuario(pool, ctx.personaId, async c => {
      const a = await c.query(
        `SELECT p.id, ad.empresa_id, ad.planta_id, ad.area_id, ad.turno_id
           FROM nexo.personas p
           LEFT JOIN nexo.adscripciones ad ON ad.persona_id = p.id AND ad.vigencia @> current_date
          WHERE p.id = $1`, [personaId]);
      const t = a.rows[0];
      if (!t) return { estado: 404, cuerpo: { error: 'No encontramos a esa persona en tu alcance.' } };
      const decision = puede(ctx, 'acceso.codigo', { personaId, empresaId: t.empresa_id, plantaId: t.planta_id, areaId: t.area_id, turnoId: t.turno_id });
      if (!decision.ok) return { estado: 403, cuerpo: { error: decision.motivo } };
      if (tipo === 'restablecimiento' && (b.identidadVerificada !== true || motivo.length < 3)) {
        return { estado: 400, cuerpo: { error: 'Para restablecer el acceso, verifica la identidad en persona y escribe el motivo.' } };
      }
      const codigo = generarCodigo();
      const minutos = tipo === 'activacion' ? cfg.horasCaducidadActivacion * 60 : cfg.minutosCaducidadRestablecimiento;
      const r = await c.query(
        `INSERT INTO nexo.codigos_acceso (grupo_id, persona_id, tipo, hash_codigo, expira_en, generado_por, motivo)
         VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5), $6, $7) RETURNING expira_en`,
        [ctx.grupoId, personaId, tipo, huellaCodigo(cfg.pepper, codigo), minutos, ctx.personaId, motivo || null]);
      if (tipo === 'restablecimiento') {
        await c.query('UPDATE nexo.sesiones SET revocada_en = now() WHERE persona_id = $1 AND revocada_en IS NULL', [personaId]);
      }
      return { estado: 201, cuerpo: { codigo, tipo, expiraEn: r.rows[0].expira_en } };
    });
    return rep.code(res.estado).send(res.cuerpo);
  });

  // Asignaciones visibles: la base limita al grupo y a las empresas del usuario; aquí se aplica el alcance fino.
  app.get('/api/asignaciones', async (req, rep) => {
    if (!(await requerirSesion(s, req, rep))) return rep;
    const ctx = req.ctx!;
    const r = await conUsuario(pool, ctx.personaId, c => c.query(
      `SELECT a.id, a.persona_id, a.curso_id, a.empresa_id, a.fecha_limite, ad.planta_id, ad.area_id, ad.turno_id
         FROM nexo.asignaciones a
         LEFT JOIN nexo.adscripciones ad ON ad.persona_id = a.persona_id AND ad.vigencia @> current_date
        WHERE a.estado = 'activa'
        ORDER BY a.fecha_limite, a.id`));
    const visibles = r.rows.filter(x => puede(ctx, 'asignaciones.ver', {
      personaId: x.persona_id, empresaId: x.empresa_id, plantaId: x.planta_id, areaId: x.area_id, turnoId: x.turno_id, cursoId: x.curso_id,
    }).ok);
    return rep.send({ total: visibles.length, asignaciones: visibles.map(x => ({ id: x.id, personaId: x.persona_id, cursoId: x.curso_id, fechaLimite: x.fecha_limite })) });
  });
}
