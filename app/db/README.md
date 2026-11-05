# Nexo · Núcleo de datos (PostgreSQL)

Etapa 4: base de datos de Nexo (M1, M2 y operación). **Propuesta pendiente de aprobación de TI** (D-33). Los datos de prueba y de demostración son ficticios.

| Ruta | Contenido |
|---|---|
| `migraciones/001_esquema.sql` | Tablas, restricciones, llaves compuestas e índices |
| `migraciones/002_seguridad.sql` | Roles, seguridad por fila, bitácora automática, reglas protegidas y folios |
| `migraciones/003_acceso.sql` | Sesiones, intentos de acceso, permisos especiales y funciones acotadas de acceso (M2) |
| `migraciones/004_operacion.sql` | Funciones acotadas de operación (ver detalle abajo) |
| `pruebas/pruebas.sql` | 50 comprobaciones con datos ficticios de dos grupos |
| `pruebas/ejecutar.sh` | Crea una base temporal, aplica las migraciones y ejecuta las pruebas |
| `demo/prototipo-demo.json` | Datos de demostración exportados del prototipo (ficticios) |
| `demo/contenido-demo.json` | Lecciones y evaluaciones de ejemplo de los cursos de la demostración (DEMO; no son procedimientos de la empresa) |
| `demo/generar_sql_demo.py` | Convierte esos datos en SQL, con las fechas ajustadas al día de la carga (`--hoy AAAA-MM-DD`) |
| `demo/probar_demo.sh` | Carga la demostración en una base temporal, activa las cuentas y verifica cada rol a través del servicio |

## Ejecutar las pruebas

```bash
bash app/db/pruebas/ejecutar.sh
```

**50 de 50 correctas**, con las cuatro migraciones aplicadas.

```bash
bash app/db/demo/probar_demo.sh
```

**12 de 12** comprobaciones de acceso por rol y **34 de 34** de operación. Requiere PostgreSQL 16 (`initdb`, `pg_ctl`, `psql`), Python 3 y Node.js 22. No usa ni modifica ninguna base existente.

## Funciones de la migración 004

- **Acreditación.** Se crea solo si se cumplen los criterios de la versión del curso.
- **Constancias.** Emisión idempotente con folio consecutivo y huella.
- **Práctica.** Confirmación por la persona validada.
- **Ranking voluntario.** Lista a quienes aceptaron participar.
- **Proceso diario.** Renovaciones dentro de la ventana de aviso.
- **Catálogo.** De la organización.

## Datos de demostración

**Volumen:** 116 personas, 346 asignaciones, 365 participaciones, 319 intentos, 31 validaciones prácticas, 243 acreditaciones, 243 constancias y unas 2,200 entradas de bitácora.

**Origen:** se cargan con todas las restricciones y reglas activas, como si se hubieran capturado en la aplicación. Son los mismos datos del prototipo, marcados como ficticios.

**Instalación:** en un servidor se cargan con `despliegue/hostinger/scripts/cargar_demo.sh`, que se niega a cargarlos si la base ya tiene personas.

## Uso desde la aplicación

- Conectarse con un rol que herede de `nexo_app`; nunca con el dueño ni con un superusuario.
- En cada transacción: `SET LOCAL app.usuario_id = '<id de la persona autenticada>'`. El servicio lo hace en `src/db.ts`.
- Generar los identificadores (UUID) en la aplicación al dar de alta personas.

**Diseño y explicación:** [`docs/etapa-4/02-modelo-de-datos.md`](../../docs/etapa-4/02-modelo-de-datos.md).
