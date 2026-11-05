'use strict';
/* =====================================================================
   Nexo · Plataforma de capacitación · Grupo PIGSA88
   Interfaz conectada al servicio (app/servicio). Los datos, los permisos y
   las reglas viven en el servidor y en la base de datos; aquí solo se
   presentan y se calculan indicadores sobre lo que cada persona puede ver.
   ===================================================================== */
const UI_KEY = 'nexo-ui';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, c = '') => '<svg class="ic ' + c + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- Fechas (cadenas AAAA-MM-DD; la hora oficial sería la del servidor) ---------- */
const D = {
  t: s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); },
  s: t => new Date(t).toISOString().slice(0, 10),
  add: (s, n) => D.s(D.t(s) + n * 864e5),
  months: (s, n) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10); },
  diff: (a, b) => Math.round((D.t(a) - D.t(b)) / 864e5)
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fmt = s => { if (!s) return '—'; const [y, m, d] = s.split('-').map(Number); return d + ' ' + MES[m - 1] + ' ' + y; };
const fmtL = s => { if (!s) return '—'; const [y, m, d] = s.split('-').map(Number); return d + ' de ' + MESL[m - 1] + ' de ' + y; };
const fmtTs = s => { const d = new Date(s); return isNaN(d) ? String(s || '') : d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const hora = () => { const n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); };
const hoy = () => S.hoy;
const pct = (a, b) => b ? (a / b * 100) : 0;
const pctTxt = (a, b) => b ? pct(a, b).toFixed(1) + ' %' : '—';

/* ---------- Catálogo (llega del servidor con el estado) ---------- */
let CURSOS = {};
let AREAS = [], AREA = {}, TURNOS = [];
const lessonIds = c => ((c && c.niveles) || []).flatMap(n => n.lecciones.map(l => l.id));
const findLesson = (curso, id) => ((CURSOS[curso] || {}).niveles || []).flatMap(n => n.lecciones).find(l => l.id === id);
const nivelDe = (curso, id) => ((CURSOS[curso] || {}).niveles || []).find(n => n.lecciones.some(l => l.id === id));
const ROL = { admin: 'Administrador', rh: 'Recursos Humanos', instructor: 'Instructor(a)', supervisor: 'Supervisor(a)', auditor: 'Auditor', trabajador: 'Trabajador(a)' };

/* ---------- Estado ---------- */
let S = null;   // lo que entrega el servidor (GET /api/estado), ya filtrado por permisos y alcance
let U = {
  user: null, space: 'aprender', view: 'inicio', p: {}, player: null, exam: null, modal: null, toast: null, inact: null,
  login: { modo: 'entrar', empresas: [], err: '', msg: '', num: '', empresa: '' }, busy: 0, cargando: true, tour: null, buscar: null, actualizado: null
};
const leerLocal = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const escribirLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: no pasa nada */ } };

/* ---------- Motor de estados (reglas de la Etapa 1, documento 05) ---------- */
const EST = { pendiente: 'Pendiente', en_curso: 'En curso', contenido_completado: 'Contenido completado', pendiente_validacion: 'Pendiente de validación', no_aprobada: 'No aprobada', acreditada: 'Acreditada', cancelada: 'Cancelada' };
function partEstado(p) {
  if (p.cancelada) return 'cancelada';
  if (p.acred) return 'acreditada';
  const c = CURSOS[p.curso];
  if (!p.inicio && !p.intentos.length) return 'pendiente';
  if (p.hechas.length < lessonIds(c).length) return 'en_curso';
  const cerrados = p.intentos.filter(i => i.fecha);
  if (c.eval && !cerrados.some(i => i.aprobado)) return cerrados.length >= c.eval.intentos + p.extra ? 'no_aprobada' : 'contenido_completado';
  if (c.practica && !p.vals.some(v => v.res === 'competente' && !v.anulada)) return 'pendiente_validacion';
  return 'acreditada';
}
function acredVigente(pid, curso, f) {
  return S.acreds.filter(a => a.persona === pid && a.curso === curso && a.estado === 'vigente' && a.fecha <= f && (!a.vence || a.vence >= f)).sort((x, y) => y.fecha.localeCompare(x.fecha))[0] || null;
}
function partActual(asig) {
  const ps = S.parts.filter(p => p.asig === asig.id);
  return ps.filter(p => !p.cancelada && !p.acred).slice(-1)[0] || ps.slice(-1)[0] || null;
}
function cumplimiento(asig, f) {
  f = f || hoy();
  if (asig.estado === 'cancelada') return { k: 'cancelada' };
  if (asig.exencion && asig.exencion.hasta >= f) return { k: 'exenta', fecha: asig.exencion.hasta };
  const v = acredVigente(asig.persona, asig.curso, f);
  if (v) { const dias = v.vence ? D.diff(v.vence, f) : null; return { k: dias !== null && dias <= S.cfg.aviso ? 'por_vencer' : 'al_dia', fecha: v.vence, acred: v }; }
  const prev = S.acreds.filter(a => a.persona === asig.persona && a.curso === asig.curso && a.estado === 'vigente' && a.vence && a.vence < f).map(a => a.vence).sort().pop();
  const p = partActual(asig); const sub = p ? partEstado(p) : 'pendiente';
  if (prev) return { k: 'vencida', fecha: prev, sub, part: p };
  if (asig.limite < f) return { k: 'atrasada', fecha: asig.limite, sub, part: p };
  return { k: 'pendiente', fecha: asig.limite, sub, part: p };
}
const CUM = { al_dia: ['Al día', 'ok', 'check'], por_vencer: ['Por vencer', 'warn', 'clock'], vencida: ['Vencida', 'danger', 'alert'], atrasada: ['Atrasada', 'danger', 'alert'], pendiente: ['Pendiente', 'neutral', null], exenta: ['Exenta', 'neutral', null], cancelada: ['Cancelada', 'neutral', null] };
function chipCum(c, corto) {
  const [t, cl, i] = CUM[c.k];
  let txt = t, color = cl, icon = i;
  if (c.k === 'pendiente' && c.sub && c.sub !== 'pendiente') { txt = 'Pendiente · ' + (corto && c.sub === 'pendiente_validacion' ? 'Validación' : EST[c.sub]); if (c.sub === 'pendiente_validacion') { color = 'violet'; icon = 'users'; } if (c.sub === 'no_aprobada') color = 'danger'; }
  return '<span class="chip ' + color + '">' + (icon ? ic(icon, 's') : '') + esc(txt) + '</span>';
}
function cumFecha(c) {
  if (c.k === 'al_dia' || c.k === 'por_vencer') return c.fecha ? 'vence ' + fmt(c.fecha) : 'sin vencimiento';
  if (c.k === 'vencida') return 'venció ' + fmt(c.fecha);
  if (c.k === 'exenta') return 'hasta ' + fmt(c.fecha);
  if (c.k === 'atrasada' || c.k === 'pendiente') return 'límite ' + fmt(c.fecha);
  return '';
}

/* ---------- Quién soy y mi alcance (los aplica el servidor; aquí solo se usan para mostrar) ---------- */
const persona = id => S.personas.find(p => p.id === id);
const cuenta = () => S && S.yo;
const yo = () => persona(S.yo.persona);
const tiene = r => !!(S && S.yo && S.yo.roles.includes(r));
const esAdminSpace = () => ['admin', 'rh', 'auditor', 'supervisor', 'instructor'].some(tiene);
const soloLectura = () => tiene('auditor') && !tiene('admin') && !tiene('rh');
function alcance() { return S.alcance; }
function puede(acc) {
  const m = { regla: ['admin', 'rh'], excepcion: ['admin', 'rh'], acceso: ['admin'], reemitir: ['admin', 'rh'], revocar: ['admin', 'rh'], bitacora: ['admin', 'rh', 'auditor'] };
  if (acc === 'validar') return !!(S.yo.valida && S.yo.valida.length);
  return (m[acc] || []).some(tiene);
}

/* ---------- Indicadores (Etapa 1, documento 06) ---------- */
function filas(alc, filtro) {
  const set = new Set(alc.personas); const f = hoy();
  return S.asigs.filter(a => set.has(a.persona) && a.estado === 'activa' && a.tipo === 'obligatorio' && (!alc.cursos || alc.cursos.includes(a.curso)) && (!filtro || filtro(a))).map(a => ({ a, c: cumplimiento(a, f), p: persona(a.persona) }));
}
function indicadores(rows) {
  const n = { al_dia: 0, por_vencer: 0, vencida: 0, atrasada: 0, pendiente: 0, exenta: 0 };
  rows.forEach(r => n[r.c.k]++);
  const den = rows.length - n.exenta; const cumplen = n.al_dia + n.por_vencer;
  const porPersona = {}; rows.filter(r => r.c.k !== 'exenta').forEach(r => { const x = porPersona[r.a.persona] = porPersona[r.a.persona] || { t: 0, ok: 0 }; x.t++; if (r.c.k === 'al_dia' || r.c.k === 'por_vencer') x.ok++; });
  const pers = Object.values(porPersona); const total = pers.filter(x => x.ok === x.t).length;
  const pv = rows.filter(r => (r.c.k === 'pendiente' || r.c.k === 'atrasada') && r.c.sub === 'pendiente_validacion');
  const pv7 = pv.filter(r => r.c.part && r.c.part.pvDesde && D.diff(hoy(), r.c.part.pvDesde) > 7).length;
  return { n, den, cumplen, personas: pers.length, total, pv: pv.length, pv7 };
}

/* ---------- Comunicación con el servicio ---------- */
class ErrorApi extends Error { constructor(m, status) { super(m); this.status = status; } }
async function api(url, body) {
  const opts = { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: { 'x-nexo': '1' } };
  if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let r;
  try { r = await fetch(url, opts); } catch (e) { throw new ErrorApi('Sin conexión con el servidor. Revisa tu red e intenta de nuevo.', 0); }
  let datos = null; try { datos = await r.json(); } catch (e) { /* respuesta sin cuerpo */ }
  if (r.status === 401 && U.user) { sesionTerminada('Tu sesión terminó. Vuelve a entrar para continuar; tu avance quedó guardado.'); throw new ErrorApi('Sesión terminada', 401); }
  if (!r.ok) throw new ErrorApi((datos && datos.error) || 'No se pudo completar. Intenta de nuevo.', r.status);
  if (datos && datos.estado) aplicarEstado(datos.estado);
  return datos || {};
}
/** Ejecuta una acción: indicador de trabajo, sin envíos dobles y con el error como aviso. */
async function hacer(fn, okMsg) {
  if (U.busy) return null;
  U.busy++; ocupado(true);
  try { const r = await fn(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok'); else render(); return r || {}; }
  catch (e) { if (e.status !== 401) toast(e.message, 'error'); return null; }
  finally { U.busy--; ocupado(false); }
}
function ocupado(si) { document.documentElement.classList.toggle('ocupado', !!si); }
function aplicarEstado(e) {
  S = e; CURSOS = e.CURSOS; AREAS = e.org.areas; AREA = Object.fromEntries(AREAS.map(a => [a.id, a.nombre])); TURNOS = e.org.turnos;
  U.user = e.yo.persona; U.actualizado = Date.now();
}
async function cargarEstado(silencioso) {
  const e = await api('/api/estado');
  aplicarEstado(e);
  if (!silencioso) render();
}
function guardarUI() {
  if (!U.user) return;
  try { sessionStorage.setItem(UI_KEY, JSON.stringify({ user: U.user, space: U.space, view: U.view, p: { a: U.p.a, id: U.p.id, tab: U.p.tab } })); } catch (e) { /* opcional */ }
}
function restaurarUI() {
  try {
    const u = JSON.parse(sessionStorage.getItem(UI_KEY) || 'null');
    if (u && u.user === U.user && ['curso', 'resultado'].indexOf(u.view) < 0) { U.space = u.space; U.view = u.view; U.p = u.p || {}; return true; }
  } catch (e) { /* opcional */ }
  return false;
}
function espacioInicial() { U.space = esAdminSpace() ? 'admin' : 'aprender'; U.view = U.space === 'admin' ? 'tablero' : 'inicio'; U.p = {}; }
function sesionTerminada(msg) {
  clearInterval(inactT); clearInterval(refrescoT);
  S = null; U.user = null; U.player = null; U.exam = null; U.modal = null; U.inact = null; U.tour = null; U.buscar = null;
  U.login.msg = msg || ''; U.login.err = ''; U.login.modo = 'entrar';
  try { sessionStorage.removeItem(UI_KEY); } catch (e) { /* opcional */ }
  if (!U.login.empresas.length) cargarEmpresas();
  render(); window.scrollTo(0, 0);
}
async function cargarEmpresas() {
  try { U.login.empresas = (await api('/api/acceso/empresas')).empresas || []; } catch (e) { U.login.err = e.message; }
  render();
}

/* ---------- Vista previa de reglas (la asignación real la hace el servidor) ---------- */
function vistaPreviaRegla(r) {
  const out = [];
  for (const p of S.personas) {
    if (!alcance().personas.includes(p.id)) continue;
    if (!r.areas.includes(p.area) || !r.turnos.includes(p.turno)) continue;
    if (p.tipo === 'contratista' && (!r.contratistas || (p.vence && p.vence < hoy()))) continue;
    const ya = S.asigs.some(a => a.persona === p.id && a.curso === r.curso && a.estado === 'activa');
    out.push({ p, ya, vig: !!acredVigente(p.id, r.curso, hoy()) });
  }
  return out;
}
function asigDe(pid, curso) { return S.asigs.find(a => a.persona === pid && a.curso === curso && a.estado === 'activa'); }
/** Constancia reciente que la persona aún no ha abierto (aviso en Inicio). */
function constanciaNueva() {
  const p = yo(); const vista = leerLocal('nexo-const-' + p.id) || [];
  return S.consts.filter(k => k.persona === p.id && k.estado === 'vigente' && D.diff(hoy(), k.emitida) <= 14 && !vista.includes(k.id))
    .sort((a, b) => b.emitida.localeCompare(a.emitida) || b.folio.localeCompare(a.folio))[0] || null;
}
function marcarConstanciaVista(id) { const k = 'nexo-const-' + S.yo.persona; const v = leerLocal(k) || []; if (!v.includes(id)) { v.push(id); escribirLocal(k, v.slice(-50)); } }
function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no disponible */ } }
function anillo(pctv, tam, grosor, color) {
  const r = (tam - grosor) / 2; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, pctv));
  return '<svg class="ring" width="' + tam + '" height="' + tam + '" viewBox="0 0 ' + tam + ' ' + tam + '" aria-hidden="true"><circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="' + grosor + '"/>' +
    '<circle class="ring-v" cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="' + (color || 'var(--primary)') + '" stroke-width="' + grosor + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - v / 100)).toFixed(1) + '" style="--c:' + c.toFixed(1) + '" transform="rotate(-90 ' + tam / 2 + ' ' + tam / 2 + ')"/></svg>';
}

/* ---------- Logotipo corporativo en PNG para los PDF (se dibuja desde el SVG) ---------- */
let LOGO_PNG = null;
(function () {
  try {
    const d = document.querySelector('#pigsa path').getAttribute('d');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="224" viewBox="0 0 300 112"><path fill="#312783" fill-rule="evenodd" d="' + d + '"/></svg>';
    const img = new Image();
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = 600; c.height = 224; c.getContext('2d').drawImage(img, 0, 0, 600, 224); LOGO_PNG = c.toDataURL('image/png'); } catch (e) { LOGO_PNG = null; } };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  } catch (e) { LOGO_PNG = null; }
})();
function quitarSplash() { const sp = document.getElementById('splash'); if (sp) sp.remove(); }
(function () {
  const sp = document.getElementById('splash'); if (!sp) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { quitarSplash(); return; }
  sp.addEventListener('animationend', e => { if (e.target === sp && e.animationName === 'nxOut') quitarSplash(); });
  setTimeout(quitarSplash, 3500);
})();

