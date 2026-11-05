# Etapa 4 · Desarrollo para operación real

**Estado:** en curso · **Entrega 1 de 4** (arquitectura y núcleo de datos) · **Fecha:** 5 de noviembre de 2026

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

> **Esto todavía no es una aplicación lista para producción.** La Etapa 4 se construye por módulos. Cada módulo se entrega con pruebas automáticas y se valida en la Etapa 5 antes del piloto.

## Entrega 1

| Entregable | Contenido | Verificación |
|---|---|---|
| [01 · Arquitectura](01-arquitectura.md) | Construir o adquirir; componentes recomendados; opciones de hospedaje según B-5; seguridad por capas; conceptos de costo a cotizar | Revisión de TI y dirección (pendiente) |
| [02 · Modelo de datos](02-modelo-de-datos.md) | 30 tablas, aislamiento por grupo y empresa, reglas protegidas en la base | — |
| [`app/db/`](../../app/db/README.md) | Migraciones de PostgreSQL 16 y pruebas | **50 de 50** comprobaciones correctas en una base temporal |

**Por qué empezar aquí:** el núcleo de datos no depende del hospedaje (B-5). Además, es donde se decide el aislamiento entre empresas, la trazabilidad y la prevención de duplicados, que el resto de los módulos da por hechos.

## Plan de módulos

| Módulo | Contenido | Requisitos principales | Estado |
|---|---|---|---|
| **M1 · Núcleo de datos** | Esquema, aislamiento, bitácora, inmutabilidad, folios | RNF-SEP, RNF-INT, RF-BIT | **Entregado** (propuesta) |
| M2 · Servicio base | Autenticación (activación con ficha, frase de acceso, llave de acceso, segundo factor), sesiones y equipos compartidos, permisos por rol y alcance fino | RF-ACC, RF-ROL, RNF-AUT, RNF-SES, RNF-DCO | Siguiente |
| M3 · Personas y estructura | Alta, carga desde Excel con vista previa, movimientos, contratistas | RF-ORG, RF-PER | Por iniciar |
| M4 · Contenido | Editor de cursos, revisión, publicación y versiones | RF-CON, RF-EDI | Por iniciar |
| M5 · Asignaciones y reglas | Reglas dinámicas, excepciones y motor de estados y cumplimiento (reutiliza la lógica probada del prototipo) | RF-ASG, RT-01 a RT-17 | Por iniciar |
| M6 · Experiencia de aprendizaje | Aplicación Nexo para el trabajador con el diseño de la versión 3 | RF-APR, RF-MOT | Por iniciar |
| M7 · Evaluación y validación | Intentos controlados por el servidor, validación práctica con evidencias | RF-EVA | Por iniciar |
| M8 · Constancias | Plantillas, emisión en segundo plano, folio, huella, reemisión y revocación | RF-CTA | Por iniciar |
| M9 · Indicadores y reportes | Tablero y las 7 exportaciones en segundo plano | RF-IND, RF-EXP | Por iniciar |
| M10 · Operación | Despliegue, respaldos con prueba de restauración, monitoreo y alertas | RNF-DIS, RNF-OBS | Depende de B-5 |

## Verificado y no verificado

**Verificado:**
- Las 50 reglas de la base de datos, listadas en [02 §5](02-modelo-de-datos.md#5-verificación).

**No verificado:**
- Que TI acepte la arquitectura.
- Rendimiento con 2,000 cuentas y 400 sesiones simultáneas.
- Seguridad del servicio de aplicación, que aún no existe.
- Respaldos y recuperación.

## Decisiones pendientes

| ID | Decisión | Bloquea |
|---|---|---|
| B-5 | Infraestructura: nube o servidores propios, proveedores, ubicación de los datos, quién opera | M10 y la puesta en marcha |
| B-7 | Responsables del desarrollo, la operación, el contenido y la revisión jurídica; cursos y áreas del piloto | Condición de la recomendación de construir a la medida |
| D-33 | Aprobación del stack recomendado (TypeScript, PostgreSQL, almacenamiento compatible con S3), o el estándar de TI que lo sustituya | M2 en adelante |
| B-6 | Uso de IA con documentos internos | Solo V2 |
| D-54 a D-59 | Ajustes de marca (variantes de color, azul oficial, logotipo en blanco, coral, publicación del prototipo con marca) | Diseño final |

## Siguiente acción

1. **Empresa y TI:**
   - Revisar la [arquitectura](01-arquitectura.md) y responder B-5 y B-7.
   - Si TI tiene un estándar de lenguaje o de base de datos, indicarlo.
2. **Equipo de desarrollo:** con la aprobación del stack (D-33), construir **M2 · Servicio base** con pruebas automáticas de autenticación, sesiones en equipos compartidos y la matriz de permisos completa por rol y alcance.
