-- =====================================================================
-- Nexo · Pruebas del núcleo de datos (aislamiento, integridad, bitácora)
-- Se ejecutan con app/db/pruebas/ejecutar.sh sobre una base temporal.
-- DATOS FICTICIOS. Cada comprobación imprime «OK · …»; la primera falla detiene todo.
-- =====================================================================
\set ON_ERROR_STOP 1
\set QUIET 1
SET client_min_messages = notice;

-- ---------- Utilidades de prueba ----------
CREATE SCHEMA pruebas;
GRANT USAGE ON SCHEMA pruebas TO nexo_app;
CREATE FUNCTION pruebas.ok(p_nombre text, p_cond boolean, p_detalle text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond THEN RAISE NOTICE 'OK · %', p_nombre;
  ELSE RAISE EXCEPTION 'FALLA · % %', p_nombre, p_detalle; END IF;
END $$;
CREATE FUNCTION pruebas.falla(p_nombre text, p_sql text, p_esperado text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF position(lower(p_esperado) IN lower(SQLERRM)) = 0 THEN
      RAISE EXCEPTION 'FALLA · % · error distinto al esperado («%»): %', p_nombre, p_esperado, SQLERRM;
    END IF;
    RAISE NOTICE 'OK · % · rechazado: %', p_nombre, left(SQLERRM, 110);
    RETURN;
  END;
  RAISE EXCEPTION 'FALLA · % · se esperaba un rechazo y la operación se permitió', p_nombre;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pruebas TO nexo_app;

-- Cambia el usuario de la sesión: la aplicación solo indica quién es
CREATE FUNCTION pruebas.como(p_usuario text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('app.usuario_id', coalesce(p_usuario, ''), false) $$;
GRANT EXECUTE ON FUNCTION pruebas.como(text) TO nexo_app;

-- ---------- Datos ficticios (como superusuario) ----------
SET search_path = nexo, public;
INSERT INTO grupos (id, nombre) VALUES
 ('a0000000-0000-0000-0000-000000000001', 'Grupo Prueba A (ficticio)'),
 ('a0000000-0000-0000-0000-000000000002', 'Grupo Prueba B (ficticio)');
INSERT INTO empresas (id, grupo_id, nombre, prefijo_folio) VALUES
 ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Empresa Demo Norte', 'DN'),
 ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Empresa Demo Sur', 'DS'),
 ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Empresa Demo Externa', 'DX');
INSERT INTO plantas (id, grupo_id, empresa_id, nombre, zona_horaria) VALUES
 ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Planta Demo 1', 'America/Monterrey'),
 ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Planta Demo 2', 'America/Mexico_City'),
 ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Planta Demo 3', 'America/Mexico_City');
INSERT INTO areas (id, grupo_id, empresa_id, planta_id, nombre) VALUES
 ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ensamble'),
 ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Pintura'),
 ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Almacén');
INSERT INTO turnos (id, grupo_id, empresa_id, planta_id, clave, nombre) VALUES
 ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'T2', 'Turno 2'),
 ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'T1', 'Turno 1'),
 ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'T1', 'Turno 1');
INSERT INTO puestos (id, grupo_id, nombre) VALUES
 ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Operador(a)'),
 ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Operador(a)');
INSERT INTO personas (id, grupo_id, nombre_completo, tipo) VALUES
 ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ana Ruiz (RH del grupo)', 'empleado'),
 ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Elena Mar (RH de Demo Norte)', 'empleado'),
 ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Laura Peña (supervisora)', 'empleado'),
 ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Rosa Ibarra (Demo Norte)', 'empleado'),
 ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Jorge Torres (Demo Sur)', 'empleado'),
 ('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Inés Lara (autora)', 'empleado'),
 ('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Raúl Ortiz (aprobador)', 'empleado'),
 ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Persona RH del Grupo B', 'empleado'),
 ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Persona trabajadora del Grupo B', 'empleado');
INSERT INTO numeros_empleado (grupo_id, empresa_id, persona_id, numero, vigente_desde) VALUES
 ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '004817', '2025-01-10'),
 ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '003102', '2024-03-04');
