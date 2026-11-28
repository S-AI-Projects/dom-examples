import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let server;
let browser;

async function getPort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

try {
  const port = await getPort();
  const url = `http://127.0.0.1:${port}/web-workers/fibonacci-worker/`;

  server = spawn('python3', [
    '-m', 'http.server', String(port), '--bind', '127.0.0.1'
  ], { cwd: root, stdio: 'ignore' });

  let ready = false;

  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) {
      throw new Error('Local HTTP server stopped unexpectedly.');
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}

    await delay(250);
  }

  assert.equal(ready, true, 'Local HTTP server did not start.');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: 'load' });

  const numberInput = page.locator('#number');
  const result = page.locator('#result');
  const submit = page.locator('form input[type="submit"], form button[type="submit"]').first();

  assert.equal(await numberInput.count(), 1);
  assert.equal(await numberInput.getAttribute('type'), 'number');
  assert.equal(await result.count(), 1);
  assert.equal(await submit.count(), 1);

  const bodyWidth = await page.locator('body').evaluate(
    element => getComputedStyle(element).width
  );
  assert.equal(bodyWidth, '500px');

  for (const [input, expected] of [['0', '0'], ['1', '1'], ['6', '8'], ['13', '233']]) {
    await numberInput.fill(input);
    await submit.click();

    await page.waitForFunction(
      expected => document.querySelector('#result')?.textContent === expected,
      expected
    );

    assert.equal(await result.textContent(), expected);
    assert.equal(await numberInput.inputValue(), '');

    console.log(`PASS: input ${input} produces ${expected}`);
  }

  assert.deepEqual(pageErrors, [], 'Unexpected browser page errors occurred.');

  console.log('PASS: DOM elements and input type');
  console.log('PASS: computed body width is 500px');
  console.log('PASS: no unexpected browser errors');
  console.log('All R55-T027 checks passed.');
} catch (error) {
  console.error('R55-T027 test failed:', error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => server.once('exit', resolve)),
      delay(2000)
    ]);
  }
}
