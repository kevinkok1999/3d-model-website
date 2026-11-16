import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Local-only integration test: use precisely the same viewer/auditor/exporter
// for the synthetic QA fixture and the real candidate. The fixture is NOT anatomy.
// node prototype/test/bodyparts3d-browser-smoke.mjs http://127.0.0.1:4173 --fixture
// node prototype/test/bodyparts3d-browser-smoke.mjs http://127.0.0.1:4173 --actual
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Only local preview is allowed');
const mode = process.argv[3];
assert.ok(['--fixture', '--actual'].includes(mode), 'Explicit --fixture or --actual is mandatory');
const fixture = mode === '--fixture';
const evidence = fixture ? 'SYNTHETIC_QA_FIXTURE_NOT_ANATOMY' : 'ACTUAL_CANDIDATE_NOT_CLINICALLY_VERIFIED';
const screenshotPrefix = fixture ? 'synthetic-qa-not-anatomy' : 'actual-candidate-unreviewed';
const require = createRequire(import.meta.url);
const inputBytes = readFileSync(new URL('../../model-audit/bodyparts3d-combined-candidates.json', import.meta.url));
const input = JSON.parse(inputBytes);
const records = input.candidates;
const upstream = ['bodyparts3d-intake-candidates.json','bodyparts3d-wave2-candidates.json']
  .flatMap(name=>JSON.parse(readFileSync(new URL(`../../model-audit/${name}`,import.meta.url),'utf8')).candidates);
assert.equal(upstream.length,71);
for (const [i,row] of upstream.entries()) {
  // Combined inventory adds provisional display/navigation fields only.
  for (const [field,value] of Object.entries(row)) assert.deepEqual(records[i]?.[field],value,`${row.fma} source field ${field}`);
}
const sorted = xs => [...xs].sort();
const keys = sorted(records.map(row => row.fma));
const ids = sorted(new Set(records.flatMap(row => row.elementFileIds)));
assert.equal(keys.length, 71);
assert.equal(ids.length, 74);
const target = new URL('/bodyparts3d-candidate.html', base);
const manifestUrl = new URL('/bodyparts3d-candidate/model.json', base);
const glbUrl = new URL('/bodyparts3d-candidate/model.glb', base);

