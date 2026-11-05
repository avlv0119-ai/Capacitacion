#!/usr/bin/env bash
# Crea una base PostgreSQL temporal, aplica las migraciones y ejecuta las pruebas del núcleo de datos.
# Uso: bash app/db/pruebas/ejecutar.sh
# Requiere los binarios de PostgreSQL 16 (initdb, pg_ctl, psql). Si se ejecuta como root,
# la base temporal corre con el usuario del sistema «postgres».
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(cd "$AQUI/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
COMO=()
if [ "$(id -u)" = "0" ]; then COMO=(runuser -u postgres --); chown postgres "$TMP"; fi

detener() { "${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/datos" -m fast stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap detener EXIT

"${COMO[@]}" "$PGBIN/initdb" -D "$TMP/datos" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/datos" -o "-k $TMP -c listen_addresses=''" -l "$TMP/registro.log" -w start >/dev/null

PSQL=("${COMO[@]}" "$PGBIN/psql" -h "$TMP" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1)
for m in "$DB_DIR"/migraciones/*.sql; do
  "${PSQL[@]}" -f "$m" >/dev/null
  echo "Migración aplicada: $(basename "$m")"
done

SALIDA="$TMP/salida.txt"
set +e
"${PSQL[@]}" -f "$AQUI/pruebas.sql" >"$SALIDA" 2>&1
CODIGO=$?
set -e
sed -E 's/^psql:[^:]+:[0-9]+: (NOTICE|ERROR): +//' "$SALIDA" | grep -E '^(OK|FALLA|==|FIN)|ERROR' || true
OK=$(grep -c 'OK ·' "$SALIDA" || true)
echo
if [ "$CODIGO" -eq 0 ]; then
  echo "Resultado: $OK comprobaciones correctas, 0 fallas"
else
  echo "Resultado: $OK comprobaciones correctas antes de la primera falla"
  exit 1
fi
