// Primitivas de seguridad: frases de acceso (Argon2id), códigos de un solo uso, tokens de sesión.
import { hash, verify } from '@node-rs/argon2';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// Parámetros de Argon2id (perfil mínimo recomendado por OWASP: 19 MiB, 2 iteraciones, 1 hilo).
// Se revisarán con TI y con la prueba de carga (inicios de sesión simultáneos).
const ARGON2 = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashFrase(frase: string): Promise<string> {
  return hash(frase.normalize('NFC'), ARGON2);
}

export async function verificarFrase(huella: string, frase: string): Promise<boolean> {
  try { return await verify(huella, frase.normalize('NFC')); } catch { return false; }
}

// Huella de relleno: cuando la cuenta no existe se verifica contra ella para no revelar, por el tiempo
// de respuesta, si un número de empleado existe (RNF-AUT-02).
let huellaRelleno: Promise<string> | null = null;
export function huellaDeRelleno(): Promise<string> {
  huellaRelleno ??= hashFrase(randomBytes(24).toString('base64'));
  return huellaRelleno;
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I/L, para dictar y copiar sin errores

/** Código de un solo uso para fichas impresas: 8 caracteres, formato XXXX-XXXX (40 bits). */
export function generarCodigo(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s.slice(0, 4) + '-' + s.slice(4);
}

function normalizarCodigo(codigo: string): string {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Huella con secreto del servidor: aunque se filtrara la base, los códigos no se pueden probar sin el secreto. */
export function huellaCodigo(pepper: string, codigo: string): string {
  return createHmac('sha256', pepper).update('codigo:' + normalizarCodigo(codigo)).digest('hex');
}

export function mismaHuella(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Clave para contar intentos de acceso sin guardar el número de empleado en claro. */
export function claveAcceso(pepper: string, empresaId: string, numero: string): string {
  return createHmac('sha256', pepper).update('acceso:' + empresaId + ':' + numero.trim().toUpperCase()).digest('hex');
}

export function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

export function huellaToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Lista breve de frases comunes; en producción se sustituye por una lista amplia de contraseñas filtradas.
const COMUNES = new Set(['contraseña123', 'password1234', '123456789012', 'qwertyuiopas', 'nexo12345678', 'capacitacion', 'contrasena123', 'aaaaaaaaaaaa']);

/** Devuelve un mensaje para la persona si la frase no es aceptable, o null si lo es. */
export function revisarFrase(frase: string, minimo: number, datosPersonales: string[]): string | null {
  const f = frase.normalize('NFC');
  if (f.length < minimo) return `Tu frase debe tener al menos ${minimo} caracteres. Prueba con tres o cuatro palabras que solo tú recuerdes.`;
  if (f.length > 128) return 'Tu frase es demasiado larga: usa como máximo 128 caracteres.';
  const plana = f.toLowerCase().replace(/\s+/g, '');
  if (COMUNES.has(plana) || /^(.)\1+$/.test(plana)) return 'Esta frase es fácil de adivinar. Prueba con tres o cuatro palabras que solo tú recuerdes.';
  for (const d of datosPersonales) {
    const dato = d.trim().toLowerCase();
    if (dato.length >= 4 && plana.includes(dato.replace(/\s+/g, ''))) return 'Tu frase no debe incluir tu número de empleado.';
  }
  return null;
}
