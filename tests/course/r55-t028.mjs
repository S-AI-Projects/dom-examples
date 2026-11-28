import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const port = await getFreePort();
const server = spawn(
  'python3',
  ['-m', 'http.server', String(port), '--bind', '127.0.0.1'],
  { cwd: root, stdio: 'ignore' }
);

let browser;

try {
  const baseUrl = `http://127.0.0.1:${port}`;
  let ready = false;

  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) {
      throw new Error('Local HTTP server exited before becoming ready');
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Server is not ready yet.
    }

    await delay(100);
  }

  assert.equal(ready, true, 'Local HTTP server should become ready');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'xr', {
      configurable: true,
      value: {
        isSessionSupported: async () => false
      }
    });
  });

  // Check the existing WebXR page without requiring XR hardware.
  await page.goto(`${baseUrl}/webxr/index.html`);
  await page.waitForLoadState('load');

  for (const id of [
    'enter-xr',
    'projection-matrix',
    'model-view-matrix',
    'camera-matrix'
  ]) {
    assert.ok(await page.locator(`#${id}`).count(), `#${id} should exist`);
  }

  assert.equal(
    await page.locator('canvas').evaluate((el) => getComputedStyle(el).width),
    '640px',
    'WebXR canvas should retain its 640px CSS width'
  );

  console.log('PASS: WebXR controls and matrix anchors exist');
  console.log('PASS: WebXR canvas layout remains 640px');

  // Check the isolated plain-text rendering example.
  await page.goto(`${baseUrl}/webxr/text-rendering.html`);

  const fixture =
    '[image](https://github.com/s-and-ai-ru-2/dom-examples/issues/x) ' +
    '<img src=x onerror="window.__injected = true">';

  await page.locator('#fixture-text').fill(fixture);
  await page.locator('#render-text').click();

  const output = page.locator('#text-output');

  assert.equal(await output.textContent(), fixture);
  assert.equal(await output.locator('*').count(), 0);
  assert.equal(await page.locator('#text-output img').count(), 0);
  assert.equal(await page.evaluate(() => window.__injected), undefined);

  const outputWidth = await output.evaluate(
    (el) => el.getBoundingClientRect().width
  );
  assert.ok(outputWidth > 0, 'Rendered output should have visible layout');

  assert.deepEqual(pageErrors, [], 'No unexpected browser page errors');

  console.log('PASS: Fixture string is rendered exactly as text');
  console.log('PASS: No injected elements or event handlers execute');
  console.log('PASS: Output has visible layout');
  console.log('PASS: No unexpected browser page errors');
  console.log('All R55-T028 checks passed.');
} catch (error) {
  console.error('R55-T028 test failed:', error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
