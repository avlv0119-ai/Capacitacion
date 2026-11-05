# 05 · Propuesta visual

Etiquetas: **[H]** hecho confirmado · **[R]** recomendación · **[S]** supuesto · **[P]** pendiente.

Identidad propia para personas adultas en un entorno industrial. No usa la identidad visual, los personajes ni los recursos de Duolingo [H]. Las maquetas son estáticas y su contenido es ficticio; la fuente editable está en [`maquetas/maquetas.html`](maquetas/maquetas.html).

## 1. Concepto: «Oficio»

**Idea central.** Aprender el trabajo paso a paso, con el mismo orden y la misma claridad de una buena estación de trabajo. La progresión no se dibuja como un juego infantil, sino como algo que el personal ya reconoce: **una línea de proceso con estaciones**.

| Elemento | Metáfora visual | Por qué |
|---|---|---|
| Ruta del curso | Línea de proceso vertical; cada lección es una estación | Lenguaje propio de la planta; muestra con claridad qué sigue y qué falta |
| Insignias | Placas hexagonales metálicas color cobre | Evoca placas de identificación industriales, no stickers |
| Puntos | Cifras en cobre, sin monedas ni gemas | Motivación sobria; nunca se confunde con calificaciones |
| Consola | Tablero de control: sobrio, denso, preciso | La administración se lee como un instrumento de medición |

**Nombre de trabajo:** «Oficio» (alternativas: «Escalón», «Tramo»). Antes de adoptarlo hay que verificar la disponibilidad de la marca y del dominio [P].

**Marca:** escalones ascendentes con un punto de logro, sobre un cuadrado de esquinas redondeadas color *Proceso*.

## 2. Dos registros visuales, un mismo sistema

| | Aprender | Administrar |
|---|---|---|
| Objetivo | Motivar y guiar | Medir y demostrar |
| Tipografía | Atkinson Hyperlegible, 18 px base | IBM Plex Sans, 14 px base, cifras tabulares |
| Densidad | Una idea por pantalla; mucho aire | Tablas y paneles; información comparada |
| Color | *Proceso* para acciones; *cobre* para logros | *Proceso* oscuro en la barra; estados con color, ícono y texto |
| Motivación | Puntos, insignias, ranking voluntario | Ninguna. La consola no muestra puntos ni rankings |
| Movimiento | Animaciones breves de logro | Solo transiciones funcionales |
| Evaluación | Apariencia sobria, sin elementos de juego | — |

Esta separación visual refuerza la regla de producto D-01: el juego y el registro oficial no se mezclan.

## 3. Color

### 3.1 Paleta

| Token | Valor | Uso | Contraste sobre blanco |
|---|---|---|---|
| `--proceso` | `#0C5D6E` | Acción principal, marca, avance | 7.48 : 1 |
| `--proceso-osc` | `#08434F` | Barra superior de la consola | — |
| `--proceso-claro` | `#E2F0F3` | Selección y resaltado | — (texto *Proceso* encima: 6.41 : 1) |
| `--cobre` | `#A8521B` | Puntos e insignias, **solo en Aprender** | 5.40 : 1 |
| `--tinta` | `#17202B` | Texto principal | 16.43 : 1 |
| `--tinta-2` | `#4A5563` | Texto secundario | 7.58 : 1 (7.00 sobre el fondo gris) |
| `--fondo` | `#F4F6F8` | Fondo de la aplicación | — |
| `--borde-control` | `#8A94A3` | Bordes de campos y botones secundarios | 3.07 : 1 (mínimo de 3 : 1 para componentes) |

### 3.2 Estados

Los colores siguen la convención de colores de seguridad que el personal ya conoce: verde para lo correcto, ámbar para la precaución, rojo para el peligro o el error, y azul para la información. Seguridad debe validar la norma aplicable en la planta [P]. **El color nunca va solo**: siempre lo acompañan un ícono y un texto.

