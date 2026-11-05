#!/usr/bin/env bash
# Prueba de restauración SIN tocar la base en uso: restaura un respaldo en una base temporal,
# muestra sus conteos junto a los de la base actual y la elimina. Uso: verificar_respaldo.sh [archivo.dump]
source "$(dirname "$0")/comun.sh"
archivo="${1:-$(ls -1t "${NEXO_RESPALDOS:-/var/backups/nexo}"/nexo-*.dump 2>/dev/null | head -1)}"
[ -f "$archivo" ] || { echo "No encontré un respaldo." >&2; exit 1; }
( cd "$(dirname "$archivo")" && sha256sum -c "$(basename "$archivo").sha256" )
en_db() { docker compose exec -T -e PGOPTIONS='-c client_min_messages=warning' db "$@"; }
en_db dropdb -U "$POSTGRES_USER" --if-exists nexo_prueba_restauracion
en_db createdb -U "$POSTGRES_USER" nexo_prueba_restauracion
en_db pg_restore -U "$POSTGRES_USER" -d nexo_prueba_restauracion --exit-on-error < "$archivo"
consulta="SELECT (SELECT count(*) FROM nexo.personas) || ' personas, ' || (SELECT count(*) FROM nexo.asignaciones) || ' asignaciones, '
  || (SELECT count(*) FROM nexo.acreditaciones) || ' acreditaciones, ' || (SELECT count(*) FROM nexo.constancias) || ' constancias, '
  || (SELECT count(*) FROM nexo.bitacora) || ' entradas de bitácora'"
echo "Respaldo restaurado: $(en_db psql -U "$POSTGRES_USER" -d nexo_prueba_restauracion -X -tA -c "$consulta")"
echo "Base en uso hoy:     $(en_db psql -U "$POSTGRES_USER" -d nexo -X -tA -c "$consulta")"
echo "(La base en uso puede tener más registros si hubo actividad después del respaldo.)"
en_db dropdb -U "$POSTGRES_USER" nexo_prueba_restauracion
echo "Prueba de restauración correcta: $(basename "$archivo")"
