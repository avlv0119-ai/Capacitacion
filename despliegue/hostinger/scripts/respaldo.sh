#!/usr/bin/env bash
# Respaldo de la base (formato personalizado de pg_dump) con huella SHA-256, retención y copia remota opcional.
# Programar a diario con cron, por ejemplo: 15 3 * * * /ruta/despliegue/hostinger/scripts/respaldo.sh >> /var/log/nexo-respaldo.log 2>&1
source "$(dirname "$0")/comun.sh"
destino="${NEXO_RESPALDOS:-/var/backups/nexo}"
mkdir -p "$destino"; chmod 700 "$destino"
archivo="$destino/nexo-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d nexo -Fc > "$archivo.tmp"
mv "$archivo.tmp" "$archivo"
chmod 600 "$archivo"
( cd "$destino" && sha256sum "$(basename "$archivo")" > "$(basename "$archivo").sha256" )
find "$destino" -name 'nexo-*.dump*' -mtime +"${NEXO_RETENCION_DIAS:-14}" -delete
if [ -n "${NEXO_RESPALDO_REMOTO:-}" ]; then
  rsync -a "$archivo" "$archivo.sha256" "$NEXO_RESPALDO_REMOTO/"
  echo "Copia remota enviada a $NEXO_RESPALDO_REMOTO"
fi
echo "Respaldo listo: $archivo ($(du -h "$archivo" | cut -f1))"
