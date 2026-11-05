# Registro de decisiones

Registro único de decisiones del proyecto, para todas las etapas. Cuando una decisión cambie, se actualiza su estado y se anota la fecha y el motivo; no se borra.

**Estados:**

- **Confirmada:** la pidió o la aprobó la empresa.
- **Propuesta:** valor por defecto del equipo; se aplica salvo que la empresa diga otra cosa.
- **Pendiente:** la empresa debe decidir; no hay valor por defecto seguro.
- **Bloqueante:** pendiente que impide avanzar en la etapa indicada.

| ID | Decisión | Estado | Afecta | Decide | Referencia |
|---|---|---|---|---|---|
| B-1 | Significado de «400 por sesión» y «1,600 al mes»; existencia de sesiones grupales; población total | Bloqueante | Etapas 2, 4 y 5 | Empresa | [07 §2](etapa-1/07-vacios-preguntas-supuestos-riesgos.md#2-preguntas-bloqueantes) |
| B-2 | Identificación y alta de contratistas | Bloqueante | Etapa 2 | Empresa (RH, Seguridad) | idem |
| B-3 | Canales de activación y recuperación; costo de mensajería; supervisores que generan códigos | Bloqueante | Etapa 2 | Empresa (RH, TI) | idem |
| B-4 | Significado de «empresas»: grupo o clientes independientes | Bloqueante | Etapas 2 y 4 | Empresa (dirección) | idem |
| B-5 | Restricciones de TI e infraestructura | Bloqueante | Etapa 4 | TI | idem |
| B-6 | Envío de documentos internos a un servicio de IA | Bloqueante | Módulo de IA (V2) | TI y jurídico | idem |
| B-7 | Responsables de producto, contenido y jurídico; cursos y alcance del piloto | Bloqueante | Contenido y piloto | Dirección | idem |
| D-01 | Registro de capacitación y motivación separados; los puntos nunca alteran estados ni resultados | Confirmada | Todas | — | RF-MOT-02, RT-04 |
| D-02 | Ranking voluntario; progreso privado por defecto | Propuesta | Etapa 2 | RH | RF-RNK-01 |
| D-03 | El ranking compara solo puntos del periodo, por equipo y planta, con un mínimo de 5 participantes y sin mostrar los últimos lugares | Propuesta | Etapa 2 | RH | RF-RNK-02 a 06 |
| D-04 | Sin «vidas» ni bloqueos por error; sin rachas diarias por defecto | Propuesta | Etapa 2 | Producto | RF-MOT-07 |
| D-05 | La participación se liga a la versión vigente al iniciar | Propuesta | Etapas 2 y 4 | Producto | RT-01 |
| D-06 | Sin más intentos después de aprobar; se reporta la calificación del intento aprobatorio | Propuesta | Etapa 2 | RH, instructores | RT-06 |
| D-07 | La nueva vigencia corre desde la nueva acreditación (configurable) | Propuesta | Etapa 2 | RH | RT-11 |
| D-08 | Exenciones y asignaciones opcionales fuera del denominador de cumplimiento; se reportan aparte | Propuesta | Indicadores | RH | RI-04 |
| D-09 | Atribución organizacional: foto según la adscripción al corte; flujo según la adscripción a la fecha del evento | Propuesta | Indicadores | RH | RI-02 |
| D-10 | Quien tiene hoy a la persona en su alcance ve su historial completo de capacitación | Propuesta | Permisos | RH | RI-03 |
| D-11 | Tiempo activo con umbral de inactividad de 5 minutos; no se usa para nómina | Propuesta | Indicadores | RH | I-18 |
| D-12 | Autenticación: contraseña con activación presencial, llave de acceso opcional, segundo factor para Administrador, RH y Auditor | Propuesta (depende de B-3) | Etapas 2 y 4 | TI | [04 §3](etapa-1/04-requisitos-no-funcionales.md#3-autenticación) |
| D-13 | Sesión no persistente por defecto; cierre por inactividad de 5 minutos en equipos compartidos | Propuesta | Etapa 2 | TI | RNF-SES-04, RNF-DCO |
| D-14 | La empresa se determina por la dirección de acceso, no por un campo adicional | Propuesta | Etapa 2 | Producto | RNF-SEP-03 |
| D-15 | Identificador interno inmutable; número de empleado como texto con historial | Propuesta | Etapa 4 | Producto | RF-PER-04 |
| D-16 | Administrador de plataforma separado del Administrador de empresa | Propuesta | Permisos | Producto | [01 §2.2](etapa-1/01-producto-y-alcance.md#22-roles-del-sistema) |
| D-17 | Aprobador de contenido y validador práctico como permisos por curso | Propuesta | Permisos | Producto | RF-ROL-03 |
| D-18 | Contenido normativo o de seguridad: fuente obligatoria y aprobador distinto del autor | Confirmada (fuente y revisión) · Propuesta (distinto del autor) | Contenido | Empresa | RF-EDI-03, 04 |
| D-19 | IA en V2, solo para borradores con referencia a la fuente | Propuesta (depende de B-6) | Plan de versiones | Producto | M07 |
| D-20 | Notificaciones de V1 solo dentro de la app | Propuesta | V1 | Producto | RF-NOT-01 |
| D-21 | Evidencia mínima de la validación práctica: lista de verificación y confirmación; foto opcional según la política de la planta | Pendiente | Etapa 2 | Seguridad, jurídico | RNF-PRI-04 |
| D-22 | Verificación de constancias por QR y qué datos muestra | Pendiente (opciones en Etapa 2) | Constancias | RH, jurídico | RF-CTA-07 |
| D-23 | Firma en constancias: ninguna, imagen de firma autorizada o firma electrónica | Pendiente (opciones en Etapa 2) | Constancias | RH, jurídico | RF-CTA-08 |
| D-24 | Texto de la leyenda de documento interno en constancias | Pendiente | Constancias | Jurídico | RF-CTA-06 |
| D-25 | Capacitación fuera de la jornada y uso del celular personal | Pendiente | Piloto | RH, jurídico | V-07 |
| D-26 | Carga de capacitación previa como registro externo y si cuenta para el cumplimiento | Pendiente | V1 | RH | RF-PER-05, RT-14 |
| D-27 | Cursos solo de contenido, sin evaluación ni práctica | Pendiente | Etapa 2 | RH, instructores | [05 §2.1](etapa-1/05-estados-y-acreditacion.md#21-participación) |
| D-28 | El supervisor ve el estado y la calificación de acreditación de su equipo; el detalle de intentos solo lo ven Instructor, RH y Auditor | Propuesta | Permisos | RH | V-18 |
| D-29 | Exportar evidencias: Excel con metadatos y enlaces con permiso, PDF con miniaturas opcionales y paquete comprimido para auditoría | Propuesta | Exportaciones | Producto | V-17 |
| D-30 | Plazos de conservación de datos por categoría | Pendiente | Etapa 4 | Jurídico | [04 §12](etapa-1/04-requisitos-no-funcionales.md#12-conservación-de-datos) |
| D-31 | Objetivos de disponibilidad, RPO y RTO | Pendiente (candidatos propuestos) | Etapa 4 | TI | RNF-DIS |
| D-32 | Navegadores y dispositivos mínimos | Pendiente (requiere inventario) | Etapas 2 y 5 | TI | RNF-COM-01 |
| D-33 | Tecnología e infraestructura | Pendiente (comparación antes de la Etapa 4) | Etapa 4 | TI | B-5 |
| D-34 | El prototipo de la Etapa 3 será una aplicación web navegable con datos ficticios en el navegador, sin servidor ni persistencia real, y marcada como prototipo | Propuesta | Etapa 3 | Producto | — |
