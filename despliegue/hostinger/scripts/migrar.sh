#!/usr/bin/env bash
# Aplica las migraciones pendientes de app/db/migraciones y crea o actualiza el rol de conexión del servicio.
source "$(dirname "$0")/comun.sh"
psql_nexo -c "CREATE TABLE IF NOT EXISTS public.nexo_migraciones (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())"
for m in $(docker compose exec -T db sh -c 'ls /nexo-db/migraciones/*.sql' | sort); do
  n="$(basename "$m")"
  if [ "$(psql_nexo -tA -c "SELECT count(*) FROM public.nexo_migraciones WHERE nombre = '$n'")" = "0" ]; then
    psql_nexo -f "$m"
    psql_nexo -c "INSERT INTO public.nexo_migraciones (nombre) VALUES ('$n')"
    echo "Migración aplicada: $n"
  else
    echo "Ya aplicada: $n"
  fi
done
psql_nexo -v pass="$NEXO_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE nexo_servicio LOGIN IN ROLE nexo_app') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexo_servicio') \gexec
SELECT format('ALTER ROLE nexo_servicio PASSWORD %L', :'pass') \gexec
SQL
echo "Rol de conexión del servicio listo."
