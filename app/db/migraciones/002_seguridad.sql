-- =====================================================================
-- Nexo · Núcleo de datos · Migración 002: seguridad
--  * Roles: nexo_owner (dueño, sin inicio de sesión) y nexo_app (la aplicación).
--  * Seguridad por fila: la aplicación solo indica QUIÉN es el usuario
--    (app.usuario_id); el grupo y las empresas permitidas se calculan
--    aquí, a partir de sus roles vigentes. Sin usuario no se ve nada.
--  * Bitácora automática y de solo inserción.
--  * Reglas que la base protege aunque la aplicación falle:
--    inmutabilidad, separación de funciones y folios únicos.
-- La base aísla por grupo y empresa. Los permisos por acción y los
-- alcances finos (planta, área y turno, cursos) los aplica el servicio
-- de aplicación (docs/etapa-2/02-matriz-de-permisos.md).
-- =====================================================================
BEGIN;
SET search_path = nexo, public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexo_owner') THEN CREATE ROLE nexo_owner NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexo_app') THEN CREATE ROLE nexo_app NOLOGIN NOBYPASSRLS; END IF;
END $$;

ALTER SCHEMA nexo OWNER TO nexo_owner;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'nexo' LOOP
    EXECUTE format('ALTER TABLE nexo.%I OWNER TO nexo_owner', t.tablename);
  END LOOP;
END $$;

-- ---------- Contexto del usuario ----------
CREATE FUNCTION ctx_usuario() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.usuario_id', true), '')::uuid $$;

CREATE FUNCTION mi_grupo() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp
  AS $$ SELECT grupo_id FROM nexo.personas WHERE id = nexo.ctx_usuario() $$;

CREATE FUNCTION rol_vigente(r nexo.asignaciones_rol) RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT r.vigente_desde <= current_date AND (r.vigente_hasta IS NULL OR r.vigente_hasta >= current_date) $$;

CREATE FUNCTION mi_alcance_grupo() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp
  AS $$ SELECT EXISTS (SELECT 1 FROM nexo.asignaciones_rol r
                        WHERE r.persona_id = nexo.ctx_usuario() AND r.alcance = 'grupo'
                          AND r.rol IN ('administrador', 'rh', 'auditor') AND nexo.rol_vigente(r)) $$;

CREATE FUNCTION mis_empresas() RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp
  AS $$ SELECT coalesce(array_agg(DISTINCT r.empresa_id), '{}') FROM nexo.asignaciones_rol r
         WHERE r.persona_id = nexo.ctx_usuario() AND r.empresa_id IS NOT NULL
           AND r.rol <> 'trabajador' AND nexo.rol_vigente(r) $$;

ALTER FUNCTION mi_grupo() OWNER TO nexo_owner;
ALTER FUNCTION mi_alcance_grupo() OWNER TO nexo_owner;
ALTER FUNCTION mis_empresas() OWNER TO nexo_owner;

