-- =====================================================================
-- Nexo · Migración 003: acceso, sesiones y permisos especiales (módulo M2)
-- Antes de iniciar sesión no hay usuario en el contexto y la seguridad por
-- fila no deja ver nada. Por eso el acceso usa funciones acotadas
-- (SECURITY DEFINER) que hacen solo lo indispensable y nunca devuelven
-- datos de otras personas.
-- =====================================================================
BEGIN;
SET search_path = nexo, public;

-- Sesiones del lado del servidor: se guarda solo la huella del token
ALTER TABLE sesiones
  ADD COLUMN hash_token       text NOT NULL UNIQUE CHECK (hash_token ~ '^[0-9a-f]{64}$'),
  ADD COLUMN ultimo_uso       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN inactividad_max  interval NOT NULL,
  ADD COLUMN origen           text;

-- Intentos de acceso para demoras progresivas (sin bloqueo permanente, RNF-AUT-02)
CREATE TABLE intentos_acceso (
  id           bigserial PRIMARY KEY,
  clave        text NOT NULL,            -- huella de empresa + número de empleado; nunca el número en claro
  origen       text NOT NULL,
  exito        boolean NOT NULL,
  ocurrido_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intentos_acceso_clave ON intentos_acceso (clave, ocurrido_en DESC);
CREATE INDEX intentos_acceso_origen ON intentos_acceso (origen, ocurrido_en DESC);
ALTER TABLE intentos_acceso OWNER TO nexo_owner;
ALTER TABLE intentos_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_acceso FORCE ROW LEVEL SECURITY;   -- sin políticas: la aplicación no la lee directamente

-- Permisos especiales por curso o tema (docs/etapa-2/02-matriz-de-permisos.md §3)
CREATE TABLE permisos_especiales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL,
  persona_id     uuid NOT NULL,
  tipo           text NOT NULL CHECK (tipo IN ('curso_a_cargo', 'revisor', 'aprobador_contenido', 'validador_practico', 'restablecer_acceso')),
  curso_id       uuid,
  empresa_id     uuid,
  vigente_desde  date NOT NULL DEFAULT current_date,
  vigente_hasta  date,
  otorgado_por   uuid NOT NULL,
  FOREIGN KEY (persona_id, grupo_id) REFERENCES personas(id, grupo_id),
  FOREIGN KEY (curso_id, grupo_id) REFERENCES cursos(id, grupo_id),
  CHECK (otorgado_por <> persona_id),
  CHECK (tipo IN ('restablecer_acceso') OR curso_id IS NOT NULL)
);
ALTER TABLE permisos_especiales OWNER TO nexo_owner;
ALTER TABLE permisos_especiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_especiales FORCE ROW LEVEL SECURITY;
CREATE POLICY aislamiento ON permisos_especiales
  USING (grupo_id = (SELECT nexo.mi_grupo()) AND persona_id IN (SELECT id FROM nexo.personas))
  WITH CHECK (grupo_id = (SELECT nexo.mi_grupo()) AND persona_id IN (SELECT id FROM nexo.personas));
CREATE TRIGGER bitacora AFTER INSERT OR UPDATE OR DELETE ON permisos_especiales FOR EACH ROW EXECUTE FUNCTION auditar();
GRANT SELECT, INSERT, UPDATE ON permisos_especiales TO nexo_app;

