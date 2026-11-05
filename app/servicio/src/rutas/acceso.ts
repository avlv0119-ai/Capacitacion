// Activación de cuenta, inicio y cierre de sesión (F-03, F-04, RF-ACC, RNF-AUT, RNF-SES).
import type { Servicio } from '../sesion.ts';
import { COOKIE_SESION, cargarContexto, requerirSesion } from '../sesion.ts';
import { conUsuario, sinUsuario } from '../db.ts';
import { claveAcceso, generarToken, hashFrase, huellaCodigo, huellaDeRelleno, huellaToken, mismaHuella, revisarFrase, verificarFrase } from '../seguridad.ts';
import { espacioInicial, tieneRolAdministrativo } from '../permisos.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERO = /^[A-Za-z0-9-]{1,20}$/;
const MSJ_ACCESO = 'Revisa tu número de empleado y tu frase de acceso.';
const MSJ_ACTIVACION = 'Revisa tu número de empleado y el código de tu ficha. Si el código venció, pide una ficha nueva a tu administrador.';

function texto(v: unknown, max = 200): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;
}

export async function rutasAcceso(s: Servicio): Promise<void> {
  const { app, cfg, pool } = s;

  async function esperaRequerida(clave: string, origen: string): Promise<number> {
    const r = await sinUsuario(pool, c => c.query('SELECT nexo.espera_acceso($1, $2) AS s', [clave, origen]));
    return r.rows[0].s as number;
  }
  async function registrarIntento(clave: string, origen: string, exito: boolean): Promise<void> {
    await sinUsuario(pool, c => c.query('SELECT nexo.registrar_intento_acceso($1, $2, $3)', [clave, origen, exito]));
  }
  async function buscarCuenta(empresaId: string, numero: string) {
    const r = await sinUsuario(pool, c => c.query('SELECT * FROM nexo.cuenta_para_acceso($1, $2)', [empresaId, numero]));
    return r.rows[0] as { persona_id: string; grupo_id: string; estado: string; hash_frase: string | null; acceso_vigente: boolean } | undefined;
  }

  // ---------- Activación con el código de la ficha ----------
  app.post('/api/acceso/activar', async (req, rep) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const empresaId = texto(b.empresaId, 36), numero = texto(b.numero, 20), codigo = texto(b.codigo, 20), frase = texto(b.frase, 256);
    if (!empresaId || !UUID.test(empresaId) || !numero || !NUMERO.test(numero) || !codigo || !frase) {
      return rep.code(400).send({ error: 'Completa la empresa, tu número de empleado, el código y tu frase de acceso.' });
    }
    const clave = claveAcceso(cfg.pepper, empresaId, numero);
    const espera = await esperaRequerida(clave, req.ip);
    if (espera > 0) return rep.code(429).header('Retry-After', String(espera)).send({ error: `Espera ${espera} segundos para intentar de nuevo.` });

    const cuenta = await buscarCuenta(empresaId, numero);
    const codigos = cuenta && cuenta.acceso_vigente
      ? (await sinUsuario(pool, c => c.query('SELECT * FROM nexo.codigos_vigentes($1)', [cuenta.persona_id]))).rows as { id: string; hash_codigo: string }[]
      : [];
    const h = huellaCodigo(cfg.pepper, codigo);
    const vigente = codigos.find(x => mismaHuella(x.hash_codigo, h));
    if (!cuenta || !vigente) {
      await registrarIntento(clave, req.ip, false);
      return rep.code(400).send({ error: MSJ_ACTIVACION });
    }
    const problema = revisarFrase(frase, cfg.longitudMinimaFrase, [numero]);
    if (problema) return rep.code(400).send({ error: problema });

    const huella = await hashFrase(frase);
    await sinUsuario(pool, c => c.query('SELECT nexo.activar_cuenta($1, $2, $3)', [cuenta.persona_id, vigente.id, huella]));
    await registrarIntento(clave, req.ip, true);
    return rep.code(204).send();
  });

  // ---------- Inicio de sesión ----------
  app.post('/api/acceso/entrar', async (req, rep) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const empresaId = texto(b.empresaId, 36), numero = texto(b.numero, 20), frase = texto(b.frase, 256);
    const equipoPersonal = b.equipoPersonal === true;
    if (!empresaId || !UUID.test(empresaId) || !numero || !NUMERO.test(numero) || !frase) {
      return rep.code(400).send({ error: MSJ_ACCESO });
    }
    const clave = claveAcceso(cfg.pepper, empresaId, numero);
    const espera = await esperaRequerida(clave, req.ip);
    if (espera > 0) return rep.code(429).header('Retry-After', String(espera)).send({ error: `Espera ${espera} segundos para intentar de nuevo.` });

    const cuenta = await buscarCuenta(empresaId, numero);
    // Siempre se verifica una huella, exista o no la cuenta, para no revelar números válidos por el tiempo de respuesta.
    const correcta = await verificarFrase(cuenta?.hash_frase ?? await huellaDeRelleno(), frase);
    if (!cuenta || !correcta || cuenta.estado !== 'activa' || !cuenta.acceso_vigente) {
      await registrarIntento(clave, req.ip, false);
      return rep.code(401).send({ error: MSJ_ACCESO });
    }
    await registrarIntento(clave, req.ip, true);

    const ctx = await cargarContexto(pool, cuenta.persona_id, cuenta.grupo_id);
    // Duraciones: equipo compartido (por defecto), dispositivo personal, o rol administrativo (más estricto)
    let inactividadMin: number, duracionMin: number, recordar = false;
    if (tieneRolAdministrativo(ctx)) {
      inactividadMin = equipoPersonal ? cfg.minutosInactividadAdministrativo : Math.min(cfg.minutosInactividadAdministrativo, cfg.minutosInactividadCompartido);
      duracionMin = cfg.horasDuracionAdministrativo * 60;
    } else if (equipoPersonal) {
      duracionMin = cfg.diasDuracionPersonal * 24 * 60; inactividadMin = duracionMin; recordar = true;
    } else {
      inactividadMin = cfg.minutosInactividadCompartido; duracionMin = cfg.horasDuracionCompartido * 60;
    }
    const token = generarToken();
    await sinUsuario(pool, c => c.query('SELECT nexo.crear_sesion($1, $2, $3, make_interval(mins => $4), make_interval(mins => $5), $6)',
      [cuenta.persona_id, huellaToken(token), !equipoPersonal, inactividadMin, duracionMin, req.ip]));
    rep.setCookie(COOKIE_SESION, token, {
      httpOnly: true, secure: cfg.cookieSegura, sameSite: 'strict', path: '/',
      ...(recordar ? { maxAge: duracionMin * 60 } : {}),   // en equipo compartido la cookie muere al cerrar el navegador
    });
    return rep.send({ espacio: espacioInicial(ctx), equipoCompartido: !equipoPersonal, inactividadMinutos: inactividadMin });
  });

  // ---------- Cierre de sesión ----------
  app.post('/api/acceso/salir', async (req, rep) => {
    const token = req.cookies[COOKIE_SESION];
    if (token) await sinUsuario(pool, c => c.query('SELECT nexo.cerrar_sesion($1)', [huellaToken(token)]));
    rep.clearCookie(COOKIE_SESION, { path: '/' });
    return rep.code(204).send();
  });

  // ---------- Salud del servicio (monitoreo y verificación del contenedor) ----------
  app.get('/api/salud', async (_req, rep) => {
    try {
      await sinUsuario(pool, c => c.query('SELECT 1'));
      return rep.send({ estado: 'ok', base: 'ok' });
    } catch {
      return rep.code(503).send({ estado: 'error', base: 'sin conexión' });
    }
  });

  // ---------- Quién soy ----------
  app.get('/api/yo', async (req, rep) => {
    if (!(await requerirSesion(s, req, rep))) return rep;
    const ctx = req.ctx!;
    const p = await conUsuario(pool, ctx.personaId, c => c.query('SELECT nombre_completo, tipo FROM nexo.personas WHERE id = $1', [ctx.personaId]));
    return rep.send({
      personaId: ctx.personaId,
      nombre: p.rows[0]?.nombre_completo,
      roles: ctx.roles.map(r => ({ rol: r.rol, alcance: r.alcance })),
      espacio: espacioInicial(ctx),
      equipoCompartido: req.sesion!.equipoCompartido,
    });
  });
}
