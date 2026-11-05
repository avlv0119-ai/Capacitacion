#!/usr/bin/env bash
# Crea .env a partir de .env.ejemplo con secretos aleatorios. No sobrescribe un .env existente.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo "Ya existe .env; no se modifica." >&2; exit 1; fi
dominio="${1:-}"
if [ -z "$dominio" ]; then read -r -p "Dominio o subdominio (por ejemplo, capacitacion.tuempresa.com): " dominio; fi
sed -e "s|^NEXO_DOMINIO=.*|NEXO_DOMINIO=$dominio|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" \
    -e "s|^NEXO_DB_PASSWORD=.*|NEXO_DB_PASSWORD=$(openssl rand -hex 32)|" \
    -e "s|^NEXO_PEPPER=.*|NEXO_PEPPER=$(openssl rand -hex 48)|" .env.ejemplo > .env
chmod 600 .env
echo "Creado .env con secretos aleatorios (permisos 600). Guarda una copia segura: sin NEXO_PEPPER no sirven los códigos pendientes."