-- ---------- Seguridad por fila ----------
DO $$ DECLARE t text;
  -- Expresiones reutilizadas (los SELECT entre paréntesis se evalúan una vez por consulta)
  g  text := 'grupo_id = (SELECT nexo.mi_grupo())';
  e  text := '((SELECT nexo.mi_alcance_grupo()) OR empresa_id = ANY ((SELECT nexo.mis_empresas())::uuid[]))';
  eo text := '((SELECT nexo.mi_alcance_grupo()) OR empresa_id IS NULL OR empresa_id = ANY ((SELECT nexo.mis_empresas())::uuid[]))';
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'nexo' LOOP
    EXECUTE format('ALTER TABLE nexo.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE nexo.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;

  EXECUTE 'CREATE POLICY aislamiento ON nexo.grupos USING (id = (SELECT nexo.mi_grupo()))';
  EXECUTE format('CREATE POLICY aislamiento ON nexo.empresas USING (grupo_id = (SELECT nexo.mi_grupo()) AND ((SELECT nexo.mi_alcance_grupo()) OR id = ANY ((SELECT nexo.mis_empresas())::uuid[]))) ');

  -- Tablas de una empresa
  FOREACH t IN ARRAY ARRAY['plantas', 'areas', 'turnos', 'reglas_asignacion', 'contadores_folio', 'plantillas_constancia'] LOOP
    EXECUTE format('CREATE POLICY aislamiento ON nexo.%I USING (%s AND %s) WITH CHECK (%s AND %s)', t, g, e, g, e);
  END LOOP;
  -- Catálogos que pueden ser del grupo (empresa_id NULL) o de una empresa
  FOREACH t IN ARRAY ARRAY['puestos', 'cursos', 'exportaciones'] LOOP
    EXECUTE format('CREATE POLICY aislamiento ON nexo.%I USING (%s AND %s) WITH CHECK (%s AND %s)', t, g, eo, g, eo);
  END LOOP;
  EXECUTE format('CREATE POLICY aislamiento ON nexo.versiones_curso USING (%s AND curso_id IN (SELECT id FROM nexo.cursos)) WITH CHECK (%s AND curso_id IN (SELECT id FROM nexo.cursos))', g, g);
  EXECUTE format('CREATE POLICY aislamiento ON nexo.claves_idempotencia USING (%s) WITH CHECK (%s)', g, g);

  -- Registros de una empresa que además ve la propia persona (trabajador)
  FOREACH t IN ARRAY ARRAY['numeros_empleado', 'adscripciones', 'asignaciones', 'participaciones', 'acreditaciones'] LOOP
    EXECUTE format('CREATE POLICY aislamiento ON nexo.%I USING (%s AND (%s OR persona_id = nexo.ctx_usuario())) WITH CHECK (%s AND (%s OR persona_id = nexo.ctx_usuario()))', t, g, e, g, e);
  END LOOP;

  -- Registros hijos: visibles si el registro padre es visible
  EXECUTE format('CREATE POLICY aislamiento ON nexo.excepciones USING (%s AND asignacion_id IN (SELECT id FROM nexo.asignaciones)) WITH CHECK (%s AND %s)', g, g, e);
  EXECUTE format('CREATE POLICY aislamiento ON nexo.intentos USING (%s AND participacion_id IN (SELECT id FROM nexo.participaciones)) WITH CHECK (%s AND participacion_id IN (SELECT id FROM nexo.participaciones))', g, g);
  EXECUTE format('CREATE POLICY aislamiento ON nexo.validaciones USING (%s AND participacion_id IN (SELECT id FROM nexo.participaciones)) WITH CHECK (%s AND %s)', g, g, e);
  EXECUTE format('CREATE POLICY aislamiento ON nexo.evidencias USING (%s AND validacion_id IN (SELECT id FROM nexo.validaciones)) WITH CHECK (%s AND %s)', g, g, e);
  EXECUTE format('CREATE POLICY aislamiento ON nexo.constancias USING (%s AND acreditacion_id IN (SELECT id FROM nexo.acreditaciones)) WITH CHECK (%s AND %s)', g, g, e);

  -- Personas: visibles si están adscritas a una empresa del alcance, o si es uno mismo.
  -- Se pueden dar de alta dentro del propio grupo antes de tener adscripción.
  EXECUTE format('CREATE POLICY ver ON nexo.personas FOR SELECT USING (%s AND ((SELECT nexo.mi_alcance_grupo()) OR id = nexo.ctx_usuario() OR id IN (SELECT persona_id FROM nexo.adscripciones)))', g);
  EXECUTE format('CREATE POLICY alta ON nexo.personas FOR INSERT WITH CHECK (%s)', g);
  EXECUTE format('CREATE POLICY cambio ON nexo.personas FOR UPDATE USING (%s AND ((SELECT nexo.mi_alcance_grupo()) OR id IN (SELECT persona_id FROM nexo.adscripciones))) WITH CHECK (%s)', g, g);

  -- Datos ligados a una persona visible
  FOREACH t IN ARRAY ARRAY['cuentas', 'codigos_acceso', 'sesiones', 'asignaciones_rol', 'puntos'] LOOP
    EXECUTE format('CREATE POLICY aislamiento ON nexo.%I USING (%s AND persona_id IN (SELECT id FROM nexo.personas)) WITH CHECK (%s AND persona_id IN (SELECT id FROM nexo.personas))', t, g, g);
  END LOOP;

  EXECUTE format('CREATE POLICY ver ON nexo.bitacora FOR SELECT USING (%s AND %s)', g, eo);
END $$;

-- ---------- Bitácora automática ----------
CREATE FUNCTION auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE
  antes   jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) - 'hash_frase' - 'hash_codigo' END;
  despues jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) - 'hash_frase' - 'hash_codigo' END;
  fila    jsonb := coalesce(despues, antes);
