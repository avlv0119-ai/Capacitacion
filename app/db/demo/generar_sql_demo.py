#!/usr/bin/env python3
"""Genera el SQL de los datos de demostración de Nexo a partir de los datos ficticios del prototipo.

DATOS FICTICIOS: personas, números de empleado, empresa, planta, cursos y resultados son inventados.
Solo el nombre del grupo (Grupo PIGSA88) es real.

Uso:
    python3 app/db/demo/generar_sql_demo.py [--hoy AAAA-MM-DD] [--salida archivo.sql]

--hoy desplaza todas las fechas para que el escenario quede igual respecto del día en que se carga
(el prototipo usa como «hoy» el 5 de noviembre de 2026).
"""
import argparse
import json
import uuid
from datetime import date, timedelta
from pathlib import Path

AQUI = Path(__file__).resolve().parent
NS = uuid.UUID('6f1d3b52-7c0e-4f3e-9d52-2a7c0d3e9b11')   # espacio para identificadores deterministas


def uid(*partes: str) -> str:
    return str(uuid.uuid5(NS, ':'.join(partes)))


def q(v) -> str:
    """Literal SQL seguro para los tipos usados aquí."""
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--hoy', help='fecha de carga (AAAA-MM-DD); por defecto, la del prototipo')
    ap.add_argument('--salida', default=str(AQUI / 'datos_demo.sql'))
    args = ap.parse_args()

    d = json.loads((AQUI / 'prototipo-demo.json').read_text(encoding='utf-8'))
    S, CURSOS, AREAS = d['S'], d['CURSOS'], d['AREAS']
    extra = json.loads((AQUI / 'contenido-demo.json').read_text(encoding='utf-8'))   # lecciones de ejemplo de los demás cursos
    base = date.fromisoformat(d['base'])
    delta = (date.fromisoformat(args.hoy) - base) if args.hoy else timedelta(0)

    def f(s):   # fecha desplazada
        return None if s is None else (date.fromisoformat(s) + delta).isoformat()

    def ts(s):  # mediodía en la planta (UTC-6, sin horario de verano)
        return None if s is None else f(s) + ' 12:00:00-06'

    G, E, P = uid('grupo'), uid('empresa', 'DN'), uid('planta', '1')
    pid = {p['id']: uid('persona', p['id']) for p in S['personas']}
    area_id = {a['id']: uid('area', a['id']) for a in AREAS}
    turno_id = {t: uid('turno', t) for t in d['TURNOS']}
    curso_id = {c: uid('curso', c) for c in CURSOS}
    version_id = {c: uid('version', c, str(v['version'])) for c, v in CURSOS.items()}
    carlos, ana, laura, ines = pid['p-carlos'], pid['p-ana'], pid['p-laura'], pid['p-ines']

    puestos = sorted({p['puesto'] for p in S['personas']} | {a['puesto'] for p in S['personas'] for a in p['adscripciones']})
    puesto_id = {x: uid('puesto', x) for x in puestos}

    L = ['-- Datos de demostración de Nexo (FICTICIOS). Generado por generar_sql_demo.py; no editar a mano.',
         f'-- Fecha de referencia: {(base + delta).isoformat()}',
         'BEGIN;', 'SET search_path = nexo, public;']
    def ins(tabla, cols, filas):
        if not filas:
            return
        L.append(f'INSERT INTO {tabla} ({", ".join(cols)}) VALUES')
        L.append(',\n'.join('(' + ', '.join(q(v) for v in fila) + ')' for fila in filas) + ';')

    ins('grupos', ['id', 'nombre'], [(G, 'Grupo PIGSA88')])
    ins('empresas', ['id', 'grupo_id', 'nombre', 'prefijo_folio'], [(E, G, 'Empresa Demo Norte (ficticia)', 'DN')])
    ins('plantas', ['id', 'grupo_id', 'empresa_id', 'nombre', 'zona_horaria'], [(P, G, E, 'Planta Demo 1 (ficticia)', 'America/Monterrey')])
    ins('areas', ['id', 'grupo_id', 'empresa_id', 'planta_id', 'nombre'], [(area_id[a['id']], G, E, P, a['nombre']) for a in AREAS])
    ins('turnos', ['id', 'grupo_id', 'empresa_id', 'planta_id', 'clave', 'nombre'], [(turno_id[t], G, E, P, t, 'Turno ' + t[1:]) for t in d['TURNOS']])
    ins('puestos', ['id', 'grupo_id', 'nombre'], [(puesto_id[x], G, x) for x in puestos])

    ins('personas', ['id', 'grupo_id', 'nombre_completo', 'tipo', 'empresa_contratista', 'acceso_vence'],
        [(pid[p['id']], G, p['nombre'], p['tipo'], p.get('contratista'), f(p.get('vence'))) for p in S['personas']])
    ins('numeros_empleado', ['grupo_id', 'empresa_id', 'persona_id', 'numero', 'vigente_desde'],
        [(G, E, pid[p['id']], p['num'], f(p['ingreso'])) for p in S['personas']])
    ads = []
    for p in S['personas']:
        for a in p['adscripciones']:
            hasta = None if a['hasta'] is None else f(a['hasta'])
            rango = '[' + f(a['desde']) + ',' + ((date.fromisoformat(hasta) + timedelta(days=1)).isoformat() if hasta else '') + ')'
            ads.append((G, E, pid[p['id']], P, area_id[a['area']], turno_id[a['turno']], puesto_id[a['puesto']], rango))
    L.append('INSERT INTO adscripciones (grupo_id, empresa_id, persona_id, planta_id, area_id, turno_id, puesto_id, vigencia) VALUES')
    L.append(',\n'.join('(' + ', '.join(q(v) for v in x[:7]) + f", {q(x[7])}::daterange)" for x in ads) + ';')
    # Cuentas sin activar: las de demostración se activan con cuentas_demo (frases generadas al instalar)
    ins('cuentas', ['persona_id', 'grupo_id', 'estado', 'participa_ranking'], [(pid[p['id']], G, 'sin_activar', bool(p.get('rankOptIn'))) for p in S['personas']])

    # Roles: las 7 cuentas de demostración; el resto, trabajadores
    especiales_cuenta = {
        'p-carlos': [('administrador', 'empresa', E, None, None)],
        'p-ana': [('rh', 'empresa', E, None, None)],
        'p-laura': [('supervisor', 'area_turno', E, area_id['ENS'], turno_id['T2']), ('trabajador', 'propio', None, None, None)],
        'p-ines': [('instructor', 'cursos', E, None, None), ('trabajador', 'propio', None, None, None)],
        'p-raul': [('auditor', 'empresa', E, None, None)],
    }
    roles = []
    for p in S['personas']:
        for rol, alcance, emp, area, turno in especiales_cuenta.get(p['id'], [('trabajador', 'propio', None, None, None)]):
            roles.append((G, pid[p['id']], rol, alcance, emp, area, turno, None if p['id'] == 'p-carlos' else carlos))
    ins('asignaciones_rol', ['grupo_id', 'persona_id', 'rol', 'alcance', 'empresa_id', 'area_id', 'turno_id', 'otorgado_por'], roles)

    clasif = {'Interno': 'interno', 'Seguridad': 'seguridad', 'Calidad': 'calidad', 'Normativo': 'normativo'}
    ins('cursos', ['id', 'grupo_id', 'clave', 'nombre', 'clasificacion', 'es_demo'],
        [(curso_id[c], G, c, v['nombre'], clasif[v['clasif']], True) for c, v in CURSOS.items()])
    vers = []
    for c, v in CURSOS.items():
        fuente = v if v.get('jugable') else extra['cursos'][c]
        contenido = {'presentacion': extra['presentacion'][c], 'niveles': fuente['niveles'], 'banco': fuente['banco'], 'demo': extra['_nota']}
        n_lecciones = sum(len(n['lecciones']) for n in fuente['niveles'])
        assert v.get('jugable') or n_lecciones == v['lecciones'], f'{c}: el contenido de ejemplo debe tener {v["lecciones"]} lecciones'
        criterios = {'requiere_evaluacion': True, 'calificacion_minima': v['eval']['min'], 'intentos': v['eval']['intentos'],
                     'preguntas': v['eval']['preguntas'], 'requiere_practica': bool(v.get('practica')), 'vigencia_meses': v['vigencia'],
                     'criterios_practica': (v.get('practica') or {}).get('criterios', []), 'demo': 'Criterios ficticios de ejemplo'}
        vers.append((version_id[c], G, curso_id[c], v['version'], 'publicada', 'menor', contenido, criterios,
                     [{'documento': 'DEMO · fuente ficticia', 'responsable': 'Departamento de Capacitación'}], ines, carlos, ts('2025-01-10')))
    ins('versiones_curso', ['id', 'grupo_id', 'curso_id', 'numero', 'estado', 'tipo_cambio', 'contenido', 'criterios', 'fuentes', 'autor_id', 'aprobada_por', 'publicada_en'], vers)
    ins('permisos_especiales', ['grupo_id', 'persona_id', 'tipo', 'curso_id', 'otorgado_por'],
        [(G, ines, 'curso_a_cargo', curso_id['C2'], carlos), (G, laura, 'validador_practico', curso_id['C2'], carlos), (G, laura, 'validador_practico', curso_id['C4'], carlos)])

    regla_id = {r['id']: uid('regla', r['id']) for r in S['reglas']}
    ins('reglas_asignacion', ['id', 'grupo_id', 'empresa_id', 'curso_id', 'filtro', 'tipo', 'dias_limite', 'creada_por', 'creada_en'],
        [(regla_id[r['id']], G, E, curso_id[r['curso']], {'areas': [area_id[a] for a in r['areas']], 'turnos': [turno_id[t] for t in r['turnos']], 'contratistas': r['contratistas']},
          r['tipo'], r['dias'], ana, ts(r['creada'])) for r in S['reglas']])
    asig_id = {a['id']: uid('asignacion', a['id']) for a in S['asigs']}
    ins('asignaciones', ['id', 'grupo_id', 'empresa_id', 'persona_id', 'curso_id', 'regla_id', 'tipo', 'creada_en', 'fecha_limite'],
        [(asig_id[a['id']], G, E, pid[a['persona']], curso_id[a['curso']], regla_id.get(a['regla']), a['tipo'], ts(a['creada']), f(a['limite'])) for a in S['asigs']])
    ins('excepciones', ['grupo_id', 'empresa_id', 'asignacion_id', 'tipo', 'motivo', 'vigente_hasta', 'aprobada_por'],
        [(G, E, asig_id[a['id']], 'exencion', a['exencion']['motivo'], f(a['exencion']['hasta']), carlos if a['persona'] == 'p-ana' else ana)
         for a in S['asigs'] if a.get('exencion')])

    part_id = {p['id']: uid('participacion', p['id']) for p in S['parts']}
    ins('participaciones', ['id', 'grupo_id', 'empresa_id', 'asignacion_id', 'persona_id', 'curso_id', 'version_id', 'es_renovacion',
                            'iniciada_en', 'lecciones_completadas', 'intentos_extra', 'pendiente_validacion_desde'],
        [(part_id[p['id']], G, E, asig_id[p['asig']], pid[p['persona']], curso_id[p['curso']],
          version_id[p['curso']] if p['inicio'] else None, bool(p.get('renov')), ts(p['inicio']),
          '{' + ','.join(p['hechas']) + '}', p.get('extra', 0), f(p.get('pvDesde'))) for p in S['parts']])
    intentos, vals = [], []
    for p in S['parts']:
        for i in p['intentos']:
            if i.get('fecha'):
                intentos.append((G, E, part_id[p['id']], i['n'], ts(i['inicio']), ts(i['fecha']), round(float(i['calif']), 4), bool(i['aprobado'])))
        for v in p['vals']:
            validador = laura if v['validador'] == 'Laura Peña' and p['persona'] != 'p-laura' else carlos
            vals.append((G, E, part_id[p['id']], validador, f(v['fecha']), ts(v['registro']), v['crit'],
                         'competente' if v['res'] == 'competente' else 'aun_no_competente', v.get('obs') or None, ts(v['registro']) if v.get('conf') else None))
    ins('intentos', ['grupo_id', 'empresa_id', 'participacion_id', 'numero', 'iniciado_en', 'enviado_en', 'calificacion', 'aprobado'], intentos)
    ins('validaciones', ['grupo_id', 'empresa_id', 'participacion_id', 'validador_id', 'fecha_practica', 'registrada_en', 'criterios', 'resultado', 'observaciones', 'confirmada_en'], vals)

    acred_id = {a['id']: uid('acreditacion', a['id']) for a in S['acreds']}
    ins('acreditaciones', ['id', 'grupo_id', 'empresa_id', 'persona_id', 'curso_id', 'version_id', 'participacion_id', 'fecha', 'vence', 'calificacion'],
        [(acred_id[a['id']], G, E, pid[a['persona']], curso_id[a['curso']], version_id[a['curso']], part_id[a['part']], f(a['fecha']), f(a['vence']), a['calif']) for a in S['acreds']])
    plantilla = uid('plantilla', 'v1')
    ins('plantillas_constancia', ['id', 'grupo_id', 'empresa_id', 'version', 'contenido'],
        [(plantilla, G, E, 1, {'titulo': 'Constancia de capacitación', 'leyenda': 'Documento interno de la empresa. No constituye un documento oficial ante autoridades. [Texto de ejemplo por validar con el área jurídica (D-24)]',
                               'logotipo': 'docs/identidad/grupo-pigsa88.svg', 'demo': True})])
    nombre = {p['id']: p['nombre'] for p in S['personas']}
    numero = {p['id']: p['num'] for p in S['personas']}
    acreds = {a['id']: a for a in S['acreds']}
    consts, seq = [], {}
    # Folios consecutivos por año según la fecha de emisión (ya desplazada)
    for k in sorted(S['consts'], key=lambda x: (f(x['emitida']), x['folio'])):
        a = acreds[k['acred']]
        anio = f(k['emitida'])[:4]
        seq[anio] = seq.get(anio, 0) + 1
        folio = f'DN-{anio}-{seq[anio]:06d}'
        consts.append((G, E, acred_id[k['acred']], folio, plantilla,
                       {'persona': nombre[k['persona']], 'numero_empleado': numero[k['persona']], 'curso': CURSOS[k['curso']]['nombre'], 'version': k['version'],
                        'fecha_acreditacion': f(a['fecha']), 'vence': f(a['vence']), 'calificacion': a['calif'], 'demo': True}, ts(k['emitida'])))
    ins('constancias', ['grupo_id', 'empresa_id', 'acreditacion_id', 'folio', 'plantilla_id', 'datos_emitidos', 'emitida_en'], consts)
    L.append('INSERT INTO contadores_folio (grupo_id, empresa_id, anio, ultimo) '
             "SELECT grupo_id, empresa_id, split_part(folio, '-', 2)::int, max(split_part(folio, '-', 3)::int) FROM constancias GROUP BY 1, 2, 3;")
    ins('puntos', ['grupo_id', 'persona_id', 'fecha', 'puntos', 'motivo'], [(G, pid[x['persona']], f(x['fecha']), x['pts'], x['motivo']) for x in S['puntos'] if x['pts'] > 0])
    # Puntos de la semana del equipo (ranking): repartidos en varios días sin pasar el tope diario de 200
    rank = []
    for persona_id, total in S.get('rank', {}).items():
        dia = 1
        while total > 0:
            pts = min(total, 120)
            rank.append((G, pid[persona_id], f((base - timedelta(days=dia)).isoformat()), pts, 'Lecciones de la semana (DEMO)'))
            total -= pts; dia += 1
    ins('puntos', ['grupo_id', 'persona_id', 'fecha', 'puntos', 'motivo'], rank)
    # Eventos de la historia de la demostración (carga de personas, reglas, publicación)
    por_nombre = {p['nombre']: pid[p['id']] for p in S['personas']}
    ins('bitacora', ['grupo_id', 'empresa_id', 'ocurrido_en', 'actor_id', 'actor_rol', 'accion', 'tabla', 'registro_id', 'despues'],
        [(G, E, f(x['ts'][:10]) + ' ' + x['ts'][11:16] + ':00-06', por_nombre.get(x['actor']), x['rol'], x['accion'], 'evento', x['entidad'],
          {'detalle': x['detalle'], 'entidad': x['entidad']}) for x in reversed(S['bit'])])
    L.append(f"INSERT INTO bitacora (grupo_id, accion, tabla, despues) VALUES ({q(G)}, 'Carga de datos de demostración (ficticios)', 'demo', "
             f"{q({'personas': len(S['personas']), 'asignaciones': len(S['asigs']), 'acreditaciones': len(S['acreds']), 'fecha_referencia': (base + delta).isoformat()})});")
    L.append('COMMIT;')
    Path(args.salida).write_text('\n'.join(L) + '\n', encoding='utf-8')
    print(f'Generado {args.salida}: {len(S["personas"])} personas, {len(S["asigs"])} asignaciones, {len(S["acreds"])} acreditaciones, {len(consts)} constancias')


if __name__ == '__main__':
    main()
