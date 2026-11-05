#!/usr/bin/env bash
# Carga los datos de demostración en una base temporal con todas las migraciones y reglas activas,
# activa las cuentas de demostración y verifica el acceso de cada rol a través del servicio.
# Uso: bash app/db/demo/probar_demo.sh
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
COMO=()
if [ "$(id -u)" = "0" ]; then COMO=(runuser -u postgres --); chown postgres "$TMP"; fi
detener() { "${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/datos" -m fast stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap detener EXIT

"${COMO[@]}" "$PGBIN/initdb" -D "$TMP/datos" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$TMP/datos" -o "-k $TMP -c listen_addresses=''" -l "$TMP/registro.log" -w start >/dev/null
PSQL=("${COMO[@]}" "$PGBIN/psql" -h "$TMP" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1)
for m in "$RAIZ"/db/migraciones/*.sql; do "${PSQL[@]}" -f "$m" >/dev/null; done
"${PSQL[@]}" -c "CREATE ROLE nexo_servicio LOGIN IN ROLE nexo_app" >/dev/null
python3 "$AQUI/generar_sql_demo.py" --salida "$TMP/demo.sql" >/dev/null
"${COMO[@]}" chmod 644 "$TMP/demo.sql" 2>/dev/null || chmod 644 "$TMP/demo.sql"
"${PSQL[@]}" -f "$TMP/demo.sql" >/dev/null
echo "Datos de demostración cargados con todas las restricciones y reglas activas:"
"${PSQL[@]}" -A -F' ' -t -c "SELECT 'personas', count(*) FROM nexo.personas UNION ALL SELECT 'asignaciones', count(*) FROM nexo.asignaciones
  UNION ALL SELECT 'participaciones', count(*) FROM nexo.participaciones UNION ALL SELECT 'intentos', count(*) FROM nexo.intentos
  UNION ALL SELECT 'validaciones', count(*) FROM nexo.validaciones UNION ALL SELECT 'acreditaciones', count(*) FROM nexo.acreditaciones
  UNION ALL SELECT 'constancias', count(*) FROM nexo.constancias UNION ALL SELECT 'bitácora', count(*) FROM nexo.bitacora" | sed 's/^/  /'

export DATABASE_URL="postgresql://nexo_servicio@/postgres?host=$TMP"
export DATABASE_URL_ADMIN="postgresql://postgres@/postgres?host=$TMP"
export NEXO_PEPPER="secreto-solo-para-pruebas-0123456789abcdef"
cd "$RAIZ/servicio"
SALIDA="$(NEXO_DEMO_JSON=1 node --experimental-strip-types --no-warnings src/herramientas/cuentas_demo.ts)"
echo "$SALIDA" | grep -E '^\s+[0-9C]' | sed -E 's/frase: .*/frase: (generada; se muestra solo al instalar)/'
export NEXO_DEMO_CUENTAS="$(echo "$SALIDA" | grep '^\[')"
echo
node --experimental-strip-types --no-warnings pruebas/verificar_demo.ts
