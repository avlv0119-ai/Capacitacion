# Nexo · Plataforma de capacitación gamificada · Grupo PIGSA88

> **Nexo** es el nombre de la aplicación elegido por la empresa. Identidad corporativa de Grupo PIGSA88 S.A. de C.V. ([logotipo](docs/identidad/grupo-pigsa88.svg)). Verificación de marca pendiente para uso externo.

Web app de capacitación para operadores de producción, mantenimiento, supervisores, seguridad y contratistas. Combina una experiencia de aprendizaje por niveles, breve y motivante, con una administración rigurosa, medible y trazable: asignaciones, evaluaciones, validaciones prácticas, constancias en PDF, indicadores y exportaciones.

**Este repositorio todavía no contiene la aplicación de producción.** Contiene la documentación de producto y diseño, un prototipo navegable con datos ficticios, los primeros módulos de la aplicación real (base de datos y servicio de acceso) y un paquete para publicar un **ambiente de demostración en Hostinger**. Ningún entregable de este repositorio debe considerarse listo para producción mientras no complete la Etapa 5 (validación).

**Para publicar la demostración:** [`despliegue/hostinger/GUIA.md`](despliegue/hostinger/GUIA.md).

## Estado por etapa

| Etapa | Entregable | Estado |
|---|---|---|
| 1. Definición del producto | [`docs/etapa-1/`](docs/etapa-1/README.md) | **Entregada.** Preguntas bloqueantes B-1 a B-4 respondidas el 5 nov 2026 e incorporadas. |
| 2. Diseño funcional y visual | [`docs/etapa-2/`](docs/etapa-2/README.md): mapa de navegación, matriz de permisos, flujos, pantallas y propuesta visual (versión 3: Nexo con identidad Grupo PIGSA88, plana y juvenil) | **Entregada.** |
| 3. Prototipo funcional | [`docs/etapa-3/`](docs/etapa-3/README.md) y [`prototipo/`](prototipo/README.md) | **Entregada para revisión.** 55 + 35 comprobaciones automáticas correctas. La página publicada muestra la versión anterior a la marca corporativa (ver Etapa 3). |
| 4. Desarrollo para operación real | [`docs/etapa-4/`](docs/etapa-4/README.md), [`app/`](app/db/README.md) y [`despliegue/`](despliegue/hostinger/GUIA.md) | **En curso.** Entrega 2: núcleo de datos (50 de 50), servicio de acceso y permisos (23 de 23), datos de demostración en la base (12 de 12) y despliegue en Hostinger probado de punta a punta en Docker local. Pendiente: aprobación de TI. |
| 5. Validación y preparación de lanzamiento | Pruebas de recorridos, permisos, aislamiento, indicadores, documentos y carga | Por iniciar |

## Convenciones de los documentos

Cada afirmación relevante lleva una etiqueta:

| Etiqueta | Significado |
|---|---|
| **[H]** Hecho confirmado | Información que la empresa proporcionó explícitamente. |
| **[R]** Recomendación | Propuesta del equipo con su justificación. Puede cambiar si la empresa decide otra cosa. |
| **[S]** Supuesto | Algo que damos por cierto para avanzar, pero que nadie ha confirmado. |
| **[P]** Pendiente | Decisión que debe tomar la empresa. Si bloquea una etapa, se indica. |

Reglas que aplican a todo el proyecto:

- No se inventa información de la empresa, contenido normativo, procedimientos internos, criterios de seguridad, presupuesto, fechas ni criterios de acreditación.
- Todo contenido de demostración es ficticio y lleva la marca **«DEMO · CONTENIDO FICTICIO»**.
- Ninguna tecnología, servicio de pago o infraestructura se da por aprobada. Se comparan alternativas y se recomienda una con razones.
- No se promete cumplimiento legal, seguridad ni capacidad de carga sin validación.
- La interfaz y los entregables están en español.

## Estructura

```
docs/
  etapa-1/                    Definición del producto
    README.md                 Resumen ejecutivo, criterios de aceptación y siguiente acción
    01-producto-y-alcance.md  Objetivo, usuarios, contexto, alcance y plan de versiones
    02-flujos-principales.md  Flujos de punta a punta
    03-requisitos-funcionales.md
    04-requisitos-no-funcionales.md  Seguridad, autenticación, privacidad, capacidad
    05-estados-y-acreditacion.md     Modelo de estados y reglas de transición
    06-indicadores.md         Diccionario preliminar de indicadores
    07-vacios-preguntas-supuestos-riesgos.md
  etapa-2/                    Diseño funcional y visual
    README.md                 Resumen, criterios de aceptación y siguiente acción
    01-mapa-de-navegacion.md
    02-matriz-de-permisos.md
    03-flujos-detallados.md
    04-pantallas.md
    05-propuesta-visual.md
  etapa-3/                    Prototipo funcional: guía, verificación, hallazgos y capturas
  registro-de-decisiones.md   Decisiones tomadas, propuestas y pendientes (todas las etapas)
  etapa-4/                    Arquitectura, modelo de datos, despliegue en Hostinger y plan de módulos
prototipo/                    Prototipo navegable (datos ficticios) y sus pruebas automatizadas
app/db/                       Núcleo de datos (PostgreSQL): migraciones, pruebas y datos de demostración
app/servicio/                 Servicio de aplicación (Node.js): acceso, sesiones y permisos, con pruebas
despliegue/hostinger/         VPS con Docker Compose: guía, contenedores, HTTPS y scripts de operación
despliegue/hostinger-web/     Paquete estático del prototipo para el hospedaje web
docs/identidad/               Logotipo de Grupo PIGSA88
```