-- ---------- Funciones de acceso (sin usuario en el contexto) ----------
-- Busca la cuenta por empresa y número de empleado vigente
CREATE FUNCTION cuenta_para_acceso(p_empresa uuid, p_numero text)
RETURNS TABLE (persona_id uuid, grupo_id uuid, estado text, hash_frase text, acceso_vigente boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  SELECT p.id, p.grupo_id, coalesce(c.estado, 'sin_activar'), c.hash_frase,
         (p.tipo = 'empleado' OR p.acceso_vence >= current_date)
    FROM nexo.numeros_empleado n
    JOIN nexo.personas p ON p.id = n.persona_id
    LEFT JOIN nexo.cuentas c ON c.persona_id = p.id
   WHERE n.empresa_id = p_empresa AND upper(n.numero) = upper(p_numero) AND n.vigente_hasta IS NULL
$$;

-- Códigos de activación o restablecimiento vigentes de una persona (solo huellas)
CREATE FUNCTION codigos_vigentes(p_persona uuid)
RETURNS TABLE (id uuid, hash_codigo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  SELECT id, hash_codigo FROM nexo.codigos_acceso
   WHERE persona_id = p_persona AND usado_en IS NULL AND expira_en > now()
$$;

-- Activa la cuenta: consume el código, guarda la huella de la frase y cierra sesiones anteriores
CREATE FUNCTION activar_cuenta(p_persona uuid, p_codigo uuid, p_hash_frase text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE v_grupo uuid; v_tipo text;
BEGIN
  UPDATE nexo.codigos_acceso SET usado_en = now()
   WHERE id = p_codigo AND persona_id = p_persona AND usado_en IS NULL AND expira_en > now()
   RETURNING grupo_id, tipo INTO v_grupo, v_tipo;
  IF v_grupo IS NULL THEN RAISE EXCEPTION 'Código no válido' USING ERRCODE = 'invalid_authorization_specification'; END IF;
  -- Un código nuevo invalida los demás pendientes de la misma persona
  UPDATE nexo.codigos_acceso SET usado_en = now() WHERE persona_id = p_persona AND usado_en IS NULL;
  INSERT INTO nexo.cuentas (persona_id, grupo_id, estado, hash_frase) VALUES (p_persona, v_grupo, 'activa', p_hash_frase)
  ON CONFLICT (persona_id) DO UPDATE SET estado = 'activa', hash_frase = excluded.hash_frase;
  UPDATE nexo.sesiones SET revocada_en = now() WHERE persona_id = p_persona AND revocada_en IS NULL;
  INSERT INTO nexo.bitacora (grupo_id, actor_id, accion, tabla, registro_id, despues)
  VALUES (v_grupo, p_persona, CASE v_tipo WHEN 'activacion' THEN 'Activar cuenta' ELSE 'Crear nueva frase tras restablecimiento' END,
          'cuentas', p_persona::text, jsonb_build_object('sesiones_cerradas', true));
END $$;

CREATE FUNCTION crear_sesion(p_persona uuid, p_hash_token text, p_compartido boolean, p_inactividad interval, p_duracion interval, p_origen text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE v_id uuid; v_grupo uuid;
BEGIN
  SELECT grupo_id INTO v_grupo FROM nexo.cuentas WHERE persona_id = p_persona AND estado = 'activa';
  IF v_grupo IS NULL THEN RAISE EXCEPTION 'Cuenta no activa' USING ERRCODE = 'invalid_authorization_specification'; END IF;
  INSERT INTO nexo.sesiones (grupo_id, persona_id, equipo_compartido, expira_en, hash_token, inactividad_max, origen)
  VALUES (v_grupo, p_persona, p_compartido, now() + p_duracion, p_hash_token, p_inactividad, p_origen)
  RETURNING id INTO v_id;
  UPDATE nexo.cuentas SET ultimo_acceso = now() WHERE persona_id = p_persona;
  INSERT INTO nexo.bitacora (grupo_id, actor_id, accion, tabla, registro_id, despues)
  VALUES (v_grupo, p_persona, 'Inicio de sesión', 'sesiones', v_id::text,
          jsonb_build_object('equipo_compartido', p_compartido, 'origen', p_origen));
  RETURN v_id;
END $$;

-- Valida la sesión: vencida, revocada o inactiva más del máximo => no es válida (y se revoca)
CREATE FUNCTION sesion_valida(p_hash_token text)
RETURNS TABLE (sesion_id uuid, persona_id uuid, grupo_id uuid, equipo_compartido boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE s nexo.sesiones%ROWTYPE;
BEGIN
  SELECT * INTO s FROM nexo.sesiones WHERE hash_token = p_hash_token FOR UPDATE;
  IF NOT FOUND OR s.revocada_en IS NOT NULL THEN RETURN; END IF;
  IF s.expira_en <= now() OR s.ultimo_uso + s.inactividad_max <= now()
     OR NOT EXISTS (SELECT 1 FROM nexo.cuentas c WHERE c.persona_id = s.persona_id AND c.estado = 'activa') THEN
    UPDATE nexo.sesiones SET revocada_en = now() WHERE id = s.id;
    RETURN;
  END IF;
  UPDATE nexo.sesiones SET ultimo_uso = now() WHERE id = s.id;
  RETURN QUERY SELECT s.id, s.persona_id, s.grupo_id, s.equipo_compartido;
END $$;

CREATE FUNCTION cerrar_sesion(p_hash_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE s nexo.sesiones%ROWTYPE;
BEGIN
  UPDATE nexo.sesiones SET revocada_en = now() WHERE hash_token = p_hash_token AND revocada_en IS NULL RETURNING * INTO s;
  IF FOUND THEN
    INSERT INTO nexo.bitacora (grupo_id, actor_id, accion, tabla, registro_id) VALUES (s.grupo_id, s.persona_id, 'Cierre de sesión', 'sesiones', s.id::text);
  END IF;
END $$;

CREATE FUNCTION registrar_intento_acceso(p_clave text, p_origen text, p_exito boolean) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
  INSERT INTO nexo.intentos_acceso (clave, origen, exito) VALUES (p_clave, p_origen, p_exito)
$$;

-- Segundos que hay que esperar antes de otro intento. Demora progresiva por cuenta
-- (desde el tercer fallo: 2, 4, 8 … hasta 60 s) y por origen (20 fallos en 15 min: 60 s).
CREATE FUNCTION espera_acceso(p_clave text, p_origen text) RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = nexo, pg_temp AS $$
DECLARE v_fallos int; v_ultimo timestamptz; v_exito timestamptz; v_espera numeric := 0; v_origen int;
BEGIN
  SELECT max(ocurrido_en) INTO v_exito FROM nexo.intentos_acceso WHERE clave = p_clave AND exito;
  SELECT count(*), max(ocurrido_en) INTO v_fallos, v_ultimo FROM nexo.intentos_acceso
   WHERE clave = p_clave AND NOT exito AND ocurrido_en > now() - interval '15 minutes'
     AND (v_exito IS NULL OR ocurrido_en > v_exito);
  IF v_fallos >= 3 THEN
    v_espera := greatest(0, least(power(2, v_fallos - 2), 60) - extract(epoch FROM now() - v_ultimo));
  END IF;
  SELECT count(*) INTO v_origen FROM nexo.intentos_acceso WHERE origen = p_origen AND NOT exito AND ocurrido_en > now() - interval '15 minutes';
  IF v_origen >= 20 THEN v_espera := greatest(v_espera, 60); END IF;
  RETURN ceil(v_espera)::int;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['cuenta_para_acceso(uuid, text)', 'codigos_vigentes(uuid)', 'activar_cuenta(uuid, uuid, text)',
                           'crear_sesion(uuid, text, boolean, interval, interval, text)', 'sesion_valida(text)', 'cerrar_sesion(text)',
                           'registrar_intento_acceso(text, text, boolean)', 'espera_acceso(text, text)'] LOOP
    EXECUTE format('ALTER FUNCTION nexo.%s OWNER TO nexo_owner', f);
    EXECUTE format('REVOKE ALL ON FUNCTION nexo.%s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION nexo.%s TO nexo_app', f);
  END LOOP;
END $$;

COMMIT;