INSERT INTO adscripciones (grupo_id, empresa_id, persona_id, planta_id, area_id, turno_id, puesto_id, vigencia) VALUES
 ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', daterange('2026-03-01', NULL)),
 ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', daterange('2019-06-17', NULL)),
 ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', daterange('2024-03-04', NULL)),
 ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', daterange('2024-01-01', NULL));
INSERT INTO asignaciones_rol (grupo_id, persona_id, rol, alcance, empresa_id, area_id, turno_id) VALUES
 ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'rh', 'grupo', NULL, NULL, NULL),
 ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'rh', 'empresa', 'b0000000-0000-0000-0000-000000000001', NULL, NULL),
 ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'supervisor', 'area_turno', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'trabajador', 'propio', NULL, NULL, NULL),
 ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'trabajador', 'propio', NULL, NULL, NULL),
 ('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'rh', 'grupo', NULL, NULL, NULL);
INSERT INTO cursos (id, grupo_id, clave, nombre, clasificacion, es_demo) VALUES
 ('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'C4', 'Uso de la prensa demo', 'seguridad', true),
 ('30000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'X1', 'Curso del Grupo B', 'interno', true);
INSERT INTO versiones_curso (id, grupo_id, curso_id, numero, estado, contenido, criterios, fuentes, autor_id, aprobada_por, publicada_en) VALUES
 ('31000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, 'publicada',
  '{"lecciones": ["L1", "L2", "L3", "L4"]}', '{"requiere_evaluacion": true, "calificacion_minima": 80, "intentos": 3, "requiere_practica": true, "vigencia_meses": 12}',
  '[{"documento": "DEMO · fuente ficticia"}]', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', now()),
 ('31000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009', 1, 'borrador', '{}', '{}', '[]', '20000000-0000-0000-0000-000000000001', NULL, NULL);
INSERT INTO asignaciones (id, grupo_id, empresa_id, persona_id, curso_id, fecha_limite) VALUES
 ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '2026-11-30'),
 ('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', '2026-11-30'),
 ('40000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009', '2026-11-30');
INSERT INTO participaciones (id, grupo_id, empresa_id, asignacion_id, persona_id, curso_id, version_id, iniciada_en, lecciones_completadas) VALUES
 ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', now(), '{L1,L2,L3,L4}');

\echo '== 1. Aislamiento entre grupos y empresas (seguridad por fila)'
SET ROLE nexo_app;
SELECT pruebas.como(NULL);
SELECT pruebas.ok('Sin usuario en el contexto no se ve ninguna persona ni asignación',
  (SELECT count(*) FROM nexo.personas) = 0 AND (SELECT count(*) FROM nexo.asignaciones) = 0);

SELECT pruebas.como('10000000-0000-0000-0000-000000000001');  -- RH con alcance de grupo A
SELECT pruebas.ok('RH de grupo ve las asignaciones de sus dos empresas y ninguna del grupo B',
  (SELECT count(*) FROM nexo.asignaciones) = 2 AND NOT EXISTS (SELECT 1 FROM nexo.asignaciones WHERE grupo_id = 'a0000000-0000-0000-0000-000000000002'));
SELECT pruebas.ok('RH de grupo ve las 7 personas de su grupo y ninguna del grupo B', (SELECT count(*) FROM nexo.personas) = 7);
SELECT pruebas.ok('RH de grupo no ve empresas de otro grupo', (SELECT count(*) FROM nexo.empresas) = 2);

SELECT pruebas.como('10000000-0000-0000-0000-000000000002');  -- RH solo de Demo Norte
SELECT pruebas.ok('RH de empresa ve solo las asignaciones de su empresa',
  (SELECT count(*) FROM nexo.asignaciones) = 1 AND (SELECT empresa_id FROM nexo.asignaciones) = 'b0000000-0000-0000-0000-000000000001');
SELECT pruebas.ok('RH de empresa no ve a personas adscritas solo a otra empresa',
  NOT EXISTS (SELECT 1 FROM nexo.personas WHERE id = '10000000-0000-0000-0000-000000000005'));
SELECT pruebas.ok('RH de empresa no ve el número de empleado de otra empresa', (SELECT count(*) FROM nexo.numeros_empleado) = 1);
SELECT pruebas.falla('RH de empresa no puede crear asignaciones en otra empresa del grupo',
  $q$INSERT INTO nexo.asignaciones (grupo_id, empresa_id, persona_id, curso_id, fecha_limite) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', '2026-12-31')$q$,
  'row-level security');
SELECT pruebas.falla('RH de empresa no puede escribir en otro grupo',
  $q$INSERT INTO nexo.asignaciones (grupo_id, empresa_id, persona_id, curso_id, fecha_limite) VALUES ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009', '2026-12-31')$q$,
  'row-level security');
DO $$ DECLARE n int; BEGIN
  UPDATE nexo.asignaciones SET fecha_limite = '2027-01-01' WHERE id = '40000000-0000-0000-0000-000000000002';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pruebas.ok('Actualizar registros fuera del alcance no afecta ninguna fila', n = 0);
END $$;

SELECT pruebas.como('10000000-0000-0000-0000-000000000004');  -- trabajadora
SELECT pruebas.ok('La trabajadora ve solo su propia asignación y su propio registro',
  (SELECT count(*) FROM nexo.asignaciones) = 1 AND (SELECT count(*) FROM nexo.personas) = 1);

SELECT pruebas.como('20000000-0000-0000-0000-000000000001');  -- RH del grupo B
SELECT pruebas.ok('Otro grupo no ve nada del grupo A',
  NOT EXISTS (SELECT 1 FROM nexo.personas WHERE grupo_id = 'a0000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM nexo.cursos WHERE grupo_id = 'a0000000-0000-0000-0000-000000000001'));
RESET ROLE;

SELECT pruebas.falla('Las llaves compuestas impiden ligar una planta a la empresa de otro grupo',
  $q$INSERT INTO nexo.plantas (grupo_id, empresa_id, nombre, zona_horaria) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Planta mezclada', 'America/Monterrey')$q$,
  'foreign key');

\echo '== 2. Integridad de asignaciones, personas e historial'
SET ROLE nexo_app;
SELECT pruebas.como('10000000-0000-0000-0000-000000000001');
SELECT pruebas.falla('Una sola asignación activa por persona y curso',
  $q$INSERT INTO nexo.asignaciones (grupo_id, empresa_id, persona_id, curso_id, fecha_limite) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '2026-12-31')$q$,
  'asignacion_activa_unica');
SELECT pruebas.falla('El número de empleado vigente es único dentro de la empresa',
  $q$INSERT INTO nexo.numeros_empleado (grupo_id, empresa_id, persona_id, numero, vigente_desde) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '004817', '2026-01-01')$q$,
  'numeros_empleado_vigente_unico');
INSERT INTO nexo.numeros_empleado (grupo_id, empresa_id, persona_id, numero, vigente_desde)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '004817', '2026-01-01');
SELECT pruebas.ok('El mismo número puede existir en otra empresa del grupo (D-47)', true);
SELECT pruebas.falla('Las adscripciones de una persona no se traslapan',
  $q$INSERT INTO nexo.adscripciones (grupo_id, empresa_id, persona_id, planta_id, area_id, turno_id, puesto_id, vigencia) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', daterange('2026-06-01', NULL))$q$,
  'conflicting key value violates exclusion constraint');
SELECT pruebas.falla('Cancelar una asignación exige motivo',
  $q$UPDATE nexo.asignaciones SET estado = 'cancelada' WHERE id = '40000000-0000-0000-0000-000000000001'$q$, 'check constraint');
SELECT pruebas.falla('La aplicación no puede borrar registros (nada se borra)',
  $q$DELETE FROM nexo.asignaciones WHERE id = '40000000-0000-0000-0000-000000000001'$q$, 'permission denied');
SELECT pruebas.falla('Nadie se otorga roles a sí mismo (SoD-03)',
  $q$INSERT INTO nexo.asignaciones_rol (grupo_id, persona_id, rol, alcance, otorgado_por) VALUES ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'administrador', 'grupo', '10000000-0000-0000-0000-000000000001')$q$,
  'check constraint');

\echo '== 3. Contenido: versiones publicadas y separación de funciones'
SELECT pruebas.falla('Una versión publicada no se modifica',
  $q$UPDATE nexo.versiones_curso SET criterios = jsonb_set(criterios, '{calificacion_minima}', '60') WHERE id = '31000000-0000-0000-0000-000000000001'$q$,
  'ya fue publicada');
SELECT pruebas.falla('No se publica una versión con criterios incompletos',
  $q$INSERT INTO nexo.versiones_curso (grupo_id, curso_id, numero, estado, criterios, fuentes, autor_id, aprobada_por, publicada_en) VALUES ('a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 2, 'publicada', '{"requiere_evaluacion": true, "requiere_practica": true, "vigencia_meses": 12}', '[{"documento": "x"}]', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', now())$q$,
  'check constraint');
SELECT pruebas.falla('El autor no aprueba su propio curso de seguridad (SoD-01)',
  $q$INSERT INTO nexo.versiones_curso (grupo_id, curso_id, numero, estado, criterios, fuentes, autor_id, aprobada_por, publicada_en) VALUES ('a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 2, 'publicada', '{"requiere_evaluacion": false, "requiere_practica": true, "vigencia_meses": 12}', '[{"documento": "x"}]', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', now())$q$,
  'separación de funciones');
SELECT pruebas.falla('Un curso de seguridad no se publica sin fuentes',
  $q$INSERT INTO nexo.versiones_curso (grupo_id, curso_id, numero, estado, criterios, fuentes, autor_id, aprobada_por, publicada_en) VALUES ('a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 2, 'publicada', '{"requiere_evaluacion": false, "requiere_practica": true, "vigencia_meses": 12}', '[]', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', now())$q$,
  'requiere fuentes');
UPDATE nexo.versiones_curso SET estado = 'archivada' WHERE id = '31000000-0000-0000-0000-000000000001';
SELECT pruebas.ok('Archivar una versión publicada sí se permite',
  (SELECT estado FROM nexo.versiones_curso WHERE id = '31000000-0000-0000-0000-000000000001') = 'archivada');

\echo '== 4. Evaluación y validación práctica'
SELECT pruebas.como('10000000-0000-0000-0000-000000000004');  -- la trabajadora presenta su evaluación
INSERT INTO nexo.intentos (grupo_id, empresa_id, participacion_id, numero) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1);
SELECT pruebas.falla('Solo un intento abierto a la vez',
  $q$INSERT INTO nexo.intentos (grupo_id, empresa_id, participacion_id, numero) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 2)$q$,
  'intento_abierto_unico');
