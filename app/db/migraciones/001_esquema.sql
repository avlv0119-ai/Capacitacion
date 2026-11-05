-- =====================================================================
-- Nexo · Núcleo de datos · Migración 001: esquema
-- PostgreSQL 16. Propuesta pendiente de aprobación de TI (D-33, B-5).
-- Reglas de referencia: docs/etapa-1/05-estados-y-acreditacion.md
-- Convenciones:
--   * Toda tabla de negocio lleva grupo_id; las que pertenecen a una
--     empresa llevan también empresa_id. Las llaves foráneas compuestas
--     (id, grupo_id) impiden mezclar registros de grupos distintos.
--   * Nada se borra: los cambios de estado conservan el historial.
-- =====================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA IF NOT EXISTS nexo;
SET search_path = nexo, public;

-- ---------- Organización ----------
CREATE TABLE grupos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE empresas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL REFERENCES grupos(id),
  nombre         text NOT NULL,
  prefijo_folio  text NOT NULL CHECK (prefijo_folio ~ '^[A-Z0-9]{2,6}$'),
  activa         boolean NOT NULL DEFAULT true,
  UNIQUE (id, grupo_id),
  UNIQUE (grupo_id, prefijo_folio)
);

CREATE TABLE plantas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      uuid NOT NULL,
  empresa_id    uuid NOT NULL,
  nombre        text NOT NULL,
  zona_horaria  text NOT NULL,
  desactivada   date,
  UNIQUE (id, empresa_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

CREATE TABLE areas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL,
  empresa_id     uuid NOT NULL,
  planta_id      uuid NOT NULL,
  area_padre_id  uuid REFERENCES areas(id),
  nombre         text NOT NULL,
  desactivada    date,
  UNIQUE (id, empresa_id),
  FOREIGN KEY (planta_id, empresa_id) REFERENCES plantas(id, empresa_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

CREATE TABLE turnos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL,
  empresa_id  uuid NOT NULL,
  planta_id   uuid NOT NULL,
  clave       text NOT NULL,
  nombre      text NOT NULL,
  UNIQUE (id, empresa_id),
  UNIQUE (planta_id, clave),
  FOREIGN KEY (planta_id, empresa_id) REFERENCES plantas(id, empresa_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

CREATE TABLE puestos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL REFERENCES grupos(id),
  empresa_id  uuid,                      -- NULL = catálogo compartido del grupo
  nombre      text NOT NULL,
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

-- ---------- Personas ----------
CREATE TABLE personas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id              uuid NOT NULL REFERENCES grupos(id),
  nombre_completo       text NOT NULL CHECK (length(trim(nombre_completo)) > 0),
  tipo                  text NOT NULL CHECK (tipo IN ('empleado', 'contratista')),
  empresa_contratista   text,
  acceso_vence          date,
  creada_en             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, grupo_id),
  CHECK (tipo = 'empleado' OR (empresa_contratista IS NOT NULL AND acceso_vence IS NOT NULL))
);

-- El número de empleado identifica, no autentica (RF-ACC-01). Es único
-- por empresa entre los vigentes y puede repetirse entre empresas (D-47).
CREATE TABLE numeros_empleado (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL,
  empresa_id     uuid NOT NULL,
  persona_id     uuid NOT NULL,
  numero         text NOT NULL CHECK (numero ~ '^[A-Za-z0-9-]{1,20}$'),
  vigente_desde  date NOT NULL,
  vigente_hasta  date,
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);
CREATE UNIQUE INDEX numeros_empleado_vigente_unico ON numeros_empleado (empresa_id, upper(numero)) WHERE vigente_hasta IS NULL;

-- Adscripción con vigencia: un movimiento crea un periodo nuevo; los periodos no se traslapan.
CREATE TABLE adscripciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL,
  empresa_id  uuid NOT NULL,
  persona_id  uuid NOT NULL,
  planta_id   uuid NOT NULL,
  area_id     uuid NOT NULL,
  turno_id    uuid NOT NULL,
  puesto_id   uuid NOT NULL REFERENCES puestos(id),
  vigencia    daterange NOT NULL CHECK (NOT isempty(vigencia)),
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id),
  FOREIGN KEY (planta_id, empresa_id) REFERENCES plantas(id, empresa_id),
  FOREIGN KEY (area_id, empresa_id) REFERENCES areas(id, empresa_id),
  FOREIGN KEY (turno_id, empresa_id) REFERENCES turnos(id, empresa_id),
  EXCLUDE USING gist (persona_id WITH =, vigencia WITH &&)
);