| Estado de cumplimiento | Color | Ícono | Texto | Contraste del texto sobre su fondo |
|---|---|---|---|---|
| Al día | Verde `#1B7339` sobre `#E3F2E7` | Palomita | «Al día» | 5.09 : 1 |
| Por vencer | Ámbar `#7A5200` sobre `#FFF0C7` | Reloj | «Por vencer» | 6.11 : 1 |
| Vencida · Atrasada | Rojo `#B42318` sobre `#FCE8E6` | Triángulo | «Vencida» / «Atrasada» | 5.58 : 1 |
| Pendiente de validación | Azul `#1F5FAD` sobre `#E6EEF9` | Personas | «Pend. validación» | 5.45 : 1 |
| Pendiente · Exenta | Gris `#4A5563` sobre `#EEF0F3` | — | «Pendiente · En curso», «Exenta» | 6.64 : 1 |

El rojo y el ámbar no se usan como decoración, para no gastar su significado.

## 4. Tipografía

| Familia | Uso | Razón | Licencia |
|---|---|---|---|
| Atkinson Hyperlegible | Espacio *Aprender* | Diseñada para máxima legibilidad. Diferencia I, l, 1 y 0, O; su cero lleva una barra diagonal. | SIL Open Font License (gratuita) |
| IBM Plex Sans | Espacio *Administrar* y PDF | Neutra y legible en tablas; cifras tabulares para alinear columnas | SIL Open Font License |
| IBM Plex Mono | Folios, números de empleado, identificadores «C-» | Evita confundir caracteres en datos que se copian o dictan | SIL Open Font License |

Escala propuesta: en *Aprender*, enunciados de 20 px, texto de 17–18 px y apoyos de 14 px como mínimo. En *Administrar*, títulos de 22 px, texto de 14 px y metadatos de tablas de 12 px como mínimo.

## 5. Iconografía

- Íconos de línea con trazo de 2 px y esquinas redondeadas, **siempre acompañados de texto**.
- Las maquetas usan íconos dibujados para este proyecto. Para el desarrollo se recomienda una colección abierta con licencia permisiva (por ejemplo, Lucide, licencia ISC), a confirmar en la Etapa 4 [R].
- Sin ilustraciones de personajes. Las escenas de las actividades son ilustraciones planas de estaciones de trabajo y, cuando el contenido lo requiera, fotos reales aprobadas por la empresa.

## 6. Motivación, movimiento y sonido

| Elemento | Propuesta |
|---|---|
| Fin de lección | Conteo breve de puntos y palomita; menos de un segundo |
| Insignia nueva | La placa aparece con un destello metálico breve |
| Reducción de movimiento | Si el dispositivo lo pide, no hay animaciones |
| Sonido | Apagado por defecto (entornos ruidosos y equipos compartidos); opcional en el perfil |
| Evaluación | Sin animaciones, puntos ni sonidos |
| Errores | Nunca con humor ni burla: explicación directa y respetuosa |

## 7. Tono y voz

**[R] Tuteo en *Aprender*** (cercano y directo); **impersonal en *Administrar***. Si la empresa prefiere «usted» para el personal, el cambio es de textos, no de diseño. Decisión D-41.

| Sí | No |
|---|---|
| «Revisa esto: primero se anotan las novedades y después se firma.» | «¡Ups! Fallaste 😅» |
| «Estás al día. Cuando te asignen un curso, aparecerá aquí.» | «No hay datos.» |
| «Cerramos tu sesión para proteger tus datos. Tu avance quedó guardado.» | «Sesión expirada (401).» |
| «Aún no acreditas el curso: falta tu validación práctica.» | «¡Felicidades, terminaste!» (cuando falta un criterio) |

## 8. Maquetas

> **DEMO · CONTENIDO FICTICIO.** Personas, empresas, cursos, cifras y criterios inventados para ilustrar el diseño.

### 8.1 Aprender (celular)