UPDATE nexo.intentos SET enviado_en = now(), calificacion = 86, aprobado = true WHERE participacion_id = '50000000-0000-0000-0000-000000000001' AND numero = 1;
SELECT pruebas.falla('Un intento enviado no se modifica (envío idempotente)',
  $q$UPDATE nexo.intentos SET calificacion = 100 WHERE participacion_id = '50000000-0000-0000-0000-000000000001' AND numero = 1$q$,
  'ya fue enviado');
SELECT pruebas.falla('Un número de intento no se repite',
  $q$INSERT INTO nexo.intentos (grupo_id, empresa_id, participacion_id, numero) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1)$q$,
  'duplicate key');
SELECT pruebas.falla('La trabajadora no ve ni escribe intentos de participaciones ajenas',
  $q$INSERT INTO nexo.intentos (grupo_id, empresa_id, participacion_id, numero) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000099', 1)$q$,
  'row-level security');

SELECT pruebas.como('10000000-0000-0000-0000-000000000003');  -- supervisora y validadora
SELECT pruebas.falla('Resultado «aún no competente» exige observaciones',
  $q$INSERT INTO nexo.validaciones (grupo_id, empresa_id, participacion_id, validador_id, fecha_practica, criterios, resultado) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', current_date, '["cumple", "no"]', 'aun_no_competente')$q$,
  'check constraint');
