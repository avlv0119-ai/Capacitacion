# 07 · Vacíos, preguntas, supuestos y riesgos

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

## 1. Vacíos y contradicciones detectados

| ID | Hallazgo | Impacto | Cómo se resuelve |
|---|---|---|---|
| V-01 | «400 por sesión» y «1,600 al mes» pueden ser personas simultáneas, inscritas, únicas o participaciones. | Los requisitos de carga varían en un orden de magnitud. | Resuelto: personas distintas, convocatorias de inscritos, HC 2,000 (antes: Pregunta **B-1**) |
| V-02 | Se habla de «sesión de capacitación», pero el alcance solo describe autoestudio digital. No se menciona si hay sesiones grupales o presenciales con registro de asistencia. | Puede faltar un módulo completo (sesiones y asistencia). | Resuelto: no hay sesiones simultáneas; autoestudio por convocatoria (antes: Pregunta **B-1**) |
| V-03 | El acceso es por número de empleado, pero los contratistas normalmente no tienen número de empleado de la empresa. | Sin solución, los contratistas no pueden entrar ni ser reportados. | Resuelto: identificador «C-» generado por la plataforma (antes: Pregunta **B-2**) |
| V-04 | El número de empleado solo es único dentro de una empresa, pero el modelo debe soportar varias empresas. | Dos personas de empresas distintas podrían tener el mismo número. | Resuelto: selector de empresa en el acceso, elegido de antemano por el QR de la ficha (RNF-SEP-03) |
| V-05 | «Separar empresas» puede significar empresas de un mismo grupo (con reportes consolidados y transferencias de personal) o clientes independientes (aislamiento total). | Cambia el modelo organizacional y la estrategia de aislamiento. | Resuelto: empresas de un mismo grupo (antes: Pregunta **B-4**) |
| V-06 | Se pide recuperación de acceso, pero no se sabe si hay correo o celular registrado de las personas. | Sin canal, toda recuperación depende de RH; en turnos nocturnos puede no haber quién atienda. | Resuelto: solo recuperación en persona con el Administrador (antes: Pregunta **B-3**) |
| V-07 | Acceso desde celulares personales, sin definir si la capacitación fuera de la jornada está permitida, cómo se registra ese tiempo ni quién paga los datos móviles. | Implicaciones laborales que la plataforma no puede resolver. | Decisión **D-25** con RH y jurídico; la plataforma registra la hora de cada actividad |
| V-08 | Constancias descargables y equipos compartidos: el PDF puede quedar en la carpeta de descargas del equipo. | Exposición de datos personales. | RNF-DCO-06 y configuración de los equipos por TI |
| V-09 | Ranking, modo privado y supervisión: no estaba definido quién ve qué. | Riesgo de percepción de vigilancia o de exhibición. | Reglas RF-RNK-01 a 08 |
| V-10 | «Completado», «aprobado» y «vencido» se usan con significados que se traslapan. | Reportes ambiguos. | Modelo de estados en capas ([05](05-estados-y-acreditacion.md)) |
| V-11 | No se mencionan registros de capacitación anteriores a la plataforma (papel o Excel). | El cumplimiento inicial aparecería en cero aunque la gente ya esté capacitada. | Registro externo (RF-PER-05, RT-14) y decisión **D-26** |
| V-12 | No hay materiales ni personas responsables del contenido. | Sin contenido, la plataforma no puede operar aunque esté terminada. Es la ruta crítica del proyecto. | Pregunta **B-7** |
| V-13 | La IA requiere documentos fuente, que aún no existen, y enviarlos a un servicio externo implica confidencialidad. | El módulo de IA no aporta valor en V1. | IA en V2 y pregunta **B-6** |
| V-14 | Constancias «automáticas» con «firma»: una firma impresa automáticamente implica que la persona firmante autorizó de antemano su uso. | Riesgo de atribuir a alguien una firma sin su consentimiento. | Decisión **D-23**; opciones en la Etapa 2 |
| V-15 | La evidencia fotográfica de prácticas puede captar personas o zonas confidenciales de la planta. | Privacidad y confidencialidad industrial. | RNF-PRI-04 y decisión **D-21** |
| V-16 | Se pide «tiempo registrado de capacitación», pero una web app solo puede estimar el tiempo activo. | Podría usarse como si fuera tiempo comprobado. | Definición I-18 y advertencia de uso |
| V-17 | Las evidencias (fotos y documentos) deben exportarse en Excel, pero un Excel no es adecuado para contener archivos. | Exportación poco útil o pesada. | Excel con metadatos y enlaces con permiso; PDF con miniaturas opcionales; paquete comprimido para auditoría (decisión **D-29**) |
| V-18 | No se define qué ve un supervisor de su equipo: estado, calificaciones o detalle de intentos. | Define la matriz de permisos. | Decisión **D-28**, se cierra en la Etapa 2 |

