# 06 · Diccionario preliminar de indicadores

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

Cada indicador define fórmula, denominador, fuente y periodo. Los nombres de estado provienen de [05-estados-y-acreditacion.md](05-estados-y-acreditacion.md). Las metas (qué porcentaje es aceptable) no se definen aquí: las fija la empresa [P].

## 1. Unidades de conteo

Mezclar unidades es la principal causa de cifras que no cuadran. Cada indicador declara la suya.

| Unidad | Qué cuenta | Ejemplo |
|---|---|---|
| **Persona única** | Cada individuo una sola vez | «312 personas tienen capacitación asignada» |
| **Asignación** | Cada obligación persona-curso | «A esas personas corresponden 1,140 asignaciones» |
| **Participación** | Cada ciclo de trabajo en una versión de curso (una asignación puede tener varias: renovación, reinicio) | «En octubre hubo 1,600 participaciones activas» |
| **Intento** | Cada presentación de una evaluación | «2,050 intentos en el trimestre» |
| **Emisión** | Cada constancia generada (incluye reemisiones) | «1,210 constancias emitidas» |

Dos tipos de indicador:

- **Foto al corte:** describe la situación en un instante (por ejemplo, «cumplimiento al 31 de octubre»).
- **Flujo del periodo:** cuenta lo que ocurrió entre dos fechas (por ejemplo, «intentos de octubre»).

## 2. Reglas generales

| ID | Regla | Etiqueta |
|---|---|---|
| RI-01 | La **fecha de corte** por defecto es el final del día actual en la zona horaria de cada planta. Todo tablero y exportación la muestra. | R |
| RI-02 | **Atribución organizacional.** En indicadores de foto, cada registro se atribuye a la adscripción de la persona en la fecha de corte. En indicadores de flujo, a su adscripción en la fecha del evento. Los reportes permiten cambiar a «adscripción actual». | R |
| RI-03 | **Alcance.** Un usuario ve los registros atribuidos a unidades dentro de su alcance según RI-02. Para el historial individual, quien tiene hoy a la persona en su alcance ve su historial completo de capacitación. | R · confirmar con RH |
| RI-04 | **Exclusiones del denominador de cumplimiento:** asignaciones exentas, opcionales y canceladas. Las exentas y opcionales se reportan aparte. | R · P |
| RI-05 | Los **registros externos** cuentan para el cumplimiento solo si RH lo decide. Siempre se pueden filtrar. | P |
| RI-06 | El contenido y los datos de **demostración** nunca se incluyen en indicadores reales. | H · R |
| RI-07 | **Contratistas** se incluyen y se pueden filtrar por tipo de personal y empresa contratista. | R |
| RI-08 | Todo porcentaje se presenta con su **numerador y denominador** y un decimal. | R |
| RI-09 | Las exportaciones incluyen una hoja o sección con la definición de cada indicador incluido. | R |

**Dimensiones disponibles** para todos los indicadores, salvo que se indique otra cosa: curso, versión, periodo, grupo, empresa, planta, área, turno, puesto, tipo de personal (empleado o contratista) y empresa contratista.

## 3. Indicadores

### 3.1 Asignación y cumplimiento

| ID | Indicador | Tipo | Fórmula | Denominador | Fuente |
|---|---|---|---|---|---|
| I-01 | Personas con capacitación asignada | Foto | Personas únicas con al menos una asignación obligatoria activa | — | Asignaciones, adscripciones |
| I-02 | Cobertura de asignación | Foto | I-01 ÷ personas activas en el alcance (plantilla de referencia: 2,000) | Personas activas en el alcance al corte | Personas, asignaciones |
| I-03 | Asignaciones obligatorias vigentes | Foto | Asignaciones obligatorias no canceladas ni exentas | — | Asignaciones |
| I-04 | Distribución por estado de cumplimiento | Foto | Asignaciones en cada estado (Al día, Por vencer, Vencida, Atrasada, Pendiente con su subestado) ÷ I-03 | I-03 | Asignaciones, participaciones, acreditaciones |
| I-05 | **Cumplimiento de capacitación asignada** | Foto | (Al día + Por vencer) ÷ I-03 | I-03 | Igual que I-04 |
| I-06 | Personas en cumplimiento total | Foto | Personas cuyas asignaciones obligatorias vigentes están todas Al día o Por vencer ÷ personas con al menos una asignación obligatoria vigente | Personas con al menos una asignación obligatoria vigente | Igual que I-04 |
| I-07 | Cumplimiento en plazo | Flujo | Asignaciones con fecha límite en el periodo acreditadas en o antes de esa fecha ÷ asignaciones con fecha límite en el periodo | Asignaciones obligatorias con fecha límite en el periodo, no exentas ni canceladas antes de su fecha límite | Asignaciones, acreditaciones |
| I-08 | Exenciones vigentes | Foto | Asignaciones exentas, con motivo | — | Excepciones |

