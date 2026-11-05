# Nexo · Interfaz web

La aplicación que usan las personas: trabajadores, supervisores, instructores, RH, auditoría y administración. Está **conectada al servicio** (`app/servicio`) y a la base (`app/db`): cada avance, evaluación, validación, constancia y exportación se guarda en el servidor y queda en la bitácora.

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura, estilos (identidad Grupo PIGSA88, tema claro y oscuro), íconos y animación de entrada |
| `nexo.js` | Lógica de la interfaz: acceso, aprendizaje, evaluación, consola de administración, reportes PDF y Excel |
| `favicon.svg` | Ícono de Nexo |
| `pruebas/recorrido.js` | Recorrido de punta a punta en el navegador: asignar → aprender → evaluar → validar → constancia → exportar |
| `pruebas/vistas.js` | Abre todas las pantallas de las 7 cuentas de demostración, en escritorio y en celular |

## Cómo funciona

- **Datos.** Al entrar, la interfaz pide `GET /api/estado`. Recibe solo lo que la persona puede ver, ya filtrado por la base y por su rol y alcance. Con eso dibuja las pantallas y calcula los indicadores.
- **Acciones.** Cada acción llama al servicio, que valida permisos y reglas y devuelve el estado actualizado: completar lecciones, presentar evaluaciones, crear reglas, aprobar excepciones, validar prácticas, reemitir o revocar constancias y registrar exportaciones.
- **Lo que no llega al navegador.** Las respuestas correctas de las evaluaciones. El servidor elige las preguntas y califica.
- **Acreditación.** La decide la base, solo si se cumplen los criterios de la versión del curso. La constancia se emite en ese momento, con folio consecutivo y huella SHA-256.
- **Sesiones.** Cookie segura que la página no puede leer.
  - En equipos compartidos, la sesión se cierra tras 5 minutos sin uso, con aviso 30 segundos antes.
  - En un dispositivo personal se recuerda 30 días.
- **Archivos.** Los PDF y los Excel se generan en el navegador con los datos del alcance de la persona. Cada exportación queda registrada en el servidor.

## Experiencia

**Acceso**
- La primera vez, la persona activa su cuenta con el código de la ficha impresa. Un medidor le ayuda a crear una frase de acceso segura.
- Se puede marcar «Es mi dispositivo personal».
- Si olvida su frase, la recupera en persona con el administrador.

**Bienvenida**
- Tres pasos la primera vez que la persona entra a cada espacio: Aprender y Administrar.

**Aprender**
- Inicio muestra un resumen con anillo de avance, el siguiente paso y los pendientes ordenados por urgencia.
- Cada curso tiene un camino de lecciones en zigzag; la lección actual está resaltada.
- En las lecciones:
  - +10 animado al acertar, rachas, vibración en celulares y sacudida al fallar.
  - Explicación inmediata y repaso de lo que falló.
  - Atajos de teclado: 1 a 4 para elegir, Enter para comprobar y continuar.
- La evaluación guarda cada respuesta al momento y la marca como «Guardada».
- Al acreditar, Inicio avisa de la nueva constancia y se puede descargar en PDF.
- Logros muestra puntos, insignias y el ranking voluntario del equipo.

**Administrar**
- Tablero con anillo de cumplimiento. Los indicadores se tocan para ver a las personas detrás de cada número.
- Buscador rápido con Ctrl + K.
- Reglas de asignación con vista previa.
- Validación práctica confirmada con la frase de acceso.
- Fichas de activación imprimibles.
- La bitácora distingue los eventos de negocio de los cambios registro por registro.
- Los datos se actualizan solos cada minuto y al volver a la pestaña.

**Accesibilidad**
- Respeta «reducir movimiento».
- Se puede usar con teclado.
- Tiene tema oscuro.
- La escena de la actividad de identificar situaciones tiene una alternativa en lista.

## Probar

Con el ambiente levantado ([guía](../../despliegue/hostinger/GUIA.md)) y las frases de las cuentas de demostración en un archivo JSON (el que imprime `NEXO_DEMO_JSON=1` al activar las cuentas):

```bash
node app/web/pruebas/recorrido.js https://localhost cuentas.json
```

```bash
node app/web/pruebas/vistas.js https://localhost cuentas.json
```

Ambos requieren Playwright con Chromium. `recorrido.js` lee las respuestas de la evaluación de la base con `docker compose exec`, porque la interfaz nunca las recibe.

## Contenido

Los cursos de la demostración son **contenido de ejemplo**, marcado como DEMO. No son procedimientos, criterios de seguridad ni normas de la empresa. El contenido real lo redacta y aprueba el área responsable de cada curso.
