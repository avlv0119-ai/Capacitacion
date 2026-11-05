# Nexo · Servicio de aplicación (módulo M2)

Etapa 4, módulo M2: acceso, sesiones y permisos. **Propuesta pendiente de aprobación de TI** (D-33). No está listo para producción: falta la revisión de seguridad independiente y la Etapa 5.

TypeScript sobre Node.js 22, ejecutado directamente con `--experimental-strip-types`, sin paso de compilación. Usa Fastify 5, `pg` y Argon2id (`@node-rs/argon2`). Las versiones están fijas en `package-lock.json`.

## Qué hace

| Ruta | Para qué | Requisitos |
|---|---|---|
| `POST /api/acceso/activar` | Activa la cuenta con el código de la ficha impresa y define la frase de acceso | RF-ACC-02, B-3 |
| `POST /api/acceso/entrar` | Entra con empresa, número de empleado y frase; equipo compartido o dispositivo personal | RF-ACC, RNF-SES, RNF-DCO |
| `POST /api/acceso/salir` | Cierra la sesión en el servidor | RNF-SES |
| `GET /api/yo` | Persona, roles con alcance y espacio inicial | RF-ROL |
| `POST /api/admin/personas/:id/codigo` | Código de activación o de restablecimiento. Solo el Administrador, dentro de su alcance y nunca para sí mismo. El restablecimiento exige identidad verificada en persona y motivo | FD-01, FD-03, B-3, D-36 |
| `GET /api/asignaciones` | Asignaciones visibles: la base limita a la empresa y el servicio aplica el alcance fino | D-60 |
| `GET /api/salud` | Estado del servicio y de la conexión a la base (para el monitoreo y el contenedor) | RNF-OBS |

**Controles de seguridad:**
- **Frases de acceso:** Argon2id, longitud mínima configurable (12 por defecto) y rechazo de frases débiles.
- **Códigos y claves:** los códigos de la ficha y las claves de acceso se guardan como huella HMAC con un secreto del servidor (`NEXO_PEPPER`). Los códigos son de un solo uso y caducan: activación en 72 h, restablecimiento en 30 min.
- **Sesiones del lado del servidor:** el token solo existe en la cookie (`HttpOnly`, `Secure`, `SameSite=Strict`); en la base solo se guarda su huella SHA-256.
  - Equipo compartido: se cierra tras 5 min de inactividad, con máximo de 2 h.
  - Dispositivo personal: se recuerda hasta 30 días.
  - Roles administrativos: 30 min de inactividad, máximo 12 h, y nunca se recuerdan.
- **Protección contra solicitudes de otros sitios:** toda escritura exige el encabezado `x-nexo: 1`, además de `SameSite=Strict`.
- **Intentos fallidos:** demora progresiva, sin bloqueo permanente. El mismo mensaje para un número inexistente y para una frase incorrecta.
- **Permisos:** motor de permisos (`src/permisos.ts`) con rol, alcance (empresa, grupo, planta, área y turno, cursos, propio) y separación de funciones. La base aplica además la seguridad por fila.

## Configuración

| Variable | Obligatoria | Valor |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión con el usuario limitado `nexo_servicio`, que hereda de `nexo_app` |
| `NEXO_PEPPER` | Sí | Secreto del servidor, de al menos 32 caracteres |
| `NEXO_COOKIE_SEGURA` | No | `no` solo en pruebas locales sin HTTPS |
| `NEXO_FRASE_MINIMA` | No | Longitud mínima de la frase. 12 por defecto; se fija con TI |
| `NEXO_INACTIVIDAD_COMPARTIDO`, `NEXO_DURACION_COMPARTIDO`, `NEXO_DURACION_PERSONAL`, `NEXO_INACTIVIDAD_ADMIN`, `NEXO_DURACION_ADMIN` | No | Tiempos de sesión, dentro de rangos validados |
| `PORT` | No | 3000 |

## Pruebas

```bash
bash app/servicio/pruebas/ejecutar.sh
```

**23 de 23 correctas.** Crean una base PostgreSQL temporal con todas las migraciones y cubren:
- La matriz de permisos por rol y alcance.
- Activación, entrada y salida.
- Tiempos de sesión.
- Demora progresiva.
- Protección contra solicitudes de otros sitios.
- Restablecimiento con bitácora.
- Aislamiento por empresa.

**Con los datos de demostración:**

```bash
bash app/db/demo/probar_demo.sh
```

**12 de 12 correctas.** Entra con las 7 cuentas de demostración y comprueba lo que ve cada rol.

## Ejecutar

- **En un servidor:** con Docker, siguiendo [`despliegue/hostinger/GUIA.md`](../../despliegue/hostinger/GUIA.md).
- **Para desarrollo local:**

```bash
npm ci && DATABASE_URL=... NEXO_PEPPER=... NEXO_COOKIE_SEGURA=no npm start
```

## Herramientas

- `src/herramientas/cuentas_demo.ts`: activa las 7 cuentas de demostración con frases generadas al azar y las muestra una sola vez. **Solo para el ambiente de demostración.**
