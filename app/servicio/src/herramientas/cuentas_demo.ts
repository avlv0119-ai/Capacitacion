// Activa las cuentas de demostración con frases de acceso generadas al azar y las muestra UNA sola vez.
// Uso (en el servidor, con la conexión del dueño de la base):
//   DATABASE_URL_ADMIN=postgresql://... node --experimental-strip-types src/herramientas/cuentas_demo.ts
// Solo para el ambiente de demostración. Los datos son ficticios.
import pg from 'pg';
import { randomInt } from 'node:crypto';
import { hashFrase } from '../seguridad.ts';

const CUENTAS = [
  { numero: '000215', rol: 'Administrador' },
  { numero: '000412', rol: 'Recursos Humanos' },
  { numero: '001920', rol: 'Supervisora y validadora' },
  { numero: '001377', rol: 'Instructora' },
  { numero: '000533', rol: 'Auditor (solo lectura)' },
  { numero: '004817', rol: 'Trabajadora' },
  { numero: 'C-000123', rol: 'Contratista' },
];

const PALABRAS = ('mesa verde cielo turno piedra luna nube tren barco camino puente bosque llave martillo tuerca engrane rueda banda faro mapa ' +
  'brujula canela limon mango naranja coco trigo maiz arroz frijol salsa taza vaso plato silla puerta ventana techo pared piso ' +
  'lapiz libro hoja carta sobre sello reloj alarma campana radio tambor flauta guitarra piano violin cancion ritmo baile fiesta ' +
  'playa arena ola marea isla lago rio cascada volcan montana valle pradera desierto selva jungla tigre leon zorro lobo oso ' +
  'aguila halcon buho cuervo paloma gallo pato ganso cabra oveja caballo burro toro vaca cerdo conejo raton ardilla castor nutria').split(' ');

function frase(): string {
  return Array.from({ length: 4 }, () => PALABRAS[randomInt(PALABRAS.length)]).join(' ');
}

const url = process.env.DATABASE_URL_ADMIN;
if (!url) { console.error('Falta DATABASE_URL_ADMIN'); process.exit(1); }
const c = new pg.Client({ connectionString: url });
await c.connect();
const filas: { numero: string; nombre: string; rol: string; frase: string }[] = [];
try {
  await c.query('BEGIN');
  for (const x of CUENTAS) {
    const r = await c.query(
      `SELECT p.id, p.nombre_completo FROM nexo.numeros_empleado n JOIN nexo.personas p ON p.id = n.persona_id
        WHERE upper(n.numero) = upper($1) AND n.vigente_hasta IS NULL`, [x.numero]);
    if (r.rows.length !== 1) throw new Error(`No se encontró una sola persona con el número ${x.numero}. ¿Se cargaron los datos de demostración?`);
    const f = frase();
    await c.query(`UPDATE nexo.cuentas SET estado = 'activa', hash_frase = $2 WHERE persona_id = $1`, [r.rows[0].id, await hashFrase(f)]);
    await c.query(`UPDATE nexo.sesiones SET revocada_en = now() WHERE persona_id = $1 AND revocada_en IS NULL`, [r.rows[0].id]);
    filas.push({ numero: x.numero, nombre: r.rows[0].nombre_completo, rol: x.rol, frase: f });
  }
  await c.query(`INSERT INTO nexo.bitacora (grupo_id, accion, tabla, despues)
                 SELECT id, 'Activar cuentas de demostración', 'cuentas', $1::jsonb FROM nexo.grupos LIMIT 1`,
                [JSON.stringify({ cuentas: filas.map(f => f.numero) })]);
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK');
  console.error((e as Error).message);
  process.exit(1);
} finally {
  await c.end();
}
console.log('\nCuentas de demostración activadas (DATOS FICTICIOS). Guarda estas frases: no se vuelven a mostrar.\n');
for (const f of filas) console.log(`  ${f.numero.padEnd(9)} ${f.rol.padEnd(26)} ${f.nombre.padEnd(22)} frase: ${f.frase}`);
if (process.env.NEXO_DEMO_JSON) console.log('\n' + JSON.stringify(filas));
console.log('');
