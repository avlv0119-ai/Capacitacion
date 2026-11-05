// Motor de permisos por rol y alcance (docs/etapa-2/02-matriz-de-permisos.md).
// La base ya aísla por grupo y empresa; aquí se aplican la acción permitida, los alcances finos
// (planta, área y turno, cursos, propio) y la separación de funciones.
export type Rol = 'administrador' | 'rh' | 'instructor' | 'supervisor' | 'auditor' | 'trabajador';
export type Alcance = 'grupo' | 'empresa' | 'planta' | 'area_turno' | 'cursos' | 'propio';

export interface AsignacionRol {
  rol: Rol;
  alcance: Alcance;
  empresaId: string | null;
  plantaId: string | null;
  areaId: string | null;
  turnoId: string | null;
}

export interface PermisoEspecial {
  tipo: 'curso_a_cargo' | 'revisor' | 'aprobador_contenido' | 'validador_practico' | 'restablecer_acceso';
  cursoId: string | null;
}

export interface Contexto {
  personaId: string;
  grupoId: string;
  roles: AsignacionRol[];
  especiales: PermisoEspecial[];
}

/** Sobre qué registro se pregunta. Los campos ausentes significan «cualquiera dentro del alcance». */
export interface Objetivo {
  personaId?: string;
  empresaId?: string | null;
  plantaId?: string | null;
  areaId?: string | null;
  turnoId?: string | null;
  cursoId?: string | null;
}

export type Accion =
  | 'personas.ver' | 'personas.editar' | 'acceso.codigo' | 'roles.otorgar'
  | 'asignaciones.ver' | 'reglas.crear' | 'excepciones.aprobar' | 'excepciones.intentos' | 'excepciones.solicitar'
  | 'validacion.registrar' | 'contenido.editar' | 'contenido.aprobar'
  | 'constancias.ver' | 'constancias.reemitir' | 'constancias.revocar'
  | 'reportes.exportar' | 'bitacora.ver' | 'configuracion.editar';

// Roles que pueden realizar cada acción (dentro de su alcance). El auditor solo aparece en consultas y exportaciones.
const MATRIZ: Record<Accion, readonly Rol[]> = {
  'personas.ver': ['administrador', 'rh', 'supervisor', 'auditor', 'trabajador'],
  'personas.editar': ['administrador', 'rh'],
  'acceso.codigo': ['administrador'],                       // B-3: el Administrador; delegable con permiso especial (D-36)
  'roles.otorgar': ['administrador'],
  'asignaciones.ver': ['administrador', 'rh', 'instructor', 'supervisor', 'auditor', 'trabajador'],
  'reglas.crear': ['administrador', 'rh'],
  'excepciones.aprobar': ['administrador', 'rh'],
  'excepciones.intentos': ['administrador', 'rh', 'instructor'],
  'excepciones.solicitar': ['supervisor'],
  'validacion.registrar': ['administrador', 'rh', 'instructor', 'supervisor'], // además requiere ser validador del curso
  'contenido.editar': ['administrador', 'instructor'],
  'contenido.aprobar': ['administrador'],                   // los cursos normativos requieren aprobador designado
  'constancias.ver': ['administrador', 'rh', 'instructor', 'supervisor', 'auditor', 'trabajador'],
  'constancias.reemitir': ['administrador', 'rh'],
  'constancias.revocar': ['administrador', 'rh'],
  'reportes.exportar': ['administrador', 'rh', 'instructor', 'supervisor', 'auditor', 'trabajador'],
  'bitacora.ver': ['administrador', 'rh', 'auditor'],
  'configuracion.editar': ['administrador'],
};

// Acciones que nadie puede ejercer sobre sí mismo (SoD-02, SoD-03)
const NO_A_SI_MISMO = new Set<Accion>(['acceso.codigo', 'roles.otorgar', 'excepciones.aprobar', 'excepciones.intentos', 'validacion.registrar']);

function cubre(r: AsignacionRol, o: Objetivo, ctx: Contexto): boolean {
  switch (r.alcance) {
    case 'grupo': return true;   // las asignaciones de rol ya llegan filtradas por vigencia
    case 'empresa': return o.empresaId === undefined || o.empresaId === r.empresaId;
    case 'planta': return (o.empresaId === undefined || o.empresaId === r.empresaId) && (o.plantaId === undefined || o.plantaId === r.plantaId);
    case 'area_turno':
      return (o.empresaId === undefined || o.empresaId === r.empresaId)
        && (o.areaId === undefined || o.areaId === r.areaId)
        && (o.turnoId === undefined || o.turnoId === r.turnoId);
    case 'cursos': {
      const mios = ctx.especiales.filter(e => e.tipo === 'curso_a_cargo').map(e => e.cursoId);
      return o.cursoId === undefined ? mios.length > 0 : mios.includes(o.cursoId ?? null);
    }
    case 'propio': return o.personaId === ctx.personaId;
  }
}

export interface Decision { ok: boolean; motivo?: string }

export function puede(ctx: Contexto, accion: Accion, o: Objetivo = {}): Decision {
  if (NO_A_SI_MISMO.has(accion) && o.personaId === ctx.personaId) {
    return { ok: false, motivo: 'Separación de funciones: no puedes hacerlo sobre ti.' };
  }
  const roles = MATRIZ[accion];
  let candidatos = ctx.roles.filter(r => roles.includes(r.rol));
  // El trabajador solo actúa sobre sus propios datos, y solo exporta su reporte individual
  candidatos = candidatos.filter(r => r.rol !== 'trabajador' || o.personaId === ctx.personaId);

  if (accion === 'acceso.codigo' && !candidatos.length && ctx.especiales.some(e => e.tipo === 'restablecer_acceso')) {
    return { ok: true };   // delegación aprobada (D-36)
  }
  if (accion === 'validacion.registrar') {
    const autorizado = ctx.especiales.some(e => e.tipo === 'validador_practico' && e.cursoId === (o.cursoId ?? null));
    if (!autorizado) return { ok: false, motivo: 'No eres validador autorizado de este curso.' };
  }
  if (accion === 'contenido.aprobar' && ctx.especiales.some(e => (e.tipo === 'aprobador_contenido' || e.tipo === 'revisor') && e.cursoId === (o.cursoId ?? null))) {
    return { ok: true };
  }
  if (candidatos.some(r => cubre(r, o, ctx))) return { ok: true };
  return { ok: false, motivo: candidatos.length ? 'El registro está fuera de tu alcance.' : 'Tu rol no permite esta acción.' };
}

/** Espacio inicial al entrar: la consola solo existe para roles administrativos. */
export function espacioInicial(ctx: Contexto): 'aprender' | 'administrar' {
  return ctx.roles.some(r => r.rol !== 'trabajador') ? 'administrar' : 'aprender';
}

export function tieneRolAdministrativo(ctx: Contexto): boolean {
  return ctx.roles.some(r => ['administrador', 'rh', 'auditor'].includes(r.rol));
}
