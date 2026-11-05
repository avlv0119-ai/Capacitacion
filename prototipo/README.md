# Prototipo de Nexo · Etapa 3

> **PROTOTIPO · DATOS FICTICIOS.** No usar con datos reales. No es la aplicación de producción.

Prototipo navegable que recorre todo el proceso: asignación del curso → lecciones y actividades → evaluación → validación práctica → acreditación → constancia en PDF → consulta y exportación de reportes.

- **Versión publicada:** https://claude.ai/artifact/WyK8ugJ5isMMT9LU4GJ85p (privada). Corresponde a la versión anterior a la marca Nexo y Grupo PIGSA88. Publicar la versión con la marca corporativa queda a decisión de la empresa (D-59).
- **Versión local:** abre `index.html` en un navegador moderno con conexión a internet (descarga tipografías y las librerías de PDF y Excel desde CDN).

## Archivos

| Archivo | Qué es |
|---|---|
| `app.html` | Código fuente único del prototipo (HTML, CSS y JavaScript). Es lo que se publica. |
| `index.html` | Versión para abrir en local, generada a partir de `app.html`. No editar a mano. |
| `construir.py` | Genera `index.html`: `python3 prototipo/construir.py` |
| `pruebas/recorrido.js` | Prueba automatizada del recorrido completo con Playwright (55 comprobaciones). |
| `pruebas/verificar_archivos.py` | Verifica los PDF y Excel descargados por la prueba (35 comprobaciones). |
| `pruebas/capturas.js` | Genera las capturas de `docs/etapa-3/img/`. |

## Cómo probar

```bash
python3 prototipo/construir.py
```

```bash
node prototipo/pruebas/recorrido.js salida-pruebas
```

```bash
python3 prototipo/pruebas/verificar_archivos.py salida-pruebas
```

La prueba requiere Playwright con Chromium. La verificación de archivos requiere `openpyxl` y `pypdf`.

## Librerías externas

| Librería | Versión | Uso | Licencia |
|---|---|---|---|
| jsPDF | 2.5.1 | Constancias y reportes en PDF | MIT |
| jsPDF-AutoTable | 3.8.2 | Tablas de los reportes PDF | MIT |
| SheetJS Community Edition | 0.18.5 | Reportes en Excel con celdas tipadas | Apache 2.0 |
| Bricolage Grotesque, Plus Jakarta Sans, JetBrains Mono | Google Fonts | Tipografía | SIL Open Font License |

El logotipo de Grupo PIGSA88 es propiedad de la empresa y fue entregado por ella para este proyecto ([`docs/identidad/`](../docs/identidad/grupo-pigsa88.svg)).

Las librerías del prototipo no son una decisión de tecnología para producción; esa comparación se hará en la Etapa 4.
