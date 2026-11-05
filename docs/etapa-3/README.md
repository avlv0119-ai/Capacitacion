# Etapa 3 · Prototipo funcional

**Estado:** entregada para revisión · **Fecha:** 5 de noviembre de 2026 · **Siguiente etapa:** desarrollo para operación real (Etapa 4)

> **PROTOTIPO · DATOS FICTICIOS.** Esto no es una aplicación lista para producción. No tiene seguridad real, servidor ni base de datos, y no debe usarse con datos de personas reales.

## Qué se entrega

| Entregable | Dónde |
|---|---|
| Prototipo navegable publicado | https://claude.ai/artifact/WyK8ugJ5isMMT9LU4GJ85p (privado; se comparte desde su menú Compartir) |
| Código fuente y versión local | [`prototipo/`](../../prototipo/README.md) |
| Prueba automatizada del recorrido completo | [`prototipo/pruebas/recorrido.js`](../../prototipo/pruebas/recorrido.js) |
| Verificación de los PDF y Excel generados | [`prototipo/pruebas/verificar_archivos.py`](../../prototipo/pruebas/verificar_archivos.py) |
| Propuesta visual versión 2 (minimalista, plana y juvenil) aplicada | [Etapa 2 · 05](../etapa-2/05-propuesta-visual.md) |
| Capturas en celular y computadora, tema claro y oscuro | [`img/`](img/) |

## Recorrido de demostración

El prototipo abre una **Guía de la demo** que marca cada paso cuando se cumple. La barra oscura superior no es parte del producto: sirve para cambiar de persona («Ver como»), mover la fecha simulada y reiniciar.

| Paso | Quién | Qué hacer | Qué demuestra |
|---|---|---|---|
| 1 | Ana · RH | Reglas de asignación → Nueva regla → «Orden y limpieza del área» → Ensamble → Crear | Asignación por reglas con vista previa; una sola asignación por persona y curso |
| 2 | Rosa · trabajadora | Completar las 4 lecciones | Cinco tipos de actividad, retroalimentación que explica, repaso de errores, puntos e insignias |
| 3 | Rosa | Presentar la evaluación | Intentos, calificación mínima, temas a repasar; «aprobado» no es «acreditado» |
| 4 | Laura · supervisora | Validación práctica → criterios → Competente → Registrar | Validación con lista de verificación, confirmación del validador, acreditación automática |
| 5 | Rosa | Confirmar la práctica → Historial → Ver constancia → Descargar PDF | Constancia automática con folio, versión, vigencia y registro de emisión |
| 6 | Ana | Tablero, Matriz y Reportes → exportar | Indicadores con numerador y denominador; siete reportes en PDF y Excel |

También se puede probar:
- **«+30 días» o «+1 año»** para ver acreditaciones por vencer, vencidas y renovaciones.
- **«Inactividad»** para ver el cierre de sesión en un equipo compartido.
- **Raúl (auditor)** para la vista de solo lectura.
- **Inés (instructora)** para un alcance limitado a sus cursos; antes del paso 1 verá un estado vacío.
- **Constancias**, para reemitir y revocar sin borrar nada.

## Qué funciona realmente y qué está simulado

| Funciona en el prototipo | Simulado | No incluido |
|---|---|---|
| Navegación de ambos espacios y menús por rol | Inicio de sesión: cualquier frase de acceso funciona; no hay activación por ficha ni segundo factor | Activación de cuentas (T-02) y fichas por lote |
| Cinco tipos de actividad con retroalimentación y repaso | Permisos: se aplican solo en la interfaz, no en un servidor | Editor de cursos, revisión editorial y versiones (A-07 a A-09) |
| Reglas de estado y cumplimiento de la Etapa 1 (documento 05) | Guardado: solo en el navegador de quien lo usa; «Reiniciar» lo borra | Contenido asistido por IA |
| Indicadores calculados con las fórmulas del documento 06 | Procesos en segundo plano: la emisión de constancias y las renovaciones se simulan en el navegador | Carga de personas desde Excel (A-04) y estructura organizacional (A-06) |
| Vista previa y creación de reglas de asignación | Evidencia fotográfica: se registra el nombre del archivo, pero no se guarda | Configuración (A-17) y perfil completo (T-15) |
| Excepciones: prórroga, exención e intentos adicionales | Avisos: aparecen dentro de la app, sin envío | Verificación por QR y firma en constancias (pendientes D-22, D-23) |
| Validación práctica con criterios, resultado y confirmación | Reloj oficial: la fecha simulada sustituye a la del servidor | Cola de exportaciones grandes |
| Acreditación, vigencia, folio, reemisión y revocación | | Sesiones grupales e integraciones |
| Constancia en PDF y siete reportes en PDF y Excel generados en el navegador | | |
| Bitácora de acciones | | |
| Cierre por inactividad en equipo compartido | | |
| Tema claro y oscuro según el dispositivo | | |

## Datos de demostración

Todo es ficticio:
- **Organización:** Grupo Demo · Empresa Demo Norte · Planta Demo 1.
- **Personas:** 128 en siete áreas, incluido un contratista con identificador «C-000123».
- **Cursos:** cinco cursos ficticios. Solo «Orden y limpieza del área» (versión 3) tiene contenido navegable: 4 lecciones, 5 tipos de actividad y un banco de 7 preguntas.
- **Historial:** generado por reglas fijas para que las cifras sean coherentes.
- **Criterios:** los de acreditación son de ejemplo (mínimo 80, 3 intentos, vigencia de 12 meses) y **no son criterios de la empresa**.

