# Etapa 1 · Definición del producto

**Estado:** entregada; B-1 a B-4 respondidas e incorporadas el 5 de noviembre de 2026 · **Siguiente etapa:** [diseño funcional y visual (Etapa 2)](../etapa-2/README.md), entregada

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

## Resumen ejecutivo

**Qué se construirá.** Una web app de capacitación para personal de manufactura con dos caras: una experiencia de aprendizaje por niveles, breve y motivante, para el trabajador, y una administración precisa para RH, instructores, supervisores y auditores. Ambas comparten un registro único y trazable de quién se capacitó, en qué versión de curso, con qué evidencia y hasta cuándo.

**Lo que está confirmado [H].** Población (operación, mantenimiento, supervisión, seguridad, contratistas); seis roles iniciales; una empresa al inicio, con un modelo que separe empresas, plantas, áreas, turnos y puestos; acceso por número de empleado, que no basta por sí solo; celulares personales y equipos compartidos; evaluación digital, práctica o ambas con criterios configurables; contenido de IA solo como borrador; siete exportaciones indispensables en PDF y Excel; constancias automáticas sin validez oficial atribuida. **No existe catálogo de cursos ni materiales**, y los criterios de acreditación no están definidos.

### Decisiones de enfoque propuestas

1. **Separación estricta entre registro de capacitación y motivación.** Los puntos, las insignias y los rankings se guardan aparte y nunca cambian un estado, una calificación ni una acreditación. ([03](03-requisitos-funcionales.md#m10--motivación))
2. **Estados en cuatro capas** (participación, acreditación, constancia y cumplimiento) para que «completado», «aprobado», «vencido» y «atrasado» signifiquen siempre lo mismo y cada asignación caiga en un solo estado de cumplimiento. ([05](05-estados-y-acreditacion.md))
3. **Cada participación queda ligada a una versión de curso**, para saber qué versión completó cada persona.
4. **El número de empleado identifica, la contraseña autentica.** Activación con código de un solo uso entregado en persona, frase de acceso, llave de acceso opcional en el celular propio, segundo factor para roles administrativos y modo de dispositivo compartido por defecto. ([04 §3](04-requisitos-no-funcionales.md#3-autenticación))
5. **Asignación por reglas dinámicas más excepciones individuales**, y adscripciones con fecha de vigencia, para que los movimientos de puesto, área o planta no borren historial.
6. **Contenido normativo o de seguridad con fuente obligatoria y aprobador designado**, distinto del autor. La IA solo propone borradores (V2).
7. **Ranking voluntario, privado por defecto**, que compara solo puntos por equipo y planta, nunca calificaciones.
8. **Indicadores con unidad declarada**: personas únicas, asignaciones, participaciones o intentos; tiempo activo estimado frente a tiempo transcurrido. ([06](06-indicadores.md))
9. **Constancias y exportaciones en segundo plano, a prueba de duplicados**, con folio único, registro de cada emisión, reemisión y revocación sin borrar nada.

### Primera versión operativa (V1)

Piloto controlado con datos reales: una empresa, una planta o algunas áreas, y de uno a tres cursos. Cubre el recorrido completo, de la asignación a la acreditación, la constancia y la exportación, e **incluye las siete exportaciones, los indicadores núcleo y las constancias automáticas**. La IA, la mensajería con costo, las integraciones y el alta de nuevas empresas pasan a V2 y V3. Detalle en [01 §5](01-producto-y-alcance.md#5-plan-de-versiones).

## Entregables de esta etapa

| Documento | Contenido |
|---|---|
| [01 · Producto y alcance](01-producto-y-alcance.md) | Objetivo, hechos confirmados, no objetivos, perfiles y roles, contexto de uso, mapa de módulos, plan de versiones, glosario |
| [02 · Flujos principales](02-flujos-principales.md) | 18 flujos, de la configuración inicial a la auditoría |
| [03 · Requisitos funcionales](03-requisitos-funcionales.md) | Requisitos identificados por módulo y versión, incluidas las reglas del ranking |
| [04 · Requisitos no funcionales](04-requisitos-no-funcionales.md) | Escenarios de carga, disponibilidad, autenticación, sesiones, equipos compartidos, aislamiento, datos personales, integridad, monitoreo, accesibilidad, conservación |
| [05 · Estados y acreditación](05-estados-y-acreditacion.md) | Modelo de estados, reglas de transición, parámetros configurables, registro de la validación práctica, ejemplos |
| [06 · Indicadores](06-indicadores.md) | 34 indicadores con fórmula, denominador, fuente y periodo; relación con las exportaciones |
| [07 · Vacíos, preguntas, supuestos y riesgos](07-vacios-preguntas-supuestos-riesgos.md) | 18 hallazgos, 7 preguntas bloqueantes con opciones, supuestos y riesgos |
| [Registro de decisiones](../registro-de-decisiones.md) | Decisiones confirmadas, propuestas y pendientes |

## Preguntas bloqueantes

**Para iniciar la Etapa 2** (respondidas el 5 nov 2026; ver [07 §2.0](07-vacios-preguntas-supuestos-riesgos.md#20-respuestas-recibidas-5-de-noviembre-de-2026)):

- **B-1** · ¿Qué significan «400 por sesión» y «1,600 al mes»: personas simultáneas, inscritas, distintas o participaciones? ¿Hay sesiones grupales simultáneas? ¿Cuántas personas hay en total?
- **B-2** · ¿Cómo se identifican y quién da de alta a los contratistas?
- **B-3** · ¿Hay correo o celular de las personas que se pueda usar para activación y recuperación? ¿Se acepta un costo por mensaje? ¿Los supervisores pueden generar códigos de recuperación?
- **B-4** · ¿«Empresas» significa razones sociales de un mismo grupo o clientes independientes?

**Antes de la Etapa 4** (conviene iniciarlas ya): **B-5** restricciones de TI, **B-6** uso de IA con documentos internos, **B-7** responsables y cursos del piloto.

Las opciones y la recomendación de cada una están en [07 §2](07-vacios-preguntas-supuestos-riesgos.md#2-preguntas-bloqueantes).

## Criterios de aceptación de la Etapa 1

La etapa se considera aceptada cuando:

- [ ] La empresa confirma o corrige el objetivo y los no objetivos ([01 §1](01-producto-y-alcance.md#1-objetivo-del-producto)).
- [x] La empresa responde B-1 a B-4, o acepta expresamente la recomendación de cada una. *(5 nov 2026)*
- [ ] El alcance de V1 está aceptado, incluidas las siete exportaciones y las constancias.
- [ ] El modelo de estados en capas y el orden de cálculo del cumplimiento están aceptados o corregidos.
- [ ] Las definiciones de «persona única», «participación», «tiempo activo» y «tiempo transcurrido» están aceptadas.
- [ ] Las decisiones con estado «Propuesta» del registro se aceptan o se corrigen (lo que no se objete se tomará como aceptado para la Etapa 2).
- [ ] Se nombran las personas responsables para B-5, B-6 y B-7, aunque sus respuestas lleguen después.

Verificación interna realizada en esta etapa:

- Cada requisito tiene identificador, versión y origen (hecho o recomendación).
- Ningún documento contiene criterios de acreditación, procedimientos, requisitos normativos, fechas ni presupuestos de la empresa; los ejemplos están marcados como ficticios.
- Las siete exportaciones indispensables están en el alcance de V1 y relacionadas con sus indicadores ([06 §4](06-indicadores.md#4-correspondencia-con-las-exportaciones-indispensables)).

## Siguiente acción

1. **Empresa:** responder B-1 a B-4 (basta con elegir una opción en cada una) y nombrar a los responsables de B-5 a B-7.
2. **Equipo, al recibir las respuestas:** iniciar la Etapa 2 con el mapa de navegación, la matriz de permisos por rol y alcance, los flujos detallados, las pantallas principales (incluidos estados vacíos, errores y uso en equipos compartidos) y la propuesta de identidad visual.

Si se prefiere no esperar, la Etapa 2 puede iniciarse con las recomendaciones de B-1 a B-4 como supuestos, señalando qué pantallas cambiarían si la respuesta es distinta.
