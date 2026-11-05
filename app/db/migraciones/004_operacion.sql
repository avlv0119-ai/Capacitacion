-- =====================================================================
-- Nexo · Migración 004: operación (acreditación, constancias, práctica,
-- ranking y renovaciones)
-- Funciones acotadas (SECURITY DEFINER) que el servicio llama en nombre
-- del usuario. Cada una verifica por sí misma el alcance de quien la
-- llama y las reglas de negocio; así la base no acredita ni emite nada
-- que no cumpla los criterios de la versión del curso, aunque el
-- servicio tuviera un error.
-- =====================================================================
BEGIN;
SET search_path = nexo, public;

-- Fecha de hoy en la zona horaria de la planta (una planta en esta etapa)
CREATE FUNCTION hoy() RETURNS date LANGUAGE sql STABLE
  AS $$ SELECT (now() AT TIME ZONE 'America/Monterrey')::date $$;

-- ¿El usuario del contexto puede ver un registro de esta persona y empresa?
-- Misma regla que la seguridad por fila: uno mismo, alcance de grupo o empresa permitida.
CREATE FUNCTION puedo_ver(p_grupo uuid, p_persona uuid, p_empresa uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  SELECT p_grupo = nexo.mi_grupo()
     AND (p_persona = nexo.ctx_usuario() OR nexo.mi_alcance_grupo() OR p_empresa = ANY (nexo.mis_empresas()))
$$;

-- Empresas del grupo para la pantalla de acceso (antes de iniciar sesión)
CREATE FUNCTION empresas_para_acceso() RETURNS TABLE (id uuid, nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  SELECT id, nombre FROM nexo.empresas ORDER BY nombre
$$;

-- Catálogo de la organización (nombres de empresas, plantas, áreas, turnos y puestos del grupo).
-- No contiene datos personales; lo necesita también el trabajador para ver su adscripción.
CREATE FUNCTION catalogo_organizacion() RETURNS TABLE (tipo text, id uuid, clave text, nombre text, empresa_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  SELECT 'empresa', e.id, e.prefijo_folio, e.nombre, e.id FROM nexo.empresas e WHERE e.grupo_id = nexo.mi_grupo()
  UNION ALL SELECT 'planta', x.id, x.zona_horaria, x.nombre, x.empresa_id FROM nexo.plantas x WHERE x.grupo_id = nexo.mi_grupo()
  UNION ALL SELECT 'area', x.id, NULL, x.nombre, x.empresa_id FROM nexo.areas x WHERE x.grupo_id = nexo.mi_grupo()
  UNION ALL SELECT 'turno', x.id, x.clave, x.nombre, x.empresa_id FROM nexo.turnos x WHERE x.grupo_id = nexo.mi_grupo()
  UNION ALL SELECT 'puesto', x.id, NULL, x.nombre, NULL FROM nexo.puestos x WHERE x.grupo_id = nexo.mi_grupo()
$$;

-- Nombres de quienes validaron prácticas o aprobaron excepciones en registros que el usuario puede ver
-- (el trabajador ve quién registró su práctica, aunque no vea al resto de la empresa).
CREATE FUNCTION nombres_relacionados() RETURNS TABLE (id uuid, nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  SELECT p.id, p.nombre_completo FROM nexo.personas p
   WHERE p.grupo_id = nexo.mi_grupo() AND p.id IN (
     SELECT v.validador_id FROM nexo.validaciones v JOIN nexo.participaciones pa ON pa.id = v.participacion_id
      WHERE nexo.puedo_ver(pa.grupo_id, pa.persona_id, pa.empresa_id)
     UNION
     SELECT e.aprobada_por FROM nexo.excepciones e JOIN nexo.asignaciones a ON a.id = e.asignacion_id
      WHERE nexo.puedo_ver(a.grupo_id, a.persona_id, a.empresa_id))
$$;

-- ---------- Constancia: emisión idempotente con folio consecutivo y huella ----------
-- Con p_sustituye, es una reemisión: la constancia anterior ya debe estar «sustituida».
CREATE FUNCTION emitir_constancia(p_acreditacion uuid, p_sustituye uuid DEFAULT NULL, p_motivo text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE a record; v_id uuid; v_folio text; v_plantilla uuid; v_datos jsonb; v_num text;
BEGIN
  SELECT ac.*, p.nombre_completo, c.nombre AS curso_nombre, v.numero AS version_num INTO a
    FROM nexo.acreditaciones ac
    JOIN nexo.personas p ON p.id = ac.persona_id
    JOIN nexo.cursos c ON c.id = ac.curso_id
    LEFT JOIN nexo.versiones_curso v ON v.id = ac.version_id
   WHERE ac.id = p_acreditacion;
  IF a.id IS NULL OR NOT nexo.puedo_ver(a.grupo_id, a.persona_id, a.empresa_id) THEN
    RAISE EXCEPTION 'Acreditación fuera del alcance' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF a.estado <> 'vigente' THEN
    RAISE EXCEPTION 'Solo se emiten constancias de acreditaciones vigentes' USING ERRCODE = 'check_violation';
  END IF;
  SELECT id INTO v_id FROM nexo.constancias WHERE acreditacion_id = a.id AND estado = 'vigente';
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;     -- la emisión repetida no duplica (RNF-INT-02)
  SELECT id INTO v_plantilla FROM nexo.plantillas_constancia WHERE empresa_id = a.empresa_id AND activa ORDER BY version DESC LIMIT 1;
  SELECT numero INTO v_num FROM nexo.numeros_empleado WHERE persona_id = a.persona_id AND empresa_id = a.empresa_id AND vigente_hasta IS NULL;
  v_datos := jsonb_build_object('persona', a.nombre_completo, 'numero_empleado', v_num, 'curso', a.curso_nombre, 'version', a.version_num,
                                'fecha_acreditacion', a.fecha, 'vence', a.vence, 'calificacion', a.calificacion);
  v_folio := nexo.siguiente_folio(a.empresa_id, nexo.hoy());
  INSERT INTO nexo.constancias (grupo_id, empresa_id, acreditacion_id, folio, plantilla_id, datos_emitidos, sha256, sustituye_a, motivo)
  VALUES (a.grupo_id, a.empresa_id, a.id, v_folio, v_plantilla, v_datos,
          encode(sha256(convert_to(v_folio || '|' || v_datos::text, 'UTF8')), 'hex'), p_sustituye, p_motivo)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ---------- Acreditación: solo si se cumplen los criterios de la versión ----------
-- Lecciones completas, evaluación aprobada (si se exige) y práctica competente (si se exige).
-- Devuelve la acreditación (nueva o ya existente) o NULL si aún no se cumplen los criterios.
CREATE FUNCTION acreditar_si_cumple(p_participacion uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE p record; v record; v_lecciones text[]; v_id uuid;
        v_fecha_eval date; v_calif numeric; v_fecha_prac date; v_fecha date; v_meses int;
BEGIN
  SELECT * INTO p FROM nexo.participaciones WHERE id = p_participacion;
  IF p.id IS NULL OR NOT nexo.puedo_ver(p.grupo_id, p.persona_id, p.empresa_id) THEN
    RAISE EXCEPTION 'Participación fuera del alcance' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT id INTO v_id FROM nexo.acreditaciones WHERE participacion_id = p.id;
  IF v_id IS NOT NULL THEN PERFORM nexo.emitir_constancia(v_id); RETURN v_id; END IF;
  IF p.cancelada_en IS NOT NULL OR p.version_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v FROM nexo.versiones_curso WHERE id = p.version_id;
  IF v.contenido ? 'niveles' THEN
    v_lecciones := ARRAY(SELECT l->>'id' FROM jsonb_array_elements(v.contenido->'niveles') n, jsonb_array_elements(n->'lecciones') l);
  ELSE
    v_lecciones := ARRAY(SELECT jsonb_array_elements_text(coalesce(v.contenido->'lecciones', '[]')));
  END IF;
  IF NOT (v_lecciones <@ p.lecciones_completadas) THEN RETURN NULL; END IF;

  IF (v.criterios->>'requiere_evaluacion')::boolean THEN
    SELECT (enviado_en AT TIME ZONE 'America/Monterrey')::date, calificacion INTO v_fecha_eval, v_calif
      FROM nexo.intentos WHERE participacion_id = p.id AND aprobado AND NOT anulado ORDER BY enviado_en LIMIT 1;
    IF v_fecha_eval IS NULL THEN RETURN NULL; END IF;
  END IF;
  IF (v.criterios->>'requiere_practica')::boolean THEN
    SELECT max(fecha_practica) INTO v_fecha_prac
      FROM nexo.validaciones WHERE participacion_id = p.id AND resultado = 'competente' AND anulada_en IS NULL;
    IF v_fecha_prac IS NULL THEN RETURN NULL; END IF;
  END IF;

  v_fecha := coalesce(greatest(v_fecha_eval, v_fecha_prac), nexo.hoy());
  v_meses := nullif(v.criterios->>'vigencia_meses', '')::int;
  INSERT INTO nexo.acreditaciones (grupo_id, empresa_id, persona_id, curso_id, version_id, participacion_id, fecha, vence, calificacion)
  VALUES (p.grupo_id, p.empresa_id, p.persona_id, p.curso_id, p.version_id, p.id, v_fecha,
          CASE WHEN v_meses IS NULL OR v_meses = 0 THEN NULL ELSE (v_fecha + make_interval(months => v_meses))::date END, v_calif)
  RETURNING id INTO v_id;
  UPDATE nexo.participaciones SET pendiente_validacion_desde = NULL WHERE id = p.id AND pendiente_validacion_desde IS NOT NULL;
  PERFORM nexo.emitir_constancia(v_id);
  RETURN v_id;
END $$;

-- ---------- Práctica: solo la persona validada la confirma o la desconoce ----------
CREATE FUNCTION confirmar_validacion(p_validacion uuid, p_reconoce boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE x record;
BEGIN
  SELECT v.id, v.confirmada_en, v.no_reconocida_en, v.anulada_en, p.persona_id INTO x
    FROM nexo.validaciones v JOIN nexo.participaciones p ON p.id = v.participacion_id WHERE v.id = p_validacion;
  IF x.id IS NULL OR x.persona_id IS DISTINCT FROM nexo.ctx_usuario() THEN
    RAISE EXCEPTION 'Solo la persona validada confirma su práctica' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF x.confirmada_en IS NOT NULL OR x.no_reconocida_en IS NOT NULL OR x.anulada_en IS NOT NULL THEN RETURN; END IF;
  UPDATE nexo.validaciones
     SET confirmada_en = CASE WHEN p_reconoce THEN now() END,
         no_reconocida_en = CASE WHEN p_reconoce THEN NULL ELSE now() END
   WHERE id = p_validacion;
END $$;

-- ---------- Ranking del equipo (solo personas que aceptaron participar, D-02, D-03) ----------
-- Equipo = misma área y turno vigentes. Devuelve nombre corto y puntos del periodo; nunca datos de capacitación.
CREATE FUNCTION ranking_equipo(p_desde date)
RETURNS TABLE (nombre text, puntos bigint, es_yo boolean, participa boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  WITH yo AS (
    SELECT area_id, turno_id FROM nexo.adscripciones WHERE persona_id = nexo.ctx_usuario() AND vigencia @> nexo.hoy() LIMIT 1
  ), equipo AS (
    SELECT ad.persona_id FROM nexo.adscripciones ad, yo
     WHERE ad.area_id = yo.area_id AND ad.turno_id = yo.turno_id AND ad.vigencia @> nexo.hoy()
  )
  SELECT CASE WHEN p.id = nexo.ctx_usuario() THEN 'Tú'
              ELSE split_part(p.nombre_completo, ' ', 1) || ' ' || left(split_part(p.nombre_completo, ' ', 2), 1) || '.' END,
         coalesce((SELECT sum(pt.puntos) FROM nexo.puntos pt WHERE pt.persona_id = p.id AND pt.fecha BETWEEN p_desde AND nexo.hoy()), 0),
         p.id = nexo.ctx_usuario(),
         cu.participa_ranking
    FROM equipo e
    JOIN nexo.personas p ON p.id = e.persona_id
    JOIN nexo.cuentas cu ON cu.persona_id = p.id
   WHERE p.grupo_id = nexo.mi_grupo() AND (cu.participa_ranking OR p.id = nexo.ctx_usuario())
$$;

-- ---------- Proceso diario: participaciones de renovación dentro de la ventana de aviso ----------
CREATE FUNCTION proceso_diario(p_aviso_dias int DEFAULT 30) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE r record; n int := 0; v_grupo uuid;
BEGIN
  FOR r IN
    SELECT a.id, a.grupo_id, a.empresa_id, a.persona_id, a.curso_id, a.fecha_limite, ac.vence
      FROM nexo.asignaciones a
      JOIN LATERAL (SELECT x.vence FROM nexo.acreditaciones x
                     WHERE x.persona_id = a.persona_id AND x.curso_id = a.curso_id AND x.estado = 'vigente'
                     ORDER BY x.fecha DESC LIMIT 1) ac ON true
     WHERE a.estado = 'activa' AND ac.vence IS NOT NULL AND ac.vence - nexo.hoy() <= p_aviso_dias
       AND NOT EXISTS (SELECT 1 FROM nexo.participaciones p
                        WHERE p.asignacion_id = a.id AND p.cancelada_en IS NULL
                          AND NOT EXISTS (SELECT 1 FROM nexo.acreditaciones z WHERE z.participacion_id = p.id))
       AND NOT EXISTS (SELECT 1 FROM nexo.excepciones e
                        WHERE e.asignacion_id = a.id AND e.tipo = 'exencion' AND e.vigente_hasta >= nexo.hoy())
  LOOP
    INSERT INTO nexo.participaciones (grupo_id, empresa_id, asignacion_id, persona_id, curso_id, es_renovacion)
    VALUES (r.grupo_id, r.empresa_id, r.id, r.persona_id, r.curso_id, true);
    IF r.vence > r.fecha_limite THEN UPDATE nexo.asignaciones SET fecha_limite = r.vence WHERE id = r.id; END IF;
    n := n + 1; v_grupo := r.grupo_id;
  END LOOP;
  IF n > 0 THEN
    INSERT INTO nexo.bitacora (grupo_id, accion, tabla, despues)
    VALUES (v_grupo, 'Proceso diario: renovaciones', 'participaciones', jsonb_build_object('creadas', n, 'fecha', nexo.hoy()));
  END IF;
  RETURN n;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['puedo_ver(uuid, uuid, uuid)', 'empresas_para_acceso()', 'catalogo_organizacion()', 'nombres_relacionados()',
                           'emitir_constancia(uuid, uuid, text)', 'acreditar_si_cumple(uuid)',
                           'confirmar_validacion(uuid, boolean)', 'ranking_equipo(date)', 'proceso_diario(int)'] LOOP
    EXECUTE format('ALTER FUNCTION nexo.%s OWNER TO nexo_owner', f);
    EXECUTE format('REVOKE ALL ON FUNCTION nexo.%s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION nexo.%s TO nexo_app', f);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION hoy() TO nexo_app;

COMMIT;
