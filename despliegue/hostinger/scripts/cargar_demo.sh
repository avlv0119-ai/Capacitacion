#!/usr/bin/env bash
# Carga los datos de DEMOSTRACIÓN (ficticios) y activa las 7 cuentas de demostración.
# Las frases de acceso se muestran UNA sola vez. Solo funciona sobre una base sin personas.
source "$(dirname "$0")/comun.sh"
n="$(psql_nexo -tA -c "SELECT count(*) FROM nexo.personas")"
if [ "$n" != "0" ]; then
  echo "La base ya tiene $n personas: no se cargan datos de demostración para no mezclarlos." >&2
  exit 1
fi
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
python3 ../../app/db/demo/generar_sql_demo.py --hoy "$(date +%F)" --salida "$tmp"
psql_nexo < "$tmp"
echo "Datos de demostración cargados."
"$NEXO_DIR/scripts/frases_demo.sh"