BEGIN
  INSERT INTO nexo.bitacora (grupo_id, empresa_id, actor_id, accion, tabla, registro_id, antes, despues, motivo)
  VALUES ((fila->>'grupo_id')::uuid, (fila->>'empresa_id')::uuid, nexo.ctx_usuario(), TG_OP, TG_TABLE_NAME,
          coalesce(fila->>'id', fila->>'persona_id'), antes, despues,
          coalesce(fila->>'motivo', fila->>'cancelada_motivo', fila->>'revocada_motivo', fila->>'anulada_motivo'));
  RETURN NULL;
END $$;
ALTER FUNCTION auditar() OWNER TO nexo_owner;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['empresas', 'plantas', 'areas', 'turnos', 'puestos', 'personas', 'numeros_empleado', 'adscripciones',
                           'cuentas', 'codigos_acceso', 'asignaciones_rol', 'cursos', 'versiones_curso', 'reglas_asignacion',
                           'asignaciones', 'excepciones', 'participaciones', 'intentos', 'validaciones', 'evidencias',
                           'acreditaciones', 'constancias', 'plantillas_constancia', 'exportaciones'] LOOP
    EXECUTE format('CREATE TRIGGER bitacora AFTER INSERT OR UPDATE OR DELETE ON nexo.%I FOR EACH ROW EXECUTE FUNCTION nexo.auditar()', t);
  END LOOP;
END $$;