| Cuenta | Rol | Para qué |
|---|---|---|
| Rosa Elena Ibarra · 004817 | Trabajadora · Ensamble T2 | Experiencia de aprendizaje |
| Laura Peña · 001920 | Supervisora y validadora, también trabajadora | Seguimiento del equipo y validación práctica |
| Ana Ruiz · 000412 | Recursos Humanos | Reglas, excepciones, constancias y reportes |
| Carlos Mora · 000215 | Administrador | Todo lo anterior, más restablecer accesos |
| Inés Lara · 001377 | Instructora | Alcance limitado a su curso |
| Raúl Ortiz · 000533 | Auditor | Solo lectura |
| Pedro Núñez · C-000123 | Contratista | Experiencia de un contratista |

## Verificación realizada

**Verificado automáticamente** (ejecución del 5 nov 2026, Chromium):

| Prueba | Resultado | Qué cubre |
|---|---|---|
| `recorrido.js` | **53 de 53** correctas | Recorrido completo de los 6 pasos con la interfaz real. Además: una sola asignación por persona y curso; versión ligada al iniciar; los puntos no cambian estados; intento reprobado y aprobado; doble envío sin duplicar; «aprobado» no acredita sin práctica; vigencia de 12 meses; folio y huella SHA-256; emisión idempotente; I-05 igual a un recálculo independiente; 14 exportaciones registradas en bitácora; reemisión y revocación sin borrar; permisos de auditor, supervisora, trabajadora e instructora; «por vencer», vigente el último día y vencida al siguiente; renovaciones al avanzar la fecha; cierre por inactividad; cero errores de JavaScript |
| `verificar_archivos.py` | **35 de 35** correctas | Los 7 Excel tienen hojas «Datos» y «Parámetros», identificadores como texto con ceros a la izquierda, fechas como fechas, números como números, porcentajes con formato y número de registros. Los 7 PDF tienen fecha de generación, usuario, alcance, filtros, «Página X de Y» y la marca DEMO. La constancia tiene todos los campos requeridos, folio y leyenda |
| Contraste de la paleta | Todos los pares de texto ≥ 4.5 : 1 en ambos temas | Ver [Etapa 2 · 05 §3](../etapa-2/05-propuesta-visual.md#3-color) |

**No verificado** (corresponde a las Etapas 4 y 5):
- Seguridad, permisos en el servidor, aislamiento entre empresas y concurrencia.
- Carga de 400 sesiones simultáneas.
- Persistencia real.
- Accesibilidad con lector de pantalla y teclado completo.
- Compatibilidad con otros navegadores y con los equipos de la planta.
- Usabilidad con personas reales.
- El diálogo de descarga dentro de la página publicada: la descarga se probó en la versión local.

## Correspondencia con el diseño (Etapa 2)

| Pantalla | Estado en el prototipo |
|---|---|
| T-01, T-03 a T-14, T-16, T-17 | Implementadas |
| T-02 Activación · T-15 Perfil | No incluidas (la preferencia de ranking está en Logros) |
| A-01, A-02, A-03, A-10, A-12, A-13, A-14, A-15, A-16 | Implementadas (A-15 sin cola en segundo plano) |
| A-05, A-07, A-11 | Parciales: restablecer acceso desde la ficha; catálogo de solo lectura; excepciones desde la ficha |
| A-04, A-06, A-08, A-09, A-17 | No incluidas |

## Hallazgos para validar con la empresa

1. **El cumplimiento inicial puede verse bajo.** Con datos ficticios, la planta está al 61 %. Si al arrancar no se importa la capacitación previa (D-26), las cifras reales empezarán aún más bajas.
2. **Revocar una constancia** crea una nueva participación con fecha límite a 30 días. ¿Ese plazo es correcto? (D-51)
3. **Tope diario de puntos:** 200 por persona, para evitar abusos. ¿Es adecuado? (D-52)
4. **El supervisor ve la calificación del intento aprobado, pero no las de intentos reprobados** (D-28). ¿Es la regla deseada?
5. **El trabajador puede descargar su propio reporte individual.** ¿Se permite?
6. **La barra «Salir» y el cierre por inactividad funcionan**, pero en tabletas compartidas reales TI debe configurar el navegador para que no guarde contraseñas ni descargas (RNF-DCO-05 y RNF-DCO-06).

## Criterios de aceptación de la Etapa 3

- [ ] Alguien de la empresa completa la guía de la demo sin ayuda técnica.
- [ ] La empresa confirma que la versión 2 de la propuesta visual corresponde a lo pedido.
- [ ] La empresa revisa una constancia PDF y un reporte Excel y confirma sus campos.
- [ ] La empresa responde o acepta los hallazgos 1 a 5.
- [ ] Recomendado: 3 a 5 personas de planta prueban el prototipo en celular y en una tableta compartida, y se anotan sus dificultades.

## Siguiente acción: Etapa 4

La Etapa 4 construye la aplicación real: servidor, base de datos, autenticación, permisos en el servidor, bitácora, PDF y Excel en segundo plano. Para empezar hacen falta las respuestas que quedaron para esta etapa:

- **B-5 · Infraestructura:** ¿hay política de TI sobre nube o servidores propios, proveedores aprobados y ubicación de los datos? ¿Quién operará la plataforma?
- **B-6 · IA:** ¿se autoriza enviar documentos internos a un servicio de IA? (Solo afecta a la V2.)
- **B-7 · Responsables y piloto:** ¿quién es responsable del producto, del contenido y de la revisión jurídica, y qué cursos y áreas forman el piloto?

Con B-5 resuelta, el primer entregable de la Etapa 4 será la comparación de alternativas de arquitectura con una recomendación, costos por validar y el plan de módulos.
