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
      throw new Error('Local HTTP server exited unexpectedly');
    }
    try {
      const response = await fetch(baseUrl);
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
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => undefined
    });
  });

  await page.goto(`${baseUrl}/web-share/index.html`);
  await page.waitForLoadState('load');

  assert.equal(await page.locator('h1').textContent(), 'Sharing MDN');
  assert.equal(await page.locator('button').textContent(), 'Share MDN!');
  assert.equal(await page.locator('a').count(), 1);
  assert.equal(
    await page.locator('button').evaluate(el => getComputedStyle(el).animationName),
    'none'
  );

  console.log('PASS: Static page content and controls remain available');
  console.log('PASS: Reduced-motion mode has no page animation');

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('a').focus();
    await page.keyboard.press('Tab');

    const button = page.locator('button');
    assert.equal(await button.evaluate(el => el === document.activeElement), true);

    const focus = await button.evaluate(el => {
      const style = getComputedStyle(el);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        rect: el.getBoundingClientRect().toJSON()
      };
    });

    assert.equal(focus.outlineStyle, 'solid');
    assert.equal(focus.outlineWidth, '3px');
    assert.ok(focus.rect.width > 0 && focus.rect.height > 0);
    assert.ok(focus.rect.left >= 0 && focus.rect.right <= width);

    console.log(`PASS: Visible keyboard focus at ${width}px`);
  }

  await page.locator('button').click();
  assert.equal(
    await page.locator('.result').textContent(),
    'MDN shared successfully'
  );

  console.log('PASS: Stubbed native share action updates result');
  assert.deepEqual(pageErrors, [], 'No unexpected page errors');
  console.log('PASS: No unexpected browser page errors');
  console.log('All R55-T029 checks passed.');
} catch (error) {
  console.error('R55-T029 test failed:', error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