INSERT INTO nexo.validaciones (id, grupo_id, empresa_id, participacion_id, validador_id, fecha_practica, criterios, resultado)
  VALUES ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', current_date, '["cumple", "cumple", "cumple", "cumple"]', 'competente');
SELECT pruebas.falla('Una validación registrada no se edita',
  $q$UPDATE nexo.validaciones SET resultado = 'aun_no_competente', observaciones = 'x' WHERE id = '60000000-0000-0000-0000-000000000001'$q$,
  'no se edita');
RESET ROLE;
SELECT pruebas.falla('Nadie valida su propia práctica (SoD-02)',
  $q$INSERT INTO nexo.validaciones (grupo_id, empresa_id, participacion_id, validador_id, fecha_practica, criterios, resultado) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', current_date, '[]', 'competente')$q$,
  'separación de funciones');
SELECT pruebas.falla('Nadie aprueba una excepción a su favor (SoD-02)',
  $q$INSERT INTO nexo.excepciones (grupo_id, empresa_id, asignacion_id, tipo, motivo, vigente_hasta, aprobada_por) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'exencion', 'prueba', '2027-01-01', '10000000-0000-0000-0000-000000000004')$q$,
  'separación de funciones');

\echo '== 5. Acreditación, folios y constancias'
SET ROLE nexo_app;
SELECT pruebas.como('10000000-0000-0000-0000-000000000002');  -- RH de Demo Norte
INSERT INTO nexo.acreditaciones (id, grupo_id, empresa_id, persona_id, curso_id, version_id, participacion_id, fecha, vence, calificacion)
  VALUES ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', current_date, current_date + interval '12 months', 86);