## 2. Preguntas bloqueantes

### 2.0 Respuestas recibidas (5 de noviembre de 2026)

| Pregunta | Respuesta de la empresa | Cambios aplicados |
|---|---|---|
| B-1 | Las 1,600 al mes son **personas distintas**. Las 400 son **inscritas en una convocatoria**. La plantilla total (HC) es de **2,000**. | Sin modo de sesión grupal en V1. Objetivo de prueba: 400 sesiones simultáneas sobre 2,000 cuentas ([04 §1](04-requisitos-no-funcionales.md#1-capacidad-y-rendimiento)). |
| B-2 | Opción **b**: la plataforma genera un identificador con prefijo y registra la empresa contratista. | RF-PER-01, F-02. |
| B-3 | **Sin costo**: quien necesite algo acude con el Administrador. | Activación con ficha impresa y recuperación solo en persona con el Administrador (RF-ACC-02, RF-ACC-06, F-03, F-05). Sin SMS, WhatsApp ni correo. |
| B-4 | Opción **a**: razones sociales de un **mismo grupo**. | Nivel «grupo» en el modelo, alcance de grupo para roles corporativos, catálogos compartibles, selector de empresa en el acceso, transferencias entre empresas en V2. |

Las preguntas se conservan abajo para mantener la trazabilidad.

### 2.1 Necesarias para la Etapa 2 (diseño funcional y visual) · resueltas

**B-1 · Volumen y modalidad** · *resuelta*

¿Qué representan «400 por sesión» y «1,600 al mes»? ¿Hay sesiones grupales en las que muchas personas usan la plataforma al mismo tiempo (sala, auditorio, arranque de turno)? ¿Cuántas personas activas hay en total, entre empleados y contratistas?

| Opción | Consecuencia |
|---|---|
| a) 400 personas **simultáneas** en sesiones grupales | Se diseña un modo «sesión grupal» con código de sala y registro de asistencia; prueba de carga al doble del escenario A; TI revisa la red del lugar. |
| b) 400 **inscritas** por convocatoria, que avanzan a su ritmo | Sin modo grupal en V1; carga moderada. |
| c) Ambas: sesiones grupales y autoestudio | Se combina lo anterior; el modo grupal puede entrar en V1 o V2. |

Y para «1,600 al mes»: ¿son **personas distintas** o **participaciones** (una persona puede tomar varios cursos)?

**Recomendación:** si aún no se sabe, diseñar para (c) y probar la carga del escenario A. Es la opción conservadora; el modo grupal puede posponerse sin rehacer el diseño.

---

**B-2 · Identificación de contratistas** · *resuelta*

¿Los contratistas tienen número de empleado de la empresa? ¿Quién los da de alta (RH, Seguridad o el área que los contrata)?