-- ---------- Acceso ----------
CREATE TABLE cuentas (
  persona_id           uuid PRIMARY KEY,
  grupo_id             uuid NOT NULL,
  estado               text NOT NULL DEFAULT 'sin_activar' CHECK (estado IN ('sin_activar', 'activa', 'bloqueada', 'expirada')),
  hash_frase           text,                     -- Argon2id; nunca la frase
  participa_ranking    boolean NOT NULL DEFAULT false,   -- privado por defecto (D-02)
  alias                text,
  ultimo_acceso        timestamptz,
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  CHECK (estado <> 'activa' OR hash_frase IS NOT NULL)
);

CREATE TABLE codigos_acceso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      uuid NOT NULL,
  persona_id    uuid NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('activacion', 'restablecimiento')),
  hash_codigo   text NOT NULL,                   -- nunca el código
  expira_en     timestamptz NOT NULL,
  usado_en      timestamptz,
  generado_por  uuid NOT NULL,
  motivo        text,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  CHECK (tipo = 'activacion' OR length(trim(coalesce(motivo, ''))) > 0)
);

CREATE TABLE sesiones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id         uuid NOT NULL,
  persona_id       uuid NOT NULL,
  equipo_compartido boolean NOT NULL DEFAULT true,
  creada_en        timestamptz NOT NULL DEFAULT now(),
  expira_en        timestamptz NOT NULL,
  revocada_en      timestamptz,
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id)
);

-- ---------- Roles y alcance ----------
CREATE TABLE asignaciones_rol (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL,
  persona_id     uuid NOT NULL,
  rol            text NOT NULL CHECK (rol IN ('administrador', 'rh', 'instructor', 'supervisor', 'auditor', 'trabajador')),
  alcance        text NOT NULL CHECK (alcance IN ('grupo', 'empresa', 'planta', 'area_turno', 'cursos', 'propio')),
  empresa_id     uuid,
  planta_id      uuid,
  area_id        uuid,
  turno_id       uuid,
  vigente_desde  date NOT NULL DEFAULT current_date,
  vigente_hasta  date,
  otorgado_por   uuid,
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id),
  CHECK (alcance <> 'grupo' OR empresa_id IS NULL),
  CHECK (alcance IN ('grupo', 'propio', 'cursos') OR empresa_id IS NOT NULL),
  CHECK (alcance <> 'area_turno' OR (area_id IS NOT NULL AND turno_id IS NOT NULL)),
  CHECK (otorgado_por IS NULL OR otorgado_por <> persona_id)            -- SoD-03
);

