import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(root, 'pointerevents/Pinch_zoom_gestures.html');
const source = await readFile(sourcePath, 'utf8');

const binding = 'el.onpointermove = pointermove_handler;';
assert.equal(source.split(binding).length - 1, 1, 'Expected one pointermove binding');

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'r55-t030-'));
const mutatedPath = path.join(tempDir, 'mutated.html');
await writeFile(
  mutatedPath,
  source.replace(binding, '// Deliberately removed pointermove binding')
);

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

const port = await getFreePort();
const server = spawn(
  'python3',
  ['-m', 'http.server', String(port), '--bind', '127.0.0.1'],
  { cwd: root, stdio: 'ignore' }
);

let browser;

async function dispatchPointer(page, type, pointerId, x, y) {
  await page.locator('#target').evaluate((el, data) => {
    el.dispatchEvent(new PointerEvent(data.type, {
      bubbles: true,
      pointerId: data.pointerId,
      pointerType: 'touch',
      isPrimary: data.pointerId === 1,
      clientX: data.x,
      clientY: data.y,
      buttons: data.type === 'pointerup' ? 0 : 1
    }));
  }, { type, pointerId, x, y });
}

try {
  const baseUrl = `http://127.0.0.1:${port}`;
  let ready = false;

  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) {
      throw new Error('Local HTTP server exited unexpectedly');
    }
    try {
      const response = await fetch(`${baseUrl}/pointerevents/Pinch_zoom_gestures.html`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Wait for server readiness.
    }
    await delay(100);
  }

  assert.equal(ready, true, 'Local HTTP server should become ready');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 900, height: 700 }
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/pointerevents/Pinch_zoom_gestures.html`);
  await page.waitForLoadState('load');

  assert.equal(await page.locator('#target').count(), 1);
  assert.equal(await page.locator('#log').count(), 1);
  assert.equal(await page.locator('#clearlog').count(), 1);
  assert.equal(await page.locator('output').count(), 1);
  assert.equal(
    await page.locator('body').evaluate(el => getComputedStyle(el).touchAction),
    'none'
  );

  console.log('PASS: Pointer target and logging controls are present');

  await page.locator('#log').click();
  await dispatchPointer(page, 'pointerdown', 1, 100, 100);
  await dispatchPointer(page, 'pointerdown', 2, 200, 100);

  assert.match(await page.locator('output').textContent(), /pointerDown/);
  console.log('PASS: Pointer down events are logged');

  await page.locator('#clearlog').click();
  assert.equal((await page.locator('output').textContent()).trim(), '');
  console.log('PASS: Clear log control empties the output');

  await dispatchPointer(page, 'pointermove', 2, 250, 100);
  assert.equal(
    await page.locator('#target').evaluate(el => getComputedStyle(el).borderTopStyle),
    'dashed'
  );
  assert.match(await page.locator('output').textContent(), /pointerMove/);
  console.log('PASS: Pointer movement updates border and event log');

  await dispatchPointer(page, 'pointermove', 2, 280, 100);
  assert.equal(
    await page.locator('#target').evaluate(el => getComputedStyle(el).backgroundColor),
    'rgb(255, 192, 203)'
  );
  console.log('PASS: Pinch opening changes target background to pink');

  await dispatchPointer(page, 'pointermove', 2, 240, 100);
  assert.equal(
    await page.locator('#target').evaluate(el => getComputedStyle(el).backgroundColor),
    'rgb(173, 216, 230)'
  );
  console.log('PASS: Pinch closing changes target background to light blue');

  await dispatchPointer(page, 'pointerup', 2, 240, 100);
  assert.equal(
    await page.locator('#target').evaluate(el => getComputedStyle(el).backgroundColor),
    'rgb(255, 255, 255)'
  );
  assert.equal(
    await page.locator('#target').evaluate(el => getComputedStyle(el).borderTopStyle),
    'solid'
  );
  console.log('PASS: Pointer up resets target appearance');

  const mutatedContext = await browser.newContext({
    viewport: { width: 900, height: 700 }
  });
  const mutatedPage = await mutatedContext.newPage();
  mutatedPage.on('pageerror', error => pageErrors.push(error.message));

  const mutatedHtml = await readFile(mutatedPath, 'utf8');
  await mutatedPage.route(
    '**/pointerevents/Pinch_zoom_gestures.html',
    route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: mutatedHtml
    })
  );

  await mutatedPage.goto(`${baseUrl}/pointerevents/Pinch_zoom_gestures.html`);
  await mutatedPage.waitForLoadState('load');
  await mutatedPage.locator('#log').click();

  await dispatchPointer(mutatedPage, 'pointerdown', 1, 100, 100);
  await dispatchPointer(mutatedPage, 'pointermove', 1, 150, 100);

  assert.equal(
    await mutatedPage.locator('#target').evaluate(el => getComputedStyle(el).borderTopStyle),
    'solid'
  );
  assert.doesNotMatch(
    await mutatedPage.locator('output').textContent(),
    /pointerMove/
  );

  console.log('PASS: Deliberately broken fixture is detected (no move effect)');
  assert.deepEqual(pageErrors, [], 'No unexpected browser page errors');
  console.log('PASS: No unexpected browser page errors');
  console.log('All R55-T030 checks passed.');
} catch (error) {
  console.error('R55-T030 test failed:', error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
  await rm(tempDir, { recursive: true, force: true });
}
