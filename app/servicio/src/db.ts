// Acceso a PostgreSQL. Cada operación corre en una transacción que declara QUIÉN es el usuario;
// la base calcula su grupo y sus empresas y aplica la seguridad por fila (app/db/migraciones/002).
import pg from 'pg';

export type Cliente = pg.PoolClient;

export function crearPool(url: string): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
}

async function enTransaccion<T>(pool: pg.Pool, usuarioId: string, fn: (c: Cliente) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SELECT set_config('app.usuario_id', $1, true)", [usuarioId]);
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/** Operación en nombre de una persona autenticada. */
export function conUsuario<T>(pool: pg.Pool, usuarioId: string, fn: (c: Cliente) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) throw new Error('Identificador de usuario inválido');
  return enTransaccion(pool, usuarioId, fn);
}

/** Operación sin usuario (antes de iniciar sesión): solo puede usar las funciones acotadas de acceso. */
export function sinUsuario<T>(pool: pg.Pool, fn: (c: Cliente) => Promise<T>): Promise<T> {
  return enTransaccion(pool, '', fn);
}