DO $$ DECLARE f1 text; f2 text; f3 text; BEGIN
  f1 := nexo.siguiente_folio('b0000000-0000-0000-0000-000000000001', '2026-11-05');
  f2 := nexo.siguiente_folio('b0000000-0000-0000-0000-000000000001', '2026-11-05');
  f3 := nexo.siguiente_folio('b0000000-0000-0000-0000-000000000001', '2027-01-02');
  PERFORM pruebas.ok('Folios consecutivos por empresa y año', f1 = 'DN-2026-000001' AND f2 = 'DN-2026-000002' AND f3 = 'DN-2027-000001', f1 || ' ' || f2 || ' ' || f3);
END $$;
SELECT pruebas.falla('No se generan folios de una empresa fuera del alcance',
  $q$SELECT nexo.siguiente_folio('b0000000-0000-0000-0000-000000000002', '2026-11-05')$q$, 'fuera del alcance');
INSERT INTO nexo.constancias (id, grupo_id, empresa_id, acreditacion_id, folio, datos_emitidos)
  VALUES ('71000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', nexo.siguiente_folio('b0000000-0000-0000-0000-000000000001', '2026-11-05'), '{"nombre": "Rosa Ibarra"}');
SELECT pruebas.falla('Una sola constancia vigente por acreditación (emisión repetida)',
  $q$INSERT INTO nexo.constancias (grupo_id, empresa_id, acreditacion_id, folio, datos_emitidos) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'DN-2026-999999', '{}')$q$,
  'constancia_vigente_unica');
SELECT pruebas.falla('Los datos emitidos de una constancia no se modifican',
  $q$UPDATE nexo.constancias SET datos_emitidos = '{"nombre": "Otra persona"}' WHERE id = '71000000-0000-0000-0000-000000000001'$q$,
  'no se modifica');
UPDATE nexo.constancias SET estado = 'sustituida' WHERE id = '71000000-0000-0000-0000-000000000001';
INSERT INTO nexo.constancias (grupo_id, empresa_id, acreditacion_id, folio, datos_emitidos, sustituye_a, motivo)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', nexo.siguiente_folio('b0000000-0000-0000-0000-000000000001', '2026-11-05'), '{"nombre": "Rosa Elena Ibarra"}', '71000000-0000-0000-0000-000000000001', 'Corrección del nombre');
SELECT pruebas.ok('Reemitir: la anterior queda sustituida y la nueva la referencia con otro folio',
  (SELECT count(*) FROM nexo.constancias WHERE acreditacion_id = '70000000-0000-0000-0000-000000000001') = 2
  AND (SELECT folio FROM nexo.constancias WHERE sustituye_a IS NOT NULL) = 'DN-2026-000004');
