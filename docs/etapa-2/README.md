# Etapa 2 · Diseño funcional y visual

**Estado:** entregada para revisión · **Fecha:** 5 de noviembre de 2026 · **Siguiente etapa:** prototipo funcional (Etapa 3)

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

## Respuestas incorporadas

| Pregunta | Respuesta | Efecto en el diseño |
|---|---|---|
| B-1 · Volumen | 1,600 personas distintas al mes; convocatorias de unas 400 inscritas que avanzan a su ritmo; plantilla de 2,000 | Sin modo de sesión grupal. Activación por convocatoria (FD-01). Objetivo de prueba: 400 sesiones simultáneas (D-35). |
| B-2 · Contratistas | Identificador generado con prefijo «C-» y empresa contratista | Alta de contratista (FD-10), identificador visible en matriz y reportes. |
| B-3 · Acceso | Sin costo de mensajería; quien necesite algo acude con el Administrador | Fichas impresas con QR; recuperación solo en persona (FD-03); sin formulario de recuperación. Nuevo riesgo R-14 y decisión D-36. |
| B-4 · Empresas | Razones sociales de un mismo grupo | Nivel «grupo» en el alcance y en el selector de la consola; catálogos compartibles; selector de empresa en el acceso. |

Los documentos de la [Etapa 1](../etapa-1/README.md) quedaron actualizados con estas respuestas.

## Entregables

| Documento | Contenido |
|---|---|
| [01 · Mapa de navegación](01-mapa-de-navegacion.md) | Espacios *Aprender* y *Administrar*, menú por rol, modo de validación en piso, direcciones |
| [02 · Matriz de permisos](02-matriz-de-permisos.md) | 31 recursos × 6 roles con acciones (consultar, crear, modificar, aprobar, exportar) y alcance; permisos especiales; separación de funciones; evaluación del permiso en el servidor |
| [03 · Flujos detallados](03-flujos-detallados.md) | 10 flujos pantalla por pantalla, con casos de error |
| [04 · Pantallas](04-pantallas.md) | 17 pantallas del trabajador y 17 de administración; estados vacío, cargando, error, sin conexión y sin permiso; lista de verificación para equipos compartidos |
| [05 · Propuesta visual](05-propuesta-visual.md) | Concepto, paleta con contraste verificado, tipografía, iconografía, tono, 20 maquetas |
| [Maquetas (HTML)](maquetas/maquetas.html) | Fuente de las maquetas; se abre en cualquier navegador |

## Decisiones de esta etapa

Registradas en el [registro de decisiones](../registro-de-decisiones.md), de D-35 a D-48. Las que requieren a la empresa:

| ID | Decisión | Propuesta |
|---|---|---|
| D-36 | ¿El Administrador puede delegar «Restablecer acceso» a personas designadas por planta y turno? | Sí, para cubrir turnos sin Administrador (riesgo R-14). Si la respuesta es no, conviene tener Administradores en cada turno. |
| D-41 | ¿Tuteo o «usted» en la experiencia del trabajador? | Tuteo |
| D-47 | ¿Los números de empleado se repiten entre empresas del grupo? | Se diseña suponiendo que sí (más seguro) |
| D-48 | ¿La plantilla de 2,000 incluye contratistas? | Se supone que no; afecta la cobertura (I-02) y el tamaño de las pruebas |

Ninguna bloquea la Etapa 3.

## Criterios de aceptación de la Etapa 2

- [ ] La matriz de permisos refleja quién puede consultar, crear, modificar, aprobar y exportar cada recurso, y en qué alcance.
- [ ] El mapa de navegación y las pantallas cubren el recorrido completo: asignación → aprendizaje → evaluación → validación práctica → acreditación → constancia → reporte.
- [ ] Cada pantalla define sus estados vacío, error y sin conexión; el uso en equipos compartidos está cubierto.
- [ ] La experiencia del trabajador (lúdica) y la administración (precisa) se distinguen visualmente, y la evaluación no tiene elementos de juego.
- [ ] La propuesta visual es propia y no recuerda a Duolingo.
- [ ] Se responden D-36, D-41, D-47 y D-48, o se aceptan sus propuestas.

**Verificado por el equipo en esta etapa:**

- Contraste de la paleta calculado: todos los pares de texto ≥ 4.5 : 1 y bordes de controles ≥ 3 : 1.
- Las cifras de las maquetas son coherentes entre sí (por ejemplo, 1,186 ÷ 1,512 = 78.4 % y la suma por área coincide con el total), para que la revisión no se distraiga con errores de datos.
- Todos los enlaces internos de la documentación y los diagramas se verificaron automáticamente.

**No verificado todavía:** usabilidad con personas reales, accesibilidad con lectores de pantalla y teclado, y rendimiento. Corresponden a las Etapas 3 a 5.

## Siguiente acción: Etapa 3 · Prototipo funcional

Un prototipo navegable con datos ficticios que recorra: **asignación del curso → lecciones y actividades → evaluación → validación práctica → acreditación → consulta en la consola → constancia en PDF → exportación**.

Propuesta de lo que será real y lo que será simulado (D-34):

| Funcionará realmente | Estará simulado |
|---|---|
| Navegación de ambos espacios y cambio de rol para probar la matriz de permisos | Inicio de sesión, activación y recuperación (sin seguridad real) |
| Las cinco actividades con retroalimentación | Persistencia: los datos viven en el navegador y se pueden reiniciar |
| Cálculo de estados y de cumplimiento según las reglas de la Etapa 1 | Permisos en el servidor: en el prototipo solo se aplican en la interfaz |
| Indicadores calculados sobre los datos ficticios | Procesos en segundo plano, cola de exportaciones y varios usuarios simultáneos |
| Constancia en PDF y exportación a Excel generadas en el navegador | Envío de avisos |

El prototipo llevará una marca visible de «Prototipo · datos ficticios» y no deberá usarse con datos reales.
