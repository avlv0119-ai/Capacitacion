# Etapa 4 · Desarrollo para operación real

**Estado:** en curso · **Entrega 3 de 4** (aplicación conectada de punta a punta) · **Fecha:** 5 de noviembre de 2026

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

> **Nexo ya funciona de punta a punta con datos de demostración.** Las personas entran con su número y su frase, toman cursos, presentan evaluaciones calificadas en el servidor, validan prácticas y descargan constancias. Todo se guarda en la base y queda en la bitácora. Antes de usarlo con datos reales faltan la aprobación de TI, la revisión de seguridad independiente y la validación de la Etapa 5.

## Entregas

| Entrega | Entregable | Contenido | Verificación |
|---|---|---|---|
| 1 | [01 · Arquitectura](01-arquitectura.md) | Construir o adquirir; componentes; hospedaje; seguridad por capas; conceptos de costo | Revisión de TI (pendiente) |
| 1 | [02 · Modelo de datos](02-modelo-de-datos.md) y [`app/db/`](../../app/db/README.md) | 30 tablas, aislamiento por grupo y empresa, reglas protegidas en la base | **50 de 50** comprobaciones |
| 2 | [`app/servicio/`](../../app/servicio/README.md) · M2 | Activación con ficha, frase de acceso, sesiones, permisos por rol y alcance | **23 de 23** comprobaciones |
| 2 | [03 · Despliegue en Hostinger](03-despliegue-hostinger.md) y [`despliegue/`](../../despliegue/hostinger/GUIA.md) | VPS con Docker Compose, HTTPS automático, scripts de instalación, verificación y respaldo | Instalación limpia en Docker local |
| 3 | Migración `004_operacion.sql` | Acreditación solo si se cumplen los criterios de la versión, emisión idempotente de constancias con folio y huella, confirmación de práctica, ranking voluntario y renovaciones diarias | 50 de 50 con la migración aplicada |
| 3 | Servicio: rutas de operación | Estado por alcance, lecciones, evaluaciones calificadas en el servidor, validación con frase, reglas, excepciones, constancias, exportaciones | **34 de 34** comprobaciones de operación y **12 de 12** de acceso por rol |
| 3 | [`app/web/`](../../app/web/README.md) | Interfaz conectada al servicio, más intuitiva e interactiva | **18 de 18** en el recorrido de punta a punta en el navegador; todas las pantallas de las 7 cuentas, sin errores |
| 3 | [Contenido de ejemplo](../../app/db/demo/contenido-demo.json) | Lecciones y evaluaciones de los 5 cursos de la demostración (DEMO; no son procedimientos de la empresa) | Cargadas con las reglas de la base |

## Plan de módulos

| Módulo | Qué ya funciona | Qué falta | Estado |
|---|---|---|---|
| **M1 · Núcleo de datos** | Esquema, aislamiento, bitácora, inmutabilidad, folios | — | **Entregado** |
| **M2 · Servicio base** | Activación con ficha, frase, sesiones en equipos compartidos y personales, permisos | Llave de acceso (WebAuthn) y segundo factor para Administrador, RH y Auditor (D-12) | **Entregado** |
| M3 · Personas y estructura | Consulta de personas, adscripciones e historial; fichas de activación y restablecimiento de acceso | Alta, carga desde Excel con vista previa, movimientos, alta de contratistas | Parcial |
| M4 · Contenido | Catálogo publicado con versiones y criterios | Editor, revisión y publicación desde la interfaz | Parcial |
| **M5 · Asignaciones y reglas** | Reglas por área y turno con vista previa; excepciones (intentos, prórroga, exención); renovaciones automáticas | Reglas por puesto, asignaciones opcionales, cancelaciones | **Entregado** en lo principal |
| **M6 · Experiencia de aprendizaje** | Inicio, camino de lecciones, 6 tipos de actividad, puntos, insignias, ranking voluntario, historial | Avisos en la aplicación (RF-NOT) | **Entregado** en lo principal |
| **M7 · Evaluación y validación** | Preguntas y calificación en el servidor, intentos, validación práctica con frase de acceso y confirmación del trabajador | Adjuntar evidencias (fotos), anular validaciones desde la interfaz | **Entregado** en lo principal |
| **M8 · Constancias** | Acreditación y emisión automáticas con folio y huella, reemisión y revocación con frase de acceso, PDF | Guardar el PDF en el servidor, QR de verificación (D-22), firma (D-23) | **Entregado** en lo principal |
| M9 · Indicadores y reportes | Tablero, matriz y los 7 reportes en PDF y Excel, con registro de cada exportación | Generación en segundo plano para exportaciones grandes (D-44) | Parcial |
| M10 · Operación | Despliegue, respaldos con prueba de restauración, proceso diario | Monitoreo externo y alertas | En curso |

## Verificado y no verificado

**Verificado [H]**, en Docker local con las mismas imágenes que irán al VPS:
- La base: 50 reglas con las cuatro migraciones.
- El servicio:
  - 23 pruebas de acceso y permisos.
  - 12 de acceso por rol con la demostración.
  - 34 de operación: asignar, aprender en orden, evaluar, validar, acreditar, emitir, confirmar, reemitir, excepciones, exportar, bitácora, ranking y los controles de permiso.
- La interfaz en el navegador, a través de HTTPS:
  - El recorrido completo, con 18 comprobaciones.
  - Todas las pantallas de las 7 cuentas, en escritorio y en celular.
  - Sin errores de JavaScript ni de la política de seguridad de contenido.

**No verificado [P]:**
- La instalación en un VPS real de Hostinger: DNS, firewall y certificado.
- El rendimiento con 2,000 cuentas y 400 sesiones simultáneas. El estado de la consola se envía completo al entrar; a esa escala habrá que paginarlo.
- La revisión de seguridad independiente.
- La aceptación de TI.

## Decisiones pendientes

| ID | Decisión | Bloquea |
|---|---|---|
| D-33 | Aprobación de TI del stack y del despliegue | Uso con datos reales |
| D-64 | Centro de datos del VPS | Carga de datos reales de personas |
| D-66 | Quién opera técnicamente el VPS | Puesta en marcha |
| D-65, D-31 | Respaldos, RPO y RTO | Operación |
| D-22, D-23, D-24 | QR, firma y leyenda de las constancias | Constancias definitivas |
| B-7 | Revisión jurídica; cursos y áreas del piloto; contenido real de los cursos | Contenido y piloto |
| D-54 a D-59 | Ajustes de marca | Diseño final |

## Siguiente acción

1. **Departamento de Capacitación:**
   - Contratar el VPS e instalar Nexo con la [guía](../../despliegue/hostinger/GUIA.md).
   - Recorrer la demostración con la sección 7.1 de la guía.
   - Reunir el contenido real de los cursos del piloto.
2. **TI:** revisar la [arquitectura](01-arquitectura.md) y el [despliegue](03-despliegue-hostinger.md); aprobar o indicar cambios (D-33); elegir el centro de datos (D-64).
3. **Equipo de desarrollo:**
   - M3: alta de personas y carga desde Excel, para cargar la plantilla real.
   - M4: editor de cursos.
   - Segundo factor para roles administrativos.
