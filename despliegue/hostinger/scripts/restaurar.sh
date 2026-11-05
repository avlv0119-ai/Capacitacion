#!/usr/bin/env bash
# RESTAURA un respaldo sobre la base en uso (reemplaza los datos actuales). Detiene el servicio mientras tanto.
source "$(dirname "$0")/comun.sh"
archivo="${1:?Indica el archivo .dump a restaurar}"
( cd "$(dirname "$archivo")" && sha256sum -c "$(basename "$archivo").sha256" )
read -r -p "Esto REEMPLAZA los datos actuales con $archivo. Escribe RESTAURAR para continuar: " ok
[ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
"$(dirname "$0")/respaldo.sh"   # respaldo previo, por si hay que volver atrás
docker compose stop servicio
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d nexo --clean --if-exists < "$archivo"
docker compose start servicio
echo "Restauración terminada."