-- ---------- Cursos y versiones ----------
CREATE TABLE cursos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL REFERENCES grupos(id),
  empresa_id     uuid,                                     -- NULL = catálogo del grupo
  clave          text NOT NULL,
  nombre         text NOT NULL,
  clasificacion  text NOT NULL CHECK (clasificacion IN ('interno', 'seguridad', 'calidad', 'normativo')),
  es_demo        boolean NOT NULL DEFAULT false,           -- contenido ficticio: no se asigna a personas reales
  UNIQUE (grupo_id, clave),
  UNIQUE (id, grupo_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

CREATE TABLE versiones_curso (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL,
  curso_id       uuid NOT NULL,
  numero         int NOT NULL CHECK (numero > 0),
  estado         text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_revision', 'cambios_solicitados', 'publicada', 'archivada')),
  tipo_cambio    text CHECK (tipo_cambio IN ('menor', 'mayor')),
  contenido      jsonb NOT NULL DEFAULT '{}',
  criterios      jsonb NOT NULL DEFAULT '{}',
  fuentes        jsonb NOT NULL DEFAULT '[]',
  autor_id       uuid NOT NULL,
  aprobada_por   uuid,
  publicada_en   timestamptz,
  UNIQUE (curso_id, numero),
  UNIQUE (id, grupo_id),
  FOREIGN KEY (curso_id, grupo_id) REFERENCES cursos(id, grupo_id),
  -- No se publica con criterios incompletos (RF-EVA-10); los obligatorios no tienen valor por defecto.
  CHECK (estado NOT IN ('publicada', 'archivada') OR (
         criterios ? 'requiere_evaluacion' AND criterios ? 'requiere_practica' AND criterios ? 'vigencia_meses'
     AND (NOT (criterios->>'requiere_evaluacion')::boolean OR (criterios ? 'calificacion_minima' AND criterios ? 'intentos'))
     AND aprobada_por IS NOT NULL AND publicada_en IS NOT NULL))
);

-- ---------- Asignaciones ----------
CREATE TABLE reglas_asignacion (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id            uuid NOT NULL,
  empresa_id          uuid NOT NULL,
  curso_id            uuid NOT NULL,
  filtro              jsonb NOT NULL,        -- plantas, áreas, turnos, puestos, personas, contratistas
  tipo                text NOT NULL DEFAULT 'obligatorio' CHECK (tipo IN ('obligatorio', 'opcional')),
  dias_limite         int NOT NULL CHECK (dias_limite BETWEEN 1 AND 365),
  activa              boolean NOT NULL DEFAULT true,
  creada_por          uuid NOT NULL,
  creada_en           timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id),
  FOREIGN KEY (curso_id, grupo_id) REFERENCES cursos(id, grupo_id)
);

CREATE TABLE asignaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id          uuid NOT NULL,
  empresa_id        uuid NOT NULL,
  persona_id        uuid NOT NULL,
  curso_id          uuid NOT NULL,
  regla_id          uuid REFERENCES reglas_asignacion(id),
  tipo              text NOT NULL DEFAULT 'obligatorio' CHECK (tipo IN ('obligatorio', 'opcional')),
  creada_en         timestamptz NOT NULL DEFAULT now(),
  fecha_limite      date NOT NULL,
  estado            text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cancelada')),
  cancelada_motivo  text,
  UNIQUE (id, grupo_id),
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id),
  FOREIGN KEY (curso_id, grupo_id) REFERENCES cursos(id, grupo_id),
  CHECK (estado = 'activa' OR length(trim(coalesce(cancelada_motivo, ''))) > 0)
);
-- Una sola asignación activa por persona y curso (RF-ASG-05)
CREATE UNIQUE INDEX asignacion_activa_unica ON asignaciones (persona_id, curso_id) WHERE estado = 'activa';

CREATE TABLE excepciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id        uuid NOT NULL,
  empresa_id      uuid NOT NULL,
  asignacion_id   uuid NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('exencion', 'prorroga', 'intentos_adicionales', 'curso_adicional')),
  motivo          text NOT NULL CHECK (length(trim(motivo)) > 0),
  vigente_hasta   date,
  valor           int,
  aprobada_por    uuid NOT NULL,
  creada_en       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (asignacion_id, grupo_id) REFERENCES asignaciones(id, grupo_id),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id),
  CHECK (tipo <> 'exencion' OR vigente_hasta IS NOT NULL)
);

-- ---------- Participación, intentos y validación práctica ----------
CREATE TABLE participaciones (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id                    uuid NOT NULL,
  empresa_id                  uuid NOT NULL,
  asignacion_id               uuid NOT NULL,
  persona_id                  uuid NOT NULL,
  curso_id                    uuid NOT NULL,
  version_id                  uuid REFERENCES versiones_curso(id),    -- se liga al iniciar (RT-01)
  es_renovacion               boolean NOT NULL DEFAULT false,
  iniciada_en                 timestamptz,
  lecciones_completadas       text[] NOT NULL DEFAULT '{}',
  intentos_extra              int NOT NULL DEFAULT 0 CHECK (intentos_extra >= 0),
  pendiente_validacion_desde  date,
  cancelada_en                timestamptz,
  cancelada_motivo            text,
  UNIQUE (id, grupo_id),
  FOREIGN KEY (asignacion_id, grupo_id) REFERENCES asignaciones(id, grupo_id),
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  CHECK ((iniciada_en IS NULL) = (version_id IS NULL)),
  CHECK (cancelada_en IS NULL OR length(trim(coalesce(cancelada_motivo, ''))) > 0)
);

