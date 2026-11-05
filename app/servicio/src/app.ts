// Construcción del servicio HTTP: encabezados de seguridad, protección contra solicitudes cruzadas,
// validación de sesión y rutas de acceso y administración.
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import type pg from 'pg';
import type { Config } from './config.ts';
import type { Servicio } from './sesion.ts';
import { rutasAcceso } from './rutas/acceso.ts';
import { rutasAdmin } from './rutas/admin.ts';

export { COOKIE_SESION } from './sesion.ts';

export async function construirApp(cfg: Config, pool: pg.Pool): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true, bodyLimit: 64 * 1024 });
  await app.register(cookie);
  app.decorateRequest('sesion', null);
  app.decorateRequest('ctx', null);

  app.addHook('onSend', async (_req, rep, carga) => {
    rep.header('Cache-Control', 'no-store');
    rep.header('X-Content-Type-Options', 'nosniff');
    rep.header('Referrer-Policy', 'no-referrer');
    rep.header('X-Frame-Options', 'DENY');
    return carga;
  });

  // Protección contra solicitudes de otros sitios: además de SameSite=Strict, toda escritura
  // debe traer un encabezado propio que un formulario externo no puede enviar.
  app.addHook('onRequest', async (req, rep) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-nexo'] !== '1') {
      return rep.code(403).send({ error: 'Solicitud no permitida.' });
    }
  });

  app.setErrorHandler((err, _req, rep) => {
    const estado = (err as { statusCode?: number }).statusCode;
    const codigo = estado && estado < 500 ? estado : 500;
    rep.code(codigo).send({ error: codigo === 500 ? 'Algo salió mal de nuestro lado. Intenta de nuevo.' : 'La solicitud no es válida.' });
  });

  const servicio: Servicio = { app, cfg, pool };
  await rutasAcceso(servicio);
  await rutasAdmin(servicio);
  return app;
}