-- Eventos sin cambio de tabla (inicio de sesión, exportación, restablecimiento de acceso)
CREATE FUNCTION registrar_evento(p_accion text, p_tabla text, p_registro text, p_detalle jsonb, p_empresa uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
BEGIN
  IF nexo.ctx_usuario() IS NULL THEN RAISE EXCEPTION 'Sin usuario en el contexto'; END IF;
  INSERT INTO nexo.bitacora (grupo_id, empresa_id, actor_id, accion, tabla, registro_id, despues)
  VALUES (nexo.mi_grupo(), p_empresa, nexo.ctx_usuario(), p_accion, p_tabla, p_registro, p_detalle);
END $$;
ALTER FUNCTION registrar_evento(text, text, text, jsonb, uuid) OWNER TO nexo_owner;

CREATE FUNCTION bitacora_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'La bitácora no se puede modificar ni borrar' USING ERRCODE = 'insufficient_privilege'; END $$;
CREATE TRIGGER inmutable BEFORE UPDATE OR DELETE ON bitacora FOR EACH ROW EXECUTE FUNCTION bitacora_inmutable();
CREATE TRIGGER inmutable_truncate BEFORE TRUNCATE ON bitacora FOR EACH STATEMENT EXECUTE FUNCTION bitacora_inmutable();

-- ---------- Reglas protegidas en la base ----------
-- Versiones publicadas: inmutables; normativo o seguridad exige fuentes y aprobador distinto del autor (SoD-01)
CREATE FUNCTION proteger_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.estado IN ('publicada', 'archivada') THEN
    IF NEW.contenido IS DISTINCT FROM OLD.contenido OR NEW.criterios IS DISTINCT FROM OLD.criterios OR NEW.fuentes IS DISTINCT FROM OLD.fuentes
       OR NEW.numero <> OLD.numero OR NEW.curso_id <> OLD.curso_id OR NEW.autor_id <> OLD.autor_id
       OR NEW.aprobada_por IS DISTINCT FROM OLD.aprobada_por OR NEW.publicada_en IS DISTINCT FROM OLD.publicada_en THEN
      RAISE EXCEPTION 'La versión % ya fue publicada y no se puede modificar', OLD.numero USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (NEW.estado = OLD.estado OR (OLD.estado = 'publicada' AND NEW.estado = 'archivada')) THEN
      RAISE EXCEPTION 'Cambio de estado no permitido: % → %', OLD.estado, NEW.estado USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.estado = 'publicada' AND (TG_OP = 'INSERT' OR OLD.estado <> 'publicada') THEN
    IF EXISTS (SELECT 1 FROM nexo.cursos c WHERE c.id = NEW.curso_id AND c.clasificacion IN ('normativo', 'seguridad')) THEN
      IF NEW.aprobada_por = NEW.autor_id THEN
        RAISE EXCEPTION 'Separación de funciones: el autor no puede aprobar un curso normativo o de seguridad' USING ERRCODE = 'check_violation';
      END IF;
      IF jsonb_array_length(NEW.fuentes) = 0 THEN
        RAISE EXCEPTION 'Un curso normativo o de seguridad requiere fuentes registradas' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger BEFORE INSERT OR UPDATE ON versiones_curso FOR EACH ROW EXECUTE FUNCTION proteger_version();

-- Intentos enviados: inmutables
CREATE FUNCTION proteger_intento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.enviado_en IS NOT NULL OR OLD.anulado THEN
    RAISE EXCEPTION 'El intento % ya fue enviado o anulado y no se puede modificar', OLD.numero USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.numero <> OLD.numero OR NEW.participacion_id <> OLD.participacion_id OR NEW.iniciado_en <> OLD.iniciado_en THEN
    RAISE EXCEPTION 'Datos de origen del intento inmutables' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger BEFORE UPDATE ON intentos FOR EACH ROW EXECUTE FUNCTION proteger_intento();

-- Validaciones: nadie se valida a sí mismo; solo se agregan confirmación o anulación
CREATE FUNCTION proteger_validacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM nexo.participaciones p WHERE p.id = NEW.participacion_id AND p.persona_id = NEW.validador_id) THEN
      RAISE EXCEPTION 'Separación de funciones: nadie puede validar su propia práctica' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.participacion_id <> OLD.participacion_id OR NEW.validador_id <> OLD.validador_id OR NEW.fecha_practica <> OLD.fecha_practica
     OR NEW.registrada_en <> OLD.registrada_en OR NEW.criterios <> OLD.criterios OR NEW.resultado <> OLD.resultado
     OR NEW.observaciones IS DISTINCT FROM OLD.observaciones
     OR (OLD.confirmada_en IS NOT NULL AND NEW.confirmada_en IS DISTINCT FROM OLD.confirmada_en)
     OR (OLD.anulada_en IS NOT NULL AND NEW.anulada_en IS DISTINCT FROM OLD.anulada_en) THEN
    RAISE EXCEPTION 'Una validación registrada no se edita; se anula con motivo y se registra otra' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger BEFORE INSERT OR UPDATE ON validaciones FOR EACH ROW EXECUTE FUNCTION proteger_validacion();

