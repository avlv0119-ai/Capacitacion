# Registro de decisiones

Registro único de decisiones del proyecto, para todas las etapas. Cuando una decisión cambie, se actualiza su estado y se anota la fecha y el motivo; no se borra.

**Estados:**

- **Confirmada:** la pidió o la aprobó la empresa.
- **Propuesta:** valor por defecto del equipo; se aplica salvo que la empresa diga otra cosa.
- **Pendiente:** la empresa debe decidir; no hay valor por defecto seguro.
- **Bloqueante:** pendiente que impide avanzar en la etapa indicada.

| ID | Decisión | Estado | Afecta | Decide | Referencia |
|---|---|---|---|---|---|
| B-1 | Volumen: 1,600 personas distintas al mes; convocatorias de unas 400 inscritas que avanzan a su ritmo; plantilla de 2,000 | Confirmada (5 nov 2026) | Etapas 2, 4 y 5 | Empresa | [07 §2](etapa-1/07-vacios-preguntas-supuestos-riesgos.md#2-preguntas-bloqueantes) |
| B-2 | Contratistas con identificador generado por la plataforma (prefijo «C-») y empresa contratista registrada | Confirmada (5 nov 2026) | Etapa 2 | Empresa | idem |
| B-3 | Costo de mensajería cero: activación con ficha impresa y recuperación solo en persona con el Administrador | Confirmada (5 nov 2026) | Etapa 2 | Empresa | idem |
| B-4 | «Empresas» son razones sociales de un mismo grupo | Confirmada (5 nov 2026) | Etapas 2 y 4 | Empresa | idem |
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
| D-12 | Autenticación: contraseña con activación presencial, llave de acceso opcional, segundo factor (aplicación gratuita de códigos o llave de acceso) para Administrador, RH y Auditor | Propuesta (ajustada a B-3) | Etapas 2 y 4 | TI | [04 §3](etapa-1/04-requisitos-no-funcionales.md#3-autenticación) |
| D-13 | Sesión no persistente por defecto; cierre por inactividad de 5 minutos en equipos compartidos | Propuesta | Etapa 2 | TI | RNF-SES-04, RNF-DCO |
| D-14 | La dirección de acceso identifica al grupo; selector de empresa en el acceso, elegido por el QR de la ficha y recordado en dispositivos personales | Propuesta (ajustada a B-4) | Etapa 2 | Producto | RNF-SEP-03 |
| D-15 | Identificador interno inmutable; número de empleado como texto con historial | Propuesta | Etapa 4 | Producto | RF-PER-04 |
| D-16 | Administrador de plataforma separado del Administrador de empresa | Propuesta | Permisos | Producto | [01 §2.2](etapa-1/01-producto-y-alcance.md#22-roles-del-sistema) |
| D-17 | Aprobador de contenido y validador práctico como permisos por curso | Propuesta | Permisos | Producto | RF-ROL-03 |
| D-18 | Contenido normativo o de seguridad: fuente obligatoria y aprobador distinto del autor | Confirmada (fuente y revisión) · Propuesta (distinto del autor) | Contenido | Empresa | RF-EDI-03, 04 |
| D-19 | IA en V2, solo para borradores con referencia a la fuente | Propuesta (depende de B-6) | Plan de versiones | Producto | M07 |
| D-20 | Notificaciones de V1 solo dentro de la app; en V2, del navegador; nunca SMS ni WhatsApp | Confirmada por B-3 | V1 | Producto | RF-NOT-01 |
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
| D-33 | Tecnología e infraestructura. Propuesta: desarrollo a la medida; TypeScript en web y servidor; PostgreSQL 16 con seguridad por fila; almacenamiento compatible con S3; contenedores portátiles entre nube y servidores propios | Propuesta (Etapa 4, entrega 1); pendiente de TI | Etapa 4 | TI | [Etapa 4 · 01](etapa-4/01-arquitectura.md) |
| D-34 | El prototipo de la Etapa 3 es una aplicación web navegable con datos ficticios en el navegador, sin servidor ni persistencia real, marcada como prototipo | Confirmada (implementada el 5 nov 2026) | Etapa 3 | Producto | [Etapa 3](etapa-3/README.md) |
| D-35 | Objetivo de prueba de carga: 400 sesiones activas simultáneas, 2,000 cuentas y un año de datos simulados | Propuesta | Etapa 5 | TI | [04 §1](etapa-1/04-requisitos-no-funcionales.md#1-capacidad-y-rendimiento) |
| D-36 | El Administrador puede delegar el permiso «Restablecer acceso» a personas designadas por planta y turno | Pendiente | Etapa 3 | Empresa | [Etapa 2 · 02 §3](etapa-2/02-matriz-de-permisos.md#3-permisos-especiales-por-curso-o-tema) |
| D-37 | El grupo es la unidad máxima de separación de datos; alcance «grupo» para roles corporativos; catálogos compartibles entre empresas | Propuesta (deriva de B-4) | Etapas 2 y 4 | Producto | RNF-SEP-01, RF-ORG-05 |
| D-38 | Administrador y RH dan de alta a los contratistas | Propuesta | Etapa 2 | Empresa | [Etapa 2 · 03 FD-10](etapa-2/03-flujos-detallados.md#fd-10--alta-de-contratista) |
| D-39 | El rol Auditor no se combina con Administrador ni con RH en el mismo alcance | Propuesta | Permisos | Producto | SoD-04 |
| D-40 | La aplicación se llama **Nexo**; verificar marca registrada antes de uso externo | Confirmada por la empresa (5 nov 2026) · verificación de marca pendiente | Identidad | Empresa | [Etapa 2 · 05 §1](etapa-2/05-propuesta-visual.md#1-marca) |
| D-41 | Tuteo en el espacio del trabajador; trato impersonal en la consola | Propuesta | Textos | RH | [Etapa 2 · 05 §7](etapa-2/05-propuesta-visual.md#7-tono-y-voz) |
| D-42 | Tema oscuro: el prototipo lo incluye siguiendo la preferencia del dispositivo; se propone mantenerlo en V1 porque cuesta poco con las variables de diseño | Propuesta (revisada en Etapa 3) | Diseño | Producto | [Etapa 2 · 05 §3.3](etapa-2/05-propuesta-visual.md#34-tema-oscuro) |
| D-43 | La evaluación digital no muestra elementos de juego (puntos, animaciones, sonidos) | Propuesta | Diseño | Producto | FD-05 |
| D-44 | Exportaciones de hasta 5,000 filas se descargan en el momento; las mayores pasan a la cola | Propuesta | Etapa 4 | Producto | FD-09 |
| D-45 | Una validación práctica sin confirmación del trabajador en 7 días queda marcada y se avisa al supervisor | Propuesta | Etapa 3 | RH | FD-06 |
| D-46 | Si revocar acreditaciones o anular validaciones requiere una segunda aprobación | Pendiente | Etapa 4 | RH | SoD-05 |
| D-47 | Los números de empleado pueden repetirse entre empresas del grupo | Supuesto (confirmar) | Etapa 4 | RH | RNF-SEP-03 |
| D-48 | Si la plantilla de 2,000 incluye contratistas (se supone que no) | Pendiente | Indicadores y pruebas | RH | I-02 |
| D-49 | Estilo minimalista, plano y juvenil, con la identidad corporativa de Grupo PIGSA88 (versión 3) | Confirmada por la empresa (5 nov 2026); validar en pruebas con usuarios | Diseño | Empresa | [Etapa 2 · 05](etapa-2/05-propuesta-visual.md) |
| D-50 | Tipografías: Bricolage Grotesque (títulos), Plus Jakarta Sans (texto), JetBrains Mono (identificadores) | Propuesta; confirmar legibilidad en pruebas | Diseño | Producto | idem §4 |
| D-51 | Al revocar una acreditación se crea una nueva participación con fecha límite a 30 días | Propuesta | Reglas | RH | [Etapa 3 · hallazgos](etapa-3/README.md#hallazgos-para-validar-con-la-empresa) |
| D-52 | Tope diario de 200 puntos por persona | Propuesta | Motivación | RH | idem |
| D-53 | El trabajador puede descargar su propio reporte individual | Propuesta | Permisos | RH | idem |
| D-54 | Variantes solo para texto: `#616161` (del gris medio) y `#4E6876` (del azul grisáceo), para cumplir el contraste mínimo | Propuesta | Diseño | Empresa (marca) | [Etapa 2 · 05 §3.2](etapa-2/05-propuesta-visual.md#32-ajustes-de-accesibilidad-por-aprobar) |
| D-55 | Azul oficial: `#1F2C7A` (paleta) o `#312783` (logotipo) | Pendiente | Diseño | Empresa (marca) | idem |
| D-56 | Versión en blanco del logotipo para fondos oscuros (tema oscuro, animación de entrada) | Pendiente | Diseño | Empresa (marca) | [Etapa 2 · 05 §3.4](etapa-2/05-propuesta-visual.md#34-tema-oscuro) |
| D-57 | Coral como acento de logros fuera de la paleta corporativa | Pendiente | Diseño | Empresa (marca) | [Etapa 2 · 05 §3.3](etapa-2/05-propuesta-visual.md#33-colores-que-no-están-en-la-paleta-corporativa) |
| D-58 | Animación de entrada de menos de 3 s, que se puede saltar, solo al abrir y desactivada con movimiento reducido | Confirmada (pedida por la empresa) · detalles propuestos | Diseño | Empresa | [Etapa 2 · 05 §2](etapa-2/05-propuesta-visual.md#2-animación-de-entrada) |
| D-59 | Publicar la página del prototipo con la marca corporativa | Pendiente: decide la empresa | Etapa 3 | Empresa | [Etapa 3](etapa-3/README.md) |
| D-60 | La base aísla por grupo y empresa; los alcances finos (planta, área y turno, cursos) y los permisos por acción se aplican en el servicio de aplicación | Propuesta | Etapa 4 | Producto y TI | [Etapa 4 · 02 §4](etapa-4/02-modelo-de-datos.md#4-cómo-funciona-el-aislamiento) |
| D-61 | La aplicación indica solo el usuario en cada transacción; el grupo y las empresas permitidas se calculan en la base a partir de sus roles vigentes | Propuesta (implementada en M1) | Etapa 4 | TI | idem |
| D-62 | El acceso de superusuario a la base se restringe al equipo de operación y se registra fuera de la base | Propuesta | Operación | TI | [Etapa 4 · 02 §5](etapa-4/02-modelo-de-datos.md#5-verificación) |
