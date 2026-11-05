// Pruebas unitarias del motor de permisos (matriz de la Etapa 2, separación de funciones).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puede, type AsignacionRol, type Contexto, type PermisoEspecial } from '../src/permisos.ts';

const E1 = 'empresa-1', E2 = 'empresa-2', A1 = 'area-ensamble', A2 = 'area-pintura', T1 = 'turno-1', T2 = 'turno-2', C2 = 'curso-c2', C4 = 'curso-c4';
const rol = (r: Partial<AsignacionRol> & Pick<AsignacionRol, 'rol' | 'alcance'>): AsignacionRol =>
  ({ empresaId: null, plantaId: null, areaId: null, turnoId: null, ...r });
const ctx = (personaId: string, roles: AsignacionRol[], especiales: PermisoEspecial[] = []): Contexto => ({ personaId, grupoId: 'g', roles, especiales });

const admin = ctx('admin', [rol({ rol: 'administrador', alcance: 'empresa', empresaId: E1 })]);
const rhGrupo = ctx('rh', [rol({ rol: 'rh', alcance: 'grupo' })]);
const auditor = ctx('aud', [rol({ rol: 'auditor', alcance: 'empresa', empresaId: E1 })]);
const supervisor = ctx('sup', [rol({ rol: 'supervisor', alcance: 'area_turno', empresaId: E1, areaId: A1, turnoId: T2 })], [{ tipo: 'validador_practico', cursoId: C4 }]);
const instructor = ctx('ins', [rol({ rol: 'instructor', alcance: 'cursos', empresaId: E1 })], [{ tipo: 'curso_a_cargo', cursoId: C2 }]);
const trabajadora = ctx('rosa', [rol({ rol: 'trabajador', alcance: 'propio' })]);
const equipo = { personaId: 'rosa', empresaId: E1, areaId: A1, turnoId: T2 };

test('Auditor: consulta y exporta, pero no crea, aprueba ni revoca', () => {
  assert.ok(puede(auditor, 'personas.ver', { empresaId: E1 }).ok);
  assert.ok(puede(auditor, 'reportes.exportar', { empresaId: E1 }).ok);
  assert.ok(puede(auditor, 'bitacora.ver', { empresaId: E1 }).ok);
  for (const a of ['reglas.crear', 'excepciones.aprobar', 'constancias.revocar', 'constancias.reemitir', 'acceso.codigo', 'configuracion.editar'] as const) {
    assert.equal(puede(auditor, a, { empresaId: E1 }).ok, false, a);
  }
});

test('Supervisora: ve a su equipo (área y turno) y a nadie más', () => {
  assert.ok(puede(supervisor, 'asignaciones.ver', equipo).ok);
  assert.equal(puede(supervisor, 'asignaciones.ver', { ...equipo, areaId: A2 }).ok, false);
  assert.equal(puede(supervisor, 'asignaciones.ver', { ...equipo, turnoId: T1 }).ok, false);
  assert.ok(puede(supervisor, 'excepciones.solicitar', equipo).ok);
  assert.equal(puede(supervisor, 'excepciones.aprobar', equipo).ok, false);
  assert.equal(puede(supervisor, 'bitacora.ver', equipo).ok, false);
});

test('Validación práctica: solo validadores del curso, dentro del alcance y nunca sobre sí mismos', () => {
  assert.ok(puede(supervisor, 'validacion.registrar', { ...equipo, cursoId: C4 }).ok);
  assert.equal(puede(supervisor, 'validacion.registrar', { ...equipo, cursoId: C2 }).ok, false, 'no es validadora de C2');
  assert.equal(puede(supervisor, 'validacion.registrar', { ...equipo, areaId: A2, cursoId: C4 }).ok, false, 'fuera de su equipo');
  assert.equal(puede(supervisor, 'validacion.registrar', { personaId: 'sup', empresaId: E1, areaId: A1, turnoId: T2, cursoId: C4 }).ok, false, 'a sí misma');
});

test('Instructora: solo los cursos a su cargo', () => {
  assert.ok(puede(instructor, 'asignaciones.ver', { ...equipo, cursoId: C2 }).ok);
  assert.equal(puede(instructor, 'asignaciones.ver', { ...equipo, cursoId: C4 }).ok, false);
  assert.ok(puede(instructor, 'excepciones.intentos', { ...equipo, cursoId: C2 }).ok);
  assert.equal(puede(instructor, 'excepciones.aprobar', { ...equipo, cursoId: C2 }).ok, false);
});

test('Trabajadora: solo sus propios datos', () => {
  assert.ok(puede(trabajadora, 'asignaciones.ver', equipo).ok);
  assert.ok(puede(trabajadora, 'reportes.exportar', { personaId: 'rosa' }).ok);
  assert.equal(puede(trabajadora, 'asignaciones.ver', { ...equipo, personaId: 'otra' }).ok, false);
  assert.equal(puede(trabajadora, 'constancias.reemitir', equipo).ok, false);
  assert.equal(puede(trabajadora, 'personas.editar', equipo).ok, false);
});

test('Administrador de empresa: su empresa sí, otra no, y nunca sobre sí mismo', () => {
  assert.ok(puede(admin, 'acceso.codigo', { personaId: 'rosa', empresaId: E1 }).ok);
  assert.equal(puede(admin, 'acceso.codigo', { personaId: 'jorge', empresaId: E2 }).ok, false);
  const propio = puede(admin, 'acceso.codigo', { personaId: 'admin', empresaId: E1 });
  assert.equal(propio.ok, false);
  assert.match(propio.motivo ?? '', /Separación de funciones/);
  assert.equal(puede(admin, 'roles.otorgar', { personaId: 'admin', empresaId: E1 }).ok, false);
});

test('Restablecer acceso es del Administrador (B-3); RH no, salvo delegación aprobada (D-36)', () => {
  assert.equal(puede(rhGrupo, 'acceso.codigo', { personaId: 'rosa', empresaId: E1 }).ok, false);
  const delegada = ctx('sup', supervisor.roles, [...supervisor.especiales, { tipo: 'restablecer_acceso', cursoId: null }]);
  assert.ok(puede(delegada, 'acceso.codigo', { personaId: 'rosa', empresaId: E1 }).ok);
});

test('RH con alcance de grupo actúa en cualquier empresa del grupo', () => {
  assert.ok(puede(rhGrupo, 'reglas.crear', { empresaId: E1 }).ok);
  assert.ok(puede(rhGrupo, 'constancias.revocar', { empresaId: E2 }).ok);
});

test('Aprobar contenido: Administrador o aprobador designado del curso', () => {
  assert.equal(puede(instructor, 'contenido.aprobar', { cursoId: C4 }).ok, false);
  const aprobadora = ctx('apr', instructor.roles, [{ tipo: 'aprobador_contenido', cursoId: C4 }]);
  assert.ok(puede(aprobadora, 'contenido.aprobar', { cursoId: C4 }).ok);
  assert.equal(puede(aprobadora, 'contenido.aprobar', { cursoId: C2 }).ok, false);
});
