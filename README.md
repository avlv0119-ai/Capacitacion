# Plataforma de capacitación gamificada para manufactura

> Nombre de trabajo. El nombre comercial y la identidad visual se propondrán en la Etapa 2.

Web app de capacitación para operadores de producción, mantenimiento, supervisores, seguridad y contratistas. Combina una experiencia de aprendizaje por niveles, breve y motivante, con una administración rigurosa, medible y trazable: asignaciones, evaluaciones, validaciones prácticas, constancias en PDF, indicadores y exportaciones.

**Este repositorio todavía no contiene una aplicación.** Por ahora contiene la documentación de producto y diseño. Ningún entregable de este repositorio debe considerarse listo para producción mientras no complete la Etapa 5 (validación).

## Estado por etapa

| Etapa | Entregable | Estado |
|---|---|---|
| 1. Definición del producto | [`docs/etapa-1/`](docs/etapa-1/README.md) | **Entregada para revisión.** En espera de las respuestas a las preguntas bloqueantes. |
| 2. Diseño funcional y visual | Mapa de navegación, matriz de permisos, flujos, pantallas y propuesta visual | Por iniciar |
| 3. Prototipo funcional | Prototipo navegable con datos ficticios | Por iniciar |
| 4. Desarrollo para operación real | Módulos con persistencia, autenticación, permisos, trazabilidad, PDF y Excel | Por iniciar |
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
  registro-de-decisiones.md   Decisiones tomadas, propuestas y pendientes (todas las etapas)
```
