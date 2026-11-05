# 02 · Matriz de permisos

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

## 1. Cómo leer la matriz

**Acciones**

| Clave | Acción |
|---|---|
| **V** | Consultar |
| **C** | Crear (incluye registrar, generar, cargar, solicitar) |
| **M** | Modificar (incluye desactivar, cancelar, anular con motivo) |
| **A** | Aprobar (incluye publicar, autorizar, revocar) |
| **X** | Exportar a PDF o Excel |
| — | Sin acceso |

**Alcance de cada rol.** Todo permiso se ejerce solo dentro del alcance de la asignación de rol [H].

| Rol | Alcance que se le puede asignar | Abreviatura en la tabla |
|---|---|---|
| Administrador | Grupo completo (corporativo) o una empresa | *Alc.* = su alcance asignado |
| Recursos Humanos | Grupo, empresa o planta | *Alc.* |
| Instructor | Los cursos a su cargo, dentro de las plantas asignadas | **K** |
| Supervisor | Su equipo: una o varias combinaciones de área y turno | **T** |
| Auditor | Grupo, empresa o planta | *Alc.* |
| Trabajador | Sus propios datos | **Y** |

Cuando una celda no indica alcance, aplica el alcance del rol.

## 2. Matriz

| # | Recurso | Administrador | RH | Instructor | Supervisor | Auditor | Trabajador |
|---|---|---|---|---|---|---|---|
| 1 | Estructura organizacional (empresas, plantas, áreas, turnos, puestos) | V C M X | V X · M en puestos | V | V | V X | — |
| 2 | Personas: datos y adscripciones | V C M X | V C M X | V (participantes de K) | V (T) | V X | V (Y) |
| 3 | Carga de personas desde Excel | V C | V C | — | — | V | — |
| 4 | Contratistas y empresas contratistas | V C M X | V C M X | V (participantes de K) | V (T) | V X | — |
| 5 | Fichas de activación y restablecimiento de acceso | V C | — ¹ | — | — ¹ | V ² | — |
| 6 | Cerrar sesiones de otra persona | M | — | — | — | — | M (Y) |
| 7 | Roles y alcances | V C M ³ | V | — | — | V X | — |
| 8 | Cursos: borradores y contenido | V C M | V (publicados) | V C M (K) | V (publicados) | V | V (asignados) |
| 9 | Revisión y publicación de versiones | A (no normativos) | — | A si tiene permiso de revisor o aprobador ⁴ | — | V | — |
| 10 | Archivar curso | M | — | C (solicita, K) | — | — | — |
| 11 | Bancos de preguntas | V C M | — | V C M (K) | — | V | — |
| 12 | Reglas de asignación y matriz por puesto | V C M X | V C M X | V (K) | V (T) | V X | — |
| 13 | Excepciones: exención, curso adicional, prórroga | V C A X | V C A X | — | C (solicita, T) | V X | — |
| 14 | Excepciones: intentos adicionales | V C A | V C A | V C A (K) | C (solicita, T) | V | — |
| 15 | Avance y participaciones | V X | V X | V X (K) | V X (T) | V X | V (Y) |
| 16 | Intentos de evaluación con detalle de respuestas | V X | V X | V X (K) | V solo calificación de acreditación ⁵ | V X | V (Y) ⁶ |
| 17 | Validación práctica: registrar | C si es validador | C si es validador | C si es validador (K) | C si es validador (T) | — | M: confirma la suya (Y) |
| 18 | Validación práctica: anular con motivo | M | M | — | — | — | — |
| 19 | Evidencias | V X | V X | V X (K) | V (T) | V X | V (Y) |
| 20 | Acreditaciones | V X · A revocar | V X · A revocar | V X (K) | V X (T) | V X | V (Y) |
| 21 | Registro externo de capacitación previa | V C M | V C M | — | — | V | V (Y) |
| 22 | Plantillas de constancia | V C M A | V | — | — | V | — |
| 23 | Constancias: consultar y descargar | V X | V X | V X (K) | V X (T) | V X | V X (Y) |
| 24 | Constancias: reemitir y revocar | A | A | — | — | — | — |
| 25 | Tablero e indicadores | V X | V X | V X (K) | V X (T) | V X | V (Y: su avance) |
| 26 | Exportaciones indispensables (las siete) | X | X | X (K) | X (T) | X | X (Y: reporte individual y constancias) |
| 27 | Bitácora | V X | V (personas y asignaciones de su alcance) | — | — | V X | — |
| 28 | Configuración: gamificación, parámetros, plantillas de ficha | V M | V | — | — | V | — |
| 29 | Registro de dispositivos compartidos | V C M | — | — | — | V | — |
| 30 | Puntos e insignias de otras personas | V ⁷ | — | — | — | — | — |
| 31 | Ranking | V como participante | V como participante | V como participante | V como participante | — | V · M su preferencia (Y) |

**Notas**

