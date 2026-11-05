# 03 · Requisitos funcionales

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

Cada requisito tiene un identificador estable que se usará en el diseño, las pruebas y los criterios de aceptación. La columna «V» indica la versión en que se entrega.

## M01 · Identidad y acceso

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-ACC-01 | El número de empleado identifica a la persona dentro de su empresa, pero nunca basta para entrar: se exige además una credencial secreta o un factor de posesión. | V1 | H |
| RF-ACC-02 | Activación por código de un solo uso, con caducidad configurable, generado por RH de forma individual o por lote, con fichas imprimibles. | V1 | R |
| RF-ACC-03 | La persona crea su propia contraseña en la activación; nadie más la conoce. | V1 | R |
| RF-ACC-04 | Llave de acceso (huella o rostro del celular) opcional en dispositivos personales. | V1 | R |
| RF-ACC-05 | Segundo factor obligatorio para Administrador, RH y Auditor; configurable para Instructor y Supervisor. | V1 | R |
| RF-ACC-06 | Recuperación por autoservicio (canal verificado) y asistida (RH o supervisor autorizado, con verificación presencial), ambas registradas en bitácora. | V1 | R |
| RF-ACC-07 | Modo de dispositivo compartido: sesión no persistente, cierre por inactividad configurable, botón «Salir» siempre visible, limpieza al salir. | V1 | H |
| RF-ACC-08 | La persona puede ver y cerrar sus sesiones abiertas; RH puede cerrar las de una persona por motivo de seguridad. | V1 | R |
| RF-ACC-09 | El acceso de contratistas tiene fecha de expiración. | V1 | R |
| RF-ACC-10 | Inicio de sesión corporativo (SSO) para personal administrativo, si la empresa cuenta con un proveedor de identidad. | V2 | P |

## M02 · Estructura organizacional

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-ORG-01 | Administrar empresas, plantas, áreas (con subáreas), turnos y puestos. | V1 | H |
| RF-ORG-02 | Cada planta tiene zona horaria; los cortes diarios, vencimientos y reportes usan la zona de la planta. | V1 | R |
| RF-ORG-03 | Las unidades se desactivan con fecha; no se eliminan si tienen historial. | V1 | R |
| RF-ORG-04 | Los cambios de estructura (renombrar, fusionar, mover un área) conservan la trazabilidad de los registros anteriores. | V1 | R |

## M03 · Personas

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-PER-01 | Alta, edición y baja lógica de personas, con tipo (empleado o contratista) y empresa contratista cuando aplique. | V1 | H · R |
| RF-PER-02 | Carga masiva desde Excel con plantilla, validación por fila, vista previa de altas, cambios y errores, y confirmación. | V1 | R |
| RF-PER-03 | Historial de adscripciones (planta, área, turno, puesto) con fechas de inicio y fin; un movimiento nunca sobrescribe el anterior. | V1 | H |
| RF-PER-04 | Identificador interno inmutable; el número de empleado se guarda como texto, con historial si cambia. | V1 | R |
| RF-PER-05 | Importación de capacitación previa (registros externos con fecha, curso, vigencia y referencia a evidencia), marcada como «Registro externo». | V1 | P |
| RF-PER-06 | Sincronización automática con el sistema de RH de la empresa. | V2 | P |

## M04 · Roles y permisos

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-ROL-01 | Roles iniciales: Administrador, Recursos Humanos, Instructor, Supervisor, Auditor, Trabajador. | V1 | H |
| RF-ROL-02 | Una persona puede tener varios roles, cada uno con su alcance (empresa, planta, área, turno). | V1 | R |
| RF-ROL-03 | Permisos especiales asignables: aprobador de contenido (por curso o tema) y validador práctico (por curso). | V1 | R |
| RF-ROL-04 | Toda consulta, listado, reporte y exportación se filtra en el servidor por rol y alcance. | V1 | H |
| RF-ROL-05 | Las asignaciones de roles quedan en bitácora con quién las otorgó y cuándo. | V1 | R |