| Opción | Consecuencia |
|---|---|
| a) La empresa les asigna un número interno con el mismo formato | Lo más simple; mismo flujo que los empleados. |
| b) La plataforma genera un identificador con prefijo (por ejemplo, C-000123) y registra su empresa contratista | Evita choques con números de empleado; requiere entregar el identificador a cada contratista. |
| c) Usan el número de su propio empleador junto con un código de empresa contratista | Inicio de sesión más complejo y riesgo de números repetidos. |

**Recomendación:** (a) si ya existe esa práctica; si no, (b). En ambos casos con acceso que expira.

---

**B-3 · Canales de activación y recuperación** · *resuelta*

¿La empresa tiene, y puede usar, el celular o el correo de las personas para enviar códigos? ¿Acepta un costo por mensaje? ¿Los supervisores pueden generar códigos de recuperación para su equipo o solo RH?

| Opción | Consecuencia |
|---|---|
| a) Solo entrega presencial de fichas y recuperación asistida | Sin costo de mensajería; más carga para RH; en turnos sin RH, la persona espera. |
| b) Entrega presencial **más** recuperación por autoservicio para quien registre voluntariamente su correo o celular | Equilibrio entre seguridad, costo y autonomía. |
| c) SMS o WhatsApp como canal principal para todos | Requiere datos de contacto, consentimiento y presupuesto por mensaje. |

**Recomendación:** (b), con supervisores autorizados para generar códigos de recuperación de su equipo, para cubrir los turnos sin personal de RH.

---

**B-4 · Significado de «empresas»** · *resuelta*

| Opción | Consecuencia |
|---|---|
| a) Empresas o razones sociales de un **mismo grupo** | Reportes consolidados del grupo, transferencias de personal entre empresas que conservan historial, cursos compartidos. |
| b) **Clientes independientes** (la plataforma se ofrecería a terceros) | Aislamiento estricto, sin reportes cruzados, configuración y marca por cliente. |
| c) Aún no se sabe | — |

**Recomendación:** si es (c), diseñar con el aislamiento de (b) y una capa opcional de «grupo» para reportes consolidados. Es más fácil relajar el aislamiento después que agregarlo.

### 2.2 Necesarias antes de la Etapa 4 (conviene iniciarlas ya por su tiempo de respuesta)

**B-5 · Restricciones de TI e infraestructura.** ¿Hay una política sobre nube o servidores propios, proveedores aprobados o prohibidos, ubicación de los datos? ¿Existe un proveedor de identidad corporativo? ¿Quién operará la plataforma: TI interno o un tercero?

- Opciones: (a) nube administrada; (b) servidores propios; (c) sin política: el equipo propone y TI valida.
- Recomendación preliminar: (a), porque delega respaldos, escalado y monitoreo. Su costo mensual y sus condiciones están por validar. La comparación formal se entregará antes de la Etapa 4.

**B-6 · Uso de IA con documentos internos.** ¿Se autoriza enviar documentos internos (manuales, procedimientos) a un servicio de IA externo?

- Opciones: (a) sí, con un proveedor que garantice por contrato confidencialidad y que no use los datos para entrenar modelos, previa revisión jurídica; (b) solo con un modelo ejecutado en infraestructura propia, con más costo y posiblemente menor calidad; (c) no por ahora.
- Recomendación: (a) solo con documentos sin datos personales; o (c) mientras no existan documentos.

**B-7 · Responsables y piloto.** ¿Quién es el responsable del producto en la empresa? ¿Quiénes crearán y aprobarán el contenido de cada tema? ¿Quién de jurídico validará el aviso de privacidad y la leyenda de las constancias? ¿Qué uno a tres cursos y qué planta o áreas formarán el piloto?

- Sin estas personas no se puede crear contenido real ni ejecutar el piloto, aunque la plataforma esté lista.

## 3. Decisiones con valor por defecto (no bloqueantes)

Se avanzará con los valores propuestos en el [registro de decisiones](../registro-de-decisiones.md) salvo que la empresa indique otra cosa. Todas son reversibles en diseño.

## 4. Supuestos de trabajo

