# 03 · Despliegue en Hostinger

**Fecha:** 5 de noviembre de 2026 · **Estado:** propuesta lista para instalar; pendiente de aprobación de TI (D-33).

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

**Guía de instalación paso a paso:** [`despliegue/hostinger/GUIA.md`](../../despliegue/hostinger/GUIA.md).

## 1. Lo que decidió la empresa

- **[H]** Todo se guarda en Hostinger (respuesta a B-5, 5 nov 2026).
- **[H]** El Departamento de Capacitación es el responsable (B-7, parcial).
- **[H]** TI todavía tiene que aprobar (D-33).
- **[H]** Se pidió dejarlo casi listo para publicar, con los datos de prueba en la base.

## 2. Opciones dentro de Hostinger

| Opción | ¿Sirve para Nexo? | Por qué |
|---|---|---|
| Hospedaje web (compartido) | **Solo para el prototipo** | **[H]** No admite PostgreSQL ([soporte de Hostinger](https://support.hostinger.com/en/articles/1583659-is-postgresql-supported-at-hostinger)). La base de Nexo depende de la seguridad por fila de PostgreSQL. Sirve para publicar la página estática del prototipo |
| Cloud hosting | **No** | **[H]** PostgreSQL solo está disponible en VPS (misma fuente) |
| **VPS (KVM)** | **Sí** | **[H]** Acceso de administrador al servidor para instalar Docker, PostgreSQL y Node.js ([planes VPS](https://www.hostinger.com/vps-hosting)) |

**Recomendación [R]:** un **VPS KVM con Docker Compose**.
- Se instalan los mismos tres contenedores que se probaron: proxy con HTTPS automático, servicio y base.
- No depende de funciones exclusivas de Hostinger. Si TI decide cambiar de proveedor, se mueve igual (D-33).
- **Mientras se aprueba el VPS**, el prototipo se puede publicar en el hospedaje web con el paquete [`despliegue/hostinger-web/`](../../despliegue/hostinger-web/).

## 3. Qué cambia respecto a la arquitectura propuesta

En [01 · Arquitectura](01-arquitectura.md) se recomendaba nube administrada. Con Hostinger se aplica la **opción 2**: servidores virtuales operados por la empresa.

| Tema | Arquitectura propuesta | En Hostinger | Consecuencia |
|---|---|---|---|
| Base de datos | Administrada por el proveedor | PostgreSQL 16 en un contenedor del VPS | Respaldos, actualizaciones y monitoreo los hace la empresa (sección 5) |
| Disponibilidad | Dos instancias de aplicación | Un solo VPS | Una actualización o una falla del VPS corta el servicio unos minutos. **[R]** Aceptable para el piloto; revisar con D-31 |
| Archivos (evidencias, PDF, Excel) | Almacenamiento compatible con S3 | **[H]** No se encontró almacenamiento de objetos en Hostinger. Se usará el disco del VPS con respaldo | Se resuelve en M7 y M8; el código lo separa para poder cambiarlo después |
| Respaldos | Continuos, del proveedor | **[H]** Semanales incluidos; diarios como complemento de pago ([respaldos de VPS](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps)). Más el script diario propio con prueba de restauración | D-65 |
| Monitoreo | OpenTelemetry y alertas | Chequeos de salud de los contenedores y `verificar.sh` | **[R]** Agregar un monitor externo de disponibilidad en M10 |

## 4. Qué quedó listo

| Pieza | Ruta | Verificado |
|---|---|---|
| Contenedores y proxy HTTPS | `despliegue/hostinger/docker-compose.yml`, `Caddyfile` | Arranque, chequeos de salud, HTTPS, redirección, encabezados y política de seguridad de contenido |
| Aplicación | `app/web` (interfaz), `app/servicio` (servicio), `app/db` (base) | Recorrido completo en el navegador (18 de 18) y todas las pantallas de las 7 cuentas |
| Imagen del servicio | `app/servicio/Dockerfile` | Usuario sin privilegios y chequeo de salud |
| Secretos | `scripts/secretos.sh` → `.env` con permisos 600 | Generación aleatoria; no se sube al repositorio |
| Base | `scripts/migrar.sh` | Migraciones aplicadas una sola vez; usuario limitado del servicio |
| Datos de demostración | `scripts/cargar_demo.sh`, `scripts/frases_demo.sh` | Carga con todas las reglas activas; se niega a cargar sobre datos existentes |
| Verificación | `scripts/verificar.sh [número]` | Página, servicio, base, buscadores, HTTPS y acceso por rol |
| Respaldos | `scripts/respaldo.sh`, `verificar_respaldo.sh`, `restaurar.sh` | Respaldo con huella, prueba de restauración aislada y restauración real |
| Prototipo para hospedaje web | `despliegue/hostinger-web/` | `.htaccess` probado en Apache 2.4 |

**Prueba de punta a punta [H]:** instalación limpia en Docker local siguiendo la guía. Una persona de RH asigna, la trabajadora aprende y aprueba, la supervisora valida y se emite la constancia; todo a través del navegador. Además:
- Las 7 cuentas de demostración entran a través del proxy y cada rol ve solo su alcance.
- Una frase incorrecta da 401; una escritura sin el encabezado de protección da 403.
- Los datos se conservan al reiniciar.

**No probado [P]:**
- Un VPS real de Hostinger: firewall, DNS y certificado de Let's Encrypt.
- El servidor web de Hostinger con el paquete estático.
- La carga de 400 sesiones simultáneas.

## 5. Costos y dependencias

**Conceptos a cotizar [P]** (sin montos, dependen del plan y del plazo de contratación):
- Plan VPS.
- Complemento de respaldo diario.
- Dominio, si no se usa un subdominio existente.
- Un segundo lugar para la copia de respaldos.
- Horas de operación.
- Revisión de seguridad independiente.

**Dependencias:**
- **Operación del servidor.** Alguien con conocimientos de Linux y Docker debe aplicar actualizaciones, revisar respaldos y atender fallas. El Departamento de Capacitación es responsable del producto; falta definir quién opera técnicamente (D-66).
- **Ubicación de los datos.** Elegir el centro de datos antes de cargar datos reales de personas (D-64).
- **Aprobación de TI.** El stack y el proveedor (D-33).

## 6. Decisiones nuevas

| ID | Decisión | Estado |
|---|---|---|
| D-63 | VPS KVM de Hostinger con Docker Compose; el hospedaje web solo para el prototipo estático | Propuesta (deriva de B-5) |
| D-64 | Centro de datos del VPS | Pendiente: TI y jurídico |
| D-65 | Respaldos: diario de Hostinger y respaldo propio diario con huella, 14 días de retención, copia en otro lugar y prueba de restauración mensual | Propuesta |
| D-66 | Quién opera el VPS (acceso SSH y Docker) | Pendiente: Capacitación con TI |
| D-67 | El ambiente publicado es de demostración: datos ficticios, sin indexación y, en el hospedaje web, protegido con contraseña | Propuesta |