-- Acreditaciones: solo pasan de vigente a revocada
CREATE FUNCTION proteger_acreditacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado = 'revocada' THEN
    RAISE EXCEPTION 'Una acreditación revocada no se modifica' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.persona_id <> OLD.persona_id OR NEW.curso_id <> OLD.curso_id OR NEW.version_id IS DISTINCT FROM OLD.version_id
     OR NEW.fecha <> OLD.fecha OR NEW.vence IS DISTINCT FROM OLD.vence OR NEW.calificacion IS DISTINCT FROM OLD.calificacion
     OR NEW.participacion_id IS DISTINCT FROM OLD.participacion_id OR NEW.tipo <> OLD.tipo THEN
    RAISE EXCEPTION 'Los datos de una acreditación no se modifican; solo puede revocarse' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger BEFORE UPDATE ON acreditaciones FOR EACH ROW EXECUTE FUNCTION proteger_acreditacion();

-- Constancias: los datos emitidos no cambian; solo vigente → sustituida o revocada
CREATE FUNCTION proteger_constancia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.folio <> OLD.folio OR NEW.acreditacion_id <> OLD.acreditacion_id OR NEW.datos_emitidos <> OLD.datos_emitidos
     OR NEW.emitida_en <> OLD.emitida_en OR NEW.sustituye_a IS DISTINCT FROM OLD.sustituye_a
     OR (OLD.sha256 IS NOT NULL AND NEW.sha256 IS DISTINCT FROM OLD.sha256) THEN
    RAISE EXCEPTION 'Una constancia emitida no se modifica; se reemite con otro folio' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.estado <> OLD.estado AND NOT (OLD.estado = 'vigente' AND NEW.estado IN ('sustituida', 'revocada')) THEN
    RAISE EXCEPTION 'Cambio de estado de constancia no permitido: % → %', OLD.estado, NEW.estado USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger BEFORE UPDATE ON constancias FOR EACH ROW EXECUTE FUNCTION proteger_constancia();

-- Excepciones: nadie aprueba una excepción a su favor (SoD-02)
CREATE FUNCTION proteger_excepcion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM nexo.asignaciones a WHERE a.id = NEW.asignacion_id AND a.persona_id = NEW.aprobada_por) THEN
    RAISE EXCEPTION 'Separación de funciones: nadie aprueba una excepción a su favor' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger BEFORE INSERT ON excepciones FOR EACH ROW EXECUTE FUNCTION proteger_excepcion();

-- Folios consecutivos por empresa y año, seguros ante solicitudes simultáneas
CREATE FUNCTION siguiente_folio(p_empresa uuid, p_fecha date) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_prefijo text; v_grupo uuid; v_anio int := extract(year FROM p_fecha)::int; v_ultimo int;
BEGIN
  SELECT prefijo_folio, grupo_id INTO v_prefijo, v_grupo FROM nexo.empresas WHERE id = p_empresa;
  IF v_prefijo IS NULL THEN RAISE EXCEPTION 'Empresa fuera del alcance del usuario' USING ERRCODE = 'insufficient_privilege'; END IF;
  INSERT INTO nexo.contadores_folio AS c (grupo_id, empresa_id, anio, ultimo) VALUES (v_grupo, p_empresa, v_anio, 1)
  ON CONFLICT (empresa_id, anio) DO UPDATE SET ultimo = c.ultimo + 1
  RETURNING ultimo INTO v_ultimo;
  RETURN v_prefijo || '-' || v_anio || '-' || lpad(v_ultimo::text, 6, '0');
END $$;

-- ---------- Privilegios de la aplicación ----------
-- Sin DELETE en ninguna tabla: nada se borra. Sin escritura directa en la bitácora.
GRANT USAGE ON SCHEMA nexo TO nexo_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA nexo TO nexo_app;
REVOKE INSERT, UPDATE ON bitacora FROM nexo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA nexo TO nexo_app;
REVOKE ALL ON FUNCTION mi_grupo(), mi_alcance_grupo(), mis_empresas(), auditar(), registrar_evento(text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ctx_usuario(), mi_grupo(), mi_alcance_grupo(), mis_empresas(), rol_vigente(nexo.asignaciones_rol),
                          registrar_evento(text, text, text, jsonb, uuid), siguiente_folio(uuid, date) TO nexo_app;

COMMIT;