/* ---------- Descargas: capacidad «downloads» en la página publicada; enlace normal en local ---------- */
const dlPromise = (window.claude && window.claude.use) ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
async function guardar(nombre, blob) {
  nombre = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_');   // nombres seguros en cualquier navegador
  const dl = await dlPromise;
  if (dl) {
    try { await dl.save({ filename: nombre, data: blob }); toast('Listo: ' + nombre); }
    catch (e) { toast(e && e.code === 'declined' ? 'Descarga cancelada' : 'No se pudo descargar en esta vista (' + (e && e.code || 'error') + ')'); }
    return;
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Descargado: ' + nombre);
}

/* ---------- Ilustraciones planas ---------- */
function svgEstacion(tipo) {
  const ord = tipo === 'tidy';
  return '<svg viewBox="0 0 160 110" role="img" aria-label="' + (ord ? 'Estación con herramientas colgadas en su lugar y piso libre' : 'Estación con herramientas y cajas en desorden') + '">' +
    '<rect width="160" height="110" fill="var(--sc-wall)"/><rect y="80" width="160" height="30" fill="var(--sc-floor)"/>' +
    '<rect x="20" y="18" width="120" height="34" rx="6" fill="var(--surface)"/>' +
    (ord ? '<rect x="32" y="24" width="6" height="22" rx="3" fill="var(--primary)"/><rect x="50" y="24" width="6" height="22" rx="3" fill="var(--coral)"/><rect x="68" y="24" width="6" height="22" rx="3" fill="var(--violet)"/><circle cx="96" cy="35" r="9" fill="var(--sun)"/><rect x="114" y="26" width="16" height="18" rx="4" fill="var(--mint)"/>'
      : '<rect x="40" y="30" width="6" height="22" rx="3" fill="var(--primary)" transform="rotate(35 43 41)"/><circle cx="110" cy="44" r="8" fill="var(--sun)"/>') +
    '<rect x="14" y="62" width="132" height="8" rx="4" fill="var(--sc-steel)"/><rect x="24" y="70" width="6" height="14" fill="var(--sc-steel)"/><rect x="130" y="70" width="6" height="14" fill="var(--sc-steel)"/>' +
    (ord ? '' : '<rect x="48" y="84" width="22" height="16" rx="3" fill="var(--sc-box)"/><rect x="58" y="72" width="16" height="12" rx="3" fill="var(--sc-box-2)" transform="rotate(-12 66 78)"/><rect x="96" y="92" width="26" height="6" rx="3" fill="var(--coral)" transform="rotate(14 109 95)"/><rect x="62" y="50" width="20" height="12" rx="3" fill="var(--violet)"/>') +
    '</svg>';
}
const HS = [
  { id: 'derrame', label: 'Líquido derramado en el piso', ok: true, cx: 92, cy: 208, r: 36 },
  { id: 'cajas', label: 'Cajas apiladas inclinadas', ok: true, cx: 292, cy: 118, r: 50 },
  { id: 'cable', label: 'Cable cruzando el paso', ok: true, cx: 270, cy: 200, r: 36 },
  { id: 'bote', label: 'Bote de basura con tapa', ok: false },
  { id: 'reloj', label: 'Reloj en la pared', ok: false },
  { id: 'caja', label: 'Caja de herramientas sobre la mesa', ok: false }
];
function svgEscena(found) {
  const mark = h => found.includes(h.id) ? '<circle cx="' + h.cx + '" cy="' + h.cy + '" r="' + (h.r - 6) + '" fill="none" stroke="var(--mint)" stroke-width="5"/><circle cx="' + (h.cx + h.r - 12) + '" cy="' + (h.cy - h.r + 12) + '" r="12" fill="var(--mint)"/><path d="m' + (h.cx + h.r - 18) + ' ' + (h.cy - h.r + 12) + ' 4 4 8-8" stroke="var(--on-color)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : '';
  return '<svg viewBox="0 0 360 250" role="group" aria-label="Estación de trabajo ilustrada (DEMO)" data-act="hsMiss">' +
    '<rect width="360" height="250" fill="var(--sc-wall)"/><rect y="168" width="360" height="82" fill="var(--sc-floor)"/>' +
    '<circle cx="320" cy="34" r="16" fill="var(--surface)"/><path d="M320 26v8l6 4" stroke="var(--sc-steel)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<rect x="34" y="96" width="176" height="12" rx="6" fill="var(--sc-steel)"/><rect x="46" y="108" width="9" height="62" rx="3" fill="var(--sc-steel)"/><rect x="190" y="108" width="9" height="62" rx="3" fill="var(--sc-steel)"/>' +
    '<rect x="62" y="68" width="50" height="28" rx="7" fill="var(--coral)"/><rect x="72" y="60" width="30" height="10" rx="4" fill="var(--coral-ink)"/>' +
    '<rect x="128" y="76" width="58" height="20" rx="6" fill="var(--primary)"/>' +
    '<rect x="222" y="128" width="30" height="42" rx="6" fill="var(--mint)"/><rect x="218" y="122" width="38" height="9" rx="4" fill="var(--ok-ink)"/>' +
    '<g transform="rotate(-7 292 120)"><rect x="262" y="128" width="64" height="42" rx="6" fill="var(--sc-box)"/><rect x="268" y="88" width="58" height="40" rx="6" fill="var(--sc-box-2)"/><rect x="272" y="52" width="54" height="36" rx="6" fill="var(--sc-box)"/></g>' +
    '<path d="M196 176c30 16 66 6 88 28s44 12 76 8" fill="none" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/>' +
    '<ellipse cx="92" cy="210" rx="46" ry="12" fill="var(--sc-water)"/>' +
    HS.filter(h => h.ok).map(mark).join('') +
    HS.filter(h => h.ok).map(h => '<circle class="hs-hit" cx="' + h.cx + '" cy="' + h.cy + '" r="' + h.r + '" data-act="hs" data-id="' + h.id + '" tabindex="0" role="button" aria-label="' + esc(h.label) + '"/>').join('') +
    '</svg>';
}

/* =====================================================================
   RENDER
   ===================================================================== */
let animT = null;
function render() {
  const ae = document.activeElement; const fid = ae && ae.id; const sel = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const app = $('#app');
  if (U.cargando) app.innerHTML = renderCargando();
  else if (!U.user || !S) app.innerHTML = renderLogin();
  else if (U.player) app.innerHTML = renderPlayer();
  else if (U.exam) app.innerHTML = renderExam();
  else if (U.space === 'admin') app.innerHTML = renderAdmin();
  else app.innerHTML = renderLearn();
  app.classList.toggle('anim', !!U.anim);
  if (U.anim) { U.anim = false; clearTimeout(animT); animT = setTimeout(() => app.classList.remove('anim'), 1100); }
  $('#ov').innerHTML = renderOverlay();
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
  document.documentElement.style.setProperty('--bar-h', '0px');
  guardarUI();
}
function renderCargando() {
  return '<div class="login wrap"><div class="cargando"><svg style="width:64px;height:64px"><use href="#logo"/></svg><b>Nexo</b><span class="muted">Cargando tu información…</span><div class="sk"><i></i><i></i><i></i></div></div></div>';
}

/* ---------- Acceso: entrar y activar la cuenta ---------- */
function medidorFrase(v) {
  const pal = String(v || '').trim().split(/\s+/).filter(Boolean).length; const n = String(v || '').length;
  const nivel = n >= 20 && pal >= 4 ? 3 : n >= 14 && pal >= 3 ? 2 : n >= 12 ? 1 : 0;
  const txt = ['Muy corta: usa al menos 12 caracteres', 'Aceptable: agrega otra palabra', 'Buena', 'Excelente'][nivel];
  return '<div class="medidor n' + nivel + '" aria-live="polite"><span><i></i><i></i><i></i></span><small>' + txt + '</small></div>';
}
function renderLogin() {
  const L = U.login; const rec = leerLocal('nexo-recordar') || {};
  const empresa = L.empresa || rec.empresa || (L.empresas[0] && L.empresas[0].id) || '';
  const num = L.num || rec.num || '';
  const empSel = L.empresas.length > 1
    ? '<label class="field"><span>Empresa</span><select class="input" id="l-emp" name="empresa">' + L.empresas.map(e => '<option value="' + e.id + '"' + (e.id === empresa ? ' selected' : '') + '>' + esc(e.nombre) + '</option>').join('') + '</select></label>'
    : '<input type="hidden" name="empresa" value="' + esc(empresa) + '">' + (L.empresas[0] ? '<div class="emp-chip">' + ic('grid', 's') + esc(L.empresas[0].nombre) + '</div>' : '');
  let h = '<div class="login wrap"><div class="login-card">' +
    '<div class="brand-lg"><svg style="width:56px;height:56px"><use href="#logo"/></svg><div><b>Nexo</b><div class="muted">Capacitación</div></div><span class="grow"></span><svg class="brand-logo" viewBox="0 0 300 112" style="width:112px;height:42px" role="img" aria-label="Grupo PIGSA88"><use href="#pigsa"/></svg></div>' +
    (L.msg ? '<div class="notice ok">' + ic('shield') + '<span>' + esc(L.msg) + '</span></div>' : '');
  if (L.modo === 'activar') {
    h += '<form class="stack" data-submit="activar" novalidate autocomplete="off"><div><span class="eyebrow">Primera vez</span><h1 style="font-size:30px">Activa tu cuenta</h1><p class="muted" style="margin:6px 0 0">Necesitas el código de la ficha que te entregó el administrador. Sirve una sola vez.</p></div>' + empSel +
      '<label class="field"><span>Número de empleado</span><input class="input mono" id="a-num" name="numero" value="' + esc(num) + '" autocapitalize="characters" required></label>' +
      '<label class="field"><span>Código de tu ficha</span><input class="input mono code-in" id="a-cod" name="codigo" placeholder="XXXX-XXXX" autocapitalize="characters" maxlength="9" required></label>' +
      '<label class="field"><span>Crea tu frase de acceso</span><input class="input" id="a-frase" name="frase" type="password" data-inp="medir" required></label><div id="medidor">' + medidorFrase('') + '</div>' +
      '<label class="field"><span>Escríbela otra vez</span><input class="input" id="a-frase2" name="frase2" type="password" required></label>' +
      '<div class="tip">' + ic('info', 's') + '<span>Usa <b>cuatro palabras</b> que recuerdes y que no tengan que ver contigo, por ejemplo «mango puente nube tambor». No uses tu nombre ni tu número.</span></div>' +
      (L.err ? '<div class="notice danger" role="alert">' + ic('alert') + '<span>' + esc(L.err) + '</span></div>' : '') +
      '<button class="btn pri block" type="submit">' + ic('check', 's') + 'Activar y entrar</button><button type="button" class="btn ghost block" data-act="modoEntrar">Ya tengo cuenta</button></form>';
  } else {
    h += '<form class="stack" data-submit="entrar" novalidate><h1 style="font-size:30px">Entra a tu cuenta</h1>' + empSel +
      '<label class="field"><span>Número de empleado</span><input class="input mono" id="l-num" name="numero" autocomplete="username" autocapitalize="characters" value="' + esc(num) + '" required></label>' +
      '<label class="field"><span>Frase de acceso</span><span class="pass"><input class="input" id="l-pass" name="frase" type="password" autocomplete="current-password" required><button type="button" class="iconbtn" data-act="verFrase" aria-label="Mostrar u ocultar la frase">' + ic('eye', 's') + '</button></span></label>' +
      '<label class="ck dev"><input type="checkbox" id="l-pers" name="personal"' + (rec.personal ? ' checked' : '') + '><span><b>Es mi dispositivo personal</b><small>Te recordamos 30 días. En equipos compartidos la sesión se cierra si dejas de usarla.</small></span></label>' +
      (L.err ? '<div class="notice danger" role="alert">' + ic('alert') + '<span>' + esc(L.err) + '</span></div>' : '') +
      '<button class="btn pri block" type="submit">Entrar</button>' +
      '<button type="button" class="card linkcard" data-act="modoActivar">' + ic('key') + '<span class="grow"><b>¿Es tu primera vez?</b><span class="muted">Activa tu cuenta con el código de tu ficha.</span></span>' + ic('chev', 'muted') + '</button>' +
      '<div class="card linkcard">' + ic('users') + '<span class="grow"><b>¿Olvidaste tu frase de acceso?</b><span class="muted">Acude con el administrador de tu planta con tu gafete o identificación.</span></span></div></form>';
  }
  h += '<p class="demo-note" style="text-align:center;margin:0">Ambiente de demostración · datos ficticios</p></div></div>';
  return h;
}

/* ---------- Aprender ---------- */
function headerLearn(titulo, sub) {
  const p = yo(); const ini = p.nombre.split(' ').map(x => x[0]).slice(0, 2).join('');
  return '<div class="lhead"><span class="avatar" aria-hidden="true">' + esc(ini) + '</span><div class="grow"><h1>' + esc(titulo) + '</h1><div class="muted">' + esc(sub) + '</div></div>' +
    (esAdminSpace() ? '<span class="mode-sw" role="group" aria-label="Espacio"><button aria-pressed="true">Aprender</button><button data-act="space" data-s="admin" aria-pressed="false">Administrar</button></span>' : '') +
    '<span class="demo-pill" title="Ambiente de demostración: datos ficticios">DEMO</span><button class="salir" data-act="salir">' + ic('out', 's') + 'Salir</button></div>';
}
function misAsigs(pid) { return S.asigs.filter(a => a.persona === pid && a.estado === 'activa').map(a => ({ a, c: cumplimiento(a), part: partActual(a) })); }
function lnav(cur) {
  const it = [['inicio', 'home', 'Inicio'], ['cursos', 'book', 'Mis cursos'], ['logros', 'award', 'Logros'], ['historial', 'doc', 'Historial']];
  return '<nav class="lnav" aria-label="Navegación">' + it.map(([v, i, t]) => '<button data-act="go" data-v="' + v + '"' + (cur === v ? ' aria-current="page"' : '') + '>' + ic(i) + t + '</button>').join('') + '</nav>';
}
function courseCard(x, extra) {
  const c = CURSOS[x.a.curso]; const L = lessonIds(c).length; const done = x.part ? x.part.hechas.length : L;
  const pr = (x.c.k === 'al_dia' || x.c.k === 'por_vencer') ? 100 : Math.round(done / L * 100);
  return '<button class="ccard" data-act="curso" data-a="' + x.a.id + '"><span class="tile t-' + c.color + '">' + ic(c.icon) + '</span><span class="grow"><span class="t">' + esc(c.nombre) + '</span><span class="m" style="display:block">' + (extra || ((x.part && x.part.renov ? 'Renovación · ' : '') + pr + ' % · ' + cumFecha(x.c))) + '</span><span style="display:block;margin-top:8px">' + chipCum(x.c) + '</span></span><span class="ring-w">' + anillo(pr, 46, 5, 'var(--' + c.color + ')') + '<b>' + pr + '%</b></span></button>';
}
function urg(x) { const o = { vencida: 0, atrasada: 1, pendiente: 2, por_vencer: 3, exenta: 5, al_dia: 6 }; return o[x.c.k] * 1e6 + (x.c.fecha ? D.t(x.c.fecha) / 864e5 : 9e5); }
function renderLearn() {
  const v = U.view; const p = yo();
  let body = '';
  if (v === 'curso') body = viewCurso();
  else if (v === 'cursos') body = viewMisCursos();
  else if (v === 'logros') body = viewLogros();
  else if (v === 'historial') body = viewHistorial();
  else if (v === 'resultado') body = viewResultado();
  else body = viewInicio();
  return '<div class="learn wrap">' + body + '</div>' + (v === 'curso' || v === 'resultado' ? '' : lnav(v === 'inicio' ? 'inicio' : v));
}
function viewInicio() {
  const p = yo(); const xs = misAsigs(p.id);
  const pend = xs.filter(x => ['vencida', 'atrasada', 'pendiente', 'por_vencer'].includes(x.c.k)).sort((a, b) => urg(a) - urg(b));
  const cont = xs.filter(x => x.part && CURSOS[x.a.curso].jugable && ['en_curso', 'pendiente', 'contenido_completado'].includes(partEstado(x.part)) && x.c.k !== 'al_dia').sort((a, b) => (b.part.inicio ? 1 : 0) - (a.part.inicio ? 1 : 0))[0];
  let h = headerLearn('Hola, ' + p.nombre.split(' ')[0], (AREA[p.area] || S.org.empresa) + (p.turno ? ' · Turno ' + p.turno.slice(1) : '') + (p.tipo === 'contratista' ? ' · ' + p.num : ''));
  const alDia = xs.filter(x => ['al_dia', 'por_vencer', 'exenta'].includes(x.c.k)).length;
  if (xs.length) h += '<div class="card resumen">' + anillo(pct(alDia, xs.length), 64, 8, 'var(--mint)') + '<div class="grow"><b style="font-size:18px">' + alDia + ' de ' + xs.length + ' cursos al día</b><div class="muted" style="font-size:14px">' + (xs.length - alDia ? 'Te ' + (xs.length - alDia === 1 ? 'falta 1 curso' : 'faltan ' + (xs.length - alDia) + ' cursos') + '. ¡Tú puedes!' : '¡Todo en orden! Sigue así.') + '</div></div></div>';
  if (cont) {
    const c = CURSOS[cont.a.curso]; const L = lessonIds(c); const sig = L.find(id => !cont.part.hechas.includes(id)); const ls = sig ? findLesson(cont.a.curso, sig) : null; const pr = Math.round(cont.part.hechas.length / L.length * 100);
    h += '<section class="hero"><span class="hero-dots" aria-hidden="true"></span><span class="eyebrow">' + (cont.part.inicio ? 'Continúa donde te quedaste' : 'Nuevo para ti') + '</span><h2>' + esc(c.nombre) + '</h2><div>' + (ls ? 'Lección ' + (L.indexOf(sig) + 1) + ' de ' + L.length + ' · ' + esc(ls.titulo) + ' · ' + ls.min + ' min' : 'Lecciones terminadas: falta la evaluación') + '</div><div class="bar-p" role="progressbar" aria-valuenow="' + pr + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pr + '%"></i></div>' +
      '<button class="btn" data-act="' + (sig ? 'leccion' : 'curso') + '" data-a="' + cont.a.id + '" data-l="' + (sig || '') + '">' + ic('play') + (sig ? (cont.part.inicio ? 'Continuar' : 'Empezar') : 'Ver curso') + '</button></section>';
  }
  const porConf = S.parts.filter(x => x.persona === p.id).flatMap(x => x.vals.filter(v => !v.conf && !v.disp && !v.anulada).map(v => ({ x, v })));
  for (const { x, v } of porConf) h += '<div class="notice violet">' + ic('flag') + '<div class="grow"><b>Confirma tu práctica.</b> ' + esc(v.validador) + ' registró tu práctica de «' + esc(CURSOS[x.curso].nombre) + '» el ' + fmt(v.fecha) + '. ¿Ocurrió así?<div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn pri sm" data-act="confPractica" data-p="' + x.id + '" data-v="' + v.id + '">Sí, la realicé</button><button class="btn ghost sm" data-act="dispPractica" data-p="' + x.id + '" data-v="' + v.id + '">No reconozco este registro</button></div></div></div>';
  const nk = constanciaNueva();
  if (nk && nk.estado === 'vigente') h += '<div class="notice ok">' + ic('award') + '<div class="grow"><b>¡Nueva constancia!</b> Acreditaste «' + esc(CURSOS[nk.curso].nombre) + '». Folio <span class="mono">' + nk.folio + '</span>.<div style="margin-top:8px"><button class="btn pri sm" data-act="verConst" data-k="' + nk.id + '">Ver constancia</button></div></div></div>';
  h += '<div class="sec-h"><h3>Pendientes</h3><span class="muted">' + pend.length + (pend.length === 1 ? ' curso' : ' cursos') + '</span></div>';
  if (!pend.length) h += '<div class="card empty"><span class="shape">' + ic('check', 'xl') + '</span><h3>Estás al día</h3><p class="muted" style="margin:0">No tienes cursos pendientes. Cuando te asignen uno, aparecerá aquí.</p><button class="btn soft" data-act="go" data-v="historial">Ver mi historial</button></div>';
  else h += '<div class="stack">' + pend.map(x => courseCard(x)).join('') + '</div>';
  const sem = S.puntos.filter(x => x.persona === p.id && D.diff(hoy(), x.fecha) < 7 && x.fecha <= hoy()).reduce((s, x) => s + x.pts, 0);
  h += '<button class="ccard" data-act="go" data-v="logros"><span class="tile t-sun">' + ic('star') + '</span><span class="grow"><span class="t">' + sem + ' puntos esta semana</span><span class="m" style="display:block">Los puntos motivan; no cuentan para acreditar.</span></span>' + ic('chev', 'muted') + '</button>';
  return h;
}
function viewMisCursos() {
  const p = yo(); const xs = misAsigs(p.id); const tab = U.p.tab || 'hacer';
  const lista = tab === 'hacer' ? xs.filter(x => !['al_dia', 'exenta'].includes(x.c.k)) : xs.filter(x => ['al_dia', 'por_vencer'].includes(x.c.k));
  return headerLearn('Mis cursos', xs.length + ' asignados') +
    '<div class="tabs" role="group"><button data-act="tab" data-t="hacer" aria-pressed="' + (tab === 'hacer') + '">Por hacer</button><button data-act="tab" data-t="ok" aria-pressed="' + (tab === 'ok') + '">Acreditados</button></div>' +
    (lista.length ? '<div class="stack">' + lista.sort((a, b) => urg(a) - urg(b)).map(x => courseCard(x)).join('') + '</div>' : '<div class="card empty"><span class="shape">' + ic('book', 'xl') + '</span><h3>Nada por aquí</h3><p class="muted" style="margin:0">' + (tab === 'hacer' ? 'No tienes cursos por hacer.' : 'Aún no acreditas cursos vigentes.') + '</p></div>');
}
function viewCurso() {
  const a = S.asigs.find(x => x.id === U.p.a); if (!a) return '';
  const c = CURSOS[a.curso]; const cu = cumplimiento(a); const part = partActual(a); const est = part ? partEstado(part) : 'pendiente';
  const L = lessonIds(c); const hechas = part ? part.hechas : []; const pr = (cu.k === 'al_dia' || cu.k === 'por_vencer') ? 100 : Math.round(hechas.length / L.length * 100);
  const vigente = cu.k === 'al_dia' || cu.k === 'por_vencer'; let paso = 0; const zig = () => Math.round((Math.sin(paso++ * 1.05) + 1) * 26);
  let h = '<div class="lhead"><button class="iconbtn" data-act="go" data-v="inicio" aria-label="Volver">' + ic('back') + '</button><span class="tile t-' + c.color + '">' + ic(c.icon) + '</span><div class="grow"><h1 style="font-size:22px">' + esc(c.nombre) + '</h1><div class="muted">Versión ' + (part && part.version || c.version) + ' · ' + cumFecha(cu) + '</div></div><button class="salir" data-act="salir">' + ic('out', 's') + 'Salir</button></div>';
  h += '<div class="card stack"><div class="row"><b class="grow">Avance del curso</b><b class="num">' + pr + ' %</b></div><div class="bar-p"><i style="width:' + pr + '%"></i></div>' + chipCum(cu).replace('<span', '<span style="align-self:flex-start"') +
    '<div class="muted" style="font-size:14px">Para acreditar: termina las lecciones' + (c.eval ? ', aprueba la evaluación con ' + c.eval.min + ' o más' : '') + (c.practica ? ' y realiza tu práctica con un validador autorizado' : '') + '. <span class="demo-note">(Criterios de ejemplo · DEMO.)</span></div></div>';
  h += '<div class="route camino">';
  const niveles = c.jugable ? c.niveles : [{ titulo: 'Lecciones', lecciones: L.map((id, i) => ({ id, titulo: 'Lección ' + (i + 1) + ' (contenido no incluido)', min: 4 })) }];
  let primera = true;
  for (const n of niveles) {
    h += '<div class="lvl">' + esc(n.titulo) + '</div>';
    for (const l of n.lecciones) {
      const done = hechas.includes(l.id) || (vigente && !part) || (vigente && part && part.acred);
      const cur = !done && primera && c.jugable && part && !part.acred && !part.cancelada; if (cur) primera = false;
      const lock = !done && !cur;
      h += '<button style="--x:' + zig() + 'px" class="st ' + (done ? 'done' : cur ? 'cur' : '') + '" ' + (lock || !c.jugable ? 'disabled' : '') + ' data-act="leccion" data-a="' + a.id + '" data-l="' + l.id + '"><span class="node">' + ic(done ? 'check' : cur ? 'play' : 'lock', 's') + '</span><span class="nm">' + esc(l.titulo) + '<small>' + (done ? 'Completada' : l.min + ' min') + '</small></span>' + (cur ? '<span class="chip primary">' + (hechas.length ? 'Continuar' : 'Empezar') + '</span>' : '') + '</button>';
    }
  }
  h += '<div class="lvl">Acreditación</div>';
  if (c.eval) {
    const closed = part ? part.intentos.filter(i => i.fecha) : []; const ok = closed.some(i => i.aprobado) || (vigente && (!part || part.acred));
    const disp = part && est === 'contenido_completado' && c.jugable;
    h += '<button style="--x:' + zig() + 'px" class="st ' + (ok ? 'done' : disp ? 'cur' : '') + '" ' + (disp ? '' : 'disabled') + ' data-act="preExamen" data-a="' + a.id + '"><span class="node">' + ic(ok ? 'check' : disp ? 'play' : 'doc', 's') + '</span><span class="nm">Evaluación<small>' + (ok ? 'Aprobada' : est === 'no_aprobada' ? 'Intentos agotados: tu instructor revisará tu caso' : disp ? 'Lista para presentar · intentos restantes: ' + (c.eval.intentos + part.extra - closed.length) : 'Se habilita al terminar las lecciones') + '</small></span>' + (disp ? '<span class="chip primary">Presentar</span>' : '') + '</button>';
  }
  if (c.practica) {
    const ok = part && part.vals.some(v => v.res === 'competente' && !v.anulada) || (vigente && (!part || part.acred));
    h += '<div style="--x:' + zig() + 'px" class="st ' + (ok ? 'done' : est === 'pendiente_validacion' ? 'cur' : '') + '"><span class="node">' + ic(ok ? 'check' : 'users', 's') + '</span><span class="nm">Validación práctica<small>' + (ok ? 'Competente' : est === 'pendiente_validacion' ? 'Pendiente: un validador autorizado la registrará en tu estación' : 'Con un validador autorizado') + '</small></span></div>';
  }
  h += '</div>';
  return h;
}
function viewResultado() {
  const part = S.parts.find(x => x.id === U.p.part); const c = CURSOS[part.curso]; const it = part.intentos.filter(i => i.fecha).slice(-1)[0];
  const est = partEstado(part); const restantes = c.eval.intentos + part.extra - part.intentos.filter(i => i.fecha).length;
  let h = '<div class="lhead"><button class="iconbtn" data-act="go" data-v="inicio" aria-label="Volver">' + ic('back') + '</button><div class="grow"><h1 style="font-size:22px">Resultado</h1><div class="muted">' + esc(c.nombre) + ' · versión ' + part.version + '</div></div></div>';
  if (it.aprobado) {
    h += '<div class="card done-hero"><div class="burst" aria-hidden="true">' + confeti() + '<span class="core">' + ic('check', 'xl') + '</span></div><h2 style="font-size:28px">Aprobaste la evaluación</h2><div class="muted">Calificación <b style="color:var(--ink)">' + Math.round(it.calif) + '</b> · mínima ' + c.eval.min + ' · intento ' + it.n + '</div></div>';
    h += '<div class="card"><div class="crit"><span class="dot" style="background:var(--ok-soft);color:var(--ok-ink)">' + ic('check', 's') + '</span><span class="grow">Lecciones</span><span class="chip ok">Completadas</span></div><div class="crit"><span class="dot" style="background:var(--ok-soft);color:var(--ok-ink)">' + ic('check', 's') + '</span><span class="grow">Evaluación</span><span class="chip ok">Aprobada</span></div>' +
      (c.practica ? '<div class="crit"><span class="dot" style="background:var(--violet-soft);color:var(--violet-ink)">' + ic('users', 's') + '</span><span class="grow">Validación práctica</span><span class="chip violet">Pendiente</span></div>' : '') + '</div>';
    h += est === 'acreditada' ? '<div class="notice ok">' + ic('award') + '<div class="grow"><b>¡Acreditaste el curso!</b> Tu constancia ya está emitida.' + (function () { const ac = S.acreds.find(x => x.part === part.id); const k = ac && S.consts.find(x => x.acred === ac.id && x.estado === 'vigente'); return k ? '<div style="margin-top:8px"><button class="btn pri sm" data-act="verConst" data-k="' + k.id + '">' + ic('doc', 's') + 'Ver mi constancia</button></div>' : ''; })() + '</div></div>' : '<div class="notice violet">' + ic('info') + '<span><b>Aún no acreditas el curso.</b> Un validador autorizado registrará tu práctica en tu estación. Te avisaremos para que la confirmes.</span></div>';
  } else {
    const temas = [...new Set((it.resp || []).filter(r => !r.ok).map(r => r.tema))];
    h += '<div class="card done-hero"><span class="tile t-sun" style="width:72px;height:72px;border-radius:22px">' + ic('target', 'xl') + '</span><h2 style="font-size:26px">Aún no apruebas</h2><div class="muted">Calificación <b style="color:var(--ink)">' + Math.round(it.calif) + '</b> · mínima ' + c.eval.min + '</div></div>';
    h += '<div class="card stack"><b>Repasa estos temas</b>' + (temas.length ? temas.map(t => '<span class="chip coral" style="align-self:flex-start">' + esc(t) + '</span>').join('') : '<span class="muted">Revisa las lecciones del curso.</span>') + '</div>';
    h += est === 'no_aprobada' ? '<div class="notice danger">' + ic('alert') + '<span><b>Agotaste tus intentos.</b> Tu instructor revisará tu caso y podrá autorizar intentos adicionales.</span></div>' : '<div class="notice info">' + ic('info') + '<span>Te quedan <b>' + restantes + '</b> ' + (restantes === 1 ? 'intento' : 'intentos') + '. Repasa y vuelve a intentarlo cuando estés listo.</span></div>';
  }
  h += '<button class="btn pri block" data-act="go" data-v="inicio">Volver al inicio</button>';
  return h;
}
function confeti() { const cols = ['var(--coral)', 'var(--sun)', 'var(--primary)', 'var(--violet)', 'var(--mint)']; let o = ''; for (let i = 0; i < 10; i++) { const ang = i / 10 * Math.PI * 2; const r = 52 + (i % 3) * 6; o += '<i style="left:' + (52 + Math.cos(ang) * r) + 'px;top:' + (52 + Math.sin(ang) * r) + 'px;background:' + cols[i % 5] + ';border-radius:' + (i % 2 ? '50%' : '4px') + ';animation-delay:' + (i * 30) + 'ms"></i>'; } return o; }
function insignias(pid) {
  const parts = S.parts.filter(x => x.persona === pid);
  const lecciones = S.puntos.some(x => x.persona === pid && /Lección/.test(x.motivo));
  const perfecta = S.puntos.some(x => x.persona === pid && /perfecta/.test(x.motivo));
  const acreditado = S.acreds.some(a => a.persona === pid && a.estado === 'vigente');
  const primera = parts.some(x => { const i = x.intentos.filter(t => t.fecha); return i.length && i[0].aprobado; });
  const puntual = S.acreds.some(a => { const as = S.asigs.find(s => s.persona === pid && s.curso === a.curso); return a.persona === pid && as && a.fecha <= as.limite; });
  return [['Primera lección', 'flag', 't-coral', lecciones], ['Lección perfecta', 'star', 't-sun', perfecta], ['Curso acreditado', 'award', 't-primary', acreditado], ['A la primera', 'target', 't-violet', primera], ['Puntual', 'cal', 't-mint', puntual], ['Renovación a tiempo', 'reset', 't-coral', false]];
}
function viewLogros() {
  const p = yo(); const sem = S.puntos.filter(x => x.persona === p.id && D.diff(hoy(), x.fecha) < 7 && x.fecha <= hoy()).reduce((s, x) => s + x.pts, 0);
  const total = S.puntos.filter(x => x.persona === p.id).reduce((s, x) => s + x.pts, 0);
  const ins = insignias(p.id);
  let h = headerLearn('Logros', 'Puntos e insignias') +
    '<div class="row" style="align-items:stretch"><div class="card grow"><div class="eyebrow">Esta semana</div><div class="big-num num">' + sem + '</div><div class="muted">puntos</div></div><div class="card grow"><div class="eyebrow">Total</div><div class="big-num num" style="color:var(--ink)">' + total.toLocaleString('es-MX') + '</div><div class="muted">puntos</div></div></div>' +
    '<div class="sec-h"><h3>Insignias</h3><span class="muted">' + ins.filter(x => x[3]).length + ' de ' + ins.length + '</span></div><div class="badges">' +
    ins.map(([t, i, cl, ok]) => '<div class="badge"><span class="hex ' + (ok ? cl : 'off') + '">' + ic(ok ? i : 'lock', 'l') + '</span>' + esc(t) + '</div>').join('') + '</div>';
  const lista = S.ranking.filter(x => x.participa).sort((a, b) => b.pts - a.pts);
  h += '<div class="sec-h"><h3>Ranking del equipo</h3><span class="muted">' + esc(AREA[p.area] || '') + (p.turno ? ' · T' + p.turno.slice(1) : '') + ' · últimos 7 días</span></div>';
  if (lista.length < 5) h += '<div class="card muted">El ranking se muestra cuando participan al menos 5 personas de tu equipo.</div>';
  else {
    const top = lista.slice(0, 3); const pos = lista.findIndex(r => r.yo); const max = Math.max(1, top[0].pts);
    h += '<div class="card"><div class="rank">' + top.map((r, i) => '<div class="r' + (r.yo ? ' me' : '') + '"><span class="p">' + (i + 1) + '</span><span class="grow">' + esc(r.nombre) + '<span class="rbar"><i style="width:' + Math.round(r.pts / max * 100) + '%"></i></span></span><b class="num">' + r.pts + '</b></div>').join('') +
      (p.rankOptIn && pos >= 3 ? '<div class="r me"><span class="p">' + (pos + 1) + '</span><span class="grow"><b>Tú</b> · de ' + lista.length + ' participantes</span><b class="num">' + lista[pos].pts + '</b></div>' : '') +
      (!p.rankOptIn ? '<div class="r"><span class="muted">No apareces en el ranking. Tu progreso es privado.</span></div>' : '') + '</div></div>';
  }
  h += '<div class="card row"><div class="grow"><b>Mostrarme en el ranking</b><div class="muted" style="font-size:14px">Si lo apagas, nadie verá tus puntos ni tu posición. Tus cursos y resultados siguen visibles para tu supervisor y RH.</div></div><button class="switch" role="switch" aria-checked="' + !!p.rankOptIn + '" aria-label="Mostrarme en el ranking" data-act="rankOpt"></button></div>';
  return h;
}
function viewHistorial() {
  const p = yo(); const acs = S.acreds.filter(a => a.persona === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  let h = headerLearn('Historial', 'Tus cursos acreditados y constancias');
  if (!acs.length) return h + '<div class="card empty"><span class="shape">' + ic('doc', 'xl') + '</span><h3>Aún no tienes constancias</h3><p class="muted" style="margin:0">Aparecerán aquí cuando acredites tu primer curso.</p></div>';
  h += '<div class="stack">' + acs.map(a => {
    const c = CURSOS[a.curso]; const ks = S.consts.filter(k => k.acred === a.id); const k = ks.find(x => x.estado === 'vigente' || x.estado === 'generando') || ks.slice(-1)[0];
    const st = a.estado === 'revocada' ? '<span class="chip danger">' + ic('x', 's') + 'Revocada</span>' : !a.vence || a.vence >= hoy() ? (a.vence && D.diff(a.vence, hoy()) <= S.cfg.aviso ? '<span class="chip warn">' + ic('clock', 's') + 'Vence ' + fmt(a.vence) + '</span>' : '<span class="chip ok">' + ic('check', 's') + 'Vigente hasta ' + fmt(a.vence) + '</span>') : '<span class="chip danger">' + ic('alert', 's') + 'Venció ' + fmt(a.vence) + '</span>';
    return '<div class="ccard" style="align-items:flex-start"><span class="tile t-' + c.color + '">' + ic(c.icon) + '</span><div class="grow"><div class="t">' + esc(c.nombre) + '</div><div class="m">Versión ' + a.version + ' · acreditado el ' + fmt(a.fecha) + (a.calif ? ' · calificación ' + a.calif : '') + '</div><div style="margin:8px 0">' + st + '</div>' +
      (k ? (k.estado === 'generando' ? '<span class="chip neutral">' + ic('clock', 's') + 'Generando tu constancia…</span>' : '<button class="btn soft sm" data-act="verConst" data-k="' + k.id + '">' + ic('doc', 's') + 'Ver constancia</button>' + (k.estado !== 'vigente' ? ' <span class="chip neutral">' + (k.estado === 'revocada' ? 'Revocada' : 'Sustituida') + '</span>' : '')) : '') + '</div></div>';
  }).join('') + '</div>';
  h += '<button class="btn soft block" data-act="exportar" data-r="individual" data-f="pdf" data-pid="' + p.id + '">' + ic('down') + 'Descargar mi reporte individual (PDF)</button><p class="demo-note" style="text-align:center;margin:0">En equipos compartidos, el archivo queda guardado en el equipo.</p>';
  return h;
}

/* ---------- Reproductor de lecciones ---------- */
function startLesson(aid, lid) {
  const a = S.asigs.find(x => x.id === aid); const part = a && partActual(a);
  if (!part || part.acred || part.cancelada) { toast('Este curso ya está acreditado.'); return; }
  const l = findLesson(a.curso, lid); if (!l) return;
  U.player = { aid, pid: part.id, curso: a.curso, lid, queue: l.acts.map((_, i) => i), pos: 0, retry: [], sel: null, seq: [], found: [], misses: 0, list: false, phase: 'q', ok: null, firstOk: 0, errores: 0, pts: 0, racha: 0, mejorRacha: 0, done: false, enviado: false };
  if (!part.inicio) api('/api/aprender/iniciar', { participacion: part.id }).catch(() => { /* se reintenta al terminar la lección */ });
}
function act() { const P = U.player; return findLesson(P.curso, P.lid).acts[P.queue[P.pos]]; }
function renderPlayer() {
  const P = U.player; const l = findLesson(P.curso, P.lid); const c = CURSOS[P.curso];
  if (P.done) {
    const L = lessonIds(c); const part = S.parts.find(x => x.id === P.pid); const hechas = part ? part.hechas.length : 0;
    const niv = nivelDe(P.curso, P.lid); const nivelListo = niv && part && niv.lecciones.every(x => part.hechas.includes(x.id));
    const todas = hechas >= L.length;
    return '<div class="player wrap"><div class="done-hero"><div class="burst" aria-hidden="true">' + confeti() + '<span class="core">' + ic(todas ? 'award' : 'star', 'xl') + '</span></div><span class="eyebrow">' + (todas ? '¡Terminaste las lecciones!' : nivelListo ? '¡Nivel completado!' : 'Lección completada') + '</span><h1 style="font-size:30px">' + esc(l.titulo) + '</h1>' +
      '<div class="big-num num cuenta" data-n="' + P.pts + '">+' + P.pts + '</div><div class="muted">puntos · ' + P.firstOk + ' de ' + l.acts.length + ' a la primera' + (P.errores === 0 ? ' · ¡lección perfecta!' : '') + (P.mejorRacha >= 3 ? ' · racha de ' + P.mejorRacha : '') + '</div>' +
      (P.pts < 20 + P.firstOk * 10 ? '<div class="chip neutral">Llegaste al tope de 200 puntos de hoy</div>' : '') + '</div>' +
      '<div class="card stack"><div class="row"><b class="grow">' + esc(c.nombre) + '</b><b class="num">' + hechas + ' de ' + L.length + '</b></div><div class="bar-p"><i style="width:' + Math.round(hechas / L.length * 100) + '%"></i></div>' +
      '<span class="muted" style="font-size:14px">' + (todas ? (c.eval ? 'Siguiente paso: la evaluación.' : 'Siguiente paso: tu práctica con un validador.') : 'Siguiente: ' + esc((findLesson(P.curso, L.find(x => !part.hechas.includes(x))) || {}).titulo || '')) + '</span></div>' +
      '<div class="notice info">' + ic('info') + '<span>Los puntos son para motivarte. Lo que acredita el curso es la evaluación' + (c.practica ? ' y la práctica' : '') + '.</span></div>' +
      '<div class="pfoot"><button class="btn pri block" data-act="finLeccion" autofocus>Continuar</button></div></div>';
  }
  const a = act(); const total = P.queue.length; const pr = Math.round(P.pos / total * 100);
  const labels = { img: 'Elige la imagen', mc: 'Elige una opción', tf: 'Verdadero o falso', order: 'Ordena los pasos', hotspot: 'Identifica situaciones', decision: 'Caso de decisión' };
  let h = '<div class="player wrap"><div class="ptop"><button class="iconbtn" data-act="cerrarLeccion" aria-label="Cerrar lección">' + ic('x') + '</button><div class="bar-p" role="progressbar" aria-valuenow="' + pr + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pr + '%;background:var(--coral)"></i></div><b class="num">' + (P.pos + 1) + '/' + total + '</b>' +
    '<span class="pts-chip" title="Puntos de esta lección">' + ic('star', 's') + '<b class="num">' + P.pts + '</b>' + (P.flot ? '<i class="flot">' + P.flot + '</i>' : '') + '</span></div>';
  h += '<div><span class="eyebrow">' + labels[a.t] + (P.pos >= l.acts.length ? ' · repaso' : '') + '</span>' + (P.racha >= 2 && P.phase === 'fb' && P.ok && P.fbNuevo ? ' <span class="chip coral racha">' + ic('sparkle', 's') + '¡' + P.racha + ' seguidas!</span>' : '') + '<div class="q" id="q-txt">' + esc(a.q) + '</div></div>';
  const locked = P.phase !== 'q'; const sh = P.shake ? ' shake' : '';
  if (a.t === 'mc' || a.t === 'decision') h += '<div class="opts' + sh + '" role="group" aria-labelledby="q-txt">' + a.ops.map((o, i) => '<button class="opt ' + optCls(i, a) + '" aria-pressed="' + (P.sel === i) + '" data-act="sel" data-i="' + i + '" ' + (locked ? 'disabled' : '') + '><span class="k">' + 'ABCD'[i] + '</span>' + esc(o) + '</button>').join('') + '</div>';
  if (a.t === 'img') h += '<div class="imgopts' + sh + '" role="group" aria-labelledby="q-txt">' + a.ops.map((o, i) => '<button class="imgopt ' + optCls(i, a) + '" aria-pressed="' + (P.sel === i) + '" data-act="sel" data-i="' + i + '" ' + (locked ? 'disabled' : '') + '>' + svgEstacion(a.imgs[i]) + esc(o) + '</button>').join('') + '</div>';
  if (a.t === 'tf') h += '<div class="tf' + sh + '" role="group" aria-labelledby="q-txt">' + [true, false].map(v => '<button class="opt ' + optCls(v, a) + '" aria-pressed="' + (P.sel === v) + '" data-act="sel" data-i="' + v + '" ' + (locked ? 'disabled' : '') + '>' + (v ? 'Verdadero' : 'Falso') + '</button>').join('') + '</div>';
  if (a.t === 'order') {
    const pool = a.items.map((t, i) => i).filter(i => !P.seq.includes(i)); const orden = P.ord || (P.ord = shuffle(a.items.map((_, i) => i), P.lid.length + P.pos + 7));
    h += '<div class="seq' + sh + '">' + a.items.map((_, k) => { const i = P.seq[k]; if (i === undefined) return '<div class="slot"><span class="k" style="width:30px;height:30px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;font-weight:800">' + (k + 1) + '</span>Toca un paso para colocarlo aquí</div>'; const good = locked && i === k, bad = locked && i !== k; return '<button class="opt ' + (good ? 'good' : bad ? 'bad' : '') + '" aria-pressed="true" data-act="unseq" data-k="' + k + '" ' + (locked ? 'disabled' : '') + ' aria-label="Paso ' + (k + 1) + ': ' + esc(a.items[i]) + '. Toca para quitar."><span class="k">' + (k + 1) + '</span>' + esc(a.items[i]) + '</button>'; }).join('') + '</div>' +
      (pool.length ? '<div class="pool">' + orden.filter(i => pool.includes(i)).map(i => '<button class="opt" data-act="seq" data-i="' + i + '" ' + (locked ? 'disabled' : '') + '>' + ic('plus', 's') + esc(a.items[i]) + '</button>').join('') + '</div>' : '');
  }
  if (a.t === 'hotspot') {
    if (P.list) h += '<div class="opts">' + HS.map(x => '<label class="ck" style="border-radius:16px;padding:12px 14px"><input type="checkbox" id="hs-' + x.id + '" data-chg="hsList" data-id="' + x.id + '" ' + (P.found.includes(x.id) ? 'checked' : '') + ' ' + (locked ? 'disabled' : '') + '>' + esc(x.label) + '</label>').join('') + '</div>';
    else h += '<div class="scene">' + svgEscena(P.found) + '</div>';
    h += '<div class="row" style="flex-wrap:wrap"><span class="chip ' + (P.found.length ? 'ok' : 'neutral') + '">' + ic('check', 's') + P.found.length + ' de 3 marcadas</span><span class="grow"></span><button class="btn ghost sm" data-act="hsToggle">' + (P.list ? 'Usar imagen' : 'Usar lista en lugar de imagen') + '</button></div>';
  }
  if (P.phase === 'fb') {
    let exp = a.exp; if (a.t === 'decision') exp = a.res[P.sel] + ' ' + (P.ok ? '' : a.exp);
    const correcta = a.t === 'mc' || a.t === 'img' ? (P.ok ? '' : 'Respuesta correcta: «' + a.ops[a.ok] + '». ') : a.t === 'tf' ? (P.ok ? '' : 'La respuesta correcta es «' + (a.ok ? 'Verdadero' : 'Falso') + '». ') : '';
    h += '<div class="fb ' + (P.ok ? 'good' : 'bad') + (P.fbNuevo ? ' entra' : '') + '" role="status"><h3>' + ic(P.ok ? 'check' : 'x') + (P.ok ? ['¡Correcto!', '¡Muy bien!', '¡Exacto!'][P.pos % 3] : 'Revisa esto') + '</h3><p>' + esc(correcta + exp) + (P.ok ? '' : ' Repasarás esta actividad al final de la lección.') + '</p></div>';
  }
  const listo = a.t === 'order' ? P.seq.length === a.items.length : a.t === 'hotspot' ? P.found.length > 0 : P.sel !== null;
  h += '<div class="pfoot">' + (P.phase === 'q' ? '<button class="btn pri block" data-act="comprobar" ' + (listo ? '' : 'disabled') + '>Comprobar</button>' : '<button class="btn ' + (P.ok ? 'pri' : 'dark') + ' block" data-act="siguiente" ' + (P.enviado ? 'disabled' : '') + '>' + (P.enviado ? 'Guardando…' : P.ok ? 'Continuar' : 'Entendido') + '</button>') +
    '<p class="demo-note atajos" style="text-align:center;margin:0">Atajos: teclas 1 a 4 para elegir · Enter para comprobar y continuar</p><p class="demo-note" style="text-align:center;margin:0">Contenido de ejemplo (DEMO); no es un procedimiento de la empresa.</p></div></div>';
  P.flot = null; P.shake = false; P.fbNuevo = false;
  return h;
}
function optCls(i, a) { const P = U.player; if (P.phase !== 'fb') return ''; if (i === a.ok) return 'good'; if (i === P.sel) return 'bad'; return ''; }
function shuffle(arr, s) { const R = rng(s); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (a.every((v, i) => v === arr[i])) a.push(a.shift()); return a; }
function comprobar() {
  const P = U.player; const a = act(); let ok;
  if (a.t === 'order') ok = P.seq.every((v, i) => v === i);
  else if (a.t === 'hotspot') ok = HS.filter(h => h.ok).every(h => P.found.includes(h.id)) && P.found.every(id => HS.find(h => h.id === id).ok);
  else ok = P.sel === a.ok;
  P.phase = 'fb'; P.ok = ok; P.fbNuevo = true;
  const primera = P.pos < findLesson(P.curso, P.lid).acts.length;
  if (ok) { P.racha++; P.mejorRacha = Math.max(P.mejorRacha, P.racha); if (primera) { P.firstOk++; P.pts += 10; P.flot = '+10'; } vibrar(25); }
  else { P.racha = 0; P.errores++; if (primera) P.retry.push(P.queue[P.pos]); P.shake = true; vibrar([40, 60, 40]); }
  live(ok ? 'Correcto' : 'Incorrecto. ' + a.exp);
}
async function siguiente() {
  const P = U.player;
  if (P.pos === P.queue.length - 1 && P.retry.length) { P.queue = P.queue.concat(P.retry); P.retry = []; }
  if (P.pos >= P.queue.length - 1) {
    if (P.enviado) return; P.enviado = true; render();
    const r = await hacer(async () => {
      const x = await api('/api/aprender/leccion', { participacion: P.pid, leccion: P.lid, correctas: P.firstOk, perfecta: P.errores === 0 });
      P.pts = x.puntos || 0; P.done = true; vibrar([30, 40, 30]); return x;
    });
    if (!r) { P.enviado = false; render(); }
    return;
  }
  P.pos++; P.sel = null; P.seq = []; P.ord = null; P.found = []; P.phase = 'q'; P.ok = null; P.list = false;
}

/* ---------- Evaluación (preguntas y calificación en el servidor) ---------- */
function preExamen(aid) {
  const a = S.asigs.find(x => x.id === aid); const part = partActual(a); const c = CURSOS[a.curso]; const closed = part.intentos.filter(i => i.fecha); const abierto = part.intentos.some(i => !i.fecha);
  U.modal = { t: 'preExamen', aid, html: '<h2 style="font-size:24px">' + (abierto ? 'Tienes un intento abierto' : 'Antes de empezar') + '</h2><p class="muted" style="margin:0">' + esc(c.nombre) + ' · versión ' + (part.version || c.version) + '. Cada respuesta se guarda en cuanto la eliges.</p>' +
    '<div class="card" style="background:var(--bg)"><div class="crit">' + ic('list') + '<span class="grow">Preguntas</span><b>' + c.eval.preguntas + '</b></div><div class="crit">' + ic('clock') + '<span class="grow">Tiempo</span><b>Sin límite</b></div><div class="crit">' + ic('flag') + '<span class="grow">Calificación mínima</span><b>' + c.eval.min + '</b></div><div class="crit">' + ic('swap') + '<span class="grow">Intentos restantes</span><b>' + (c.eval.intentos + part.extra - closed.length) + ' de ' + (c.eval.intentos + part.extra) + '</b></div></div>' +
    '<div class="notice info">' + ic('info') + '<span>Si no apruebas, verás qué temas repasar. Las preguntas de la evaluación no dan puntos.</span></div>' +
    '<div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost" data-act="cerrarModal">Ahora no</button><button class="btn pri" data-act="iniciarExamen" data-a="' + aid + '">' + (abierto ? 'Continuar intento' : 'Iniciar evaluación') + '</button></div>' };
}
async function iniciarExamen(aid) {
  const a = S.asigs.find(x => x.id === aid); const part = partActual(a);
  const r = await hacer(() => api('/api/aprender/examen', { participacion: part.id }));
  if (!r) return;
  const p2 = S.parts.find(x => x.id === part.id); const it = p2 && p2.intentos.find(i => !i.fecha);
  if (!it) { render(); return; }
  const ans = Object.assign({}, it.ans || {}); const guardado = {}; Object.keys(ans).forEach(k => { guardado[k] = true; });
  const idx = Math.max(0, it.qs.findIndex((_, i) => ans[i] === undefined));
  U.modal = null; U.exam = { aid, pid: part.id, curso: a.curso, iid: it.id, n: it.n, qs: it.qs, ans, guardado, pend: [], idx: idx < 0 ? 0 : idx, confirm: false, sent: false };
  render(); window.scrollTo(0, 0);
}
function renderExam() {
  const E = U.exam; const c = CURSOS[E.curso];
  if (E.confirm) {
    const sin = E.qs.filter((_, i) => E.ans[i] === undefined).length;
    return '<div class="player wrap"><h1 style="font-size:28px">¿Enviar evaluación?</h1><div class="card stack"><div class="row"><span class="grow">Respondidas</span><b>' + (E.qs.length - sin) + ' de ' + E.qs.length + '</b></div>' + (sin ? '<div class="notice warn">' + ic('alert') + '<span>Tienes ' + sin + ' sin responder. Contarán como incorrectas.</span></div>' : '') + '<p class="muted" style="margin:0">Una vez enviada, no podrás cambiar tus respuestas.</p></div><div class="pfoot"><button class="btn pri block" data-act="enviarExamen" ' + (E.sent ? 'disabled' : '') + '>' + (E.sent ? 'Calificando…' : 'Enviar evaluación') + '</button><button class="btn ghost block" data-act="volverExamen">Revisar respuestas</button></div></div>';
  }
  const q = c.banco[E.qs[E.idx]]; const sel = E.ans[E.idx];
  let h = '<div class="player wrap"><div class="ptop"><span class="chip neutral">Evaluación · intento ' + E.n + '</span><div class="bar-p"><i style="width:' + Math.round(Object.keys(E.ans).length / E.qs.length * 100) + '%"></i></div><b class="num">' + (E.idx + 1) + '/' + E.qs.length + '</b></div>';
  h += '<div class="q" id="eq">' + esc(q.q) + '</div>';
  if (q.t === 'tf') h += '<div class="tf" role="group" aria-labelledby="eq">' + [true, false].map(v => '<button class="opt" aria-pressed="' + (sel === v) + '" data-act="resp" data-v="' + v + '">' + (v ? 'Verdadero' : 'Falso') + '</button>').join('') + '</div>';
  else h += '<div class="opts" role="group" aria-labelledby="eq">' + q.ops.map((o, i) => '<button class="opt" aria-pressed="' + (sel === i) + '" data-act="resp" data-v="' + i + '"><span class="k">' + 'ABCD'[i] + '</span>' + esc(o) + '</button>').join('') + '</div>';
  const estadoG = sel === undefined ? '' : E.guardado[E.idx] ? '<span class="chip ok" style="margin-left:auto">' + ic('check', 's') + 'Guardada</span>' : E.guardado[E.idx] === false ? '<span class="chip danger" style="margin-left:auto">' + ic('alert', 's') + 'Sin guardar · toca de nuevo</span>' : '<span class="chip neutral" style="margin-left:auto">Guardando…</span>';
  h += '<div class="row" style="flex-wrap:wrap;gap:6px">' + E.qs.map((_, i) => '<button class="btn sm ' + (i === E.idx ? 'pri' : E.ans[i] !== undefined ? 'soft' : 'ghost') + '" data-act="irPregunta" data-i="' + i + '" aria-label="Pregunta ' + (i + 1) + '">' + (i + 1) + '</button>').join('') + estadoG + '</div>';
  h += '<div class="pfoot">' + (E.idx < E.qs.length - 1 ? '<button class="btn pri block" data-act="irPregunta" data-i="' + (E.idx + 1) + '">Siguiente pregunta</button>' : '<button class="btn pri block" data-act="confExamen">Revisar y enviar</button>') + '<p class="demo-note" style="text-align:center;margin:0">Sin puntos ni animaciones durante la evaluación. La calificación la calcula el servidor al enviar.</p></div></div>';
  return h;
}
function responder(v) {
  const E = U.exam; const idx = E.idx; E.ans[idx] = v; E.guardado[idx] = undefined; render();
  const pr = api('/api/aprender/examen/respuesta', { intento: E.iid, indice: idx, valor: v })
    .then(() => { if (U.exam === E && E.ans[idx] === v) { E.guardado[idx] = true; render(); } })
    .catch(e => { if (U.exam === E) { E.guardado[idx] = false; render(); if (e.status !== 401) toast(e.message, 'error'); } });
  E.pend.push(pr);
}
async function enviarExamen() {
  const E = U.exam; if (E.sent) return; E.sent = true; render();
  await Promise.allSettled(E.pend);
  const faltan = Object.keys(E.ans).filter(k => E.guardado[k] === false);
  if (faltan.length) { E.sent = false; E.confirm = false; E.idx = Number(faltan[0]); toast('Una respuesta no se guardó. Vuelve a elegirla.', 'error'); render(); return; }
  const r = await hacer(() => api('/api/aprender/examen/enviar', { intento: E.iid }));
  if (!r) { E.sent = false; render(); return; }
  U.exam = null; U.view = 'resultado'; U.p = { part: E.pid, res: r.resultado }; render(); window.scrollTo(0, 0);
}

/* ---------- Administrar ---------- */
function menu() {
  const m = [];
  m.push(['tablero', 'chart', 'Tablero']);
  if (tiene('admin') || tiene('rh') || tiene('auditor') || tiene('supervisor')) m.push(['personas', 'users', tiene('supervisor') ? 'Mi equipo' : 'Personas']);
  if (tiene('admin') || tiene('rh') || tiene('auditor')) m.push(['reglas', 'list', 'Reglas de asignación']);
  m.push(['matriz', 'grid', 'Matriz de capacitación']);
  if (puede('validar')) m.push(['validacion', 'shield', 'Validación práctica']);
  if (!tiene('instructor')) m.push(['constancias', 'doc', 'Constancias']);
  m.push(['reportes', 'down', 'Reportes y exportaciones']);
  if (puede('bitacora')) m.push(['bitacora', 'list', 'Bitácora']);
  if (tiene('admin') || tiene('rh') || tiene('auditor') || tiene('instructor')) m.push(['cursos', 'book', 'Cursos']);
  return m;
}
function renderAdmin() {
  const c = cuenta(); const p = yo(); const m = menu();
  if (!m.some(x => x[0] === U.view) && U.view !== 'persona') U.view = 'tablero';
  const ini = p.nombre.split(' ').map(x => x[0]).slice(0, 2).join('');
  let side = '<nav class="side" aria-label="Administración"><div class="side-brand"><svg style="width:32px;height:32px"><use href="#logo"/></svg>Nexo</div><div class="who"><span class="avatar" style="background:var(--primary);color:var(--on-primary)">' + esc(ini) + '</span><div><b>' + esc(p.nombre) + '</b><small>' + esc(c.roles.filter(r => r !== 'trabajador').map(r => ROL[r]).join(' · ')) + '</small></div></div>';
  side += '<button class="navb buscarb" data-act="abrirBuscar">' + ic('search', 's') + 'Buscar<kbd>Ctrl K</kbd></button>';
  m.forEach(([v, i, t]) => { side += '<button class="navb" data-act="go" data-v="' + v + '"' + (U.view === v || (U.view === 'persona' && v === 'personas') ? ' aria-current="page"' : '') + '>' + ic(i, 's') + t + '</button>'; });
  side += '<div class="g">Sesión</div>' + (tiene('trabajador') ? '<button class="navb" data-act="space" data-s="aprender">' + ic('book', 's') + 'Ir a Aprender</button>' : '') + '<button class="navb" data-act="salir">' + ic('out', 's') + 'Salir</button><div class="side-corp"><svg class="brand-logo" viewBox="0 0 300 112" style="width:96px;height:36px" role="img" aria-label="Grupo PIGSA88"><use href="#pigsa"/></svg></div></nav>';
  const views = { tablero: aTablero, personas: aPersonas, persona: aPersona, reglas: aReglas, matriz: aMatriz, validacion: aValidacion, constancias: aConstancias, reportes: aReportes, bitacora: aBitacora, cursos: aCursos };
  return '<div class="adm">' + side + '<div class="amain wrap">' + (views[U.view] || aTablero)() + '</div></div>';
}
function scopeLine(extra) { const al = alcance(); return '<div class="scope"><span class="chip primary">' + ic('grid', 's') + esc(S.org.grupo) + ' › ' + esc(al.etiqueta) + '</span><span class="chip neutral">' + ic('cal', 's') + 'Corte: ' + fmt(hoy()) + ', fin del día (hora de la planta)</span>' + (soloLectura() ? '<span class="chip warn">' + ic('eye', 's') + 'Solo lectura</span>' : '') + (extra || '') + '<span class="chip coral">DEMO · datos ficticios</span><button class="chip neutral refresh" data-act="actualizar" title="Actualizar datos">' + ic('reset', 's') + 'Actualizado ' + (U.actualizado ? new Date(U.actualizado).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '') + '</button></div>'; }
function kpi(l, v, d, cls, k) { const tag = k ? 'button' : 'div'; return '<' + tag + ' class="kpi ' + (cls || '') + (k ? ' click' : '') + '"' + (k ? ' data-act="kpi" data-k="' + k + '" title="Ver detalle"' : '') + '><div class="l">' + l + (k ? ' ' + ic('chev', 's') : '') + '</div><div class="v ' + (cls && cls !== 'main' ? cls : '') + '">' + v + '</div><div class="d">' + d + '</div></' + tag + '>'; }
function aTablero() {
  const al = alcance(); const area = U.p.area || ''; const rows = filas(al, a => !area || persona(a.persona).area === area); const I = indicadores(rows);
  let h = '<div class="atop"><h1>Tablero de cumplimiento</h1>' + (soloLectura() ? '' : '<button class="btn soft sm" data-act="go" data-v="reportes">' + ic('down', 's') + 'Exportar</button>') + '</div>' + scopeLine();
  if (!rows.length) return h + '<div class="panel empty"><span class="shape">' + ic('chart', 'xl') + '</span><h3>Todavía no hay asignaciones en este alcance</h3><p class="muted" style="margin:0;max-width:440px">' + (tiene('instructor') ? 'Cuando RH asigne tus cursos, aquí verás el avance de quienes los toman.' : 'Crea una regla de asignación para empezar.') + '</p></div>';
  if (al.nivel === 'empresa') h += '<div class="filters"><label class="field"><span>Área</span><select class="input" id="f-area" data-chg="fArea"><option value="">Todas las áreas</option>' + AREAS.map(a => '<option value="' + a.id + '"' + (area === a.id ? ' selected' : '') + '>' + a.nombre + '</option>').join('') + '</select></label></div>';
  h += '<div class="kpis six">' + '<div class="kpi main conanillo">' + anillo(pct(I.cumplen, I.den), 76, 9, 'var(--on-primary)') + '<div><div class="l">Cumplimiento</div><div class="v">' + pctTxt(I.cumplen, I.den) + '</div><div class="d">' + I.cumplen.toLocaleString('es-MX') + ' de ' + I.den.toLocaleString('es-MX') + ' asignaciones</div></div></div>' + kpi('Personas al 100 %', pctTxt(I.total, I.personas), I.total + ' de ' + I.personas + ' personas') + kpi('Atrasadas', I.n.atrasada, 'fecha límite vencida', 'v-danger', 'atrasada') + kpi('Vencidas', I.n.vencida, 'acreditación expirada', 'v-danger', 'vencida') + kpi('Por vencer · 30 días', I.n.por_vencer, 'incluidas en cumplimiento', 'v-warn', 'por_vencer') + kpi('Pendientes de validación', I.pv, I.pv7 + ' con más de 7 días', 'v-violet', 'pv') + '</div>';
  const grp = al.nivel === 'empresa' ? (area ? 'turno' : 'area') : 'curso';
  const keyf = { area: r => r.p.area, turno: r => r.p.turno, curso: r => r.a.curso }[grp]; const namef = { area: k => AREA[k], turno: k => 'Turno ' + k.slice(1), curso: k => CURSOS[k].nombre }[grp];
  const g = {}; rows.forEach(r => { (g[keyf(r)] = g[keyf(r)] || []).push(r); });
  const lines = Object.entries(g).map(([k, rs]) => ({ k, I: indicadores(rs) })).sort((a, b) => pct(a.I.cumplen, a.I.den) - pct(b.I.cumplen, b.I.den));
  h += '<div class="cols2 dash"><div class="panel"><div class="ph">Cumplimiento por ' + { area: 'área', turno: 'turno', curso: 'curso' }[grp] + '<span class="sp"></span><span class="chip neutral">menor a mayor</span></div><div class="tw"><table class="t"><thead><tr><th>' + { area: 'Área', turno: 'Turno', curso: 'Curso' }[grp] + '</th><th>Cumplimiento</th><th class="r">Al día</th><th class="r">Asignaciones</th><th class="r">Atrasadas</th><th class="r">Vencidas</th></tr></thead><tbody>' +
    lines.map(l => '<tr><td>' + esc(namef(l.k)) + '</td><td><div class="hbar"><div class="bar-p"><i style="width:' + pct(l.I.cumplen, l.I.den).toFixed(1) + '%"></i></div><b>' + pctTxt(l.I.cumplen, l.I.den) + '</b></div></td><td class="r">' + l.I.cumplen + '</td><td class="r">' + l.I.den + '</td><td class="r">' + l.I.n.atrasada + '</td><td class="r">' + l.I.n.vencida + '</td></tr>').join('') +
    '</tbody><tfoot><tr><td>Total</td><td>' + pctTxt(I.cumplen, I.den) + '</td><td class="r">' + I.cumplen + '</td><td class="r">' + I.den + '</td><td class="r">' + I.n.atrasada + '</td><td class="r">' + I.n.vencida + '</td></tr></tfoot></table></div></div>';
  const prox = rows.filter(r => r.c.k === 'por_vencer').sort((a, b) => a.c.fecha.localeCompare(b.c.fecha));
  h += '<div class="panel"><div class="ph">Próximos vencimientos<span class="sp"></span><span class="chip warn">30 días</span></div><div class="tw"><table class="t"><thead><tr><th>Persona</th><th>Curso</th><th class="r">Vence</th></tr></thead><tbody>' +
    (prox.length ? prox.slice(0, 7).map(r => '<tr class="click" data-act="persona" data-id="' + r.p.id + '"><td>' + esc(r.p.tipo === 'contratista' ? r.p.num + ' · ' + r.p.nombre : r.p.nombre) + '</td><td>' + esc(CURSOS[r.a.curso].nombre) + '</td><td class="r">' + fmt(r.c.fecha) + '</td></tr>').join('') + (prox.length > 7 ? '<tr><td colspan="3" class="muted">y ' + (prox.length - 7) + ' más</td></tr>' : '') : '<tr><td colspan="3" class="muted">Nada vence en los próximos 30 días.</td></tr>') + '</tbody></table></div></div></div>';
  h += '<p class="demo-note" style="margin:0">Cumplimiento = (Al día + Por vencer) ÷ asignaciones obligatorias vigentes, sin exentas (' + I.n.exenta + ') ni opcionales (indicador I-05). Atribución por adscripción a la fecha de corte. Datos ficticios.</p>';
  return h;
}
function aPersonas() {
  const al = alcance(); const q = (U.p.q || '').toLowerCase(); const area = U.p.area || '';
  const lista = S.personas.filter(p => al.personas.includes(p.id) && (!area || p.area === area) && (!q || (p.nombre + ' ' + p.num).toLowerCase().includes(q)));
  let h = '<div class="atop"><h1>' + (tiene('supervisor') ? 'Mi equipo' : 'Personas') + '</h1></div>' + scopeLine() + '<div class="filters"><label class="field" style="flex:1;min-width:220px"><span>Buscar</span><input class="input" id="f-q" data-inp="fq" placeholder="Nombre o número de empleado" value="' + esc(U.p.q || '') + '"></label>' + (al.nivel === 'empresa' ? '<label class="field"><span>Área</span><select class="input" id="f-area2" data-chg="fArea"><option value="">Todas</option>' + AREAS.map(a => '<option value="' + a.id + '"' + (area === a.id ? ' selected' : '') + '>' + a.nombre + '</option>').join('') + '</select></label>' : '') + '</div>';
  if (!lista.length) return h + '<div class="panel empty"><span class="shape">' + ic('search', 'xl') + '</span><h3>Ninguna persona coincide</h3><p class="muted" style="margin:0">Quita algún filtro para ver más resultados.</p></div>';
  h += '<div class="panel"><div class="ph">' + lista.length + ' personas<span class="sp"></span></div><div class="tw"><table class="t"><thead><tr><th>Persona</th><th>Número</th><th>Área · turno</th><th>Puesto</th><th>Cumplimiento</th><th>Cuenta</th></tr></thead><tbody>' +
    lista.slice(0, 60).map(p => { const rs = filas({ personas: [p.id], cursos: al.cursos }); const I = indicadores(rs); return '<tr class="click" data-act="persona" data-id="' + p.id + '"><td><b>' + esc(p.nombre) + '</b>' + (p.tipo === 'contratista' ? ' <span class="chip coral">Contratista</span>' : '') + '</td><td class="mono">' + p.num + '</td><td>' + AREA[p.area] + ' · ' + p.turno + '</td><td>' + esc(p.puesto) + '</td><td>' + (I.den ? I.cumplen + ' de ' + I.den + ' · ' + pctTxt(I.cumplen, I.den) : '—') + '</td><td>' + (p.cuenta === 'activa' ? '<span class="chip ok">Activa</span>' : '<span class="chip neutral">Sin activar</span>') + '</td></tr>'; }).join('') +
    (lista.length > 60 ? '<tr><td colspan="6" class="muted">y ' + (lista.length - 60) + ' más · usa la búsqueda</td></tr>' : '') + '</tbody></table></div></div>';
  return h;
}
function aPersona() {
  const p = persona(U.p.id); const al = alcance(); if (!p || !al.personas.includes(p.id)) return '<div class="panel empty"><h3>No tienes acceso a esta información con tu rol actual.</h3></div>';
  const tab = U.p.tab || 'cap';
  const rs = filas({ personas: [p.id], cursos: al.cursos }); const I = indicadores(rs);
  let h = '<div class="atop"><button class="iconbtn" data-act="go" data-v="personas" aria-label="Volver">' + ic('back') + '</button><span class="avatar" style="width:52px;height:52px">' + esc(p.nombre.split(' ').map(x => x[0]).slice(0, 2).join('')) + '</span><div class="grow" style="min-width:220px"><h1 style="font-size:26px">' + esc(p.nombre) + '</h1><div class="muted"><span class="mono">' + p.num + '</span> · ' + esc(S.org.empresa) + ' · ' + (AREA[p.area] || '') + (p.turno ? ' · Turno ' + p.turno.slice(1) : '') + ' · ' + esc(p.puesto) + (p.tipo === 'contratista' ? ' · ' + esc(p.contratista) + ' · acceso hasta ' + fmt(p.vence) : '') + '</div></div><button class="btn soft sm" data-act="exportar" data-r="individual" data-f="pdf" data-pid="' + p.id + '">' + ic('down', 's') + 'Reporte individual</button></div>';
  const tabs = [['cap', 'Capacitación'], ['hist', 'Historial'], ['ads', 'Adscripciones'], ['acc', 'Acceso'], ['bit', 'Bitácora']].filter(t => t[0] !== 'acc' || !tiene('supervisor')).filter(t => t[0] !== 'bit' || puede('bitacora'));
  h += '<div class="tabs" role="group">' + tabs.map(([k, t]) => '<button data-act="ptab" data-t="' + k + '" aria-pressed="' + (tab === k) + '">' + t + '</button>').join('') + '</div>';
  if (tab === 'cap') {
    h += '<div class="panel"><div class="ph">Asignaciones obligatorias<span class="sp"></span><span class="muted" style="font:600 13px var(--f-body)">' + I.cumplen + ' de ' + I.den + ' al día · ' + pctTxt(I.cumplen, I.den) + '</span></div><div class="tw"><table class="t"><thead><tr><th>Curso</th><th>Versión</th><th>Estado de cumplimiento</th><th>Fecha</th><th>Origen</th>' + (puede('excepcion') ? '<th>Excepción</th>' : '') + '</tr></thead><tbody>' +
      rs.map(r => { const part = r.c.part || partActual(r.a); const ver = r.c.acred ? r.c.acred.version : part && part.version || CURSOS[r.a.curso].version; const reg = S.reglas.find(x => x.id === r.a.regla); return '<tr><td>' + esc(CURSOS[r.a.curso].nombre) + '</td><td>v' + ver + '</td><td>' + chipCum(r.c) + '</td><td>' + cumFecha(r.c) + '</td><td>' + (reg ? 'Regla ' + reg.clave : 'Manual') + '</td>' + (puede('excepcion') ? '<td>' + (r.c.k === 'pendiente' || r.c.k === 'atrasada' ? '<button class="btn ghost sm" data-act="excepcion" data-a="' + r.a.id + '">' + (r.c.sub === 'no_aprobada' ? 'Intentos adicionales' : 'Prórroga o exención') + '</button>' : '') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div></div>';
  }
  if (tab === 'hist') {
    const parts = S.parts.filter(x => x.persona === p.id && (!al.cursos || al.cursos.includes(x.curso)));
    const intentos = parts.flatMap(x => x.intentos.filter(i => i.fecha).map(i => ({ x, i })));
    const vals = parts.flatMap(x => x.vals.map(v => ({ x, v })));
    const ks = S.consts.filter(k => k.persona === p.id && (!al.cursos || al.cursos.includes(k.curso)));
    h += '<div class="panel"><div class="ph">Intentos de evaluación</div><div class="tw"><table class="t"><thead><tr><th>Curso</th><th>Versión</th><th>Intento</th><th>Fecha</th><th class="r">Calificación</th><th>Resultado</th></tr></thead><tbody>' + (intentos.length ? intentos.sort((a, b) => b.i.fecha.localeCompare(a.i.fecha)).map(({ x, i }) => '<tr><td>' + esc(CURSOS[x.curso].nombre) + '</td><td>v' + x.version + '</td><td>' + i.n + '</td><td>' + fmt(i.fecha) + '</td><td class="r">' + (tiene('supervisor') && !i.aprobado ? '—' : Math.round(i.calif)) + '</td><td>' + (i.aprobado ? '<span class="chip ok">Aprobado</span>' : '<span class="chip danger">No aprobado</span>') + '</td></tr>').join('') : '<tr><td colspan="6" class="muted">Sin intentos registrados.</td></tr>') + '</tbody></table></div></div>';
    h += '<div class="panel"><div class="ph">Validaciones prácticas</div><div class="tw"><table class="t"><thead><tr><th>Curso</th><th>Fecha de la práctica</th><th>Validador</th><th>Resultado</th><th>Confirmación</th></tr></thead><tbody>' + (vals.length ? vals.map(({ x, v }) => '<tr><td>' + esc(CURSOS[x.curso].nombre) + '</td><td>' + fmt(v.fecha) + '</td><td>' + esc(v.validador) + '</td><td>' + (v.res === 'competente' ? '<span class="chip ok">Competente</span>' : '<span class="chip warn">Aún no competente</span>') + '</td><td>' + (v.conf ? 'Confirmada' : v.disp ? '<span class="chip danger">No reconocida</span>' : 'Pendiente') + '</td></tr>').join('') : '<tr><td colspan="5" class="muted">Sin validaciones.</td></tr>') + '</tbody></table></div></div>';
    h += '<div class="panel"><div class="ph">Constancias</div><div class="tw"><table class="t"><thead><tr><th>Folio</th><th>Curso</th><th>Emitida</th><th>Estado</th><th></th></tr></thead><tbody>' + (ks.length ? ks.map(k => '<tr><td class="mono">' + k.folio + '</td><td>' + esc(CURSOS[k.curso].nombre) + ' v' + k.version + '</td><td>' + fmt(k.emitida) + '</td><td>' + chipConst(k) + '</td><td><button class="btn ghost sm" data-act="verConst" data-k="' + k.id + '">Ver</button></td></tr>').join('') : '<tr><td colspan="5" class="muted">Sin constancias.</td></tr>') + '</tbody></table></div></div>';
  }
  if (tab === 'ads') h += '<div class="panel"><div class="ph">Adscripciones</div><div class="pb"><ul class="tl">' + p.adscripciones.slice().reverse().map(a => '<li class="' + (a.hasta ? '' : 'cur') + '"><span class="d"></span><div><b>' + AREA[a.area] + ' · Turno ' + a.turno.slice(1) + ' · ' + esc(a.puesto) + '</b><div class="muted">' + (a.hasta ? fmt(a.desde) + ' – ' + fmt(a.hasta) : 'desde ' + fmt(a.desde)) + '</div></div></li>').join('') + '</ul><p class="demo-note">Un movimiento crea una nueva adscripción; la anterior y el historial de capacitación se conservan.</p></div></div>';
  if (tab === 'acc') {
    h += '<div class="panel"><div class="ph">' + ic('key', 's') + ' Acceso</div><div class="pb stack"><div class="row"><span class="grow muted">Cuenta</span>' + (p.cuenta === 'activa' ? '<span class="chip ok">Activa</span>' : '<span class="chip neutral">Sin activar</span>') + '</div><div class="row"><span class="grow muted">Último acceso</span><span>' + (p.ultimo ? fmt(p.ultimo) : '—') + '</span></div>';
    if (U.p.codigo) h += '<div class="ficha"><div class="row"><svg style="width:40px;height:40px"><use href="#logo"/></svg><div class="grow"><b>Ficha de ' + (U.p.codigo.tipo === 'activacion' ? 'activación' : 'restablecimiento') + ' · Nexo</b><div class="muted">' + esc(p.nombre) + ' · <span class="mono">' + esc(p.num) + '</span></div></div></div><div class="codigo mono">' + esc(U.p.codigo.c) + '</div><div>' + (U.p.codigo.tipo === 'activacion' ? 'Vence el ' + new Date(U.p.codigo.vence).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) + '. Entra a Nexo, toca «¿Es tu primera vez?» y escribe este código con tu número de empleado.' : 'Vence en 30 minutos. La persona entra a «¿Es tu primera vez?» con este código y crea una nueva frase. Sus sesiones anteriores se cerraron.') + '</div><p class="muted" style="margin:0;font-size:13px">Entrégalo en persona. El código se muestra una sola vez y solo sirve una vez.</p><button class="btn soft sm noprint" data-act="imprimirFicha" style="align-self:flex-start">' + ic('down', 's') + 'Imprimir ficha</button></div>';
    else if (puede('acceso') && p.cuenta !== 'activa') h += '<div class="notice info">' + ic('info') + '<span>La cuenta aún no está activa. Genera una ficha con un código de activación (vence en 72 horas) y entrégala en persona.</span></div><button class="btn pri" data-act="fichaActivacion" style="align-self:flex-start">' + ic('key', 's') + 'Generar ficha de activación</button>';
    else if (puede('acceso')) h += '<div class="notice warn">' + ic('alert') + '<span>Verifica la identidad en persona (gafete o identificación) antes de restablecer.</span></div><form class="stack" data-submit="restablecer"><label class="ck" style="border-radius:14px"><input type="checkbox" name="verif" id="r-verif" required> Verifiqué la identidad en persona</label><label class="field"><span>Motivo</span><input class="input" name="motivo" id="r-motivo" required placeholder="Ej.: olvidó su frase de acceso"></label><button class="btn pri" type="submit" style="align-self:flex-start">' + ic('key', 's') + 'Restablecer acceso</button></form>';
    else h += '<p class="muted" style="margin:0">Solo el Administrador puede restablecer accesos (decisión B-3).</p>';
    h += '</div></div>';
  }
  if (tab === 'bit') { const b = S.bit.filter(x => x.detalle.includes(p.nombre) || x.actor === p.nombre); h += bitTable(b.filter(x => !x.tecnico).slice(0, 40)); }
  return h;
}
function chipConst(k) { return { vigente: '<span class="chip ok">Vigente</span>', generando: '<span class="chip neutral">Generando…</span>', sustituida: '<span class="chip neutral">Sustituida</span>', revocada: '<span class="chip danger">Revocada</span>' }[k.estado]; }
function aReglas() {
  const W = U.p.wiz;
  let h = '<div class="atop"><h1>Reglas de asignación</h1>' + (puede('regla') && !W ? '<button class="btn pri" data-act="nuevaRegla">' + ic('plus', 's') + 'Nueva regla</button>' : '') + '</div>' + scopeLine();
  if (W) return h + wizard(W);
  h += '<div class="panel"><div class="tw"><table class="t"><thead><tr><th>Regla</th><th>Curso</th><th>A quién</th><th>Fecha límite</th><th class="r">Asignaciones</th><th>Creada</th></tr></thead><tbody>' +
    S.reglas.slice().reverse().map(r => '<tr><td><b>' + r.clave + '</b>' + (r.nueva ? ' <span class="chip coral">Nueva</span>' : '') + '</td><td>' + esc(CURSOS[r.curso].nombre) + '</td><td>' + (r.areas.length === AREAS.length ? 'Toda la empresa' : r.areas.map(a => AREA[a]).join(', ')) + (r.turnos.length < 3 ? ' · ' + r.turnos.join(', ') : '') + '</td><td>' + r.dias + ' días después de asignar</td><td class="r">' + r.asignaciones + '</td><td>' + fmt(r.creada) + ' · ' + esc(r.autor) + '</td></tr>').join('') + '</tbody></table></div></div>';
  return h;
}
function wizard(W) {
  const pasos = ['Qué', 'A quién', 'Cuándo y vista previa'];
  let h = '<div class="steps">' + pasos.map((t, i) => '<span class="' + (i < W.paso ? 'done' : i === W.paso ? 'on' : '') + '">' + (i < W.paso ? ic('check', 's') : (i + 1) + '.') + ' ' + t + '</span>').join('') + '</div><div class="panel"><div class="pb stack" style="padding-top:18px">';
  if (W.paso === 0) h += '<label class="field"><span>Curso publicado</span><select class="input" id="w-curso" data-chg="wCurso">' + Object.values(CURSOS).map(c => '<option value="' + c.id + '"' + (W.curso === c.id ? ' selected' : '') + '>' + esc(c.nombre) + ' · v' + c.version + '</option>').join('') + '</select></label><div class="checks"><span class="ck"><input type="radio" checked disabled> Obligatorio</span><span class="ck"><input type="radio" disabled> Opcional (próximamente)</span></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="cancelWiz">Cancelar</button><button class="btn pri" data-act="wPaso" data-n="1">Siguiente</button></div>';
  if (W.paso === 1) h += '<div class="field"><span>Áreas <button type="button" class="btn ghost sm" data-act="wTodas">' + (W.areas.length === AREAS.length ? 'Quitar todas' : 'Seleccionar todas') + '</button></span><div class="checks">' + AREAS.map(a => '<label class="ck"><input type="checkbox" id="w-a-' + a.id + '" data-chg="wArea" data-id="' + a.id + '" ' + (W.areas.includes(a.id) ? 'checked' : '') + '>' + a.nombre + '</label>').join('') + '</div></div><div class="field"><span>Turnos</span><div class="checks">' + TURNOS.map(t => '<label class="ck"><input type="checkbox" id="w-t-' + t + '" data-chg="wTurno" data-id="' + t + '" ' + (W.turnos.includes(t) ? 'checked' : '') + '>Turno ' + t.slice(1) + '</label>').join('') + '</div></div><label class="ck" style="align-self:flex-start"><input type="checkbox" id="w-con" data-chg="wCon" ' + (W.contratistas ? 'checked' : '') + '> Incluir contratistas</label><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="wPaso" data-n="0">Atrás</button><button class="btn pri" data-act="wPaso" data-n="2" ' + (W.areas.length && W.turnos.length ? '' : 'disabled') + '>Siguiente</button></div>';
  if (W.paso === 2) {
    const pv = vistaPreviaRegla(W); const nuevos = pv.filter(x => !x.ya); const vig = nuevos.filter(x => x.vig).length; const con = nuevos.filter(x => x.p.tipo === 'contratista').length;
    h += '<label class="field" style="max-width:320px"><span>Fecha límite (días después de asignar)</span><input class="input" type="number" min="1" max="365" id="w-dias" data-chg="wDias" value="' + W.dias + '"></label><p class="muted" style="margin:0">Aplica también a quien ingrese después a este alcance.</p>' +
      '<div class="kpis four">' + kpi('Personas que recibirán el curso', nuevos.length, 'adscripción vigente al ' + fmt(hoy()), 'main') + kpi('Ya acreditado y vigente', vig, 'quedarán «Al día» de inmediato', 'v-ok') + kpi('Contratistas incluidos', con, 'identificador «C-»') + kpi('Ya tenían la asignación', pv.length - nuevos.length, 'no se duplica') + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>Persona</th><th>Número</th><th>Área · turno</th><th>Resultado</th><th>Fecha límite</th></tr></thead><tbody>' + pv.slice(0, 8).map(x => '<tr><td>' + esc(x.p.nombre) + '</td><td class="mono">' + x.p.num + '</td><td>' + AREA[x.p.area] + ' · ' + x.p.turno + '</td><td>' + (x.ya ? '<span class="chip neutral">Ya asignado</span>' : x.vig ? '<span class="chip ok">' + ic('check', 's') + 'Ya vigente</span>' : '<span class="chip primary">Nueva asignación</span>') + '</td><td>' + (x.ya || x.vig ? '—' : fmt(D.add(hoy(), W.dias))) + '</td></tr>').join('') + (pv.length > 8 ? '<tr><td colspan="5" class="muted">y ' + (pv.length - 8) + ' personas más</td></tr>' : '') + '</tbody></table></div>' +
      '<div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost" data-act="wPaso" data-n="1">Atrás</button><button class="btn pri" data-act="crearRegla" ' + (nuevos.length ? '' : 'disabled') + '>' + ic('check', 's') + 'Crear regla y asignar a ' + nuevos.length + ' personas</button></div>';
  }
  return h + '</div></div>';
}
function matrizCursos() { const al = alcance(); return al.cursos || Object.keys(CURSOS); }
function aMatriz() {
  const al = alcance(); const area = U.p.marea || (al.nivel === 'empresa' ? (AREAS.find(a => a.nombre === 'Ensamble') || AREAS[0] || {}).id : ''); const turno = U.p.mturno === 'todos' ? '' : (U.p.mturno || (al.nivel === 'empresa' ? 'T2' : ''));
  const ps = S.personas.filter(p => al.personas.includes(p.id) && (!area || p.area === area) && (!turno || p.turno === turno));
  const cs = matrizCursos().filter(c => ps.some(p => asigDe(p.id, c)));
  let h = '<div class="atop"><h1>Matriz de capacitación</h1><button class="btn soft sm" data-act="exportar" data-r="matriz" data-f="xlsx">' + ic('down', 's') + 'Excel</button><button class="btn soft sm" data-act="exportar" data-r="matriz" data-f="pdf">' + ic('down', 's') + 'PDF</button></div>' + scopeLine();
  if (al.nivel === 'empresa') h += '<div class="filters"><label class="field"><span>Área</span><select class="input" id="m-area" data-chg="mArea">' + AREAS.map(a => '<option value="' + a.id + '"' + (area === a.id ? ' selected' : '') + '>' + a.nombre + '</option>').join('') + '</select></label><label class="field"><span>Turno</span><select class="input" id="m-turno" data-chg="mTurno"><option value="">Todos</option>' + TURNOS.map(t => '<option value="' + t + '"' + (turno === t ? ' selected' : '') + '>Turno ' + t.slice(1) + '</option>').join('') + '</select></label></div>';
  if (!ps.length || !cs.length) return h + '<div class="panel empty"><span class="shape">' + ic('grid', 'xl') + '</span><h3>Sin asignaciones en este alcance</h3><p class="muted" style="margin:0">Cuando haya cursos asignados, aparecerán aquí.</p></div>';
  const tot = cs.map(c => { const rs = ps.map(p => asigDe(p.id, c)).filter(Boolean).map(a => cumplimiento(a)).filter(x => x.k !== 'exenta'); return [rs.filter(x => x.k === 'al_dia' || x.k === 'por_vencer').length, rs.length]; });
  h += '<div class="panel"><div class="ph">' + ps.length + ' personas · ' + cs.length + ' cursos<span class="sp"></span><span class="muted" style="font:600 12.5px var(--f-body)">Exentas y «No requerido» no cuentan en el denominador</span></div><div class="tw"><table class="t"><thead><tr><th>Persona</th>' + cs.map(c => '<th>' + esc(CURSOS[c].nombre) + '</th>').join('') + '<th class="r">Cumple</th></tr></thead><tbody>' +
    ps.map(p => { let ok = 0, n = 0; const tds = cs.map(c => { const a = asigDe(p.id, c); if (!a) return '<td class="muted">No requerido</td>'; const cu = cumplimiento(a); if (cu.k !== 'exenta') { n++; if (cu.k === 'al_dia' || cu.k === 'por_vencer') ok++; } return '<td><div class="cell">' + chipCum(cu, true) + '<small>' + cumFecha(cu) + '</small></div></td>'; }).join(''); return '<tr class="click" data-act="persona" data-id="' + p.id + '"><td><b>' + esc(p.nombre) + '</b><div class="muted" style="font-size:12px"><span class="mono">' + p.num + '</span> · ' + esc(p.puesto) + '</div></td>' + tds + '<td class="r"><b>' + ok + ' de ' + n + '</b></td></tr>'; }).join('') +
    '</tbody><tfoot><tr><td>Cumplimiento por curso</td>' + tot.map(([a, b]) => '<td>' + pctTxt(a, b) + ' <span class="muted" style="font-weight:600">' + a + '/' + b + '</span></td>').join('') + '<td></td></tr></tfoot></table></div></div>';
  return h;
}
function aValidacion() {
  const c = cuenta(); const al = alcance();
  const pend = S.parts.filter(x => al.personas.includes(x.persona) && c.valida.includes(x.curso) && partEstado(x) === 'pendiente_validacion' && x.persona !== c.persona).sort((a, b) => String(a.pvDesde).localeCompare(String(b.pvDesde)));
  const sel = pend.find(x => x.id === U.p.vp) || pend[0];
  let h = '<div class="atop"><h1>Validación práctica</h1></div>' + scopeLine('<span class="chip violet">' + ic('shield', 's') + 'Validadora autorizada: ' + c.valida.map(x => CURSOS[x].nombre).join(', ') + '</span>');
  if (!pend.length) return h + '<div class="panel empty"><span class="shape">' + ic('check', 'xl') + '</span><h3>No hay prácticas pendientes</h3><p class="muted" style="margin:0">Aparecerán aquí cuando alguien de tu equipo apruebe la evaluación de un curso que exige práctica.</p></div>';
  const V = U.p.vf && U.p.vf.part === sel.id ? U.p.vf : (U.p.vf = { part: sel.id, crit: CURSOS[sel.curso].practica.criterios.map(() => null), res: null, fecha: hoy() });
  const curso = CURSOS[sel.curso]; const per = persona(sel.persona);
  h += '<div class="cols2" style="grid-template-columns:minmax(0,.7fr) minmax(0,1.6fr)"><div class="panel"><div class="ph">Pendientes · ' + pend.length + '</div><div class="pb stack">' + pend.map(x => '<button class="ccard" style="background:' + (x.id === sel.id ? 'var(--primary-soft)' : 'var(--bg)') + '" data-act="vSel" data-id="' + x.id + '"><span class="tile sm t-' + CURSOS[x.curso].color + '">' + ic(CURSOS[x.curso].icon, 's') + '</span><span class="grow"><span class="t" style="font-size:14.5px">' + esc(persona(x.persona).nombre) + '</span><span class="m" style="display:block;font-size:12.5px">' + esc(CURSOS[x.curso].nombre) + ' · v' + x.version + '<br>Esperando desde ' + fmt(x.pvDesde) + '</span></span></button>').join('') + '</div></div>';
  h += '<form class="panel" data-submit="registrarValidacion"><div class="ph">' + esc(per.nombre) + ' · ' + esc(curso.nombre) + '<span class="sp"></span><span class="chip neutral">Lista de verificación de la versión ' + sel.version + '</span></div><div class="pb">' +
    curso.practica.criterios.map((t, i) => '<div class="vrow"><span class="grow">' + (i + 1) + '. ' + esc(t) + '</span><span class="seg" role="group" aria-label="Criterio ' + (i + 1) + '"><button type="button" class="y" aria-pressed="' + (V.crit[i] === 'cumple') + '" data-act="vCrit" data-i="' + i + '" data-v="cumple">' + ic('check', 's') + ' Cumple</button><button type="button" class="n" aria-pressed="' + (V.crit[i] === 'no') + '" data-act="vCrit" data-i="' + i + '" data-v="no">No cumple</button><button type="button" class="na" aria-pressed="' + (V.crit[i] === 'na') + '" data-act="vCrit" data-i="' + i + '" data-v="na">No aplica</button></span></div>').join('') +
    '<div class="vrow"><span class="grow"><b>Resultado general</b></span><span class="seg"><button type="button" class="y" aria-pressed="' + (V.res === 'competente') + '" data-act="vRes" data-v="competente">Competente</button><button type="button" class="n" aria-pressed="' + (V.res === 'aun_no') + '" data-act="vRes" data-v="aun_no">Aún no competente</button></span></div>' +
    '<div class="filters" style="padding-top:12px;border-top:1px solid var(--line)"><label class="field"><span>Fecha de la práctica</span><input class="input" type="date" id="v-fecha" name="fecha" value="' + V.fecha + '" max="' + hoy() + '" min="' + D.add(hoy(), -7) + '"></label><label class="field" style="flex:1;min-width:220px"><span>Observaciones ' + (V.res === 'aun_no' ? '(obligatorias)' : '(opcional)') + '</span><input class="input" id="v-obs" name="obs" placeholder="Qué observaste"></label></div>' +
    '<div class="filters"><label class="field" style="min-width:260px"><span>Confirma con tu frase de acceso</span><input class="input" type="password" id="v-pass" name="pass" autocomplete="off" placeholder="Tu frase de acceso"></label><span class="grow"></span><button class="btn pri" type="submit">' + ic('lock', 's') + 'Registrar validación</button></div>' +
    '<p class="muted" style="margin:10px 0 0">' + esc(per.nombre.split(' ')[0]) + ' recibirá un aviso para confirmar la práctica.</p></div></form></div>';
  return h;
}
function aConstancias() {
  const al = alcance(); const q = (U.p.cq || '').toLowerCase();
  const ks = S.consts.filter(k => al.personas.includes(k.persona) && (!q || (k.folio + ' ' + persona(k.persona).nombre + ' ' + CURSOS[k.curso].nombre).toLowerCase().includes(q))).sort((a, b) => b.emitida.localeCompare(a.emitida) || b.folio.localeCompare(a.folio));
  let h = '<div class="atop"><h1>Constancias</h1><button class="btn soft sm" data-act="exportar" data-r="constancias" data-f="xlsx">' + ic('down', 's') + 'Excel</button></div>' + scopeLine() + '<div class="filters"><label class="field" style="flex:1;min-width:220px"><span>Buscar</span><input class="input" id="c-q" data-inp="cq" placeholder="Folio, persona o curso" value="' + esc(U.p.cq || '') + '"></label></div>';
  h += '<div class="panel"><div class="ph">' + ks.length + ' constancias<span class="sp"></span></div><div class="tw"><table class="t"><thead><tr><th>Folio</th><th>Persona</th><th>Curso</th><th>Emitida</th><th>Estado</th><th></th></tr></thead><tbody>' +
    ks.slice(0, 50).map(k => '<tr><td class="mono">' + k.folio + '</td><td>' + esc(persona(k.persona).nombre) + '</td><td>' + esc(CURSOS[k.curso].nombre) + ' v' + k.version + '</td><td>' + fmt(k.emitida) + '</td><td>' + chipConst(k) + '</td><td style="white-space:nowrap"><button class="btn ghost sm" data-act="verConst" data-k="' + k.id + '">Ver</button>' + (k.estado === 'vigente' && puede('reemitir') ? '<button class="btn ghost sm" data-act="accionConst" data-k="' + k.id + '" data-t="reemitir">Reemitir</button><button class="btn ghost sm" data-act="accionConst" data-k="' + k.id + '" data-t="revocar" style="color:var(--danger-ink)">Revocar</button>' : '') + '</td></tr>').join('') +
    (ks.length > 50 ? '<tr><td colspan="6" class="muted">y ' + (ks.length - 50) + ' más · usa la búsqueda</td></tr>' : '') + '</tbody></table></div></div>';
  return h;
}
const REPORTES = [
  ['individual', '1. Reporte individual', 'Una persona: asignaciones, intentos, validaciones y constancias'],
  ['matriz', '2. Matriz de capacitación', 'Personas × cursos con estado y vencimiento'],
  ['unidad', '3. Cumplimiento por unidad', 'Indicadores por área y turno'],
  ['intentos', '4. Evaluaciones e intentos', 'Un registro por intento'],
  ['validaciones', '5. Evidencias y validaciones', 'Un registro por validación práctica'],
  ['constancias', '6. Constancias emitidas', 'Folio, estado, reemisiones y revocaciones'],
  ['pendientes', '7. Pendiente y próxima a vencer', 'Pendiente, atrasada, vencida y por vencer']
];
function aReportes() {
  const al = alcance(); const r = U.p.rep || 'unidad'; const pid = U.p.rpid || al.personas[0];
  let h = '<div class="atop"><h1>Reportes y exportaciones</h1></div>' + scopeLine();
  const rep = construirReporte(r, pid);
  h += '<div class="cols2" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)"><div class="panel"><div class="ph">Reportes disponibles</div><div class="pb stack">' + REPORTES.map(([k, t, d]) => '<button class="ccard" style="background:' + (k === r ? 'var(--primary-soft)' : 'var(--bg)') + '" data-act="rep" data-r="' + k + '"><span class="grow"><span class="t" style="font-size:14.5px">' + t + '</span><span class="m" style="display:block;font-size:12.5px">' + d + '</span></span><span class="chip neutral">PDF</span><span class="chip neutral">Excel</span></button>').join('') + '</div></div>';
  h += '<div class="stack"><div class="panel"><div class="ph">' + esc(rep.titulo) + '</div><div class="pb stack">' +
    (r === 'individual' ? '<label class="field"><span>Persona</span><select class="input" id="r-pid" data-chg="rPid">' + S.personas.filter(p => al.personas.includes(p.id)).map(p => '<option value="' + p.id + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.nombre + ' · ' + p.num) + '</option>').join('') + '</select></label>' : '') +
    '<div class="notice info">' + ic('info') + '<span>Alcance: <b>' + esc(rep.alcance) + '</b> · ' + esc(rep.periodo) + ' · <b>' + rep.filas.length.toLocaleString('es-MX') + '</b> registros. El archivo incluye estos datos en su encabezado' + ' y, en Excel, una hoja «Parámetros» con las definiciones.</span></div>' +
    (rep.filas.length ? '' : '<div class="notice warn">' + ic('alert') + '<span>No hay registros con estos filtros. El archivo saldría vacío.</span></div>') +
    '<div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn soft" data-act="exportar" data-r="' + r + '" data-f="pdf" data-pid="' + pid + '">' + ic('down', 's') + 'PDF</button><button class="btn pri" data-act="exportar" data-r="' + r + '" data-f="xlsx" data-pid="' + pid + '">' + ic('down', 's') + 'Excel</button></div></div></div>';
  const mias = S.exports.slice(0, 6);
  h += '<div class="panel"><div class="ph">Mis exportaciones<span class="sp"></span><span class="muted" style="font:600 12.5px var(--f-body)">Cada exportación queda en la bitácora</span></div><div class="tw"><table class="t"><thead><tr><th>Reporte</th><th>Formato</th><th>Generado</th><th class="r">Registros</th></tr></thead><tbody>' + (mias.length ? mias.map(e => '<tr><td>' + esc(e.nombre) + '</td><td>' + e.formato.toUpperCase() + '</td><td>' + esc(fmtTs(e.fecha)) + '</td><td class="r">' + e.registros + '</td></tr>').join('') : '<tr><td colspan="4" class="muted">Aún no has exportado nada.</td></tr>') + '</tbody></table></div></div></div></div>';
  return h;
}
function bitTable(b) { return '<div class="panel"><div class="tw"><table class="t"><thead><tr><th>Fecha y hora</th><th>Quién</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr></thead><tbody>' + (b.length ? b.map(x => '<tr><td style="white-space:nowrap">' + esc(fmtTs(x.ts)) + '</td><td><b>' + esc(x.actor) + '</b><div class="muted" style="font-size:12px">' + esc(x.rol) + '</div></td><td>' + esc(x.accion) + '</td><td>' + esc(x.entidad) + '</td><td>' + esc(x.detalle) + '</td></tr>').join('') : '<tr><td colspan="5" class="muted">Sin movimientos.</td></tr>') + '</tbody></table></div></div>'; }
function aBitacora() {
  const q = (U.p.bq || '').toLowerCase(); const b = S.bit.filter(x => (U.p.btec || !x.tecnico) && (!q || (x.actor + x.accion + x.entidad + x.detalle).toLowerCase().includes(q)));
  return '<div class="atop"><h1>Bitácora</h1></div>' + scopeLine() + '<div class="filters"><label class="field" style="flex:1;min-width:220px"><span>Buscar</span><input class="input" id="b-q" data-inp="bq" placeholder="Persona, acción o registro" value="' + esc(U.p.bq || '') + '"></label><label class="ck" style="align-self:flex-end"><input type="checkbox" id="b-tec" data-chg="bTec"' + (U.p.btec ? ' checked' : '') + '> Incluir cambios registro por registro</label></div><p class="demo-note" style="margin:0">Solo se agregan entradas; nadie puede editarlas ni borrarlas desde la aplicación. ' + b.length + ' entradas.</p>' + bitTable(b.slice(0, 80));
}
function aCursos() {
  const al = alcance(); const cs = Object.values(CURSOS).filter(c => !al.cursos || al.cursos.includes(c.id));
  return '<div class="atop"><h1>Cursos</h1></div>' + scopeLine() + '<div class="notice info">' + ic('info') + '<span>Catálogo publicado con sus criterios. Para publicar una versión nueva de un curso, el contenido pasa por revisión y aprobación del área responsable.</span></div><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
    cs.map(c => '<div class="card stack"><div class="row"><span class="tile t-' + c.color + '">' + ic(c.icon) + '</span><div class="grow"><b style="font-size:16px">' + esc(c.nombre) + '</b><div class="muted" style="font-size:13px">Versión ' + c.version + ' · ' + c.clasif + '</div></div></div><div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip ok">Publicado</span><span class="chip coral">DEMO</span>' + (c.jugable ? '<span class="chip primary">Contenido navegable</span>' : '') + '</div><div style="font-size:13.5px"><div>Lecciones: <b>' + lessonIds(c).length + '</b></div><div>Evaluación: <b>mínimo ' + c.eval.min + ', ' + c.eval.intentos + ' intentos</b></div><div>Validación práctica: <b>' + (c.practica ? c.practica.criterios.length + ' criterios' : 'No') + '</b></div><div>Vigencia: <b>' + c.vigencia + ' meses</b></div><div>Fuentes: <b>DEMO · sin fuente real</b></div></div><p class="demo-note" style="margin:0">Criterios ficticios de ejemplo.</p></div>').join('') + '</div>';
}

/* ---------- Reportes: datos estructurados para PDF y Excel ---------- */
function construirReporte(r, pid) {
  const al = alcance(); const f = hoy(); const desde = D.add(f, -365);
  const base = { alcance: S.org.empresa + (al.nivel === 'empresa' ? '' : ' · ' + al.etiqueta), periodo: 'Corte: ' + fmt(f), filtros: 'Ninguno adicional' };
  const P = id => persona(id);
  if (r === 'individual') {
    const p = P(pid); if (!p) return Object.assign(base, { titulo: 'Reporte individual', cols: [['Persona', 'texto']], filas: [] });
    const rs = filas({ personas: [pid], cursos: al.cursos });
    return Object.assign(base, { titulo: 'Reporte individual · ' + p.nombre, filtros: 'Persona: ' + p.nombre + ' (' + p.num + ')', cols: [['Número de empleado', 'texto'], ['Persona', 'texto'], ['Curso', 'texto'], ['Versión', 'numero'], ['Estado de cumplimiento', 'texto'], ['Fecha límite', 'fecha'], ['Fecha de acreditación', 'fecha'], ['Vence', 'fecha'], ['Calificación', 'numero'], ['Folio de constancia', 'texto']],
      filas: rs.map(x => { const ac = x.c.acred || S.acreds.filter(a => a.persona === pid && a.curso === x.a.curso).slice(-1)[0]; const k = ac && S.consts.find(k => k.acred === ac.id && k.estado === 'vigente'); return [p.num, p.nombre, CURSOS[x.a.curso].nombre, ac ? ac.version : CURSOS[x.a.curso].version, etiquetaCum(x.c), x.a.limite, ac ? ac.fecha : null, ac ? ac.vence : null, ac ? ac.calif : null, k ? k.folio : '']; }) });
  }
  if (r === 'matriz') {
    const rs = filas(al);
    return Object.assign(base, { titulo: 'Matriz de capacitación', cols: [['Número de empleado', 'texto'], ['Persona', 'texto'], ['Tipo', 'texto'], ['Área', 'texto'], ['Turno', 'texto'], ['Puesto', 'texto'], ['Curso', 'texto'], ['Estado de cumplimiento', 'texto'], ['Fecha relevante', 'fecha']],
      filas: rs.map(x => [x.p.num, x.p.nombre, x.p.tipo === 'contratista' ? 'Contratista' : 'Empleado', AREA[x.p.area], x.p.turno, x.p.puesto, CURSOS[x.a.curso].nombre, etiquetaCum(x.c), x.c.fecha || null]) });
  }
  if (r === 'unidad') {
    const rs = filas(al); const g = {}; rs.forEach(x => { const k = x.p.area + '|' + x.p.turno; (g[k] = g[k] || []).push(x); });
    return Object.assign(base, { titulo: 'Cumplimiento por unidad organizacional', filtros: 'Agrupado por área y turno', cols: [['Área', 'texto'], ['Turno', 'texto'], ['Personas', 'numero'], ['Asignaciones vigentes', 'numero'], ['Al día', 'numero'], ['Por vencer', 'numero'], ['Vencidas', 'numero'], ['Atrasadas', 'numero'], ['Pendientes', 'numero'], ['Exentas', 'numero'], ['Cumplimiento', 'pct']],
      filas: Object.entries(g).sort().map(([k, xs]) => { const I = indicadores(xs); const [a, t] = k.split('|'); return [AREA[a], t, I.personas, I.den, I.n.al_dia, I.n.por_vencer, I.n.vencida, I.n.atrasada, I.n.pendiente, I.n.exenta, I.den ? I.cumplen / I.den : 0]; }) });
  }
  if (r === 'intentos') {
    const fil = []; S.parts.filter(x => al.personas.includes(x.persona) && (!al.cursos || al.cursos.includes(x.curso))).forEach(x => x.intentos.filter(i => i.fecha && i.fecha >= desde).forEach(i => { const p = P(x.persona); fil.push([p.num, p.nombre, CURSOS[x.curso].nombre, x.version, i.n, i.inicio, i.fecha, Math.round(i.calif * 10) / 10, i.aprobado ? 'Aprobado' : 'No aprobado']); }));
    return Object.assign(base, { titulo: 'Historial de evaluaciones e intentos', periodo: 'Periodo: ' + fmt(desde) + ' a ' + fmt(f), cols: [['Número de empleado', 'texto'], ['Persona', 'texto'], ['Curso', 'texto'], ['Versión', 'numero'], ['Intento', 'numero'], ['Inicio', 'fecha'], ['Envío', 'fecha'], ['Calificación', 'numero'], ['Resultado', 'texto']], filas: fil.sort((a, b) => String(b[6]).localeCompare(String(a[6]))) });
  }
  if (r === 'validaciones') {
    const fil = []; S.parts.filter(x => al.personas.includes(x.persona) && (!al.cursos || al.cursos.includes(x.curso))).forEach(x => x.vals.filter(v => v.fecha >= desde).forEach(v => { const p = P(x.persona); fil.push([p.num, p.nombre, CURSOS[x.curso].nombre, x.version, v.validador, v.fecha, v.registro, v.res === 'competente' ? 'Competente' : 'Aún no competente', v.crit.filter(c => c === 'cumple').length, v.crit.length, v.foto ? 'Sí' : 'No', v.conf ? 'Confirmada' : v.disp ? 'No reconocida' : 'Pendiente']); }));
    return Object.assign(base, { titulo: 'Evidencias y validaciones prácticas', periodo: 'Periodo: ' + fmt(desde) + ' a ' + fmt(f), cols: [['Número de empleado', 'texto'], ['Persona', 'texto'], ['Curso', 'texto'], ['Versión', 'numero'], ['Validador', 'texto'], ['Fecha de la práctica', 'fecha'], ['Fecha de registro', 'fecha'], ['Resultado', 'texto'], ['Criterios cumplidos', 'numero'], ['Criterios evaluados', 'numero'], ['Evidencia adjunta', 'texto'], ['Confirmación del trabajador', 'texto']], filas: fil.sort((a, b) => String(b[5]).localeCompare(String(a[5]))) });
  }
  if (r === 'constancias') {
    const ks = S.consts.filter(k => al.personas.includes(k.persona) && (!al.cursos || al.cursos.includes(k.curso)) && k.emitida >= desde);
    return Object.assign(base, { titulo: 'Constancias emitidas', periodo: 'Periodo: ' + fmt(desde) + ' a ' + fmt(f), cols: [['Folio', 'texto'], ['Número de empleado', 'texto'], ['Persona', 'texto'], ['Curso', 'texto'], ['Versión', 'numero'], ['Fecha de acreditación', 'fecha'], ['Fecha de emisión', 'fecha'], ['Estado', 'texto'], ['Folio anterior', 'texto'], ['Motivo', 'texto']],
      filas: ks.sort((a, b) => b.folio.localeCompare(a.folio)).map(k => { const ac = S.acreds.find(a => a.id === k.acred); const ant = k.anterior && S.consts.find(x => x.id === k.anterior); return [k.folio, P(k.persona).num, P(k.persona).nombre, CURSOS[k.curso].nombre, k.version, ac ? ac.fecha : null, k.emitida, { vigente: 'Vigente', generando: 'Generando', sustituida: 'Sustituida', revocada: 'Revocada' }[k.estado], ant ? ant.folio : '', k.motivo || '']; }) });
  }
  const rs = filas(al).filter(x => ['pendiente', 'atrasada', 'vencida', 'por_vencer'].includes(x.c.k));
  return Object.assign(base, { titulo: 'Capacitación pendiente y próxima a vencer', cols: [['Número de empleado', 'texto'], ['Persona', 'texto'], ['Área', 'texto'], ['Turno', 'texto'], ['Curso', 'texto'], ['Estado de cumplimiento', 'texto'], ['Fecha relevante', 'fecha'], ['Días para la fecha', 'numero']],
    filas: rs.sort((a, b) => String(a.c.fecha).localeCompare(String(b.c.fecha))).map(x => [x.p.num, x.p.nombre, AREA[x.p.area], x.p.turno, CURSOS[x.a.curso].nombre, etiquetaCum(x.c), x.c.fecha || null, x.c.fecha ? D.diff(x.c.fecha, f) : null]) });
}
function etiquetaCum(c) { return CUM[c.k][0] + (c.k === 'pendiente' && c.sub && c.sub !== 'pendiente' ? ' · ' + EST[c.sub] : ''); }
const serial = s => (D.t(s) - Date.UTC(1899, 11, 30)) / 864e5;
function generadoTxt() { return fmt(hoy()) + ' ' + hora() + ' · ' + yo().nombre + ' (' + cuenta().roles.map(r => ROL[r]).join(', ') + ')'; }
function xlsxReporte(rep) {
  if (!window.XLSX) throw new Error('La librería de Excel no cargó');
  const wb = XLSX.utils.book_new(); const ws = {};
  rep.cols.forEach(([h], c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
  rep.filas.forEach((row, i) => row.forEach((v, c) => {
    const tipo = rep.cols[c][1]; const ref = XLSX.utils.encode_cell({ r: i + 1, c });
    if (v === null || v === undefined || v === '') return;
    if (tipo === 'fecha') ws[ref] = { t: 'n', v: serial(v), z: 'dd/mm/yyyy' };
    else if (tipo === 'numero') ws[ref] = { t: 'n', v: Number(v) };
    else if (tipo === 'pct') ws[ref] = { t: 'n', v: Number(v), z: '0.0%' };
    else ws[ref] = { t: 's', v: String(v) };
  }));
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rep.filas.length, 1), c: rep.cols.length - 1 } });
  ws['!cols'] = rep.cols.map(([h, t]) => ({ wch: Math.max(12, Math.min(34, h.length + 4)) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rep.filas.length, 1), c: rep.cols.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  const par = [['Reporte', rep.titulo], ['Generado', generadoTxt()], ['Alcance', rep.alcance], ['Periodo', rep.periodo], ['Filtros', rep.filtros], ['Registros', rep.filas.length], ['Aviso', 'DEMO · DATOS FICTICIOS. Ambiente de demostración.'], [], ['Columna', 'Tipo de dato']].concat(rep.cols.map(([h, t]) => [h, { texto: 'Texto (identificadores como texto para conservar ceros a la izquierda)', numero: 'Número', fecha: 'Fecha (dd/mm/aaaa)', pct: 'Porcentaje' }[t]]));
  if (rep.titulo.startsWith('Cumplimiento')) par.push([], ['Cumplimiento', '(Al día + Por vencer) ÷ asignaciones obligatorias vigentes, sin exentas ni opcionales (I-05)']);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(par), 'Parámetros');
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function pdfBase(orient) { if (!window.jspdf) throw new Error('La librería de PDF no cargó'); return new window.jspdf.jsPDF({ orientation: orient, unit: 'pt', format: 'a4' }); }
function pdfReporte(rep) {
  const ancho = rep.cols.length > 7; const doc = pdfBase(ancho ? 'landscape' : 'portrait'); const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight();
  const head = () => { doc.setFillColor(31, 44, 122); doc.rect(0, 0, W, 6, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(49, 49, 49); doc.text(rep.titulo, 36, 34); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(97, 97, 97); doc.text('Generado: ' + generadoTxt(), 36, 50); doc.text('Alcance: ' + rep.alcance + '   ·   ' + rep.periodo + '   ·   Filtros: ' + rep.filtros, 36, 62); if (LOGO_PNG) doc.addImage(LOGO_PNG, 'PNG', W - 36 - 78, 14, 78, 29); doc.setTextColor(184, 58, 28); doc.text('DEMO · DATOS FICTICIOS', W - 36, 58, { align: 'right' }); };
  const body = rep.filas.map(row => row.map((v, c) => { const t = rep.cols[c][1]; if (v === null || v === undefined || v === '') return ''; if (t === 'fecha') return fmt(v); if (t === 'pct') return (v * 100).toFixed(1) + ' %'; return String(v); }));
  doc.autoTable({ head: [rep.cols.map(c => c[0])], body: body.length ? body : [rep.cols.map((_, i) => i ? '' : 'Sin registros con estos filtros')], startY: 76, margin: { top: 76, left: 36, right: 36, bottom: 40 }, styles: { fontSize: 7.5, cellPadding: 3.5, textColor: [49, 49, 49], lineColor: [218, 218, 223], lineWidth: .5 }, headStyles: { fillColor: [230, 232, 243], textColor: [31, 44, 122], fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247, 247, 248] }, didDrawPage: head });
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(97, 97, 97); doc.text('Nexo · ' + S.org.grupo + ' · Datos de demostración (ficticios) · Confidencial', 36, H - 20); doc.text('Página ' + i + ' de ' + n, W - 36, H - 20, { align: 'right' }); }
  return doc.output('blob');
}
function pdfConstancia(k) {
  const doc = pdfBase('portrait'); const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight();
  const p = persona(k.persona); const ac = S.acreds.find(a => a.id === k.acred); const c = CURSOS[k.curso];
  const part = S.parts.find(x => x.id === ac.part); const val = part && part.vals.find(v => v.res === 'competente' && !v.anulada);
  doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.1 })); doc.setFont('helvetica', 'bold'); doc.setFontSize(54); doc.setTextColor(255, 106, 77); doc.text('DEMO · CONTENIDO FICTICIO', W / 2, H / 2 + 40, { align: 'center', angle: 32 }); doc.restoreGraphicsState();
  if (LOGO_PNG) doc.addImage(LOGO_PNG, 'PNG', 48, 42, 102, 38);
  doc.setTextColor(49, 49, 49); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(S.org.empresa, 162, 60); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(97, 97, 97); doc.text(S.org.grupo + ' · ' + ((S.org.plantas[0] || {}).nombre || ''), 162, 74);
  doc.setFontSize(8); doc.text('FOLIO', W - 48, 56, { align: 'right' }); doc.setFont('courier', 'bold'); doc.setFontSize(13); doc.setTextColor(49, 49, 49); doc.text(k.folio, W - 48, 72, { align: 'right' });
  doc.setDrawColor(31, 44, 122); doc.setLineWidth(2.5); doc.line(48, 96, W - 48, 96);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.text('Constancia de capacitación', W / 2, 168, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(97, 97, 97); doc.text('Documento interno generado con los datos registrados en la plataforma', W / 2, 188, { align: 'center' });
  doc.setFontSize(12); doc.text('Se hace constar que', W / 2, 240, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(49, 49, 49); doc.text(p.nombre, W / 2, 272, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(97, 97, 97); doc.text('número de empleado ' + p.num + ', acreditó el curso', W / 2, 296, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(49, 49, 49); doc.text(c.nombre + ' · versión ' + k.version, W / 2, 326, { align: 'center' });
  const ads = p.adscripciones.filter(a => a.desde <= ac.fecha && (!a.hasta || a.hasta >= ac.fecha)).pop() || p.adscripciones.slice(-1)[0];
  const campos = [['Fecha de acreditación', fmtL(ac.fecha)], ['Fecha de emisión', fmtL(k.emitida)], ['Calificación de la evaluación', ac.calif != null ? Math.round(ac.calif) + ' / 100' : 'No aplica'], ['Validación práctica', val ? 'Competente · ' + fmt(val.fecha) : 'No aplica'], ['Vigencia', ac.vence ? 'Hasta el ' + fmtL(ac.vence) : 'Sin vencimiento'], ['Adscripción al acreditar', AREA[ads.area] + ' · Turno ' + ads.turno.slice(1) + ' · ' + ads.puesto]];
  campos.forEach(([l, v], i) => { const x = i % 2 ? W / 2 + 10 : 72; const y = 380 + Math.floor(i / 2) * 48; doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(97, 97, 97); doc.text(l.toUpperCase(), x, y); doc.setFontSize(11); doc.setTextColor(49, 49, 49); doc.text(v, x, y + 15); });
  doc.setLineDashPattern([4, 3], 0); doc.setDrawColor(118, 118, 118); doc.setLineWidth(1);
  doc.roundedRect(72, 600, 300, 80, 8, 8); doc.roundedRect(W - 72 - 120, 580, 120, 120, 8, 8); doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(97, 97, 97); doc.text('Firma del responsable', 222, 634, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.text('Opción por confirmar (D-23)', 222, 650, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.text('Código QR de verificación', W - 132, 632, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.text('Opción por confirmar', W - 132, 648, { align: 'center' }); doc.text('(D-22)', W - 132, 660, { align: 'center' });
  doc.setDrawColor(218, 218, 223); doc.line(48, H - 92, W - 48, H - 92);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(97, 97, 97);
  doc.text(doc.splitTextToSize('Documento interno de la empresa. No constituye un documento oficial ante autoridades ni sustituye formatos regulados. [Texto de ejemplo por validar con el área jurídica (D-24)]', W - 220), 48, H - 76);
  doc.text('Plantilla v1 · Página 1 de 1', W - 48, H - 76, { align: 'right' });
  if (k.huella) doc.text('Huella del registro de emisión (SHA-256): ' + k.huella.slice(0, 32) + '…', 48, H - 44);
  if (k.estado !== 'vigente') { doc.setTextColor(191, 42, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('CONSTANCIA ' + k.estado.toUpperCase(), W / 2, 120, { align: 'center' }); }
  return doc.output('blob');
}

/* ---------- Superposiciones ---------- */
function renderOverlay() {
  let h = '';
  if (U.modal) h += '<div class="scrim" data-act="scrim"><div class="dialog ' + (U.modal.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' + modalBody() + '</div></div>';
  if (U.tour) h += '<div class="scrim"><div class="dialog tour" role="dialog" aria-modal="true" aria-label="Bienvenida">' + tourBody() + '</div></div>';
  if (U.buscar) h += '<div class="scrim" data-act="scrim" style="align-items:flex-start;padding-top:12vh"><div class="dialog buscar" role="dialog" aria-modal="true" aria-label="Buscar">' + buscarBody() + '</div></div>';
  if (U.inact) h += '<div class="scrim" style="align-items:flex-end;padding:0"><div class="dialog" style="border-radius:24px 24px 0 0;width:min(520px,100%)" role="alertdialog" aria-live="assertive"><div class="row"><span class="tile t-sun">' + ic('clock') + '</span><h2 style="font-size:24px">¿Sigues ahí?</h2></div><p style="margin:0">Para proteger tus datos, cerraremos tu sesión en este equipo compartido en:</p><div class="big-num num" style="text-align:center;color:var(--ink)">0:' + String(U.inact.t).padStart(2, '0') + '</div><p class="muted" style="text-align:center;margin:0">Tu avance ya está guardado.</p><button class="btn pri block" data-act="seguir">Seguir aquí</button><button class="btn ghost block" data-act="salir">Salir ahora</button></div></div>';
  if (U.toast) h += '<div class="toast ' + (U.toast.tipo || '') + '" role="status">' + (U.toast.tipo === 'ok' ? ic('check', 's') : U.toast.tipo === 'error' ? ic('alert', 's') : '') + '<span>' + esc(U.toast.t) + '</span></div>';
  return h;
}

/* ---------- Bienvenida guiada (una vez por persona y espacio) ---------- */
function pasosTour(espacio) {
  if (espacio === 'admin') return [
    ['chart', 't-primary', 'Tu tablero', 'El cumplimiento de tu alcance en un vistazo. Toca cualquier indicador para ver quiénes están detrás.'],
    ['users', 't-violet', 'Personas y matriz', 'Busca a alguien por nombre o número (también con Ctrl + K) y revisa su avance curso por curso.'],
    ['list', 't-coral', 'Asigna y valida', 'Crea reglas de asignación con vista previa, registra prácticas y exporta reportes en PDF o Excel. Todo queda en la bitácora.']
  ];
  return [
    ['book', 't-primary', 'Tus cursos te esperan', 'En Inicio ves lo pendiente, ordenado por urgencia, y un botón para continuar donde te quedaste.'],
    ['star', 't-sun', 'Lecciones cortas', 'Unos minutos por lección, con actividades y explicación inmediata. Si fallas, repasas sin castigo y ganas puntos.'],
    ['award', 't-mint', 'Acredita y descarga', 'Aprueba la evaluación y, si el curso lo pide, tu práctica. Tu constancia aparece en Historial.']
  ];
}
function tourBody() {
  const T = U.tour; const ps = pasosTour(T.espacio); const [icon, color, titulo, texto] = ps[T.i];
  return '<div class="tour-ill"><span class="tile ' + color + '">' + ic(icon, 'xl') + '</span></div><span class="eyebrow">Paso ' + (T.i + 1) + ' de ' + ps.length + '</span><h2 style="font-size:26px">' + titulo + '</h2><p class="muted" style="margin:0;font-size:16px">' + texto + '</p>' +
    '<div class="dots">' + ps.map((_, i) => '<i class="' + (i === T.i ? 'on' : '') + '"></i>').join('') + '</div>' +
    '<div class="row" style="justify-content:space-between"><button class="btn ghost" data-act="tourFin">Saltar</button><button class="btn pri" data-act="tourSig">' + (T.i < ps.length - 1 ? 'Siguiente' : '¡Empezar!') + '</button></div>';
}
function quizaTour() {
  const k = 'nexo-tour-' + S.yo.persona + '-' + U.space;
  if (!leerLocal(k)) U.tour = { i: 0, espacio: U.space, k };
}

/* ---------- Buscador rápido (consola) ---------- */
function buscarBody() {
  const q = (U.buscar.q || '').trim().toLowerCase(); const al = alcance();
  const ps = q ? S.personas.filter(p => al.personas.includes(p.id) && (p.nombre + ' ' + p.num).toLowerCase().includes(q)).slice(0, 7) : [];
  const vistas = q ? menu().filter(([, , t]) => t.toLowerCase().includes(q)).slice(0, 4) : menu().slice(0, 5);
  return '<label class="field"><span class="sr">Buscar</span><input class="input big" id="bq-in" data-inp="buscarQ" placeholder="Busca una persona, número o pantalla" value="' + esc(U.buscar.q || '') + '" autocomplete="off"></label>' +
    (ps.length ? '<div class="eyebrow">Personas</div>' + ps.map(p => '<button class="res" data-act="irPersona" data-id="' + p.id + '"><span class="avatar">' + esc(p.nombre.split(' ').map(x => x[0]).slice(0, 2).join('')) + '</span><span class="grow"><b>' + esc(p.nombre) + '</b><small class="muted"><span class="mono">' + esc(p.num) + '</span> · ' + esc(AREA[p.area] || '') + ' · ' + esc(p.turno || '') + '</small></span>' + ic('chev', 'muted') + '</button>').join('') : (q ? '<p class="muted">Ninguna persona coincide.</p>' : '')) +
    (vistas.length ? '<div class="eyebrow">Ir a</div>' + vistas.map(([v, i, t]) => '<button class="res" data-act="irVista" data-v="' + v + '">' + ic(i, 's') + '<span class="grow">' + t + '</span>' + ic('chev', 'muted') + '</button>').join('') : '') +
    '<p class="demo-note" style="margin:0">Atajo: Ctrl + K · Esc para cerrar</p>';
}

/* ---------- Detalle de un indicador del tablero ---------- */
function detalleKpi(k) {
  const al = alcance(); const area = U.p.area || '';
  const rows = filas(al, a => !area || persona(a.persona).area === area);
  const filtro = { atrasada: r => r.c.k === 'atrasada', vencida: r => r.c.k === 'vencida', por_vencer: r => r.c.k === 'por_vencer', pv: r => (r.c.k === 'pendiente' || r.c.k === 'atrasada') && r.c.sub === 'pendiente_validacion', pendiente: r => r.c.k === 'pendiente' }[k] || (() => true);
  const titulo = { atrasada: 'Asignaciones atrasadas', vencida: 'Acreditaciones vencidas', por_vencer: 'Por vencer en 30 días', pv: 'Pendientes de validación práctica', pendiente: 'Pendientes en plazo' }[k];
  const xs = rows.filter(filtro).sort((a, b) => String(a.c.fecha).localeCompare(String(b.c.fecha)));
  return '<div class="row"><h2 class="grow" style="font-size:22px">' + titulo + ' · ' + xs.length + '</h2><button class="iconbtn" data-act="cerrarModal" aria-label="Cerrar" style="background:var(--surface-2)">' + ic('x') + '</button></div>' +
    '<div class="tw" style="max-height:60vh;overflow:auto"><table class="t"><thead><tr><th>Persona</th><th>Curso</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>' +
    (xs.length ? xs.map(r => '<tr class="click" data-act="irPersona" data-id="' + r.p.id + '"><td><b>' + esc(r.p.nombre) + '</b><div class="muted mono" style="font-size:12px">' + esc(r.p.num) + '</div></td><td>' + esc(CURSOS[r.a.curso].nombre) + '</td><td>' + chipCum(r.c, true) + '</td><td>' + cumFecha(r.c) + '</td></tr>').join('') : '<tr><td colspan="4" class="muted">Nada por aquí.</td></tr>') + '</tbody></table></div>';
}
function modalBody() {
  const M = U.modal;
  if (M.t === 'preExamen' || M.t === 'html') return M.html;
  if (M.t === 'const') {
    const k = S.consts.find(x => x.id === M.k); const p = persona(k.persona); const ac = S.acreds.find(a => a.id === k.acred); const c = CURSOS[k.curso];
    const part = S.parts.find(x => x.id === ac.part); const val = part && part.vals.find(v => v.res === 'competente' && !v.anulada);
    return '<div class="row"><h2 class="grow" style="font-size:22px">Constancia ' + chipConst(k) + '</h2><button class="iconbtn" data-act="cerrarModal" aria-label="Cerrar" style="background:var(--surface-2)">' + ic('x') + '</button></div>' +
      '<div class="cert"><div class="wm">DEMO · CONTENIDO FICTICIO</div><div class="top"><div class="row"><svg viewBox="0 0 300 112" style="width:112px;height:42px;color:#312783" role="img" aria-label="Grupo PIGSA88"><use href="#pigsa"/></svg><div><b>' + esc(S.org.empresa) + '</b><div style="font-size:12px;color:#616161">' + esc(S.org.grupo + ' · ' + ((S.org.plantas[0] || {}).nombre || '')) + '</div></div></div><div style="text-align:right"><div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#616161">FOLIO</div><div class="mono" style="font-weight:600">' + k.folio + '</div></div></div>' +
      '<h3>Constancia de capacitación</h3><p style="text-align:center;color:#616161;margin:4px 0 14px;font-size:13px">Documento interno generado con los datos registrados en la plataforma</p><p style="text-align:center;margin:0;color:#616161">Se hace constar que</p><div class="who">' + esc(p.nombre) + '</div><p style="text-align:center;margin:0;color:#616161">número de empleado <span class="mono" style="color:#313131">' + p.num + '</span>, acreditó el curso</p><p style="text-align:center;font-weight:800;font-size:18px;margin:8px 0 0">' + esc(c.nombre) + ' · versión ' + k.version + '</p>' +
      '<div class="fields"><div><span>Fecha de acreditación</span><b>' + fmtL(ac.fecha) + '</b></div><div><span>Fecha de emisión</span><b>' + fmtL(k.emitida) + '</b></div><div><span>Calificación</span><b>' + (ac.calif != null ? Math.round(ac.calif) + ' / 100' : 'No aplica') + '</b></div><div><span>Validación práctica</span><b>' + (val ? 'Competente · ' + fmt(val.fecha) : 'No aplica') + '</b></div><div><span>Vigencia</span><b>' + (ac.vence ? 'Hasta el ' + fmtL(ac.vence) : 'Sin vencimiento') + '</b></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 130px;gap:14px"><div class="ph">Firma del responsable<br><b>Opción por confirmar (D-23)</b></div><div class="ph" style="min-height:120px">QR de verificación<br><b>Por confirmar (D-22)</b></div></div><div class="legal">Documento interno de la empresa. No constituye un documento oficial ante autoridades. [Texto de ejemplo por validar con el área jurídica (D-24)]</div></div>' +
      '<div class="muted" style="font-size:13px">Registro de emisión: plantilla ' + k.plantilla + ' · emitida ' + fmt(k.emitida) + (k.anterior ? ' · sustituye a ' + ((S.consts.find(x => x.id === k.anterior) || {}).folio || 'una constancia anterior') : '') + (k.motivo ? ' · motivo: ' + esc(k.motivo) : '') + (k.huella ? '<br>Huella SHA-256: <span class="mono">' + k.huella.slice(0, 24) + '…</span>' : '') + '</div>' +
      '<div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost" data-act="cerrarModal">Cerrar</button><button class="btn pri" data-act="pdfConst" data-k="' + k.id + '">' + ic('down', 's') + 'Descargar PDF</button></div>';
  }
  if (M.t === 'accionConst') {
    const k = S.consts.find(x => x.id === M.k);
    return '<form class="stack" data-submit="accionConst"><h2 style="font-size:22px">' + (M.tipo === 'revocar' ? 'Revocar constancia' : 'Reemitir constancia') + ' <span class="mono" style="font-size:16px">' + k.folio + '</span></h2>' +
      (M.tipo === 'revocar' ? '<div class="notice danger">' + ic('alert') + '<span>La acreditación y la constancia quedarán revocadas. Se creará una nueva participación con fecha límite a 30 días. Nada se borra.</span></div>' : '<div class="notice info">' + ic('info') + '<span>Se emitirá una nueva constancia con nuevo folio. La actual quedará «Sustituida» y enlazada a la nueva.</span></div>') +
      '<label class="field"><span>Motivo (obligatorio)</span><input class="input" name="motivo" id="m-motivo" required placeholder="' + (M.tipo === 'revocar' ? 'Ej.: acreditación registrada por error' : 'Ej.: corrección del nombre') + '"></label><label class="field"><span>Confirma con tu frase de acceso</span><input class="input" type="password" name="pass" id="m-pass" autocomplete="off" placeholder="Tu frase de acceso"></label>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="cerrarModal">Cancelar</button><button class="btn ' + (M.tipo === 'revocar' ? 'danger' : 'pri') + '" type="submit">' + (M.tipo === 'revocar' ? 'Revocar' : 'Reemitir') + '</button></div></form>';
  }
  if (M.t === 'excepcion') {
    const a = S.asigs.find(x => x.id === M.a); const cu = cumplimiento(a);
    return '<form class="stack" data-submit="excepcion"><h2 style="font-size:22px">Excepción · ' + esc(CURSOS[a.curso].nombre) + '</h2><p class="muted" style="margin:0">' + esc(persona(a.persona).nombre) + ' · ' + chipCum(cu) + '</p>' +
      '<label class="field"><span>Tipo</span><select class="input" name="tipo" id="e-tipo">' + (cu.sub === 'no_aprobada' ? '<option value="intentos">Autorizar 2 intentos adicionales</option>' : '') + '<option value="prorroga">Prórroga de 15 días</option><option value="exencion">Exentar por 90 días</option></select></label><label class="field"><span>Motivo (obligatorio)</span><input class="input" name="motivo" id="e-motivo" required></label>' +
      '<p class="demo-note" style="margin:0">Las exenciones salen del denominador de cumplimiento y se reportan aparte. Toda excepción queda en la bitácora.</p><div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="cerrarModal">Cancelar</button><button class="btn pri" type="submit">Aprobar excepción</button></div></form>';
  }
  return '';
}

/* ---------- Utilidades de interfaz ---------- */
let toastT = null;
function toast(t, tipo) { U.toast = { t, tipo }; render(); clearTimeout(toastT); toastT = setTimeout(() => { U.toast = null; render(); }, tipo === 'error' ? 5200 : 3400); }
function live(t) { const el = $('#live'); if (el) el.textContent = t; }
function go(view, p) { U.anim = true; U.view = view; U.p = p || {}; U.player = null; U.exam = null; U.modal = null; U.buscar = null; render(); window.scrollTo(0, 0); }

/* ---------- Sesión: inactividad en equipos compartidos y actualización periódica ---------- */
let inactT = null, refrescoT = null, ultimaActividad = Date.now();
function vigilarSesion() {
  clearInterval(inactT); clearInterval(refrescoT); ultimaActividad = Date.now();
  const limite = (U.inactMin || 5) * 60 * 1000;
  if (S.yo.equipoCompartido) {
    inactT = setInterval(() => {
      if (!U.user) { clearInterval(inactT); return; }
      if (U.inact) { U.inact.t--; if (U.inact.t <= 0) { U.inact = null; A.salir(true); } else render(); return; }
      if (Date.now() - ultimaActividad > limite - 30 * 1000) { U.inact = { t: 30 }; render(); }
    }, 1000);
  }
  // Datos frescos: cada minuto si no está en una lección, evaluación o formulario abierto
  refrescoT = setInterval(() => { if (U.user && !U.player && !U.exam && !U.modal && !U.busy && document.visibilityState === 'visible') cargarEstado(true).then(render).catch(() => { }); }, 60 * 1000);
}
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { ultimaActividad = Date.now(); }, { passive: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && U.user && !U.player && !U.exam && !U.modal) cargarEstado(true).then(render).catch(() => { }); });

async function entrarCon(r, empresa, numero, personal) {
  U.inactMin = r.inactividadMinutos || 5;
  escribirLocal('nexo-recordar', personal ? { empresa, num: numero, personal: true } : { empresa });
  await cargarEstado(true);
  U.login = Object.assign(U.login, { err: '', msg: '', num: '' });
  espacioInicial(); quizaTour(); vigilarSesion(); U.anim = true; render(); window.scrollTo(0, 0);
}

/* ---------- Acciones de la interfaz ---------- */
const A = {
  skipSplash: () => quitarSplash(),
  // Acceso
  modoActivar: () => { U.login.modo = 'activar'; U.login.err = ''; U.login.msg = ''; render(); },
  modoEntrar: () => { U.login.modo = 'entrar'; U.login.err = ''; render(); },
  verFrase: () => { const i = $('#l-pass'); if (i) { i.type = i.type === 'password' ? 'text' : 'password'; i.focus(); } },
  medir: (d, el) => { const m = $('#medidor'); if (m) m.innerHTML = medidorFrase(el.value); },
  entrar: async data => {
    const numero = String(data.numero || '').trim(); U.login.num = numero; U.login.empresa = data.empresa;
    if (!numero || !data.frase) { U.login.err = 'Escribe tu número de empleado y tu frase de acceso.'; render(); return; }
    U.login.err = ''; ocupado(true);
    try { const r = await api('/api/acceso/entrar', { empresaId: data.empresa, numero, frase: data.frase, equipoPersonal: !!data.personal }); await entrarCon(r, data.empresa, numero, !!data.personal); }
    catch (e) { U.login.err = e.message; render(); }
    finally { ocupado(false); }
  },
  activar: async data => {
    const numero = String(data.numero || '').trim(); U.login.num = numero; U.login.empresa = data.empresa;
    const codigo = String(data.codigo || '').trim().toUpperCase();
    if (!numero || !codigo || !data.frase) { U.login.err = 'Completa tu número, el código de tu ficha y tu frase.'; render(); return; }
    if (data.frase !== data.frase2) { U.login.err = 'Las dos frases no coinciden.'; render(); return; }
    ocupado(true);
    try {
      await api('/api/acceso/activar', { empresaId: data.empresa, numero, codigo, frase: data.frase });
      const r = await api('/api/acceso/entrar', { empresaId: data.empresa, numero, frase: data.frase, equipoPersonal: false });
      await entrarCon(r, data.empresa, numero, false); toast('¡Listo! Tu cuenta está activa.', 'ok');
    } catch (e) { U.login.err = e.message; render(); }
    finally { ocupado(false); }
  },
  salir: async porInactividad => {
    clearInterval(inactT); clearInterval(refrescoT);
    try { await fetch('/api/acceso/salir', { method: 'POST', headers: { 'x-nexo': '1' }, credentials: 'same-origin' }); } catch (e) { /* la sesión vence sola */ }
    sesionTerminada(porInactividad === true ? 'Cerramos tu sesión para proteger tus datos. Tu avance quedó guardado.' : '');
  },
  seguir: () => { U.inact = null; ultimaActividad = Date.now(); render(); },
  // Navegación
  scrim: (d, el, e) => { if (e.target === el) { U.modal = null; U.buscar = null; render(); } },
  cerrarModal: () => { U.modal = null; render(); },
  go: d => go(d.v),
  space: d => { U.space = d.s; go(d.s === 'admin' ? 'tablero' : 'inicio'); quizaTour(); render(); },
  tab: d => { U.p.tab = d.t; render(); },
  curso: d => go('curso', { a: d.a }),
  actualizar: () => hacer(() => cargarEstado(true), 'Datos actualizados'),
  tourSig: () => { const T = U.tour; if (T.i < pasosTour(T.espacio).length - 1) T.i++; else { escribirLocal(T.k, true); U.tour = null; } render(); },
  tourFin: () => { escribirLocal(U.tour.k, true); U.tour = null; render(); },
  abrirBuscar: () => { U.buscar = { q: '' }; render(); setTimeout(() => { const i = $('#bq-in'); if (i) i.focus(); }, 0); },
  buscarQ: (d, el) => { U.buscar.q = el.value; render(); },
  irPersona: d => { U.buscar = null; U.modal = null; go('persona', { id: d.id }); },
  irVista: d => { U.buscar = null; go(d.v); },
  kpi: d => { U.modal = { t: 'html', html: detalleKpi(d.k), wide: true }; render(); },
  // Aprender
  leccion: d => { if (!d.l) { go('curso', { a: d.a }); return; } startLesson(d.a, d.l); render(); window.scrollTo(0, 0); },
  sel: d => { if (U.player.phase !== 'q') return; const a = act(); U.player.sel = a.t === 'tf' ? d.i === 'true' : Number(d.i); render(); },
  seq: d => { U.player.seq.push(Number(d.i)); render(); },
  unseq: d => { U.player.seq.splice(Number(d.k), 1); render(); },
  hs: (d, el, e) => { e.stopPropagation(); const P = U.player; if (P.phase !== 'q') return; if (!P.found.includes(d.id)) P.found.push(d.id); render(); },
  hsMiss: () => { const P = U.player; if (P && P.phase === 'q') { P.misses++; toast('Ahí no hay nada que reportar. Sigue buscando.'); } },
  hsToggle: () => { U.player.list = !U.player.list; render(); },
  hsList: (d, el) => { const P = U.player; if (el.checked) { if (!P.found.includes(d.id)) P.found.push(d.id); } else P.found = P.found.filter(x => x !== d.id); render(); },
  comprobar: () => { comprobar(); render(); },
  siguiente: async () => { await siguiente(); render(); window.scrollTo(0, 0); },
  cerrarLeccion: () => { const a = U.player.aid; U.player = null; toast('Tu avance de lecciones terminadas está guardado.'); go('curso', { a }); },
  finLeccion: () => { const a = U.player.aid; U.player = null; go('curso', { a }); },
  preExamen: d => { preExamen(d.a); render(); },
  iniciarExamen: d => iniciarExamen(d.a),
  resp: d => responder(d.v === 'true' ? true : d.v === 'false' ? false : Number(d.v)),
  irPregunta: d => { U.exam.idx = Number(d.i); U.exam.confirm = false; render(); },
  confExamen: () => { U.exam.confirm = true; render(); },
  volverExamen: () => { U.exam.confirm = false; render(); },
  enviarExamen: () => enviarExamen(),
  confPractica: d => hacer(() => api('/api/aprender/practica', { validacion: d.v, reconoce: true }), 'Gracias. Confirmaste tu práctica.'),
  dispPractica: d => hacer(() => api('/api/aprender/practica', { validacion: d.v, reconoce: false }), 'Avisamos a RH para que lo revise.'),
  rankOpt: () => hacer(() => api('/api/perfil/ranking', { participa: !yo().rankOptIn }), r => yo().rankOptIn ? 'Ahora apareces en el ranking de tu equipo.' : 'Listo: tu progreso es privado.'),
  verConst: d => { U.modal = { t: 'const', k: d.k, wide: true }; marcarConstanciaVista(d.k); render(); },
  pdfConst: async d => { const k = S.consts.find(x => x.id === d.k); try { await guardar('Constancia_' + k.folio + '.pdf', pdfConstancia(k)); } catch (e) { toast('No se pudo generar el PDF: ' + e.message, 'error'); } },
  exportar: async d => {
    if (U.busy) return;
    try {
      const rep = construirReporte(d.r, d.pid || alcance().personas[0] || S.yo.persona);
      const blob = d.f === 'pdf' ? pdfReporte(rep) : xlsxReporte(rep);
      const nombre = rep.titulo.replace(/[·\s]+/g, '_').replace(/[^\wÁÉÍÓÚáéíóúÑñ_-]/g, '') + '_' + hoy() + '.' + d.f;
      await guardar(nombre, blob);
      hacer(() => api('/api/exportaciones', { reporte: d.r, formato: d.f, registros: rep.filas.length, titulo: rep.titulo, alcance: rep.alcance, filtros: rep.filtros, persona: d.r === 'individual' ? (d.pid || null) : null }));
    } catch (e) { toast('No se pudo generar el archivo: ' + e.message, 'error'); }
  },
  // Administrar
  persona: d => go('persona', { id: d.id }),
  ptab: d => { U.p.tab = d.t; U.p.codigo = null; render(); },
  fArea: (d, el) => { U.p.area = el.value; render(); },
  mArea: (d, el) => { U.p.marea = el.value; render(); },
  mTurno: (d, el) => { U.p.mturno = el.value || 'todos'; render(); },
  fq: (d, el) => { U.p.q = el.value; render(); },
  cq: (d, el) => { U.p.cq = el.value; render(); },
  bq: (d, el) => { U.p.bq = el.value; render(); },
  bTec: (d, el) => { U.p.btec = el.checked; render(); },
  rep: d => { U.p.rep = d.r; render(); },
  rPid: (d, el) => { U.p.rpid = el.value; render(); },
  codigo: async (data, f, tipo) => {
    tipo = tipo || 'restablecimiento';
    if (tipo === 'restablecimiento' && (!data.verif || !String(data.motivo || '').trim())) { toast('Marca la verificación de identidad y escribe el motivo.', 'error'); return; }
    const pid = U.p.id;
    const r = await hacer(() => api('/api/admin/personas/' + pid + '/codigo', { tipo, identidadVerificada: !!data.verif, motivo: String(data.motivo || '').trim() }));
    if (r && r.codigo) { U.p.codigo = { c: r.codigo, tipo, vence: r.expiraEn }; render(); }
  },
  restablecer: (data, f) => A.codigo(data, f, 'restablecimiento'),
  fichaActivacion: () => A.codigo({}, null, 'activacion'),
  imprimirFicha: () => { document.documentElement.classList.add('imprimiendo-ficha'); window.print(); setTimeout(() => document.documentElement.classList.remove('imprimiendo-ficha'), 500); },
  nuevaRegla: () => { const ens = AREAS.find(a => a.nombre === 'Ensamble'); U.p.wiz = { paso: 0, curso: Object.keys(CURSOS)[0], areas: ens ? [ens.id] : [], turnos: TURNOS.slice(), dias: 30, contratistas: true }; render(); },
  cancelWiz: () => { U.p.wiz = null; render(); },
  wPaso: d => { U.p.wiz.paso = Number(d.n); render(); },
  wCurso: (d, el) => { U.p.wiz.curso = el.value; },
  wArea: (d, el) => { const W = U.p.wiz; W.areas = el.checked ? W.areas.concat(d.id) : W.areas.filter(x => x !== d.id); render(); },
  wTodas: () => { const W = U.p.wiz; W.areas = W.areas.length === AREAS.length ? [] : AREAS.map(a => a.id); render(); },
  wTurno: (d, el) => { const W = U.p.wiz; W.turnos = el.checked ? W.turnos.concat(d.id) : W.turnos.filter(x => x !== d.id); render(); },
  wCon: (d, el) => { U.p.wiz.contratistas = el.checked; render(); },
  wDias: (d, el) => { U.p.wiz.dias = Math.max(1, Math.min(365, Number(el.value) || 30)); render(); },
  crearRegla: () => {
    const W = U.p.wiz;
    return hacer(async () => { const r = await api('/api/reglas', { curso: W.curso, areas: W.areas, turnos: W.turnos, dias: W.dias, contratistas: W.contratistas }); U.p.wiz = null; return r; },
      r => 'Regla creada: ' + r.creadas + ' personas asignadas' + (r.vigentes ? ' (' + r.vigentes + ' ya estaban al día)' : '') + '.');
  },
  excepcion: d => { U.modal = { t: 'excepcion', a: d.a }; render(); },
  excepcionSubmit: data => {
    const motivo = String(data.motivo || '').trim(); if (!motivo) { toast('El motivo es obligatorio.', 'error'); return; }
    const asignacion = U.modal.a;
    return hacer(async () => { const r = await api('/api/excepciones', { asignacion, tipo: data.tipo, motivo }); U.modal = null; return r; }, 'Excepción aprobada y registrada en la bitácora.');
  },
  vSel: d => { U.p.vp = d.id; U.p.vf = null; render(); },
  vCrit: d => { const V = U.p.vf; V.crit[Number(d.i)] = d.v; if (V.crit.every(x => x)) V.res = V.crit.includes('no') ? 'aun_no' : 'competente'; render(); },
  vRes: d => { U.p.vf.res = d.v; render(); },
  registrarValidacion: data => {
    const V = U.p.vf;
    if (V.crit.some(x => !x)) { toast('Marca todos los criterios.', 'error'); return; }
    if (!V.res) { toast('Elige el resultado general.', 'error'); return; }
    if (V.res === 'aun_no' && !String(data.obs || '').trim()) { toast('Escribe las observaciones: son obligatorias si aún no es competente.', 'error'); return; }
    if (!data.pass) { toast('Confirma con tu frase de acceso.', 'error'); return; }
    return hacer(async () => {
      const r = await api('/api/validaciones', { participacion: V.part, criterios: V.crit, resultado: V.res, observaciones: data.obs || '', fecha: data.fecha || hoy(), frase: data.pass });
      U.p.vf = null; U.p.vp = null; return r;
    }, r => r.acreditado ? '¡Validación registrada! ' + r.persona.split(' ')[0] + ' acreditó el curso y su constancia ya está emitida.' : 'Validación registrada.');
  },
  accionConstOpen: d => { U.modal = { t: 'accionConst', k: d.k, tipo: d.t }; render(); },
  accionConst: data => {
    const M = U.modal; const motivo = String(data.motivo || '').trim();
    if (!motivo) { toast('El motivo es obligatorio.', 'error'); return; }
    if (!data.pass) { toast('Confirma con tu frase de acceso.', 'error'); return; }
    return hacer(async () => { const r = await api('/api/constancias/' + M.k + '/' + (M.tipo === 'revocar' ? 'revocar' : 'reemitir'), { motivo, frase: data.pass }); U.modal = null; return r; },
      r => M.tipo === 'revocar' ? 'Constancia revocada. Se creó una nueva participación con fecha límite a 30 días.' : 'Nueva constancia ' + r.folio + '. La anterior quedó sustituida.');
  }
};
// Formularios: el nombre en data-submit apunta a la acción
const SUBMIT = { entrar: A.entrar, activar: A.activar, restablecer: A.restablecer, registrarValidacion: A.registrarValidacion, accionConst: A.accionConst, excepcion: A.excepcionSubmit };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  let act = el.dataset.act; if (act === 'accionConst' && el.tagName === 'BUTTON') act = 'accionConstOpen';
  if (act === 'excepcion' && el.tagName === 'FORM') return;
  const fn = A[act]; if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  fn(el.dataset, el, e);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && A[el.dataset.chg]) A[el.dataset.chg](el.dataset, el, e); });
let inpT = null;
document.addEventListener('input', e => { const el = e.target.closest('[data-inp]'); if (!el) return; clearTimeout(inpT); inpT = setTimeout(() => A[el.dataset.inp](el.dataset, el, e), el.dataset.inp === 'medir' ? 0 : 160); });
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target; const fn = SUBMIT[f.dataset.submit]; if (!fn) return;
  const data = {}; new FormData(f).forEach((v, k) => { data[k] = v; }); f.querySelectorAll('input[type=checkbox][name]').forEach(c => { data[c.name] = c.checked; });
  fn(data, f);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('hs-hit')) { e.preventDefault(); A.hs(e.target.dataset, e.target, e); return; }
  if (e.key === 'Escape' && document.getElementById('splash')) { quitarSplash(); return; }
  if (e.key === 'Escape' && (U.modal || U.buscar)) { U.modal = null; U.buscar = null; render(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && U.user && U.space === 'admin') { e.preventDefault(); A.abrirBuscar(); return; }
  // Atajos del reproductor: 1-4 eligen, Enter comprueba o continúa
  const P = U.player; const enCampo = /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''));
  if (P && !P.done && !U.modal && !enCampo) {
    const a = act();
    if (P.phase === 'q' && /^[1-4]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (a.t === 'tf' && i < 2) { P.sel = i === 0; render(); }
      else if ((a.t === 'mc' || a.t === 'decision' || a.t === 'img') && i < a.ops.length) { P.sel = i; render(); }
      else if (a.t === 'order') { const pool = a.items.map((_, k) => k).filter(k => !P.seq.includes(k)); const orden = (P.ord || []).filter(k => pool.includes(k)); if (orden[i] !== undefined) { P.seq.push(orden[i]); render(); } }
      return;
    }
    if (e.key === 'Enter' && !e.target.closest('button')) {
      e.preventDefault();
      if (P.phase === 'q') { const b = $('[data-act="comprobar"]'); if (b && !b.disabled) A.comprobar(); }
      else A.siguiente();
    }
  }
  if (P && P.done && e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); A.finLeccion(); }
});

/* ---------- Inicio ---------- */
(async function iniciarApp() {
  try {
    const s = await api('/api/acceso/sesion');
    if (!s.activa) { U.cargando = false; await cargarEmpresas(); return; }
    await cargarEstado(true); U.cargando = false; if (!restaurarUI()) espacioInicial(); quizaTour(); vigilarSesion(); U.anim = true;
  } catch (e) { U.cargando = false; await cargarEmpresas(); return; }
  render();
})();
