# 04 · Requisitos no funcionales, seguridad y capacidad

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

Este documento fija requisitos y objetivos **candidatos**. Ninguno se da por cumplido hasta verificarlo en la Etapa 5. No se elige aquí tecnología ni proveedor: la comparación de alternativas de arquitectura se entrega antes de la Etapa 4, cuando estén resueltas las preguntas B-1, B-4 y B-5.

## 1. Capacidad y rendimiento

### 1.1 Qué significan «400 por sesión» y «1,600 al mes»

Las cifras admitían lecturas muy distintas. **Respuesta a B-1 (5 nov 2026):** las convocatorias corresponden al escenario B (unas 400 personas inscritas que avanzan a su ritmo) y el mes al escenario C′ (unas 1,600 personas distintas). La plantilla total es de 2,000 personas.

| Escenario | Lectura | Carga estimada [S] |
|---|---|---|
| A · Simultáneos | 400 personas inician al mismo tiempo (por ejemplo, una sesión grupal en sala o un arranque coordinado por turno). | Ráfaga de 400 inicios de sesión en pocos minutos; 400 sesiones activas a la vez; del orden de 30 a 80 solicitudes por segundo mientras resuelven actividades (una solicitud cada 5 a 15 segundos por persona); hasta 400 envíos de evaluación en el mismo minuto si la evaluación tiene hora de cierre común. |
| B · Inscritos | 400 personas convocadas que avanzan a su ritmo durante días. | Del orden de 20 a 60 personas activas a la vez en horas pico, si entre el 5 % y el 15 % coincide. |
| C · Participaciones | 1,600 participaciones al mes (una persona puede tener varias). | Unas 75 participaciones por día laborable si el mes tiene 22; carga baja y repartida. |
| C′ · Personas únicas | 1,600 personas distintas al mes. | Similar a C en carga; cambia el tamaño de la población y de los reportes. |

Las cifras de la tabla son órdenes de magnitud para orientar la discusión, no mediciones.

**Objetivo de carga derivado [R].** Aunque las convocatorias no son simultáneas, en planta las pausas suelen coincidir por turno y concentran el uso [S]. Se propone como objetivo de prueba **400 sesiones activas simultáneas** (una convocatoria completa al mismo tiempo), sobre una base con 2,000 cuentas y al menos un año de datos simulados. Cubre con margen el pico estimado del escenario B y es un objetivo modesto para una aplicación web. TI debe confirmar la cobertura inalámbrica donde haya tabletas compartidas.

### 1.2 Objetivos candidatos (por acordar)

| ID | Objetivo candidato [R] | Cómo se verificará |
|---|---|---|
| RNF-REN-01 | Navegación y envío de respuestas: el 95 % de las respuestas del servidor en menos de 1 segundo bajo la carga acordada, sin contar la red del usuario. | Prueba de carga en Etapa 5 |
| RNF-REN-02 | La prueba de carga se ejecuta con 400 sesiones activas simultáneas, 2,000 cuentas y un año de datos simulados. | Prueba de carga |
| RNF-REN-03 | Ningún envío de evaluación se pierde ni se duplica durante una ráfaga de envíos simultáneos. | Prueba de carga y verificación de registros |
| RNF-REN-04 | Exportaciones y constancias no bloquean la navegación: se procesan en segundo plano. | Prueba funcional bajo carga |
| RNF-REN-05 | Imágenes de lección optimizadas, con un peso objetivo por imagen que se fijará en la Etapa 2 según el consumo de datos aceptable en celulares personales. | Revisión de contenido |

### 1.3 Almacenamiento (ilustrativo)

Con supuestos que deben reemplazarse por datos reales [S]: si se registran 1,000 validaciones prácticas al mes con dos fotos comprimidas de alrededor de 1 MB, las evidencias crecerían unos 2 GB al mes. Si se emiten 1,600 constancias al mes de alrededor de 200 KB, crecerían unos 0.3 GB al mes. Ambas cifras son manejables, pero dependen de la política de conservación (sección 12).

[R] Las fotos de evidencia se comprimen en el dispositivo antes de subirse, para ahorrar datos móviles y almacenamiento.

## 2. Disponibilidad, respaldos y recuperación

| ID | Requisito u objetivo candidato | Etiqueta |
|---|---|---|
| RNF-DIS-01 | Disponibilidad mensual objetivo: 99.5 % (equivale a unas 3.6 horas de interrupción al mes). Ajustable según costo. | R · P |
| RNF-DIS-02 | Las plantas pueden operar varios turnos y posiblemente las 24 horas [S]; los despliegues deben hacerse sin interrupción o en ventanas acordadas por planta. | R |
| RNF-DIS-03 | Respaldos automáticos de base de datos y archivos, cifrados, en una ubicación separada de la principal. | R |
| RNF-DIS-04 | Pérdida máxima de datos tolerable (RPO) candidata: 1 hora. Tiempo máximo de recuperación (RTO) candidato: 4 horas. | R · P |
| RNF-DIS-05 | Prueba de restauración documentada al menos antes del lanzamiento y luego con periodicidad acordada. Un respaldo que no se ha restaurado no se considera verificado. | R |

