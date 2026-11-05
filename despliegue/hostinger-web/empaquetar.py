#!/usr/bin/env python3
"""Arma nexo-prototipo-web.zip para subirlo al hospedaje web de Hostinger (public_html).

Contiene solo el prototipo navegable (datos ficticios en el navegador), su .htaccess y robots.txt.
No incluye la base de datos ni el servicio: esos requieren el VPS (ver ../hostinger/GUIA.md).

Uso:  python3 despliegue/hostinger-web/empaquetar.py
"""
import subprocess
import sys
import zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
FECHA_FIJA = (2026, 1, 1, 0, 0, 0)  # fecha fija dentro del zip para que el archivo no cambie si el contenido no cambia


def main() -> None:
    subprocess.run([sys.executable, str(RAIZ / "prototipo" / "construir.py")], check=True)
    salida = AQUI / "nexo-prototipo-web.zip"
    archivos = {
        "index.html": RAIZ / "prototipo" / "index.html",
        ".htaccess": AQUI / ".htaccess",
        "robots.txt": AQUI / "robots.txt",
    }
    with zipfile.ZipFile(salida, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for nombre, origen in archivos.items():
            info = zipfile.ZipInfo(nombre, date_time=FECHA_FIJA)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, origen.read_bytes())
    print(f"Generado {salida.relative_to(RAIZ)} ({salida.stat().st_size:,} bytes): {', '.join(archivos)}")


if __name__ == "__main__":
    main()