CREATE TABLE intentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id          uuid NOT NULL,
  empresa_id        uuid NOT NULL,
  participacion_id  uuid NOT NULL,
  numero            int NOT NULL CHECK (numero > 0),
  iniciado_en       timestamptz NOT NULL DEFAULT now(),
  vence_en          timestamptz,
  enviado_en        timestamptz,
  calificacion      numeric(7,4) CHECK (calificacion BETWEEN 0 AND 100),
  aprobado          boolean,
  respuestas        jsonb NOT NULL DEFAULT '{}',
  anulado           boolean NOT NULL DEFAULT false,
  FOREIGN KEY (participacion_id, grupo_id) REFERENCES participaciones(id, grupo_id),
  UNIQUE (participacion_id, numero),
  CHECK ((enviado_en IS NULL) = (calificacion IS NULL) AND (calificacion IS NULL) = (aprobado IS NULL))
);
-- Un solo intento abierto por participación
CREATE UNIQUE INDEX intento_abierto_unico ON intentos (participacion_id) WHERE enviado_en IS NULL AND NOT anulado;

CREATE TABLE validaciones (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id           uuid NOT NULL,
  empresa_id         uuid NOT NULL,
  participacion_id   uuid NOT NULL,
  validador_id       uuid NOT NULL,
  fecha_practica     date NOT NULL,
  registrada_en      timestamptz NOT NULL DEFAULT now(),
  criterios          jsonb NOT NULL,
  resultado          text NOT NULL CHECK (resultado IN ('competente', 'aun_no_competente')),
  observaciones      text,
  confirmada_en      timestamptz,
  no_reconocida_en   timestamptz,
  anulada_en         timestamptz,
  anulada_por        uuid,
  anulada_motivo     text,
  UNIQUE (id, grupo_id),
  FOREIGN KEY (participacion_id, grupo_id) REFERENCES participaciones(id, grupo_id),
  FOREIGN KEY (validador_id, grupo_id) REFERENCES personas(id, grupo_id),
  CHECK (resultado = 'competente' OR length(trim(coalesce(observaciones, ''))) > 0),
  CHECK (fecha_practica <= (registrada_en AT TIME ZONE 'UTC')::date + 1),
  CHECK (anulada_en IS NULL OR length(trim(coalesce(anulada_motivo, ''))) > 0)
);

CREATE TABLE evidencias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id        uuid NOT NULL,
  empresa_id      uuid NOT NULL,
  validacion_id   uuid NOT NULL,
  clave_objeto    text NOT NULL,          -- ruta en el almacenamiento de archivos; nunca un enlace público
  tipo_contenido  text NOT NULL,
  tamano_bytes    bigint NOT NULL CHECK (tamano_bytes > 0),
  sha256          text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  subida_por      uuid NOT NULL,
  subida_en       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (validacion_id, grupo_id) REFERENCES validaciones(id, grupo_id)
);

-- ---------- Acreditación y constancias ----------
CREATE TABLE acreditaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id          uuid NOT NULL,
  empresa_id        uuid NOT NULL,
  persona_id        uuid NOT NULL,
  curso_id          uuid NOT NULL,
  version_id        uuid REFERENCES versiones_curso(id),
  participacion_id  uuid UNIQUE,
  tipo              text NOT NULL DEFAULT 'plataforma' CHECK (tipo IN ('plataforma', 'externa')),
  fecha             date NOT NULL,
  vence             date,
  calificacion      numeric(7,4),
  estado            text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'revocada')),
  revocada_en       timestamptz,
  revocada_por      uuid,
  revocada_motivo   text,
  UNIQUE (id, grupo_id),
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  FOREIGN KEY (participacion_id, grupo_id) REFERENCES participaciones(id, grupo_id),
  CHECK (vence IS NULL OR vence >= fecha),
  CHECK (tipo = 'externa' OR (participacion_id IS NOT NULL AND version_id IS NOT NULL)),
  CHECK (estado = 'vigente' OR (revocada_en IS NOT NULL AND length(trim(coalesce(revocada_motivo, ''))) > 0))
);