let playwright;
try { playwright = require('playwright'); } catch {
  console.error(JSON.stringify({ status: 'BLOCKED_NOT_RUN', evidence, reason: 'Playwright dependency unavailable' }));
  process.exit(2);
}
const executablePath = process.env.CHROMIUM_PATH || (!existsSync(playwright.chromium.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const screenshots = process.env.SMOKE_SCREENSHOT_DIR ? resolve(process.env.SMOKE_SCREENSHOT_DIR) : null;
if (screenshots) mkdirSync(screenshots, { recursive: true });
let browser;
try {
  browser = await playwright.chromium.launch({ executablePath, headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
} catch (error) {
  console.error(JSON.stringify({ status: 'BLOCKED_NOT_RUN', evidence, reason: error.message }));
  process.exit(2);
}

const checks = [], errors = [];
const scope = 'All 71 source concept IDs, 74 element IDs, exact list/detail/visibility mapping, camera and responsive routes; not a ray-picking accuracy, clinical, or real-device performance test';
const ready = page => page.locator('#bp-status[data-phase="ready"]').waitFor({ state: 'visible', timeout: 45000 });
const listKeys = page => page.locator('#bp-list [data-key]').evaluateAll(nodes => nodes.map(n => n.dataset.key).sort());
const viewport = page => page.locator('#bp-viewport');
const state = page => viewport(page).evaluate(n => ({ ...n.dataset }));
const visibleIds = data => sorted((data.visibleElementIds ?? '').split(',').filter(Boolean));
const listButton = (page, fma) => page.locator(`#bp-list [data-key="${fma}"]`);
const expectedElements = (suggestedIds) => sorted(suggestedIds);
const assertCount = async (page, shown) => {
  const text = await page.locator('#bp-count').innerText();
  assert.match(text, new RegExp(`\\b${shown}\\s*/\\s*71\\b`), 'Filtered and total concept counts distinguished');
};
const select = async (page, fma, keyboard = false) => {
  const button = listButton(page, fma);
  assert.equal(await button.count(), 1, `${fma} exact single activation target`);
  if (keyboard) { await button.focus(); await button.press('Enter'); }
  else await button.click();
};
const exactSelection = async (page, record) => {
  const pressed = await page.locator('#bp-list [data-key][aria-pressed="true"]').evaluateAll(nodes => nodes.map(n => n.dataset.key));
  assert.deepEqual(pressed, [record.fma], `${record.fma} exact unique selection`);
  assert.equal((await state(page)).selected, record.fma);
  const language = await page.locator('#bp-locale').inputValue();
  assert.equal((await page.locator('#bp-title').innerText()).trim(), language==='en'?record.sourceLabel:record.proposedDutchLabel);
  const text = (await page.locator('#bp-detail').innerText()).toLowerCase();
  for (const token of [record.fma, record.representation, record.sourceLabel, ...record.elementFileIds]) {
    assert.ok(text.includes(token.toLowerCase()), `${record.fma} missing exact detail token ${token}`);
  }
};

function observe(page) {
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => { if (msg.type() === 'error' && !/favicon\.ico/.test(msg.location().url ?? '')) errors.push(`console: ${msg.text()}`); });
  page.on('requestfailed', req => { if (/bodyparts3d-candidate\/model\.(glb|json)/.test(req.url())) errors.push(`failed asset: ${req.failure()?.errorText}`); });
}

try {
  const request = await playwright.request.newContext({ baseURL: base.href });
  const manifestResponse = await request.get(manifestUrl.href);
  assert.ok(manifestResponse.ok(), 'Audited input manifest must actually exist');
  const manifest = await manifestResponse.json();
  assert.equal(manifest.status, 'GEOMETRY_EXPORT_PASSED');
  assert.equal(manifest.clinicallyVerified, false);
  assert.equal(manifest.registration, 'UNREGISTERED_SOURCE_COORDINATES');
  assert.equal(manifest.manifestSha256, createHash('sha256').update(inputBytes).digest('hex'));
  assert.equal(manifest.fixtureOnly, fixture, 'Explicit provenance marker matches evidence mode');
  assert.equal(manifest.archive.name === 'isa_BP3D_4.0_obj_99.zip', !fixture, 'Provenance mode matches actual archive name');
  assert.match(manifest.archive.sha256, /^[a-f0-9]{64}$/);
  assert.ok(manifest.archive.bytes > 0);
  assert.deepEqual(manifest.source, input.source);
  assert.deepEqual(sorted(manifest.files.map(file => file.elementFileId)), ids);
  assert.deepEqual(sorted(manifest.conceptMappings.map(row => row.fma)), keys);
  for (const record of records) {
    const row = manifest.conceptMappings.find(row => row.fma === record.fma);
    assert.equal(row.status, 'PASSED');
    assert.equal(row.representation, record.representation);
    assert.equal(row.sourceLabel, record.sourceLabel);
    assert.deepEqual(sorted(row.elementFileIds), sorted(record.elementFileIds));
  }
  const allTetrahedra = manifest.files.every(file => file.vertexCount === 4 && file.triangleCount === 4);
  if (fixture) assert.equal(allTetrahedra, true, 'Fixture must be the known arbitrary tetrahedron geometry');
  else assert.equal(allTetrahedra, false, 'Synthetic tetrahedron signature cannot pass as actual geometry');
  const glbResponse = await request.get(glbUrl.href);
  assert.ok(glbResponse.ok(), 'Audited GLB must actually exist');
  const glb = await glbResponse.body();
  assert.equal(glb.length, manifest.glb.bytes);
  assert.equal(createHash('sha256').update(glb).digest('hex'), manifest.glb.sha256);
  await request.dispose();
  checks.push('Explicit evidence mode, exact manifest source/concept-element mapping and GLB bytes/hash');

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  observe(page);
  await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ready(page);
  assert.equal(await page.locator('#bp-status').getAttribute('data-fixture-only'), String(fixture));
  assert.equal(await page.locator('#bp-fixture-warning').isVisible(), fixture, 'Fixture-only visible warning must match evidence mode');
  if (fixture) assert.match(await page.locator('#bp-fixture-warning').innerText(), /synthetisch|synthetic/i);
  assert.equal(await viewport(page).isVisible(), true);
  assert.ok(await viewport(page).evaluate(canvas => canvas.width > 0 && canvas.height > 0), 'Positive canvas drawing buffer');
  assert.deepEqual(await listKeys(page), keys, '71 unique candidate list entries');
  await assertCount(page, 71);
  const initial = await state(page);
  assert.equal(Number(initial.mappedElements), 74);
  assert.equal(Number(initial.visibleElements), 74);
  assert.deepEqual(visibleIds(initial), ids);
  assert.equal(await page.locator('#bp-search').inputValue(), '');
  assert.equal(await page.locator('#bp-system').inputValue(), 'all');
  assert.equal(await page.locator('#bp-region').inputValue(), 'all');

  // All 71 mappings must be equally actionable: each concept gets exact
  // selection and detail checks plus per-element isolation (not visual proof).
  for (const [i, record] of records.entries()) {
    await select(page, record.fma, i === 0);
    await exactSelection(page, record);
    await page.locator('#bp-isolate').click();
    assert.equal(await page.locator('#bp-isolate').getAttribute('aria-pressed'), 'true');
    const isolated = await state(page);
    assert.equal(isolated.selected, record.fma);
    assert.equal(isolated.isolated, record.fma);
    assert.deepEqual(visibleIds(isolated), expectedElements(record.elementFileIds), `${record.fma} isolation exact element set`);
    assert.equal(Number(isolated.visibleElements), record.elementFileIds.length);
    await page.locator('#bp-isolate').click();
    assert.equal(await page.locator('#bp-isolate').getAttribute('aria-pressed'), 'false');
    assert.equal((await state(page)).isolated, '');
    assert.deepEqual(visibleIds(await state(page)), ids, `${record.fma} restore all 74 elements`);
  }
  checks.push('All 71 concepts: exact selected FMA/BP/source label/element IDs; isolation and restoration for each, including 3-element FMA3815 and 2-element FMA52749; first via keyboard');

  const search = page.locator('#bp-search'), region = page.locator('#bp-region'), system = page.locator('#bp-system');
  for (const name of ['skeleton', 'muscles', 'vessels', 'nerves']) {
    await system.selectOption(name);
    assert.deepEqual(await listKeys(page), sorted(records.filter(r => r.proposedSystem === name).map(r => r.fma)), `Exact ${name} filter`);
    await assertCount(page, records.filter(r => r.proposedSystem === name).length);
    assert.deepEqual(visibleIds(await state(page)), ids, 'Navigation-only system filter preserves geometry');
  }
  await system.selectOption('all');
  for (const name of ['head','neck','back','trunk','torso','shoulder','upper-limb','hand','thigh-hip','lower-limb']) {
    await region.selectOption(name);
    const regionRows=records.filter(r=>r.proposedRegion===name);
    assert.deepEqual(await listKeys(page), sorted(regionRows.map(r=>r.fma)), `Exact proposed ${name} region`);
    await assertCount(page,regionRows.length);
    assert.deepEqual(visibleIds(await state(page)), ids, 'Navigation-only region filter preserves geometry');
  }
  await region.selectOption('upper-limb');
  const upper = ['FMA24473', 'FMA37684', 'FMA37685', 'FMA37686', 'FMA37687', 'FMA38479', 'FMA38480', 'FMA22733', 'FMA22734', 'FMA22797', 'FMA22798', 'FMA22948', 'FMA22949'];
  assert.deepEqual(await listKeys(page), sorted(upper), 'Exact proposed upper-limb navigation scope');
  await assertCount(page, upper.length);
  await system.selectOption('muscles');
  assert.deepEqual(await listKeys(page), sorted(upper.filter(fma => records.find(r => r.fma === fma).proposedSystem === 'muscles')));
  await search.fill('FMA37684');
  assert.deepEqual(await listKeys(page), ['FMA37684']);
  await assertCount(page, 1);
  await search.fill('BP9153');
  assert.deepEqual(await listKeys(page), ['FMA37685']);
  await search.fill('__qa_no_matches__');
  assert.deepEqual(await listKeys(page), []);
  await assertCount(page, 0);
  await search.fill('');
  await region.selectOption('all');
  await system.selectOption('all');
  assert.deepEqual(await listKeys(page), keys);
  await assertCount(page, 71);
  await system.selectOption('nerves');
  await region.selectOption('head');
  assert.deepEqual(await listKeys(page), ['FMA52676','FMA52677']);
  await search.fill('ethmoidalis links');
  assert.deepEqual(await listKeys(page), ['FMA52677']);
  await page.locator('#bp-locale').selectOption('en');
  assert.deepEqual(await listKeys(page), ['FMA52677']);
  await search.fill('anterior ethmoidal nerve right');
  assert.deepEqual(await listKeys(page), ['FMA52676']);
  await page.locator('#bp-locale').selectOption('nl');
  await search.fill('');
  await region.selectOption('all');
  await system.selectOption('all');
  checks.push('All four system and ten region filters exact, upper-limb and head/nerves intersections, bilingual name/FMA/BP search, no-match and all-result restoration');

  await select(page, 'FMA3815');
  await page.locator('#bp-isolate').click();
  const multi = records.find(row => row.fma === 'FMA3815');
  const preserved = visibleIds(await state(page));
  for (const view of ['front', 'back', 'left', 'right']) {
    const button = page.locator(`[data-bp-view="${view}"]`);
    assert.equal(await button.count(), 1);
    await button.click();
    const camera = await state(page);
    assert.equal(camera.view, view, 'Raw-coordinate camera view, not validated anatomical orientation');
    assert.deepEqual(visibleIds(camera), preserved, `${view} preserves exact isolated elements`);
    await exactSelection(page, multi);
  }
  for (const button of ['#bp-focus', '#bp-fit']) {
    await page.locator(button).click();
    assert.deepEqual(visibleIds(await state(page)), preserved, `${button} preserves isolated elements`);
    await exactSelection(page, multi);
  }
  await page.locator('#bp-reset').click();
  const reset = await state(page);
  assert.deepEqual(visibleIds(reset), ids);
  assert.equal(await page.locator('#bp-isolate').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('#bp-list [aria-pressed="true"]').count(), 0);
  assert.equal(reset.selected, '');
  assert.equal(reset.isolated, '');
  await ready(page);
  checks.push('Four camera presets, focus and fit preserve multi-element isolate/selection; reset restores all 74 elements and clears selection');
  if (screenshots) await page.screenshot({ path: resolve(screenshots, `bodyparts3d-${screenshotPrefix}-desktop.png`), fullPage: true });
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  observe(mobile);
  await mobile.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ready(mobile);
  assert.equal(await mobile.locator('#bp-fixture-warning').isVisible(), fixture);
  assert.equal(await viewport(mobile).isVisible(), true);
  assert.deepEqual(await listKeys(mobile), keys);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '390px mobile no document horizontal overflow');
  await mobile.locator('.bp-jumps a[href="#bp-nav"]').tap();
  await mobile.locator('#bp-search').fill('FMA3815');
  assert.deepEqual(await listKeys(mobile), ['FMA3815']);
  await listButton(mobile, 'FMA3815').tap();
  await mobile.locator('.bp-jumps a[href="#bp-detail-panel"]').tap();
  await exactSelection(mobile, multi);
  await mobile.locator('#bp-isolate').tap();
  assert.deepEqual(visibleIds(await state(mobile)), sorted(multi.elementFileIds));
  if (screenshots) await mobile.screenshot({ path: resolve(screenshots, `bodyparts3d-${screenshotPrefix}-mobile-390.png`), fullPage: true });
  await mobile.close();
  checks.push('390px mobile touch-enabled viewport: no document overflow, accessible jump links, exact search and selection, multi-element isolate');
  assert.deepEqual(errors, [], 'No unexpected browser page/console/asset errors in successful paths');

  // Missing manifest must fail closed; separate page so expected 404 is not
  // counted as a success-path error. Do not replace missing assets with fake anatomy.
  const missing = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let glbRequests = 0, manifestRequests = 0;
  await missing.route('**/bodyparts3d-candidate/model.json', async route => {
    manifestRequests++; await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await missing.route('**/bodyparts3d-candidate/model.glb', async route => {
    glbRequests++; await route.abort();
  });
  await missing.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await missing.locator('#bp-status[data-phase="unavailable"], #bp-status[data-phase="error"]').waitFor({ state: 'visible', timeout: 45000 });
  assert.equal(manifestRequests, 1);
  assert.equal(glbRequests, 0, 'No geometry fetch after missing manifest');
  assert.equal(await missing.locator('#bp-status[data-phase="ready"]').count(), 0);
  assert.ok((await missing.locator('#bp-error').innerText()).trim().length > 0, 'Missing asset has an explicit accessible error');
  for (const button of ['#bp-focus', '#bp-fit', '#bp-isolate']) assert.equal(await missing.locator(button).isEnabled(), false, `${button} disabled in missing state`);
  await missing.close();
  checks.push('Missing model.json intercept 404: explicit failure state, no GLB request, no ready state, 3D controls disabled');
  console.log(JSON.stringify({ status: 'PASSED', evidence, scope, concepts: keys.length, elements: ids.length, checks }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'FAILED', evidence, scope, checks, errors, reason: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
