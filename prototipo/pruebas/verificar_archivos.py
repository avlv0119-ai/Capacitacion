#!/usr/bin/env python3
"""Verifica los archivos PDF y Excel descargados por recorrido.js.

Comprueba que el Excel tenga datos tipados (identificadores como texto, fechas como
fechas, números como números, porcentajes con formato) y una hoja de parámetros, y que
los PDF tengan encabezado, alcance, filtros, paginación y la marca de datos ficticios.

Uso: python3 prototipo/pruebas/verificar_archivos.py <carpeta-de-salida>
Requiere openpyxl y pypdf.
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook
from pypdf import PdfReader

carpeta = Path(sys.argv[1] if len(sys.argv) > 1 else "salida-pruebas")
resultados = []


def check(nombre, ok, detalle=""):
    resultados.append({"nombre": nombre, "ok": bool(ok), "detalle": str(detalle)})
    print(("OK   " if ok else "FALLA") + " · " + nombre + (f" · {detalle}" if detalle else ""))


TIPOS = {
    "Número de empleado": "texto", "Folio": "texto", "Persona": "texto",
    "Fecha límite": "fecha", "Fecha de acreditación": "fecha", "Vence": "fecha", "Fecha relevante": "fecha",
    "Inicio": "fecha", "Envío": "fecha", "Fecha de la práctica": "fecha", "Fecha de registro": "fecha", "Fecha de emisión": "fecha",
    "Versión": "numero", "Calificación": "numero", "Intento": "numero", "Personas": "numero", "Asignaciones vigentes": "numero",
    "Criterios cumplidos": "numero", "Días para la fecha": "numero", "Cumplimiento": "pct",
}

for xlsx in sorted(carpeta.glob("reporte-*.xlsx")):
    nombre = xlsx.stem.replace("reporte-", "")
    wb = load_workbook(xlsx)
    check(f"{nombre}.xlsx · hojas «Datos» y «Parámetros»", wb.sheetnames == ["Datos", "Parámetros"], wb.sheetnames)
    ws = wb["Datos"]
    encabezados = [c.value for c in ws[1]]
    filas = ws.max_row - 1
    errores = []
    revisadas = 0
    for col, enc in enumerate(encabezados, start=1):
        tipo = TIPOS.get(enc)
        if not tipo:
            continue
        for fila in range(2, min(ws.max_row, 60) + 1):
            celda = ws.cell(row=fila, column=col)
            if celda.value is None:
                continue
            revisadas += 1
            if tipo == "texto" and celda.data_type != "s":
                errores.append(f"{enc}: {celda.value!r} no es texto")
            if tipo == "fecha" and not (celda.is_date and isinstance(celda.value, datetime)):
                errores.append(f"{enc}: {celda.value!r} no es fecha")
            if tipo == "numero" and not isinstance(celda.value, (int, float)):
                errores.append(f"{enc}: {celda.value!r} no es número")
            if tipo == "pct" and not (isinstance(celda.value, (int, float)) and "%" in celda.number_format):
                errores.append(f"{enc}: {celda.value!r} sin formato de porcentaje")
    check(f"{nombre}.xlsx · celdas tipadas ({revisadas} revisadas, {filas} filas)", not errores and revisadas > 0, "; ".join(errores[:3]))
    if "Número de empleado" in encabezados:
        col = encabezados.index("Número de empleado") + 1
        valores = [ws.cell(row=r, column=col).value for r in range(2, ws.max_row + 1)]
        ceros = [v for v in valores if isinstance(v, str) and v.startswith("0")]
        check(f"{nombre}.xlsx · números de empleado conservan ceros a la izquierda", ceros, (ceros or ["—"])[0])
    par = {r[0].value: r[1].value for r in wb["Parámetros"].iter_rows() if r[0].value}
    faltan = [k for k in ("Reporte", "Generado", "Alcance", "Periodo", "Filtros", "Registros", "Aviso") if k not in par]
    check(f"{nombre}.xlsx · parámetros de generación", not faltan and par.get("Registros") == filas, f"faltan {faltan}" if faltan else f"{filas} registros")

for pdf in sorted(carpeta.glob("reporte-*.pdf")):
    nombre = pdf.stem.replace("reporte-", "")
    lector = PdfReader(str(pdf))
    n = len(lector.pages)
    p1 = lector.pages[0].extract_text() or ""
    ult = lector.pages[-1].extract_text() or ""
    ok = all(t in p1 for t in ("Generado:", "Alcance:", "Filtros:", "DEMO")) and f"Página {n} de {n}" in ult
    check(f"{nombre}.pdf · encabezado, alcance, filtros y paginación ({n} páginas)", ok)

const = carpeta / "constancia.pdf"
if const.exists():
    texto = PdfReader(str(const)).pages[0].extract_text() or ""
    folio = re.search(r"DN-2026-\d{6}", texto)
    requeridos = ["Rosa Elena Ibarra", "004817", "versión 3", "Fecha de acreditación".upper(), "Fecha de emisión".upper(), "/ 100", "Opción por confirmar", "No constituye un documento oficial"]
    faltan = [t for t in requeridos if t not in texto]
    check("constancia.pdf · campos requeridos, folio y leyenda", folio and not faltan, folio.group(0) if folio else f"faltan {faltan}")

(carpeta / "verificacion-archivos.json").write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")
fallas = sum(not r["ok"] for r in resultados)
print(f"\n{len(resultados) - fallas} de {len(resultados)} comprobaciones correctas")
sys.exit(1 if fallas else 0)
