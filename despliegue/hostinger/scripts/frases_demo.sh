#!/usr/bin/env bash
# Genera frases de acceso NUEVAS para las 7 cuentas de demostración y cierra sus sesiones abiertas.
# Las frases se muestran UNA sola vez. Solo para el ambiente de demostración (datos ficticios).
source "$(dirname "$0")/comun.sh"
docker compose exec -T -e DATABASE_URL_ADMIN="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/nexo" servicio \
  node --experimental-strip-types --no-warnings src/herramientas/cuentas_demo.ts
