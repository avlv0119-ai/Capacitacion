// Genera las capturas del prototipo para la documentación.
// Uso: node prototipo/pruebas/capturas.js <carpeta-de-salida>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(process.argv[2] || 'capturas');
const HTML = 'file://' + path.resolve(__dirname, '..', 'index.html');
fs.mkdirSync(OUT, { recursive: true });

async function nueva(browser, movil, oscuro) {
  const ctx = await browser.newContext({ viewport: movil ? { width: 390, height: 844 } : { width: 1280, height: 820 }, deviceScaleFactor: 2, colorScheme: oscuro ? 'dark' : 'light', isMobile: !!movil, hasTouch: !!movil });
  const page = await ctx.newPage();
  await page.goto(HTML, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press('Escape');
  return page;
}
const preparar = page => page.evaluate(() => {
  // Estado de demostración: regla del curso C2 creada y dos lecciones completadas por Rosa
  const r = { id: 'R5', curso: 'C2', areas: ['ENS'], turnos: ['T1', 'T2', 'T3'], dias: 30, contratistas: true, tipo: 'obligatorio', creada: hoy(), autor: 'Ana Ruiz', estado: 'activa', nueva: true };
  S.reglas.push(r); aplicarRegla(r);
  const a = asigDe('p-rosa', 'C2'); const p = partActual(a); p.inicio = hoy(); p.version = 3; p.hechas = ['L1', 'L2'];
  S.puntos.push({ persona: 'p-rosa', fecha: hoy(), pts: 70, motivo: 'Lección L1 completada' });
});
async function foto(page, nombre, sel) {
  await page.waitForTimeout(250);
  if (sel) await page.locator(sel).first().screenshot({ path: path.join(OUT, nombre + '.png') });
  else await page.screenshot({ path: path.join(OUT, nombre + '.png') });
  console.log('captura', nombre);
}

(async () => {
  const browser = await chromium.launch();
  // ---- Celular, claro ----
  let page = await nueva(browser, true, false);
  await foto(page, 'm01-acceso');
  await preparar(page);
  await page.evaluate(id => entrarComo(id), 'rosa');
  await foto(page, 'm02-inicio');
  await page.evaluate(() => { go('curso', { a: asigDe('p-rosa', 'C2').id }); });
  await foto(page, 'm03-ruta');
  await page.evaluate(() => { startLesson(asigDe('p-rosa', 'C2').id, 'L1'); render(); });
  await page.locator('[data-act=sel][data-i="0"]').click();
  await foto(page, 'm04-actividad-imagen');
  await page.evaluate(() => { startLesson(asigDe('p-rosa', 'C2').id, 'L3'); U.player.found = ['derrame', 'cajas']; render(); });
  await foto(page, 'm05-identificar-riesgos');
  await page.evaluate(() => { startLesson(asigDe('p-rosa', 'C2').id, 'L2'); U.player.seq = [0, 2, 1, 3]; render(); comprobar(); render(); });
  await foto(page, 'm06-retroalimentacion');
  await page.evaluate(() => { U.player.done = true; U.player.pts = 90; U.player.firstOk = 3; U.player.errores = 0; render(); });
  await foto(page, 'm07-fin-leccion');
  await page.evaluate(() => { const a = asigDe('p-rosa', 'C2'); const p = partActual(a); p.hechas = ['L1', 'L2', 'L3', 'L4']; U.player = null; iniciarExamen(a.id); U.exam.ans[0] = CURSOS.C2.banco[U.exam.qs[0]].ok; render(); });
  await foto(page, 'm08-evaluacion');
  await page.evaluate(() => { const E = U.exam; E.qs.forEach((q, i) => { E.ans[i] = CURSOS.C2.banco[q].ok; }); enviarExamen(); render(); });
  await foto(page, 'm09-resultado');
  await page.evaluate(() => { go('logros'); });
  await foto(page, 'm10-logros');
  await page.evaluate(() => { const p = S.parts.find(x => x.persona === 'p-rosa' && x.curso === 'C2' && !x.cancelada); p.vals.push({ id: 'va-x', fecha: hoy(), registro: hoy(), validador: 'Laura Peña', crit: ['cumple', 'cumple', 'cumple', 'cumple'], res: 'competente', obs: '', foto: false, conf: false }); acreditar(p, hoy()); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { go('inicio'); });
  await foto(page, 'm11-inicio-constancia');
  await page.evaluate(() => { go('historial'); });
  await foto(page, 'm12-historial');
  await page.evaluate(() => A.inactividad());
  await page.waitForTimeout(1200);
  await foto(page, 'm13-inactividad');
  await page.context().close();

  // ---- Celular, oscuro ----
  page = await nueva(browser, true, true);
  await preparar(page);
  await page.evaluate(id => entrarComo(id), 'rosa');
  await foto(page, 'm14-inicio-oscuro');
  await page.context().close();

  // ---- Computadora ----
  page = await nueva(browser, false, false);
  await preparar(page);
  await page.evaluate(id => entrarComo(id), 'ana');
  await foto(page, 'd01-tablero');
  await page.evaluate(() => { go('matriz'); });
  await foto(page, 'd02-matriz');
  await page.evaluate(() => { go('reglas'); A.nuevaRegla(); U.p.wiz.curso = 'C4'; U.p.wiz.areas = ['MAN', 'ENS']; U.p.wiz.paso = 2; render(); });
  await foto(page, 'd03-regla-vista-previa');
  await page.evaluate(() => { go('reportes'); });
  await foto(page, 'd04-reportes');
  await page.evaluate(() => { go('persona', { id: 'p-rosa' }); });
  await foto(page, 'd05-ficha-persona');
  await page.evaluate(id => entrarComo(id), 'laura');
  await page.evaluate(() => { U.space = 'admin'; go('validacion'); const P = S.parts.find(x => x.persona === 'p-rosa' && x.curso === 'C4'); U.p.vp = P.id; U.p.vf = { part: P.id, crit: ['cumple', 'cumple', 'cumple', null], res: null, fecha: hoy() }; render(); });
  await foto(page, 'd06-validacion');
  await page.evaluate(id => entrarComo(id), 'ana');
  await page.evaluate(() => { const k = S.consts.find(k => k.persona === 'p-rosa' && k.curso === 'C1'); A.verConst({ k: k.id }); });
  await foto(page, 'd07-constancia');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { U.guide = true; render(); });
  await foto(page, 'd08-guia');
  await page.context().close();

  page = await nueva(browser, false, true);
  await preparar(page);
  await page.evaluate(id => entrarComo(id), 'ana');
  await foto(page, 'd09-tablero-oscuro');
  await page.context().close();
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
