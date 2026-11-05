# 04 · Pantallas principales

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

Especificación funcional de cada pantalla. Las maquetas visuales de las pantallas marcadas con ◆ están en [05-propuesta-visual.md](05-propuesta-visual.md#8-maquetas).

## 1. Convenciones

- **T-xx:** espacio *Aprender*, diseñado primero para celular (360–430 px) y adaptable a tableta y computadora.
- **A-xx:** espacio *Administrar*, diseñado primero para computadora (1280 px o más) y usable en tableta. A-13 se diseña primero para tableta.
- Cada pantalla define sus **estados**: normal, vacío, cargando, error y sin conexión. Los patrones comunes están en la [sección 4](#4-estados-transversales).

## 2. Espacio «Aprender»

### T-01 · Acceso ◆
- **Contenido:** logotipo de la plataforma y de la empresa; selector de empresa (solo si el grupo tiene más de una; elegido por el QR de la ficha); número de empleado; frase de acceso con «mostrar»; «Entrar»; «Activar mi cuenta»; «¿Olvidaste tu frase de acceso?».
- **Equipo compartido:** franja informativa; sin «Mantener sesión iniciada».
- **Equipo no registrado:** casilla «Este es mi celular personal» (desmarcada por defecto), que permite recordar la sesión.
- **Errores:** mensaje único para credenciales incorrectas; tras varios intentos, demora visible («Espera 30 segundos para intentar de nuevo»).

### T-02 · Activación de cuenta
- Tres pasos con indicador «Paso 1 de 3»: (1) número de empleado y código; (2) crear frase de acceso; (3) aviso de privacidad y preferencia de ranking.
- Ayuda visual: foto de ejemplo de la ficha señalando dónde está el código.

### T-03 · Inicio ◆
- **Encabezado:** «Hola, {nombre}», empresa, botón «Salir».
- **Bloque «Continúa donde te quedaste»:** curso, lección y botón grande «Continuar».
- **Pendientes** ordenados por urgencia: atrasados primero, después por fecha límite. Cada tarjeta muestra curso, estado, avance, fecha límite y una etiqueta de color con texto («Vence en 3 días», «Atrasado»).
- **Avisos:** validación práctica por confirmar, constancia nueva, curso nuevo asignado.
- **Resumen motivacional:** puntos de la semana e insignia más reciente. No compite con los pendientes por la atención.
- **Vacío:** «No tienes cursos asignados por ahora. Cuando te asignen uno, aparecerá aquí.» Acceso a Historial.

### T-04 · Mis cursos
- Pestañas: «Por hacer», «Acreditados», «Todos».
- Tarjeta por curso: título, versión (visible en el detalle), estado de cumplimiento, avance y fecha límite o de vencimiento.

### T-05 · Ruta del curso ◆
- **Metáfora:** línea de proceso vertical. Cada nivel es un tramo con título; cada lección es una estación con estado (completada, disponible, bloqueada) y duración estimada.
- **Arriba:** avance del curso, fecha límite y criterios de acreditación en lenguaje llano («Para acreditar: termina las lecciones, aprueba la evaluación con {calificación mínima} o más y realiza tu práctica con un validador»; los valores se toman de la versión del curso).
- **Al final de la línea:** estación de evaluación y estación de práctica, con su estado.
- **Prerrequisito pendiente:** el curso se ve, pero bloqueado, con el motivo y un enlace al curso requerido.

### T-06 · Lección y actividades ◆
- Barra de avance de la lección y botón «Cerrar» (guarda y sale).
- Cinco plantillas de actividad (V1): opción múltiple con imagen, ordenar pasos (arrastrar o tocar en orden, con alternativa por botones para accesibilidad), identificar riesgos sobre imagen (tocar zonas; con lista accesible alternativa), caso de decisión (escenario con opciones que ramifican) y verdadero o falso.
- Objetivos táctiles de al menos 48 px; texto de al menos 18 px en enunciados.

### T-07 · Retroalimentación ◆
- Franja inferior que no tapa la pregunta: color, ícono **y** texto («Correcto», «Revisa esto»), con la explicación del porqué.

### T-08 · Fin de lección
- Puntos obtenidos, aciertos, insignia si aplica, «Siguiente lección». Animación breve que respeta la preferencia de reducir movimiento.

### T-09 · Antes de la evaluación ◆
- Reglas: preguntas, tiempo, intentos restantes, calificación mínima y qué pasa al reprobar. Aviso: «Las preguntas de la evaluación no dan puntos».

### T-10 · Evaluación
- Apariencia sobria, sin elementos de juego. Reloj (si aplica), mapa de preguntas, «Guardado» por respuesta, «Enviar evaluación» con resumen.

### T-11 · Resultado ◆
- Variantes: acreditado, pendiente de validación práctica, no aprobado con intentos, intentos agotados (ver FD-05).

### T-12 · Logros ◆
- Puntos de la semana y totales; insignias obtenidas y por obtener.
- **Ranking del equipo** (área y turno) y de planta, solo con participantes voluntarios; primeros lugares y la posición propia.
- Interruptor **«Mostrarme en el ranking»** con explicación: «Si lo apagas, nadie verá tus puntos ni tu posición. Tus cursos y resultados siguen visibles para tu supervisor y RH, como siempre».
- **Grupo pequeño:** «El ranking se muestra cuando participan al menos 5 personas de tu equipo».

### T-13 · Historial y constancias ◆
- Lista de acreditaciones: curso, versión, fecha, vigencia, estado (vigente, por vencer, vencida) y botón «Ver constancia».
- Constancias sustituidas o revocadas visibles con su estado.
- «Descargar mi reporte individual» (PDF).

### T-14 · Visor de constancia
- PDF en el navegador; «Descargar» con advertencia en equipos compartidos.

### T-15 · Perfil y seguridad
- Cambiar frase de acceso; activar llave de acceso en este celular; sesiones abiertas con «Cerrar»; preferencia de ranking y alias; aviso de privacidad; ayuda.

### T-16 · Inactividad y sesión cerrada ◆
- Diálogo de aviso con cuenta regresiva y botón «Seguir aprendiendo»; pantalla posterior «Cerramos tu sesión para proteger tus datos».

### T-17 · Confirmar práctica
- «{Validador} registró tu práctica de {curso} el {fecha}. ¿Ocurrió así?» → «Sí, la realicé» / «No reconozco este registro», que avisa a RH.

## 3. Espacio «Administrar»

Elementos comunes: encabezado con **selector de alcance** y **fecha de corte**; migas de pan; filtros visibles como etiquetas que se pueden quitar; tablas con columnas ordenables, conteo de resultados y exportación.

### A-01 · Tablero de cumplimiento ◆
- **Indicadores clave** con numerador, denominador y definición al tocar el ícono de ayuda: cumplimiento (I-05), personas en cumplimiento total (I-06), atrasadas, vencidas, por vencer en 30 días, pendientes de validación.
- **Cumplimiento por unidad:** tabla con barras por planta, área, turno o puesto, ordenable de menor a mayor.
- **Próximos vencimientos y fechas límite** (I-26, I-27).
- **Vacío:** «Todavía no hay asignaciones en este alcance. Crea una regla de asignación para empezar.»

### A-02 · Personas
- Búsqueda por nombre o número; filtros por empresa, planta, área, turno, puesto, tipo, estado de cuenta (sin activar, activa, bloqueada, expirada).
- Acciones masivas: generar fichas, asignar curso, exportar.

### A-03 · Ficha de persona ◆
- **Encabezado:** nombre, número de empleado o identificador «C-», empresa, adscripción actual, estado de la cuenta.
- **Pestañas:** Capacitación (asignaciones y estado de cumplimiento), Historial (participaciones, intentos, validaciones, constancias), Adscripciones (línea de tiempo de movimientos), Acceso (sesiones, restablecer acceso), Bitácora.
- **Acciones:** restablecer acceso (Administrador), registrar movimiento, agregar excepción, reporte individual.

### A-04 · Carga desde Excel
- Plantilla descargable; carga; **vista previa** con resumen (altas, cambios, movimientos, errores) y tabla de errores por fila con su causa; opción de aplicar solo filas válidas.

### A-05 · Accesos y fichas
- Personas sin activar, filtrables por convocatoria; generar fichas por lote; historial de lotes; equipos compartidos registrados.

### A-06 · Estructura organizacional
- Árbol grupo → empresa → planta → área; catálogo de turnos por planta; catálogo de puestos. Desactivar con fecha; nunca borrar con historial.

### A-07 · Cursos
- Catálogo con estado editorial (borrador, en revisión, publicado, archivado), versión publicada, clasificación (interno, seguridad, calidad, normativo), marca DEMO y responsable.

### A-08 · Editor de curso
- **Panel izquierdo:** estructura (módulos, niveles, lecciones) que se puede arrastrar.
- **Centro:** editor de la lección o actividad con vista previa en celular.
- **Pestañas del curso:** Datos generales, Fuentes, Evaluación, Validación práctica, Acreditación y vigencia, Constancia, Historial de versiones.
- **Antes de enviar a revisión:** lista de verificación automática (criterios obligatorios capturados, fuentes en cursos normativos, texto alternativo en imágenes).

### A-09 · Revisiones pendientes
- Cola de versiones por revisar; comparación con la versión anterior; comentarios por elemento; «Solicitar cambios» o «Aprobar y publicar» (con clasificación de cambio menor o mayor).

### A-10 · Reglas de asignación ◆
- Lista de reglas con alcance, curso, fecha límite y número de personas; asistente de tres pasos con vista previa (FD-07).

### A-11 · Excepciones
- Solicitudes y excepciones vigentes; aprobar o rechazar con motivo; vencimiento de exenciones.

### A-12 · Matriz de capacitación ◆
- Filas: personas. Columnas: cursos requeridos. Celda: estado de cumplimiento con color, ícono y texto corto, más la fecha de vencimiento o límite.
- Filtros por unidad, curso y estado; totales por columna; exportación a Excel con los mismos filtros.

### A-13 · Validación práctica (tableta) ◆
- Lista de pendientes en el alcance del validador; ficha de validación con criterios, resultado, observaciones, foto y confirmación (FD-06).

### A-14 · Constancias
- Emitidas, con búsqueda por folio, persona o curso; estado; acciones de reemitir o revocar. Pestaña de plantillas con vista previa y datos de ejemplo marcados como DEMO.

### A-15 · Reportes y exportaciones
- Las siete exportaciones indispensables, cada una con sus filtros; resumen de alcance antes de exportar; cola de exportaciones (FD-09).

### A-16 · Bitácora
- Filtros por persona que actuó, acción, tipo de registro, periodo; detalle con valores anteriores y nuevos; exportación.

### A-17 · Configuración
- Gamificación (activar o desactivar puntos, insignias, ranking, alias), ventana de aviso de vencimiento, tiempo de inactividad en equipos compartidos, caducidad de códigos, roles y permisos especiales.

## 4. Estados transversales

| Estado | Patrón | Ejemplo de texto (trabajador) | Ejemplo de texto (administración) |
|---|---|---|---|
| Vacío | Ilustración sencilla, explicación y siguiente acción posible | «Aún no tienes constancias. Aparecerán aquí cuando acredites tu primer curso.» | «Ninguna persona coincide con estos filtros. Quita algún filtro para ver más resultados.» |
| Cargando | Esqueleto con la forma del contenido; nunca pantalla en blanco | — | — |
| Sin conexión | Franja persistente arriba; lo ya cargado sigue visible; envíos en cola | «Sin conexión. Guardaremos tus respuestas y las enviaremos al volver la señal.» | «Sin conexión. Los datos mostrados son de las 10:42.» |
| Error del servidor | Mensaje humano, sin códigos; botón «Reintentar»; identificador de soporte pequeño | «Algo salió mal de nuestro lado. Tu avance está guardado. Intenta de nuevo.» | «No pudimos generar el reporte. Intenta de nuevo; si se repite, comparte el código 7F3A con soporte.» |
| Sin permiso | Explicación sin revelar datos | — | «No tienes acceso a esta información con tu rol actual.» |
| Sesión cerrada | Regreso a T-01 con motivo | «Cerramos tu sesión para proteger tus datos. Tu avance quedó guardado.» | «Tu sesión expiró. Vuelve a entrar para continuar.» |
| Proceso en segundo plano | Estado visible y aviso al terminar | «Generando tu constancia…» | «Exportación en cola · posición 2.» |

## 5. Lista de verificación para equipos compartidos

| # | Comportamiento | Pantallas |
|---|---|---|
| 1 | No se ofrece recordar la sesión en equipos registrados | T-01 |
| 2 | Nombre de la persona y «Salir» visibles en todo momento | Todas las T |
| 3 | Aviso y cierre por inactividad | T-16 |
| 4 | Al salir no queda contenido personal en pantalla, caché ni almacenamiento local | Todas |
| 5 | Descargar avisa que el archivo quedará en el equipo | T-13, T-14 |
| 6 | El botón «Atrás» del navegador no muestra datos después de salir | Todas |
| 7 | La evaluación interrumpida se retoma sin perder respuestas | T-10 |
| 8 | No se muestra información de otra persona en avisos ni en el teclado predictivo (campos sin autocompletar) | T-01, T-02 |
