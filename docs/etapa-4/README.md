# Etapa 4 · Desarrollo para operación real

**Estado:** en curso · **Entrega 2 de 4** (servicio base, datos de demostración y despliegue en Hostinger) · **Fecha:** 5 de noviembre de 2026

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

> **Esto todavía no es una aplicación lista para producción.** La Etapa 4 se construye por módulos. Cada módulo se entrega con pruebas automáticas y se valida en la Etapa 5 antes del piloto. Lo que se puede publicar hoy es un **ambiente de demostración con datos ficticios**.

## Entregas

| Entrega | Entregable | Contenido | Verificación |
|---|---|---|---|
| 1 | [01 · Arquitectura](01-arquitectura.md) | Construir o adquirir; componentes recomendados; opciones de hospedaje; seguridad por capas; conceptos de costo | Revisión de TI (pendiente) |
| 1 | [02 · Modelo de datos](02-modelo-de-datos.md) y [`app/db/`](../../app/db/README.md) | 30 tablas, aislamiento por grupo y empresa, reglas protegidas en la base | **50 de 50** comprobaciones |
| 2 | [`app/servicio/`](../../app/servicio/README.md) · M2 | Activación con ficha, frase de acceso, sesiones en equipos compartidos y personales, permisos por rol y alcance | **23 de 23** comprobaciones |
| 2 | [Datos de demostración](../../app/db/README.md#datos-de-demostración) | Los datos ficticios del prototipo cargados en la base con todas las reglas activas y 7 cuentas de demostración | **12 de 12** comprobaciones por rol |
| 2 | [03 · Despliegue en Hostinger](03-despliegue-hostinger.md) y [`despliegue/`](../../despliegue/hostinger/GUIA.md) | VPS con Docker Compose, HTTPS automático, scripts de instalación, verificación y respaldo; paquete estático del prototipo | Instalación limpia de punta a punta en Docker local |

## Qué se puede publicar hoy

| Qué | Dónde | Qué ve la gente |
|---|---|---|
| **Ambiente de demostración completo** | VPS de Hostinger ([guía](../../despliegue/hostinger/GUIA.md)) | La página del prototipo con su animación de entrada. Detrás, el servicio y la base con los datos de demostración, que se comprueban con `verificar.sh` |
| **Solo el prototipo** | Hospedaje web de Hostinger ([paquete](../../despliegue/hostinger-web/)) | La página del prototipo, sin base de datos |

**Importante [H]:** la interfaz todavía es el prototipo de la Etapa 3. Usa sus propios datos ficticios en el navegador y **no** guarda nada en la base. Las pantallas se conectan al servicio a partir de M3 a M9.

## Plan de módulos

| Módulo | Contenido | Requisitos principales | Estado |
|---|---|---|---|
| **M1 · Núcleo de datos** | Esquema, aislamiento, bitácora, inmutabilidad, folios | RNF-SEP, RNF-INT, RF-BIT | **Entregado** (propuesta) |
| **M2 · Servicio base** | Activación con ficha, frase de acceso, sesiones y equipos compartidos, permisos por rol y alcance fino | RF-ACC, RF-ROL, RNF-AUT, RNF-SES, RNF-DCO | **Entregado** (propuesta). Falta: llave de acceso (WebAuthn) y segundo factor para Administrador, RH y Auditor (D-12) |
| M3 · Personas y estructura | Alta, carga desde Excel con vista previa, movimientos, contratistas | RF-ORG, RF-PER | Siguiente |
| M4 · Contenido | Editor de cursos, revisión, publicación y versiones | RF-CON, RF-EDI | Por iniciar |
| M5 · Asignaciones y reglas | Reglas dinámicas, excepciones y motor de estados y cumplimiento (reutiliza la lógica probada del prototipo) | RF-ASG, RT-01 a RT-17 | Por iniciar |
| M6 · Experiencia de aprendizaje | Aplicación Nexo para el trabajador con el diseño de la versión 3, conectada al servicio | RF-APR, RF-MOT | Por iniciar |
| M7 · Evaluación y validación | Intentos controlados por el servidor, validación práctica con evidencias | RF-EVA | Por iniciar |
| M8 · Constancias | Plantillas, emisión en segundo plano, folio, huella, reemisión y revocación | RF-CTA | Por iniciar |
| M9 · Indicadores y reportes | Tablero y las 7 exportaciones en segundo plano | RF-IND, RF-EXP | Por iniciar |
| M10 · Operación | Despliegue y respaldos (**adelantados en la entrega 2**), monitoreo externo y alertas | RNF-DIS, RNF-OBS | En curso |

## Verificado y no verificado

**Verificado [H]:**
- Las 50 reglas de la base de datos, con las tres migraciones ([02 §5](02-modelo-de-datos.md#5-verificación)).
- Las 23 pruebas del servicio: permisos por rol y alcance, activación, tiempos de sesión, demora progresiva, protección contra solicitudes de otros sitios, restablecimiento con bitácora.
- Las 12 comprobaciones de la demostración: cada una de las 7 cuentas ve solo su alcance; las frases se guardan como huella Argon2id.
- La instalación limpia en Docker local siguiendo la guía:
  - HTTPS y encabezados.
  - Acceso por rol a través del proxy.
  - Respaldo, prueba de restauración y restauración real.
  - Persistencia al reiniciar.

**No verificado [P]:**
- Que TI acepte la arquitectura y el despliegue.
- La instalación en un VPS real de Hostinger: DNS, firewall y certificado.
- Rendimiento con 2,000 cuentas y 400 sesiones simultáneas.
- Revisión de seguridad independiente del servicio.

## Decisiones pendientes

| ID | Decisión | Bloquea |
|---|---|---|
| D-33 | Aprobación de TI del stack y del despliegue | Uso con datos reales |
| D-64 | Centro de datos del VPS | Carga de datos reales de personas |
| D-66 | Quién opera técnicamente el VPS | Puesta en marcha |
| D-65, D-31 | Respaldos, RPO y RTO | Operación |
| B-7 | Revisión jurídica; cursos y áreas del piloto | Contenido y piloto |
| B-6 | Uso de IA con documentos internos | Solo V2 |
| D-54 a D-59 | Ajustes de marca y publicación del prototipo con marca | Diseño final y publicación |

## Siguiente acción

1. **Departamento de Capacitación:**
   - Contratar el VPS ([guía, sección 2](../../despliegue/hostinger/GUIA.md#2-qué-contratar-en-hostinger)) y elegir el subdominio.
   - Instalar el ambiente de demostración con la guía, o pedirlo al equipo que opere el servidor (D-66).
2. **TI:** revisar [03 · Despliegue en Hostinger](03-despliegue-hostinger.md) y la [arquitectura](01-arquitectura.md); aprobar o indicar cambios (D-33) y elegir el centro de datos (D-64).
3. **Equipo de desarrollo:** M3 · Personas y estructura. Luego M6, para que la aplicación del trabajador use el servicio y la base en lugar de los datos del navegador.
