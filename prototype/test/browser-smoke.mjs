import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Local, optional Chromium smoke; this is not real-device performance or clinical QA.
// Run after starting preview: node prototype/test/browser-smoke.mjs http://127.0.0.1:4173
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname), 'Smoke test accepts only a local preview URL');
const require = createRequire(import.meta.url);
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
const errors = [], warnings = [], modelRequests = [], assertions = [];
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

try {
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ready();
  const canvas = page.locator('#viewport canvas');
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  assert.ok(await canvas.evaluate(el => el.width > 0 && el.height > 0), 'Canvas drawing buffer has positive dimensions');
  assertions.push('WebGL viewer reported ready and canvas visible');

  await setVariant('male', 140);
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
  console.log(JSON.stringify({ status: 'PASS', scope: 'software-WebGL desktop Chromium and emulated mobile viewport only', assertions, modelRequests, warnings }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'FAIL', completedAssertions: assertions, errors, warnings, modelRequests,
    statusText: await page.locator('#status').textContent({ timeout: 1000 }).catch(() => null), cause: error.stack }, null, 2));
  process.exitCode = 1;
} finally { await browser.close(); }
