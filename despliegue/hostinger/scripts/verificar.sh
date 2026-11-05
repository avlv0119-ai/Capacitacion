#!/usr/bin/env bash
# Revisa la instalación de punta a punta: contenedores, página por HTTPS, servicio, base y datos.
# Opcional: entra con una cuenta (por ejemplo, una de demostración) y muestra qué ve ese rol.
# Uso:  scripts/verificar.sh               (solo revisiones)
#       scripts/verificar.sh 004817        (además, entra con ese número; pide la frase sin mostrarla)
source "$(dirname "$0")/comun.sh"
base="https://$NEXO_DOMINIO"
inseguro=(); [ "$NEXO_DOMINIO" = "localhost" ] && inseguro=(-k)   # solo pruebas locales con certificado interno
c() { curl -sS --max-time 20 "${inseguro[@]}" "$@"; }
fallas=0
ok() { echo "  ✔ $*"; }
mal() { echo "  ✘ $*"; fallas=$((fallas + 1)); }

echo "Contenedores:"
docker compose ps --format '  · {{.Service}}: {{.Status}}'
echo "Revisiones:"
[ "$(c -o /dev/null -w '%{http_code}' "$base/" || true)" = "200" ] && ok "La página responde por HTTPS en $base" || mal "La página no responde en $base (¿DNS, puertos 80/443 o certificado?)"
c "$base/api/salud" 2>/dev/null | grep -q '"base":"ok"' && ok "El servicio responde y llega a la base" || mal "El servicio o la base no responden (revisa: docker compose logs servicio)"
c "$base/robots.txt" 2>/dev/null | grep -q 'Disallow: /' && ok "Los buscadores tienen bloqueado el sitio (ambiente de demostración)" || mal "robots.txt no bloquea a los buscadores"
codigo="$(c -o /dev/null -w '%{http_code}' "http://$NEXO_DOMINIO/" || true)"
[ "$codigo" = "308" ] || [ "$codigo" = "301" ] && ok "HTTP redirige a HTTPS" || mal "HTTP no redirige a HTTPS (código $codigo)"
echo "Datos:"
psql_nexo -tA -F': ' -c "SELECT 'personas', count(*) FROM nexo.personas UNION ALL SELECT 'asignaciones', count(*) FROM nexo.asignaciones
  UNION ALL SELECT 'acreditaciones', count(*) FROM nexo.acreditaciones UNION ALL SELECT 'constancias', count(*) FROM nexo.constancias
  UNION ALL SELECT 'cuentas activas', count(*) FROM nexo.cuentas WHERE estado = 'activa'" | sed 's/^/  · /'
psql_nexo -tA -c "SELECT string_agg(nombre, ', ') FROM public.nexo_migraciones" | sed 's/^/  · migraciones aplicadas: /'

if [ -n "${1:-}" ]; then
  numero="$1"
  if [ -z "${NEXO_FRASE:-}" ]; then read -rs -p "Frase de acceso de $numero: " NEXO_FRASE; echo; fi
  export NEXO_FRASE NEXO_NUMERO="$numero"
  NEXO_EMPRESA="$(psql_nexo -tA -v n="$numero" <<'SQL'
SELECT empresa_id FROM nexo.numeros_empleado WHERE upper(numero) = upper(:'n') AND vigente_hasta IS NULL LIMIT 1;
SQL
)"
  export NEXO_EMPRESA
  [ -n "$NEXO_EMPRESA" ] || { mal "No existe el número $numero"; exit 1; }
  galletas="$(mktemp)"; trap 'rm -f "$galletas"' EXIT
  cuerpo="$(python3 -c 'import json, os; print(json.dumps({"empresaId": os.environ["NEXO_EMPRESA"], "numero": os.environ["NEXO_NUMERO"], "frase": os.environ["NEXO_FRASE"]}))')"
  codigo="$(c -o /dev/null -w '%{http_code}' -c "$galletas" -H 'content-type: application/json' -H 'x-nexo: 1' -d "$cuerpo" "$base/api/acceso/entrar")"
  echo "Acceso con $numero:"
  if [ "$codigo" = "200" ]; then
    ok "Entró correctamente"
    c -b "$galletas" "$base/api/yo" | python3 -c 'import json, sys; d = json.load(sys.stdin); print("  · " + d["nombre"] + " · roles: " + ", ".join(r["rol"] + " (" + r["alcance"] + ")" for r in d["roles"]) + " · espacio: " + str(d["espacio"]))'
    c -b "$galletas" "$base/api/asignaciones" | python3 -c 'import json, sys; print("  · asignaciones que puede ver: " + str(json.load(sys.stdin)["total"]))'
    c -o /dev/null -b "$galletas" -H 'x-nexo: 1' -X POST "$base/api/acceso/salir" && ok "Sesión cerrada"
  else
    mal "No entró (código $codigo). Revisa el número y la frase; tras varios intentos fallidos hay una espera progresiva."
  fi
fi

echo
if [ "$fallas" = "0" ]; then echo "Todo correcto."; else echo "$fallas revisión(es) con problema."; exit 1; fi