| | | |
|---|---|---|
| ![T-01 Acceso](maquetas/img/t01-acceso.png) **T-01** Acceso en equipo compartido | ![T-03 Inicio](maquetas/img/t03-inicio.png) **T-03** Inicio | ![T-05 Ruta](maquetas/img/t05-ruta.png) **T-05** Ruta del curso |
| ![T-06 Riesgos](maquetas/img/t06-riesgos.png) **T-06** Identificar riesgos | ![T-07 Retroalimentación](maquetas/img/t07-retro.png) **T-07** Retroalimentación | ![T-09 Evaluación](maquetas/img/t09-evaluacion.png) **T-09** Antes de evaluar |
| ![T-11 Resultado](maquetas/img/t11-resultado.png) **T-11** Resultado | ![T-12 Logros](maquetas/img/t12-logros.png) **T-12** Logros y ranking | ![T-13 Historial](maquetas/img/t13-historial.png) **T-13** Historial |
| ![T-16 Inactividad](maquetas/img/t16-inactividad.png) **T-16** Inactividad | ![Sin conexión](maquetas/img/t-sin-conexion.png) **Sin conexión** | ![Vacío](maquetas/img/t-vacio.png) **Estado vacío** |

### 8.2 Administrar (computadora y tableta)

**A-01 · Tablero de cumplimiento**

![A-01 Tablero](maquetas/img/a01-tablero.png)

**A-12 · Matriz de capacitación (vista de supervisora)**

![A-12 Matriz](maquetas/img/a12-matriz.png)

**A-03 · Ficha de persona con restablecimiento de acceso**

![A-03 Ficha](maquetas/img/a03-ficha.png)

**A-10 · Regla de asignación con vista previa**

![A-10 Regla](maquetas/img/a10-regla.png)

**A-15 · Reportes y exportaciones**

![A-15 Exportaciones](maquetas/img/a15-exportaciones.png)

**A-13 · Validación práctica en tableta**

![A-13 Validación](maquetas/img/a13-validacion.png)

### 8.3 Constancia y sistema visual

| Constancia PDF (plantilla) | Sistema visual |
|---|---|
| ![Constancia](maquetas/img/constancia.png) | ![Sistema visual](maquetas/img/sistema-visual.png) |

## 9. Accesibilidad verificada en esta etapa

| Verificado | Cómo |
|---|---|
| Contraste de todos los pares de texto de la paleta ≥ 4.5 : 1 y bordes de controles ≥ 3 : 1 | Cálculo con la fórmula de luminancia relativa de WCAG 2.x (tablas de la sección 3) |
| Ningún estado depende solo del color | Revisión de las maquetas: todo estado lleva ícono y texto |
| Objetivos táctiles de al menos 44 px en *Aprender* | Medidas de los componentes en las maquetas (botones de 52 px, navegación de 56 px) |

**Pendiente de verificar en las Etapas 3 a 5:** navegación por teclado, lectores de pantalla, zoom al 200 %, alternativas accesibles de arrastrar y de tocar sobre imagen, y pruebas con personas reales. El cumplimiento de WCAG 2.2 AA no se da por hecho [H].

## 10. Qué evitamos deliberadamente

Para que la identidad sea propia y adecuada para personas adultas:

- Sin mascota ni personajes.
- Sin camino serpenteante de círculos: la ruta es una línea de proceso recta.
- Sin verde brillante como color de marca: la marca es azul petróleo y el verde queda reservado para «correcto» y «al día».
- Sin vidas, corazones ni rachas con presión diaria (D-04).
- Sin tipografías redondeadas de estilo caricatura.
- Sin celebraciones exageradas ni mensajes que culpen por no entrar.

## 11. Pendientes visuales

| ID | Pendiente |
|---|---|
| D-40 | Nombre definitivo y verificación de marca |
| D-41 | Tuteo o «usted» en *Aprender* |
| D-42 | Modo oscuro: no se incluye en V1; se evaluará en V2 si los equipos compartidos están en zonas con poca luz |
| D-21 | Política de fotografías para evidencias y escenas de actividades |
| D-22, D-23 | QR y firma en la constancia |
