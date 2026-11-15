import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Local, optional Chromium smoke; this is not real-device performance or clinical QA.
// Run after starting preview: node prototype/test/browser-smoke.mjs http://127.0.0.1:4173
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname), 'Smoke test accepts only a local preview URL');
const require = createRequire(import.meta.url);
const sourceCatalog = require('open-anatomy-3d/catalog.json');
const systems = ['skin','skeleton','muscles','organs','vessels','nerves','joints'];
let playwright;
try { playwright = require('playwright'); } catch {
  console.error('NOT_RUN: optional local Playwright runtime is not available');
  process.exit(2);
}
// Prefer the Playwright-managed pinned executable in CI; use system Chromium
// only when the optional workstation installation lacks managed browser files.
const executablePath = process.env.CHROMIUM_PATH || (!existsSync(playwright.chromium.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const screenshots = process.env.SMOKE_SCREENSHOT_DIR ? resolve(process.env.SMOKE_SCREENSHOT_DIR) : null;
if (screenshots) mkdirSync(screenshots,{ recursive:true });
let browser;
try {
  browser = await playwright.chromium.launch({ executablePath, headless: true,
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
} catch (error) {
  console.error(JSON.stringify({ status: 'BLOCKED_NOT_RUN', scope: 'browser failed before opening the preview', reason: error.message }, null, 2));
  process.exit(2);
}
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const errors = [], warnings = [], modelRequests = [], assertions = [], recordAudits = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', msg => { if (msg.type() === 'error' && !/favicon\.ico/.test(msg.location().url ?? '')) errors.push(`console: ${msg.text()}`); else if (msg.type() === 'warning') warnings.push(msg.text()); });
page.on('requestfailed', req => { if (/glb|catalog.json|meshopt/i.test(req.url())) errors.push(`failed asset: ${req.url()} ${req.failure()?.errorText}`); });
page.on('response', r => { if (/anatomy-(male|female)[^/]*\.glb([?].*)?$/i.test(r.url())) modelRequests.push({ url: r.url(), status: r.status() }); });

const ready = () => page.locator('#status[data-phase="ready"]').waitFor({ state: 'visible', timeout: 45000 });
const waitListCount = async (count) => page.waitForFunction(n => document.querySelectorAll('#structure-list [data-key]').length === n, count, { timeout: 30000 });
const setVariant = async (variant, count) => {
  await page.locator('#search').fill('');
  await page.locator('#model-select').selectOption(variant);
  await ready();
  await waitListCount(count);
  assert.equal(await page.locator('#model-select').inputValue(), variant);
  assertions.push(`${variant}: ${count} list records and ready state`);
};

// Exhaustive DOM/state audit, not a visual, anatomical, picking or FPS audit.
// Batch synchronous activation: the normal list click handler runs for each
// item; checking after each event avoids a false pass from only the last ID.
const auditVariantRecords = async (variant, expectedMeshCount) => {
  const expected = sourceCatalog.filter(record => !record.sex || record.sex === variant);
  const keys = await page.locator('#structure-list [data-key]').evaluateAll(nodes => nodes.map(node => node.dataset.key));
  assert.deepEqual([...keys].sort(), expected.map(record => record.key).sort(), `${variant}: no duplicate, absent or extra source key in list`);
  const metrics = await page.locator('#metrics').innerText();
  assert.match(metrics, new RegExp(`Gekoppeld:\\s*${expectedMeshCount}\\b`, 'i'));
  assert.match(metrics, /ankers:\s*12\b/i);
  assert.match(metrics, /Niet gekoppelde bronrecords:\s*0\b/i);
  const systemCounts = Object.fromEntries(systems.map(system => [system, expected.filter(record => record.system === system).length]));
  const layerInputKeys = await page.locator('#layers input[data-system]').evaluateAll(nodes => nodes.map(node => node.dataset.system));
  assert.deepEqual([...layerInputKeys].sort(), [...systems].sort(), `${variant}: seven declared layer controls`);
  for (const system of systems) {
    const input = page.locator(`#layers input[data-system="${system}"]`);
    const checked = await input.isChecked();
    const shownCount = await input.evaluate(node => node.closest('label')?.querySelector('small')?.textContent);
    assert.equal(Number(shownCount), systemCounts[system], `${variant}/${system}: exact layer list count`);
    await input.setChecked(!checked);
    assert.equal(await input.isChecked(), !checked, `${variant}/${system}: toggle layer`);
    await input.setChecked(checked);
    assert.equal(await input.isChecked(), checked, `${variant}/${system}: restore layer`);
  }
  const tested = [];
  for (let offset = 0; offset < expected.length; offset += 20) {
    const batch = expected.slice(offset, offset + 20).map(({key,label,system})=>({key,label,system}));
    const result = await page.evaluate(records => {
      const failures = [], passed = [];
      for (const record of records) {
        const button = document.querySelector(`#structure-list [data-key="${CSS.escape(record.key)}"]`);
        if (!button) { failures.push(`${record.key}: missing activation target`); continue; }
        const displayLabel = button.querySelector('span')?.textContent?.trim();
        button.click();
        const selected = [...document.querySelectorAll('#structure-list [data-key][aria-pressed="true"]')];
        const detailPairs = [...document.querySelectorAll('#detail-content dl dd')].map(el=>el.textContent.trim());
        const detailTitle = document.querySelector('#detail-title')?.textContent?.trim();
        const activeLayer = document.querySelector(`#layers input[data-system="${CSS.escape(record.system)}"]`);
        const issue = [];
        if (selected.length !== 1 || selected[0]?.dataset.key !== record.key) issue.push('exactly one correct selected key required');
        if (detailPairs.length !== 2 || detailPairs[0] !== record.label || detailPairs[1] !== record.key) issue.push('exact detail ID/source-label mismatch');
        if (!displayLabel || detailTitle !== displayLabel) issue.push('list/detail label mismatch');
        if (!activeLayer?.checked) issue.push('selected structure system not activated');
        const error = document.querySelector('#error');
        if (error && !error.hidden && error.textContent.trim()) issue.push(`visible viewer error: ${error.textContent.trim()}`);
        if (document.querySelector('#status')?.dataset.phase !== 'ready') issue.push('viewer no longer ready');
        if (issue.length) failures.push(`${record.key}: ${issue.join('; ')}`);
        else passed.push(record.key);
      }
      return { passed, failures };
    }, batch);
    tested.push(...result.passed);
    assert.deepEqual(result.failures, [], `${variant}: failures in record audit offset ${offset}`);
  }
  assert.deepEqual([...tested].sort(), expected.map(record=>record.key).sort(), `${variant}: every expected source ID exercised`);
  await page.locator('#reset-btn').click();
  assert.equal(await page.locator('#structure-list [aria-pressed="true"]').count(), 0, `${variant}: reset clears selection after exhaustive audit`);
  await ready();
  recordAudits.push({ variant, expected: expected.length, tested: tested.length, systemCounts,
    layersToggledAndRestored: systems.length, browserMappingStats: metrics,
    scope: 'programmatic list activation, exact DOM state and source-label/detail ID, not pixel/picking proof' });
  assertions.push(`${variant}: all ${tested.length} catalog keys exercised, exact detail ID/source label and aria-pressed; all seven layer controls toggled/restored`);
};

try {
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ready();
  const canvas = page.locator('#viewport canvas');
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  assert.ok(await canvas.evaluate(el => el.width > 0 && el.height > 0), 'Canvas drawing buffer has positive dimensions');
  assertions.push('WebGL viewer reported ready and canvas visible');

  await setVariant('male', 140);
  await auditVariantRecords('male', 128);
  await page.locator('#search').fill('deltoid');
  const left = page.locator('#structure-list [data-key="deltoid_l"]');
  const right = page.locator('#structure-list [data-key="deltoid_r"]');
  await left.waitFor({ state: 'visible' });
  await right.waitFor({ state: 'visible' });
  assert.ok(await page.locator('#structure-list [data-key]:visible').count() < 140, 'Search narrows visible results');
  await left.focus();
  await left.press('Enter');
  const title = page.locator('#detail-title');
  await page.waitForFunction(() => /deltoid|deltaspier/i.test(document.querySelector('#detail-title')?.textContent ?? ''));
  assert.match(await title.innerText(), /deltoid|deltaspier/i);
  assert.equal(await left.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#detail-content').innerText(), /deltoid_l/);
  assertions.push('Search finds both source deltoid keys; keyboard selection updates detail panel with exact left key');

  await page.locator('#mode-select').selectOption('trainen');
  await page.locator('#locale-select').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await left.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#detail-content').innerText(), /deltoid_l/);
  await page.locator('#locale-select').selectOption('nl');
  await page.locator('#mode-select').selectOption('leren');
  assert.equal(await left.getAttribute('aria-pressed'), 'true');
  assertions.push('Mode and locale switch preserve exact selected source key');

  for (const id of ['focus-btn','isolate-btn','reset-btn']) {
    const button = page.locator(`#${id}`);
    assert.equal(await button.isEnabled(), true, `${id} enabled after structure selection`);
    await button.click();
    await ready();
    assertions.push(`${id} is operable and viewer remains ready`);
  }
  assert.equal(await left.getAttribute('aria-pressed'), 'false');

  const layer = page.locator('#layers input[data-system="muscles"]');
  await layer.waitFor({ state: 'visible' });
  const checked = await layer.isChecked();
  await layer.setChecked(!checked);
  assert.equal(await layer.isChecked(), !checked);
  await layer.setChecked(checked);
  await ready();
  assertions.push('Layer toggles and restores without rendering failure');

  await setVariant('female', 145);
  await auditVariantRecords('female', 133);
  await page.locator('#search').fill('deltoid');
  await page.locator('#structure-list [data-key="deltoid_r"]').click();
  assert.match(await title.innerText(), /deltoid|deltaspier/i);
  assert.match(await page.locator('#detail-content').innerText(), /deltoid_r/);
  assertions.push('Female model structure list selection works');
  if (screenshots) await page.screenshot({ path: resolve(screenshots,'desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await ready();
  assert.ok(await canvas.evaluate(el => el.width > 0 && el.height > 0));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'Mobile viewport has no unintended horizontal document overflow');
  assert.equal(await page.locator('#detail-title').isVisible(), true);
  assertions.push('Responsive 390px viewport retains viewer and detail content (emulated, not a real phone)');
  if (screenshots) await page.screenshot({ path: resolve(screenshots,'mobile.png'), fullPage: true });

  // Ensure both binary assets actually returned; no status or list-only false positives.
  assert.ok(modelRequests.some(r => /anatomy-male/i.test(r.url) && r.status >= 200 && r.status < 400), 'Male GLB requested successfully');
  assert.ok(modelRequests.some(r => /anatomy-female/i.test(r.url) && r.status >= 200 && r.status < 400), 'Female GLB requested successfully');
  assert.equal(await page.locator('#error').isVisible(), false, 'No visible viewer error at the end of smoke');
  assert.deepEqual(errors, [], 'No browser page/asset/console errors during smoke');
  console.log(JSON.stringify({ status: 'PASS', scope: 'software-WebGL desktop Chromium and emulated mobile viewport only', assertions, recordAudits, modelRequests, warnings }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'FAIL', completedAssertions: assertions, recordAudits, errors, warnings, modelRequests,
    statusText: await page.locator('#status').textContent({ timeout: 1000 }).catch(() => null), cause: error.stack }, null, 2));
  process.exitCode = 1;
} finally { await browser.close(); }
