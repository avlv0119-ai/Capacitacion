#!/usr/bin/env python3
"""Genera index.html (versión para abrir en local) a partir de app.html.

app.html es el contenido que se publica como página en claude.ai: la plataforma
le agrega el esqueleto <!doctype html>…<body>. Para abrirlo directamente en un
navegador hace falta ese mismo esqueleto, que este script agrega.

Uso:  python3 prototipo/construir.py
"""
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ESQUELETO = (
    '<!doctype html><html lang="es"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
    'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
    '</head><body>\n'
)


def main() -> None:
    contenido = (AQUI / "app.html").read_text(encoding="utf-8")
    salida = AQUI / "index.html"
    salida.write_text(
        ESQUELETO
        + "<!-- Archivo generado por construir.py a partir de app.html. No editar a mano. -->\n"
        + contenido + "\n</body></html>\n",
        encoding="utf-8",
    )
    print(f"Generado {salida.relative_to(AQUI.parent)} ({salida.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
