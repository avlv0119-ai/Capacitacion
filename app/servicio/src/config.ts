// Configuración del servicio. Todo valor sensible llega por variables de entorno; nada se guarda en el código.
export interface Config {
  databaseUrl: string;
  pepper: string;                      // secreto del servidor para las huellas de códigos y claves de acceso
  cookieSegura: boolean;               // false solo en pruebas locales sin HTTPS
  longitudMinimaFrase: number;         // a fijar con TI (RNF-AUT); valor inicial 12
  minutosInactividadCompartido: number;    // RNF-SES-04: 5 (rango 2 a 15)
  horasDuracionCompartido: number;         // RNF-SES-04: 2
  diasDuracionPersonal: number;            // RNF-SES-02: 30
  minutosInactividadAdministrativo: number; // RNF-SES-03: 30
  horasDuracionAdministrativo: number;      // RNF-SES-03: 12
  horasCaducidadActivacion: number;        // RF-ACC-02: 72
  minutosCaducidadRestablecimiento: number; // FD-03: 30
  puerto: number;
}

function numero(valor: string | undefined, porDefecto: number, min: number, max: number, nombre: string): number {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Configuración inválida: ${nombre} debe estar entre ${min} y ${max}`);
  return n;
}

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  const pepper = env.NEXO_PEPPER;
  if (!databaseUrl) throw new Error('Falta DATABASE_URL');
  if (!pepper || pepper.length < 32) throw new Error('NEXO_PEPPER debe tener al menos 32 caracteres');
  return {
    databaseUrl,
    pepper,
    cookieSegura: env.NEXO_COOKIE_SEGURA !== 'no',
    longitudMinimaFrase: numero(env.NEXO_FRASE_MINIMA, 12, 8, 64, 'NEXO_FRASE_MINIMA'),
    minutosInactividadCompartido: numero(env.NEXO_INACTIVIDAD_COMPARTIDO, 5, 2, 15, 'NEXO_INACTIVIDAD_COMPARTIDO'),
    horasDuracionCompartido: numero(env.NEXO_DURACION_COMPARTIDO, 2, 1, 12, 'NEXO_DURACION_COMPARTIDO'),
    diasDuracionPersonal: numero(env.NEXO_DURACION_PERSONAL, 30, 1, 90, 'NEXO_DURACION_PERSONAL'),
    minutosInactividadAdministrativo: numero(env.NEXO_INACTIVIDAD_ADMIN, 30, 5, 120, 'NEXO_INACTIVIDAD_ADMIN'),
    horasDuracionAdministrativo: numero(env.NEXO_DURACION_ADMIN, 12, 1, 24, 'NEXO_DURACION_ADMIN'),
    horasCaducidadActivacion: numero(env.NEXO_CADUCIDAD_ACTIVACION, 72, 1, 336, 'NEXO_CADUCIDAD_ACTIVACION'),
    minutosCaducidadRestablecimiento: numero(env.NEXO_CADUCIDAD_RESTABLECIMIENTO, 30, 5, 1440, 'NEXO_CADUCIDAD_RESTABLECIMIENTO'),
    puerto: numero(env.PORT, 3000, 1, 65535, 'PORT'),
  };
}