| ID | Supuesto [S] | Si resulta falso |
|---|---|---|
| S-01 | Hay internet en las zonas donde se capacita, pero la calidad en piso puede ser intermitente. | Si no hay conexión en piso, la validación práctica necesitará un modo sin conexión (V2). |
| S-02 | El español es el único idioma necesario. | Se activan textos parametrizables para otro idioma. |
| S-03 | La empresa puede exportar a Excel un listado de personal con número de empleado, planta, área, turno, puesto y fecha de ingreso. | Habrá que capturar la estructura manualmente o integrar otro sistema. |
| S-04 | Algunas plantas operan varios turnos, posiblemente las 24 horas. | Las ventanas de mantenimiento pueden ser más amplias. |
| S-05 | Los equipos compartidos tienen un navegador actualizado y TI puede configurarlos. | Habrá restricciones de compatibilidad y de limpieza de sesión. |
| S-06 | El número de empleado puede cambiar o reutilizarse con el tiempo. | Si nunca cambia, el diseño sigue siendo válido. |
| S-07 | Una persona puede tener varios roles a la vez. | Si no, el diseño sigue siendo válido. |
| S-08 | No existe una plataforma de capacitación anterior de la que haya que migrar datos (solo registros en papel o Excel). | Habría que planear una migración. |
| S-09 | Los supervisores tienen asignado un equipo identificable por área y turno. | El alcance del supervisor se definiría persona por persona. |

## 5. Riesgos

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-01 | No hay contenido listo cuando la plataforma lo esté. | Alta | Alto | Designar responsables (B-7) ya; plantillas de curso; piloto con 1 a 3 cursos. |
| R-02 | Baja adopción por la brecha digital. | Media | Alto | Activación asistida, pruebas de usabilidad con operadores reales, lecciones cortas, lenguaje llano. |
| R-03 | Exposición de datos en equipos compartidos. | Media | Alto | Modo compartido, cierre por inactividad, configuración de equipos por TI. |
| R-04 | Conectividad deficiente en piso. | Media | Medio | Guardado por actividad, reintentos, recursos ligeros. |
| R-05 | Contenido incorrecto en temas de seguridad o normativos, sea de autoría humana o de IA. | Media | Alto | Fuente obligatoria, aprobador designado distinto del autor, borrador obligatorio para la IA. |
| R-06 | El ranking se percibe como vigilancia o exhibición. | Media | Medio | Voluntario, privado por defecto, sin calificaciones, sin últimos lugares, grupo mínimo. |
| R-07 | Criterios de acreditación mal configurados. | Media | Alto | Validaciones que impiden publicar configuraciones incompletas; vista previa de reglas; revisión. |
| R-08 | Las constancias se usan como si fueran documentos oficiales. | Media | Alto | Leyenda validada por jurídico; no se presentan como DC-3. |
| R-09 | Adivinación de números de empleado y bloqueo malicioso de cuentas. | Media | Medio | RNF-AUT-02. |
| R-10 | Alcance excesivo para la primera versión. | Alta | Medio | Plan de versiones con criterio de paso a V2. |
| R-11 | Datos de personal incompletos o desactualizados. | Alta | Medio | Validación en la carga; RH como responsable del dato. |
| R-12 | Implicaciones laborales de capacitarse con el celular personal fuera de la jornada. | Media | Medio | Decisión D-25 con RH y jurídico antes del piloto. |
| R-13 | Se interpreta el prototipo de la Etapa 3 como producto terminado. | Media | Alto | Marca visible de prototipo; lista explícita de funciones simuladas. |
| R-14 | Toda recuperación de acceso depende del Administrador: en turnos sin Administrador, una persona puede quedarse sin entrar hasta el siguiente turno, o acumularse filas al inicio de una convocatoria. | Media | Medio | Administradores designados por planta y turno, o delegación del permiso «Restablecer acceso» (D-36); llave de acceso en celulares personales para reducir olvidos; jornada de activación asistida al abrir cada convocatoria. |