## M05 · Autoría de contenido

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-CON-01 | Crear cursos, módulos, niveles, lecciones y actividades manualmente. | V1 | H |
| RF-CON-02 | Tipos de actividad en V1: opción múltiple con imagen, ordenamiento de pasos, identificación de riesgos sobre imagen (marcar zonas), caso de decisión con ramificación y verdadero/falso. | V1 | H · R |
| RF-CON-03 | Cada actividad tiene retroalimentación por respuesta que explica por qué es correcta o incorrecta. | V1 | H |
| RF-CON-04 | Bancos de preguntas reutilizables, con etiquetas por tema y nivel de dificultad. | V1 | H |
| RF-CON-05 | Biblioteca de imágenes con texto alternativo obligatorio y optimización automática de tamaño. | V1 | R |
| RF-CON-06 | Vista previa del curso tal como la verá el trabajador, en celular y en computadora. | V1 | R |
| RF-CON-07 | Marca «DEMO · CONTENIDO FICTICIO» para contenido de demostración; ese contenido no puede asignarse a personas reales. | V1 | H · R |
| RF-CON-08 | Plantillas de curso y de actividad para acelerar la creación del contenido inicial. | V1 | R |

## M06 · Flujo editorial y versiones

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-EDI-01 | Estados del contenido: Borrador → En revisión → Publicado → Archivado; con «Cambios solicitados» como regreso a Borrador. | V1 | H |
| RF-EDI-02 | Publicar crea una versión numerada e inmutable de contenido, evaluación y criterios de acreditación. | V1 | H |
| RF-EDI-03 | Registro de fuentes por curso (documento, versión o fecha, responsable). Obligatorio para cursos clasificados como normativos o de seguridad. | V1 | H |
| RF-EDI-04 | Los cursos normativos o de seguridad requieren la aprobación de un aprobador de contenido designado, distinto del autor. | V1 | H · R |
| RF-EDI-05 | Clasificación de cambios al publicar: «menor» (no afecta a quien ya acreditó) o «mayor» (permite exigir recapacitación a quien ya acreditó). | V1 | R |
| RF-EDI-06 | Comparación entre versiones y comentarios de revisión conservados. | V1 | R |
| RF-EDI-07 | Archivar retira el curso de nuevas asignaciones sin afectar participaciones ni acreditaciones existentes. | V1 | R |

## M07 · Contenido asistido por IA

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-IA-01 | Cargar documentos y registrar su fuente antes de generar propuestas. | V2 | H |
| RF-IA-02 | La IA propone estructura, lecciones, actividades y preguntas, cada elemento con referencia al fragmento de origen. | V2 | H · R |
| RF-IA-03 | Todo lo generado queda en borrador con marca visible hasta su aprobación humana; la IA no publica ni aprueba. | V2 | H |
| RF-IA-04 | El historial conserva qué elementos propuso la IA, qué modificó la persona y quién aprobó. | V2 | R |
| RF-IA-05 | En cursos normativos, un elemento sin referencia verificable a la fuente no puede aprobarse. | V2 | H · R |

## M08 · Asignaciones

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-ASG-01 | Reglas de asignación por empresa, planta, área, turno, puesto, persona y combinaciones. | V1 | H |
| RF-ASG-02 | Vista previa del número y la lista de personas afectadas antes de confirmar. | V1 | R |
| RF-ASG-03 | Fechas límite absolutas o relativas (a la asignación o al ingreso). | V1 | R |
| RF-ASG-04 | Reglas dinámicas: se aplican a quien entra al alcance después de creada la regla. | V1 | R |
| RF-ASG-05 | Una sola asignación por persona y curso aunque varias reglas coincidan. | V1 | R |
| RF-ASG-06 | Excepciones individuales (exención, curso adicional, prórroga, intentos adicionales) con motivo, aprobador y vigencia. | V1 | H |
| RF-ASG-07 | Matriz de capacitación por puesto: qué cursos exige cada puesto. | V1 | H |

## M09 · Experiencia de aprendizaje

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-APR-01 | Panel personal con cursos asignados, avance, fechas límite y pendientes, ordenados por urgencia. | V1 | H |
| RF-APR-02 | Ruta de aprendizaje por módulos, niveles y lecciones breves, con progreso visible. | V1 | H |
| RF-APR-03 | Retroalimentación inmediata que explica el error; las actividades falladas se repiten al final de la lección. | V1 | H · R |
| RF-APR-04 | El avance se guarda en cada actividad y se reanuda en cualquier dispositivo. | V1 | R |
| RF-APR-05 | Historial de capacitación y consulta y descarga de constancias propias. | V1 | H |
| RF-APR-06 | Estados vacíos útiles (sin cursos asignados, sin constancias) con la siguiente acción posible. | V1 | H |
| RF-APR-07 | Mensajes de error comprensibles sin códigos técnicos, con acción de recuperación. | V1 | H |