CREATE TABLE contadores_folio (
  grupo_id    uuid NOT NULL,
  empresa_id  uuid NOT NULL,
  anio        int NOT NULL,
  ultimo      int NOT NULL,
  PRIMARY KEY (empresa_id, anio),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

CREATE TABLE plantillas_constancia (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL,
  empresa_id  uuid NOT NULL,
  version     int NOT NULL,
  contenido   jsonb NOT NULL,
  activa      boolean NOT NULL DEFAULT true,
  UNIQUE (empresa_id, version),
  FOREIGN KEY (empresa_id, grupo_id) REFERENCES empresas(id, grupo_id)
);

CREATE TABLE constancias (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id         uuid NOT NULL,
  empresa_id       uuid NOT NULL,
  acreditacion_id  uuid NOT NULL,
  folio            text NOT NULL,
  plantilla_id     uuid REFERENCES plantillas_constancia(id),
  datos_emitidos   jsonb NOT NULL,          -- copia de los datos con que se generó
  sha256           text CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  clave_objeto     text,
  emitida_en       timestamptz NOT NULL DEFAULT now(),
  estado           text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'sustituida', 'revocada')),
  sustituye_a      uuid REFERENCES constancias(id),
  motivo           text,
  FOREIGN KEY (acreditacion_id, grupo_id) REFERENCES acreditaciones(id, grupo_id),
  UNIQUE (empresa_id, folio),
  CHECK (sustituye_a IS NULL OR length(trim(coalesce(motivo, ''))) > 0)
);
-- Una constancia vigente por acreditación: la emisión repetida no duplica (RNF-INT-02)
CREATE UNIQUE INDEX constancia_vigente_unica ON constancias (acreditacion_id) WHERE estado = 'vigente';

-- ---------- Motivación (registro separado del oficial, D-01) ----------
CREATE TABLE puntos (
  id          bigserial PRIMARY KEY,
  grupo_id    uuid NOT NULL,
  persona_id  uuid NOT NULL,
  fecha       date NOT NULL,
  puntos      int NOT NULL CHECK (puntos >= 0),
  motivo      text NOT NULL,
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id)
);

-- ---------- Operación ----------
CREATE TABLE claves_idempotencia (
  grupo_id   uuid NOT NULL REFERENCES grupos(id),
  clave      text NOT NULL,
  operacion  text NOT NULL,
  resultado  jsonb,
  creada_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grupo_id, clave)
);

CREATE TABLE exportaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id          uuid NOT NULL REFERENCES grupos(id),
  empresa_id        uuid,
  solicitada_por    uuid NOT NULL,
  reporte           text NOT NULL,
  formato           text NOT NULL CHECK (formato IN ('pdf', 'xlsx')),
  filtros           jsonb NOT NULL,
  alcance           jsonb NOT NULL,
  estado            text NOT NULL DEFAULT 'en_espera' CHECK (estado IN ('en_espera', 'generando', 'lista', 'fallida', 'caducada')),
  registros         int,
  clave_objeto      text,
  enlace_caduca_en  timestamptz,
  creada_en         timestamptz NOT NULL DEFAULT now()
);

-- Bitácora: solo inserción (RF-BIT-03)
CREATE TABLE bitacora (
  id           bigserial PRIMARY KEY,
  grupo_id     uuid NOT NULL,
  empresa_id   uuid,
  ocurrido_en  timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid,
  actor_rol    text,
  accion       text NOT NULL,
  tabla        text NOT NULL,
  registro_id  text,
  antes        jsonb,
  despues      jsonb,
  motivo       text
);
CREATE INDEX bitacora_busqueda ON bitacora (grupo_id, ocurrido_en DESC);

-- Índices de consulta frecuente
CREATE INDEX asignaciones_persona ON asignaciones (persona_id);
CREATE INDEX asignaciones_empresa_curso ON asignaciones (empresa_id, curso_id);
CREATE INDEX participaciones_asignacion ON participaciones (asignacion_id);
CREATE INDEX acreditaciones_persona_curso ON acreditaciones (persona_id, curso_id, fecha DESC);
CREATE INDEX adscripciones_empresa ON adscripciones (empresa_id, area_id, turno_id);

COMMIT;
