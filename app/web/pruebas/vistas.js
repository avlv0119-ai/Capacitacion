// Recorre todas las pantallas de cada una de las 7 cuentas de demostración y verifica que se muestren sin errores.
// Uso: node app/web/pruebas/vistas.js <url> <cuentas.json>
const { chromium } = require('playwright');
const fs = require('node:fs');

const URL_BASE = process.argv[2] || 'https://localhost';
const cuentas = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
let ok = 0;

(async () => {
  const navegador = await chromium.launch({ args: ['--no-proxy-server'] });
  for (const c of cuentas) {
    for (const movil of [false, true]) {
      const ctx = await navegador.newContext({ ignoreHTTPSErrors: true, viewport: movil ? { width: 390, height: 844 } : { width: 1366, height: 860 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const errores = [];
      page.on('pageerror', e => errores.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errores.push(r.status() + ' ' + r.url()); });
      await page.goto(URL_BASE + '/');
      await page.waitForSelector('#l-num');
      await page.fill('#l-num', c.numero); await page.fill('#l-pass', c.frase);
      await page.click('button[type=submit]');
      await page.waitForFunction(() => typeof S !== 'undefined' && S && S.yo && !U.cargando);
      const tour = await page.$('[data-act="tourFin"]'); if (tour) await tour.click();
      const vistas = await page.evaluate(() => {
        const out = [];
        if (esAdminSpace()) out.push(...menu().map(m => ['admin', m[0]]));
        if (tiene('trabajador')) out.push(...['inicio', 'cursos', 'logros', 'historial'].map(v => ['aprender', v]));
        return out;
      });
      for (const [espacio, vista] of vistas) {
        await page.evaluate(([e, v]) => { U.space = e; go(v); }, [espacio, vista]);
        const texto = await page.textContent('#app');
        if (!texto || texto.length < 40) errores.push('vista vacía: ' + espacio + '/' + vista);
        if (/undefined|NaN|\[object Object\]/.test(texto)) errores.push('texto inválido en ' + espacio + '/' + vista + ': ' + (texto.match(/.{0,40}(undefined|NaN|\[object Object\]).{0,40}/) || [''])[0]);
      }
      // Detalle de una persona (si su rol tiene consola con personas)
      const persona = await page.evaluate(() => esAdminSpace() && alcance().personas.length ? alcance().personas[0] : null);
      if (persona) for (const tab of ['cap', 'hist', 'ads', 'acc', 'bit']) {
        await page.evaluate(([id, t]) => { U.space = 'admin'; go('persona', { id, tab: t }); }, [persona, tab]);
        const texto = await page.textContent('#app');
        if (/undefined|NaN|\[object Object\]/.test(texto)) errores.push('texto inválido en persona/' + tab);
      }
      if (errores.length) throw new Error(c.numero + (movil ? ' (móvil)' : '') + ': ' + errores.join(' | '));
      ok++; console.log('OK    · ' + c.numero + (movil ? ' · móvil' : ' · escritorio') + ' · ' + vistas.length + ' pantallas sin errores');
      await ctx.close();
    }
  }
  await navegador.close();
  console.log(`\n${ok} recorridos de pantallas correctos`);
})().catch(e => { console.error('FALLA · ' + e.message); process.exit(1); });