## M10 · Motivación

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-MOT-01 | Puntos por acciones de aprendizaje: completar lecciones, acertar en actividades de práctica, completar módulos. | V1 | H |
| RF-MOT-02 | **Separación estricta:** los puntos se guardan en un registro independiente del registro de capacitación. El registro oficial puede otorgar insignias (por ejemplo, al acreditar), pero los puntos nunca cambian un estado, una calificación ni una acreditación. | V1 | H |
| RF-MOT-03 | La evaluación digital no otorga puntos por calificación, para no mezclar desempeño evaluado con motivación. | V1 | R |
| RF-MOT-04 | Insignias por hitos (primer curso, módulo completo, práctica sin errores, renovación a tiempo), configurables por la empresa. | V1 | H |
| RF-MOT-05 | Límites antiabuso: tope diario de puntos por tipo de acción y puntos reducidos al repetir una lección ya completada. | V1 | R |
| RF-MOT-06 | Cada mecanismo (puntos, insignias, ranking, metas de equipo) se puede activar o desactivar por empresa. | V1 | H |
| RF-MOT-07 | Sin «vidas» ni bloqueos por errores en lecciones; sin rachas diarias activas por defecto. | V1 | R |
| RF-MOT-08 | Metas cooperativas de equipo (por ejemplo, porcentaje del área con su capacitación al día) visibles para el equipo. | V2 | R |
| RF-MOT-09 | Temporadas y retos temáticos. | V2 | R |

### Reglas del ranking (RF-RNK)

| ID | Regla | Origen |
|---|---|---|
| RF-RNK-01 | **Participación voluntaria.** Cada persona decide si aparece en el ranking. Por defecto: progreso privado. Puede cambiar de opción en cualquier momento. | H · R |
| RF-RNK-02 | **Qué se compara:** solo puntos de motivación del periodo (semanal o mensual, configurable). Nunca calificaciones, intentos, estados de acreditación, vencimientos ni tiempo de capacitación. | R |
| RF-RNK-03 | **Ámbito:** equipo (área y turno) y planta. Nunca entre empresas. | R |
| RF-RNK-04 | **Quién lo ve:** las personas del mismo ámbito. Solo aparecen quienes eligieron participar. Supervisores y administradores ven el ranking igual que los demás: no tienen una versión con más nombres. | R |
| RF-RNK-05 | **Cómo se muestra:** nombre corto o alias, según configuración de la empresa; los primeros lugares y la posición propia. No se muestran públicamente los últimos lugares. | R |
| RF-RNK-06 | **Grupo mínimo:** no se muestra un ranking con menos de 5 participantes, para evitar identificar a personas por descarte. | R |
| RF-RNK-07 | **Modo privado:** la persona no aparece en ninguna comparación ni posición visible para otros; ve su propio progreso, puntos e insignias. Su registro de capacitación sigue disponible para los roles autorizados por alcance. Sus puntos solo son visibles para el Administrador, con fines de soporte y auditoría. | H · R |
| RF-RNK-08 | Al pasar a modo privado, la persona desaparece también de los rankings anteriores mostrados en la plataforma. | R |