SELECT pruebas.falla('Una constancia sustituida no vuelve a vigente',
  $q$UPDATE nexo.constancias SET estado = 'vigente' WHERE id = '71000000-0000-0000-0000-000000000001'$q$, 'no permitido');
SELECT pruebas.falla('Revocar una acreditación exige motivo',
  $q$UPDATE nexo.acreditaciones SET estado = 'revocada', revocada_en = now() WHERE id = '70000000-0000-0000-0000-000000000001'$q$, 'check constraint');
SELECT pruebas.falla('Los datos de una acreditación no se modifican',
  $q$UPDATE nexo.acreditaciones SET vence = vence + 365 WHERE id = '70000000-0000-0000-0000-000000000001'$q$, 'solo puede revocarse');
UPDATE nexo.acreditaciones SET estado = 'revocada', revocada_en = now(), revocada_por = '10000000-0000-0000-0000-000000000002', revocada_motivo = 'Prueba: registrada por error' WHERE id = '70000000-0000-0000-0000-000000000001';
SELECT pruebas.falla('Una acreditación revocada no vuelve a vigente',
  $q$UPDATE nexo.acreditaciones SET estado = 'vigente' WHERE id = '70000000-0000-0000-0000-000000000001'$q$, 'revocada no se modifica');

\echo '== 6. Bitácora'
SELECT pruebas.ok('Los cambios quedan en la bitácora con quién los hizo',
  (SELECT count(*) FROM nexo.bitacora WHERE tabla = 'acreditaciones' AND accion = 'UPDATE' AND actor_id = '10000000-0000-0000-0000-000000000002' AND motivo = 'Prueba: registrada por error') = 1);
SELECT pruebas.ok('La bitácora guarda el valor anterior y el nuevo',
  (SELECT antes->>'estado' = 'vigente' AND despues->>'estado' = 'revocada' FROM nexo.bitacora WHERE tabla = 'acreditaciones' AND accion = 'UPDATE' LIMIT 1));
SELECT pruebas.falla('La aplicación no escribe directamente en la bitácora',
  $q$INSERT INTO nexo.bitacora (grupo_id, accion, tabla) VALUES ('a0000000-0000-0000-0000-000000000001', 'falsa', 'x')$q$, 'permission denied');
SELECT pruebas.falla('La aplicación no modifica la bitácora',
  $q$UPDATE nexo.bitacora SET accion = 'alterada'$q$, 'permission denied');
SELECT nexo.registrar_evento('Exportar', 'reportes', 'cumplimiento', '{"formato": "xlsx", "registros": 42}', 'b0000000-0000-0000-0000-000000000001');
SELECT pruebas.ok('Eventos sin cambio de tabla (exportaciones) se registran con su autor',
  EXISTS (SELECT 1 FROM nexo.bitacora WHERE accion = 'Exportar' AND actor_id = '10000000-0000-0000-0000-000000000002'));
RESET ROLE;
SELECT pruebas.falla('Ni el dueño de la base puede alterar la bitácora',
  $q$UPDATE nexo.bitacora SET accion = 'alterada'$q$, 'no se puede modificar');
SELECT pruebas.ok('La bitácora no guarda frases de acceso ni códigos',
  NOT EXISTS (SELECT 1 FROM nexo.bitacora WHERE despues ? 'hash_frase' OR antes ? 'hash_frase' OR despues ? 'hash_codigo'));
SET ROLE nexo_app;
SELECT pruebas.como('20000000-0000-0000-0000-000000000001');
SELECT pruebas.ok('Otro grupo no ve la bitácora del grupo A',
  NOT EXISTS (SELECT 1 FROM nexo.bitacora WHERE grupo_id = 'a0000000-0000-0000-0000-000000000001'));
RESET ROLE;

\echo 'FIN · todas las comprobaciones pasaron'
