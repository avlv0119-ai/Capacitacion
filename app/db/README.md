# Nexo · Núcleo de datos (PostgreSQL)

Etapa 4, módulo M1. **Propuesta pendiente de aprobación de TI** (D-33). Datos de prueba ficticios.

| Ruta | Contenido |
|---|---|
| `migraciones/001_esquema.sql` | Tablas, restricciones, llaves compuestas e índices |
| `migraciones/002_seguridad.sql` | Roles, seguridad por fila, bitácora automática, reglas protegidas y folios |
| `pruebas/pruebas.sql` | 50 comprobaciones con datos ficticios de dos grupos |
| `pruebas/ejecutar.sh` | Crea una base temporal, aplica migraciones y ejecuta las pruebas |

## Ejecutar las pruebas

```bash
bash app/db/pruebas/ejecutar.sh
```

Requiere PostgreSQL 16 (`initdb`, `pg_ctl`, `psql`). No usa ni modifica ninguna base existente.

## Uso desde la aplicación

- Conectarse con un rol que herede de `nexo_app`; nunca con el dueño ni con un superusuario.
- En cada transacción: `SET LOCAL app.usuario_id = '<id de la persona autenticada>'`.
- Generar los identificadores (UUID) en la aplicación al dar de alta personas.

Diseño y explicación: [`docs/etapa-4/02-modelo-de-datos.md`](../../docs/etapa-4/02-modelo-de-datos.md).
