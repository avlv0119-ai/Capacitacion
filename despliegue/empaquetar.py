#!/usr/bin/env python3
"""Arma nexo-hostinger-vps.zip: todo lo que se sube al VPS de Hostinger para instalar Nexo completo.

Incluye la interfaz (app/web), el servicio (app/servicio), la base (app/db: migraciones y datos de demostración)
y el despliegue (despliegue/hostinger: contenedores, HTTPS, scripts y guía). No incluye secretos (.env),
dependencias instaladas (node_modules), respaldos ni archivos de prueba del navegador.

Uso:  python3 despliegue/empaquetar.py
"""
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'despliegue' / 'nexo-hostinger-vps.zip'
FECHA_FIJA = (2026, 1, 1, 0, 0, 0)   # el zip no cambia si el contenido no cambia
CARPETAS = ['app/web', 'app/servicio', 'app/db', 'despliegue/hostinger']
EXCLUIR_DIR = {'node_modules', '__pycache__', '.git'}
EXCLUIR_ARCH = {'.env', 'datos_demo.sql'}
EXCLUIR_RUTAS = {'app/web/pruebas'}   # pruebas de navegador: requieren Playwright, no hacen falta en el servidor
EXCLUIR_SUFIJOS = ('.dump', '.dump.sha256', '.log', '.zip')

LEEME = """NEXO · Paquete para el VPS de Hostinger
=======================================

Este archivo trae todo lo que necesita el servidor para que Nexo funcione completo:
la aplicación (interfaz y servicio), la base de datos con los datos de demostración
(ficticios) y los scripts de instalación, verificación y respaldo.

IMPORTANTE: requiere un VPS de Hostinger. El hospedaje web compartido no admite
PostgreSQL ni un servicio Node.js permanente.

Guía completa paso a paso: despliegue/hostinger/GUIA.md

Pasos resumidos (en el VPS, por SSH):

  1. Sube este zip al VPS y descomprímelo en /opt/nexo:
       sudo mkdir -p /opt/nexo && sudo chown $USER /opt/nexo
       unzip nexo-hostinger-vps.zip -d /opt/nexo
       cd /opt/nexo/despliegue/hostinger
       chmod +x scripts/*.sh

  2. Crea las contraseñas y secretos (usa tu subdominio real):
       ./scripts/secretos.sh capacitacion.tu-dominio.com

  3. Arranca los contenedores:
       docker compose up -d --build

  4. Crea la base y carga la demostración (anota las frases que se muestran):
       ./scripts/migrar.sh
       ./scripts/cargar_demo.sh

  5. Comprueba que todo funciona:
       ./scripts/verificar.sh

  6. Abre https://capacitacion.tu-dominio.com y entra con las cuentas de demostración.
     Recorrido sugerido: sección 7.1 de la guía.

Antes del paso 3: el subdominio debe apuntar a la IP del VPS (registro A en hPanel → DNS)
y el firewall debe permitir los puertos 22, 80 y 443.

Ambiente de demostración con datos ficticios. Antes de cargar datos reales faltan la
aprobación de TI, la ubicación de los datos y la revisión de seguridad independiente.
"""


def incluir(ruta: Path) -> bool:
    rel = ruta.relative_to(RAIZ).as_posix()
    if any(p in EXCLUIR_DIR for p in ruta.relative_to(RAIZ).parts): return False
    if any(rel == r or rel.startswith(r + '/') for r in EXCLUIR_RUTAS): return False
    return ruta.name not in EXCLUIR_ARCH and not ruta.name.endswith(EXCLUIR_SUFIJOS)


def main() -> None:
    archivos = sorted(f for c in CARPETAS for f in (RAIZ / c).rglob('*') if f.is_file() and incluir(f))
    with zipfile.ZipFile(SALIDA, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        def agregar(nombre: str, datos: bytes, ejecutable: bool = False) -> None:
            info = zipfile.ZipInfo(nombre, date_time=FECHA_FIJA)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o755 if ejecutable else 0o644) << 16
            z.writestr(info, datos)
        agregar('LEEME.txt', LEEME.encode('utf-8'))
        for f in archivos:
            agregar(f.relative_to(RAIZ).as_posix(), f.read_bytes(), f.suffix in ('.sh', '.py'))
    print(f'Generado {SALIDA.relative_to(RAIZ)} ({SALIDA.stat().st_size:,} bytes, {len(archivos) + 1} archivos)')


if __name__ == '__main__':
    main()