## M11 · Evaluación y acreditación

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-EVA-01 | Cada versión de curso define sus criterios: contenido completado, evaluación digital, validación práctica o combinación. | V1 | H |
| RF-EVA-02 | Parámetros configurables de evaluación: calificación mínima, número de intentos, espera entre intentos, tiempo límite, selección aleatoria del banco, orden aleatorio, momento de mostrar respuestas correctas. Ver [05](05-estados-y-acreditacion.md#4-parámetros-configurables-por-curso). | V1 | H |
| RF-EVA-03 | Prerrequisitos entre cursos (requiere acreditación vigente de otro curso). | V1 | H |
| RF-EVA-04 | Vigencia y renovación configurables por versión de curso. | V1 | H |
| RF-EVA-05 | La calificación se calcula en el servidor; el tiempo límite lo controla el servidor. | V1 | R |
| RF-EVA-06 | Envío idempotente: un intento no se registra dos veces aunque se reenvíe. | V1 | H |
| RF-EVA-07 | Validación práctica con lista de verificación por versión, resultado por criterio y general, observaciones, evidencias y confirmación del validador. | V1 | H |
| RF-EVA-08 | Solo validadores autorizados para el curso, dentro de su alcance, y nunca sobre sí mismos. | V1 | R |
| RF-EVA-09 | Estados de participación y reglas de transición según [05](05-estados-y-acreditacion.md). | V1 | H |
| RF-EVA-10 | No se publica una versión con criterios de acreditación incompletos o contradictorios (por ejemplo, calificación mínima sin evaluación). | V1 | R |

## M12 · Constancias

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-CTA-01 | Emisión automática en PDF al acreditarse, en segundo plano. | V1 | H |
| RF-CTA-02 | Plantillas configurables con nombre, número de empleado, curso y versión, fecha de acreditación y de emisión, calificación cuando aplique, folio único, datos organizacionales y logotipo. | V1 | H |
| RF-CTA-03 | Folio único e irrepetible; una acreditación tiene como máximo una constancia vigente. | V1 | H |
| RF-CTA-04 | Registro de cada emisión: plantilla y versión de plantilla usadas, datos con que se generó, quién o qué la generó, huella de integridad del archivo. | V1 | H · R |
| RF-CTA-05 | Corrección y reemisión con nuevo folio enlazado al anterior; revocación con motivo. Nada se borra. | V1 | H |
| RF-CTA-06 | Leyenda configurable que indica que es un documento interno; el texto lo valida jurídico. | V1 | H · P |
| RF-CTA-07 | Verificación por QR que consulta el estado del folio con datos mínimos. | V1 o V2 | P |
| RF-CTA-08 | Firma del responsable (imagen de firma autorizada o firma electrónica). | V1 o V2 | P |

## M13 · Indicadores y consultas

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-IND-01 | Indicadores con fórmula, fuente, periodo y denominador documentados en [06-indicadores.md](06-indicadores.md). | V1 | H |
| RF-IND-02 | Filtros por curso, versión, periodo, empresa, planta, área, turno, puesto y tipo de personal. | V1 | H |
| RF-IND-03 | Distinción visible entre personas únicas y participaciones, y entre tiempo activo estimado y tiempo transcurrido. | V1 | H |
| RF-IND-04 | Cada tablero muestra la fecha de corte y la definición del indicador al pasar el cursor o tocar un ícono de ayuda. | V1 | R |

## M14 · Exportaciones

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-EXP-01 | Exportaciones indispensables en PDF y Excel: (1) reporte individual, (2) matriz de capacitación, (3) cumplimiento por unidad organizacional, (4) historial de evaluaciones e intentos, (5) evidencias y validaciones prácticas, (6) constancias emitidas, (7) capacitación pendiente y próxima a vencer. | V1 | H |
| RF-EXP-02 | Respetan permisos, alcance y filtros aplicados. | V1 | H |
| RF-EXP-03 | Encabezado con fecha y hora de generación, usuario que la generó, alcance, periodo y filtros. | V1 | H |
| RF-EXP-04 | Excel: una fila por registro, encabezados en la primera fila, identificadores como texto (conservan ceros a la izquierda), fechas como fechas, números como números; hoja adicional «Parámetros» con filtros y definiciones. | V1 | H · R |
| RF-EXP-05 | PDF: encabezado y pie en cada página, paginación «Página X de Y», tablas legibles. | V1 | H |
| RF-EXP-06 | Generación en segundo plano para volúmenes grandes, con aviso en la app y enlace de descarga con caducidad. | V1 | H |
| RF-EXP-07 | Permiso verificado al solicitar y al descargar; cada exportación queda en bitácora. | V1 | R |

## M15 · Bitácora

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-BIT-01 | Registro de quién, cuándo (hora del servidor), qué acción, sobre qué registro, valores anteriores y nuevos, y motivo cuando se exige. | V1 | H |
| RF-BIT-02 | Acciones registradas como mínimo: altas, cambios y bajas de personas y estructura; movimientos; roles; publicación de versiones; asignaciones y excepciones; intentos; validaciones; acreditaciones; constancias; exportaciones; accesos y recuperaciones. | V1 | H · R |
| RF-BIT-03 | La bitácora no se puede modificar ni borrar desde la aplicación. | V1 | R |
| RF-BIT-04 | Consulta y exportación de la bitácora por Auditor y Administrador dentro de su alcance. | V1 | R |

## M16 · Notificaciones

| ID | Requisito | V | Origen |
|---|---|---|---|
| RF-NOT-01 | Avisos dentro de la app: nueva asignación, fecha límite próxima, resultado de evaluación, validación registrada, constancia disponible, exportación lista. | V1 | R |
| RF-NOT-02 | Avisos por correo, SMS o WhatsApp, sujetos a datos de contacto, consentimiento y costo. | V2 | P |