1. Por decisión B-3, el restablecimiento de acceso lo hace el Administrador. El Administrador puede delegar el permiso «Restablecer acceso» a personas concretas por planta y turno si se aprueba D-36.
2. El Auditor consulta en la bitácora quién generó fichas y restableció accesos; nunca ve códigos.
3. Solo dentro de su propio alcance y nunca a sí mismo (SoD-03).
4. Los cursos normativos o de seguridad solo los aprueba quien tiene el permiso de aprobador para ese curso o tema, y nunca su autor (SoD-01).
5. D-28: el supervisor ve el estado, la calificación del intento aprobatorio y el número de intentos; no ve las respuestas.
6. El trabajador ve sus intentos con el nivel de retroalimentación configurado en la versión del curso.
7. Solo con fines de soporte y auditoría, incluidos los de personas en modo privado (RF-RNK-07). La consulta queda en bitácora.

## 3. Permisos especiales por curso o tema

Se otorgan a personas concretas, además de su rol, y quedan en bitácora.

| Permiso | Quién puede recibirlo | Qué permite | Quién lo otorga |
|---|---|---|---|
| Revisor de contenido | Instructor, Administrador | Aprobar y publicar versiones de cursos **no** normativos | Administrador |
| Aprobador de contenido | Persona designada por la empresa como responsable del tema (normalmente Instructor o personal de Seguridad o Calidad) | Aprobar versiones de cursos normativos o de seguridad, verificando sus fuentes | Administrador |
| Validador práctico | Supervisor, Instructor u otra persona autorizada | Registrar validaciones prácticas del curso, dentro de su alcance | Administrador o RH |
| Restablecer acceso | Personas designadas por planta y turno | Generar códigos de restablecimiento tras verificar identidad en persona | Administrador (solo si se aprueba D-36) |

## 4. Separación de funciones

| ID | Regla | Etiqueta |
|---|---|---|
| SoD-01 | Nadie aprueba su propio contenido normativo o de seguridad. | H · R |
| SoD-02 | Nadie se valida a sí mismo, ni registra o aprueba excepciones a su favor, ni restablece su propio acceso. | R |
| SoD-03 | Nadie se otorga roles a sí mismo ni otorga roles más allá de su propio alcance. | R |
| SoD-04 | El rol Auditor no se combina con Administrador ni con RH en el mismo alcance. | R |
| SoD-05 | Revocar acreditaciones o constancias y anular validaciones exige motivo y volver a autenticarse. Si debe aprobarlo una segunda persona está pendiente de decidir. | R · P |
| SoD-06 | El Administrador de plataforma (operación técnica) no tiene ningún rol de la empresa por defecto. | R |

## 5. Administrador de plataforma

Rol técnico, distinto del Administrador de la empresa (D-16).

| Puede | No puede |
|---|---|
| Crear el grupo y sus empresas; supervisar el servicio, los respaldos y los errores; aplicar actualizaciones | Ver personas, resultados, evidencias o constancias por defecto |
| Abrir un acceso excepcional de soporte, temporal, justificado y registrado, si la empresa lo autoriza en ese momento | Modificar registros de capacitación, la bitácora o las constancias |

## 6. Cómo se evalúa un permiso

1. Se obtienen las asignaciones de rol **vigentes** de la persona en su grupo.
2. Se determina a qué unidad pertenece el registro solicitado: la adscripción de la persona según las reglas RI-02 y RI-03, o el curso para el alcance **K**.
3. Se concede si alguna asignación de rol otorga la acción y su alcance contiene esa unidad, y si no lo impide ninguna regla de separación de funciones.
4. Se evalúa **en el servidor** en cada solicitud, listado, indicador, exportación y descarga. Ocultar botones en la interfaz es comodidad, no control.
5. Las denegaciones de acciones sensibles (exportar, revocar, consultar datos de otra empresa) quedan registradas.

### Ejemplos

> **DEMO · CONTENIDO FICTICIO.** Nombres y unidades inventados.

| Situación | Resultado |
|---|---|
| Supervisora de «Ensamble · Turno 2 · Planta Norte» abre la matriz de capacitación | Ve a las personas cuya adscripción actual es Ensamble · Turno 2, con su historial completo (D-10). |
| Una persona de su equipo se transfiere a «Pintura» | Deja de verla en detalle. En indicadores de periodos pasados, los eventos anteriores siguen contando para Ensamble (RI-02), pero sin poder abrir el detalle de esa persona. |
| RH de la empresa «Demo Norte» intenta exportar personas de «Demo Sur» | Denegado y registrado. Solo un rol con alcance de grupo puede hacerlo. |
| Instructor autor del curso normativo «DEMO · Curso normativo A» intenta aprobarlo | Denegado por SoD-01; debe aprobarlo el aprobador designado. |
| Trabajador intenta abrir `/admin` | La consola no existe para él: se le redirige a *Aprender*. |
