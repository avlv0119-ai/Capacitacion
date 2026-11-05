// Prueba automatizada del recorrido completo del prototipo (Etapa 3).
// Uso: node prototipo/pruebas/recorrido.js <carpeta-de-salida>
// Requiere Playwright con Chromium. Abre prototipo/index.html (generado por construir.py).
// Recorrido: regla de asignación → lecciones → evaluación (reprobada y aprobada) → validación práctica
// → acreditación y constancia → confirmación del trabajador → exportaciones → reemisión y revocación
// → permisos por rol → vencimiento con fecha simulada.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(process.argv[2] || 'salida-pruebas');
const HTML = 'file://' + path.resolve(__dirname, '..', 'index.html');
fs.mkdirSync(OUT, { recursive: true });

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok: !!ok, detalle: detalle === undefined ? '' : String(detalle) });
  console.log((ok ? 'OK   ' : 'FALLA') + ' · ' + nombre + (detalle !== undefined ? ' · ' + detalle : ''));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(HTML, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const como = async id => { await page.selectOption('#ver-como', id); await page.waitForTimeout(80); };
  const clic = async sel => { await page.locator(sel).first().click(); await page.waitForTimeout(40); };
  const descargar = async (sel, nombre) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator(sel).first().click()]);
    const destino = path.join(OUT, nombre || d.suggestedFilename());
    await d.saveAs(destino);
    return destino;
  };

  check('La guía se abre en la primera visita', await page.locator('.drawer').count() === 1);
  await page.keyboard.press('Escape');

  // 1 · RH crea la regla de asignación
  await como('ana');
  await clic('[data-act=go][data-v=reglas]');
  await clic('[data-act=nuevaRegla]');
  await clic('[data-act=wPaso][data-n="1"]');
  await clic('[data-act=wPaso][data-n="2"]');
  const vista = await page.locator('.kpi.main .v').first().innerText();
  check('Vista previa de la regla muestra personas afectadas', Number(vista) > 0, vista + ' personas');
  await clic('[data-act=crearRegla]');
  const asignada = await ev(() => S.asigs.some(a => a.persona === 'p-rosa' && a.curso === 'C2'));
  check('La regla crea la asignación de Rosa', asignada);
  const dup = await ev(() => S.asigs.filter(a => a.persona === 'p-rosa' && a.curso === 'C2' && a.estado === 'activa').length);
  check('Una sola asignación activa por persona y curso', dup === 1, dup);

  // 2 · Rosa completa las cuatro lecciones
  await como('rosa');
  check('Inicio muestra el curso nuevo', (await page.locator('.hero').innerText()).includes('Orden y limpieza'));
  await clic('.hero [data-act=leccion]');
  let errorProvocado = false; let guard = 0;
  for (let leccion = 0; leccion < 4; leccion++) {
    if (leccion > 0) await clic('.st.cur');
    while (guard++ < 200) {
      const est = await ev(() => { const P = U.player; if (!P) return { fin: true }; if (P.done) return { done: true }; const a = act(); return { t: a.t, ok: a.ok, n: a.items ? a.items.length : 0, phase: P.phase }; });
      if (est.fin) break;
      if (est.done) { await clic('[data-act=finLeccion]'); break; }
      if (est.phase === 'fb') { await clic('[data-act=siguiente]'); continue; }
      if (!errorProvocado && (est.t === 'mc' || est.t === 'img')) { await clic('[data-act=sel][data-i="' + (est.ok === 0 ? 1 : 0) + '"]'); errorProvocado = true; }
      else if (est.t === 'mc' || est.t === 'img' || est.t === 'decision') await clic('[data-act=sel][data-i="' + est.ok + '"]');
      else if (est.t === 'tf') await clic('[data-act=sel][data-i="' + est.ok + '"]');
      else if (est.t === 'order') { for (let i = 0; i < est.n; i++) await clic('[data-act=seq][data-i="' + i + '"]'); }
      else if (est.t === 'hotspot') { for (const id of ['derrame', 'cajas', 'cable']) { await page.locator('circle[data-id=' + id + ']').dispatchEvent('click'); await page.waitForTimeout(30); } }
      await clic('[data-act=comprobar]');
      if (errorProvocado && resultados.every(r => r.nombre !== 'Retroalimentación de error visible y explicada')) {
        const txt = await page.locator('.fb.bad').innerText().catch(() => '');
        check('Retroalimentación de error visible y explicada', txt.includes('Revisa esto') && txt.includes('Repasarás'), txt.split('\n')[0]);
      }
    }
  }
  const lecc = await ev(() => { const a = S.asigs.find(a => a.persona === 'p-rosa' && a.curso === 'C2'); const p = partActual(a); return { hechas: p.hechas.length, estado: partEstado(p), version: p.version }; });
  check('Cuatro lecciones completadas → «Contenido completado»', lecc.hechas === 4 && lecc.estado === 'contenido_completado', JSON.stringify(lecc));
  check('La participación queda ligada a la versión 3', lecc.version === 3);
  const pts = await ev(() => S.puntos.filter(x => x.persona === 'p-rosa' && x.fecha === hoy()).reduce((s, x) => s + x.pts, 0));
  check('Las actividades otorgan puntos (registro separado)', pts > 0, pts + ' puntos');
  check('Los puntos no cambian el estado oficial', lecc.estado === 'contenido_completado');

  // 3 · Evaluación: primer intento reprobado, segundo aprobado
  const responder = async correcto => {
    const qs = await ev(() => U.exam.qs.map(i => CURSOS.C2.banco[i]).map(q => ({ t: q.t, ok: q.ok, n: q.ops ? q.ops.length : 2 })));
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]; let v = q.ok;
      if (!correcto) v = q.t === 'tf' ? !q.ok : (q.ok + 1) % q.n;
      await clic('[data-act=resp][data-v="' + v + '"]');
      if (i < qs.length - 1) await clic('[data-act=irPregunta][data-i="' + (i + 1) + '"]');
    }
    await clic('[data-act=confExamen]');
    await clic('[data-act=enviarExamen]');
  };
  await clic('[data-act=preExamen]');
  await clic('[data-act=iniciarExamen]');
  await responder(false);
  check('Intento 1 reprobado muestra temas a repasar', (await page.locator('.learn').innerText()).includes('Aún no apruebas'));
  await clic('[data-act=go][data-v=inicio]');
  await clic('.hero [data-act=curso]');
  await clic('[data-act=preExamen]');
  await clic('[data-act=iniciarExamen]');
  await responder(true);
  check('Intento 2 aprobado', (await page.locator('.learn').innerText()).includes('Aprobaste la evaluación'));
  const tras = await ev(() => { const a = S.asigs.find(a => a.persona === 'p-rosa' && a.curso === 'C2'); const p = partActual(a); return { estado: partEstado(p), intentos: p.intentos.length, acred: !!p.acred, cum: cumplimiento(a).k, sub: cumplimiento(a).sub }; });
  check('Aprobar no acredita: queda «Pendiente de validación»', tras.estado === 'pendiente_validacion' && !tras.acred, JSON.stringify(tras));
  check('Se registraron 2 intentos', tras.intentos === 2);

  // Doble envío: no crea otro intento
  const antes = await ev(() => S.parts.find(p => p.persona === 'p-rosa' && p.curso === 'C2' && !p.cancelada).intentos.length);
  await ev(() => { U.exam = { pid: S.parts.find(p => p.persona === 'p-rosa' && p.curso === 'C2' && !p.cancelada).id, n: 2, qs: [], ans: {}, sent: false }; enviarExamen(); });
  const despues = await ev(() => S.parts.find(p => p.persona === 'p-rosa' && p.curso === 'C2' && !p.cancelada).intentos.length);
  check('Reenviar un intento cerrado no duplica el registro', antes === despues, antes + ' → ' + despues);
  await ev(() => { U.exam = null; U.view = 'inicio'; render(); });

  // 4 · Laura valida la práctica
  await como('laura');
  await clic('[data-act=space][data-s=admin]');
  await clic('[data-act=go][data-v=validacion]');
  const pid = await ev(() => S.parts.find(p => p.persona === 'p-rosa' && p.curso === 'C2' && !p.cancelada).id);
  await clic('[data-act=vSel][data-id="' + pid + '"]');
  for (let i = 0; i < 4; i++) await clic('[data-act=vCrit][data-i="' + i + '"][data-v=cumple]');
  await page.fill('#v-pass', 'frase simulada');
  await clic('form[data-submit=registrarValidacion] button[type=submit]');
  await page.waitForTimeout(1600);
  const acr = await ev(() => { const a = S.asigs.find(a => a.persona === 'p-rosa' && a.curso === 'C2'); const c = cumplimiento(a); const ac = c.acred; const k = ac && S.consts.find(k => k.acred === ac.id); return { cum: c.k, fecha: ac && ac.fecha, vence: ac && ac.vence, version: ac && ac.version, folio: k && k.folio, estado: k && k.estado, huella: k && k.huella }; });
  check('Validación «Competente» acredita el curso', acr.cum === 'al_dia', JSON.stringify(acr));
  check('Vigencia = fecha de acreditación + 12 meses', acr.fecha === '2026-11-05' && acr.vence === '2027-11-05');
  check('Constancia emitida automáticamente con folio', /^DN-2026-\d{6}$/.test(acr.folio || '') && acr.estado === 'vigente', acr.folio);
  check('Registro de emisión con huella SHA-256', /^[0-9a-f]{64}$/.test(acr.huella || ''));
  const emitirOtraVez = await ev(() => { const a = S.acreds.find(a => a.persona === 'p-rosa' && a.curso === 'C2'); const n = S.consts.length; emitir(a, hoy()); return S.consts.length - n; });
  check('Repetir la emisión no duplica la constancia', emitirOtraVez === 0);

  // 5 · Rosa confirma y descarga su constancia
  await como('rosa');
  check('Aviso para confirmar la práctica', await page.locator('[data-act=confPractica]').count() === 1);
  await clic('[data-act=confPractica]');
  await clic('[data-act=go][data-v=historial]');
  await clic('[data-act=verConst]');
  const pdfConst = await descargar('[data-act=pdfConst]', 'constancia.pdf');
  check('PDF de constancia generado', fs.statSync(pdfConst).size > 3000, fs.statSync(pdfConst).size + ' bytes');
  await page.keyboard.press('Escape');

  // 6 · RH consulta y exporta las siete exportaciones en PDF y Excel
  await como('ana');
  const kpi = await page.locator('.kpi.main').innerText();
  check('Tablero muestra cumplimiento con numerador y denominador', /de [\d,]+ asignaciones/.test(kpi), kpi.replace(/\n/g, ' '));
  const kpiCalc = await ev(() => { const r = filas(alcance()); const I = indicadores(r); return { cumplen: I.cumplen, den: I.den, n: I.n }; });
  const kpiManual = await ev(() => { const f = hoy(); const xs = S.asigs.filter(a => a.estado === 'activa'); let den = 0, ok = 0; for (const a of xs) { const c = cumplimiento(a, f); if (c.k === 'exenta') continue; den++; if (c.k === 'al_dia' || c.k === 'por_vencer') ok++; } return { ok, den }; });
  check('Indicador I-05 coincide con un recálculo independiente', kpiCalc.cumplen === kpiManual.ok && kpiCalc.den === kpiManual.den, kpiCalc.cumplen + '/' + kpiCalc.den);
  await clic('[data-act=go][data-v=reportes]');
  const reps = ['individual', 'matriz', 'unidad', 'intentos', 'validaciones', 'constancias', 'pendientes'];
  for (const r of reps) {
    await clic('[data-act=rep][data-r=' + r + ']');
    for (const f of ['xlsx', 'pdf']) {
      const archivo = await descargar('.amain [data-act=exportar][data-f=' + f + ']', 'reporte-' + r + '.' + f);
      check('Exportación ' + r + ' · ' + f.toUpperCase(), fs.statSync(archivo).size > 1500, fs.statSync(archivo).size + ' bytes');
    }
  }
  const bit = await ev(() => S.bit.filter(b => b.accion === 'Exportar').length);
  check('Cada exportación queda en la bitácora', bit === 14, bit);

  // 7 · Reemisión y revocación sin perder trazabilidad
  await clic('[data-act=go][data-v=constancias]');
  await page.fill('#c-q', 'Rosa Elena');
  await page.waitForTimeout(400);
  const folioRosa = acr.folio;
  await page.locator('tr', { hasText: folioRosa }).locator('[data-t=reemitir]').click();
  await page.fill('#m-motivo', 'Prueba: corrección de datos');
  await page.fill('#m-pass', 'x');
  await clic('form[data-submit=accionConst] button[type=submit]');
  const reem = await ev(f => { const k = S.consts.find(k => k.folio === f); const n = S.consts.find(x => x.anterior === k.id); return { ant: k.estado, nuevo: n && n.folio, nuevoEst: n && n.estado }; }, folioRosa);
  check('Reemitir: la anterior queda «Sustituida» y enlazada', reem.ant === 'sustituida' && reem.nuevoEst === 'vigente', JSON.stringify(reem));
  await page.waitForTimeout(300);
  await page.locator('tr', { hasText: reem.nuevo }).locator('[data-t=revocar]').click();
  await page.fill('#m-motivo', 'Prueba: acreditación registrada por error');
  await page.fill('#m-pass', 'x');
  await clic('form[data-submit=accionConst] button[type=submit]');
  const rev = await ev(f => { const k = S.consts.find(k => k.folio === f); const ac = S.acreds.find(a => a.id === k.acred); const a = S.asigs.find(a => a.persona === 'p-rosa' && a.curso === 'C2'); const c = cumplimiento(a); return { k: k.estado, ac: ac.estado, cum: c.k, sub: c.sub, total: S.consts.filter(x => x.persona === 'p-rosa' && x.curso === 'C2').length }; }, reem.nuevo);
  check('Revocar: acreditación y constancia revocadas, nueva participación pendiente', rev.k === 'revocada' && rev.ac === 'revocada' && rev.cum === 'pendiente' && rev.sub === 'pendiente', JSON.stringify(rev));
  check('Nada se borra: se conservan las 2 constancias', rev.total === 2);

  // 8 · Permisos por rol (aplicados en la interfaz del prototipo)
  await como('raul');
  check('Auditor: solo lectura, sin «Nueva regla»', (await page.locator('.scope').innerText()).includes('Solo lectura'));
  await clic('[data-act=go][data-v=reglas]');
  check('Auditor no puede crear reglas', await page.locator('[data-act=nuevaRegla]').count() === 0);
  await clic('[data-act=go][data-v=constancias]');
  check('Auditor no puede reemitir ni revocar', await page.locator('[data-t=revocar],[data-t=reemitir]').count() === 0);
  await como('laura'); await clic('[data-act=space][data-s=admin]');
  const menuLaura = await page.locator('.side .navb').allInnerTexts();
  check('Supervisora: sin reglas ni bitácora en su menú', !menuLaura.some(t => /Reglas|Bitácora/.test(t)), menuLaura.join(' | '));
  const alcLaura = await ev(() => alcance().personas.every(id => { const p = persona(id); return p.area === 'ENS' && p.turno === 'T2'; }));
  check('Supervisora: alcance limitado a Ensamble · Turno 2', alcLaura);
  await como('rosa');
  check('Trabajadora: sin acceso a la consola', await page.locator('.side').count() === 0 && await page.locator('[data-s=admin]').count() === 0);
  await como('ines'); await clic('[data-act=space][data-s=admin]');
  const alcInes = await ev(() => alcance().cursos.join(','));
  check('Instructora: alcance limitado a sus cursos', alcInes === 'C2', alcInes);

  // 9 · Vencimiento con fecha simulada
  await como('ana');
  const venc = await ev(() => {
    const ac = S.acreds.find(a => a.persona === 'p-jorge' && a.curso === 'C4'); const a = S.asigs.find(x => x.persona === 'p-jorge' && x.curso === 'C4');
    const r = { antes: cumplimiento(a, '2026-11-05').k, dia: cumplimiento(a, ac.vence).k, despues: cumplimiento(a, D.add(ac.vence, 1)).k, vence: ac.vence };
    return r;
  });
  check('Por vencer → sigue vigente el día de vencimiento → Vencida al día siguiente', venc.antes === 'por_vencer' && venc.dia === 'por_vencer' && venc.despues === 'vencida', JSON.stringify(venc));
  await clic('[data-act=dia][data-n="30"]');
  const ren = await ev(() => S.bit.some(b => b.accion === 'Proceso diario (simulado)'));
  check('Avanzar la fecha genera renovaciones (proceso diario simulado)', ren);
  await clic('[data-act=dia][data-n="0"]');

  // 10 · Cierre por inactividad
  await como('rosa');
  await clic('[data-act=inactividad]');
  await page.waitForTimeout(31500);
  check('Inactividad: la sesión se cierra y vuelve al acceso', (await page.locator('#app').innerText()).includes('Cerramos tu sesión'));

  check('Sin errores de JavaScript en la página', errores.length === 0, errores.slice(0, 3).join(' | '));
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(resultados, null, 2));
  const fallas = resultados.filter(r => !r.ok).length;
  console.log('\n' + (resultados.length - fallas) + ' de ' + resultados.length + ' comprobaciones correctas');
  await browser.close();
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
