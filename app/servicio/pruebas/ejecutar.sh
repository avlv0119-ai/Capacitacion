#!/usr/bin/env bash
# Pruebas del servicio Nexo: crea una base PostgreSQL temporal, aplica las migraciones,
# carga datos ficticios y ejecuta las pruebas unitarias y de integración.
# Uso: bash app/servicio/pruebas/ejecutar.sh
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICIO="$(cd "$AQUI/.." && pwd)"
MIGRACIONES="$(cd "$SERVICIO/../db/migraciones" && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
COMO=()
if [ "$(id -u)" = "0" ]; then COMO=(runuser -u postgres --); chown postgres "$TMP"; fi
detener() { "${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/datos" -m fast stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap detener EXIT

"${COMO[@]}" "$PGBIN/initdb" -D "$TMP/datos" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/datos" -o "-k $TMP -c listen_addresses=''" -l "$TMP/registro.log" -w start >/dev/null
PSQL=("${COMO[@]}" "$PGBIN/psql" -h "$TMP" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1)
for m in "$MIGRACIONES"/*.sql; do "${PSQL[@]}" -f "$m" >/dev/null; done
"${PSQL[@]}" -c "CREATE ROLE nexo_servicio LOGIN IN ROLE nexo_app" >/dev/null
"${PSQL[@]}" -f "$AQUI/datos.sql" >/dev/null

export DATABASE_URL="postgresql://nexo_servicio@/postgres?host=$TMP"
export DATABASE_URL_ADMIN="postgresql://postgres@/postgres?host=$TMP"
export NEXO_PEPPER="secreto-solo-para-pruebas-0123456789abcdef"
cd "$SERVICIO"
node --experimental-strip-types --no-warnings --test --test-concurrency=1 --test-reporter=spec pruebas/*.test.ts
