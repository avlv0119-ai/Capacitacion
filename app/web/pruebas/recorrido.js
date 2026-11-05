// Recorrido de punta a punta por la interfaz real (navegador → HTTPS → servicio → base), con los datos de demostración.
// Requiere el ambiente levantado (despliegue/hostinger) y las frases de las cuentas de demostración en un JSON.
// Uso: node app/web/pruebas/recorrido.js <url> <cuentas.json> [carpeta-de-capturas]
//   Las respuestas de la evaluación se leen de la base con `docker compose exec` (la interfaz nunca las recibe).
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const URL_BASE = process.argv[2] || 'https://localhost';
const cuentas = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const CAPTURAS = process.argv[4] || null;
const frase = n => cuentas.find(c => c.numero === n).frase;
const DESPLIEGUE = path.resolve(__dirname, '../../../despliegue/hostinger');
let ok = 0;
function comprobar(nombre, cond, detalle) { if (!cond) throw new Error('FALLA · ' + nombre + (detalle ? ' · ' + detalle : '')); ok++; console.log('OK    · ' + nombre + (detalle ? ' · ' + detalle : '')); }
function sql(q) {
  const env = Object.fromEntries(fs.readFileSync(path.join(DESPLIEGUE, '.env'), 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
  return execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', env.POSTGRES_USER || 'nexo_admin', '-d', 'nexo', '-tA', '-c', q], { cwd: DESPLIEGUE }).toString().trim();
}

(async () => {
  const navegador = await chromium.launch({ args: ['--no-proxy-server'] });
  const errores = [];
  async function contexto(movil) {
    const ctx = await navegador.newContext({ ignoreHTTPSErrors: true, viewport: movil ? { width: 390, height: 844 } : { width: 1366, height: 860 }, acceptDownloads: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errores.push(m.text()); });
    // Respuestas con error: solo se espera el 401 del intento con frase incorrecta
    page.on('response', r => { if (r.status() >= 500 || (r.status() >= 400 && !r.url().endsWith('/api/acceso/entrar'))) errores.push(r.status() + ' ' + r.url()); });
    return { ctx, page };
  }
  const captura = async (page, nombre) => { if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, nombre + '.png') }); };
  async function entrar(page, numero) {
    await page.goto(URL_BASE + '/');
    await page.waitForSelector('#l-num');
    await page.fill('#l-num', numero); await page.fill('#l-pass', frase(numero));
    await page.click('button[type=submit]');
    await page.waitForFunction(() => typeof S !== 'undefined' && S && S.yo && !U.cargando);
    const tour = await page.$('[data-act="tourFin"]'); if (tour) await tour.click();
  }
  const toast = async page => (await page.waitForSelector('.toast')).textContent();

  // ---------- 1. Acceso ----------
  let { ctx, page } = await contexto(true);
  await page.goto(URL_BASE + '/');
  await page.waitForSelector('#l-num');
  await captura(page, 'r01-acceso');
  comprobar('La pantalla de acceso muestra la empresa y pide número y frase', await page.isVisible('.emp-chip') && await page.isVisible('#l-pass'));
  await page.fill('#l-num', '004817'); await page.fill('#l-pass', 'esta frase no es la correcta');
  await page.click('button[type=submit]');
  await page.waitForSelector('.notice.danger');
  comprobar('Una frase incorrecta muestra un mensaje que no revela si el número existe', (await page.textContent('.notice.danger')).includes('Revisa tu número de empleado y tu frase'));
  await page.click('[data-act="modoActivar"]'); await page.fill('#a-frase', 'mango puente nube tambor');
  comprobar('La activación con ficha incluye medidor de frase', (await page.textContent('#medidor')).includes('Excelente'));
  await captura(page, 'r02-activar');
  await ctx.close();

  // ---------- 2. RH asigna el curso con una regla ----------
  ({ ctx, page } = await contexto(false));
  await entrar(page, '000412');
  await page.waitForSelector('.kpis');
  await captura(page, 'r03-tablero');
  comprobar('RH entra directo a su tablero', (await page.textContent('h1')).includes('Tablero'));
  await page.click('[data-act="kpi"][data-k="atrasada"]');
  await page.waitForSelector('.dialog table');
  comprobar('Los indicadores se pueden abrir para ver a las personas', (await page.$$('.dialog tbody tr.click')).length > 0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.fill('#bq-in', 'Rosa');
  await page.waitForSelector('.res[data-act="irPersona"]');
  comprobar('El buscador rápido encuentra personas', (await page.textContent('.buscar')).includes('Rosa Elena Ibarra'));
  await page.keyboard.press('Escape');
  await page.click('[data-act="go"][data-v="reglas"]');
  await page.click('[data-act="nuevaRegla"]');
  await page.selectOption('#w-curso', 'C2');
  await page.click('[data-act="wPaso"][data-n="1"]');
  await page.click('[data-act="wPaso"][data-n="2"]');
  await page.waitForSelector('[data-act="crearRegla"]');
  await captura(page, 'r04-vista-previa');
  await page.click('[data-act="crearRegla"]');
  comprobar('La regla se crea en el servidor y asigna el curso', /Regla creada: 36 personas/.test(await toast(page)));
  await ctx.close();

  // ---------- 3. La trabajadora aprende y presenta la evaluación ----------
  ({ ctx, page } = await contexto(true));
  await entrar(page, '004817');
  await page.waitForSelector('.hero');
  await captura(page, 'r05-inicio');
  comprobar('Inicio propone el curso más urgente y lista el nuevo en pendientes', !!(await page.textContent('.hero')) && (await page.textContent('#app')).includes('Orden y limpieza del área'));
  await page.click('.ccard:has-text("Orden y limpieza del área")');
  await page.click('.st.cur[data-act="leccion"]');
  for (let leccion = 0; leccion < 4; leccion++) {
    await page.waitForSelector('.player');
    for (let paso = 0; paso < 12; paso++) {
      if (await page.$('[data-act="finLeccion"]')) break;
      const a = await page.evaluate(() => { const x = act(); return { t: x.t, ok: x.ok, n: (x.items || []).length }; });
      if (a.t === 'tf') await page.click(`[data-act="sel"][data-i="${a.ok}"]`);
      else if (a.t === 'order') for (let i = 0; i < a.n; i++) await page.click(`[data-act="seq"][data-i="${i}"]`);
      else if (a.t === 'hotspot') { await page.click('[data-act="hsToggle"]'); for (const id of ['derrame', 'cajas', 'cable']) await page.click('#hs-' + id); }
      else await page.click(`[data-act="sel"][data-i="${a.ok}"]`);
      await page.click('[data-act="comprobar"]');
      if (leccion === 0 && paso === 0) await captura(page, 'r06-actividad');
      await page.click('[data-act="siguiente"]');
      await page.waitForFunction(() => U.player && (U.player.done || U.player.phase === 'q'));
    }
    await page.waitForSelector('[data-act="finLeccion"]');
    if (leccion === 3) await captura(page, 'r07-leccion-completa');
    await page.click('[data-act="finLeccion"]');
    await page.waitForSelector('.route');
    const sig = await page.$('.st.cur[data-act="leccion"]');
    if (sig) await sig.click();
  }
  const hechas = sql(`SELECT array_length(lecciones_completadas, 1) FROM nexo.participaciones p JOIN nexo.cursos c ON c.id = p.curso_id JOIN nexo.numeros_empleado n ON n.persona_id = p.persona_id WHERE c.clave = 'C2' AND n.numero = '004817'`);
  comprobar('Las 4 lecciones quedaron guardadas en la base', hechas === '4');
  await captura(page, 'r08-camino');
  await page.click('[data-act="preExamen"]');
  await page.click('[data-act="iniciarExamen"]');
  await page.waitForSelector('#eq');
  const qs = await page.evaluate(() => U.exam.qs);
  const banco = JSON.parse(sql(`SELECT v.contenido->'banco' FROM nexo.versiones_curso v JOIN nexo.cursos c ON c.id = v.curso_id WHERE c.clave = 'C2'`));
  for (let i = 0; i < qs.length; i++) {
    await page.click(`[data-act="resp"][data-v="${banco[qs[i]].ok}"]`);
    await page.waitForSelector('.chip.ok >> text=Guardada');
    if (i < qs.length - 1) await page.click(`[data-act="irPregunta"][data-i="${i + 1}"]`);
  }
  await captura(page, 'r09-evaluacion');
  await page.click('[data-act="confExamen"]');
  await page.click('[data-act="enviarExamen"]');
  await page.waitForSelector('.done-hero');
  comprobar('La evaluación se califica en el servidor y aprueba', (await page.textContent('.done-hero')).includes('Aprobaste'));
  comprobar('El resultado indica que falta la práctica', (await page.textContent('#app')).includes('Aún no acreditas el curso'));
  await captura(page, 'r10-resultado');
  await ctx.close();

  // ---------- 4. La supervisora valida la práctica ----------
  ({ ctx, page } = await contexto(false));
  await entrar(page, '001920');
  await page.click('[data-act="go"][data-v="validacion"]');
  await page.click('[data-act="vSel"]:has-text("Rosa Elena Ibarra"):has-text("Orden y limpieza")');
  for (let i = 0; i < 4; i++) await page.click(`[data-act="vCrit"][data-i="${i}"][data-v="cumple"]`);
  await page.fill('#v-pass', frase('001920'));
  await captura(page, 'r11-validacion');
  await page.click('form[data-submit="registrarValidacion"] button[type=submit]');
  comprobar('La validación acredita y emite la constancia', /acreditó el curso/.test(await toast(page)));
  await ctx.close();

  // ---------- 5. La trabajadora confirma y descarga su constancia ----------
  ({ ctx, page } = await contexto(true));
  await entrar(page, '004817');
  await page.waitForSelector('[data-act="confPractica"]');
  await page.click('[data-act="confPractica"]');
  await toast(page);
  await page.waitForSelector('.notice.ok >> text=Nueva constancia');
  comprobar('Inicio avisa de la constancia nueva', true);
  await page.click('[data-act="verConst"]');
  await page.waitForSelector('.cert');
  await captura(page, 'r12-constancia');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="pdfConst"]')]);
  comprobar('La constancia se descarga en PDF con su folio', /^Constancia_DN-\d{4}-\d{6}\.pdf$/.test(descarga.suggestedFilename()), descarga.suggestedFilename());
  await page.keyboard.press('Escape');
  await page.click('[data-act="go"][data-v="logros"]');
  await page.waitForSelector('.badges');
  await captura(page, 'r13-logros');
  comprobar('Logros muestra puntos de la semana y ranking del equipo', (await page.textContent('#app')).includes('Ranking del equipo') && Number(await page.textContent('.big-num')) > 0);
  await ctx.close();

  // ---------- 6. RH exporta y la bitácora registra todo ----------
  ({ ctx, page } = await contexto(false));
  await entrar(page, '000412');
  await page.click('[data-act="go"][data-v="reportes"]');
  await page.click('[data-act="rep"][data-r="matriz"]');
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="exportar"][data-r="matriz"][data-f="xlsx"]')]);
  comprobar('La matriz se exporta a Excel', xlsx.suggestedFilename().endsWith('.xlsx'), xlsx.suggestedFilename());
  await page.waitForFunction(() => S.exports.length > 0);
  await page.click('[data-act="go"][data-v="bitacora"]');
  const bit = await page.textContent('#app');
  comprobar('La bitácora muestra el recorrido completo', ['Crear regla de asignación', 'Completar lección', 'Enviar intento', 'Registrar validación práctica', 'Confirmar práctica', 'Exportar'].every(x => bit.includes(x)));
  await captura(page, 'r14-bitacora');
  await ctx.close();

  comprobar('Sin errores de JavaScript ni de política de contenido en el navegador', errores.length === 0, errores.join(' | ').slice(0, 300));
  await navegador.close();
  console.log(`\n${ok} comprobaciones correctas`);
})().catch(e => { console.error(e.message); process.exit(1); });
