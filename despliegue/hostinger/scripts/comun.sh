#!/usr/bin/env bash
# Funciones comunes de los scripts de operación. No se ejecuta solo: lo cargan los demás con `source`.
set -euo pipefail
NEXO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$NEXO_DIR"
if [ ! -f .env ]; then
  echo "Falta el archivo .env en $NEXO_DIR. Créalo primero con: scripts/secretos.sh" >&2
  exit 1
fi
set -a; . ./.env; set +a
POSTGRES_USER="${POSTGRES_USER:-nexo_admin}"

# psql dentro del contenedor de la base, con el usuario dueño y deteniéndose al primer error.
psql_nexo() { docker compose exec -T -e PGOPTIONS='-c client_min_messages=warning' db psql -U "$POSTGRES_USER" -d nexo -X -q -v ON_ERROR_STOP=1 "$@"; }