## 3. Autenticación

### 3.1 Alternativas

| Opción | Cómo funciona | A favor | En contra | Costo o dependencia |
|---|---|---|---|---|
| A · Contraseña con activación presencial | Número de empleado + contraseña creada por la persona tras activar con un código de un solo uso entregado en persona. | No requiere correo ni celular registrado; funciona en dispositivos compartidos; sin costo por mensaje. | Hay que recordar una contraseña; la recuperación sin canal registrado requiere acudir a RH o al supervisor. | Proceso de entrega de fichas; carga operativa de RH. |
| B · Código por mensaje en cada acceso | Número de empleado + código enviado por SMS, WhatsApp o correo cada vez. | Sin contraseña que recordar. | Depende de tener el celular a mano (difícil en dispositivos compartidos o en piso); costo por mensaje; requiere datos de contacto y consentimiento. | Proveedor de mensajería y costo por envío. |
| C · Llave de acceso (huella o rostro) | Credencial ligada al celular personal, desbloqueada con huella, rostro o PIN del teléfono. | Muy segura y cómoda en el celular propio; resistente a suplantación. | No sirve en dispositivos compartidos; necesita un método inicial (A o B) para registrarse. | Sin costo directo; depende de la compatibilidad del celular. |
| D · Gafete con QR o NFC + PIN | Se escanea el gafete y se captura un PIN. | Rápido en tabletas compartidas. | Requiere gafetes con código, lectores o cámaras, y reposición de gafetes perdidos. El gafete puede prestarse. | Hardware y emisión de gafetes. |
| E · Inicio de sesión corporativo (SSO) | La persona entra con su cuenta de la empresa. | Una sola cuenta; altas y bajas centralizadas. | Normalmente solo el personal administrativo tiene cuenta corporativa. | Proveedor de identidad existente de la empresa [P]. |

### 3.2 Recomendación [R]

**Base para todas las personas: opción A, complementada con C en celulares personales.**

1. **Activación** con código de un solo uso, de vigencia corta, entregado en persona en una ficha impresa. Sin envío por mensaje (B-3).
2. **Inicio de sesión** con número de empleado + contraseña. Se recomienda una **frase de acceso** (varias palabras), más fácil de recordar que una contraseña compleja. La longitud mínima y las reglas se fijarán con TI siguiendo una guía reconocida, como NIST SP 800-63B: privilegiar longitud sobre complejidad, rechazar contraseñas comunes o filtradas y no forzar cambios periódicos salvo sospecha de compromiso.
3. **Llave de acceso opcional** en el celular propio, para no teclear la contraseña.
4. **Segundo factor obligatorio** para Administrador, RH y Auditor (aplicación de códigos o llave de acceso); configurable y recomendado para Instructor y Supervisor.
5. **Recuperación** solo asistida, en persona con el Administrador (F-05, B-3).
6. **Opciones D y E** quedan como evolución si la empresa ya tiene gafetes con código o un proveedor de identidad.

**Sobre un PIN numérico corto.** Es más fácil para algunas personas, pero un PIN de pocos dígitos no es suficiente como único factor. Si la empresa prefiere PIN, debe combinarse con un segundo elemento: un dispositivo personal registrado o un gafete (opción D).

### 3.3 Protecciones obligatorias

| ID | Requisito [R] |
|---|---|
| RNF-AUT-01 | Las contraseñas se guardan solo como derivación lenta con sal (por ejemplo, Argon2id o bcrypt); nunca en texto legible ni de forma reversible. |
| RNF-AUT-02 | Los números de empleado suelen ser predecibles. Por eso: (a) las respuestas de acceso y recuperación no revelan si un número existe; (b) se aplican demoras progresivas por cuenta y por origen tras intentos fallidos; (c) **no** se bloquea permanentemente una cuenta solo por intentos fallidos, porque alguien podría bloquear a otras personas a propósito; (d) se alerta ante patrones anómalos. |
| RNF-AUT-03 | Códigos de activación y recuperación: un solo uso, caducidad corta, invalidados al generar uno nuevo. |
| RNF-AUT-04 | Volver a pedir la contraseña o el segundo factor antes de acciones sensibles: exportar, aprobar contenido, registrar validaciones, revocar constancias, cambiar roles. |
| RNF-AUT-05 | Cambiar la contraseña o recuperar el acceso cierra las demás sesiones de la persona. |

## 4. Sesiones