I-04 responde a «inscritas, pendientes, en curso, aprobadas y vencidas» sin dobles conteos, porque cada asignación cae en un solo estado (ver [05 §2.4](05-estados-y-acreditacion.md#24-cumplimiento-de-la-asignación-lo-que-muestran-los-reportes)).

### 3.2 Avance

| ID | Indicador | Tipo | Fórmula | Denominador | Fuente |
|---|---|---|---|---|---|
| I-09 | Avance de una participación | Foto | Lecciones obligatorias completadas ÷ lecciones obligatorias de su versión | Lecciones obligatorias de la versión | Eventos de lección |
| I-10 | Avance promedio | Foto | Promedio de I-09 en participaciones abiertas (En curso, Contenido completado, Pendiente de validación) | Participaciones abiertas | Eventos de lección |
| I-11 | Avance por persona | Foto | Asignaciones obligatorias Al día o Por vencer de la persona ÷ sus asignaciones obligatorias vigentes | Asignaciones obligatorias vigentes de la persona | Asignaciones |

### 3.3 Evaluación e intentos

| ID | Indicador | Tipo | Fórmula | Denominador | Fuente |
|---|---|---|---|---|---|
| I-12 | Intentos realizados | Flujo | Intentos cerrados en el periodo (enviados o cerrados por tiempo; excluye anulados) | — | Intentos |
| I-13 | Aprobación al primer intento | Flujo | Participaciones cuyo primer intento cerró en el periodo y aprobó ÷ participaciones cuyo primer intento cerró en el periodo | Participaciones con primer intento cerrado en el periodo | Intentos |
| I-14 | Intentos promedio para aprobar | Flujo | Suma de intentos hasta el aprobatorio ÷ participaciones que aprobaron en el periodo | Participaciones con intento aprobatorio en el periodo | Intentos |
| I-15 | Calificación de acreditación promedio | Flujo | Promedio de la calificación del intento aprobatorio | Participaciones acreditadas en el periodo con evaluación | Intentos, acreditaciones |
| I-16 | Calificación promedio de todos los intentos | Flujo | Promedio de calificación de los intentos cerrados | I-12 | Intentos |
| I-17 | Participaciones no aprobadas | Flujo | Participaciones que pasaron a No aprobada en el periodo ÷ participaciones con al menos un intento cerrado en el periodo | Participaciones con intentos cerrados en el periodo | Participaciones, intentos |

I-15 e I-16 se muestran siempre por separado: la primera mide el nivel con que se acredita; la segunda incluye intentos reprobados.

### 3.4 Tiempo

| ID | Indicador | Tipo | Fórmula | Unidad | Fuente |
|---|---|---|---|---|---|
| I-18 | **Tiempo activo estimado** | Flujo | Suma de los intervalos entre eventos consecutivos de actividad de una persona en una sesión, contando solo los intervalos menores o iguales al umbral de inactividad (propuesta: 5 minutos, configurable). Un intervalo mayor se considera pausa y no suma. | Horas y minutos | Eventos de actividad y señal de presencia (cada 60 s mientras la pantalla está visible y hubo interacción reciente) [R] |
| I-19 | **Tiempo transcurrido** | Por participación | Fecha de acreditación − fecha de primera actividad | Días naturales; se reporta la mediana por curso | Participaciones, acreditaciones |
| I-20 | Duración de diseño | Dato del curso | Duración estimada que declara el autor | Minutos | Versión de curso |

El tiempo activo es una **estimación conservadora**: no mide la atención real y subestima la última pantalla antes de una pausa. **No debe usarse para nómina ni como prueba de horas de capacitación** sin una validación previa con RH y jurídico [R · P]. El tiempo transcurrido mide el plazo de calendario, no el esfuerzo.

### 3.5 Validación práctica y competencias

| ID | Indicador | Tipo | Fórmula | Denominador | Fuente |
|---|---|---|---|---|---|
| I-21 | Validaciones registradas | Flujo | Validaciones del periodo por resultado (Competente / Aún no competente); excluye anuladas | — | Validaciones |
| I-22 | Competente al primer registro | Flujo | Participaciones cuya primera validación del periodo fue «Competente» ÷ participaciones con primera validación en el periodo | Participaciones con primera validación en el periodo | Validaciones |
| I-23 | Espera de validación | Flujo | Mediana de días entre llegar a Pendiente de validación y la validación «Competente» | Participaciones validadas como Competente en el periodo | Participaciones, validaciones |
| I-24 | Pendientes de validación | Foto | Participaciones en Pendiente de validación, con su antigüedad | — | Participaciones |
| I-25 | Personas con competencia vigente | Foto | Personas únicas con acreditación vigente en los cursos asociados a una competencia | Personas que la requieren | Acreditaciones; catálogo de competencias (V2) |

### 3.6 Vencimientos y fechas límite

| ID | Indicador | Tipo | Fórmula | Fuente |
|---|---|---|---|---|
| I-26 | Próximos vencimientos | Foto | Acreditaciones vigentes con vencimiento entre el corte y el corte + N días (N = 30, 60 o 90, configurable) | Acreditaciones |
| I-27 | Fechas límite próximas | Foto | Asignaciones en estado Pendiente con fecha límite entre el corte y el corte + N días | Asignaciones |

### 3.7 Constancias y evidencias

| ID | Indicador | Tipo | Fórmula | Fuente |
|---|---|---|---|---|
| I-28 | Constancias emitidas | Flujo | Emisiones del periodo por tipo (original, reemisión) | Registro de emisiones |
| I-29 | Constancias revocadas | Flujo | Constancias que pasaron a Revocada en el periodo, con motivo | Registro de emisiones |
| I-30 | Evidencias registradas | Flujo | Archivos de evidencia del periodo por tipo; validaciones sin archivo adicional | Evidencias |

### 3.8 Uso de la plataforma

| ID | Indicador | Tipo | Fórmula | Denominador | Fuente |
|---|---|---|---|---|---|
| I-31 | **Usuarios únicos activos** | Flujo | Personas únicas con al menos un evento de aprendizaje en el periodo | — | Eventos de actividad |
| I-32 | **Participaciones activas** | Flujo | Participaciones con al menos un evento en el periodo | — | Eventos de actividad |
| I-33 | Participaciones iniciadas y acreditadas | Flujo | Participaciones con primera actividad en el periodo; participaciones acreditadas en el periodo | — | Participaciones |
| I-34 | Activación de cuentas | Foto | Personas activas con cuenta activada ÷ personas activas en el alcance | Personas activas en el alcance | Personas, cuentas |

I-31 e I-32 responden directamente a la diferencia entre «personas» y «participaciones» de la pregunta B-1: si en un mes hay 1,600 participaciones activas, el número de usuarios únicos puede ser bastante menor.

## 4. Correspondencia con las exportaciones indispensables

| Exportación | Indicadores y registros que incluye |
|---|---|
| 1. Reporte individual | Adscripción actual e historial; asignaciones con estado de cumplimiento; participaciones; intentos; validaciones; acreditaciones; constancias; I-11, I-18 |
| 2. Matriz de capacitación | Personas (filas) × cursos (columnas) con estado de cumplimiento y fecha de vencimiento; I-05, I-06 |
| 3. Cumplimiento por unidad organizacional | I-01 a I-08 por planta, área, turno y puesto |
| 4. Historial de evaluaciones e intentos | Un registro por intento: persona, curso, versión, número de intento, fechas, duración, calificación, resultado; I-12 a I-17 |
| 5. Evidencias y validaciones prácticas | Un registro por validación con sus evidencias; I-21 a I-24 |
| 6. Constancias emitidas | Un registro por emisión: folio, persona, curso, versión, fechas, estado, enlace a la anterior; I-28, I-29 |
| 7. Capacitación pendiente y próxima a vencer | Asignaciones Pendiente, Atrasada, Vencida y Por vencer; I-26, I-27 |