| ID | Requisito u objetivo candidato [R] |
|---|---|
| RNF-SES-01 | Sesiones del lado del servidor, revocables en cualquier momento. Cookies marcadas como seguras, inaccesibles para scripts y restringidas al sitio. |
| RNF-SES-02 | Trabajador en dispositivo personal con «mantener sesión»: duración máxima candidata de 30 días, con nueva autenticación para acciones sensibles. |
| RNF-SES-03 | Roles administrativos: cierre por inactividad candidato de 30 minutos y duración máxima de 12 horas. |
| RNF-SES-04 | Dispositivo compartido: cierre por inactividad configurable, propuesta de 5 minutos (rango de 2 a 15), con aviso previo; duración máxima candidata de 2 horas. |
| RNF-SES-05 | Una evaluación en curso no se pierde por cierre de sesión: las respuestas guardadas permanecen y el reloj del intento lo controla el servidor. |

## 5. Dispositivos compartidos

| ID | Requisito [R] |
|---|---|
| RNF-DCO-01 | Un Administrador puede registrar un equipo como «compartido» mediante un enlace de alta de un solo uso. En equipos registrados nunca se ofrece «mantener sesión». |
| RNF-DCO-02 | En equipos no registrados, la sesión es no persistente por defecto; solo se recuerda si la persona indica que el dispositivo es suyo. |
| RNF-DCO-03 | El nombre de la persona con sesión abierta se ve siempre en el encabezado, con «¿No eres tú? Salir». |
| RNF-DCO-04 | Al salir se borran los datos locales de la sesión. Las páginas con datos personales no se guardan en caché: el botón «Atrás» no muestra información después de salir. |
| RNF-DCO-05 | Los campos de contraseña indican al navegador que no los guarde. TI debe reforzarlo con la configuración de los equipos (modo invitado o perfil restringido, sin gestor de contraseñas) [P]. |
| RNF-DCO-06 | Las constancias y reportes se muestran en el navegador. Descargar pide confirmación y advierte que el archivo quedará en el equipo. Se recomienda que TI configure los equipos para limpiar descargas al cerrar [P]. |

## 6. Separación entre empresas y control de acceso

| ID | Requisito |
|---|---|
| RNF-SEP-01 | Toda información pertenece a un grupo y, dentro de él, a una empresa. Ningún dato sale de su grupo. Dentro del grupo, ver datos de varias empresas solo es posible con un rol de alcance «grupo». Ninguna consulta, archivo, exportación ni proceso en segundo plano mezcla empresas fuera de ese alcance. [H] |
| RNF-SEP-02 | El aislamiento se aplica en dos capas: en la lógica de la aplicación y en la base de datos (por ejemplo, políticas de seguridad por fila), para que un error en una capa no exponga datos. [R] |
| RNF-SEP-03 | El número de empleado solo es único dentro de una empresa [S]. La dirección de acceso identifica al grupo. Si el grupo tiene más de una empresa, la pantalla de acceso muestra un selector de empresa, que viene elegido por el QR de la ficha y se recuerda en dispositivos personales. [R] |
| RNF-SEP-04 | Los archivos (evidencias, constancias, exportaciones) se guardan separados por empresa y solo se entregan mediante enlaces temporales emitidos después de verificar el permiso. Nunca hay enlaces públicos permanentes. [R] |
| RNF-SEP-05 | El Administrador de plataforma no ve datos personales por defecto. Un acceso excepcional para soporte requiere justificación, es temporal y queda registrado. [R] |
| RNF-SEP-06 | Pruebas automáticas de aislamiento entre empresas y de alcance por rol forman parte de la Etapa 5 y de cada entrega posterior. [R] |

Con B-4 resuelto (empresas de un mismo grupo), se recomienda una base compartida con identificador de grupo y de empresa en cada registro, y políticas por fila. Las alternativas de esquema o base por empresa solo se justificarían si en el futuro se atendiera a terceros. La decisión técnica final se toma antes de la Etapa 4.

## 7. Protección de datos personales

| ID | Requisito | Etiqueta |
|---|---|---|
| RNF-PRI-01 | Minimización: solo se recaban los datos necesarios para capacitar y demostrar la capacitación. No se piden identificadores oficiales (como CURP) salvo que una decisión futura lo exija. | R |
| RNF-PRI-02 | Aviso de privacidad, finalidades, transferencias y atención de solicitudes de acceso, rectificación, cancelación y oposición conforme a la legislación mexicana vigente de protección de datos personales en posesión de particulares. El texto y el proceso los define y valida el área jurídica. Debe contemplar el uso de datos entre empresas del grupo (reportes consolidados y transferencias). | P |
| RNF-PRI-03 | Cifrado en tránsito y en reposo para base de datos, archivos y respaldos. | R |
| RNF-PRI-04 | Las evidencias fotográficas se limitan a la tarea validada. La empresa define si se permite fotografiar personas e instalaciones. Por defecto, la evidencia mínima es la lista de verificación y la confirmación del validador; la foto es opcional. | P · R |
| RNF-PRI-05 | Los registros técnicos (errores, monitoreo) no contienen contraseñas, códigos ni datos personales innecesarios. | R |
| RNF-PRI-06 | Los PDF exportados indican quién los generó y llevan una leyenda de confidencialidad. | R |
| RNF-PRI-07 | No se envían datos personales a servicios de IA. Solo documentos de contenido, y solo si se autoriza (B-6). | R |
| RNF-PRI-08 | La ubicación geográfica del alojamiento de datos se decide con TI y jurídico (B-5). | P |

## 8. Integridad y prevención de duplicados

| ID | Requisito [R] |
|---|---|
| RNF-INT-01 | Cada operación crítica (envío de evaluación, registro de validación, emisión de constancia, solicitud de exportación) lleva un identificador único de operación; repetirla no produce un segundo registro. |
| RNF-INT-02 | Restricciones únicas en la base de datos como última barrera: un número de intento por participación; una constancia vigente por acreditación; un folio irrepetible por empresa; una asignación activa por persona y curso. |
| RNF-INT-03 | Los procesos en segundo plano pueden ejecutarse más de una vez sin efectos duplicados. |
| RNF-INT-04 | El estado de una participación se puede recalcular a partir de sus eventos registrados (intentos, validaciones, excepciones) y siempre da el mismo resultado. |
| RNF-INT-05 | Dos autores editando el mismo contenido no se sobrescriben en silencio: el segundo recibe un aviso de conflicto. |
| RNF-INT-06 | La hora oficial de todo registro es la del servidor. Se guarda en UTC y se muestra en la zona horaria de la planta. |

## 9. Registro de errores y monitoreo

| ID | Requisito [R] |
|---|---|
| RNF-OBS-01 | Registro centralizado de errores de servidor y de navegador, con identificador de correlación por solicitud. |
| RNF-OBS-02 | Métricas: tiempos de respuesta, tasa de errores, sesiones activas, tareas en cola y tareas fallidas. |
| RNF-OBS-03 | Alertas ante caída del servicio, aumento de errores, tareas fallidas de constancias o exportaciones, y patrones anómalos de acceso. |
| RNF-OBS-04 | La bitácora funcional (quién cambió qué) es independiente del registro técnico y no se mezcla con él. |

## 10. Accesibilidad y usabilidad

| ID | Requisito u objetivo [R] |
|---|---|
| RNF-ACS-01 | Objetivo de diseño: WCAG 2.2 nivel AA, a verificar en la Etapa 5. |
| RNF-ACS-02 | Texto base de al menos 16 px; contraste suficiente; la información no depende solo del color; foco visible; funciona con zoom al 200 %. |
| RNF-ACS-03 | Objetivos táctiles de al menos 44 × 44 px (preferible 48) con separación suficiente. |
| RNF-ACS-04 | Lenguaje llano en la interfaz del trabajador; frases cortas; iconos siempre acompañados de texto. |
| RNF-ACS-05 | Compatible con lectores de pantalla en las pantallas del trabajador y de administración. |
| RNF-ACS-06 | Pruebas de usabilidad con personas reales de cada perfil (al menos cinco por perfil principal) antes del piloto. |

## 11. Compatibilidad

| ID | Requisito |
|---|---|
| RNF-COM-01 | Navegadores y versiones mínimas a definir con el inventario de equipos compartidos y una muestra de celulares del personal. Propuesta inicial: las dos versiones más recientes de los navegadores principales en computadora, Android e iOS. [P] |
| RNF-COM-02 | Diseño adaptable desde 360 px de ancho hasta pantallas de escritorio. [R] |
| RNF-COM-03 | Funciona sin instalar aplicaciones; opcionalmente se puede agregar a la pantalla de inicio. [R] |

## 12. Conservación de datos

Las políticas de conservación **no están definidas** y deben acordarse con la empresa y su área jurídica [P]. El sistema debe permitir configurar plazos por categoría, suspender la eliminación ante una revisión o litigio, y anonimizar a personas al vencer el plazo conservando las estadísticas agregadas [R].

| Categoría | Pregunta a resolver con la empresa |
|---|---|
| Registro de capacitación (participaciones, intentos, acreditaciones) | ¿Cuánto tiempo después de la baja de la persona? |
| Evidencias (fotos, documentos) | ¿El mismo plazo que la acreditación o uno menor? |
| Constancias y su registro de emisión | ¿Se conservan aunque la persona cause baja? |
| Bitácora | ¿Plazo mínimo para fines de auditoría? |
| Registros técnicos y de acceso | ¿Plazo corto (por ejemplo, meses)? |
| Exportaciones generadas | Propuesta: se eliminan tras la caducidad del enlace de descarga; queda el registro en bitácora. [R] |
